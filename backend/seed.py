"""
seed.py — Wrapper de compatibilidad.

La semilla real vive en app/seed.py (la usa `python -m app.seed` en setup.bat).
Este archivo existe porque instalar.bat ejecuta `python seed.py` desde backend/.
La versión anterior estaba rota: usaba el campo `contrasena`, que no existe en
el modelo (es `password_hash`).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.seed import seed

if __name__ == "__main__":
    seed()
