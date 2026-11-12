from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    PasswordResetResponse, PaginatedUsuarios,
)
from app.crud import usuarios as crud
from app.core.dependencies import require_admin

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=PaginatedUsuarios)
def list_usuarios(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    activo: bool = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    skip = (page - 1) * per_page
    total, items = crud.get_all(db, skip=skip, limit=per_page, search=search, activo=activo)
    return PaginatedUsuarios(total=total, page=page, per_page=per_page, items=items)


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def get_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, usuario_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return obj


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    existing = crud.get_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")
    return crud.create(db, data)


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, usuario_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if data.email:
        existing = crud.get_by_email(db, data.email)
        if existing and existing.id != usuario_id:
            raise HTTPException(status_code=400, detail="Ese email ya está en uso")
    return crud.update(db, obj, data)


@router.delete("/{usuario_id}", response_model=UsuarioResponse)
def deactivate_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    if usuario_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    obj = crud.get_by_id(db, usuario_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return crud.deactivate(db, obj)


@router.post("/{usuario_id}/reset-password", response_model=PasswordResetResponse)
def reset_password(
    usuario_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, usuario_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    temp_pass = crud.reset_password(db, obj)
    return PasswordResetResponse(
        password_temporal=temp_pass,
        mensaje=f"Contraseña temporal generada para {obj.nombre}. Comunícasela de forma segura.",
    )
