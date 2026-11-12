"""
models.py — Modelo de datos del sistema.

Convenciones (Fase 2):
  * Dinero:     Numeric(12, 2)  — decimal exacto, nunca Float.
  * Cantidades: Numeric(10, 3)  — soporta venta por peso/volumen (ej. 0.5 kg).
  * El stock NUNCA se modifica directo: siempre vía services.inventario_service.
  * Nada se borra físicamente: estados/activo=False preservan el historial.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, Numeric, String, Text, Enum, Index,
)
from sqlalchemy.orm import relationship
from app.database import Base


def _now():
    return datetime.now(timezone.utc)


# ── Núcleo: usuarios y catálogo ───────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum("admin", "vendedor", name="rol_enum"), nullable=False, default="vendedor")
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    ventas = relationship("Venta", back_populates="usuario")
    movimientos = relationship("MovimientoStock", back_populates="usuario")
    cajas_apertura = relationship("CajaSesion", foreign_keys="CajaSesion.usuario_apertura_id", back_populates="usuario_apertura")
    cajas_cierre = relationship("CajaSesion", foreign_keys="CajaSesion.usuario_cierre_id", back_populates="usuario_cierre")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    productos = relationship("Producto", back_populates="categoria")


class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    direccion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    productos = relationship("Producto", back_populates="proveedor")
    ordenes_compra = relationship("OrdenCompra", back_populates="proveedor")
    pagos = relationship("PagoProveedor", back_populates="proveedor")


# Unidades de medida soportadas (venta por unidad o por peso/volumen)
UNIDADES_MEDIDA = ("unidad", "kg", "g", "lt", "ml", "paquete", "caja")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, index=True)
    codigo_barras = Column(String(50), unique=True, nullable=True, index=True)
    sku = Column(String(50), unique=True, nullable=True, index=True)
    unidad_medida = Column(String(10), nullable=False, default="unidad", server_default="unidad")
    precio_compra = Column(Numeric(12, 2), nullable=False, default=0)
    precio_venta = Column(Numeric(12, 2), nullable=False)
    precio_mayoreo = Column(Numeric(12, 2), nullable=True)          # precio al por mayor (opcional)
    cantidad_mayoreo = Column(Numeric(10, 3), nullable=True)        # cantidad mínima para aplicar mayoreo
    stock = Column(Numeric(10, 3), nullable=False, default=0)
    stock_reservado = Column(Numeric(10, 3), nullable=False, default=0, server_default="0")  # reservas futuras (apartados/pedidos)
    stock_minimo = Column(Numeric(10, 3), nullable=False, default=5)
    stock_maximo = Column(Numeric(10, 3), nullable=True)
    fecha_vencimiento = Column(DateTime(timezone=True), nullable=True)
    imagen_url = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    categoria = relationship("Categoria", back_populates="productos")
    proveedor = relationship("Proveedor", back_populates="productos")
    detalle_ventas = relationship("DetalleVenta", back_populates="producto")
    movimientos = relationship("MovimientoStock", back_populates="producto")
    detalle_compras = relationship("DetalleCompra", back_populates="producto")

    __table_args__ = (
        Index("ix_productos_codigo_barras_activo", "codigo_barras", "activo"),
    )


# ── Clientes y crédito (cuenta corriente) ─────────────────────────────────────

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, index=True)
    telefono = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    direccion = Column(Text, nullable=True)
    permite_credito = Column(Boolean, default=False, nullable=False)
    limite_credito = Column(Numeric(12, 2), nullable=True)   # None = sin límite definido
    notas = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    ventas = relationship("Venta", back_populates="cliente")
    pagos = relationship("PagoCliente", back_populates="cliente")


class PagoCliente(Base):
    """Abono de un cliente a su cuenta corriente. Inmutable: nunca se borra."""
    __tablename__ = "pagos_cliente"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    monto = Column(Numeric(12, 2), nullable=False)
    metodo = Column(Enum("efectivo", "tarjeta", name="metodo_pago_cliente_enum"), nullable=False, default="efectivo")
    fecha = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    caja_sesion_id = Column(Integer, ForeignKey("caja_sesiones.id"), nullable=True)
    notas = Column(Text, nullable=True)

    cliente = relationship("Cliente", back_populates="pagos")
    usuario = relationship("Usuario")


# ── Ventas ────────────────────────────────────────────────────────────────────

class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    numero_recibo = Column(String(20), unique=True, nullable=False)
    fecha = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    caja_sesion_id = Column(Integer, ForeignKey("caja_sesiones.id"), nullable=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    total = Column(Numeric(12, 2), nullable=False)
    metodo_pago = Column(Enum("efectivo", "tarjeta", "mixto", "credito", name="metodo_pago_enum"), nullable=False)
    es_credito = Column(Boolean, default=False, nullable=False, server_default="0")
    monto_recibido = Column(Numeric(12, 2), nullable=True)
    cambio = Column(Numeric(12, 2), nullable=True)
    monto_efectivo = Column(Numeric(12, 2), nullable=True)   # desglose para pago mixto
    monto_tarjeta = Column(Numeric(12, 2), nullable=True)    # desglose para pago mixto
    estado = Column(Enum("completada", "anulada", name="estado_venta_enum"), nullable=False, default="completada")
    motivo_anulacion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    usuario = relationship("Usuario", back_populates="ventas")
    cliente = relationship("Cliente", back_populates="ventas")
    caja_sesion = relationship("CajaSesion")
    detalles = relationship("DetalleVenta", back_populates="venta", cascade="all, delete-orphan")


class DetalleVenta(Base):
    __tablename__ = "detalle_venta"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Numeric(10, 3), nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalle_ventas")


# ── Inventario: libro de movimientos ─────────────────────────────────────────

# entrada     → compras, inventario inicial, correcciones al alza
# salida      → ventas
# ajuste      → conteo físico (diferencia +/-)
# devolucion  → anulación de venta (repone)
# perdida     → robo, daño, extravío
# merma       → deterioro natural, producto dañado
# vencimiento → producto vencido retirado
TIPOS_MOVIMIENTO = ("entrada", "salida", "ajuste", "devolucion", "perdida", "merma", "vencimiento")


class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    tipo = Column(
        Enum(*TIPOS_MOVIMIENTO, name="tipo_movimiento_enum"),
        nullable=False,
    )
    cantidad = Column(Numeric(10, 3), nullable=False)
    stock_anterior = Column(Numeric(10, 3), nullable=False)
    stock_nuevo = Column(Numeric(10, 3), nullable=False)
    motivo = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    referencia_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)

    producto = relationship("Producto", back_populates="movimientos")
    usuario = relationship("Usuario", back_populates="movimientos")


# ── Caja ──────────────────────────────────────────────────────────────────────

class CajaSesion(Base):
    __tablename__ = "caja_sesiones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_apertura_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    monto_inicial = Column(Numeric(12, 2), nullable=False)
    fecha_apertura = Column(DateTime(timezone=True), default=_now, nullable=False)
    usuario_cierre_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    monto_contado = Column(Numeric(12, 2), nullable=True)
    diferencia = Column(Numeric(12, 2), nullable=True)
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)
    estado = Column(Enum("abierta", "cerrada", name="estado_caja_enum"), nullable=False, default="abierta")

    usuario_apertura = relationship("Usuario", foreign_keys=[usuario_apertura_id], back_populates="cajas_apertura")
    usuario_cierre = relationship("Usuario", foreign_keys=[usuario_cierre_id], back_populates="cajas_cierre")


# ── Compras / proveedores ─────────────────────────────────────────────────────

class OrdenCompra(Base):
    __tablename__ = "ordenes_compra"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False)
    fecha = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)
    estado = Column(Enum("pendiente", "recibida", "cancelada", name="estado_orden_enum"), nullable=False, default="pendiente")
    total = Column(Numeric(12, 2), nullable=False, default=0)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    proveedor = relationship("Proveedor", back_populates="ordenes_compra")
    detalles = relationship("DetalleCompra", back_populates="orden", cascade="all, delete-orphan")


class DetalleCompra(Base):
    __tablename__ = "detalle_compra"

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_compra.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Numeric(10, 3), nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    orden = relationship("OrdenCompra", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalle_compras")


class PagoProveedor(Base):
    """Pago realizado a un proveedor. Inmutable: nunca se borra."""
    __tablename__ = "pagos_proveedor"

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=False, index=True)
    monto = Column(Numeric(12, 2), nullable=False)
    metodo = Column(String(20), nullable=False, default="efectivo")  # efectivo, transferencia, cheque…
    fecha = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_compra.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    notas = Column(Text, nullable=True)

    proveedor = relationship("Proveedor", back_populates="pagos")
    orden = relationship("OrdenCompra")
    usuario = relationship("Usuario")


# ── Infraestructura ───────────────────────────────────────────────────────────

class Secuencia(Base):
    """Contadores atómicos (ej. numeración de recibos por día).

    El incremento ocurre dentro de la transacción de la operación, por lo que
    dos ventas simultáneas nunca obtienen el mismo número.
    """
    __tablename__ = "secuencias"

    nombre = Column(String(50), primary_key=True)
    valor = Column(Integer, nullable=False, default=0)


# ── Recomendaciones inteligentes ──────────────────────────────────────────────

TIPOS_RECOMENDACION = (
    "reponer_urgente",        # agotado
    "realizar_pedido",        # bajo stock mínimo
    "aumentar_inventario",    # muy vendido con poco stock
    "revisar_producto",       # sin movimiento hace tiempo
    "considerar_descontinuar" # sin ventas y con stock estancado
)


class Recomendacion(Base):
    """Generadas automáticamente al cierre de caja (services.recomendaciones_service).

    La generación está aislada en un servicio para que en el futuro pueda
    sustituirse/complementarse con modelos de IA de predicción de demanda.
    """
    __tablename__ = "recomendaciones"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=True, index=True)
    tipo = Column(String(30), nullable=False)
    mensaje = Column(Text, nullable=False)
    prioridad = Column(Enum("alta", "media", "baja", name="prioridad_recomendacion_enum"), nullable=False, default="media")
    estado = Column(
        Enum("pendiente", "atendida", "descartada", name="estado_recomendacion_enum"),
        nullable=False, default="pendiente", index=True,
    )
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    producto = relationship("Producto")
