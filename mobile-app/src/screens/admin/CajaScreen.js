/**
 * CajaScreen — Estado de la caja e historial de turnos (admin).
 * Abrir y cerrar también se puede desde el POS; aquí además se ve el histórico.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Alert, StyleSheet } from 'react-native';
import {
  Screen, Field, Btn, Row, Sheet, Empty, Cargando, ErrorBox, Stat, Seccion,
  fmt, fmtFecha, colors,
} from '../../components/ui';
import * as API from '../../api';
import * as Offline from '../../storage/offline';

export default function CajaScreen({ navigation, isOnline = true }) {
  const [actual,   setActual]   = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(null);   // 'abrir' | 'cerrar'
  const [cierre,   setCierre]   = useState(null);
  const [deEspejo, setDeEspejo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const c = await Offline.getCaja(isOnline).catch(() => null);
      setActual(c);
      const h = await Offline.getSesionesCaja(isOnline).catch(() => null);
      setSesiones(h?.datos || []);
      setDeEspejo(!!h?.deEspejo);
    } finally { setCargando(false); }
  }, [isOnline]);

  React.useEffect(() => { cargar(); }, [cargar]);

  if (cargando && !sesiones.length) {
    return <Screen title="Caja" onBack={navigation ? () => navigation.goBack() : undefined}><Cargando /></Screen>;
  }

  return (
    <Screen title="Caja" onBack={navigation ? () => navigation.goBack() : undefined}>
      <FlatList
        data={sesiones}
        keyExtractor={s => String(s.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 6 }}>
            {actual ? (
              <View style={s.abierta}>
                <Text style={s.abiertaTitulo}>Caja abierta</Text>
                <Text style={s.abiertaSub}>
                  Sesión #{actual.id} · fondo {fmt(actual.monto_inicial)} · desde {fmtFecha(actual.fecha_apertura, true)}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Btn variant="danger" onPress={() => setModal('cerrar')}>Cerrar turno y hacer corte</Btn>
                </View>
              </View>
            ) : (
              <View style={s.cerrada}>
                <Text style={s.cerradaTitulo}>Caja cerrada</Text>
                <Text style={s.cerradaSub}>Ábrela para poder registrar ventas y cobrar cuentas.</Text>
                <View style={{ marginTop: 12 }}>
                  <Btn onPress={() => setModal('abrir')}>Abrir caja</Btn>
                </View>
              </View>
            )}
            <Seccion>Historial de turnos</Seccion>
          </View>
        }
        renderItem={({ item }) => (
          <Row
            titulo={`S-${String(item.id).padStart(4, '0')}`}
            sub={`${fmtFecha(item.fecha_apertura, true)} → ${item.fecha_cierre ? fmtFecha(item.fecha_cierre, true) : 'abierta'}`}
            badge={item.estado}
            badgeColor={item.estado === 'abierta' ? colors.success : undefined}
            derecha={item.monto_contado != null ? fmt(item.monto_contado) : '—'}
            subDerecha={item.diferencia != null
              ? `dif ${item.diferencia >= 0 ? '+' : ''}${fmt(item.diferencia)}`
              : `fondo ${fmt(item.monto_inicial)}`}
          />
        )}
        ListEmptyComponent={<Empty icon="wallet" titulo="Sin turnos" texto="Aún no se ha abierto ninguna caja." />}
        refreshing={cargando}
        onRefresh={cargar}
      />

      <MontoSheet
        modo={modal}
        isOnline={isOnline}
        onClose={() => setModal(null)}
        onDone={res => { setModal(null); if (res) setCierre(res); cargar(); }}
      />

      <ResumenCierre cierre={cierre} onClose={() => setCierre(null)} />
    </Screen>
  );
}

function MontoSheet({ modo, isOnline = true, onClose, onDone }) {
  const visible = !!modo;
  const [monto, setMonto] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => { if (visible) { setMonto(''); setError(''); } }, [visible]);

  async function accion() {
    const m = parseFloat(monto);
    if (isNaN(m) || m < 0) { setError('Escribe un monto válido'); return; }
    setBusy(true);
    try {
      // Con o sin conexión: si no hay red queda en cola y el corte se calcula
      // con los datos del teléfono
      if (modo === 'abrir') { await Offline.abrirCaja(m, isOnline); onDone(null); }
      else                  { const r = await Offline.cerrarCaja(m, isOnline); onDone({ ...r.resultado, enCola: r.enCola }); }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} title={modo === 'abrir' ? 'Abrir caja' : 'Cerrar turno'}
      sub={modo === 'abrir' ? 'Fondo inicial en efectivo' : 'Cuenta el efectivo físico'}
      onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} variant={modo === 'abrir' ? 'primary' : 'danger'} onPress={accion} busy={busy}>
          {modo === 'abrir' ? 'Abrir' : 'Hacer corte'}
        </Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>
      <Field
        label={modo === 'abrir' ? 'Monto inicial' : 'Efectivo contado en caja'}
        value={monto} onChange={v => { setMonto(v); setError(''); }}
        prefix="L" keyboardType="decimal-pad" autoFocus
        help={modo === 'abrir'
          ? 'Con este monto arranca el turno; se descuenta al hacer el corte.'
          : 'Incluye el fondo inicial. El sistema calcula la diferencia contra lo esperado.'}
      />
    </Sheet>
  );
}

function ResumenCierre({ cierre, onClose }) {
  if (!cierre) return null;
  const r = cierre.resumen;
  const filas = [
    ['Total vendido', fmt(r.total_ventas), null],
    ['Efectivo', fmt(r.ventas_efectivo), null],
    ['Tarjeta', fmt(r.ventas_tarjeta), null],
    ['Fiado (no entra a caja)', fmt(r.ventas_credito || 0), colors.warning],
    ['Cuentas cobradas', fmt((r.cobros_credito_efectivo || 0) + (r.cobros_credito_tarjeta || 0)), colors.success],
    ['Efectivo esperado', fmt(r.monto_esperado), null],
    ['Efectivo contado', fmt(cierre.sesion.monto_contado), null],
    ['Diferencia', `${r.diferencia >= 0 ? '+' : ''}${fmt(r.diferencia)}`, r.diferencia >= 0 ? colors.success : colors.danger],
  ];
  return (
    <Sheet visible={true} title="Turno cerrado"
      sub={cierre.enCola ? 'Calculado en el teléfono · se subirá al reconectar' : `Sesión #${cierre.sesion.id}`}
      onClose={onClose}
      footer={<Btn flex={1} onPress={onClose}>Entendido</Btn>}
    >
      {filas.map(([k, v, color]) => (
        <View key={k} style={s.fila}>
          <Text style={s.filaLabel}>{k}</Text>
          <Text style={[s.filaValor, color && { color }]}>{v}</Text>
        </View>
      ))}
      {cierre.fiados_turno?.length > 0 && (
        <>
          <Seccion>Fiados de este turno</Seccion>
          {cierre.fiados_turno.map((f, i) => (
            <View key={i} style={s.fila}>
              <Text style={s.filaLabel}>{f.cliente}</Text>
              <Text style={[s.filaValor, { color: colors.warning }]}>{fmt(f.total)}</Text>
            </View>
          ))}
        </>
      )}
      {cierre.cobros_turno?.length > 0 && (
        <>
          <Seccion>Cuentas cobradas</Seccion>
          {cierre.cobros_turno.map((c, i) => (
            <View key={i} style={s.fila}>
              <Text style={s.filaLabel}>{c.cliente} ({c.metodo})</Text>
              <Text style={[s.filaValor, { color: colors.success }]}>+{fmt(c.monto)}</Text>
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  abierta: {
    backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBd,
    borderRadius: 12, padding: 16,
  },
  abiertaTitulo: { fontSize: 16, fontWeight: '700', color: '#15803D' },
  abiertaSub:    { fontSize: 12, color: '#15803D', marginTop: 3 },
  cerrada: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 16,
  },
  cerradaTitulo: { fontSize: 16, fontWeight: '700', color: colors.ink100 },
  cerradaSub:    { fontSize: 12, color: colors.fgMuted, marginTop: 3 },
  fila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filaLabel: { fontSize: 13, color: colors.fgMuted, flex: 1 },
  filaValor: { fontSize: 13, fontWeight: '700', color: colors.ink100 },
});
