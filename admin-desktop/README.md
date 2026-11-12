# The Market — Admin Desktop UI kit

Recreación interactiva del Bloque A. Demo navegable: empieza en login, ingresa con cualquier valor, navega por el sidebar.

## Estructura

```
admin-desktop/
├── index.html          ← entrada principal
├── mockData.js         ← datos hardcodeados (productos, ventas, proveedores, etc)
├── Icon.jsx            ← set de iconos Lucide inline
├── components.jsx      ← Button, TextField, Select, Badge, Card, Thumb, Modal, EmptyState
├── Shell.jsx           ← Sidebar + Topbar + layout
├── app.jsx             ← router de pantallas
└── screens/
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── Inventario.jsx        ← incluye ProductoFormModal
    ├── Compras.jsx           ← incluye NuevaOrdenModal
    ├── Proveedores.jsx       ← incluye ProveedorFormModal
    ├── Reportes.jsx          ← tabs: Ventas / Top productos / Ganancia bruta
    ├── Usuarios.jsx          ← incluye NuevoUsuarioModal
    └── Caja.jsx              ← estado abierta/cerrada + historial
```

## Cómo usar

Abre `index.html` en navegador. No requiere build — usa React + Babel desde CDN. Los datos viven en `mockData.js`.

Para integrar en producción:
1. Copia `components.jsx`, `Icon.jsx`, `Shell.jsx` y cualquier `screens/*.jsx` que necesites.
2. Sustituye `window.MOCK.*` por tu fetch real.
3. Trae `colors_and_type.css` (en la raíz del design system).

## Notas

- **Bloque A (Admin Desktop) completo** — las 9 pantallas pedidas.
- Modales y formularios funcionan; las acciones de guardar simplemente cierran (no hay backend).
- La navegación entre pantallas usa estado React, no rutas de URL — sustitúyelo por tu router preferido en producción.
- Sin animaciones complejas: fade + slide-up sutil en modales, transiciones de 120-180ms en hover.
