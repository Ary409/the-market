"""
env.py — Entorno de Alembic.

Usa el MISMO engine de la aplicación (app.database.engine) para garantizar que
las migraciones se aplican sobre la misma base de datos que usa el servidor,
independientemente del directorio de trabajo actual.

render_as_batch=True es necesario para SQLite (ALTER TABLE limitado).
"""
import sys
from pathlib import Path
from logging.config import fileConfig

from alembic import context

# Asegurar que `app` sea importable cuando alembic se ejecuta desde CLI
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings          # noqa: E402
from app.database import Base, engine         # noqa: E402
from app.models import models                 # noqa: E402,F401  (registra las tablas en Base.metadata)

config = context.config

if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except Exception:
        pass  # logging opcional; no debe impedir una migración

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Modo offline: genera SQL sin conectarse."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo online: usa el engine de la aplicación."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
