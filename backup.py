"""
backup.py — Copia de seguridad automática de la base de datos.
Se ejecuta diariamente via Programador de Tareas de Windows.

Guarda las últimas MAX_BACKUPS copias y elimina las más antiguas.
"""

import os
import shutil
import datetime
import glob

# ── Configuración ─────────────────────────────────────────────────────────────

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DB_PATH     = os.path.join(BASE_DIR, "backend", "inventario.db")
BACKUP_DIR  = os.path.join(BASE_DIR, "backups")
MAX_BACKUPS = 30   # Cuántas copias conservar
LOG_FILE    = os.path.join(BASE_DIR, "backups", "backup.log")

# ── Lógica principal ───────────────────────────────────────────────────────────

def log(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linea = f"[{timestamp}] {msg}"
    print(linea)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(linea + "\n")
    except Exception:
        pass

def hacer_backup():
    # Crear carpeta de backups si no existe
    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Verificar que la base de datos existe
    if not os.path.exists(DB_PATH):
        log(f"ERROR: No se encontró la base de datos en {DB_PATH}")
        return False

    # Nombre del archivo de backup con timestamp
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    destino = os.path.join(BACKUP_DIR, f"backup_{ts}.db")

    # Copiar
    try:
        shutil.copy2(DB_PATH, destino)
        size_kb = os.path.getsize(destino) // 1024
        log(f"Backup creado: backup_{ts}.db ({size_kb} KB)")
    except Exception as e:
        log(f"ERROR al copiar: {e}")
        return False

    # Limpiar backups viejos (mantener solo MAX_BACKUPS)
    backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "backup_*.db")))
    if len(backups) > MAX_BACKUPS:
        a_eliminar = backups[:len(backups) - MAX_BACKUPS]
        for archivo in a_eliminar:
            try:
                os.remove(archivo)
                log(f"Backup antiguo eliminado: {os.path.basename(archivo)}")
            except Exception as e:
                log(f"Error eliminando {archivo}: {e}")

    log(f"Total backups almacenados: {min(len(backups), MAX_BACKUPS)}/{MAX_BACKUPS}")
    return True

if __name__ == "__main__":
    log("=" * 50)
    log("Iniciando backup de The Market")
    exito = hacer_backup()
    log("Backup finalizado OK" if exito else "Backup FALLIDO")
    log("=" * 50)
