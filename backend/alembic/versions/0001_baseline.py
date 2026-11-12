"""Baseline — esquema existente antes de la Fase 2 (congelado).

Refleja exactamente el esquema que producía Base.metadata.create_all() al
2026-07-04. Las bases de datos creadas antes de Alembic se marcan (stamp) en
esta revisión sin ejecutarla; las instalaciones nuevas la ejecutan completa.

Revision ID: 0001
Revises:
Create Date: 2026-07-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("rol", sa.Enum("admin", "vendedor", name="rol_enum"), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usuarios_id", "usuarios", ["id"])
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    op.create_table(
        "categorias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_categorias_id", "categorias", ["id"])

    op.create_table(
        "proveedores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("telefono", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=150), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_proveedores_id", "proveedores", ["id"])

    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=200), nullable=False),
        sa.Column("codigo_barras", sa.String(length=50), nullable=True),
        sa.Column("precio_compra", sa.Float(), nullable=False),
        sa.Column("precio_venta", sa.Float(), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False),
        sa.Column("stock_minimo", sa.Integer(), nullable=False),
        sa.Column("fecha_vencimiento", sa.DateTime(timezone=True), nullable=True),
        sa.Column("imagen_url", sa.String(length=500), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("categoria_id", sa.Integer(), nullable=True),
        sa.Column("proveedor_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["categoria_id"], ["categorias.id"]),
        sa.ForeignKeyConstraint(["proveedor_id"], ["proveedores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_productos_id", "productos", ["id"])
    op.create_index("ix_productos_nombre", "productos", ["nombre"])
    op.create_index("ix_productos_codigo_barras", "productos", ["codigo_barras"], unique=True)
    op.create_index("ix_productos_codigo_barras_activo", "productos", ["codigo_barras", "activo"])

    op.create_table(
        "ventas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("numero_recibo", sa.String(length=20), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("metodo_pago", sa.Enum("efectivo", "tarjeta", "mixto", name="metodo_pago_enum"), nullable=False),
        sa.Column("monto_recibido", sa.Float(), nullable=True),
        sa.Column("cambio", sa.Float(), nullable=True),
        sa.Column("estado", sa.Enum("completada", "anulada", name="estado_venta_enum"), nullable=False),
        sa.Column("motivo_anulacion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero_recibo"),
    )
    op.create_index("ix_ventas_id", "ventas", ["id"])
    op.create_index("ix_ventas_fecha", "ventas", ["fecha"])

    op.create_table(
        "detalle_venta",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("venta_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["venta_id"], ["ventas.id"]),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_detalle_venta_id", "detalle_venta", ["id"])

    op.create_table(
        "movimientos_stock",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.Enum("entrada", "salida", "ajuste", "devolucion", name="tipo_movimiento_enum"), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("stock_anterior", sa.Integer(), nullable=False),
        sa.Column("stock_nuevo", sa.Integer(), nullable=False),
        sa.Column("motivo", sa.Text(), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("referencia_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_movimientos_stock_id", "movimientos_stock", ["id"])
    op.create_index("ix_movimientos_stock_created_at", "movimientos_stock", ["created_at"])

    op.create_table(
        "caja_sesiones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_apertura_id", sa.Integer(), nullable=False),
        sa.Column("monto_inicial", sa.Float(), nullable=False),
        sa.Column("fecha_apertura", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usuario_cierre_id", sa.Integer(), nullable=True),
        sa.Column("monto_contado", sa.Float(), nullable=True),
        sa.Column("diferencia", sa.Float(), nullable=True),
        sa.Column("fecha_cierre", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estado", sa.Enum("abierta", "cerrada", name="estado_caja_enum"), nullable=False),
        sa.ForeignKeyConstraint(["usuario_apertura_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["usuario_cierre_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_caja_sesiones_id", "caja_sesiones", ["id"])

    op.create_table(
        "ordenes_compra",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("proveedor_id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estado", sa.Enum("pendiente", "recibida", name="estado_orden_enum"), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["proveedor_id"], ["proveedores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ordenes_compra_id", "ordenes_compra", ["id"])
    op.create_index("ix_ordenes_compra_fecha", "ordenes_compra", ["fecha"])

    op.create_table(
        "detalle_compra",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("orden_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["orden_id"], ["ordenes_compra.id"]),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_detalle_compra_id", "detalle_compra", ["id"])


def downgrade() -> None:
    op.drop_table("detalle_compra")
    op.drop_table("ordenes_compra")
    op.drop_table("caja_sesiones")
    op.drop_table("movimientos_stock")
    op.drop_table("detalle_venta")
    op.drop_table("ventas")
    op.drop_table("productos")
    op.drop_table("proveedores")
    op.drop_table("categorias")
    op.drop_table("usuarios")
