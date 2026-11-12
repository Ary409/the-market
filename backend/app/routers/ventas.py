"""
ventas.py — Punto de venta.

Reglas de negocio (Fase 2.3/2.4):
  * El PRECIO lo fija SIEMPRE el servidor: precio_venta del producto, o
    precio_mayoreo si la cantidad alcanza cantidad_mayoreo. El precio que
    envíe el cliente se ignora (el vendedor no puede alterar precios).
  * Número de recibo por secuencia atómica (tabla secuencias) — sin colisiones.
  * Toda venta queda ligada a la sesión de caja abierta (caja_sesion_id).
  * Pago mixto exige desglose: monto_efectivo + monto_tarjeta == total.
  * Venta a crédito: requiere cliente con crédito habilitado y respeta su límite.
  * El stock se descuenta SOLO vía inventario_service (misma transacción).
  * Productos vendidos por unidad no aceptan cantidades decimales.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import (
    Venta, DetalleVenta, Producto, CajaSesion, Cliente, Secuencia,
)
from app.schemas.schemas import (
    VentaCreate, VentaResponse, PaginatedVentas, AnularVentaRequest,
)
from app.core.dependencies import require_admin, require_permission
from app.core.timeutils import inicio_dia_local, fecha_local_str
from app.models.models import Usuario
from app.services import inventario_service, clientes_service
from app.services.inventario_service import StockInsuficienteError
from app.services.clientes_service import LimiteCreditoExcedidoError

router = APIRouter(prefix="/ventas", tags=["Ventas"])

DOS_DECIMALES = Decimal("0.01")


def _q2(valor: Decimal) -> Decimal:
    return valor.quantize(DOS_DECIMALES)


def _siguiente_numero_recibo(db: Session) -> str:
    """Numeración atómica por día usando la tabla de secuencias.

    El incremento ocurre dentro de la transacción de la venta: dos ventas
    simultáneas nunca reciben el mismo número (SQLite serializa escritores).
    """
    hoy = fecha_local_str("%Y%m%d")
    nombre = f"recibo_{hoy}"
    seq = db.get(Secuencia, nombre)
    if seq is None:
        # Si el día ya tiene recibos emitidos ANTES de existir la secuencia
        # (ventas hechas con versiones previas), arrancar desde el último.
        ultimo = db.query(func.max(Venta.numero_recibo)).filter(
            Venta.numero_recibo.like(f"VTA-{hoy}-%")
        ).scalar()
        inicial = 0
        if ultimo:
            try:
                inicial = int(ultimo.rsplit("-", 1)[1])
            except ValueError:
                inicial = 0
        seq = Secuencia(nombre=nombre, valor=inicial)
        db.add(seq)
        db.flush()
    seq.valor += 1
    numero = f"VTA-{hoy}-{str(seq.valor).zfill(4)}"
    # Defensa final: si por datos heredados el número ya existe, avanzar
    while db.query(Venta.id).filter(Venta.numero_recibo == numero).first() is not None:
        seq.valor += 1
        numero = f"VTA-{hoy}-{str(seq.valor).zfill(4)}"
    return numero


def _precio_del_servidor(producto: Producto, cantidad: Decimal) -> Decimal:
    """Precio unitario según el catálogo: mayoreo si la cantidad lo alcanza."""
    if (
        producto.precio_mayoreo is not None
        and producto.cantidad_mayoreo is not None
        and cantidad >= Decimal(str(producto.cantidad_mayoreo))
    ):
        return Decimal(str(producto.precio_mayoreo))
    return Decimal(str(producto.precio_venta))


# ── Crear venta ───────────────────────────────────────────────────────────────

@router.post("", response_model=VentaResponse, status_code=201)
def crear_venta(
    data: VentaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("ventas.crear")),
):
    # 1. Caja abierta obligatoria
    caja = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if not caja:
        raise HTTPException(status_code=400, detail="No hay caja abierta. Abre la caja antes de registrar ventas.")

    # 2. Validar productos, cantidades y calcular precios EN EL SERVIDOR
    total = Decimal("0")
    items_validados = []
    for item in data.items:
        producto = db.query(Producto).filter(
            Producto.id == item.producto_id, Producto.activo == True
        ).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")

        cantidad = Decimal(str(item.cantidad))
        if producto.unidad_medida == "unidad" and cantidad != cantidad.to_integral_value():
            raise HTTPException(
                status_code=400,
                detail=f"'{producto.nombre}' se vende por unidad — la cantidad debe ser entera",
            )
        if Decimal(str(producto.stock)) < cantidad:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, solicitado: {cantidad}",
            )

        precio = _precio_del_servidor(producto, cantidad)
        subtotal = _q2(precio * cantidad)
        total += subtotal
        items_validados.append((producto, cantidad, precio, subtotal))

    total = _q2(total)

    # 3. Validar método de pago
    cambio = None
    monto_efectivo = None
    monto_tarjeta = None
    cliente = None
    es_credito = data.metodo_pago == "credito"

    if data.cliente_id is not None:
        cliente = db.query(Cliente).filter(Cliente.id == data.cliente_id, Cliente.activo == True).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if es_credito:
        if cliente is None:
            raise HTTPException(status_code=400, detail="Una venta fiada requiere indicar el cliente")
        try:
            clientes_service.validar_credito(db, cliente, total)
        except LimiteCreditoExcedidoError as e:
            raise HTTPException(status_code=400, detail=str(e))

    elif data.metodo_pago == "mixto":
        if data.monto_efectivo is None or data.monto_tarjeta is None:
            raise HTTPException(
                status_code=400,
                detail="El pago mixto requiere el desglose: monto_efectivo y monto_tarjeta",
            )
        monto_efectivo = _q2(Decimal(str(data.monto_efectivo)))
        monto_tarjeta = _q2(Decimal(str(data.monto_tarjeta)))
        if monto_efectivo < 0 or monto_tarjeta < 0:
            raise HTTPException(status_code=400, detail="Los montos del desglose no pueden ser negativos")
        if monto_efectivo + monto_tarjeta != total:
            raise HTTPException(
                status_code=400,
                detail=f"El desglose no cuadra: {monto_efectivo} + {monto_tarjeta} ≠ total {total}",
            )

    elif data.metodo_pago == "efectivo":
        if data.monto_recibido is None:
            raise HTTPException(status_code=400, detail="Indica el monto recibido en efectivo")
        recibido = _q2(Decimal(str(data.monto_recibido)))
        cambio = _q2(recibido - total)
        if cambio < 0:
            raise HTTPException(status_code=400, detail="El monto recibido es menor al total")

    # 4. Crear venta ligada a la caja
    venta = Venta(
        numero_recibo=_siguiente_numero_recibo(db),
        usuario_id=current_user.id,
        caja_sesion_id=caja.id,
        cliente_id=cliente.id if cliente else None,
        total=total,
        metodo_pago=data.metodo_pago,
        es_credito=es_credito,
        monto_recibido=_q2(Decimal(str(data.monto_recibido))) if data.monto_recibido is not None and not es_credito else None,
        cambio=cambio,
        monto_efectivo=monto_efectivo,
        monto_tarjeta=monto_tarjeta,
    )
    db.add(venta)
    db.flush()

    # 5. Detalles + descuento de stock (misma transacción, vía servicio)
    try:
        for producto, cantidad, precio, subtotal in items_validados:
            db.add(DetalleVenta(
                venta_id=venta.id,
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario=precio,
                subtotal=subtotal,
            ))
            inventario_service.registrar_movimiento(
                db, producto, "salida", -cantidad, current_user.id,
                motivo=f"Venta {venta.numero_recibo}",
                referencia_id=venta.id,
            )
    except StockInsuficienteError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    db.refresh(venta)
    return venta


# ── Listar ventas ─────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedVentas)
def listar_ventas(
    hoy: bool = False,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    usuario_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    estado: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("ventas.ver_propias")),
):
    q = db.query(Venta)

    if hoy:
        q = q.filter(Venta.fecha >= inicio_dia_local())
    if desde:
        q = q.filter(Venta.fecha >= desde)
    if hasta:
        q = q.filter(Venta.fecha <= hasta)
    if usuario_id:
        q = q.filter(Venta.usuario_id == usuario_id)
    if cliente_id:
        q = q.filter(Venta.cliente_id == cliente_id)
    if estado:
        q = q.filter(Venta.estado == estado)
    # Vendedor solo ve sus propias ventas
    if current_user.rol == "vendedor":
        q = q.filter(Venta.usuario_id == current_user.id)

    total = q.count()
    items = q.order_by(Venta.fecha.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"total": total, "page": page, "per_page": per_page, "items": items}


# ── Obtener venta por ID ──────────────────────────────────────────────────────

@router.get("/{venta_id}", response_model=VentaResponse)
def obtener_venta(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("ventas.ver_propias")),
):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if current_user.rol == "vendedor" and venta.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin acceso a esta venta")
    return venta


# ── Recibo ────────────────────────────────────────────────────────────────────

@router.get("/{venta_id}/recibo")
def obtener_recibo(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permission("ventas.ver_propias")),
):
    venta = db.query(Venta).options(joinedload(Venta.cliente)).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if current_user.rol == "vendedor" and venta.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin acceso a esta venta")

    from app.core.timeutils import a_iso_utc
    items = [
        {
            "nombre": d.producto.nombre if d.producto else f"Producto #{d.producto_id}",
            "cantidad": float(d.cantidad),
            "precio_unitario": float(d.precio_unitario),
            "subtotal": float(d.subtotal),
        }
        for d in venta.detalles
    ]
    return {
        "numero_recibo": venta.numero_recibo,
        "fecha": a_iso_utc(venta.fecha),
        "vendedor": venta.usuario.nombre if venta.usuario else "—",
        "cliente": venta.cliente.nombre if venta.cliente else None,
        "items": items,
        "total": float(venta.total),
        "metodo_pago": venta.metodo_pago,
        "es_credito": venta.es_credito,
        "monto_recibido": float(venta.monto_recibido) if venta.monto_recibido is not None else None,
        "cambio": float(venta.cambio) if venta.cambio is not None else None,
        "monto_efectivo": float(venta.monto_efectivo) if venta.monto_efectivo is not None else None,
        "monto_tarjeta": float(venta.monto_tarjeta) if venta.monto_tarjeta is not None else None,
        "estado": venta.estado,
    }


# ── Anular venta ──────────────────────────────────────────────────────────────

@router.post("/{venta_id}/anular", response_model=VentaResponse)
def anular_venta(
    venta_id: int,
    data: AnularVentaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if venta.estado == "anulada":
        raise HTTPException(status_code=400, detail="Esta venta ya fue anulada")

    # Reponer stock vía servicio de inventario. Si era a crédito, la deuda del
    # cliente baja automáticamente (el saldo excluye ventas anuladas).
    for detalle in venta.detalles:
        producto = db.query(Producto).filter(Producto.id == detalle.producto_id).first()
        if not producto:
            continue
        inventario_service.registrar_movimiento(
            db, producto, "devolucion", Decimal(str(detalle.cantidad)), current_user.id,
            motivo=f"Anulación {venta.numero_recibo}: {data.motivo}",
            referencia_id=venta_id,
        )

    venta.estado = "anulada"
    venta.motivo_anulacion = data.motivo
    db.commit()
    db.refresh(venta)
    return venta
