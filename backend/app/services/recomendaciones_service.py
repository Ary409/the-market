"""
recomendaciones_service.py — Motor de recomendaciones para el administrador.

Se ejecuta automáticamente al CERRAR CAJA (cierre diario del vendedor) y puede
dispararse manualmente desde /recomendaciones/generar.

Reglas actuales (heurísticas):
  * stock == 0                        → reponer_urgente   (alta)
  * stock <= stock_minimo             → realizar_pedido   (media)
  * top vendidos 30 días y stock bajo → aumentar_inventario (media)
  * sin ventas en 60 días con stock   → revisar_producto / considerar_descontinuar (baja)

Diseño: este módulo es la única fuente de recomendaciones. En el futuro puede
sustituirse o complementarse con un modelo de IA de predicción de demanda sin
tocar los routers (misma tabla, mismo contrato).

Idempotencia: una recomendación PENDIENTE por (producto, tipo) — si ya existe
se actualiza el mensaje; si la condición desapareció, se descarta sola.
"""
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Producto, Recomendacion, Venta, DetalleVenta
from app.core.timeutils import ahora_utc


def _upsert(db: Session, pendientes: dict, producto_id, tipo: str, mensaje: str, prioridad: str, nuevas: list):
    """Crea o actualiza la recomendación pendiente de (producto, tipo)."""
    key = (producto_id, tipo)
    existente = pendientes.pop(key, None)
    if existente:
        existente.mensaje = mensaje
        existente.prioridad = prioridad
    else:
        rec = Recomendacion(
            producto_id=producto_id, tipo=tipo,
            mensaje=mensaje, prioridad=prioridad,
        )
        db.add(rec)
        nuevas.append(rec)


def generar(db: Session) -> dict:
    """Genera/actualiza recomendaciones. NO hace commit (transacción del caller)."""
    ahora = ahora_utc()
    hace_30 = ahora - timedelta(days=30)
    hace_60 = ahora - timedelta(days=60)

    # Pendientes actuales indexadas por (producto_id, tipo)
    pendientes = {
        (r.producto_id, r.tipo): r
        for r in db.query(Recomendacion).filter(Recomendacion.estado == "pendiente").all()
    }
    nuevas: list = []

    productos = db.query(Producto).filter(Producto.activo == True).all()

    # Ventas por producto últimos 30 días (para más/menos vendidos)
    ventas_30 = dict(
        db.query(DetalleVenta.producto_id, func.sum(DetalleVenta.cantidad))
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .filter(Venta.fecha >= hace_30, Venta.estado == "completada")
        .group_by(DetalleVenta.producto_id)
        .all()
    )
    # Última venta por producto (para detectar productos sin movimiento)
    ultima_venta = dict(
        db.query(DetalleVenta.producto_id, func.max(Venta.fecha))
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .filter(Venta.estado == "completada")
        .group_by(DetalleVenta.producto_id)
        .all()
    )

    # Top 5 más vendidos del mes
    top_ids = {
        pid for pid, _ in sorted(ventas_30.items(), key=lambda kv: kv[1] or 0, reverse=True)[:5]
    }

    for p in productos:
        stock = Decimal(str(p.stock))
        minimo = Decimal(str(p.stock_minimo))
        vendido_30 = ventas_30.get(p.id) or 0

        if stock <= 0:
            _upsert(db, pendientes, p.id, "reponer_urgente",
                    f"'{p.nombre}' está AGOTADO. Vendió {vendido_30} en los últimos 30 días.",
                    "alta", nuevas)
        elif stock <= minimo:
            _upsert(db, pendientes, p.id, "realizar_pedido",
                    f"'{p.nombre}' está en stock bajo ({stock} / mínimo {minimo}). "
                    f"Vendió {vendido_30} en 30 días — considera hacer pedido.",
                    "media", nuevas)

        if p.id in top_ids and stock > 0 and stock <= minimo * 2:
            _upsert(db, pendientes, p.id, "aumentar_inventario",
                    f"'{p.nombre}' es de los más vendidos del mes ({vendido_30} uds) y "
                    f"su stock ({stock}) se agotará pronto. Considera aumentar inventario.",
                    "media", nuevas)

        # Sin ventas en 60 días y con stock parado
        if stock > 0 and p.created_at is not None:
            creado = p.created_at if p.created_at.tzinfo else p.created_at.replace(tzinfo=ahora.tzinfo)
            uv = ultima_venta.get(p.id)
            if uv is not None and uv.tzinfo is None:
                uv = uv.replace(tzinfo=ahora.tzinfo)
            antiguo = creado <= hace_60
            sin_ventas_recientes = uv is None or uv <= hace_60
            if antiguo and sin_ventas_recientes:
                if uv is None:
                    _upsert(db, pendientes, p.id, "considerar_descontinuar",
                            f"'{p.nombre}' nunca se ha vendido y tiene {stock} en stock. "
                            f"Considera promocionarlo o descontinuarlo.",
                            "baja", nuevas)
                else:
                    _upsert(db, pendientes, p.id, "revisar_producto",
                            f"'{p.nombre}' no se vende desde hace más de 60 días y tiene "
                            f"{stock} en stock. Revisa precio, ubicación o vigencia.",
                            "baja", nuevas)

    # Las pendientes cuya condición ya no aplica se descartan automáticamente
    resueltas = 0
    for rec in pendientes.values():
        rec.estado = "descartada"
        rec.mensaje = rec.mensaje + " [resuelta automáticamente: la condición ya no aplica]"
        resueltas += 1

    return {"nuevas": len(nuevas), "resueltas_auto": resueltas}
