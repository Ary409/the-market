"""
bootstrap.py — Migraciones automáticas al arrancar.

Reemplaza el antiguo Base.metadata.create_all():

  * BD nueva (sin tablas)              → alembic upgrade head (crea todo el esquema).
  * BD existente sin versionar         → se marca (stamp) en la revisión baseline
                                         y luego se aplican las migraciones pendientes.
  * BD ya versionada                   → alembic upgrade head aplica solo lo pendiente.

Así las instalaciones existentes se incorporan a Alembic sin perder datos y las
nuevas quedan versionadas desde el primer arranque.
"""
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine

logger = logging.getLogger("app.bootstrap")

BACKEND_DIR = Path(__file__).resolve().parents[2]
BASELINE_REVISION = "0001"


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    # Rutas absolutas: el servidor puede arrancar desde cualquier directorio
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


def run_migrations() -> None:
    cfg = _alembic_config()
    inspector = inspect(engine)
    tablas = set(inspector.get_table_names())

    if "alembic_version" not in tablas and "productos" in tablas:
        # BD creada antes de Alembic: su esquema corresponde al baseline.
        logger.info("BD existente sin versionar — marcando revisión baseline %s", BASELINE_REVISION)
        command.stamp(cfg, BASELINE_REVISION)

    command.upgrade(cfg, "head")
