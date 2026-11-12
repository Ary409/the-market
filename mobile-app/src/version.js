/**
 * version.js — Sello visible de qué versión está corriendo en el teléfono.
 *
 * Existe porque sin él es imposible saber si el aparato ya recibió los cambios
 * o sigue con un paquete viejo en caché, y eso vuelve imposible diagnosticar
 * cualquier problema.
 *
 * REGLA: subir VERSION en cada publicación.
 */
export const VERSION = '2.5';

export const NOVEDADES = 'Temas oscuro y pink';

/** Fecha de la actualización que está corriendo, si expo-updates la conoce. */
export function fechaDelPaquete() {
  try {
    const Updates = require('expo-updates');
    if (Updates?.createdAt) {
      return new Date(Updates.createdAt).toLocaleString('es', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    }
  } catch {}
  return null;
}
