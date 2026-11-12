/**
 * InventarioScreen — Catálogo completo desde el celular (solo admin).
 * Crear/editar productos, ajustar stock, registrar salidas y gestionar categorías.
 * El stock nunca se edita directo: siempre por movimiento (igual que en la PC).
 */
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  Screen, SearchBar, Field, Picker, Btn, Row, Sheet, Empty, Cargando, ErrorBox,
  Seccion, fmt, fmtCant, colors, Icon, HIT, Confirmar, Aviso, useAviso,
} from '../../components/ui';
import BarcodeScanner from '../../components/BarcodeScanner';
import * as API from '../../api';

const UNIDADES = ['unidad', 'kg', 'g', 'lt', 'ml', 'paquete', 'caja'];

export default function InventarioScreen({ navigation }) {
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [query,       setQuery]       = useState('');
  const [cargando,    setCargando]    = useState(true);
  const [scanBuscar,  setScanBuscar]  = useState(false);

  const [editando,  setEditando]  = useState(null);   // producto | 'nuevo'
  const [ajustando, setAjustando] = useState(null);
  const [saliendo,  setSaliendo]  = useState(null);
  const [verCats,   setVerCats]   = useState(false);
  const [borrando,  setBorrando]  = useState(null);   // producto a desactivar
  const [busy,      setBusy]      = useState(false);
  const [aviso, mostrarAviso, limpiarAviso] = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.getProductos({ q: query || undefined, per_page: 100 });
      setProductos(res.items || []);
    } catch { setProductos([]); }
    finally { setCargando(false); }
  }, [query]);

  React.useEffect(() => {
    const t = setTimeout(cargar, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar]);

  React.useEffect(() => {
    API.getCategorias().then(r => setCategorias(r.items || [])).catch(() => {});
    API.getProveedores({ per_page: 200 }).then(r => setProveedores(r.items || [])).catch(() => {});
  }, []);

  function recargarCategorias() {
    API.getCategorias().then(r => setCategorias(r.items || [])).catch(() => {});
  }

  async function confirmarDesactivar() {
    setBusy(true);
    try {
      await API.desactivarProducto(borrando.id);
      const nombre = borrando.nombre;
      setBorrando(null);
      mostrarAviso(`"${nombre}" salió del catálogo`);
      cargar();
    } catch (e) {
      setBorrando(null);
      mostrarAviso(e.message, 'error');
    } finally { setBusy(false); }
  }

  function acciones(p) {
    Alert.alert(p.nombre, `Stock: ${fmtCant(p.stock)} ${p.unidad_medida} · Venta ${fmt(p.precio_venta)}`, [
      { text: 'Editar producto', onPress: () => setEditando(p) },
      { text: 'Ajustar stock',   onPress: () => setAjustando(p) },
      { text: 'Registrar salida (merma/pérdida)', onPress: () => setSaliendo(p) },
      { text: 'Desactivar', style: 'destructive', onPress: () => setBorrando(p) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <Screen
      title="Inventario"
      onBack={navigation ? () => navigation.goBack() : undefined}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setVerCats(true)} hitSlop={HIT}>
            <Text style={s.link}>Categorías</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditando('nuevo')} hitSlop={HIT}>
            <Icon name="plus" size={20} color={colors.ink100} />
          </TouchableOpacity>
        </View>
      }
    >
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre, código o SKU…"
        cargando={cargando} onScan={() => setScanBuscar(true)} />

      {cargando && productos.length === 0 ? <Cargando /> : (
        <FlatList
          data={productos}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 10 }}
          renderItem={({ item }) => {
            const agotado = Number(item.stock) <= 0;
            const bajo    = !agotado && Number(item.stock) <= Number(item.stock_minimo);
            return (
              <Row
                titulo={item.nombre}
                sub={`${item.codigo_barras || item.sku || 'sin código'} · compra ${fmt(item.precio_compra)}`}
                badge={agotado ? 'agotado' : bajo ? 'bajo' : undefined}
                badgeColor={agotado ? colors.danger : bajo ? colors.warning : undefined}
                derecha={fmt(item.precio_venta)}
                subDerecha={`${fmtCant(item.stock)} ${item.unidad_medida}`}
                onPress={() => acciones(item)}
              />
            );
          }}
          ListEmptyComponent={<Empty titulo="Sin productos" texto={query ? `Nada coincide con "${query}"` : 'Agrega tu primer producto con el botón +'} />}
          refreshing={cargando}
          onRefresh={cargar}
        />
      )}

      <BarcodeScanner visible={scanBuscar} onClose={() => setScanBuscar(false)}
        onScanned={c => { setScanBuscar(false); setQuery(c); }} />

      <ProductoSheet
        producto={editando}
        categorias={categorias}
        proveedores={proveedores}
        onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); mostrarAviso('Producto guardado'); cargar(); }}
      />

      <AjusteSheet producto={ajustando} onClose={() => setAjustando(null)}
        onSaved={() => { setAjustando(null); mostrarAviso('Stock ajustado'); cargar(); }} />

      <SalidaSheet producto={saliendo} onClose={() => setSaliendo(null)}
        onSaved={() => { setSaliendo(null); mostrarAviso('Salida registrada'); cargar(); }} />

      <CategoriasSheet visible={verCats} categorias={categorias}
        onClose={() => setVerCats(false)} onChanged={recargarCategorias} />

      <Confirmar
        visible={!!borrando}
        peligro
        titulo="Quitar del catálogo"
        mensaje={borrando
          ? `"${borrando.nombre}" dejará de aparecer al vender. Su historial de ventas y movimientos se conserva.`
          : ''}
        textoConfirmar="Sí, quitar"
        busy={busy}
        onConfirmar={confirmarDesactivar}
        onCancelar={() => setBorrando(null)}
      />

      <Aviso texto={aviso.texto} tipo={aviso.tipo} onFin={limpiarAviso} />
    </Screen>
  );
}

// ── Alta / edición de producto ───────────────────────────────────────────────

function ProductoSheet({ producto, categorias, proveedores, onClose, onSaved }) {
  const visible = !!producto;
  const esNuevo = producto === 'nuevo';
  const vacio = {
    nombre: '', codigo_barras: '', sku: '', unidad_medida: 'unidad',
    precio_compra: '', precio_venta: '', precio_mayoreo: '', cantidad_mayoreo: '',
    stock: '', stock_minimo: '5', categoria_id: '', proveedor_id: '',
  };
  const [d, setD]         = useState(vacio);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [scan, setScan]   = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setError('');
    setD(esNuevo ? vacio : {
      nombre: producto.nombre,
      codigo_barras: producto.codigo_barras || '',
      sku: producto.sku || '',
      unidad_medida: producto.unidad_medida || 'unidad',
      precio_compra: String(producto.precio_compra ?? ''),
      precio_venta: String(producto.precio_venta ?? ''),
      precio_mayoreo: producto.precio_mayoreo != null ? String(producto.precio_mayoreo) : '',
      cantidad_mayoreo: producto.cantidad_mayoreo != null ? String(producto.cantidad_mayoreo) : '',
      stock: String(producto.stock ?? ''),
      stock_minimo: String(producto.stock_minimo ?? '5'),
      categoria_id: producto.categoria_id ? String(producto.categoria_id) : '',
      proveedor_id: producto.proveedor_id ? String(producto.proveedor_id) : '',
    });
  }, [visible, producto]);

  const set = (k, v) => { setD(p => ({ ...p, [k]: v })); setError(''); };

  async function guardar() {
    if (!d.nombre.trim())  { setError('El nombre es obligatorio'); return; }
    if (!d.precio_venta)   { setError('El precio de venta es obligatorio'); return; }
    setBusy(true);
    try {
      const payload = {
        nombre: d.nombre.trim(),
        codigo_barras: d.codigo_barras.trim() || null,
        sku: d.sku.trim() || null,
        unidad_medida: d.unidad_medida,
        precio_compra: parseFloat(d.precio_compra) || 0,
        precio_venta: parseFloat(d.precio_venta),
        precio_mayoreo: d.precio_mayoreo ? parseFloat(d.precio_mayoreo) : null,
        cantidad_mayoreo: d.cantidad_mayoreo ? parseFloat(d.cantidad_mayoreo) : null,
        stock_minimo: parseFloat(d.stock_minimo) || 0,
        categoria_id: d.categoria_id ? parseInt(d.categoria_id) : null,
        proveedor_id: d.proveedor_id ? parseInt(d.proveedor_id) : null,
      };
      if (esNuevo) {
        payload.stock = parseFloat(d.stock) || 0;   // se registra como "Inventario inicial"
        await API.createProducto(payload);
      } else {
        await API.updateProducto(producto.id, payload);
      }
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet
      visible={visible}
      title={esNuevo ? 'Nuevo producto' : 'Editar producto'}
      sub={esNuevo ? 'Se agrega al catálogo' : producto?.nombre}
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} onPress={guardar} busy={busy}>{esNuevo ? 'Crear' : 'Guardar'}</Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>

      <Field label="Nombre" value={d.nombre} onChange={v => set('nombre', v)} placeholder="Ej. Coca-Cola 600ml" autoFocus={esNuevo} />

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Código de barras" value={d.codigo_barras} onChange={v => set('codigo_barras', v)} placeholder="Escanea o escribe" />
        </View>
        <TouchableOpacity style={s.scanInline} onPress={() => setScan(true)} activeOpacity={0.8}>
          <Icon name="scan-barcode" size={20} color={colors.ink100} />
        </TouchableOpacity>
      </View>

      <Field label="SKU (código interno)" value={d.sku} onChange={v => set('sku', v)} placeholder="Opcional" />

      <Picker label="Unidad de medida" value={d.unidad_medida} onChange={v => set('unidad_medida', v)}
        options={UNIDADES.map(x => ({ value: x, label: x }))} />

      <Field label="Precio de compra" value={d.precio_compra} onChange={v => set('precio_compra', v)} prefix="L" keyboardType="decimal-pad" />
      <Field label="Precio de venta"  value={d.precio_venta}  onChange={v => set('precio_venta', v)}  prefix="L" keyboardType="decimal-pad" />

      <Seccion>Mayoreo (opcional)</Seccion>
      <Field label="Precio de mayoreo" value={d.precio_mayoreo} onChange={v => set('precio_mayoreo', v)} prefix="L" keyboardType="decimal-pad" />
      <Field label="A partir de qué cantidad" value={d.cantidad_mayoreo} onChange={v => set('cantidad_mayoreo', v)} keyboardType="decimal-pad"
        help="Al vender esta cantidad o más se cobra el precio de mayoreo" />

      <Seccion>Existencias</Seccion>
      {esNuevo
        ? <Field label="Stock inicial" value={d.stock} onChange={v => set('stock', v)} keyboardType="decimal-pad"
            help="Se registra como movimiento «Inventario inicial»" />
        : <Field label="Stock actual" value={d.stock} editable={false}
            help="El stock solo cambia con ajustes, ventas, compras o salidas" />}
      <Field label="Stock mínimo" value={d.stock_minimo} onChange={v => set('stock_minimo', v)} keyboardType="decimal-pad"
        help="Debajo de este número el sistema te avisa" />

      <Seccion>Clasificación</Seccion>
      <Picker label="Categoría" value={d.categoria_id} onChange={v => set('categoria_id', v)}
        options={[{ value: '', label: 'Sin categoría' }, ...categorias.map(c => ({ value: String(c.id), label: c.nombre }))]} />
      <Picker label="Proveedor" value={d.proveedor_id} onChange={v => set('proveedor_id', v)}
        options={[{ value: '', label: 'Sin proveedor' }, ...proveedores.map(p => ({ value: String(p.id), label: p.nombre }))]} />

      <BarcodeScanner visible={scan} onClose={() => setScan(false)}
        onScanned={c => { setScan(false); set('codigo_barras', c); }} />
    </Sheet>
  );
}

// ── Ajuste de stock ──────────────────────────────────────────────────────────

function AjusteSheet({ producto, onClose, onSaved }) {
  const visible = !!producto;
  const [nuevo,  setNuevo]  = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState('');

  React.useEffect(() => {
    if (visible) { setNuevo(String(producto.stock)); setMotivo(''); setError(''); }
  }, [visible, producto]);

  const dif = visible && nuevo !== '' ? parseFloat(nuevo) - Number(producto.stock) : null;

  async function guardar() {
    const n = parseFloat(nuevo);
    if (isNaN(n) || n < 0)            { setError('Indica un stock válido'); return; }
    if (n === Number(producto.stock)) { setError('El stock nuevo es igual al actual'); return; }
    if (!motivo.trim())               { setError('El motivo es obligatorio — queda en el historial'); return; }
    setBusy(true);
    try {
      await API.ajustarStock({ producto_id: producto.id, stock_nuevo: n, motivo: motivo.trim() });
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} title="Ajustar stock" sub={producto ? `${producto.nombre} — hoy: ${fmtCant(producto.stock)}` : ''}
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} onPress={guardar} busy={busy}>Registrar ajuste</Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>
      <Field label="Stock nuevo (conteo físico)" value={nuevo} onChange={v => { setNuevo(v); setError(''); }}
        keyboardType="decimal-pad" autoFocus
        help={dif !== null && !isNaN(dif) && dif !== 0
          ? (dif > 0 ? `Se registrará una entrada de +${fmtCant(dif)}` : `Se registrará una salida de ${fmtCant(dif)}`)
          : null} />
      <Field label="Motivo" value={motivo} onChange={v => { setMotivo(v); setError(''); }}
        placeholder="Ej. conteo físico, corrección…" multiline
        help="Obligatorio — queda en el historial de movimientos" />
    </Sheet>
  );
}

// ── Salidas: pérdida / merma / vencimiento ───────────────────────────────────

function SalidaSheet({ producto, onClose, onSaved }) {
  const visible = !!producto;
  const [tipo,     setTipo]     = useState('merma');
  const [cantidad, setCantidad] = useState('');
  const [motivo,   setMotivo]   = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');

  React.useEffect(() => {
    if (visible) { setTipo('merma'); setCantidad(''); setMotivo(''); setError(''); }
  }, [visible, producto]);

  async function guardar() {
    const c = parseFloat(cantidad);
    if (isNaN(c) || c <= 0) { setError('Indica cuánto sale del inventario'); return; }
    if (!motivo.trim())     { setError('El motivo es obligatorio'); return; }
    setBusy(true);
    try {
      await API.registrarSalida({ producto_id: producto.id, tipo, cantidad: c, motivo: motivo.trim() });
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} title="Registrar salida" sub={producto ? `${producto.nombre} — hoy: ${fmtCant(producto.stock)}` : ''}
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} variant="danger" onPress={guardar} busy={busy}>Descontar</Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>
      <Picker label="Tipo de salida" value={tipo} onChange={setTipo} options={[
        { value: 'merma',       label: 'Merma (dañado)' },
        { value: 'perdida',     label: 'Pérdida (robo)' },
        { value: 'vencimiento', label: 'Vencido' },
      ]} />
      <Field label="Cantidad que sale" value={cantidad} onChange={v => { setCantidad(v); setError(''); }}
        keyboardType="decimal-pad" autoFocus />
      <Field label="Motivo" value={motivo} onChange={v => { setMotivo(v); setError(''); }}
        placeholder="Ej. se cayó la caja, producto vencido…" multiline
        help="Obligatorio — auditoría necesita poder explicar la salida" />
    </Sheet>
  );
}

// ── Categorías ───────────────────────────────────────────────────────────────

function CategoriasSheet({ visible, categorias, onClose, onChanged }) {
  const [nombre, setNombre] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState('');

  React.useEffect(() => { if (visible) { setNombre(''); setError(''); } }, [visible]);

  async function agregar() {
    if (!nombre.trim()) { setError('Escribe el nombre'); return; }
    setBusy(true);
    try { await API.createCategoria({ nombre: nombre.trim() }); setNombre(''); onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function eliminar(c) {
    Alert.alert('Eliminar categoría', `¿Eliminar "${c.nombre}"? Los productos quedarán sin categoría.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await API.deleteCategoria(c.id); onChanged(); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  return (
    <Sheet visible={visible} title="Categorías" sub="Agrega o elimina categorías" onClose={onClose}
      footer={<Btn variant="secondary" flex={1} onPress={onClose}>Cerrar</Btn>}
    >
      <ErrorBox>{error}</ErrorBox>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Nueva categoría" value={nombre} onChange={v => { setNombre(v); setError(''); }} placeholder="Ej. Abarrotes" />
        </View>
        <View style={{ marginTop: 22 }}>
          <Btn onPress={agregar} busy={busy}>Agregar</Btn>
        </View>
      </View>

      {categorias.length === 0
        ? <Empty icon="package" texto="Sin categorías todavía" />
        : categorias.map(c => (
            <Row key={c.id} titulo={c.nombre}
              derecha={<TouchableOpacity onPress={() => eliminar(c)} hitSlop={HIT}>
                <Icon name="x" size={16} color={colors.danger} />
              </TouchableOpacity>} />
          ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  link: { fontSize: 13, fontWeight: '600', color: colors.ink100 },
  scanInline: {
    width: 46, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
});
