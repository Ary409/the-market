# The Market — Móvil Vendedor (Bloque C)

Recreación móvil del flujo de venta. iPhone-style frame, 6 pantallas click-thru: empieza en login, ingresa, escanea, agrega al carrito, cobra, ¡venta lista!

## Flujo

```
Login → POS Home → [Escanear] → Scanner → (detección) → POS Home
                ↓
              Cart (swipe-to-delete)
                ↓
              Cobro Sheet (efectivo/tarjeta/mixto + cambio)
                ↓
              Success (recibo + nueva venta)
```

## Estructura

```
mobile-vendedor/
├── index.html               ← entrada
├── ios-frame.jsx            ← iPhone frame con status bar y home indicator
├── mockData.js              ← productos + usuario
├── mobile-components.jsx    ← MIcon, MButton, MField, MThumb, BottomSheet
├── app.jsx                  ← router + estado del carrito
└── screens/
    ├── Login.jsx            ← IP del servidor + email + password
    ├── POSHome.jsx          ← scan button grande, carrito preview, total + COBRAR
    ├── Scanner.jsx          ← viewfinder + "Buscando..." + producto detectado
    ├── Cart.jsx             ← lista completa, swipe-to-delete (tap to reveal)
    ├── CobroSheet.jsx       ← bottom sheet con métodos de pago
    └── Success.jsx          ← número de recibo, resumen, nueva venta
```

## Detalles del scanner

- La cámara es un mock — fondo radial oscuro con línea de escaneo animada y viewfinder de esquinas.
- La detección se simula con `setTimeout 1800ms` → siempre encuentra Coca-Cola 600ml.
- Para producción, sustituir por una integración real (`html5-qrcode`, `react-native-camera`, etc).

## Tap-to-reveal (swipe simulado)

El carrito usa **tap para revelar** el botón de eliminar en lugar de gestos de swipe — más confiable en navegador. En producción móvil real, usar gestos pan (Framer Motion drag o `PanResponder`).

## Notas

- Reutiliza tokens (`colors_and_type.css`) y la marca del design system.
- Botones siguen las reglas del sistema: COBRAR es el único elemento con tamaño `xl` (64px alto), todos los demás CTAs primarios son `lg`.
- El bottom sheet de cobro permite seleccionar Efectivo (con chips de monto rápido y cambio automático), Tarjeta (esperando terminal), o Mixto (dos campos).
