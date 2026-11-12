from sqlalchemy.orm import Session
from app.models.models import Categoria
from app.schemas.schemas import CategoriaCreate, CategoriaUpdate


def get_all(db: Session, skip: int = 0, limit: int = 50, search: str = None):
    q = db.query(Categoria)
    if search:
        q = q.filter(Categoria.nombre.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Categoria.nombre).offset(skip).limit(limit).all()
    return total, items


def get_by_id(db: Session, categoria_id: int):
    return db.query(Categoria).filter(Categoria.id == categoria_id).first()


def create(db: Session, data: CategoriaCreate):
    obj = Categoria(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, categoria: Categoria, data: CategoriaUpdate):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(categoria, field, value)
    db.commit()
    db.refresh(categoria)
    return categoria


def delete(db: Session, categoria: Categoria):
    db.delete(categoria)
    db.commit()
