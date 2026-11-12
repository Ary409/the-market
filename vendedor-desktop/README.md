# The Market — Vendedor Desktop (Bloque B)

Vista del cajero en escritorio. 4 pantallas clickeables.

## Pantallas

1. **Inicio** — saludo, métricas del día del vendedor (sus ventas, ingresos, ticket promedio), tabla de sus ventas de hoy, panel lateral con estado de caja y desglose por método de pago.
2. **Punto de venta (POS)** — pantalla completa sin topbar. Split izquierda/derecha:
   - **Izquierda:** buscador (por nombre o código), chips de categoría, grid de productos clickeables (auto-fill).
   - **Derecha:** carrito en vivo, selector de método (Efectivo / Tarjeta / Mixto), monto recibido con quick-amounts, cambio automático, **TOTAL** en grande, **COBRAR** de 60px de alto al fondo.
3. **Inventario (consulta)** — versión read-only de la tabla del admin. Banner azul indicando "sólo lectura", sin botones de editar/eliminar.
4. **Mis ventas** — lista de recibos del día con panel de detalle al click. Botón "Imprimir" en el detalle.

Tras `COBRAR`, abre el **modal de Confirmación de venta** con check verde, número de recibo en mono, resumen, total / cambio, y CTAs `Imprimir recibo` + `Nueva venta`.

## Estructura

```
vendedor-desktop/
├── index.html
├── mockData.js
├── Icon.jsx                 ← extensión: banknote, credit-card, split, receipt, printer
├── components.jsx           ← compartido con admin-desktop
├── Shell.jsx                ← sidebar de 4 items con chip de "Caja abierta"
├── app.jsx
└── screens/
    ├── DashboardVendedor.jsx
    ├── POSDesktop.jsx       ← la pantalla más importante
    ├── ConsultaInventario.jsx
    ├── MisVentas.jsx
    └── ConfirmacionVenta.jsx
```

## Diferencias vs admin-desktop

- **Sidebar** tiene 4 items (Inicio, Punto de venta, Inventario, Mis ventas) y un chip de estado de caja arriba.
- **POS es full-bleed** (sin topbar, sin padding) para maximizar área de productos y carrito.
- **Sin acciones destructivas** en inventario (sólo lectura) ni en ventas (no se pueden cancelar).
