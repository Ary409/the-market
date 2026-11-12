import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../components/theme';
import Icon from '../../components/Icon';
import * as API from '../../api';
import * as DB from '../../storage/db';
import { refreshProductCache } from '../../storage/sync';

export default function AlertasScreen({ navigation, isOnline = true }) {
  const [tab, setTab]           = useState('stock'); // stock | vencer
  const [stockBajo, setStockBajo] = useState([]);
  const [porVencer, setPorVencer] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      // Con conexión se refresca la copia local; con o sin ella, las alertas
      // se calculan desde el teléfono. (Antes pedía 200 productos de golpe y el
      // servidor solo permite 100: la pantalla fallaba en silencio.)
      if (isOnline) await refreshProductCache();
      const { stockBajo: bajos, porVencer: vencen } = await DB.getAlertasLocal();
      setStockBajo(bajos.map(normalizar));
      setPorVencer(vencen.map(normalizar));
    } catch {
      // mantener listas vacías
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // La copia local usa nombres propios; se traducen al shape de la pantalla
  function normalizar(p) {
    return {
      id: p.id, nombre: p.nombre, stock: p.stock,
      stock_minimo: p.stock_minimo, codigo_barras: p.codigo,
      fecha_vencimiento: p.vence || null,
      categoria: p.categoria ? { nombre: p.categoria } : null,
    };
  }

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const lista = tab === 'stock' ? stockBajo : porVencer;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Icon name="chevron-left" size={22} color={colors.ink100} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={s.title}>Alertas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TabPill active={tab === 'stock'} onPress={() => setTab('stock')} count={stockBajo.length}>
          Stock bajo
        </TabPill>
        <TabPill active={tab === 'vencer'} onPress={() => setTab('vencer')} count={porVencer.length}>
          Por vencer
        </TabPill>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.ink100} />
        </View>
      ) : lista.length === 0 ? (
        <View style={s.center}>
          <Icon name="check" size={32} color={colors.success} />
          <Text style={s.emptyText}>Sin alertas en esta categoría</Text>
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) =>
            tab === 'stock'
              ? <StockRow item={item} />
              : <VencerRow item={item} />
          }
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function TabPill({ active, onPress, count, children }) {
  return (
    <TouchableOpacity
      style={[s.pill, active && s.pillActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[s.pillText, active && s.pillTextActive]}>{children}</Text>
      <View style={[s.pillBadge, active && s.pillBadgeActive]}>
        <Text style={[s.pillBadgeText, active && s.pillBadgeTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function StockRow({ item }) {
  const agotado = item.stock === 0;
  return (
    <View style={s.row}>
      <View style={s.thumb}>
        <Text style={s.thumbText}>{initials(item.nombre)}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={s.rowSub}>{item.categoria?.nombre || 'Sin categoría'}</Text>
      </View>
      <View style={[s.tag, agotado ? s.tagDanger : s.tagWarn]}>
        <Text style={[s.tagText, agotado ? s.tagTextDanger : s.tagTextWarn]}>
          {agotado ? 'Agotado' : `${item.stock} / ${item.stock_minimo}`}
        </Text>
      </View>
    </View>
  );
}

function VencerRow({ item }) {
  const hoy = new Date();
  const v = new Date(item.fecha_vencimiento);
  const dias = Math.ceil((v - hoy) / (1000 * 60 * 60 * 24));
  const urgente = dias <= 1;
  const vStr = v.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

  return (
    <View style={s.row}>
      <View style={s.thumb}>
        <Text style={s.thumbText}>{initials(item.nombre)}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={[s.rowSub, urgente && { color: colors.danger }]}>Vence: {vStr}</Text>
      </View>
      {urgente && (
        <View style={s.tagDanger}>
          <Text style={s.tagTextDanger}>{dias}d</Text>
        </View>
      )}
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
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 34, paddingHorizontal: 14, borderRadius: 17,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.paper,
  },
  pillActive: { backgroundColor: colors.ink100, borderColor: colors.ink100 },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.ink80 },
  pillTextActive: { color: '#fff' },
  pillBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center',
  },
  pillBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  pillBadgeText: { fontSize: 11, fontWeight: '600', color: colors.fgMuted },
  pillBadgeTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: colors.fgMuted },
  list: { padding: 16, paddingTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: colors.paper,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
  },
  thumb: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center',
  },
  thumbText: { fontSize: 14, fontWeight: '600', color: colors.fgMuted },
  rowBody: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '500', color: colors.ink100 },
  rowSub: { fontSize: 12, color: colors.fgMuted, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  tagDanger: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, backgroundColor: colors.dangerBg, borderColor: colors.dangerBd },
  tagWarn: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  tagText: { fontSize: 11, fontWeight: '600' },
  tagTextDanger: { fontSize: 11, fontWeight: '600', color: '#991B1B' },
  tagTextWarn: { fontSize: 11, fontWeight: '600', color: '#92400E' },
});
