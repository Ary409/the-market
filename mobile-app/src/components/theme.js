/**
 * theme.js — Paleta de la app. Tres temas.
 *
 * Detalle clave: las pantallas hacen `StyleSheet.create` al cargar el módulo,
 * así que los colores quedan fijados en ese instante. Por eso el tema guardado
 * se lee de forma SÍNCRONA aquí, antes de que cualquier pantalla se construya.
 * Gracias a eso las 22 pantallas siguen importando `colors` sin cambiar una
 * sola línea y aun así respetan la preferencia.
 *
 * Cambiar de tema guarda la preferencia y reinicia la app.
 */
import * as SQLite from 'expo-sqlite';

const PALETAS = {
  claro: {
    paper:        '#ffffff',
    ink100:       '#0a0a0a',
    ink80:        '#262626',
    ink20:        '#d4d4d4',
    ink10:        '#e5e5e5',
    ink05:        '#f5f5f5',
    border:       '#e5e5e5',
    borderStrong: '#d4d4d4',
    fg:           '#171717',
    fgMuted:      '#737373',
    fgSubtle:     '#a3a3a3',
    danger:       '#dc2626',
    dangerBg:     '#fef2f2',
    dangerBd:     '#fecaca',
    success:      '#16a34a',
    successBg:    '#ecfdf3',
    successBd:    '#bbf7d0',
    warning:      '#b45309',
    warningBg:    '#fef3c7',
    warningBd:    '#fde68a',
  },

  // Grises pensados para jornadas largas: el texto descansa, los montos resaltan
  oscuro: {
    paper:        '#1a1d21',
    ink100:       '#f2f4f6',
    ink80:        '#d7dbe0',
    ink20:        '#3a4048',
    ink10:        '#2a2f35',
    ink05:        '#14171a',
    border:       '#2e343b',
    borderStrong: '#3d444d',
    fg:           '#e8ebee',
    fgMuted:      '#98a2ad',
    fgSubtle:     '#6b7681',
    danger:       '#f87171',
    dangerBg:     '#2a1618',
    dangerBd:     '#5d2427',
    success:      '#4ade80',
    successBg:    '#14251b',
    successBd:    '#1f4030',
    warning:      '#fbbf24',
    warningBg:    '#2a2113',
    warningBd:    '#4a3a1a',
  },

  // Paleta del cliente: Blush · Antique Rose · Champagne · Dried Thyme · Bisque
  pink: {
    paper:        '#fffaf7',
    ink100:       '#C87D87',   // Antique Rose
    ink80:        '#a86670',
    ink20:        '#F0C4CB',   // Blush
    ink10:        '#f6dde1',
    ink05:        '#FBEAD6',   // Champagne
    border:       '#f0d9d3',
    borderStrong: '#E5BCA9',   // Bisque
    fg:           '#4a3a3d',
    fgMuted:      '#8d757a',
    fgSubtle:     '#b09a9e',
    danger:       '#c0392b',
    dangerBg:     '#fdeceb',
    dangerBd:     '#f0b8b2',
    success:      '#6B7556',   // Dried Thyme
    successBg:    '#eef0e8',
    successBd:    '#cdd4c2',
    warning:      '#b06a3f',
    warningBg:    '#fbeade',
    warningBd:    '#e8c5a8',
  },
};

export const TEMAS = [
  { id: 'claro',  nombre: 'Claro',  descripcion: 'El de siempre',          muestra: ['#ffffff', '#0a0a0a'] },
  { id: 'oscuro', nombre: 'Oscuro', descripcion: 'Para trabajar de noche', muestra: ['#1a1d21', '#f2f4f6'] },
  { id: 'pink',   nombre: 'Pink',   descripcion: 'Blush y Antique Rose',   muestra: ['#FBEAD6', '#C87D87'] },
];

// ── Lectura síncrona de la preferencia ───────────────────────────────────────
// AsyncStorage no sirve aquí: es asíncrono y llegaría tarde, cuando los estilos
// ya se construyeron. SQLite sí permite leer de forma síncrona.

let temaGuardado = 'claro';
let db = null;

function abrirDB() {
  if (!db) {
    db = SQLite.openDatabaseSync('themarket.db');
    db.execSync('CREATE TABLE IF NOT EXISTS preferencias (clave TEXT PRIMARY KEY, valor TEXT)');
  }
  return db;
}

try {
  const fila = abrirDB().getFirstSync("SELECT valor FROM preferencias WHERE clave = 'tema'");
  if (fila?.valor && PALETAS[fila.valor]) temaGuardado = fila.valor;
} catch {
  // Primer arranque o error de disco → tema claro
}

export const temaActual = temaGuardado;

/** Paleta activa. Las pantallas importan esto y no necesitan saber nada más. */
export const colors = PALETAS[temaGuardado];

/** Guarda la preferencia de tema. Devuelve true si quedó guardada. */
export function guardarTema(id) {
  if (!PALETAS[id]) return false;
  try {
    abrirDB().runSync("INSERT OR REPLACE INTO preferencias (clave, valor) VALUES ('tema', ?)", [id]);
    return true;
  } catch {
    return false;
  }
}

export const fonts = {
  sans: undefined, // usa la tipografía del sistema
};
