"""
recomendaciones.py — Recomendaciones inteligentes para el administrador.

Se generan automáticamente al cerrar caja (ver routers/caja.py) y pueden
regenerarse manualmente. Solo el administrador las ve y gestiona.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Recomendacion, Usuario
from app.schemas.schemas import RecomendacionResponse, RecomendacionUpdate
from app.core.dependencies import require_admin
from app.services import recomendaciones_service

router = APIRouter(prefix="/recomendaciones", tags=["Recomendaciones"])


@router.get("", response_model=list[RecomendacionResponse])
def listar_recomendaciones(
    estado: Optional[str] = Query("pendiente"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(Recomendacion).options(joinedload(Recomendacion.producto))
    if estado:
        q = q.filter(Recomendacion.estado == estado)
    orden_prioridad = {"alta": 0, "media": 1, "baja": 2}
    items = q.order_by(Recomendacion.created_at.desc()).limit(limit).all()
    return sorted(items, key=lambda r: orden_prioridad.get(r.prioridad, 9))


@router.post("/generar")
def generar_recomendaciones(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Regenera las recomendaciones bajo demanda (también ocurre al cerrar caja)."""
    resultado = recomendaciones_service.generar(db)
    db.commit()
    return resultado


@router.put("/{rec_id}", response_model=RecomendacionResponse)
def actualizar_recomendacion(
    rec_id: int,
    data: RecomendacionUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    rec = db.query(Recomendacion).filter(Recomendacion.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recomendación no encontrada")
    rec.estado = data.estado
    db.commit()
    db.refresh(rec)
    return rec
