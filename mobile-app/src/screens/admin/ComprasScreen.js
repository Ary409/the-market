/**
 * ComprasScreen — Órdenes de compra a proveedores desde el celular.
 * Armar el pedido caminando entre los estantes, compartir el PDF al repartidor
 * (carta o ticket térmico) y marcarlo recibido para que el stock suba solo.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  Screen, SearchBar, Field, Picker, Btn, Row, Sheet, Empty, Cargando, ErrorBox,
  Seccion, fmt, fmtCant, fmtFecha, colors, Icon, HIT,
} from '../../components/ui';
import * as API from '../../api';

const ESTADO_COLOR = {
  pendiente: colors.warning,
  recibida:  colors.success,
  cancelada: colors.fgMuted,
};

export default function ComprasScreen({ navigation }) {
  const [ordenes,  setOrdenes]  = useState([]);
  const [filtro,   setFiltro]   = useState('');
  const [cargando, setCargando] = useState(true);
  const [nueva,    setNueva]    = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.getCompras({ estado: filtro || undefined, per_page: 50 });
      setOrdenes(res.items || []);
    } catch { setOrdenes([]); }
    finally { setCargando(false); }
  }, [filtro]);

  React.useEffect(() => { cargar(); }, [cargar]);

  async function compartirPDF(orden) {
    Alert.alert('Compartir orden', `OC-${String(orden.id).padStart(4, '0')} — elige el formato`, [
      {
        text: 'Hoja carta (repartidor)',
        onPress: () => API.compartirOrdenPDF(orden.id, 'carta').catch(e => Alert.alert('Error', e.message)),
      },
      {
        text: 'Ticket térmico 80mm',
        onPress: () => API.compartirOrdenPDF(orden.id, 'ticket').catch(e => Alert.alert('Error', e.message)),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function recibir(orden) {
    Alert.alert(
      'Confirmar recepción',
      `¿Ya llegó la mercadería de OC-${String(orden.id).padStart(4, '0')}?\n\nEl stock de ${orden.detalles?.length ?? 0} producto(s) subirá automáticamente.`,
      [
        { text: 'Todavía no', style: 'cancel' },
        {
          text: 'Sí, recibí todo',
          onPress: async () => {
            try {
              await API.recibirCompra(orden.id);
              Alert.alert('Listo', 'El inventario ya se actualizó.');
              cargar();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ],
    );
  }

  function cancelar(orden) {
    Alert.alert('Cancelar orden', 'La orden queda en el historial marcada como cancelada.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive',
        onPress: async () => {
          try { await API.cancelarCompra(orden.id); cargar(); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  function acciones(orden) {
    const opciones = [{ text: 'Compartir PDF', onPress: () => compartirPDF(orden) }];
    if (orden.estado === 'pendiente') {
      opciones.push({ text: 'Marcar como recibida', onPress: () => recibir(orden) });
      opciones.push({ text: 'Cancelar orden', style: 'destructive', onPress: () => cancelar(orden) });
    }
    opciones.push({ text: 'Cerrar', style: 'cancel' });
    const detalle = (orden.detalles || [])
      .map(d => `${fmtCant(d.cantidad)}× ${d.producto?.nombre || '#' + d.producto_id}`)
      .join('\n');
    Alert.alert(
      `OC-${String(orden.id).padStart(4, '0')} · ${orden.proveedor?.nombre || '—'}`,
      `${detalle || 'Sin productos'}\n\nTotal: ${fmt(orden.total)}`,
      opciones,
    );
  }

  return (
    <Screen
      title="Compras"
      onBack={navigation ? () => navigation.goBack() : undefined}
      right={
        <TouchableOpacity onPress={() => setNueva(true)} hitSlop={HIT}>
          <Icon name="plus" size={20} color={colors.ink100} />
        </TouchableOpacity>
      }
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Picker value={filtro} onChange={setFiltro} options={[
          { value: '',          label: 'Todas' },
          { value: 'pendiente', label: 'Pendientes' },
          { value: 'recibida',  label: 'Recibidas' },
          { value: 'cancelada', label: 'Canceladas' },
        ]} />
      </View>

      {cargando && ordenes.length === 0 ? <Cargando /> : (
        <FlatList
          data={ordenes}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          renderItem={({ item }) => (
            <Row
              titulo={`OC-${String(item.id).padStart(4, '0')} · ${item.proveedor?.nombre || '—'}`}
              sub={`${fmtFecha(item.fecha)} · ${item.detalles?.length ?? 0} producto(s)`}
              badge={item.estado}
              badgeColor={ESTADO_COLOR[item.estado]}
              derecha={fmt(item.total)}
              onPress={() => acciones(item)}
            />
          )}
          ListEmptyComponent={<Empty icon="shopping-cart" titulo="Sin órdenes"
            texto="Crea un pedido con el botón + para llevárselo al proveedor" />}
          refreshing={cargando}
          onRefresh={cargar}
        />
      )}

      <NuevaOrdenSheet visible={nueva} onClose={() => setNueva(false)}
        onCreated={() => { setNueva(false); cargar(); }} />
    </Screen>
  );
}

// ── Crear orden ──────────────────────────────────────────────────────────────

function NuevaOrdenSheet({ visible, onClose, onCreated }) {
  const [proveedores, setProveedores] = useState([]);
  const [provId,      setProvId]      = useState('');
  const [items,       setItems]       = useState([]);      // { producto, cantidad, precio }
  const [query,       setQuery]       = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [notas,       setNotas]       = useState('');
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setItems([]); setQuery(''); setSugerencias([]); setNotas(''); setError('');
    API.getProveedores({ per_page: 200 })
      .then(r => {
        const lista = r.items || [];
        setProveedores(lista);
        if (lista.length) setProvId(String(lista[0].id));
      })
      .catch(e => setError('No se pudieron cargar los proveedores: ' + e.message));
  }, [visible]);

  React.useEffect(() => {
    if (!visible || !query.trim()) { setSugerencias([]); return; }
    const t = setTimeout(() => {
      API.getProductos({ q: query, per_page: 8 })
        .then(r => setSugerencias(r.items || []))
        .catch(() => setSugerencias([]));
    }, 260);
    return () => clearTimeout(t);
  }, [query, visible]);

  function agregar(p) {
    setItems(prev => prev.some(i => i.producto.id === p.id)
      ? prev
      : [...prev, { producto: p, cantidad: '1', precio: String(p.precio_compra ?? 0) }]);
    setQuery('');
    setSugerencias([]);
  }

  const upd = (id, k, v) => setItems(prev => prev.map(i => i.producto.id === id ? { ...i, [k]: v } : i));

  const total = items.reduce((a, b) => a + (parseFloat(b.cantidad) || 0) * (parseFloat(b.precio) || 0), 0);

  async function crear() {
    const validos = items.filter(i => parseFloat(i.cantidad) > 0);
    if (!provId)          { setError('Elige el proveedor'); return; }
    if (!validos.length)  { setError('Agrega al menos un producto'); return; }
    setBusy(true);
    try {
      const orden = await API.createCompra({
        proveedor_id: parseInt(provId),
        notas: notas.trim() || undefined,
        items: validos.map(i => ({
          producto_id: i.producto.id,
          cantidad: parseFloat(i.cantidad),
          precio_unitario: parseFloat(i.precio) || 0,
        })),
      });
      onCreated();
      Alert.alert(
        `Orden OC-${String(orden.id).padStart(4, '0')} creada`,
        '¿Compartir el PDF ahora para dárselo al repartidor?',
        [
          { text: 'Después', style: 'cancel' },
          { text: 'Hoja carta', onPress: () => API.compartirOrdenPDF(orden.id, 'carta').catch(e => Alert.alert('Error', e.message)) },
          { text: 'Ticket', onPress: () => API.compartirOrdenPDF(orden.id, 'ticket').catch(e => Alert.alert('Error', e.message)) },
        ],
      );
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} title="Nuevo pedido" sub="Elige proveedor y productos del inventario"
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.6} onPress={crear} busy={busy}>
          {total > 0 ? `Crear · ${fmt(total)}` : 'Crear orden'}
        </Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>

      <Picker label="Proveedor" value={provId} onChange={setProvId}
        options={proveedores.length
          ? proveedores.map(p => ({ value: String(p.id), label: p.nombre }))
          : [{ value: '', label: 'Sin proveedores — créalos primero' }]} />

      <Seccion>Productos del inventario</Seccion>
      <Field label="Buscar producto" value={query} onChange={setQuery} placeholder="Nombre, código o SKU…" />

      {sugerencias.map(p => (
        <TouchableOpacity key={p.id} style={s.sugerencia} onPress={() => agregar(p)} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <Text style={s.sugNombre}>{p.nombre}</Text>
            <Text style={s.sugSub}>stock {fmtCant(p.stock)} · compra {fmt(p.precio_compra)}</Text>
          </View>
          <Icon name="plus" size={16} color={colors.ink100} />
        </TouchableOpacity>
      ))}

      {items.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioText}>
            Busca arriba los productos que vas a pedir. Al marcar la orden como recibida, el stock sube solo.
          </Text>
        </View>
      ) : items.map(it => (
        <View key={it.producto.id} style={s.item}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.itemNombre} numberOfLines={1}>{it.producto.nombre}</Text>
            <TouchableOpacity onPress={() => setItems(items.filter(x => x.producto.id !== it.producto.id))} hitSlop={HIT}>
              <Icon name="x" size={15} color={colors.fgMuted} />
            </TouchableOpacity>
          </View>
          <Text style={s.itemStock}>En tienda: {fmtCant(it.producto.stock)} {it.producto.unidad_medida}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Cantidad" value={it.cantidad} onChange={v => upd(it.producto.id, 'cantidad', v)} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Precio compra" value={it.precio} onChange={v => upd(it.producto.id, 'precio', v)} prefix="L" keyboardType="decimal-pad" />
            </View>
          </View>
          <Text style={s.itemSubtotal}>
            Subtotal: {fmt((parseFloat(it.cantidad) || 0) * (parseFloat(it.precio) || 0))}
          </Text>
        </View>
      ))}

      <Field label="Notas para el proveedor" value={notas} onChange={setNotas}
        placeholder="Ej. entregar antes del viernes" multiline />
    </Sheet>
  );
}

const s = StyleSheet.create({
  sugerencia: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: colors.paper,
  },
  sugNombre: { fontSize: 14, fontWeight: '600', color: colors.ink100 },
  sugSub:    { fontSize: 12, color: colors.fgMuted, marginTop: 1 },
  vacio: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong,
    borderRadius: 10, padding: 18, marginBottom: 12,
  },
  vacioText: { fontSize: 13, color: colors.fgMuted, textAlign: 'center' },
  item: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  itemNombre:   { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink100 },
  itemStock:    { fontSize: 11, color: colors.fgMuted, marginBottom: 8 },
  itemSubtotal: { fontSize: 12, fontWeight: '600', color: colors.ink100, textAlign: 'right' },
});
