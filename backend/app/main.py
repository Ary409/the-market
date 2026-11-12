import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.bootstrap import run_migrations
from app.routers import (
    auth, categorias, proveedores, productos, usuarios, inventario,
    compras, ventas, caja, reportes, dashboard, clientes, recomendaciones,
)

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# Migraciones automáticas (reemplaza a Base.metadata.create_all)
run_migrations()

app = FastAPI(
    title="Sistema de Inventario y Ventas",
    description="API REST para mini supermercados",
    version="2.0.0",
)

# Auth por token Bearer (no cookies) → allow_credentials=False.
# Orígenes configurables vía CORS_ORIGINS (separados por coma).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categorias.router)
app.include_router(proveedores.router)
app.include_router(productos.router)
app.include_router(usuarios.router)
app.include_router(inventario.router)
app.include_router(compras.router)
app.include_router(ventas.router)
app.include_router(caja.router)
app.include_router(reportes.router)
app.include_router(dashboard.router)
app.include_router(clientes.router)
app.include_router(recomendaciones.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/info", tags=["Health"])
def info():
    """Retorna la IP local del servidor — usada por el sistema para generar QR de configuración."""
    ip = get_local_ip()
    return {
        "ip":         ip,
        "server_url": f"http://{ip}:8000",
        "version":    "2.0.0",
    }


@app.get("/info/qr", tags=["Health"])
def info_qr(data: str | None = None):
    """Matriz del código QR para sincronizar el celular con este servidor.

    Se genera aquí (reportlab) y NO con un servicio de internet: la tienda debe
    poder emparejar el teléfono aunque no tenga conexión externa, solo la
    red WiFi local.
    """
    from reportlab.graphics.barcode import qr as _qr

    contenido = data or f"http://{get_local_ip()}:8000"
    encoder = _qr.QrCodeWidget(contenido).qr
    encoder.make()
    n = encoder.getModuleCount()
    # Fila por fila como cadenas de "1"/"0" — compacto y fácil de dibujar
    filas = ["".join("1" if encoder.isDark(r, c) else "0" for c in range(n)) for r in range(n)]
    return {"data": contenido, "size": n, "rows": filas}
