from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Proveedor, Producto, OrdenCompra, PagoProveedor, Usuario
from app.schemas.schemas import (
    ProveedorCreate, ProveedorUpdate, ProveedorResponse, PaginatedProveedores,
    PagoProveedorCreate, PagoProveedorResponse, ProductoResponse,
)
from app.crud import proveedores as crud
from app.core.dependencies import require_admin, require_any_role
from app.core.timeutils import a_iso_utc

router = APIRouter(prefix="/proveedores", tags=["Proveedores"])


@router.get("", response_model=PaginatedProveedores)
def list_proveedores(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    activo: bool = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    skip = (page - 1) * per_page
    total, items = crud.get_all(db, skip=skip, limit=per_page, search=search, activo=activo)
    return PaginatedProveedores(total=total, page=page, per_page=per_page, items=items)


@router.get("/{proveedor_id}", response_model=ProveedorResponse)
def get_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    obj = crud.get_by_id(db, proveedor_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return obj


@router.post("", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
def create_proveedor(
    data: ProveedorCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    return crud.create(db, data)


@router.put("/{proveedor_id}", response_model=ProveedorResponse)
def update_proveedor(
    proveedor_id: int,
    data: ProveedorUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, proveedor_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return crud.update(db, obj, data)


@router.delete("/{proveedor_id}", response_model=ProveedorResponse)
def deactivate_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, proveedor_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return crud.delete(db, obj)


# ── Productos que suministra ──────────────────────────────────────────────────

@router.get("/{proveedor_id}/productos", response_model=list[ProductoResponse])
def productos_del_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    proveedor = crud.get_by_id(db, proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return (
        db.query(Producto)
        .filter(Producto.proveedor_id == proveedor_id, Producto.activo == True)
        .order_by(Producto.nombre)
        .all()
    )


# ── Estado de cuenta ──────────────────────────────────────────────────────────

@router.get("/{proveedor_id}/estado-cuenta")
def estado_cuenta_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Saldo con el proveedor: compras recibidas − pagos realizados."""
    proveedor = crud.get_by_id(db, proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    total_compras = db.query(func.coalesce(func.sum(OrdenCompra.total), 0)).filter(
        OrdenCompra.proveedor_id == proveedor_id,
        OrdenCompra.estado == "recibida",
    ).scalar()
    total_pagos = db.query(func.coalesce(func.sum(PagoProveedor.monto), 0)).filter(
        PagoProveedor.proveedor_id == proveedor_id,
    ).scalar()
    saldo = Decimal(str(total_compras)) - Decimal(str(total_pagos))

    ordenes = (
        db.query(OrdenCompra)
        .filter(OrdenCompra.proveedor_id == proveedor_id)
        .order_by(OrdenCompra.fecha.desc())
        .limit(50)
        .all()
    )
    pagos = (
        db.query(PagoProveedor)
        .filter(PagoProveedor.proveedor_id == proveedor_id)
        .order_by(PagoProveedor.fecha.desc())
        .limit(50)
        .all()
    )

    return {
        "proveedor": {"id": proveedor.id, "nombre": proveedor.nombre, "activo": proveedor.activo},
        "total_compras_recibidas": float(total_compras),
        "total_pagos": float(total_pagos),
        "saldo_pendiente": float(saldo),
        "ordenes": [
            {
                "id": o.id, "fecha": a_iso_utc(o.fecha), "estado": o.estado,
                "total": float(o.total), "notas": o.notas,
            }
            for o in ordenes
        ],
        "pagos": [
            {
                "id": p.id, "fecha": a_iso_utc(p.fecha), "monto": float(p.monto),
                "metodo": p.metodo, "orden_id": p.orden_id, "notas": p.notas,
            }
            for p in pagos
        ],
    }


# ── Pagos al proveedor ────────────────────────────────────────────────────────

@router.post("/{proveedor_id}/pagos", response_model=PagoProveedorResponse, status_code=201)
def registrar_pago_proveedor(
    proveedor_id: int,
    data: PagoProveedorCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    proveedor = crud.get_by_id(db, proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    if data.orden_id is not None:
        orden = db.query(OrdenCompra).filter(
            OrdenCompra.id == data.orden_id,
            OrdenCompra.proveedor_id == proveedor_id,
        ).first()
        if not orden:
            raise HTTPException(status_code=404, detail="La orden indicada no pertenece a este proveedor")

    pago = PagoProveedor(
        proveedor_id=proveedor_id,
        monto=data.monto,
        metodo=data.metodo,
        orden_id=data.orden_id,
        usuario_id=admin.id,
        notas=data.notas,
    )
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago
