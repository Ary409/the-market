/**
 * offline.js — Una sola puerta para leer y escribir "haya o no conexión".
 *
 * Las pantallas no deben preguntarse dónde están los datos: piden aquí y esta
 * capa decide si va al servidor o al espejo del teléfono. Cuando se escribe sin
 * conexión, la acción queda en cola y el resultado local se ajusta para que el
 * vendedor vea de inmediato el efecto de lo que acaba de hacer.
 */
import * as API from '../api';
import * as DB  from './db';

/** Ejecuta contra el servidor; si falla por red, devuelve la copia local. */
async function conRespaldo(clave, pedirAlServidor) {
  try {
    const datos = await pedirAlServidor();
    await DB.guardarEspejo(clave, datos);
    return { datos, deEspejo: false, actualizado: new Date().toISOString() };
  } catch (e) {
    const copia = await DB.leerEspejo(clave);
    if (copia) return { datos: copia.datos, deEspejo: true, actualizado: copia.actualizado };
    throw e;
  }
}

// ── Caja ──────────────────────────────────────────────────────────────────────

/** Estado del turno teniendo en cuenta lo que se abrió o cerró sin conexión. */
export async function getCaja(isOnline) {
  let base = null;
  let deEspejo = true;

  if (isOnline) {
    try {
      base = await API.getCajaActual();
      await DB.guardarEspejo('caja_actual', base);
      deEspejo = false;
    } catch {}
  }
  if (deEspejo) {
    const copia = await DB.leerEspejo('caja_actual');
    base = copia ? copia.datos : null;
  }

  // Aplicar encima lo que está en cola (lo más reciente manda)
  const acciones = await DB.getAccionesPendientes();
  for (const a of acciones) {
    if (a.tipo === 'abrir_caja') {
      base = {
        id: 'local', usuario_apertura_id: null,
        monto_inicial: a.payload.monto_inicial,
        fecha_apertura: a.created_at,
        estado: 'abierta', local: true,
      };
    }
    if (a.tipo === 'cerrar_caja') base = null;
  }
  return base;
}

export async function abrirCaja(monto, isOnline) {
  if (isOnline) {
    const r = await API.abrirCaja(monto);
    await DB.guardarEspejo('caja_actual', r);
    return { resultado: r, enCola: false };
  }
  await DB.encolarAccion('abrir_caja', { monto_inicial: monto }, 'Apertura de turno');
  return { resultado: null, enCola: true };
}

/**
 * Cierre de turno. Sin conexión el corte se calcula con los datos del teléfono:
 * fondo inicial + ventas en efectivo + cobros de cuentas.
 */
export async function cerrarCaja(montoContado, isOnline) {
  if (isOnline) {
    const r = await API.cerrarCaja(montoContado);
    await DB.guardarEspejo('caja_actual', null);
    return { resultado: r, enCola: false };
  }

  const caja = await getCaja(false);
  const ventas = await DB.getVentasDelDiaLocal();
  const acciones = await DB.getAccionesPendientes();

  const desde = caja?.fecha_apertura || '';
  const delTurno = ventas.filter(v => !desde || String(v.fecha) >= String(desde));

  const suma = (f) => delTurno.filter(f).reduce((s, v) => s + Number(v.total || 0), 0);
  const efectivo = suma(v => v.metodo_pago === 'efectivo');
  const tarjeta  = suma(v => v.metodo_pago === 'tarjeta');
  const credito  = suma(v => v.metodo_pago === 'credito');
  const cobros = acciones
    .filter(a => (a.tipo === 'abono' || a.tipo === 'liquidar') && a.created_at >= desde)
    .reduce((s, a) => s + Number(a.payload.monto || 0), 0);

  const inicial  = Number(caja?.monto_inicial || 0);
  const esperado = inicial + efectivo + cobros;

  await DB.encolarAccion('cerrar_caja', { monto_contado: montoContado }, 'Cierre de turno');

  // Mismo formato que devuelve el servidor, para que la pantalla no cambie
  return {
    enCola: true,
    resultado: {
      sesion: { id: caja?.id ?? '—', monto_inicial: inicial, monto_contado: montoContado },
      resumen: {
        total_ventas: efectivo + tarjeta + credito,
        cantidad_ventas: delTurno.length,
        ventas_efectivo: efectivo,
        ventas_tarjeta: tarjeta,
        ventas_credito: credito,
        cobros_credito_efectivo: cobros,
        cobros_credito_tarjeta: 0,
        monto_esperado: esperado,
        diferencia: Number((montoContado - esperado).toFixed(2)),
      },
      fiados_turno: delTurno.filter(v => v.metodo_pago === 'credito')
        .map(v => ({ numero_recibo: v.numero_recibo, cliente: v.cliente || '—', total: v.total })),
      cobros_turno: acciones
        .filter(a => a.tipo === 'abono' || a.tipo === 'liquidar')
        .map(a => ({ cliente: a.payload.cliente_nombre || '—', monto: a.payload.monto, metodo: a.payload.metodo })),
    },
  };
}

// ── Clientes y cuentas de fiado ───────────────────────────────────────────────

/** Clientes con el saldo ajustado por lo que aún está en cola. */
export async function getClientes({ search = '', soloDeuda = false, isOnline }) {
  let lista = [];
  if (isOnline) {
    try {
      const res = await API.getClientes({ search, per_page: 100 });
      lista = res.items || [];
    } catch { lista = null; }
  }
  if (!lista) lista = null;
  if (lista === null || !isOnline) {
    lista = (await DB.searchCachedClientes(search)).map(c => ({
      id: c.id, nombre: c.nombre, telefono: c.telefono, saldo: c.saldo, activo: true,
    }));
  }

  // Sumar fiados y restar abonos que todavía no se han subido
  const ajustados = await Promise.all(lista.map(async c => {
    const [fiado, abonado] = await Promise.all([
      DB.getFiadosPendientesDe(c.id), DB.getAbonosPendientesDe(c.id),
    ]);
    return { ...c, saldo: Math.max(0, Number(c.saldo || 0) + fiado - abonado) };
  }));

  return soloDeuda ? ajustados.filter(c => c.saldo > 0) : ajustados;
}

export async function registrarAbono(cliente, monto, metodo, isOnline) {
  if (isOnline) {
    await API.registrarAbono(cliente.id, { monto, metodo });
    return { enCola: false };
  }
  await DB.encolarAccion(
    'abono',
    { cliente_id: cliente.id, cliente_nombre: cliente.nombre, monto, metodo },
    `Abono de ${cliente.nombre}`,
  );
  return { enCola: true };
}

export async function liquidarCuenta(cliente, isOnline) {
  if (isOnline) {
    await API.liquidarCuenta(cliente.id, { metodo: 'efectivo' });
    return { enCola: false };
  }
  // Sin conexión se envía como abono por el saldo conocido: el servidor valida
  // el monto real cuando suba, y si sobra se rechaza con mensaje claro.
  await DB.encolarAccion(
    'abono',
    { cliente_id: cliente.id, cliente_nombre: cliente.nombre, monto: cliente.saldo, metodo: 'efectivo',
      notas: 'Liquidación registrada sin conexión' },
    `Liquidación de ${cliente.nombre}`,
  );
  return { enCola: true };
}

export async function crearCliente(datos, isOnline) {
  if (isOnline) return { cliente: await API.createCliente(datos), enCola: false };
  await DB.encolarAccion('cliente_nuevo', datos, `Cliente ${datos.nombre}`);
  // Id local negativo: no choca con los del servidor y permite fiarle de una vez
  return { cliente: { id: -Date.now(), nombre: datos.nombre, telefono: datos.telefono || '', saldo: 0, local: true }, enCola: true };
}

// ── Vistas de solo lectura ────────────────────────────────────────────────────

export const getDashboard  = (isOnline) => isOnline ? conRespaldo('dashboard', API.getDashboard) : soloEspejo('dashboard');
export const getAnalitica  = (isOnline, dias = 30) => isOnline ? conRespaldo('analitica', () => API.getAnalitica(dias)) : soloEspejo('analitica');
export const getAlertas    = (isOnline) => isOnline ? conRespaldo('alertas', API.getAlertas) : soloEspejo('alertas');
export const getTopProductos = (isOnline) => isOnline ? conRespaldo('top_productos', () => API.getTopProductos({ limite: 10 })) : soloEspejo('top_productos');
export const getGanancia   = (isOnline) => isOnline ? conRespaldo('ganancia', () => API.getGananciaBruta()) : soloEspejo('ganancia');
export const getRecomendaciones = (isOnline) => isOnline ? conRespaldo('recomendaciones', () => API.getRecomendaciones('pendiente')) : soloEspejo('recomendaciones');
export const getSesionesCaja = (isOnline) => isOnline ? conRespaldo('sesiones_caja', () => API.getSesionesCaja(30)) : soloEspejo('sesiones_caja');

async function soloEspejo(clave) {
  const copia = await DB.leerEspejo(clave);
  if (!copia) {
    throw new Error('Todavía no hay una copia guardada en el teléfono. Conéctate una vez para descargarla.');
  }
  return { datos: copia.datos, deEspejo: true, actualizado: copia.actualizado };
}

/** Ventas del día vistas desde el teléfono (servidor + lo que está en cola). */
export async function getVentasDelDia(isOnline) {
  if (isOnline) {
    try {
      const res = await API.getVentas({ hoy: true, per_page: 100 });
      const items = (res.items || []).map(v => ({
        id: v.id, numero_recibo: v.numero_recibo, fecha: v.fecha, total: v.total,
        metodo_pago: v.metodo_pago, estado: v.estado, cliente: v.cliente?.nombre || '',
      }));
      await DB.cacheVentas(items);
      return { datos: items, deEspejo: false };
    } catch {}
  }
  return { datos: await DB.getVentasDelDiaLocal(), deEspejo: true };
}

/** Texto amable para decir de cuándo son los datos que se están viendo. */
export function desdeCuando(iso) {
  if (!iso) return 'sin copia guardada';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)    return 'hace un momento';
  if (min < 60)   return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)     return `hace ${h} h`;
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
