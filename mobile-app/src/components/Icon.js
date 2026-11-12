/**
 * Icon — Iconos SVG (estilo Lucide, trazo 1.75, viewBox 24x24).
 *
 * Son los MISMOS trazos que usa la app de escritorio (admin-desktop/Icon.jsx),
 * para que el sistema se vea igual en la PC y en el celular.
 * Antes esto dibujaba emojis, que se veían distintos en cada teléfono.
 */
import React from 'react';
import { View } from 'react-native';

/**
 * react-native-svg es un módulo NATIVO: solo existe si está compilado dentro de
 * la app. Se carga con tolerancia a fallos para que una versión antigua
 * (instalada antes de agregarlo) muestre un hueco en lugar del icono, en vez de
 * cerrarse al arrancar.
 */
let Svg, Path, Circle, Rect, Line, Polygon;
let svgDisponible = true;
try {
  const lib = require('react-native-svg');
  Svg = lib.default; Path = lib.Path; Circle = lib.Circle;
  Rect = lib.Rect;   Line = lib.Line; Polygon = lib.Polygon;
} catch {
  svgDisponible = false;
}

// Cada icono es una función que recibe el color y devuelve sus trazos.
const ICONOS = {
  'layout-dashboard': (c) => [
    <Rect key="a" x="3"  y="3"  width="7" height="9" rx="1" stroke={c} />,
    <Rect key="b" x="14" y="3"  width="7" height="5" rx="1" stroke={c} />,
    <Rect key="d" x="14" y="12" width="7" height="9" rx="1" stroke={c} />,
    <Rect key="e" x="3"  y="16" width="7" height="5" rx="1" stroke={c} />,
  ],
  'package': (c) => [
    <Path key="a" d="m7.5 4.27 9 5.15" stroke={c} />,
    <Path key="b" d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke={c} />,
    <Path key="d" d="m3.3 7 8.7 5 8.7-5" stroke={c} />,
    <Path key="e" d="M12 22V12" stroke={c} />,
  ],
  'shopping-cart': (c) => [
    <Circle key="a" cx="8"  cy="21" r="1" stroke={c} />,
    <Circle key="b" cx="19" cy="21" r="1" stroke={c} />,
    <Path key="d" d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" stroke={c} />,
  ],
  'truck': (c) => [
    <Path key="a" d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" stroke={c} />,
    <Path key="b" d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2" stroke={c} />,
    <Circle key="d" cx="7"  cy="18" r="2" stroke={c} />,
    <Path key="e" d="M15 18H9" stroke={c} />,
    <Circle key="f" cx="17" cy="18" r="2" stroke={c} />,
  ],
  'trend-up': (c) => [
    <Path key="a" d="M22 7L13.5 15.5l-5-5L2 17" stroke={c} />,
    <Path key="b" d="M16 7h6v6" stroke={c} />,
  ],
  'bar-chart-3': (c) => [
    <Path key="a" d="M3 3v18h18" stroke={c} />,
    <Path key="b" d="M18 17V9" stroke={c} />,
    <Path key="d" d="M13 17V5" stroke={c} />,
    <Path key="e" d="M8 17v-3" stroke={c} />,
  ],
  'users': (c) => [
    <Path key="a" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={c} />,
    <Circle key="b" cx="9" cy="7" r="4" stroke={c} />,
    <Path key="d" d="M22 21v-2a4 4 0 0 0-3-3.87" stroke={c} />,
    <Path key="e" d="M16 3.13a4 4 0 0 1 0 7.75" stroke={c} />,
  ],
  'wallet': (c) => [
    <Path key="a" d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" stroke={c} />,
    <Path key="b" d="M3 5v14" stroke={c} />,
    <Path key="d" d="M21 12V7H6a2 2 0 0 1 0-4h12" stroke={c} />,
    <Circle key="e" cx="16" cy="14" r="1" stroke={c} />,
  ],
  'bell': (c) => [
    <Path key="a" d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke={c} />,
    <Path key="b" d="M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke={c} />,
  ],
  'search': (c) => [
    <Circle key="a" cx="11" cy="11" r="7" stroke={c} />,
    <Path key="b" d="m21 21-4.3-4.3" stroke={c} />,
  ],
  'plus':  (c) => [<Path key="a" d="M5 12h14" stroke={c} />, <Path key="b" d="M12 5v14" stroke={c} />],
  'minus': (c) => [<Path key="a" d="M5 12h14" stroke={c} />],
  'pencil': (c) => [
    <Path key="a" d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" stroke={c} />,
    <Path key="b" d="m15 5 4 4" stroke={c} />,
  ],
  'trash': (c) => [
    <Path key="a" d="M3 6h18" stroke={c} />,
    <Path key="b" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke={c} />,
    <Path key="d" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={c} />,
  ],
  'x': (c) => [<Path key="a" d="M18 6 6 18" stroke={c} />, <Path key="b" d="m6 6 12 12" stroke={c} />],
  'check': (c) => [<Path key="a" d="M20 6 9 17l-5-5" stroke={c} />],
  'chevron-down':  (c) => [<Path key="a" d="m6 9 6 6 6-6" stroke={c} />],
  'chevron-right': (c) => [<Path key="a" d="m9 18 6-6-6-6" stroke={c} />],
  'chevron-left':  (c) => [<Path key="a" d="m15 18-6-6 6-6" stroke={c} />],
  'arrow-up':   (c) => [<Path key="a" d="m5 12 7-7 7 7" stroke={c} />, <Path key="b" d="M12 19V5" stroke={c} />],
  'arrow-down': (c) => [<Path key="a" d="M12 5v14" stroke={c} />, <Path key="b" d="m19 12-7 7-7-7" stroke={c} />],
  'scan-barcode': (c) => [
    <Path key="a" d="M3 7V5a2 2 0 0 1 2-2h2" stroke={c} />,
    <Path key="b" d="M17 3h2a2 2 0 0 1 2 2v2" stroke={c} />,
    <Path key="d" d="M21 17v2a2 2 0 0 1-2 2h-2" stroke={c} />,
    <Path key="e" d="M7 21H5a2 2 0 0 1-2-2v-2" stroke={c} />,
    <Path key="f" d="M7 7v10" stroke={c} />,
    <Path key="g" d="M11 7v10" stroke={c} />,
    <Path key="h" d="M15 7v10" stroke={c} />,
  ],
  'download': (c) => [
    <Path key="a" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={c} />,
    <Path key="b" d="M7 10l5 5 5-5" stroke={c} />,
    <Path key="d" d="M12 15V3" stroke={c} />,
  ],
  'filter': (c) => [<Polygon key="a" points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke={c} />],
  'alert-triangle': (c) => [
    <Path key="a" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" stroke={c} />,
    <Path key="b" d="M12 9v4" stroke={c} />,
    <Circle key="d" cx="12" cy="17" r="0.6" fill={c} stroke={c} />,
  ],
  'log-out': (c) => [
    <Path key="a" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={c} />,
    <Path key="b" d="m16 17 5-5-5-5" stroke={c} />,
    <Path key="d" d="M21 12H9" stroke={c} />,
  ],
  'settings': (c) => [
    <Path key="a" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} />,
    <Circle key="b" cx="12" cy="12" r="3" stroke={c} />,
  ],
  'calendar': (c) => [
    <Rect key="a" x="3" y="4" width="18" height="18" rx="2" stroke={c} />,
    <Path key="b" d="M16 2v4" stroke={c} />,
    <Path key="d" d="M8 2v4" stroke={c} />,
    <Path key="e" d="M3 10h18" stroke={c} />,
  ],
  'eye': (c) => [
    <Path key="a" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke={c} />,
    <Circle key="b" cx="12" cy="12" r="3" stroke={c} />,
  ],
  'eye-off': (c) => [
    <Path key="a" d="M9.88 9.88a3 3 0 1 0 4.24 4.24" stroke={c} />,
    <Path key="b" d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" stroke={c} />,
    <Path key="d" d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" stroke={c} />,
    <Line key="e" x1="2" x2="22" y1="2" y2="22" stroke={c} />,
  ],
  'more': (c) => [
    <Circle key="a" cx="12" cy="12" r="1" fill={c} stroke={c} />,
    <Circle key="b" cx="19" cy="12" r="1" fill={c} stroke={c} />,
    <Circle key="d" cx="5"  cy="12" r="1" fill={c} stroke={c} />,
  ],
  'dot': (c) => [<Circle key="a" cx="12" cy="12" r="3" fill={c} stroke={c} />],
  'smartphone': (c) => [
    <Rect key="a" x="5" y="2" width="14" height="20" rx="2" stroke={c} />,
    <Path key="b" d="M12 18h.01" stroke={c} />,
  ],
  'receipt': (c) => [
    <Path key="a" d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" stroke={c} />,
    <Path key="b" d="M8 7h8" stroke={c} />,
    <Path key="d" d="M8 11h8" stroke={c} />,
    <Path key="e" d="M8 15h5" stroke={c} />,
  ],
  'credit-card': (c) => [
    <Rect key="a" x="2" y="5" width="20" height="14" rx="2" stroke={c} />,
    <Path key="b" d="M2 10h20" stroke={c} />,
  ],
  'wifi': (c) => [
    <Path key="a" d="M5 12.55a11 11 0 0 1 14.08 0" stroke={c} />,
    <Path key="b" d="M1.42 9a16 16 0 0 1 21.16 0" stroke={c} />,
    <Path key="d" d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={c} />,
    <Circle key="e" cx="12" cy="20" r="1" fill={c} stroke={c} />,
  ],
  'wifi-off': (c) => [
    <Line key="a" x1="2" x2="22" y1="2" y2="22" stroke={c} />,
    <Path key="b" d="M8.5 16.5a5 5 0 0 1 7 0" stroke={c} />,
    <Path key="d" d="M2 8.82a15 15 0 0 1 4.17-2.65" stroke={c} />,
    <Path key="e" d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" stroke={c} />,
    <Path key="f" d="M16.85 11.25a10 10 0 0 1 2.22 1.68" stroke={c} />,
    <Path key="g" d="M5 13a10 10 0 0 1 5.24-2.76" stroke={c} />,
    <Circle key="h" cx="12" cy="20" r="1" fill={c} stroke={c} />,
  ],
  'clock': (c) => [
    <Circle key="a" cx="12" cy="12" r="10" stroke={c} />,
    <Path key="b" d="M12 6v6l4 2" stroke={c} />,
  ],
  'qr-code': (c) => [
    <Rect key="a" x="3"  y="3"  width="5" height="5" rx="1" stroke={c} />,
    <Rect key="b" x="16" y="3"  width="5" height="5" rx="1" stroke={c} />,
    <Rect key="d" x="3"  y="16" width="5" height="5" rx="1" stroke={c} />,
    <Path key="e" d="M21 16h-3a2 2 0 0 0-2 2v3" stroke={c} />,
    <Path key="f" d="M12 7v3a2 2 0 0 1-2 2H7" stroke={c} />,
    <Path key="g" d="M16 12h1" stroke={c} />,
  ],
};

export default function Icon({ name, size = 20, color = '#0a0a0a', strokeWidth = 1.75 }) {
  const dibujar = ICONOS[name];
  if (!dibujar) return null;
  if (!svgDisponible) {
    // Reserva el espacio para que la pantalla no se descuadre
    return <View style={{ width: size, height: size }} />;
  }
  return (
    <Svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {dibujar(color)}
    </Svg>
  );
}

// Para poder verificar en pruebas que todos los nombres usados existen
export const NOMBRES_DE_ICONO = Object.keys(ICONOS);
