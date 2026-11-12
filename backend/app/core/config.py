"""
config.py — Configuración de la aplicación.

SECRET_KEY:
  1. Si viene por variable de entorno o .env (y no es un valor de ejemplo), se usa.
  2. Si no, se genera una clave aleatoria y se persiste en backend/.secret_key
     para que los tokens sigan siendo válidos entre reinicios.
     (El archivo está en .gitignore — nunca se versiona.)

CORS_ORIGINS:
  Lista separada por comas ("*" permite cualquiera). Como la API usa tokens
  Bearer y no cookies, allow_credentials va SIEMPRE en False — la combinación
  "*" + credentials era inválida e insegura.
"""
import secrets
from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parents[2]
_SECRET_KEY_FILE = BACKEND_DIR / ".secret_key"

# Valores de ejemplo/heredados que NO deben usarse como clave real
_CLAVES_INSEGURAS = {
    "",
    "dev_secret_key_change_in_production_please",
    "cambia_esta_clave_secreta_por_una_muy_larga_y_aleatoria",
}


class Settings(BaseSettings):
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = "sqlite:///./inventario.db"
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


def _load_or_create_secret_key() -> str:
    if _SECRET_KEY_FILE.exists():
        key = _SECRET_KEY_FILE.read_text(encoding="utf-8").strip()
        if key:
            return key
    key = secrets.token_hex(32)
    _SECRET_KEY_FILE.write_text(key, encoding="utf-8")
    return key


settings = Settings()

if settings.SECRET_KEY in _CLAVES_INSEGURAS:
    settings.SECRET_KEY = _load_or_create_secret_key()
