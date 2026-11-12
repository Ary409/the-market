# The Market — Móvil Admin (Bloque D)

Vista del dueño/administrador en móvil. 4 pestañas (bottom tabs): **Inicio · Alertas · Consulta · Historial**.

## Pantallas

1. **Inicio (Dashboard)** — saludo + bell con contador rojo. Card grande negra con *Ingresos hoy* (+12% vs ayer). Sub-métricas (Caja actual, Ticket promedio). Banner ámbar de alertas. Cards de acceso rápido.
2. **Alertas** — tab pills *Stock bajo* / *Por vencer* con contadores. Pull-to-refresh (botón de refresco con spin). Cada fila muestra producto + badge `4 de 12` o `Agotado`. Vencer marca con calendar.
3. **Consulta rápida** — abre directo en cámara (scanner mock) → tras 1.6s muestra **ficha completa** del producto: hero con thumb, stock, precios, **card verde con margen %** + ganancia/unidad, categoría/proveedor, lista de **últimos movimientos** (ventas / entradas con flechas).
4. **Historial** — header con *Hoy · N ventas · Total*. Lista de recibos con icono pago (verde efectivo, azul tarjeta), vendedor, items, total. Tap → bottom sheet con detalle de items y botón *Reimprimir recibo*.

## Estructura

```
mobile-admin/
├── index.html
├── ios-frame.jsx               ← compartido con mobile-vendedor
├── mockData.js
├── mobile-components.jsx       ← extensión: bell, alert-triangle, refresh, calendar, trend-up, etc
├── app.jsx                     ← router + bottom tab bar
└── screens/
    ├── Dashboard.jsx
    ├── Alertas.jsx
    ├── ConsultaRapida.jsx      ← scanner → product detail
    └── Historial.jsx
```

## Notas

- **Bottom tab bar** sticky con `backdrop-filter: blur` y badge rojo en *Alertas*. Color del bar cambia a oscuro automáticamente cuando estás en la cámara de Consulta.
- **Pull-to-refresh** representado como botón de refresh + spinner (gesto pull real implementarlo en producción).
- **Consulta rápida** reutiliza el viewfinder del bloque C (vendedor móvil). En producción ambos pueden compartir una librería de escaneo.
- **Datos en `mockData.js`** son hardcoded — `resumenHoy`, `stockBajo`, `porVencer`, `productoEscaneado` (con movimientos), `ventasHoy`.
