from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import LoginRequest, TokenResponse
from app.crud import usuarios as crud_usuarios
from app.core.security import (
    verify_password, create_access_token,
    password_needs_rehash, hash_password,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = crud_usuarios.get_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )
    # Migración transparente: re-hashear contraseñas heredadas a bcrypt
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
        db.commit()
    token = create_access_token({"sub": str(user.id), "rol": user.rol})
    return TokenResponse(
        access_token=token,
        rol=user.rol,
        nombre=user.nombre,
        user_id=user.id,
    )
