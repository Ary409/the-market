/**
 * db.js — Base de datos SQLite local para modo offline.
 * Tablas:
 *   productos_cache   → copia local del catálogo
 *   clientes_cache    → copia local de clientes (para fiar sin conexión)
 *   ventas_pendientes → ventas realizadas sin conexión
 *   items_pendientes  → líneas de esas ventas
 */

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('themarket.db');

// ── Inicialización ────────────────────────────────────────────────────────────

export async function initDB() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS productos_cache (
      id           INTEGER PRIMARY KEY,
      codigo       TEXT    DEFAULT '',
      nombre       TEXT    NOT NULL,
      precio_venta REAL    NOT NULL,
      stock        INTEGER DEFAULT 0,
      categoria    TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS clientes_cache (
      id       INTEGER PRIMARY KEY,
      nombre   TEXT NOT NULL,
      telefono TEXT DEFAULT '',
      saldo    REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ventas_pendientes (
      local_id       TEXT PRIMARY KEY,
      metodo_pago    TEXT NOT NULL,
      monto_recibido REAL NOT NULL,
      total          REAL NOT NULL,
      created_at     TEXT DEFAULT (datetime('now')),
      synced         INTEGER DEFAULT 0,
      sync_error     TEXT
    );

    CREATE TABLE IF NOT EXISTS items_pendientes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_local_id  TEXT NOT NULL,
      producto_id     INTEGER NOT NULL,
      producto_nombre TEXT NOT NULL,
      cantidad        INTEGER NOT NULL,
      precio_unitario REAL NOT NULL
    );
  `);

  // Migración suave: columna cliente_id para fiados offline (instalaciones previas)
  try {
    await db.execAsync('ALTER TABLE ventas_pendientes ADD COLUMN cliente_id INTEGER');
  } catch {}
  try {
    await db.execAsync("ALTER TABLE ventas_pendientes ADD COLUMN cliente_nombre TEXT DEFAULT ''");
  } catch {}

  // ── Trabajo sin conexión completo ───────────────────────────────────────
  await db.execAsync(`
    -- Espejo de lectura: última copia conocida de cada vista del sistema
    CREATE TABLE IF NOT EXISTS espejo (
      clave       TEXT PRIMARY KEY,
      json        TEXT NOT NULL,
      actualizado TEXT NOT NULL
    );

    -- Cola de salida: acciones hechas sin conexión, en el orden en que ocurrieron
    -- tipo: abono | abrir_caja | cerrar_caja | cliente_nuevo
    CREATE TABLE IF NOT EXISTS cola_acciones (
      local_id   TEXT PRIMARY KEY,
      tipo       TEXT NOT NULL,
      payload    TEXT NOT NULL,
      etiqueta   TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      synced     INTEGER DEFAULT 0,
      error      TEXT
    );

    -- Ventas del día bajadas del servidor (para el historial sin conexión)
    CREATE TABLE IF NOT EXISTS ventas_cache (
      id            INTEGER PRIMARY KEY,
      numero_recibo TEXT,
      fecha         TEXT,
      total         REAL,
      metodo_pago   TEXT,
      estado        TEXT,
      vendedor      TEXT,
      cliente       TEXT
    );
  `);

  // Las ventas también necesitan orden respecto a las demás acciones
  try {
    await db.execAsync("ALTER TABLE ventas_pendientes ADD COLUMN ocurrido_en TEXT DEFAULT ''");
  } catch {}

  // Datos que hacen falta para calcular las alertas de stock sin conexión
  try { await db.execAsync('ALTER TABLE productos_cache ADD COLUMN stock_minimo REAL DEFAULT 0'); } catch {}
  try { await db.execAsync("ALTER TABLE productos_cache ADD COLUMN vence TEXT DEFAULT ''"); } catch {}
  try { await db.execAsync("ALTER TABLE productos_cache ADD COLUMN unidad TEXT DEFAULT 'unidad'"); } catch {}
}

// ── Espejo de lectura ─────────────────────────────────────────────────────────

export async function guardarEspejo(clave, datos) {
  await db.runAsync(
    'INSERT OR REPLACE INTO espejo (clave, json, actualizado) VALUES (?, ?, ?)',
    [clave, JSON.stringify(datos), new Date().toISOString()]
  );
}

export async function leerEspejo(clave) {
  const row = await db.getFirstAsync('SELECT json, actualizado FROM espejo WHERE clave = ?', [clave]);
  if (!row) return null;
  try {
    return { datos: JSON.parse(row.json), actualizado: row.actualizado };
  } catch {
    return null;
  }
}

// ── Cola de acciones (lo que se hizo sin conexión) ────────────────────────────

export async function encolarAccion(tipo, payload, etiqueta = '') {
  const localId = `${tipo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.runAsync(
    'INSERT INTO cola_acciones (local_id, tipo, payload, etiqueta, created_at) VALUES (?, ?, ?, ?, ?)',
    [localId, tipo, JSON.stringify(payload), etiqueta, new Date().toISOString()]
  );
  return localId;
}

export async function getAccionesPendientes() {
  const filas = await db.getAllAsync(
    'SELECT * FROM cola_acciones WHERE synced = 0 ORDER BY created_at ASC'
  );
  return filas.map(f => ({ ...f, payload: JSON.parse(f.payload) }));
}

export async function marcarAccionSincronizada(localId) {
  await db.runAsync('UPDATE cola_acciones SET synced = 1, error = NULL WHERE local_id = ?', [localId]);
}

export async function marcarAccionFallida(localId, error) {
  await db.runAsync('UPDATE cola_acciones SET error = ? WHERE local_id = ?', [String(error), localId]);
}

export async function getAccionesPendientesCount() {
  const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM cola_acciones WHERE synced = 0');
  return row?.cnt ?? 0;
}

/** Abonos en cola de un cliente (para descontarlos del saldo mostrado). */
export async function getAbonosPendientesDe(clienteId) {
  const filas = await db.getAllAsync(
    "SELECT payload FROM cola_acciones WHERE synced = 0 AND tipo = 'abono'"
  );
  let total = 0;
  for (const f of filas) {
    try {
      const p = JSON.parse(f.payload);
      if (Number(p.cliente_id) === Number(clienteId)) total += Number(p.monto) || 0;
    } catch {}
  }
  return total;
}

/** Fiados en cola de un cliente (para sumarlos al saldo mostrado). */
export async function getFiadosPendientesDe(clienteId) {
  const filas = await db.getAllAsync(
    'SELECT total, cliente_id FROM ventas_pendientes WHERE synced = 0 AND cliente_id = ?',
    [clienteId]
  );
  return filas.reduce((s, f) => s + (Number(f.total) || 0), 0);
}

// ── Ventas del día (historial sin conexión) ───────────────────────────────────

export async function cacheVentas(ventas) {
  await db.execAsync('BEGIN');
  try {
    await db.runAsync('DELETE FROM ventas_cache');
    for (const v of ventas) {
      await db.runAsync(
        'INSERT INTO ventas_cache (id, numero_recibo, fecha, total, metodo_pago, estado, vendedor, cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [v.id, v.numero_recibo, v.fecha, Number(v.total) || 0, v.metodo_pago,
         v.estado || 'completada', v.vendedor || '', v.cliente || '']
      );
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function getVentasCache() {
  return db.getAllAsync('SELECT * FROM ventas_cache ORDER BY fecha DESC');
}

/**
 * Ventas de hoy vistas desde el teléfono: las que ya están en el servidor
 * más las que se hicieron sin conexión y aún no se han subido.
 */
export async function getVentasDelDiaLocal() {
  const [delServidor, pendientes] = await Promise.all([
    getVentasCache(),
    db.getAllAsync('SELECT * FROM ventas_pendientes WHERE synced = 0 ORDER BY created_at DESC'),
  ]);
  const locales = pendientes.map(v => ({
    id: v.local_id,
    numero_recibo: 'PENDIENTE',
    fecha: v.ocurrido_en || v.created_at,
    total: Number(v.total) || 0,
    metodo_pago: v.metodo_pago,
    estado: 'completada',
    vendedor: '',
    cliente: v.cliente_nombre || '',
    pendiente: true,
  }));
  return [...locales, ...delServidor];
}

// ── Caché de productos ────────────────────────────────────────────────────────

export async function cacheProducts(productos) {
  if (!productos || !productos.length) return;
  // Usar transacción para insertar todo de una — mucho más rápido con muchos productos
  await db.execAsync('BEGIN');
  try {
    await db.runAsync('DELETE FROM productos_cache');
    for (const p of productos) {
      await db.runAsync(
        'INSERT INTO productos_cache (id, codigo, nombre, precio_venta, stock, categoria, stock_minimo, vence, unidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        // OJO: el API expone el código como `codigo_barras`
        [p.id, p.codigo_barras || p.codigo || '', p.nombre, p.precio_venta, p.stock ?? 0,
         p.categoria?.nombre || '', p.stock_minimo ?? 0, p.fecha_vencimiento || '', p.unidad_medida || 'unidad']
      );
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function searchCachedProducts(query) {
  const q = `%${query.trim()}%`;
  return db.getAllAsync(
    'SELECT * FROM productos_cache WHERE (nombre LIKE ? OR codigo LIKE ?) LIMIT 10',
    [q, q]
  );
}

export async function getCachedProductByBarcode(codigo) {
  return db.getFirstAsync(
    'SELECT * FROM productos_cache WHERE codigo = ? LIMIT 1',
    [codigo]
  );
}

export async function updateCachedStock(productoId, delta) {
  await db.runAsync(
    'UPDATE productos_cache SET stock = MAX(0, stock + ?) WHERE id = ?',
    [delta, productoId]
  );
}

/** Alertas calculadas desde la copia local: sirven con y sin conexión. */
export async function getAlertasLocal() {
  const bajos = await db.getAllAsync(
    'SELECT * FROM productos_cache WHERE stock <= stock_minimo ORDER BY stock ASC'
  );
  const limite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const porVencer = await db.getAllAsync(
    "SELECT * FROM productos_cache WHERE vence != '' AND vence <= ? ORDER BY vence ASC",
    [limite]
  );
  return { stockBajo: bajos, porVencer };
}

export async function getCachedProductCount() {
  const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM productos_cache');
  return row?.cnt ?? 0;
}

// ── Caché de clientes (para fiado offline) ────────────────────────────────────

export async function cacheClientes(clientes) {
  if (!clientes || !clientes.length) return;
  await db.execAsync('BEGIN');
  try {
    await db.runAsync('DELETE FROM clientes_cache');
    for (const c of clientes) {
      await db.runAsync(
        'INSERT INTO clientes_cache (id, nombre, telefono, saldo) VALUES (?, ?, ?, ?)',
        [c.id, c.nombre, c.telefono || '', c.saldo ?? 0]
      );
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function getCachedClienteCount() {
  const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM clientes_cache');
  return row?.cnt ?? 0;
}

export async function searchCachedClientes(query) {
  const q = `%${(query || '').trim()}%`;
  return db.getAllAsync(
    'SELECT * FROM clientes_cache WHERE (nombre LIKE ? OR telefono LIKE ?) ORDER BY nombre LIMIT 15',
    [q, q]
  );
}

// ── Cola de ventas offline ────────────────────────────────────────────────────

export async function queueSale(sale) {
  const localId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.runAsync(
    'INSERT INTO ventas_pendientes (local_id, metodo_pago, monto_recibido, total, cliente_id, cliente_nombre, ocurrido_en) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [localId, sale.metodo_pago, sale.monto_recibido ?? 0, sale.total, sale.cliente_id ?? null,
     sale.cliente_nombre || '', new Date().toISOString()]
  );
  for (const item of sale.items) {
    await db.runAsync(
      'INSERT INTO items_pendientes (venta_local_id, producto_id, producto_nombre, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
      [localId, item.producto_id, item.nombre || '', item.cantidad, item.precio_unitario]
    );
  }
  return localId;
}

export async function getPendingSales() {
  const ventas = await db.getAllAsync(
    'SELECT * FROM ventas_pendientes WHERE synced = 0 ORDER BY created_at ASC'
  );
  for (const v of ventas) {
    v.items = await db.getAllAsync(
      'SELECT * FROM items_pendientes WHERE venta_local_id = ?',
      [v.local_id]
    );
  }
  return ventas;
}

export async function getPendingCount() {
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) as cnt FROM ventas_pendientes WHERE synced = 0'
  );
  return row?.cnt ?? 0;
}

export async function markSaleSynced(localId) {
  await db.runAsync(
    'UPDATE ventas_pendientes SET synced = 1, sync_error = NULL WHERE local_id = ?',
    [localId]
  );
}

export async function markSaleFailed(localId, errorMsg) {
  await db.runAsync(
    'UPDATE ventas_pendientes SET sync_error = ? WHERE local_id = ?',
    [String(errorMsg), localId]
  );
}
