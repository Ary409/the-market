from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import OrdenCompra, DetalleCompra, Producto, Proveedor, MovimientoStock
from app.schemas.schemas import (
    OrdenCompraCreate, OrdenCompraResponse, PaginatedOrdenes,
)
from app.core.dependencies import require_admin
from app.models.models import Usuario
from app.services import inventario_service

router = APIRouter(prefix="/compras", tags=["Compras"])


# ── Crear orden de compra ─────────────────────────────────────────────────────

@router.post("", response_model=OrdenCompraResponse, status_code=201)
def crear_orden(
    data: OrdenCompraCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    proveedor = db.query(Proveedor).filter(Proveedor.id == data.proveedor_id, Proveedor.activo == True).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    total = Decimal("0")
    detalles = []
    for item in data.items:
        producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        subtotal = (Decimal(str(item.cantidad)) * Decimal(str(item.precio_unitario))).quantize(Decimal("0.01"))
        total += subtotal
        detalles.append(DetalleCompra(
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=subtotal,
        ))

    orden = OrdenCompra(
        proveedor_id=data.proveedor_id,
        total=total,
        notas=data.notas,
    )
    db.add(orden)
    db.flush()

    for d in detalles:
        d.orden_id = orden.id
        db.add(d)

    db.commit()
    db.refresh(orden)
    return orden


# ── Listar órdenes ────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedOrdenes)
def listar_ordenes(
    estado: Optional[str] = None,
    proveedor_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    q = db.query(OrdenCompra)
    if estado:
        q = q.filter(OrdenCompra.estado == estado)
    if proveedor_id:
        q = q.filter(OrdenCompra.proveedor_id == proveedor_id)

    total = q.count()
    items = (
        q.order_by(OrdenCompra.fecha.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"total": total, "page": page, "per_page": per_page, "items": items}


# ── Obtener orden por ID ──────────────────────────────────────────────────────

@router.get("/{orden_id}", response_model=OrdenCompraResponse)
def obtener_orden(
    orden_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return orden


# ── Recibir mercadería (actualiza stock) ──────────────────────────────────────

@router.put("/{orden_id}/recibir", response_model=OrdenCompraResponse)
def recibir_orden(
    orden_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if orden.estado == "recibida":
        raise HTTPException(status_code=400, detail="Esta orden ya fue recibida")
    if orden.estado == "cancelada":
        raise HTTPException(status_code=400, detail="No se puede recibir una orden cancelada")

    for detalle in orden.detalles:
        producto = db.query(Producto).filter(Producto.id == detalle.producto_id).first()
        if not producto:
            continue
        inventario_service.registrar_movimiento(
            db, producto, "entrada", detalle.cantidad, current_user.id,
            motivo=f"Recepción orden de compra #{orden_id}",
            referencia_id=orden_id,
        )

    orden.estado = "recibida"
    db.commit()
    db.refresh(orden)
    return orden


# ── PDF de la orden (carta para repartidor / ticket térmico 80mm) ────────────

@router.get("/{orden_id}/pdf")
def pdf_orden(
    orden_id: int,
    formato: str = "carta",     # carta | ticket
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    from fastapi.responses import Response
    from sqlalchemy.orm import joinedload
    from app.core import pdfs

    orden = (
        db.query(OrdenCompra)
        .options(joinedload(OrdenCompra.detalles), joinedload(OrdenCompra.proveedor))
        .filter(OrdenCompra.id == orden_id)
        .first()
    )
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if formato == "ticket":
        contenido = pdfs.orden_compra_ticket(orden)
    else:
        contenido = pdfs.orden_compra_carta(orden)

    nombre = f"orden_OC-{orden.id:04d}_{formato}.pdf"
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre}"},
    )


# ── Cancelar orden (lógico — el historial NUNCA se borra) ────────────────────

@router.delete("/{orden_id}", status_code=204)
def cancelar_orden(
    orden_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    orden = db.query(OrdenCompra).filter(OrdenCompra.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if orden.estado == "recibida":
        raise HTTPException(status_code=400, detail="No se puede cancelar una orden ya recibida")
    if orden.estado == "cancelada":
        raise HTTPException(status_code=400, detail="Esta orden ya está cancelada")
    # Cancelación LÓGICA: la orden queda en el historial para auditoría
    orden.estado = "cancelada"
    db.commit()
