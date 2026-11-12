import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../components/theme';
import Icon from '../../components/Icon';
import * as API from '../../api';
import * as Offline from '../../storage/offline';

function fmt(n) {
  if (n == null) return '—';
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HistorialScreen({ navigation, isOnline = true }) {
  const [ventas, setVentas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deEspejo, setDeEspejo] = useState(false);

  async function loadData() {
    try {
      // Incluye las ventas hechas sin conexión que aún no se han subido
      const { datos, deEspejo } = await Offline.getVentasDelDia(isOnline);
      setVentas(datos || []);
      setDeEspejo(deEspejo);
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const total = ventas.reduce((a, v) => a + (v.total || 0), 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Icon name="chevron-left" size={22} color={colors.ink100} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={s.title}>Ventas del día</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary bar */}
      <View style={s.summaryBar}>
        <View>
          <Text style={s.summaryCaption}>Hoy</Text>
          <Text style={s.summaryCount}>{ventas.length} ventas</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.summaryCaption}>Total</Text>
          <Text style={s.summaryTotal}>{fmt(total)}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.ink100} />
        </View>
      ) : ventas.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Icon name="receipt" size={32} color={colors.fgMuted} />
          </View>
          <Text style={s.emptyTitle}>Sin ventas hoy</Text>
          <Text style={s.emptySub}>Las ventas registradas aparecerán aquí</Text>
          <View style={s.phaseBanner}>
            <Icon name="clock" size={14} color={colors.warning} />
            <Text style={s.phaseText}>Módulo de POS disponible en Fase 3</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <VentaRow venta={item} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function VentaRow({ venta }) {
  const hora = venta.fecha
    ? new Date(venta.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const esEfectivo = venta.metodo_pago === 'efectivo';

  return (
    <View style={s.row}>
      <View style={[s.rowIcon, esEfectivo ? s.rowIconGreen : s.rowIconBlue]}>
        <Icon name={esEfectivo ? 'check' : 'receipt'} size={18} color={esEfectivo ? '#15803D' : '#1E40AF'} />
      </View>
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.rowId}>#{String(venta.id).padStart(4, '0')}</Text>
          <Text style={s.rowTime}>{hora}</Text>
        </View>
        <Text style={s.rowSub}>
          {venta.vendedor?.nombre || 'Vendedor'} · {venta.detalles?.length || 0} items
        </Text>
      </View>
      <Text style={s.rowTotal}>{fmt(venta.total)}</Text>
      <Icon name="chevron-right" size={16} color={colors.fgMuted} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink100, letterSpacing: -0.3 },
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: colors.ink05,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryCaption: { fontSize: 11, fontWeight: '500', color: colors.fgMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  summaryCount: { fontSize: 14, fontWeight: '600', color: colors.ink100, marginTop: 2 },
  summaryTotal: { fontSize: 22, fontWeight: '700', color: colors.ink100, letterSpacing: -0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.ink100 },
  emptySub: { fontSize: 14, color: colors.fgMuted, textAlign: 'center' },
  phaseBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBd,
    borderRadius: 10, marginTop: 8,
  },
  phaseText: { fontSize: 12, fontWeight: '500', color: colors.warning },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconGreen: { backgroundColor: '#ECFDF3' },
  rowIconBlue: { backgroundColor: '#EFF6FF' },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowId: { fontSize: 13, fontWeight: '500', color: colors.ink100 },
  rowTime: { fontSize: 12, color: colors.fgMuted },
  rowSub: { fontSize: 12, color: colors.fgMuted, marginTop: 2 },
  rowTotal: { fontSize: 15, fontWeight: '600', color: colors.ink100 },
});
