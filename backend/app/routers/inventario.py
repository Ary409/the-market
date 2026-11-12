from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Producto, MovimientoStock, Proveedor
from app.schemas.schemas import (
    MovimientoCreate, MovimientoAjuste, MovimientoSalida, MovimientoResponse,
    AlertaStockResponse, PaginatedMovimientos,
)
from app.core.dependencies import get_current_user, require_admin, require_any_role
from app.models.models import Usuario
from app.services import inventario_service
from app.services.inventario_service import StockInsuficienteError

router = APIRouter(prefix="/inventario", tags=["Inventario"])


# ── Entrada de mercadería ─────────────────────────────────────────────────────

@router.post("/entrada", response_model=MovimientoResponse, status_code=201)
def registrar_entrada(
    data: MovimientoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    producto = db.query(Producto).filter(Producto.id == data.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    mov = inventario_service.registrar_movimiento(
        db, producto, "entrada", data.cantidad, current_user.id,
        motivo=data.motivo, referencia_id=data.referencia_id,
    )
    db.commit()
    db.refresh(mov)
    return mov


# ── Salida de inventario: pérdida, merma, vencimiento ────────────────────────

@router.post("/salida", response_model=MovimientoResponse, status_code=201)
def registrar_salida(
    data: MovimientoSalida,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """Registra una salida de inventario que NO es una venta:
    pérdida (robo/daño), merma (deterioro), vencimiento o salida general.
    El motivo es obligatorio — auditoría necesita poder explicarla."""
    producto = db.query(Producto).filter(Producto.id == data.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    try:
        mov = inventario_service.registrar_salida(
            db, producto, data.tipo, data.cantidad, current_user.id,
            motivo=data.motivo,
        )
    except StockInsuficienteError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(mov)
    return mov


# ── Ajuste manual de stock ────────────────────────────────────────────────────

@router.post("/ajuste", response_model=MovimientoResponse, status_code=201)
def ajustar_stock(
    data: MovimientoAjuste,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    producto = db.query(Producto).filter(Producto.id == data.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if data.stock_nuevo == producto.stock:
        raise HTTPException(status_code=400, detail="El stock nuevo es igual al actual")

    try:
        mov = inventario_service.ajustar_a(
            db, producto, data.stock_nuevo, current_user.id, motivo=data.motivo,
        )
    except StockInsuficienteError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.commit()
    db.refresh(mov)
    return mov


# ── Historial de movimientos ──────────────────────────────────────────────────

@router.get("/movimientos", response_model=PaginatedMovimientos)
def listar_movimientos(
    producto_id: Optional[int] = None,
    tipo: Optional[str] = None,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    q = db.query(MovimientoStock)
    if producto_id:
        q = q.filter(MovimientoStock.producto_id == producto_id)
    if tipo:
        q = q.filter(MovimientoStock.tipo == tipo)
    if desde:
        q = q.filter(MovimientoStock.created_at >= desde)
    if hasta:
        q = q.filter(MovimientoStock.created_at <= hasta)

    total = q.count()
    items = (
        q.order_by(MovimientoStock.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"total": total, "page": page, "per_page": per_page, "items": items}


# ── Alertas de stock mínimo ───────────────────────────────────────────────────

@router.get("/alertas", response_model=list[AlertaStockResponse])
def alertas_stock(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_any_role),
):
    productos = (
        db.query(Producto)
        .filter(Producto.activo == True, Producto.stock <= Producto.stock_minimo)
        .order_by(Producto.stock.asc())
        .all()
    )
    return productos


# ── Productos por vencer ──────────────────────────────────────────────────────

@router.get("/por-vencer", response_model=list[AlertaStockResponse])
def por_vencer(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_any_role),
):
    limite = datetime.now(timezone.utc) + timedelta(days=dias)
    productos = (
        db.query(Producto)
        .filter(
            Producto.activo == True,
            Producto.fecha_vencimiento != None,
            Producto.fecha_vencimiento <= limite,
        )
        .order_by(Producto.fecha_vencimiento.asc())
        .all()
    )
    return productos
