"""
clientes_service.py — Cuenta corriente (crédito) de clientes.

Saldo = Σ ventas a crédito completadas − Σ abonos.
El historial nunca se borra: las anulaciones se excluyen por estado.
"""
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Cliente, Venta, PagoCliente


class LimiteCreditoExcedidoError(Exception):
    def __init__(self, cliente: Cliente, saldo: Decimal, intento: Decimal):
        self.cliente = cliente
        super().__init__(
            f"Límite de crédito excedido para '{cliente.nombre}'. "
            f"Saldo actual: {saldo}, límite: {cliente.limite_credito}, intento: {intento}"
        )


def saldo_cliente(db: Session, cliente_id: int) -> Decimal:
    """Deuda pendiente del cliente (puede ser 0 o saldo a favor si pagó de más)."""
    total_credito = db.query(func.coalesce(func.sum(Venta.total), 0)).filter(
        Venta.cliente_id == cliente_id,
        Venta.es_credito == True,
        Venta.estado == "completada",
    ).scalar()
    total_pagos = db.query(func.coalesce(func.sum(PagoCliente.monto), 0)).filter(
        PagoCliente.cliente_id == cliente_id,
    ).scalar()
    return Decimal(str(total_credito)) - Decimal(str(total_pagos))


def validar_credito(db: Session, cliente: Cliente, monto_venta: Decimal) -> Decimal:
    """Valida que el cliente pueda llevar fiado por `monto_venta`.

    Regla del negocio: CUALQUIER cliente registrado puede llevar fiado
    (cuenta abierta) sin necesidad de habilitación previa. El límite de
    crédito es OPCIONAL: solo se valida si el administrador definió uno.

    Devuelve el saldo actual. Lanza excepción solo si excede el límite.
    """
    saldo = saldo_cliente(db, cliente.id)
    if cliente.limite_credito is not None:
        limite = Decimal(str(cliente.limite_credito))
        if saldo + monto_venta > limite:
            raise LimiteCreditoExcedidoError(cliente, saldo, monto_venta)
    return saldo
