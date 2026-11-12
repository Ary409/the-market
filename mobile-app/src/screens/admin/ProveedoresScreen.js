/**
 * ProveedoresScreen — Proveedores, su estado de cuenta y pagos.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  Screen, SearchBar, Field, Picker, Btn, Row, Sheet, Empty, Cargando, ErrorBox,
  Seccion, Stat, fmt, fmtCant, fmtFecha, colors, Icon, HIT,
} from '../../components/ui';
import * as API from '../../api';

export default function ProveedoresScreen({ navigation }) {
  const [lista,    setLista]    = useState([]);
  const [query,    setQuery]    = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);   // proveedor | 'nuevo'
  const [cuenta,   setCuenta]   = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await API.getProveedores({ search: query || undefined, per_page: 200 });
      setLista(res.items || []);
    } catch { setLista([]); }
    finally { setCargando(false); }
  }, [query]);

  React.useEffect(() => {
    const t = setTimeout(cargar, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar]);

  function acciones(p) {
    Alert.alert(p.nombre, p.telefono || 'Sin teléfono registrado', [
      { text: 'Ver estado de cuenta', onPress: () => abrirCuenta(p) },
      { text: 'Editar datos',         onPress: () => setEditando(p) },
      {
        text: 'Desactivar', style: 'destructive',
        onPress: () => Alert.alert('Desactivar proveedor', `¿Quitar a ${p.nombre} de la lista activa?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar', style: 'destructive',
            onPress: async () => {
              try { await API.desactivarProveedor(p.id); cargar(); }
              catch (e) { Alert.alert('Error', e.message); }
            },
          },
        ]),
      },
      { text: 'Cerrar', style: 'cancel' },
    ]);
  }

  async function abrirCuenta(p) {
    try {
      const ec = await API.getEstadoCuentaProveedor(p.id);
      setCuenta({ proveedor: p, ec });
    } catch (e) { Alert.alert('Error', e.message); }
  }

  return (
    <Screen
      title="Proveedores"
      onBack={navigation ? () => navigation.goBack() : undefined}
      right={
        <TouchableOpacity onPress={() => setEditando('nuevo')} hitSlop={HIT}>
          <Icon name="plus" size={20} color={colors.ink100} />
        </TouchableOpacity>
      }
    >
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar proveedor…" cargando={cargando} />

      {cargando && lista.length === 0 ? <Cargando /> : (
        <FlatList
          data={lista}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 10 }}
          renderItem={({ item }) => (
            <Row
              titulo={item.nombre}
              sub={[item.telefono, item.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              badge={item.activo ? undefined : 'inactivo'}
              onPress={() => acciones(item)}
            />
          )}
          ListEmptyComponent={<Empty icon="package" titulo="Sin proveedores"
            texto="Agrégalos con el botón + para poder hacer pedidos" />}
          refreshing={cargando}
          onRefresh={cargar}
        />
      )}

      <ProveedorSheet proveedor={editando} onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); cargar(); }} />

      <CuentaProveedorSheet data={cuenta} onClose={() => setCuenta(null)}
        onPagado={() => { const p = cuenta?.proveedor; setCuenta(null); if (p) abrirCuenta(p); }} />
    </Screen>
  );
}

// ── Alta / edición ───────────────────────────────────────────────────────────

function ProveedorSheet({ proveedor, onClose, onSaved }) {
  const visible = !!proveedor;
  const esNuevo = proveedor === 'nuevo';
  const vacio = { nombre: '', telefono: '', email: '', direccion: '' };
  const [d, setD]         = useState(vacio);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setError('');
    setD(esNuevo ? vacio : {
      nombre: proveedor.nombre,
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
    });
  }, [visible, proveedor]);

  const set = (k, v) => { setD(p => ({ ...p, [k]: v })); setError(''); };

  async function guardar() {
    if (!d.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setBusy(true);
    try {
      const payload = {
        nombre: d.nombre.trim(),
        telefono: d.telefono.trim() || null,
        email: d.email.trim() || null,
        direccion: d.direccion.trim() || null,
      };
      if (esNuevo) await API.createProveedor(payload);
      else         await API.updateProveedor(proveedor.id, payload);
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} title={esNuevo ? 'Nuevo proveedor' : 'Editar proveedor'}
      sub={esNuevo ? undefined : proveedor?.nombre} onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} onPress={guardar} busy={busy}>{esNuevo ? 'Crear' : 'Guardar'}</Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>
      <Field label="Nombre" value={d.nombre} onChange={v => set('nombre', v)} autoFocus={esNuevo} />
      <Field label="Teléfono" value={d.telefono} onChange={v => set('telefono', v)} keyboardType="phone-pad"
        help="Sale impreso en el PDF de la orden de compra" />
      <Field label="Email" value={d.email} onChange={v => set('email', v)} keyboardType="email-address" />
      <Field label="Dirección" value={d.direccion} onChange={v => set('direccion', v)} multiline />
    </Sheet>
  );
}

// ── Estado de cuenta + pagos ─────────────────────────────────────────────────

function CuentaProveedorSheet({ data, onClose, onPagado }) {
  const visible = !!data;
  const [pagando, setPagando] = useState(false);
  const [monto,   setMonto]   = useState('');
  const [metodo,  setMetodo]  = useState('efectivo');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');

  React.useEffect(() => {
    if (visible) { setPagando(false); setMonto(''); setMetodo('efectivo'); setError(''); }
  }, [visible]);

  async function pagar() {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError('Indica el monto pagado'); return; }
    setBusy(true);
    try {
      await API.registrarPagoProveedor(data.proveedor.id, { monto: m, metodo });
      onPagado();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!visible) return null;
  const ec = data.ec;

  return (
    <Sheet visible={visible} title="Estado de cuenta" sub={data.proveedor.nombre} onClose={onClose}
      footer={pagando ? (
        <>
          <Btn variant="secondary" flex={1} onPress={() => setPagando(false)}>Cancelar</Btn>
          <Btn flex={1.4} onPress={pagar} busy={busy}>Registrar pago</Btn>
        </>
      ) : (
        <>
          <Btn variant="secondary" flex={1} onPress={onClose}>Cerrar</Btn>
          <Btn flex={1.4} onPress={() => setPagando(true)}>Registrar pago</Btn>
        </>
      )}
    >
      <ErrorBox>{error}</ErrorBox>

      {pagando ? (
        <>
          <Field label="Monto pagado" value={monto} onChange={v => { setMonto(v); setError(''); }}
            prefix="L" keyboardType="decimal-pad" autoFocus
            help={`Saldo pendiente con este proveedor: ${fmt(ec.saldo_pendiente)}`} />
          <Picker label="Método" value={metodo} onChange={setMetodo} options={[
            { value: 'efectivo',      label: 'Efectivo' },
            { value: 'transferencia', label: 'Transferencia' },
            { value: 'cheque',        label: 'Cheque' },
          ]} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <Stat label="Comprado" valor={fmt(ec.total_compras_recibidas)} />
            <Stat label="Pagado" valor={fmt(ec.total_pagos)} color={colors.success} />
            <Stat label="Debes" valor={fmt(ec.saldo_pendiente)}
              color={ec.saldo_pendiente > 0 ? colors.warning : colors.fgMuted} />
          </View>

          <Seccion>Órdenes ({ec.ordenes.length})</Seccion>
          {ec.ordenes.length === 0
            ? <Empty icon="shopping-cart" texto="Sin órdenes con este proveedor" />
            : ec.ordenes.map(o => (
                <Row key={o.id}
                  titulo={`OC-${String(o.id).padStart(4, '0')}`}
                  sub={fmtFecha(o.fecha)}
                  badge={o.estado}
                  derecha={fmt(o.total)}
                />
              ))}

          <Seccion>Pagos ({ec.pagos.length})</Seccion>
          {ec.pagos.length === 0
            ? <Empty icon="wallet" texto="Sin pagos registrados" />
            : ec.pagos.map(p => (
                <View key={p.id} style={s.pago}>
                  <Text style={s.pagoFecha}>{fmtFecha(p.fecha)} · {p.metodo}</Text>
                  <Text style={s.pagoMonto}>−{fmt(p.monto)}</Text>
                </View>
              ))}
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  pago: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pagoFecha: { fontSize: 13, color: colors.fgMuted },
  pagoMonto: { fontSize: 13, fontWeight: '700', color: colors.success },
});
