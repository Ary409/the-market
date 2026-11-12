/**
 * CuentasScreen — Cuentas de fiado (ambos roles).
 * Buscar cliente → ver su cuenta (qué llevó, pagos, saldo) → abonar o liquidar.
 * Requiere conexión (los cobros entran a la caja abierta).
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { colors } from '../components/theme';
import Icon from '../components/Icon';
import { Sheet, Field, Btn, ErrorBox, Confirmar, Aviso, useAviso } from '../components/ui';
import * as API from '../api';
import * as Offline from '../storage/offline';

function fmt(n) {
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CuentasScreen({ isOnline = true, user }) {
  const [query,    setQuery]    = useState('');
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [soloDeuda, setSoloDeuda] = useState(true);
  const [cuenta,   setCuenta]   = useState(null);    // estado de cuenta abierto
  const [abono,    setAbono]    = useState(null);    // cliente al que se abona
  const [editando, setEditando] = useState(null);    // cliente | 'nuevo'
  const [monto,    setMonto]    = useState('');
  const [metodo,   setMetodo]   = useState('efectivo');
  const [busy,     setBusy]     = useState(false);
  const [liquidando, setLiquidando] = useState(null);   // cliente a liquidar
  const [aviso, mostrarAviso, limpiarAviso] = useAviso();
  const esAdmin = user?.rol === 'admin';

  const cargar = React.useCallback(async () => {
    setCargando(true);
    try {
      // Funciona con y sin conexión: los saldos ya vienen ajustados por lo
      // que se fió o se abonó y todavía está en cola.
      setClientes(await Offline.getClientes({ search: query, soloDeuda, isOnline }));
    } catch { setClientes([]); }
    finally { setCargando(false); }
  }, [query, soloDeuda, isOnline]);

  React.useEffect(() => {
    const t = setTimeout(cargar, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar]);

  async function verCuenta(cliente) {
    if (!isOnline) {
      // Sin conexión no hay detalle de compras, pero sí lo esencial: cuánto debe
      setCuenta({
        cliente,
        sinConexion: true,
        ec: {
          cliente, saldo_pendiente: cliente.saldo || 0, credito_disponible: null,
          compras_credito: [], pagos: [],
        },
      });
      return;
    }
    try {
      const ec = await API.getEstadoCuenta(cliente.id);
      setCuenta({ cliente, ec });
    } catch (e) { Alert.alert('Error', e.message); }
  }

  async function registrarAbono() {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { Alert.alert('Monto inválido', 'Escribe cuánto está pagando.'); return; }
    setBusy(true);
    try {
      const { enCola } = await Offline.registrarAbono(abono, m, metodo, isOnline);
      const nombre = abono.nombre;
      setAbono(null); setMonto('');
      mostrarAviso(enCola
        ? `${nombre} abonó ${fmt(m)} — se registrará al reconectar`
        : `${nombre} abonó ${fmt(m)}`);
      cargar();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  async function confirmarLiquidacion() {
    setBusy(true);
    try {
      const { enCola } = await Offline.liquidarCuenta(liquidando, isOnline);
      const nombre = liquidando.nombre;
      setLiquidando(null);
      setCuenta(null);
      mostrarAviso(enCola
        ? `Cuenta de ${nombre} liquidada — se subirá al reconectar`
        : `Cuenta de ${nombre} en cero`);
      cargar();
    } catch (e) {
      setLiquidando(null);
      mostrarAviso(e.message, 'error');
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Cuentas de fiado</Text>
        <TouchableOpacity style={[s.filtro, soloDeuda && s.filtroOn]} onPress={() => setSoloDeuda(v => !v)}>
          <Text style={[s.filtroText, soloDeuda && s.filtroTextOn]}>Con deuda</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditando('nuevo')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="plus" size={20} color={colors.ink100} />
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Icon name="search" size={16} color={colors.fgMuted} />
        <TextInput style={s.searchInput} value={query} onChangeText={setQuery}
          placeholder="Buscar cliente…" placeholderTextColor={colors.fgMuted} />
        {cargando && <ActivityIndicator size="small" />}
      </View>

      <FlatList
        data={clientes}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => verCuenta(item)}
            onLongPress={() => setEditando(item)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.nombre}</Text>
              {item.telefono ? <Text style={s.tel}>{item.telefono}</Text> : null}
            </View>
            {item.saldo > 0
              ? <Text style={s.saldo}>{fmt(item.saldo)}</Text>
              : <Text style={s.sinDeuda}>al día</Text>}
            <Icon name="chevron-right" size={16} color={colors.fgMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={!cargando ? (
          <Text style={s.vacio}>{soloDeuda ? 'Nadie debe nada.' : 'Sin clientes registrados.'}</Text>
        ) : null}
        ListHeaderComponent={
          <Text style={s.tip}>Toca para ver la cuenta · mantén presionado para editar el cliente</Text>
        }
      />

      <ClienteSheet cliente={editando} esAdmin={esAdmin}
        onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); mostrarAviso('Cliente guardado'); cargar(); }} />

      <Confirmar
        visible={!!liquidando}
        peligro={false}
        titulo="Liquidar la cuenta"
        mensaje={liquidando
          ? `${liquidando.nombre} pagará ${fmt(liquidando.saldo)} y su cuenta quedará en cero. El dinero entra al arqueo de caja.`
          : ''}
        textoConfirmar="Sí, cobré todo"
        busy={busy}
        onConfirmar={confirmarLiquidacion}
        onCancelar={() => setLiquidando(null)}
      />

      <Aviso texto={aviso.texto} tipo={aviso.tipo} onFin={limpiarAviso} />

      {/* Estado de cuenta */}
      <Modal visible={!!cuenta} animationType="slide" onRequestClose={() => setCuenta(null)}>
        {cuenta && (
          // SafeAreaProvider propio: dentro de un Modal no se heredan los
          // márgenes del teléfono y el título quedaba debajo de la hora
          <SafeAreaProvider>
          <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
            <View style={s.header}>
              <TouchableOpacity onPress={() => setCuenta(null)} style={s.headerBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
                <Icon name="chevron-left" size={22} color={colors.ink100} />
              </TouchableOpacity>
              <Text style={s.title} numberOfLines={1}>{cuenta.cliente.nombre}</Text>
              <TouchableOpacity onPress={() => setCuenta(null)} style={s.headerBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
                <Icon name="x" size={20} color={colors.fgMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={s.saldoCard}>
                <Text style={s.saldoLabel}>Debe</Text>
                <Text style={s.saldoGrande}>{fmt(cuenta.ec.saldo_pendiente)}</Text>
              </View>

              {cuenta.sinConexion && (
                <Text style={s.avisoOffline}>
                  Sin conexión: se muestra el saldo conocido. El detalle de compras y pagos
                  aparecerá cuando vuelva la conexión. Puedes cobrar igual.
                </Text>
              )}

              <Text style={s.seccion}>Qué ha llevado fiado</Text>
              {cuenta.ec.compras_credito.length === 0
                ? <Text style={s.vacio}>{cuenta.sinConexion ? 'Detalle no disponible sin conexión' : 'Sin compras al fiado'}</Text>
                : cuenta.ec.compras_credito.map(v => (
                    <View key={v.venta_id} style={s.compra}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.compraRecibo}>{v.numero_recibo}</Text>
                        <Text style={s.compraTotal}>{fmt(v.total)}</Text>
                      </View>
                      <Text style={s.compraProds}>
                        {v.productos.map(p => `${p.cantidad}× ${p.nombre}`).join(' · ')}
                      </Text>
                    </View>
                  ))}

              <Text style={s.seccion}>Pagos</Text>
              {cuenta.ec.pagos.length === 0
                ? <Text style={s.vacio}>Sin pagos aún</Text>
                : cuenta.ec.pagos.map(p => (
                    <View key={p.id} style={s.pago}>
                      <Text style={s.pagoFecha}>{new Date(p.fecha).toLocaleDateString('es')}</Text>
                      <Text style={s.pagoMonto}>−{fmt(p.monto)}</Text>
                    </View>
                  ))}

              {cuenta.ec.saldo_pendiente > 0 && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <TouchableOpacity style={s.btnSec}
                    onPress={() => { setAbono({ ...cuenta.cliente, saldo: cuenta.ec.saldo_pendiente }); setCuenta(null); setMonto(''); setMetodo('efectivo'); }}>
                    <Text style={s.btnSecText}>Abonar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnPri}
                    onPress={() => setLiquidando({ ...cuenta.cliente, saldo: cuenta.ec.saldo_pendiente })}>
                    <Text style={s.btnPriText}>Liquidar {fmt(cuenta.ec.saldo_pendiente)}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
          </SafeAreaProvider>
        )}
      </Modal>

      {/* Abono — el teclado numérico no tiene tecla de retorno: la tarjeta sube
          con el teclado y tocar fuera lo cierra */}
      <Modal visible={!!abono} transparent animationType="fade" onRequestClose={() => setAbono(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={s.overlay} onPress={() => Keyboard.dismiss()}>
            <Pressable style={s.card} onPress={() => {}}>
              <Text style={s.cardTitle}>Registrar abono</Text>
              <Text style={s.cardSub}>{abono?.nombre} — debe {fmt(abono?.saldo)}</Text>
              <View style={s.inputRow}>
                <Text style={s.prefijo}>$</Text>
                <TextInput style={s.input} value={monto} onChangeText={setMonto}
                  placeholder="Monto" keyboardType="decimal-pad" placeholderTextColor={colors.fgMuted} autoFocus />
                {!!monto && (
                  <TouchableOpacity onPress={() => setMonto('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="x" size={16} color={colors.fgMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {/* Atajos: la mayoría de los abonos son el total o una cifra redonda */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={s.atajo} activeOpacity={0.7}
                  onPress={() => setMonto(String(abono?.saldo ?? ''))}>
                  <Text style={s.atajoText}>Todo ({fmt(abono?.saldo)})</Text>
                </TouchableOpacity>
                {[50, 100, 200].map(v => (
                  <TouchableOpacity key={v} style={s.atajo} activeOpacity={0.7} onPress={() => setMonto(String(v))}>
                    <Text style={s.atajoText}>${v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {['efectivo', 'tarjeta'].map(m => (
                  <TouchableOpacity key={m} style={[s.metodoChip, metodo === m && s.metodoChipOn]} onPress={() => setMetodo(m)}>
                    <Text style={[s.metodoChipText, metodo === m && s.metodoChipTextOn]}>
                      {m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={s.btnSec} activeOpacity={0.7}
                  onPress={() => { Keyboard.dismiss(); setAbono(null); }} disabled={busy}>
                  <Text style={s.btnSecText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnPri, !monto && { opacity: 0.45 }]} activeOpacity={0.85}
                  onPress={registrarAbono} disabled={busy || !monto}>
                  {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPriText}>Registrar</Text>}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Alta / edición de cliente ────────────────────────────────────────────────

function ClienteSheet({ cliente, esAdmin, onClose, onSaved }) {
  const visible = !!cliente;
  const esNuevo = cliente === 'nuevo';
  const vacio = { nombre: '', telefono: '', email: '', direccion: '', limite_credito: '', notas: '' };
  const [d, setD]         = useState(vacio);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setError('');
    setD(esNuevo ? vacio : {
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      limite_credito: cliente.limite_credito != null ? String(cliente.limite_credito) : '',
      notas: cliente.notas || '',
    });
  }, [visible, cliente]);

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
        notas: d.notas.trim() || null,
      };
      // Solo el administrador puede fijar el límite de fiado
      if (esAdmin) payload.limite_credito = d.limite_credito ? parseFloat(d.limite_credito) : null;

      if (esNuevo) await API.createCliente(payload);
      else         await API.updateCliente(cliente.id, payload);
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function desactivar() {
    Alert.alert('Desactivar cliente', `¿Quitar a ${cliente.nombre} de la lista? El historial se conserva.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar', style: 'destructive',
        onPress: async () => {
          try { await API.desactivarCliente(cliente.id); onSaved(); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  return (
    <Sheet visible={visible} title={esNuevo ? 'Nuevo cliente' : 'Editar cliente'}
      sub={esNuevo ? 'Podrá llevar fiado desde el primer día' : cliente?.nombre}
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} onPress={guardar} busy={busy}>{esNuevo ? 'Registrar' : 'Guardar'}</Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>
      <Field label="Nombre" value={d.nombre} onChange={v => set('nombre', v)} autoFocus={esNuevo} />
      <Field label="Teléfono" value={d.telefono} onChange={v => set('telefono', v)} keyboardType="phone-pad" />
      <Field label="Email" value={d.email} onChange={v => set('email', v)} keyboardType="email-address" />
      <Field label="Dirección" value={d.direccion} onChange={v => set('direccion', v)} />
      {esAdmin ? (
        <Field label="Límite de fiado (opcional)" value={d.limite_credito} onChange={v => set('limite_credito', v)}
          prefix="L" keyboardType="decimal-pad"
          help="Vacío = puede fiar sin tope. Si pones un monto, no podrá deber más que eso." />
      ) : (
        <Text style={s.notaRol}>
          Todo cliente puede llevar fiado. Solo el administrador define límites.
        </Text>
      )}
      <Field label="Notas" value={d.notas} onChange={v => set('notas', v)} multiline />

      {!esNuevo && esAdmin && (
        <View style={{ marginTop: 8 }}>
          <Btn variant="danger" onPress={desactivar}>Desactivar cliente</Btn>
        </View>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink05 },
  tip:  { fontSize: 11, color: colors.fgSubtle, textAlign: 'center', marginBottom: 10 },
  notaRol: { fontSize: 12, color: colors.fgMuted, lineHeight: 18, marginBottom: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink100, flex: 1 },
  headerBack: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginHorizontal: -6 },
  filtro: {
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  filtroOn:      { backgroundColor: colors.ink100, borderColor: colors.ink100 },
  filtroText:    { fontSize: 12, fontWeight: '600', color: colors.fgMuted },
  filtroTextOn:  { color: '#fff' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.ink100 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  nombre:   { fontSize: 14, fontWeight: '600', color: colors.ink100 },
  tel:      { fontSize: 12, color: colors.fgMuted, marginTop: 1 },
  saldo:    { fontSize: 14, fontWeight: '700', color: '#B45309' },
  sinDeuda: { fontSize: 12, color: colors.fgMuted },
  vacio:    { textAlign: 'center', color: colors.fgMuted, fontSize: 13, marginTop: 18 },
  avisoOffline: {
    fontSize: 12, color: '#92400E', backgroundColor: colors.warningBg,
    borderWidth: 1, borderColor: colors.warningBd, borderRadius: 10,
    padding: 12, lineHeight: 17,
  },
  offline:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  offlineText: { textAlign: 'center', color: colors.fgMuted, fontSize: 14 },

  saldoCard: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  saldoLabel:  { fontSize: 12, color: colors.fgMuted },
  saldoGrande: { fontSize: 30, fontWeight: '800', color: '#B45309', letterSpacing: -0.5 },
  seccion: {
    fontSize: 11, fontWeight: '700', color: colors.fgMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8,
  },
  compra: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  compraRecibo: { fontSize: 12, color: colors.fgMuted },
  compraTotal:  { fontSize: 14, fontWeight: '700', color: colors.ink100 },
  compraProds:  { fontSize: 12, color: colors.fgMuted, marginTop: 4 },
  pago: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pagoFecha: { fontSize: 13, color: colors.fgMuted },
  pagoMonto: { fontSize: 13, fontWeight: '700', color: '#15803D' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:    { width: '100%', maxWidth: 380, backgroundColor: colors.paper, borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink100 },
  cardSub:   { fontSize: 13, color: colors.fgMuted, marginTop: 2, marginBottom: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10, paddingHorizontal: 14,
  },
  prefijo: { fontSize: 16, color: colors.fgMuted },
  input:   { flex: 1, height: 48, fontSize: 18, fontWeight: '600', color: colors.ink100 },
  atajo: {
    flex: 1, height: 34, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink05,
  },
  atajoText: { fontSize: 11, fontWeight: '600', color: colors.fgMuted },
  metodoChip: {
    flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  metodoChipOn:     { backgroundColor: colors.ink100, borderColor: colors.ink100 },
  metodoChipText:   { fontSize: 13, fontWeight: '600', color: colors.fgMuted },
  metodoChipTextOn: { color: '#fff' },
  btnSec: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecText: { fontSize: 14, fontWeight: '600', color: colors.fgMuted },
  btnPri: {
    flex: 1.4, height: 46, borderRadius: 10, backgroundColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPriText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
