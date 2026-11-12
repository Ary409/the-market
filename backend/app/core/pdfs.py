"""
pdfs.py — Generación de PDFs (reportlab).

  * Orden de compra en formato CARTA (para imprimir/entregar al repartidor).
  * Orden de compra en formato TICKET 80mm (máquina térmica).
  * Reporte de ventas en lista (carta).

Todo se genera en memoria (BytesIO) y se sirve como descarga.
"""
import io
from datetime import timezone, datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.lib import colors as rl_colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.pdfgen import canvas as rl_canvas

NEGRO = rl_colors.HexColor("#111111")
GRIS = rl_colors.HexColor("#666666")
BORDE = rl_colors.HexColor("#DDDDDD")

_styles = getSampleStyleSheet()
TITULO = ParagraphStyle("titulo", parent=_styles["Heading1"], fontSize=16, spaceAfter=2, textColor=NEGRO)
SUB = ParagraphStyle("sub", parent=_styles["Normal"], fontSize=9, textColor=GRIS)
NORMAL = ParagraphStyle("normal", parent=_styles["Normal"], fontSize=10, textColor=NEGRO)


def _fmt_money(v) -> str:
    return f"L {float(v):,.2f}"


def _fmt_fecha(dt) -> str:
    if dt is None:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone().strftime("%d/%m/%Y %H:%M")


def _fmt_cant(v) -> str:
    f = float(v)
    return str(int(f)) if f == int(f) else f"{f:g}"


# ── Orden de compra: CARTA ────────────────────────────────────────────────────

def orden_compra_carta(orden) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=22 * mm, rightMargin=22 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"Orden de compra OC-{orden.id:04d}",
    )
    el = []

    el.append(Paragraph("THE MARKET", TITULO))
    el.append(Paragraph("Orden de compra", SUB))
    el.append(Spacer(1, 10))
    el.append(HRFlowable(width="100%", thickness=1, color=NEGRO))
    el.append(Spacer(1, 10))

    info = [
        ["Orden:", f"OC-{orden.id:04d}", "Fecha:", _fmt_fecha(orden.fecha)],
        ["Proveedor:", orden.proveedor.nombre if orden.proveedor else "—",
         "Teléfono:", (orden.proveedor.telefono if orden.proveedor else None) or "—"],
        ["Estado:", orden.estado.upper(), "", ""],
    ]
    t = Table(info, colWidths=[28 * mm, 65 * mm, 22 * mm, 50 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), GRIS),
        ("TEXTCOLOR", (2, 0), (2, -1), GRIS),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    el.append(t)
    el.append(Spacer(1, 12))

    filas = [["Cant.", "Producto", "Precio unit.", "Subtotal"]]
    for d in orden.detalles:
        filas.append([
            _fmt_cant(d.cantidad),
            d.producto.nombre if d.producto else f"#{d.producto_id}",
            _fmt_money(d.precio_unitario),
            _fmt_money(d.subtotal),
        ])
    filas.append(["", "", "TOTAL", _fmt_money(orden.total)])

    t = Table(filas, colWidths=[18 * mm, 92 * mm, 27 * mm, 28 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor("#F2F2F2")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (2, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -2), 0.5, BORDE),
        ("LINEABOVE", (2, -1), (-1, -1), 1, NEGRO),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    el.append(t)

    if orden.notas:
        el.append(Spacer(1, 10))
        el.append(Paragraph(f"<b>Notas:</b> {orden.notas}", NORMAL))

    el.append(Spacer(1, 34))
    firmas = Table(
        [["_______________________", "_______________________"],
         ["Entregado por", "Recibido por"]],
        colWidths=[80 * mm, 80 * mm],
    )
    firmas.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 1), (-1, 1), 8),
        ("TEXTCOLOR", (0, 1), (-1, 1), GRIS),
    ]))
    el.append(firmas)

    doc.build(el)
    return buf.getvalue()


# ── Orden de compra: TICKET 80mm (térmica) ────────────────────────────────────

def orden_compra_ticket(orden) -> bytes:
    ancho = 80 * mm
    lineas = 14 + len(orden.detalles) * 2 + (2 if orden.notas else 0)
    alto = max(120 * mm, lineas * 5 * mm)

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(ancho, alto))
    y = alto - 8 * mm
    cx = ancho / 2

    def linea(texto, size=8, bold=False, center=False, right_val=None):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        if right_val is not None:
            c.drawString(4 * mm, y, texto)
            c.drawRightString(ancho - 4 * mm, y, right_val)
        elif center:
            c.drawCentredString(cx, y, texto)
        else:
            c.drawString(4 * mm, y, texto)
        y -= (size + 4)

    def separador():
        nonlocal y
        c.setFont("Helvetica", 7)
        c.drawCentredString(cx, y, "-" * 48)
        y -= 10

    linea("THE MARKET", 11, bold=True, center=True)
    linea("ORDEN DE COMPRA", 9, bold=True, center=True)
    linea(f"OC-{orden.id:04d}", 8, center=True)
    linea(_fmt_fecha(orden.fecha), 7, center=True)
    separador()
    linea(f"Proveedor: {orden.proveedor.nombre if orden.proveedor else '—'}", 8)
    if orden.proveedor and orden.proveedor.telefono:
        linea(f"Tel: {orden.proveedor.telefono}", 7)
    separador()

    for d in orden.detalles:
        nombre = d.producto.nombre if d.producto else f"#{d.producto_id}"
        linea(f"{_fmt_cant(d.cantidad)} x {nombre[:30]}", 8)
        linea(f"   @ {_fmt_money(d.precio_unitario)}", 7, right_val=_fmt_money(d.subtotal))

    separador()
    linea("TOTAL", 10, bold=True, right_val=_fmt_money(orden.total))
    if orden.notas:
        separador()
        linea(f"Notas: {orden.notas[:40]}", 7)
    separador()
    linea("Entregado: ____________________", 8)
    y -= 6
    linea("Recibido:  ____________________", 8)

    c.showPage()
    c.save()
    return buf.getvalue()


# ── Reporte de ventas (lista) ─────────────────────────────────────────────────

def reporte_ventas_pdf(ventas, desde, hasta, resumen: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
        title="Reporte de ventas",
    )
    el = []

    el.append(Paragraph("THE MARKET", TITULO))
    el.append(Paragraph(
        f"Reporte de ventas · {_fmt_fecha(desde)} — {_fmt_fecha(hasta)}", SUB))
    el.append(Spacer(1, 8))
    el.append(HRFlowable(width="100%", thickness=1, color=NEGRO))
    el.append(Spacer(1, 10))

    # Resumen arriba
    res = [
        ["Total vendido", "Transacciones", "Efectivo", "Tarjeta", "Fiado"],
        [_fmt_money(resumen["total"]), str(resumen["cantidad"]),
         _fmt_money(resumen["efectivo"]), _fmt_money(resumen["tarjeta"]),
         _fmt_money(resumen["credito"])],
    ]
    t = Table(res, colWidths=[36 * mm] * 5)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("TEXTCOLOR", (0, 0), (-1, 0), GRIS),
        ("FONTSIZE", (0, 1), (-1, 1), 11),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    el.append(t)
    el.append(Spacer(1, 12))

    # Lista de ventas, una por fila
    filas = [["Recibo", "Fecha", "Vendedor", "Cliente", "Método", "Estado", "Total"]]
    for v in ventas:
        filas.append([
            v.numero_recibo,
            _fmt_fecha(v.fecha),
            (v.usuario.nombre if v.usuario else "—")[:18],
            (v.cliente.nombre if v.cliente else "—")[:18],
            "fiado" if v.metodo_pago == "credito" else v.metodo_pago,
            v.estado,
            _fmt_money(v.total),
        ])

    t = Table(filas, colWidths=[34 * mm, 30 * mm, 30 * mm, 30 * mm, 18 * mm, 20 * mm, 22 * mm], repeatRows=1)
    estilo = [
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor("#F2F2F2")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDE),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]
    # Ventas anuladas en gris
    for idx, v in enumerate(ventas, start=1):
        if v.estado == "anulada":
            estilo.append(("TEXTCOLOR", (0, idx), (-1, idx), GRIS))
    t.setStyle(TableStyle(estilo))
    el.append(t)

    el.append(Spacer(1, 10))
    el.append(Paragraph(
        f"Generado el {_fmt_fecha(datetime.now(timezone.utc))} · {len(ventas)} ventas en el período",
        SUB))

    doc.build(el)
    return buf.getvalue()
