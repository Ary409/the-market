import secrets
import string
from sqlalchemy.orm import Session
from app.models.models import Usuario
from app.schemas.schemas import UsuarioCreate, UsuarioUpdate
from app.core.security import hash_password


def get_all(db: Session, skip: int = 0, limit: int = 50, search: str = None, activo: bool = None):
    q = db.query(Usuario)
    if search:
        q = q.filter(Usuario.nombre.ilike(f"%{search}%") | Usuario.email.ilike(f"%{search}%"))
    if activo is not None:
        q = q.filter(Usuario.activo == activo)
    total = q.count()
    items = q.order_by(Usuario.nombre).offset(skip).limit(limit).all()
    return total, items


def get_by_id(db: Session, usuario_id: int):
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_by_email(db: Session, email: str):
    return db.query(Usuario).filter(Usuario.email == email).first()


def create(db: Session, data: UsuarioCreate):
    obj = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, usuario: Usuario, data: UsuarioUpdate):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(usuario, field, value)
    db.commit()
    db.refresh(usuario)
    return usuario


def deactivate(db: Session, usuario: Usuario):
    usuario.activo = False
    db.commit()
    db.refresh(usuario)
    return usuario


def reset_password(db: Session, usuario: Usuario) -> str:
    alphabet = string.ascii_letters + string.digits
    temp_pass = "".join(secrets.choice(alphabet) for _ in range(10))
    usuario.password_hash = hash_password(temp_pass)
    db.commit()
    return temp_pass
