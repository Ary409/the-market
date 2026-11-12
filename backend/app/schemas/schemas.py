"""
schemas.py — Contratos de la API (Pydantic).

Convenciones Fase 2:
  * Entradas de dinero/cantidad: Decimal (exactitud; Pydantic convierte el JSON
    sin pasar por float).
  * Salidas: float (JSON numérico estándar para los frontends).
  * Las fechas se serializan con zona UTC explícita (isoformat con offset)
    para que los frontends las muestren en hora local correcta.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, field_serializer

from app.models.models import UNIDADES_MEDIDA


def _iso_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre: str
    user_id: int


# ── Usuario ───────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: str = "vendedor"

    @field_validator("rol")
    @classmethod
    def validate_rol(cls, v):
        if v not in ("admin", "vendedor"):
            raise ValueError("Rol debe ser 'admin' o 'vendedor'")
        return v


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None

    @field_validator("rol")
    @classmethod
    def validate_rol(cls, v):
        if v is not None and v not in ("admin", "vendedor"):
            raise ValueError("Rol debe ser 'admin' o 'vendedor'")
        return v


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PasswordResetResponse(BaseModel):
    password_temporal: str
    mensaje: str


# ── Categoria ─────────────────────────────────────────────────────────────────

class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class CategoriaResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Proveedor ─────────────────────────────────────────────────────────────────

class ProveedorCreate(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None


class ProveedorResponse(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str]
    email: Optional[str]
    direccion: Optional[str]
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PagoProveedorCreate(BaseModel):
    monto: Decimal
    metodo: str = "efectivo"
    orden_id: Optional[int] = None
    notas: Optional[str] = None

    @field_validator("monto")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a 0")
        return v


class PagoProveedorResponse(BaseModel):
    id: int
    proveedor_id: int
    monto: float
    metodo: str
    fecha: datetime
    orden_id: Optional[int]
    usuario_id: int
    notas: Optional[str]

    model_config = {"from_attributes": True}

    @field_serializer("fecha")
    def ser_fecha(self, v: datetime, _info):
        return _iso_utc(v)


# ── Producto ──────────────────────────────────────────────────────────────────

class ProductoCreate(BaseModel):
    nombre: str
    codigo_barras: Optional[str] = None
    sku: Optional[str] = None
    unidad_medida: str = "unidad"
    precio_compra: Decimal = Decimal("0")
    precio_venta: Decimal
    precio_mayoreo: Optional[Decimal] = None
    cantidad_mayoreo: Optional[Decimal] = None
    stock: Decimal = Decimal("0")
    stock_minimo: Decimal = Decimal("5")
    stock_maximo: Optional[Decimal] = None
    fecha_vencimiento: Optional[datetime] = None
    imagen_url: Optional[str] = None
    categoria_id: Optional[int] = None
    proveedor_id: Optional[int] = None

    @field_validator("unidad_medida")
    @classmethod
    def validate_unidad(cls, v):
        if v not in UNIDADES_MEDIDA:
            raise ValueError(f"Unidad inválida. Válidas: {', '.join(UNIDADES_MEDIDA)}")
        return v

    @field_validator("precio_venta", "precio_compra")
    @classmethod
    def precio_no_negativo(cls, v):
        if v is not None and v < 0:
            raise ValueError("El precio no puede ser negativo")
        return v

    @field_validator("stock", "stock_minimo")
    @classmethod
    def stock_no_negativo(cls, v):
        if v is not None and v < 0:
            raise ValueError("El stock no puede ser negativo")
        return v


class ProductoUpdate(BaseModel):
    # NOTA: `stock` NO es editable directamente. Todo cambio de stock debe
    # hacerse mediante movimientos de inventario (/inventario/entrada, /salida
    # o /ajuste) para mantener el libro de movimientos consistente.
    nombre: Optional[str] = None
    codigo_barras: Optional[str] = None
    sku: Optional[str] = None
    unidad_medida: Optional[str] = None
    precio_compra: Optional[Decimal] = None
    precio_venta: Optional[Decimal] = None
    precio_mayoreo: Optional[Decimal] = None
    cantidad_mayoreo: Optional[Decimal] = None
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    fecha_vencimiento: Optional[datetime] = None
    imagen_url: Optional[str] = None
    categoria_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    activo: Optional[bool] = None

    @field_validator("unidad_medida")
    @classmethod
    def validate_unidad(cls, v):
        if v is not None and v not in UNIDADES_MEDIDA:
            raise ValueError(f"Unidad inválida. Válidas: {', '.join(UNIDADES_MEDIDA)}")
        return v


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    codigo_barras: Optional[str]
    sku: Optional[str]
    unidad_medida: str
    precio_compra: float
    precio_venta: float
    precio_mayoreo: Optional[float]
    cantidad_mayoreo: Optional[float]
    stock: float
    stock_reservado: float
    stock_minimo: float
    stock_maximo: Optional[float]
    fecha_vencimiento: Optional[datetime]
    imagen_url: Optional[str]
    activo: bool
    categoria_id: Optional[int]
    proveedor_id: Optional[int]
    categoria: Optional[CategoriaResponse] = None
    proveedor: Optional[ProveedorResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductoBarcodeResponse(BaseModel):
    id: int
    nombre: str
    codigo_barras: Optional[str]
    sku: Optional[str]
    unidad_medida: str
    precio_venta: float
    precio_mayoreo: Optional[float]
    cantidad_mayoreo: Optional[float]
    stock: float
    imagen_url: Optional[str]
    categoria: Optional[CategoriaResponse] = None

    model_config = {"from_attributes": True}


# ── Paginación ────────────────────────────────────────────────────────────────

class PaginatedProductos(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[ProductoResponse]


class PaginatedCategorias(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[CategoriaResponse]


class PaginatedProveedores(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[ProveedorResponse]


class PaginatedUsuarios(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[UsuarioResponse]


# ── Movimientos de stock ───────────────────────────────────────────────────────

class MovimientoCreate(BaseModel):
    producto_id: int
    cantidad: Decimal
    motivo: Optional[str] = None
    referencia_id: Optional[int] = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v


class MovimientoSalida(BaseModel):
    """Salida de inventario: pérdida, merma o vencimiento. Motivo obligatorio."""
    producto_id: int
    tipo: str                       # perdida | merma | vencimiento | salida
    cantidad: Decimal
    motivo: str

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v):
        if v not in ("perdida", "merma", "vencimiento", "salida"):
            raise ValueError("Tipo debe ser: perdida, merma, vencimiento o salida")
        return v

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v

    @field_validator("motivo")
    @classmethod
    def motivo_requerido(cls, v):
        if not v or not v.strip():
            raise ValueError("El motivo es obligatorio")
        return v.strip()


class MovimientoAjuste(BaseModel):
    producto_id: int
    stock_nuevo: Decimal
    motivo: str

    @field_validator("stock_nuevo")
    @classmethod
    def stock_no_negativo(cls, v):
        if v < 0:
            raise ValueError("El stock no puede ser negativo")
        return v


class MovimientoResponse(BaseModel):
    id: int
    producto_id: int
    tipo: str
    cantidad: float
    stock_anterior: float
    stock_nuevo: float
    motivo: Optional[str]
    usuario_id: int
    referencia_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def ser_fecha(self, v: datetime, _info):
        return _iso_utc(v)


class PaginatedMovimientos(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[MovimientoResponse]


# ── Alertas ───────────────────────────────────────────────────────────────────

class AlertaStockResponse(BaseModel):
    id: int
    nombre: str
    codigo_barras: Optional[str]
    stock: float
    stock_minimo: float
    fecha_vencimiento: Optional[datetime]
    categoria: Optional[CategoriaResponse] = None
    proveedor: Optional[ProveedorResponse] = None

    model_config = {"from_attributes": True}


# ── Compras ───────────────────────────────────────────────────────────────────

class DetalleCompraCreate(BaseModel):
    producto_id: int
    cantidad: Decimal
    precio_unitario: Decimal

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v


class OrdenCompraCreate(BaseModel):
    proveedor_id: int
    items: List[DetalleCompraCreate]
    notas: Optional[str] = None


class DetalleCompraResponse(BaseModel):
    id: int
    producto_id: int
    cantidad: float
    precio_unitario: float
    subtotal: float
    producto: Optional[ProductoResponse] = None

    model_config = {"from_attributes": True}


class OrdenCompraResponse(BaseModel):
    id: int
    proveedor_id: int
    fecha: datetime
    estado: str
    total: float
    notas: Optional[str]
    created_at: datetime
    proveedor: Optional[ProveedorResponse] = None
    detalles: List[DetalleCompraResponse] = []

    model_config = {"from_attributes": True}

    @field_serializer("fecha")
    def ser_fecha(self, v: datetime, _info):
        return _iso_utc(v)


class PaginatedOrdenes(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[OrdenCompraResponse]


# ── Clientes y crédito ────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    permite_credito: bool = False
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None

    @field_validator("limite_credito")
    @classmethod
    def limite_positivo(cls, v):
        if v is not None and v < 0:
            raise ValueError("El límite de crédito no puede ser negativo")
        return v


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    permite_credito: Optional[bool] = None
    limite_credito: Optional[Decimal] = None
    notas: Optional[str] = None
    activo: Optional[bool] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str]
    email: Optional[str]
    direccion: Optional[str]
    permite_credito: bool
    limite_credito: Optional[float]
    notas: Optional[str]
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ClienteConSaldoResponse(ClienteResponse):
    saldo: float = 0.0


class PaginatedClientes(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[ClienteConSaldoResponse]


class PagoClienteCreate(BaseModel):
    monto: Decimal
    metodo: str = "efectivo"
    notas: Optional[str] = None

    @field_validator("monto")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a 0")
        return v

    @field_validator("metodo")
    @classmethod
    def metodo_valido(cls, v):
        if v not in ("efectivo", "tarjeta"):
            raise ValueError("Método debe ser 'efectivo' o 'tarjeta'")
        return v


class LiquidarCuentaRequest(BaseModel):
    metodo: str = "efectivo"
    notas: Optional[str] = None

    @field_validator("metodo")
    @classmethod
    def metodo_valido(cls, v):
        if v not in ("efectivo", "tarjeta"):
            raise ValueError("Método debe ser 'efectivo' o 'tarjeta'")
        return v


class PagoClienteResponse(BaseModel):
    id: int
    cliente_id: int
    monto: float
    metodo: str
    fecha: datetime
    usuario_id: int
    notas: Optional[str]

    model_config = {"from_attributes": True}

    @field_serializer("fecha")
    def ser_fecha(self, v: datetime, _info):
        return _iso_utc(v)


# ── Ventas ────────────────────────────────────────────────────────────────────

class VentaItemCreate(BaseModel):
    producto_id: int
    cantidad: Decimal
    # DEPRECATED: se acepta por compatibilidad pero el precio SIEMPRE lo fija
    # el servidor (precio_venta o precio_mayoreo del producto).
    precio_unitario: Optional[Decimal] = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_positiva(cls, v):
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v


class VentaCreate(BaseModel):
    metodo_pago: str
    monto_recibido: Optional[Decimal] = None
    monto_efectivo: Optional[Decimal] = None   # desglose obligatorio si metodo=mixto
    monto_tarjeta: Optional[Decimal] = None
    cliente_id: Optional[int] = None           # obligatorio si metodo=credito
    items: List[VentaItemCreate]

    @field_validator("metodo_pago")
    @classmethod
    def validate_metodo(cls, v):
        if v not in ("efectivo", "tarjeta", "mixto", "credito"):
            raise ValueError("Método de pago inválido (efectivo, tarjeta, mixto o credito)")
        return v

    @field_validator("items")
    @classmethod
    def items_no_vacios(cls, v):
        if not v:
            raise ValueError("La venta debe tener al menos un producto")
        return v


class VentaDetalleResponse(BaseModel):
    id: int
    producto_id: int
    cantidad: float
    precio_unitario: float
    subtotal: float
    producto: Optional[ProductoResponse] = None

    model_config = {"from_attributes": True}


class VentaResponse(BaseModel):
    id: int
    numero_recibo: str
    fecha: datetime
    usuario_id: int
    caja_sesion_id: Optional[int]
    cliente_id: Optional[int]
    total: float
    metodo_pago: str
    es_credito: bool
    monto_recibido: Optional[float]
    cambio: Optional[float]
    monto_efectivo: Optional[float]
    monto_tarjeta: Optional[float]
    estado: str
    motivo_anulacion: Optional[str]
    cliente: Optional[ClienteResponse] = None
    detalles: List[VentaDetalleResponse] = []

    model_config = {"from_attributes": True}

    @field_serializer("fecha")
    def ser_fecha(self, v: datetime, _info):
        return _iso_utc(v)


class PaginatedVentas(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[VentaResponse]


class AnularVentaRequest(BaseModel):
    motivo: str


# ── Caja ──────────────────────────────────────────────────────────────────────

class CajaAbrirRequest(BaseModel):
    monto_inicial: Decimal

    @field_validator("monto_inicial")
    @classmethod
    def monto_positivo(cls, v):
        if v < 0:
            raise ValueError("El monto inicial no puede ser negativo")
        return v


class CajaCerrarRequest(BaseModel):
    monto_contado: Decimal


class CajaSesionResponse(BaseModel):
    id: int
    usuario_apertura_id: int
    monto_inicial: float
    fecha_apertura: datetime
    usuario_cierre_id: Optional[int]
    monto_contado: Optional[float]
    diferencia: Optional[float]
    fecha_cierre: Optional[datetime]
    estado: str

    model_config = {"from_attributes": True}

    @field_serializer("fecha_apertura", "fecha_cierre")
    def ser_fecha(self, v: Optional[datetime], _info):
        return _iso_utc(v)


class ResumenCierreCaja(BaseModel):
    total_ventas: float
    cantidad_ventas: int
    ventas_efectivo: float
    ventas_tarjeta: float
    ventas_credito: float
    cobros_credito_efectivo: float
    cobros_credito_tarjeta: float
    monto_esperado: float
    diferencia: float


class CajaCierreResponse(BaseModel):
    sesion: CajaSesionResponse
    resumen: ResumenCierreCaja
    # Detalle del turno: qué se fió y qué cuentas se cobraron
    fiados_turno: list = []
    cobros_turno: list = []

    model_config = {"from_attributes": True}


# ── Recomendaciones ───────────────────────────────────────────────────────────

class RecomendacionResponse(BaseModel):
    id: int
    producto_id: Optional[int]
    tipo: str
    mensaje: str
    prioridad: str
    estado: str
    created_at: datetime
    producto: Optional[ProductoResponse] = None

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def ser_fecha(self, v: datetime, _info):
        return _iso_utc(v)


class RecomendacionUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v):
        if v not in ("atendida", "descartada", "pendiente"):
            raise ValueError("Estado debe ser: atendida, descartada o pendiente")
        return v
