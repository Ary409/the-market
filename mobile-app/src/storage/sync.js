/**
 * sync.js — Puente entre el teléfono y el servidor.
 *
 *  · SUBIR: todo lo que se hizo sin conexión (ventas, abonos, apertura y cierre
 *    de turno) se envía EN EL ORDEN EN QUE OCURRIÓ. Ese orden importa: no se
 *    puede registrar una venta de un turno que aún no se abrió.
 *  · BAJAR: se guarda una copia local de lo que el negocio necesita ver
 *    (catálogo, clientes, caja, ventas del día, resumen y reportes) para que la
 *    app siga siendo útil cuando se cae la red.
 */

import * as DB  from './db';
import * as API from '../api';

// ── SUBIR: cola unificada ────────────────────────────────────────────────────

/** Mensajes del servidor que significan "esto ya está resuelto, sigue". */
function yaResuelto(mensaje = '') {
  return /ya hay una caja abierta|no hay caja abierta|ya fue anulada|ya existe/i.test(String(mensaje));
}

async function enviarVenta(venta) {
  const payload = {
    items: venta.items.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
    metodo_pago: venta.metodo_pago,
  };
  if (venta.metodo_pago !== 'credito') payload.monto_recibido = venta.monto_recibido;
  if (venta.cliente_id) payload.cliente_id = venta.cliente_id;
  await API.crearVenta(payload);
}

async function enviarAccion(accion) {
  const p = accion.payload;
  switch (accion.tipo) {
    case 'abrir_caja':   return API.abrirCaja(p.monto_inicial);
    case 'cerrar_caja':  return API.cerrarCaja(p.monto_contado);
    case 'abono':        return API.registrarAbono(p.cliente_id, { monto: p.monto, metodo: p.metodo, notas: p.notas });
    case 'liquidar':     return API.liquidarCuenta(p.cliente_id, { metodo: p.metodo });
    case 'cliente_nuevo':return API.createCliente(p);
    default: throw new Error(`Acción desconocida: ${accion.tipo}`);
  }
}

/**
 * Sube TODO lo pendiente respetando el orden cronológico real.
 * Devuelve { synced, failed, detalle }.
 */
export async function syncPendingSales() {
  const [ventas, acciones] = await Promise.all([
    DB.getPendingSales(),
    DB.getAccionesPendientes(),
  ]);

  // Mezclar ventas y acciones en una sola línea de tiempo
  const cola = [
    ...ventas.map(v => ({
      clase: 'venta', id: v.local_id, cuando: v.ocurrido_en || v.created_at, dato: v,
      etiqueta: `Venta ${v.metodo_pago}`,
    })),
    ...acciones.map(a => ({
      clase: 'accion', id: a.local_id, cuando: a.created_at, dato: a,
      etiqueta: a.etiqueta || a.tipo,
    })),
  ].sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));

  if (!cola.length) return { synced: 0, failed: 0, detalle: [] };

  let synced = 0, failed = 0;
  const detalle = [];

  for (const item of cola) {
    try {
      if (item.clase === 'venta') await enviarVenta(item.dato);
      else                        await enviarAccion(item.dato);

      if (item.clase === 'venta') await DB.markSaleSynced(item.id);
      else                        await DB.marcarAccionSincronizada(item.id);
      synced++;
    } catch (e) {
      const msg = e.message || 'Error desconocido';
      // Si el servidor dice que eso ya estaba hecho, no tiene sentido reintentar
      if (yaResuelto(msg)) {
        if (item.clase === 'venta') await DB.markSaleSynced(item.id);
        else                        await DB.marcarAccionSincronizada(item.id);
        synced++;
        continue;
      }
      if (item.clase === 'venta') await DB.markSaleFailed(item.id, msg);
      else                        await DB.marcarAccionFallida(item.id, msg);
      failed++;
      detalle.push({ etiqueta: item.etiqueta, error: msg });
    }
  }

  return { synced, failed, detalle };
}

// ── BAJAR: espejo local para poder leer sin conexión ─────────────────────────

export async function refreshProductCache() {
  try {
    const todos = [];
    let page = 1;
    while (page <= 30) {                       // tope de seguridad: 3000 productos
      const res = await API.getProductos({ page, per_page: 100 });
      const items = res.items || [];
      todos.push(...items);
      if (todos.length >= (res.total || 0) || items.length === 0) break;
      page++;
    }
    if (todos.length > 0) await DB.cacheProducts(todos);
    return todos.length;
  } catch {
    return null;   // Sin conexión → se usa la copia existente
  }
}

export async function refreshClienteCache() {
  try {
    const todos = [];
    let page = 1;
    while (page <= 10) {                       // tope: 2000 clientes
      const res = await API.getClientes({ page, per_page: 200 });
      const items = res.items || [];
      todos.push(...items);
      if (todos.length >= (res.total || 0) || items.length === 0) break;
      page++;
    }
    if (todos.length > 0) await DB.cacheClientes(todos);
    return todos.length;
  } catch {
    return null;
  }
}

/**
 * Baja lo que el administrador necesita ver: caja, ventas del día, resumen,
 * reportes y alertas. Cada bloque se guarda por separado para que un fallo
 * no arrastre a los demás.
 */
export async function refreshEspejo({ esAdmin = true } = {}) {
  const guardar = async (clave, fn) => {
    try { await DB.guardarEspejo(clave, await fn()); return true; }
    catch { return false; }
  };

  // Todos los roles
  await guardar('caja_actual', () => API.getCajaActual());
  await guardar('ventas_hoy',  async () => {
    const res = await API.getVentas({ hoy: true, per_page: 100 });
    const items = (res.items || []).map(v => ({
      id: v.id, numero_recibo: v.numero_recibo, fecha: v.fecha,
      total: v.total, metodo_pago: v.metodo_pago, estado: v.estado,
      vendedor: '', cliente: v.cliente?.nombre || '',
    }));
    await DB.cacheVentas(items);
    return { total: res.total || items.length };
  });

  if (!esAdmin) return;

  // Solo administrador
  await guardar('dashboard',  () => API.getDashboard());
  await guardar('analitica',  () => API.getAnalitica(30));
  await guardar('alertas',    () => API.getAlertas());
  await guardar('top_productos', () => API.getTopProductos({ limite: 10 }));
  await guardar('ganancia',   () => API.getGananciaBruta());
  await guardar('recomendaciones', () => API.getRecomendaciones('pendiente'));
  await guardar('sesiones_caja', () => API.getSesionesCaja(30));
}

/** Sincronización completa: primero sube lo pendiente, luego refresca la copia. */
export async function sincronizarTodo({ esAdmin = true } = {}) {
  const resultado = await syncPendingSales();
  await refreshProductCache();
  await refreshClienteCache();
  await refreshEspejo({ esAdmin });
  return resultado;
}
