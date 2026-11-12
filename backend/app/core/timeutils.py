"""
timeutils.py — Fechas con zona horaria de la tienda.

La BD guarda todo en UTC. Pero "hoy", "esta semana" y "este mes" deben
calcularse con la hora LOCAL de la tienda (antes se usaba medianoche UTC y los
reportes del día quedaban corridos).

Los límites se devuelven como datetimes aware en UTC, listos para filtrar.
"""
from datetime import datetime, timedelta, timezone


def ahora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _ahora_local() -> datetime:
    """Hora actual en la zona horaria del sistema operativo (la de la tienda)."""
    return datetime.now(timezone.utc).astimezone()


def inicio_dia_local(dias_atras: int = 0) -> datetime:
    """Medianoche local de hoy (o de hace N días), expresada en UTC."""
    local = _ahora_local() - timedelta(days=dias_atras)
    inicio = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return inicio.astimezone(timezone.utc)


def inicio_semana_local() -> datetime:
    """Lunes 00:00 local de esta semana, en UTC."""
    local = _ahora_local()
    inicio = (local - timedelta(days=local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return inicio.astimezone(timezone.utc)


def inicio_mes_local() -> datetime:
    """Día 1 del mes 00:00 local, en UTC."""
    local = _ahora_local()
    inicio = local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return inicio.astimezone(timezone.utc)


def fecha_local_str(fmt: str = "%Y%m%d") -> str:
    """Fecha local formateada (para numeración de recibos, etc.)."""
    return _ahora_local().strftime(fmt)


def a_iso_utc(dt: datetime) -> str:
    """Serializa un datetime almacenado (naive=UTC) como ISO con zona explícita."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()
