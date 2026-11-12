"""Fase 2 — lógica de negocio: producto extendido, dinero Decimal, cantidades
decimales, clientes/crédito, pagos a proveedores, secuencias y recomendaciones.

* productos: sku, unidad_medida, precio_mayoreo, cantidad_mayoreo, stock_maximo,
  stock_reservado; tipos de dinero → Numeric(12,2) y cantidades → Numeric(10,3).
* ventas: caja_sesion_id, cliente_id, es_credito, monto_efectivo, monto_tarjeta.
* nuevas tablas: clientes, pagos_cliente, pagos_proveedor, secuencias,
  recomendaciones.
* ordenes_compra.estado admite 'cancelada' (cancelación lógica, sin DELETE).

Nota SQLite: los cambios de tipo se declaran con batch_alter_table (recrea la
tabla). Los datos existentes se preservan (INTEGER→NUMERIC es sin pérdida).

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

DINERO = sa.Numeric(12, 2)
CANTIDAD = sa.Numeric(10, 3)


def upgrade() -> None:
    # ── Nuevas tablas ─────────────────────────────────────────────────────────
    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("telefono", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=150), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("permite_credito", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("limite_credito", DINERO, nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clientes_id", "clientes", ["id"])
    op.create_index("ix_clientes_nombre", "clientes", ["nombre"])

    op.create_table(
        "pagos_cliente",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("monto", DINERO, nullable=False),
        sa.Column("metodo", sa.Enum("efectivo", "tarjeta", name="metodo_pago_cliente_enum"), nullable=False, server_default="efectivo"),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("caja_sesion_id", sa.Integer(), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["caja_sesion_id"], ["caja_sesiones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pagos_cliente_id", "pagos_cliente", ["id"])
    op.create_index("ix_pagos_cliente_cliente_id", "pagos_cliente", ["cliente_id"])
    op.create_index("ix_pagos_cliente_fecha", "pagos_cliente", ["fecha"])

    op.create_table(
        "pagos_proveedor",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("proveedor_id", sa.Integer(), nullable=False),
        sa.Column("monto", DINERO, nullable=False),
        sa.Column("metodo", sa.String(length=20), nullable=False, server_default="efectivo"),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("orden_id", sa.Integer(), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["proveedor_id"], ["proveedores.id"]),
        sa.ForeignKeyConstraint(["orden_id"], ["ordenes_compra.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pagos_proveedor_id", "pagos_proveedor", ["id"])
    op.create_index("ix_pagos_proveedor_proveedor_id", "pagos_proveedor", ["proveedor_id"])
    op.create_index("ix_pagos_proveedor_fecha", "pagos_proveedor", ["fecha"])

    op.create_table(
        "secuencias",
        sa.Column("nombre", sa.String(length=50), nullable=False),
        sa.Column("valor", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("nombre"),
    )

    op.create_table(
        "recomendaciones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=True),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("prioridad", sa.Enum("alta", "media", "baja", name="prioridad_recomendacion_enum"), nullable=False, server_default="media"),
        sa.Column("estado", sa.Enum("pendiente", "atendida", "descartada", name="estado_recomendacion_enum"), nullable=False, server_default="pendiente"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recomendaciones_id", "recomendaciones", ["id"])
    op.create_index("ix_recomendaciones_producto_id", "recomendaciones", ["producto_id"])
    op.create_index("ix_recomendaciones_estado", "recomendaciones", ["estado"])
    op.create_index("ix_recomendaciones_created_at", "recomendaciones", ["created_at"])

    # ── productos: nuevas columnas + tipos exactos ────────────────────────────
    with op.batch_alter_table("productos") as batch:
        batch.add_column(sa.Column("sku", sa.String(length=50), nullable=True))
        batch.add_column(sa.Column("unidad_medida", sa.String(length=10), nullable=False, server_default="unidad"))
        batch.add_column(sa.Column("precio_mayoreo", DINERO, nullable=True))
        batch.add_column(sa.Column("cantidad_mayoreo", CANTIDAD, nullable=True))
        batch.add_column(sa.Column("stock_maximo", CANTIDAD, nullable=True))
        batch.add_column(sa.Column("stock_reservado", CANTIDAD, nullable=False, server_default="0"))
        batch.alter_column("precio_compra", type_=DINERO, existing_nullable=False)
        batch.alter_column("precio_venta", type_=DINERO, existing_nullable=False)
        batch.alter_column("stock", type_=CANTIDAD, existing_nullable=False)
        batch.alter_column("stock_minimo", type_=CANTIDAD, existing_nullable=False)
    op.create_index("ix_productos_sku", "productos", ["sku"], unique=True)

    # ── ventas: caja, cliente, crédito, desglose mixto + tipos ────────────────
    with op.batch_alter_table("ventas") as batch:
        batch.add_column(sa.Column("caja_sesion_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("cliente_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("es_credito", sa.Boolean(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("monto_efectivo", DINERO, nullable=True))
        batch.add_column(sa.Column("monto_tarjeta", DINERO, nullable=True))
        batch.alter_column("total", type_=DINERO, existing_nullable=False)
        batch.alter_column("monto_recibido", type_=DINERO, existing_nullable=True)
        batch.alter_column("cambio", type_=DINERO, existing_nullable=True)
        batch.create_foreign_key("fk_ventas_caja_sesion", "caja_sesiones", ["caja_sesion_id"], ["id"])
        batch.create_foreign_key("fk_ventas_cliente", "clientes", ["cliente_id"], ["id"])
    op.create_index("ix_ventas_caja_sesion_id", "ventas", ["caja_sesion_id"])
    op.create_index("ix_ventas_cliente_id", "ventas", ["cliente_id"])

    # ── detalle_venta / movimientos / caja / compras: tipos exactos ───────────
    with op.batch_alter_table("detalle_venta") as batch:
        batch.alter_column("cantidad", type_=CANTIDAD, existing_nullable=False)
        batch.alter_column("precio_unitario", type_=DINERO, existing_nullable=False)
        batch.alter_column("subtotal", type_=DINERO, existing_nullable=False)

    with op.batch_alter_table("movimientos_stock") as batch:
        batch.alter_column("cantidad", type_=CANTIDAD, existing_nullable=False)
        batch.alter_column("stock_anterior", type_=CANTIDAD, existing_nullable=False)
        batch.alter_column("stock_nuevo", type_=CANTIDAD, existing_nullable=False)

    with op.batch_alter_table("caja_sesiones") as batch:
        batch.alter_column("monto_inicial", type_=DINERO, existing_nullable=False)
        batch.alter_column("monto_contado", type_=DINERO, existing_nullable=True)
        batch.alter_column("diferencia", type_=DINERO, existing_nullable=True)

    with op.batch_alter_table("ordenes_compra") as batch:
        batch.alter_column("total", type_=DINERO, existing_nullable=False)

    with op.batch_alter_table("detalle_compra") as batch:
        batch.alter_column("cantidad", type_=CANTIDAD, existing_nullable=False)
        batch.alter_column("precio_unitario", type_=DINERO, existing_nullable=False)
        batch.alter_column("subtotal", type_=DINERO, existing_nullable=False)


def downgrade() -> None:
    op.drop_index("ix_productos_sku", table_name="productos")
    with op.batch_alter_table("productos") as batch:
        batch.drop_column("sku")
        batch.drop_column("unidad_medida")
        batch.drop_column("precio_mayoreo")
        batch.drop_column("cantidad_mayoreo")
        batch.drop_column("stock_maximo")
        batch.drop_column("stock_reservado")

    op.drop_index("ix_ventas_caja_sesion_id", table_name="ventas")
    op.drop_index("ix_ventas_cliente_id", table_name="ventas")
    with op.batch_alter_table("ventas") as batch:
        batch.drop_column("caja_sesion_id")
        batch.drop_column("cliente_id")
        batch.drop_column("es_credito")
        batch.drop_column("monto_efectivo")
        batch.drop_column("monto_tarjeta")

    op.drop_table("recomendaciones")
    op.drop_table("secuencias")
    op.drop_table("pagos_proveedor")
    op.drop_table("pagos_cliente")
    op.drop_table("clientes")
