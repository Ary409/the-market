"""
caja.py — Sesiones de caja (turnos).

Fase 2.3/2.7:
  * El cierre suma SOLO las ventas de ESTA sesión (caja_sesion_id), no por fecha
    global — antes dos turnos podían duplicar el conteo.
  * El pago mixto se desglosa correctamente (antes se sumaba doble).
  * Los abonos de clientes cobrados durante la sesión entran al arqueo.
  * Al cerrar caja se generan las recomendaciones para el administrador.
"""
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import CajaSesion, Venta, PagoCliente
from app.schemas.schemas import CajaAbrirRequest, CajaCerrarRequest, CajaSesionResponse, CajaCierreResponse
from app.core.dependencies import require_admin, require_permission
from app.models.models import Usuario
from app.services import recomendaciones_service

router = APIRouter(prefix="/caja", tags=["Caja"])

D0 = Decimal("0")


def _q2(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"))


# ── Estado actual ─────────────────────────────────────────────────────────────

@router.get("/actual", response_model=CajaSesionResponse | None)
def caja_actual(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("caja.operar")),
):
    return db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()


# ── Historial de sesiones ─────────────────────────────────────────────────────

@router.get("/sesiones", response_model=list[CajaSesionResponse])
def historial_sesiones(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    return (
        db.query(CajaSesion)
        .order_by(CajaSesion.fecha_apertura.desc())
        .limit(limit)
        .all()
    )


# ── Abrir caja ────────────────────────────────────────────────────────────────

@router.post("/abrir", response_model=CajaSesionResponse, status_code=201)
def abrir_caja(
    data: CajaAbrirRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("caja.operar")),
):
    abierta = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if abierta:
        raise HTTPException(status_code=400, detail="Ya hay una caja abierta. Ciérrala antes de abrir una nueva.")

    sesion = CajaSesion(
        usuario_apertura_id=current_user.id,
        monto_inicial=data.monto_inicial,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return sesion


# ── Cerrar caja ───────────────────────────────────────────────────────────────

@router.post("/cerrar", response_model=CajaCierreResponse)
def cerrar_caja(
    data: CajaCerrarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("caja.operar")),
):
    sesion = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if not sesion:
        raise HTTPException(status_code=400, detail="No hay caja abierta")

    # Ventas de ESTA sesión (no por fecha: evita duplicar entre turnos)
    ventas_sesion = (
        db.query(Venta)
        .filter(Venta.caja_sesion_id == sesion.id, Venta.estado == "completada")
        .all()
    )

    total_ventas = sum((Decimal(str(v.total)) for v in ventas_sesion), D0)

    # Desglose correcto por método (mixto reparte, no duplica)
    ventas_efectivo = D0
    ventas_tarjeta = D0
    ventas_credito = D0
    for v in ventas_sesion:
        t = Decimal(str(v.total))
        if v.metodo_pago == "efectivo":
            ventas_efectivo += t
        elif v.metodo_pago == "tarjeta":
            ventas_tarjeta += t
        elif v.metodo_pago == "mixto":
            ventas_efectivo += Decimal(str(v.monto_efectivo or 0))
            ventas_tarjeta += Decimal(str(v.monto_tarjeta or 0))
        elif v.metodo_pago == "credito":
            ventas_credito += t  # no entra dinero a caja

    # Abonos de clientes cobrados en esta sesión
    pagos_sesion = db.query(PagoCliente).filter(PagoCliente.caja_sesion_id == sesion.id).all()
    cobros_efectivo = sum((Decimal(str(p.monto)) for p in pagos_sesion if p.metodo == "efectivo"), D0)
    cobros_tarjeta = sum((Decimal(str(p.monto)) for p in pagos_sesion if p.metodo == "tarjeta"), D0)

    monto_esperado = Decimal(str(sesion.monto_inicial)) + ventas_efectivo + cobros_efectivo
    monto_contado = Decimal(str(data.monto_contado))
    diferencia = _q2(monto_contado - monto_esperado)

    sesion.usuario_cierre_id = current_user.id
    sesion.monto_contado = monto_contado
    sesion.diferencia = diferencia
    sesion.fecha_cierre = datetime.now(timezone.utc)
    sesion.estado = "cerrada"

    # Cierre diario → generar recomendaciones para el administrador
    try:
        recomendaciones_service.generar(db)
    except Exception:
        # La generación de recomendaciones nunca debe impedir cerrar la caja
        pass

    db.commit()
    db.refresh(sesion)

    # Detalle para el arqueo: fiados del turno y cuentas cobradas
    fiados_turno = [
        {
            "numero_recibo": v.numero_recibo,
            "cliente": v.cliente.nombre if v.cliente else "—",
            "cliente_id": v.cliente_id,
            "total": float(v.total),
        }
        for v in ventas_sesion if v.metodo_pago == "credito"
    ]
    cobros_turno = [
        {
            "cliente": p.cliente.nombre if p.cliente else "—",
            "cliente_id": p.cliente_id,
            "monto": float(p.monto),
            "metodo": p.metodo,
        }
        for p in pagos_sesion
    ]

    return {
        "sesion": sesion,
        "fiados_turno": fiados_turno,
        "cobros_turno": cobros_turno,
        "resumen": {
            "total_ventas": float(_q2(total_ventas)),
            "cantidad_ventas": len(ventas_sesion),
            "ventas_efectivo": float(_q2(ventas_efectivo)),
            "ventas_tarjeta": float(_q2(ventas_tarjeta)),
            "ventas_credito": float(_q2(ventas_credito)),
            "cobros_credito_efectivo": float(_q2(cobros_efectivo)),
            "cobros_credito_tarjeta": float(_q2(cobros_tarjeta)),
            "monto_esperado": float(_q2(monto_esperado)),
            "diferencia": float(diferencia),
        },
    }
