"""
inventario_service.py — ÚNICA puerta para modificar stock.

Reglas que este servicio garantiza:

  1. Todo cambio de stock genera un MovimientoStock (libro de movimientos).
  2. El stock NUNCA queda negativo (StockInsuficienteError si se intenta).
  3. Solo se aceptan tipos de movimiento válidos (TIPOS_MOVIMIENTO).
  4. Nadie modifica producto.stock directamente: ventas, compras, ajustes,
     devoluciones, pérdidas, mermas y vencimientos pasan todos por aquí.

El servicio NO hace commit: participa en la transacción del caso de uso que
lo llama (el commit/rollback es responsabilidad del router o caso de uso).
Junto con la transacción única de SQLite esto evita sobreventa: la validación
y el descuento ocurren en la misma transacción.

Cantidades: Decimal (soporta venta por peso/volumen, ej. 0.5 kg).
"""
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import Producto, MovimientoStock, TIPOS_MOVIMIENTO

# Tipos que RESTAN stock y llevan cantidad negativa
TIPOS_SALIDA = ("salida", "perdida", "merma", "vencimiento")


class StockInsuficienteError(Exception):
    """Se lanza cuando un movimiento dejaría el stock en negativo."""

    def __init__(self, producto: Producto, solicitado):
        self.producto = producto
        self.solicitado = solicitado
        super().__init__(
            f"Stock insuficiente para '{producto.nombre}'. "
            f"Disponible: {producto.stock}, solicitado: {solicitado}"
        )


class TipoMovimientoInvalidoError(Exception):
    def __init__(self, tipo: str):
        super().__init__(f"Tipo de movimiento inválido: '{tipo}'. Válidos: {', '.join(TIPOS_MOVIMIENTO)}")


def _dec(valor) -> Decimal:
    """Coerción segura a Decimal (evita mezclar float y Decimal)."""
    if isinstance(valor, Decimal):
        return valor
    return Decimal(str(valor))


def registrar_movimiento(
    db: Session,
    producto: Producto,
    tipo: str,                      # ver TIPOS_MOVIMIENTO en models
    cantidad,                       # con signo: >0 entra, <0 sale (Decimal/int/float)
    usuario_id: int,
    motivo: Optional[str] = None,
    referencia_id: Optional[int] = None,
) -> MovimientoStock:
    """Aplica un movimiento de inventario y actualiza el stock del producto.

    Es la única función autorizada para cambiar producto.stock.
    Lanza StockInsuficienteError si el resultado sería negativo.
    """
    if tipo not in TIPOS_MOVIMIENTO:
        raise TipoMovimientoInvalidoError(tipo)

    cantidad = _dec(cantidad)
    stock_anterior = _dec(producto.stock)
    stock_nuevo = stock_anterior + cantidad

    if stock_nuevo < 0:
        raise StockInsuficienteError(producto, -cantidad)

    producto.stock = stock_nuevo
    mov = MovimientoStock(
        producto_id=producto.id,
        tipo=tipo,
        cantidad=cantidad,
        stock_anterior=stock_anterior,
        stock_nuevo=stock_nuevo,
        motivo=motivo,
        usuario_id=usuario_id,
        referencia_id=referencia_id,
    )
    db.add(mov)
    return mov


def registrar_salida(
    db: Session,
    producto: Producto,
    tipo: str,                      # salida | perdida | merma | vencimiento
    cantidad,                       # positiva; el servicio aplica el signo
    usuario_id: int,
    motivo: str,
    referencia_id: Optional[int] = None,
) -> MovimientoStock:
    """Salida de inventario (pérdida, merma, vencimiento o salida general).

    La cantidad se pasa en positivo y el motivo es OBLIGATORIO: estas salidas
    son las que auditoría necesita explicar después.
    """
    if tipo not in TIPOS_SALIDA:
        raise TipoMovimientoInvalidoError(tipo)
    cantidad = _dec(cantidad)
    if cantidad <= 0:
        raise ValueError("La cantidad de una salida debe ser mayor a 0")
    if not motivo or not motivo.strip():
        raise ValueError("El motivo es obligatorio para salidas de inventario")
    return registrar_movimiento(
        db, producto, tipo, -cantidad, usuario_id,
        motivo=motivo.strip(), referencia_id=referencia_id,
    )


def ajustar_a(
    db: Session,
    producto: Producto,
    stock_nuevo,
    usuario_id: int,
    motivo: str,
) -> MovimientoStock:
    """Ajuste absoluto: lleva el stock al valor indicado registrando la diferencia."""
    diferencia = _dec(stock_nuevo) - _dec(producto.stock)
    return registrar_movimiento(
        db, producto, "ajuste", diferencia, usuario_id, motivo=motivo,
    )
