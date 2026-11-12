"""
dashboard.py — Panel del administrador (Fase 2.7).

Indicadores: ventas de hoy/semana/mes, ganancia del mes, top productos, stock
bajo, agotados, por vencer, clientes con deuda / total por cobrar, compras
recientes, recomendaciones pendientes, últimas ventas y caja actual.

"Hoy/semana/mes" usan la zona horaria LOCAL de la tienda (no UTC).
Mantiene las claves previas del contrato para no romper los frontends.
"""
from datetime import timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Venta, DetalleVenta, Producto, CajaSesion, Cliente, OrdenCompra, Recomendacion,
)
from app.core.dependencies import require_admin
from app.core.timeutils import ahora_utc, inicio_dia_local, inicio_semana_local, inicio_mes_local, a_iso_utc
from app.models.models import Usuario
from app.services import clientes_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _resumen_ventas(db: Session, desde) -> dict:
    ventas = db.query(Venta).filter(Venta.fecha >= desde, Venta.estado == "completada").all()
    total = sum((Decimal(str(v.total)) for v in ventas), Decimal("0"))
    return {"total": float(round(total, 2)), "cantidad": len(ventas)}


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    now = ahora_utc()
    inicio_hoy = inicio_dia_local()
    inicio_semana = inicio_semana_local()
    inicio_mes = inicio_mes_local()

    # ── Ventas por período (hora local de la tienda) ──────────────────────────
    ventas_hoy = _resumen_ventas(db, inicio_hoy)
    ventas_semana = _resumen_ventas(db, inicio_semana)
    ventas_mes = _resumen_ventas(db, inicio_mes)

    # ── Ganancia del mes (precio venta − costo actual del producto) ───────────
    ganancia_row = (
        db.query(
            func.coalesce(func.sum(DetalleVenta.subtotal), 0).label("ingresos"),
            func.coalesce(func.sum(Producto.precio_compra * DetalleVenta.cantidad), 0).label("costo"),
        )
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .join(Producto, Producto.id == DetalleVenta.producto_id)
        .filter(Venta.fecha >= inicio_mes, Venta.estado == "completada")
        .first()
    )
    ingresos_mes = float(ganancia_row.ingresos or 0)
    ganancia_mes = round(ingresos_mes - float(ganancia_row.costo or 0), 2)

    # ── Top 5 productos del mes ────────────────────────────────────────────────
    top_rows = (
        db.query(
            Producto.id, Producto.nombre,
            func.sum(DetalleVenta.cantidad).label("unidades"),
            func.sum(DetalleVenta.subtotal).label("ingresos"),
        )
        .join(DetalleVenta, DetalleVenta.producto_id == Producto.id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .filter(Venta.fecha >= inicio_mes, Venta.estado == "completada")
        .group_by(Producto.id)
        .order_by(func.sum(DetalleVenta.cantidad).desc())
        .limit(5)
        .all()
    )

    # ── Stock ─────────────────────────────────────────────────────────────────
    bajo_stock = (
        db.query(Producto)
        .filter(Producto.activo == True, Producto.stock > 0, Producto.stock <= Producto.stock_minimo)
        .order_by(Producto.stock.asc())
        .limit(5)
        .all()
    )
    bajo_stock_count = db.query(Producto).filter(
        Producto.activo == True, Producto.stock > 0, Producto.stock <= Producto.stock_minimo
    ).count()
    agotados = (
        db.query(Producto)
        .filter(Producto.activo == True, Producto.stock <= 0)
        .order_by(Producto.nombre)
        .limit(5)
        .all()
    )
    agotados_count = db.query(Producto).filter(Producto.activo == True, Producto.stock <= 0).count()

    limite_vencer = now + timedelta(days=7)
    por_vencer_count = db.query(Producto).filter(
        Producto.activo == True,
        Producto.fecha_vencimiento != None,
        Producto.fecha_vencimiento <= limite_vencer,
    ).count()

    # ── Cartera (clientes con deuda) ──────────────────────────────────────────
    clientes_credito = db.query(Cliente).filter(Cliente.permite_credito == True).all()
    deudores = []
    total_por_cobrar = Decimal("0")
    for c in clientes_credito:
        saldo = clientes_service.saldo_cliente(db, c.id)
        if saldo > 0:
            total_por_cobrar += saldo
            deudores.append({"id": c.id, "nombre": c.nombre, "saldo": float(saldo)})
    deudores.sort(key=lambda x: x["saldo"], reverse=True)

    # ── Compras recientes ─────────────────────────────────────────────────────
    compras_recientes = (
        db.query(OrdenCompra)
        .order_by(OrdenCompra.fecha.desc())
        .limit(5)
        .all()
    )

    # ── Recomendaciones pendientes ────────────────────────────────────────────
    recomendaciones_pendientes = db.query(Recomendacion).filter(
        Recomendacion.estado == "pendiente"
    ).count()

    # ── Últimas ventas y caja ─────────────────────────────────────────────────
    ultimas = (
        db.query(Venta)
        .filter(Venta.estado == "completada")
        .order_by(Venta.fecha.desc())
        .limit(5)
        .all()
    )
    caja = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()

    return {
        "ventas_hoy": ventas_hoy,
        "ventas_semana": ventas_semana,
        "ventas_mes": ventas_mes,
        "ganancias_mes": {
            "ingresos": round(ingresos_mes, 2),
            "ganancia": ganancia_mes,
        },
        "top_productos_mes": [
            {
                "id": r.id,
                "nombre": r.nombre,
                "unidades": float(r.unidades or 0),
                "ingresos": round(float(r.ingresos or 0), 2),
            }
            for r in top_rows
        ],
        "productos_bajo_stock": [
            {
                "id": p.id,
                "nombre": p.nombre,
                "stock": float(p.stock),
                "stock_minimo": float(p.stock_minimo),
                "categoria": p.categoria.nombre if p.categoria else None,
            }
            for p in bajo_stock
        ],
        "productos_agotados": [
            {"id": p.id, "nombre": p.nombre, "categoria": p.categoria.nombre if p.categoria else None}
            for p in agotados
        ],
        "clientes_con_deuda": {
            "cantidad": len(deudores),
            "total_por_cobrar": float(round(total_por_cobrar, 2)),
            "top": deudores[:5],
        },
        "compras_recientes": [
            {
                "id": o.id,
                "proveedor": o.proveedor.nombre if o.proveedor else "—",
                "fecha": a_iso_utc(o.fecha),
                "estado": o.estado,
                "total": float(o.total),
            }
            for o in compras_recientes
        ],
        "ultimas_ventas": [
            {
                "id": v.id,
                "numero_recibo": v.numero_recibo,
                "total": float(v.total),
                "metodo_pago": v.metodo_pago,
                "fecha": a_iso_utc(v.fecha),
                "vendedor": v.usuario.nombre if v.usuario else "—",
            }
            for v in ultimas
        ],
        "caja_actual": {
            "estado": caja.estado,
            "monto_inicial": float(caja.monto_inicial),
            "fecha_apertura": a_iso_utc(caja.fecha_apertura),
        } if caja else None,
        "alertas": {
            "bajo_stock": bajo_stock_count,
            "agotados": agotados_count,
            "por_vencer": por_vencer_count,
            "recomendaciones_pendientes": recomendaciones_pendientes,
        },
    }
