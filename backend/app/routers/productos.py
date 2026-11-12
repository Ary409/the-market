from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import (
    ProductoCreate, ProductoUpdate, ProductoResponse,
    ProductoBarcodeResponse, PaginatedProductos,
)
from app.crud import productos as crud
from app.core.dependencies import require_admin, require_any_role

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/barcode/{codigo}", response_model=ProductoBarcodeResponse)
def get_by_barcode(
    codigo: str,
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    producto = crud.get_by_barcode(db, codigo)
    if not producto:
        raise HTTPException(status_code=404, detail=f"Producto con código '{codigo}' no encontrado")
    return producto


@router.get("", response_model=PaginatedProductos)
def list_productos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: str = Query(None, description="Buscar por nombre o código de barras"),
    categoria_id: int = Query(None),
    incluir_inactivos: bool = Query(False),
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    skip = (page - 1) * per_page
    total, items = crud.get_all(
        db,
        skip=skip,
        limit=per_page,
        search=q,
        categoria_id=categoria_id,
        solo_activos=not incluir_inactivos,
    )
    return PaginatedProductos(total=total, page=page, per_page=per_page, items=items)


@router.get("/{producto_id}", response_model=ProductoResponse)
def get_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_any_role),
):
    obj = crud.get_by_id(db, producto_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return obj


@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def create_producto(
    data: ProductoCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    return crud.create(db, data, usuario_id=admin.id)


@router.put("/{producto_id}", response_model=ProductoResponse)
def update_producto(
    producto_id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, producto_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return crud.update(db, obj, data)


@router.delete("/{producto_id}", response_model=ProductoResponse)
def delete_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    obj = crud.get_by_id(db, producto_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return crud.delete(db, obj)
