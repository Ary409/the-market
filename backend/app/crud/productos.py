from sqlalchemy.orm import Session, joinedload
from app.models.models import Producto
from app.schemas.schemas import ProductoCreate, ProductoUpdate
from app.services import inventario_service


def get_all(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    categoria_id: int = None,
    solo_activos: bool = True,
):
    q = db.query(Producto).options(joinedload(Producto.categoria), joinedload(Producto.proveedor))
    if solo_activos:
        q = q.filter(Producto.activo == True)
    if search:
        q = q.filter(
            Producto.nombre.ilike(f"%{search}%")
            | Producto.codigo_barras.ilike(f"%{search}%")
            | Producto.sku.ilike(f"%{search}%")
        )
    if categoria_id:
        q = q.filter(Producto.categoria_id == categoria_id)
    total = q.count()
    items = q.order_by(Producto.nombre).offset(skip).limit(limit).all()
    return total, items


def get_by_id(db: Session, producto_id: int):
    return (
        db.query(Producto)
        .options(joinedload(Producto.categoria), joinedload(Producto.proveedor))
        .filter(Producto.id == producto_id)
        .first()
    )


def get_by_barcode(db: Session, codigo: str):
    return (
        db.query(Producto)
        .options(joinedload(Producto.categoria))
        .filter(Producto.codigo_barras == codigo, Producto.activo == True)
        .first()
    )


def create(db: Session, data: ProductoCreate, usuario_id: int):
    # El stock inicial NO se asigna directo: se registra como movimiento de
    # entrada para que el libro de movimientos cuadre desde el día uno.
    valores = data.model_dump()
    stock_inicial = valores.pop("stock", 0) or 0

    obj = Producto(**valores, stock=0)
    db.add(obj)
    db.flush()

    if stock_inicial > 0:
        inventario_service.registrar_movimiento(
            db, obj, "entrada", stock_inicial, usuario_id,
            motivo="Inventario inicial",
        )

    db.commit()
    return get_by_id(db, obj.id)


def update(db: Session, producto: Producto, data: ProductoUpdate):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(producto, field, value)
    db.commit()
    db.refresh(producto)
    return get_by_id(db, producto.id)


def delete(db: Session, producto: Producto):
    producto.activo = False
    db.commit()
    db.refresh(producto)
    return producto
