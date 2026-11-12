from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io, csv

from app.database import get_db
from app.models.models import Venta, DetalleVenta, Producto, Categoria, CajaSesion
from app.core.dependencies import require_admin
from app.core.timeutils import inicio_dia_local, inicio_semana_local, inicio_mes_local, ahora_utc, a_iso_utc
from app.models.models import Usuario

router = APIRouter(prefix="/reportes", tags=["Reportes"])


def _rango(desde: Optional[datetime], hasta: Optional[datetime]):
    # Por defecto: últimos 7 días en hora LOCAL de la tienda
    if not desde:
        desde = inicio_dia_local(dias_atras=6)
    if not hasta:
        hasta = ahora_utc()
    return desde, hasta


# ── Ventas por día ────────────────────────────────────────────────────────────

@router.get("/ventas")
def reporte_ventas(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    vendedor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    desde, hasta = _rango(desde, hasta)
    q = db.query(Venta).filter(
        Venta.fecha >= desde,
        Venta.fecha <= hasta,
        Venta.estado == "completada",
    )
    if vendedor_id:
        q = q.filter(Venta.usuario_id == vendedor_id)

    ventas = q.all()
    total = float(sum(float(v.total) for v in ventas))
    cantidad = len(ventas)
    ticket_promedio = (total / cantidad) if cantidad else 0

    # Agrupar por día
    dias: dict = {}
    for v in ventas:
        d = v.fecha.strftime("%Y-%m-%d")
        if d not in dias:
            dias[d] = {"fecha": d, "total": 0.0, "cantidad": 0}
        dias[d]["total"] = round(dias[d]["total"] + float(v.total), 2)
        dias[d]["cantidad"] += 1

    return {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "total": round(total, 2),
        "cantidad": cantidad,
        "ticket_promedio": round(ticket_promedio, 2),
        "por_dia": sorted(dias.values(), key=lambda x: x["fecha"]),
    }


# ── Top productos ─────────────────────────────────────────────────────────────

@router.get("/productos/top-ventas")
def top_productos(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    desde, hasta = _rango(desde, hasta)

    rows = (
        db.query(
            Producto.id,
            Producto.nombre,
            Producto.precio_compra,
            Producto.precio_venta,
            func.sum(DetalleVenta.cantidad).label("unidades"),
            func.sum(DetalleVenta.subtotal).label("ingresos"),
        )
        .join(DetalleVenta, DetalleVenta.producto_id == Producto.id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .filter(
            Venta.fecha >= desde,
            Venta.fecha <= hasta,
            Venta.estado == "completada",
        )
        .group_by(Producto.id)
        .order_by(func.sum(DetalleVenta.cantidad).desc())
        .limit(limite)
        .all()
    )

    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "precio_compra": float(r.precio_compra),
            "precio_venta": float(r.precio_venta),
            # unidades puede ser decimal (productos vendidos por peso/volumen)
            "unidades": float(r.unidades or 0),
            "ingresos": round(float(r.ingresos or 0), 2),
            "ganancia": round(float(r.precio_venta - r.precio_compra) * float(r.unidades or 0), 2),
        }
        for r in rows
    ]


# ── Ganancia bruta por categoría ──────────────────────────────────────────────

@router.get("/ganancia-bruta")
def ganancia_bruta(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    desde, hasta = _rango(desde, hasta)

    rows = (
        db.query(
            Categoria.nombre.label("categoria"),
            func.sum(DetalleVenta.cantidad).label("unidades"),
            func.sum(DetalleVenta.subtotal).label("ingresos"),
            func.sum(
                (DetalleVenta.precio_unitario - Producto.precio_compra) * DetalleVenta.cantidad
            ).label("ganancia"),
        )
        .join(Producto, Producto.id == DetalleVenta.producto_id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .outerjoin(Categoria, Categoria.id == Producto.categoria_id)
        .filter(
            Venta.fecha >= desde,
            Venta.fecha <= hasta,
            Venta.estado == "completada",
        )
        .group_by(Categoria.id)
        .all()
    )

    total_ingresos = sum(float(r.ingresos or 0) for r in rows)
    total_ganancia = sum(float(r.ganancia or 0) for r in rows)
    margen = (total_ganancia / total_ingresos * 100) if total_ingresos else 0

    return {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "total_ingresos": round(total_ingresos, 2),
        "total_ganancia": round(total_ganancia, 2),
        "margen_promedio": round(margen, 2),
        "por_categoria": [
            {
                "categoria": r.categoria or "Sin categoría",
                "unidades": float(r.unidades or 0),
                "ingresos": round(float(r.ingresos or 0), 2),
                "ganancia": round(float(r.ganancia or 0), 2),
            }
            for r in rows
        ],
    }


# ── Analítica: series de ventas/ganancia + turnos ─────────────────────────────

@router.get("/analitica")
def analitica(
    dias: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """Los números que más importan en el mercadito, listos para graficar:
    serie diaria de ventas/ganancia/transacciones, totales de hoy/semana/mes
    y transacciones por turno de caja."""
    desde = inicio_dia_local(dias_atras=dias - 1)
    ahora = ahora_utc()

    # Serie diaria: ventas, ganancia y transacciones (ganancia = venta − costo actual)
    rows = (
        db.query(
            Venta.id, Venta.fecha, Venta.total,
        )
        .filter(Venta.fecha >= desde, Venta.estado == "completada")
        .all()
    )
    ganancia_rows = (
        db.query(
            Venta.id.label("venta_id"),
            func.sum((DetalleVenta.precio_unitario - Producto.precio_compra) * DetalleVenta.cantidad).label("ganancia"),
        )
        .join(DetalleVenta, DetalleVenta.venta_id == Venta.id)
        .join(Producto, Producto.id == DetalleVenta.producto_id)
        .filter(Venta.fecha >= desde, Venta.estado == "completada")
        .group_by(Venta.id)
        .all()
    )
    ganancia_por_venta = {r.venta_id: float(r.ganancia or 0) for r in ganancia_rows}

    serie: dict = {}
    for v in rows:
        d = v.fecha.strftime("%Y-%m-%d")
        if d not in serie:
            serie[d] = {"fecha": d, "ventas": 0.0, "ganancia": 0.0, "transacciones": 0}
        serie[d]["ventas"] = round(serie[d]["ventas"] + float(v.total), 2)
        serie[d]["ganancia"] = round(serie[d]["ganancia"] + ganancia_por_venta.get(v.id, 0), 2)
        serie[d]["transacciones"] += 1

    def _totales(desde_dt):
        vs = [v for v in rows if v.fecha >= desde_dt.replace(tzinfo=None)]
        return {
            "ventas": round(sum(float(v.total) for v in vs), 2),
            "ganancia": round(sum(ganancia_por_venta.get(v.id, 0) for v in vs), 2),
            "transacciones": len(vs),
        }

    # Turnos de caja recientes con sus ventas
    sesiones = (
        db.query(CajaSesion)
        .order_by(CajaSesion.fecha_apertura.desc())
        .limit(15)
        .all()
    )
    turnos = []
    for s in sesiones:
        ventas_turno = db.query(
            func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id)
        ).filter(Venta.caja_sesion_id == s.id, Venta.estado == "completada").first()
        turnos.append({
            "id": s.id,
            "apertura": a_iso_utc(s.fecha_apertura),
            "cierre": a_iso_utc(s.fecha_cierre),
            "estado": s.estado,
            "usuario": s.usuario_apertura.nombre if s.usuario_apertura else "—",
            "monto_inicial": float(s.monto_inicial),
            "diferencia": float(s.diferencia) if s.diferencia is not None else None,
            "total_ventas": round(float(ventas_turno[0] or 0), 2),
            "transacciones": int(ventas_turno[1] or 0),
        })

    return {
        "desde": a_iso_utc(desde),
        "hasta": a_iso_utc(ahora),
        "hoy": _totales(inicio_dia_local()),
        "semana": _totales(inicio_semana_local()),
        "mes": _totales(inicio_mes_local()),
        "serie_diaria": sorted(serie.values(), key=lambda x: x["fecha"]),
        "turnos": turnos,
    }


# ── Exportar CSV ──────────────────────────────────────────────────────────────

@router.get("/ventas/exportar")
def exportar_ventas_csv(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    desde, hasta = _rango(desde, hasta)
    ventas = (
        db.query(Venta)
        .filter(Venta.fecha >= desde, Venta.fecha <= hasta, Venta.estado == "completada")
        .order_by(Venta.fecha.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Recibo", "Fecha", "Vendedor", "Método pago", "Total", "Monto recibido", "Cambio", "Productos"])

    for v in ventas:
        prods = "; ".join(f"{d.cantidad}x {d.producto.nombre if d.producto else d.producto_id}" for d in v.detalles)
        writer.writerow([
            v.numero_recibo,
            v.fecha.strftime("%Y-%m-%d %H:%M"),
            v.usuario.nombre if v.usuario else v.usuario_id,
            v.metodo_pago,
            v.total,
            v.monto_recibido or "",
            v.cambio or "",
            prods,
        ])

    output.seek(0)
    filename = f"ventas_{desde.strftime('%Y%m%d')}_{hasta.strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Reporte de ventas en PDF (lista) ──────────────────────────────────────────

@router.get("/ventas/pdf")
def reporte_ventas_pdf(
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """Lista de ventas del período en PDF: una fila por venta + resumen."""
    from fastapi.responses import Response
    from sqlalchemy.orm import joinedload
    from app.core import pdfs

    desde, hasta = _rango(desde, hasta)
    ventas = (
        db.query(Venta)
        .options(joinedload(Venta.usuario), joinedload(Venta.cliente))
        .filter(Venta.fecha >= desde, Venta.fecha <= hasta)
        .order_by(Venta.fecha.desc())
        .all()
    )

    completadas = [v for v in ventas if v.estado == "completada"]
    resumen = {
        "total": sum(float(v.total) for v in completadas),
        "cantidad": len(completadas),
        "efectivo": sum(float(v.total) for v in completadas if v.metodo_pago == "efectivo")
                    + sum(float(v.monto_efectivo or 0) for v in completadas if v.metodo_pago == "mixto"),
        "tarjeta": sum(float(v.total) for v in completadas if v.metodo_pago == "tarjeta")
                   + sum(float(v.monto_tarjeta or 0) for v in completadas if v.metodo_pago == "mixto"),
        "credito": sum(float(v.total) for v in completadas if v.metodo_pago == "credito"),
    }

    contenido = pdfs.reporte_ventas_pdf(ventas, desde, hasta, resumen)
    nombre = f"ventas_{desde.strftime('%Y%m%d')}_{hasta.strftime('%Y%m%d')}.pdf"
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre}"},
    )


# ── Exportar inventario completo (CSV) ────────────────────────────────────────

@router.get("/inventario/exportar")
def exportar_inventario_csv(
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    """Reporte general de productos existentes: catálogo completo con stock,
    precios y valor del inventario (a costo y a precio de venta)."""
    q = db.query(Producto)
    if not incluir_inactivos:
        q = q.filter(Producto.activo == True)
    productos = q.order_by(Producto.nombre).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Producto", "SKU", "Código de barras", "Categoría", "Proveedor",
        "Unidad", "Stock", "Stock mínimo", "Stock máximo",
        "Precio compra", "Precio venta", "Precio mayoreo",
        "Valor inventario (costo)", "Valor inventario (venta)", "Activo",
    ])

    total_costo = 0.0
    total_venta = 0.0
    for p in productos:
        stock = float(p.stock)
        v_costo = round(stock * float(p.precio_compra), 2)
        v_venta = round(stock * float(p.precio_venta), 2)
        total_costo += v_costo
        total_venta += v_venta
        writer.writerow([
            p.nombre, p.sku or "", p.codigo_barras or "",
            p.categoria.nombre if p.categoria else "",
            p.proveedor.nombre if p.proveedor else "",
            p.unidad_medida, stock, float(p.stock_minimo),
            float(p.stock_maximo) if p.stock_maximo is not None else "",
            float(p.precio_compra), float(p.precio_venta),
            float(p.precio_mayoreo) if p.precio_mayoreo is not None else "",
            v_costo, v_venta, "Sí" if p.activo else "No",
        ])

    writer.writerow([])
    writer.writerow(["TOTALES", "", "", "", "", "", "", "", "", "", "", "",
                     round(total_costo, 2), round(total_venta, 2), ""])

    output.seek(0)
    filename = f"inventario_{ahora_utc().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter(["﻿" + output.getvalue()]),   # BOM para que Excel abra bien los acentos
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
