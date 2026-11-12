"""
permissions.py — Política central de permisos por rol.

Reemplaza los `if rol == "admin"` dispersos por permisos declarativos.
Agregar un rol nuevo o mover un permiso es editar SOLO este archivo
(y en el futuro, moverlo a base de datos sin tocar los routers).

Convención: "<modulo>.<accion>". El comodín "*" concede todo (admin).
"""

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin": {"*"},

    # El vendedor SOLO puede: vender, consultar productos/existencias,
    # registrar clientes y cobrar abonos, ver su propio historial y
    # abrir/cerrar su turno de caja.
    "vendedor": {
        "ventas.crear",
        "ventas.ver_propias",
        "productos.ver",
        "inventario.ver_alertas",
        "clientes.ver",
        "clientes.crear",
        "clientes.cobrar",
        "caja.operar",
    },
}


def tiene_permiso(rol: str, permiso: str) -> bool:
    permisos = ROLE_PERMISSIONS.get(rol, set())
    return "*" in permisos or permiso in permisos
