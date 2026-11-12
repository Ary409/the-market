import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * expo-file-system y expo-sharing son módulos NATIVOS: solo existen si están
 * compilados dentro del APK. Se cargan de forma perezosa para que una versión
 * antigua de la app (instalada antes de agregarlos) siga funcionando y solo
 * falle la descarga de archivos, en vez de romperse al arrancar.
 */
function cargarModuloNativo(nombre) {
  try {
    // eslint-disable-next-line global-require
    return nombre === 'fs' ? require('expo-file-system/legacy') : require('expo-sharing');
  } catch {
    return null;
  }
}

const DEFAULT_URL = 'http://10.0.2.2:8000'; // Android emulator → localhost

async function getBaseUrl() {
  return (await AsyncStorage.getItem('api_url')) || DEFAULT_URL;
}

async function getHeaders() {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Toda llamada lleva límite de tiempo.
 *
 * Sin él, con el WiFi conectado pero el servidor apagado o fuera de alcance,
 * `fetch` se queda esperando más de un minuto: la app parecía colgada y nunca
 * llegaba a usar el modo sin conexión.
 */
const TIEMPO_LIMITE_MS = 12000;

async function apiFetch(path, options = {}) {
  const { timeoutMs = TIEMPO_LIMITE_MS, ...resto } = options;
  const base    = await getBaseUrl();
  const headers = await getHeaders();

  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${base}${path}`, {
      ...resto,
      signal: ctrl.signal,
      headers: { ...headers, ...resto.headers },
    });
  } catch (e) {
    // Que el motivo sea reconocible como "no se alcanzó el servidor"
    throw new Error('Network request failed');
  } finally {
    clearTimeout(reloj);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({ detail: 'Error de servidor' }));
  if (!res.ok) {
    const msg = data.detail;
    throw new Error(Array.isArray(msg) ? msg.map(e => e.msg).join(', ') : String(msg));
  }
  return data;
}

/**
 * ¿Responde el servidor de la tienda?
 *
 * Esta es la pregunta correcta para un POS: el servidor vive en la red LOCAL
 * (ej. 192.168.0.7), así que el WiFi de la tienda puede no tener internet y
 * aun así todo funcionar. Preguntar "¿hay internet?" daba falsos negativos y
 * mandaba la app a modo sin conexión sin necesidad.
 */
export async function servidorDisponible(timeoutMs = 4000) {
  const base = await getBaseUrl();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(base + '/', { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

const qs = (params = {}) => {
  const limpio = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(limpio).toString();
  return s ? `?${s}` : '';
};

// ── Descargar y compartir archivos (PDF/CSV) ──────────────────────────────────
// El servidor exige token, así que no se puede abrir la URL directo en el navegador:
// se descarga con el header de autorización y se abre con la hoja de compartir.

export async function descargarYCompartir(path, nombreArchivo) {
  const FileSystem = cargarModuloNativo('fs');
  const Sharing    = cargarModuloNativo('sharing');
  if (!FileSystem || !Sharing) {
    throw new Error(
      'Tu versión de la app no incluye la descarga de archivos. ' +
      'Pídele al administrador la versión más reciente.'
    );
  }

  const base  = await getBaseUrl();
  const token = await AsyncStorage.getItem('token');
  const destino = FileSystem.cacheDirectory + nombreArchivo;

  const { status } = await FileSystem.downloadAsync(base + path, destino, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (status !== 200) throw new Error(`No se pudo generar el archivo (${status})`);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos');
  }
  await Sharing.shareAsync(destino, {
    mimeType: nombreArchivo.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
    dialogTitle: nombreArchivo,
  });
  return destino;
}

// ── Auth ──────────────────────────────────────────────────────
// El login espera poco: si el servidor no está, hay que pasar rápido al
// modo sin conexión en vez de dejar al vendedor mirando el botón girar.
export const login = (email, password) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    timeoutMs: 6000,
  });

// ── Productos ─────────────────────────────────────────────────
export const getProductos = (params = {}) => apiFetch('/productos' + qs(params));

export const getProducto = (id) => apiFetch(`/productos/${id}`);

export const getProductoByBarcode = (codigo) =>
  apiFetch(`/productos/barcode/${encodeURIComponent(codigo)}`);

export const createProducto = (data) =>
  apiFetch('/productos', { method: 'POST', body: JSON.stringify(data) });

export const updateProducto = (id, data) =>
  apiFetch(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const desactivarProducto = (id) =>
  apiFetch(`/productos/${id}`, { method: 'DELETE' });

// ── Categorías ────────────────────────────────────────────────
export const getCategorias = () => apiFetch('/categorias?per_page=200');

export const createCategoria = (data) =>
  apiFetch('/categorias', { method: 'POST', body: JSON.stringify(data) });

export const deleteCategoria = (id) =>
  apiFetch(`/categorias/${id}`, { method: 'DELETE' });

// ── Inventario ────────────────────────────────────────────────
export const getAlertas   = () => apiFetch('/inventario/alertas');
export const getPorVencer = () => apiFetch('/inventario/por-vencer');

export const getMovimientos = (params = {}) =>
  apiFetch('/inventario/movimientos' + qs(params));

export const registrarEntrada = (data) =>
  apiFetch('/inventario/entrada', { method: 'POST', body: JSON.stringify(data) });

export const registrarSalida = (data) =>
  apiFetch('/inventario/salida', { method: 'POST', body: JSON.stringify(data) });

export const ajustarStock = (data) =>
  apiFetch('/inventario/ajuste', { method: 'POST', body: JSON.stringify(data) });

// ── Clientes (fiado) ──────────────────────────────────────────
export const getClientes = (params = {}) => apiFetch('/clientes' + qs(params));

export const getClientesConDeuda = () => apiFetch('/clientes/con-deuda');

export const createCliente = (data) =>
  apiFetch('/clientes', { method: 'POST', body: JSON.stringify(data) });

export const updateCliente = (id, data) =>
  apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const desactivarCliente = (id) =>
  apiFetch(`/clientes/${id}`, { method: 'DELETE' });

export const getEstadoCuenta = (id) => apiFetch(`/clientes/${id}/estado-cuenta`);

export const registrarAbono = (id, data) =>
  apiFetch(`/clientes/${id}/pagos`, { method: 'POST', body: JSON.stringify(data) });

export const liquidarCuenta = (id, data = {}) =>
  apiFetch(`/clientes/${id}/liquidar`, { method: 'POST', body: JSON.stringify(data) });

// ── Proveedores ───────────────────────────────────────────────
export const getProveedores = (params = {}) => apiFetch('/proveedores' + qs(params));

export const createProveedor = (data) =>
  apiFetch('/proveedores', { method: 'POST', body: JSON.stringify(data) });

export const updateProveedor = (id, data) =>
  apiFetch(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const desactivarProveedor = (id) =>
  apiFetch(`/proveedores/${id}`, { method: 'DELETE' });

export const getProductosProveedor = (id) => apiFetch(`/proveedores/${id}/productos`);

export const getEstadoCuentaProveedor = (id) => apiFetch(`/proveedores/${id}/estado-cuenta`);

export const registrarPagoProveedor = (id, data) =>
  apiFetch(`/proveedores/${id}/pagos`, { method: 'POST', body: JSON.stringify(data) });

// ── Compras (órdenes) ─────────────────────────────────────────
export const getCompras = (params = {}) => apiFetch('/compras' + qs(params));

export const getCompra = (id) => apiFetch(`/compras/${id}`);

export const createCompra = (data) =>
  apiFetch('/compras', { method: 'POST', body: JSON.stringify(data) });

export const recibirCompra = (id) =>
  apiFetch(`/compras/${id}/recibir`, { method: 'PUT' });

export const cancelarCompra = (id) =>
  apiFetch(`/compras/${id}`, { method: 'DELETE' });

export const compartirOrdenPDF = (id, formato = 'carta') =>
  descargarYCompartir(`/compras/${id}/pdf?formato=${formato}`, `orden_OC-${String(id).padStart(4, '0')}_${formato}.pdf`);

// ── Ventas ────────────────────────────────────────────────────
export const crearVenta = (data) =>
  apiFetch('/ventas', { method: 'POST', body: JSON.stringify(data) });

export const getVentas = (params = {}) => apiFetch('/ventas' + qs(params));

export const getRecibo = (id) => apiFetch(`/ventas/${id}/recibo`);

export const getVentasHoy = () => apiFetch('/ventas?hoy=true');

export const anularVenta = (id, motivo) =>
  apiFetch(`/ventas/${id}/anular`, { method: 'POST', body: JSON.stringify({ motivo }) });

// ── Caja ──────────────────────────────────────────────────────
export const getCajaActual = () => apiFetch('/caja/actual');

export const getSesionesCaja = (limit = 20) => apiFetch(`/caja/sesiones?limit=${limit}`);

export const abrirCaja = (monto_inicial) =>
  apiFetch('/caja/abrir', { method: 'POST', body: JSON.stringify({ monto_inicial }) });

export const cerrarCaja = (monto_contado) =>
  apiFetch('/caja/cerrar', { method: 'POST', body: JSON.stringify({ monto_contado }) });

// ── Usuarios ──────────────────────────────────────────────────
export const getUsuarios = (params = {}) => apiFetch('/usuarios' + qs(params));

export const createUsuario = (data) =>
  apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(data) });

export const updateUsuario = (id, data) =>
  apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const desactivarUsuario = (id) =>
  apiFetch(`/usuarios/${id}`, { method: 'DELETE' });

export const resetPasswordUsuario = (id) =>
  apiFetch(`/usuarios/${id}/reset-password`, { method: 'POST' });

// ── Dashboard / Reportes / Recomendaciones ────────────────────
export const getDashboard = () => apiFetch('/dashboard');

export const getAnalitica = (dias = 30) => apiFetch(`/reportes/analitica?dias=${dias}`);

export const getReporteVentas = (params = {}) => apiFetch('/reportes/ventas' + qs(params));

export const getTopProductos = (params = {}) =>
  apiFetch('/reportes/productos/top-ventas' + qs(params));

export const getGananciaBruta = (params = {}) =>
  apiFetch('/reportes/ganancia-bruta' + qs(params));

export const compartirVentasPDF = (params = {}) =>
  descargarYCompartir('/reportes/ventas/pdf' + qs(params), 'reporte_ventas.pdf');

export const compartirVentasCSV = (params = {}) =>
  descargarYCompartir('/reportes/ventas/exportar' + qs(params), 'ventas.csv');

export const compartirInventarioCSV = () =>
  descargarYCompartir('/reportes/inventario/exportar', 'inventario.csv');

export const getRecomendaciones = (estado = 'pendiente') =>
  apiFetch(`/recomendaciones?estado=${estado}`);

export const generarRecomendaciones = () =>
  apiFetch('/recomendaciones/generar', { method: 'POST' });

export const updateRecomendacion = (id, estado) =>
  apiFetch(`/recomendaciones/${id}`, { method: 'PUT', body: JSON.stringify({ estado }) });

// ── Config ───────────────────────────────────────────────────
export const setApiUrl = async (url) => {
  await AsyncStorage.setItem('api_url', url.replace(/\/$/, ''));
};
export const getApiUrl = getBaseUrl;
