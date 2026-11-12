"""
clientes.py — Clientes y cuenta corriente (crédito).

Reglas:
  * El vendedor puede REGISTRAR clientes y COBRAR abonos, pero solo el admin
    habilita crédito o cambia límites.
  * Nada se borra: desactivación lógica; pagos y ventas son inmutables.
  * Cada abono baja la deuda automáticamente (saldo = créditos − pagos).
  * Los abonos exigen caja abierta y quedan ligados a la sesión (arqueo).
"""
from typing import Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Cliente, PagoCliente, Venta, CajaSesion, Usuario
from app.schemas.schemas import (
    ClienteCreate, ClienteUpdate, ClienteResponse, ClienteConSaldoResponse,
    PaginatedClientes, PagoClienteCreate, PagoClienteResponse, VentaResponse,
    LiquidarCuentaRequest,
)
from app.core.dependencies import require_admin, require_permission
from app.services import clientes_service

router = APIRouter(prefix="/clientes", tags=["Clientes"])


def _con_saldo(db: Session, cliente: Cliente) -> dict:
    data = ClienteResponse.model_validate(cliente).model_dump()
    data["saldo"] = float(clientes_service.saldo_cliente(db, cliente.id))
    return data


# ── Listar / cartera ──────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedClientes)
def listar_clientes(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    solo_credito: bool = Query(False),
    incluir_inactivos: bool = Query(False),
    db: Session = Depends(get_db),
    _=Depends(require_permission("clientes.ver")),
):
    q = db.query(Cliente)
    if not incluir_inactivos:
        q = q.filter(Cliente.activo == True)
    if search:
        q = q.filter(Cliente.nombre.ilike(f"%{search}%") | Cliente.telefono.ilike(f"%{search}%"))
    if solo_credito:
        q = q.filter(Cliente.permite_credito == True)

    total = q.count()
    items = q.order_by(Cliente.nombre).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total, "page": page, "per_page": per_page,
        "items": [_con_saldo(db, c) for c in items],
    }


@router.get("/con-deuda", response_model=list[ClienteConSaldoResponse])
def clientes_con_deuda(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Cartera: clientes con cuenta abierta (saldo pendiente), de mayor a menor deuda."""
    clientes = db.query(Cliente).all()
    con_deuda = []
    for c in clientes:
        saldo = clientes_service.saldo_cliente(db, c.id)
        if saldo > 0:
            data = ClienteResponse.model_validate(c).model_dump()
            data["saldo"] = float(saldo)
            con_deuda.append(data)
    return sorted(con_deuda, key=lambda x: x["saldo"], reverse=True)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/{cliente_id}", response_model=ClienteConSaldoResponse)
def obtener_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("clientes.ver")),
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return _con_saldo(db, cliente)


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def crear_cliente(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("clientes.crear")),
):
    # Cualquier cliente puede llevar fiado; solo el límite (opcional) es cosa de admin
    if current_user.rol != "admin" and data.limite_credito is not None:
        raise HTTPException(
            status_code=403,
            detail="Solo el administrador puede definir límites de crédito",
        )
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteResponse)
def actualizar_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", response_model=ClienteResponse)
def desactivar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Desactivación lógica: el historial NUNCA se borra."""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    saldo = clientes_service.saldo_cliente(db, cliente_id)
    if saldo > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede desactivar: el cliente tiene una deuda pendiente de {saldo}",
        )
    cliente.activo = False
    db.commit()
    db.refresh(cliente)
    return cliente


# ── Estado de cuenta (cartelera) ──────────────────────────────────────────────

@router.get("/{cliente_id}/estado-cuenta")
def estado_cuenta(
    cliente_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("clientes.ver")),
):
    """Cuenta corriente completa: compras a crédito, pagos, saldo y línea de tiempo."""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    from app.core.timeutils import a_iso_utc

    ventas_credito = (
        db.query(Venta)
        .options(joinedload(Venta.detalles))
        .filter(Venta.cliente_id == cliente_id, Venta.es_credito == True)
        .order_by(Venta.fecha.desc())
        .all()
    )
    pagos = (
        db.query(PagoCliente)
        .filter(PagoCliente.cliente_id == cliente_id)
        .order_by(PagoCliente.fecha.desc())
        .all()
    )
    saldo = clientes_service.saldo_cliente(db, cliente_id)

    return {
        "cliente": {
            "id": cliente.id,
            "nombre": cliente.nombre,
            "telefono": cliente.telefono,
            "permite_credito": cliente.permite_credito,
            "limite_credito": float(cliente.limite_credito) if cliente.limite_credito is not None else None,
            "activo": cliente.activo,
            "notas": cliente.notas,
        },
        "saldo_pendiente": float(saldo),
        "credito_disponible": (
            float(Decimal(str(cliente.limite_credito)) - saldo)
            if cliente.limite_credito is not None else None
        ),
        "compras_credito": [
            {
                "venta_id": v.id,
                "numero_recibo": v.numero_recibo,
                "fecha": a_iso_utc(v.fecha),
                "total": float(v.total),
                "estado": v.estado,
                "productos": [
                    {
                        "nombre": d.producto.nombre if d.producto else f"#{d.producto_id}",
                        "cantidad": float(d.cantidad),
                        "precio_unitario": float(d.precio_unitario),
                        "subtotal": float(d.subtotal),
                    }
                    for d in v.detalles
                ],
            }
            for v in ventas_credito
        ],
        "pagos": [
            {
                "id": p.id,
                "fecha": a_iso_utc(p.fecha),
                "monto": float(p.monto),
                "metodo": p.metodo,
                "notas": p.notas,
                "usuario_id": p.usuario_id,
            }
            for p in pagos
        ],
    }


# ── Abonos ────────────────────────────────────────────────────────────────────

@router.post("/{cliente_id}/pagos", response_model=PagoClienteResponse, status_code=201)
def registrar_abono(
    cliente_id: int,
    data: PagoClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("clientes.cobrar")),
):
    """Registra un abono a la cuenta del cliente. El dinero entra a la caja
    abierta, por lo que se exige una sesión activa (arqueo consistente)."""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.activo == True).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    saldo = clientes_service.saldo_cliente(db, cliente_id)
    if saldo <= 0:
        raise HTTPException(status_code=400, detail="El cliente no tiene deuda pendiente")

    caja = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if not caja:
        raise HTTPException(status_code=400, detail="No hay caja abierta. Abre la caja para cobrar abonos.")

    monto = Decimal(str(data.monto)).quantize(Decimal("0.01"))
    if monto > saldo:
        raise HTTPException(
            status_code=400,
            detail=f"El abono ({monto}) es mayor que la deuda pendiente ({saldo})",
        )

    pago = PagoCliente(
        cliente_id=cliente_id,
        monto=monto,
        metodo=data.metodo,
        usuario_id=current_user.id,
        caja_sesion_id=caja.id,
        notas=data.notas,
    )
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago


# ── Liquidar cuenta (cancelar todo el saldo de una vez) ──────────────────────

@router.post("/{cliente_id}/liquidar", response_model=PagoClienteResponse, status_code=201)
def liquidar_cuenta(
    cliente_id: int,
    data: LiquidarCuentaRequest = LiquidarCuentaRequest(),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("clientes.cobrar")),
):
    """Cancela la cuenta completa del cliente en un solo pago (el saldo total exacto)."""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.activo == True).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    saldo = clientes_service.saldo_cliente(db, cliente_id)
    if saldo <= 0:
        raise HTTPException(status_code=400, detail="El cliente no tiene cuenta pendiente")

    caja = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if not caja:
        raise HTTPException(status_code=400, detail="No hay caja abierta. Abre la caja para cobrar.")

    pago = PagoCliente(
        cliente_id=cliente_id,
        monto=saldo.quantize(Decimal("0.01")),
        metodo=data.metodo,
        usuario_id=current_user.id,
        caja_sesion_id=caja.id,
        notas=data.notas or "Liquidación total de cuenta",
    )
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago
