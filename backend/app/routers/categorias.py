from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import CategoriaCreate, CategoriaUpdate, CategoriaResponse, PaginatedCategorias
from app.crud import categorias as crud
from app.core.dependencies import require_admin, require_any_role

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.get("", response_model=PaginatedCategorias)
def list_categorias(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    skip = (page - 1) * per_page
    total, items = crud.get_all(db, skip=skip, limit=per_page, search=search)
    return PaginatedCategorias(total=total, page=page, per_page=per_page, items=items)


@router.get("/{categoria_id}", response_model=CategoriaResponse)
def get_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    obj = crud.get_by_id(db, categoria_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return obj


@router.post("", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
def create_categoria(
    data: CategoriaCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    return crud.create(db, data)


@router.put("/{categoria_id}", response_model=CategoriaResponse)
def update_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, categoria_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return crud.update(db, obj, data)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, categoria_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    crud.delete(db, obj)
