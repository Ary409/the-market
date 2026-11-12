from sqlalchemy.orm import Session
from app.models.models import Proveedor
from app.schemas.schemas import ProveedorCreate, ProveedorUpdate


def get_all(db: Session, skip: int = 0, limit: int = 50, search: str = None, activo: bool = None):
    q = db.query(Proveedor)
    if search:
        q = q.filter(Proveedor.nombre.ilike(f"%{search}%"))
    if activo is not None:
        q = q.filter(Proveedor.activo == activo)
    total = q.count()
    items = q.order_by(Proveedor.nombre).offset(skip).limit(limit).all()
    return total, items


def get_by_id(db: Session, proveedor_id: int):
    return db.query(Proveedor).filter(Proveedor.id == proveedor_id).first()


def create(db: Session, data: ProveedorCreate):
    obj = Proveedor(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, proveedor: Proveedor, data: ProveedorUpdate):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(proveedor, field, value)
    db.commit()
    db.refresh(proveedor)
    return proveedor


def delete(db: Session, proveedor: Proveedor):
    proveedor.activo = False
    db.commit()
    db.refresh(proveedor)
    return proveedor
