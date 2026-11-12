/**
 * DashboardScreen — Panel del administrador en el celular.
 * Usa el mismo endpoint /dashboard que la PC: ventas del día/mes, ganancia,
 * por cobrar, alertas de stock, más vendidos y últimas ventas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../components/theme';
import Icon from '../../components/Icon';
import * as API from '../../api';
import * as Offline from '../../storage/offline';

// Cuántas alertas había la última vez que el administrador las revisó
const CLAVE_ALERTAS_VISTAS = 'alertas_vistas';

// "Network request failed" no le dice nada al dueño de la tienda
const esFalloDeRed = (msg = '') =>
  /network|failed to fetch|timeout|abort/i.test(String(msg));

function fmt(n) {
  if (n == null) return '—';
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtCant(n) {
  const f = Number(n || 0);
  return f === Math.trunc(f) ? String(Math.trunc(f)) : String(f);
}

export default function DashboardScreen({ user, navigation, isOnline = true }) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [d, setD]                   = useState(null);
  const [error, setError]           = useState('');
  const [alertasVistas, setAlertasVistas] = useState(0);
  const [deEspejo,   setDeEspejo]   = useState(false);
  const [actualizado, setActualizado] = useState(null);
  const pendientesRef = React.useRef(0);

  const nombre  = user?.nombre?.split(' ')[0] || 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();

  const loadData = useCallback(async () => {
    try {
      // Con conexión pide al servidor; sin ella usa la última copia guardada
      const r = await Offline.getDashboard(isOnline);
      setD(r.datos);
      setDeEspejo(r.deEspejo);
      setActualizado(r.actualizado);
      setError('');
    } catch (e) {
      setError(e.message || 'No se pudo cargar el panel');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline]);

  // Recargar CADA VEZ que se vuelve a esta pestaña: si el administrador
  // atendió una recomendación o repuso stock, debe desaparecer de aquí.
  useFocusEffect(
    useCallback(() => {
      loadData();
      AsyncStorage.getItem(CLAVE_ALERTAS_VISTAS)
        .then(v => setAlertasVistas(parseInt(v || '0', 10) || 0))
        .catch(() => {});
    }, [loadData])
  );

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // Ir a una pantalla que vive dentro del stack de "Más"
  const irAMas = (pantalla) => navigation.navigate('Mas', { screen: pantalla });

  // Al abrir las alertas quedan "vistas": la campana se apaga hasta que
  // aparezcan alertas nuevas.
  const verAlertas = useCallback(async () => {
    try {
      await AsyncStorage.setItem(CLAVE_ALERTAS_VISTAS, String(pendientesRef.current));
      setAlertasVistas(pendientesRef.current);
    } catch {}
    irAMas('Alertas');
  }, [navigation]);

  const al   = d?.alertas || { bajo_stock: 0, agotados: 0, por_vencer: 0, recomendaciones_pendientes: 0 };
  const vh   = d?.ventas_hoy || { total: 0, cantidad: 0 };
  const vm   = d?.ventas_mes || { total: 0, cantidad: 0 };
  const gm   = d?.ganancias_mes || { ganancia: 0 };
  const cd   = d?.clientes_con_deuda || { cantidad: 0, total_por_cobrar: 0 };
  const caja = d?.caja_actual;
  const pendientes = al.bajo_stock + al.agotados;
  pendientesRef.current = pendientes;
  // La campana solo se enciende si hay alertas NUEVAS desde la última revisión
  const alertasNuevas = Math.max(0, pendientes - alertasVistas);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.avatar}><Text style={s.avatarText}>{inicial}</Text></View>
          <View>
            <Text style={s.greeting}>Hola,</Text>
            <Text style={s.userName}>{nombre}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.bellBtn} onPress={verAlertas} activeOpacity={0.7}>
          <Icon name="bell" size={20} color={colors.ink80} />
          {alertasNuevas > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{alertasNuevas > 9 ? '9+' : alertasNuevas}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.loadingBox}><ActivityIndicator color={colors.ink100} size="large" /></View>
        ) : error ? (
          <View style={s.alertBox}>
            <View style={s.alertIcon}>
              <Icon name={esFalloDeRed(error) ? 'wifi-off' : 'alert-triangle'} size={18} color="#B45309" />
            </View>
            <View style={s.alertBody}>
              <Text style={s.alertTitle}>
                {esFalloDeRed(error) ? 'Sin conexión con el sistema' : 'No se pudo cargar'}
              </Text>
              <Text style={s.alertSub}>
                {esFalloDeRed(error)
                  ? 'El resumen del negocio necesita conexión con la computadora. Conéctate a la red de la tienda y desliza hacia abajo para reintentar.'
                  : error}
              </Text>
            </View>
          </View>
        ) : (
          <>
            {deEspejo && (
              <View style={s.espejoAviso}>
                <Icon name="clock" size={14} color="#92400E" />
                <Text style={s.espejoTexto}>
                  Datos guardados en el teléfono · {Offline.desdeCuando(actualizado)}.
                  Las ventas hechas sin conexión se suman al reconectar.
                </Text>
              </View>
            )}
            <Text style={s.sectionLabel}>Resumen de hoy</Text>

            <View style={s.revenueCard}>
              <Text style={s.revenueLabel}>Ventas de hoy</Text>
              <Text style={s.revenueValue}>{fmt(vh.total)}</Text>
              <Text style={s.revenueNote}>
                {vh.cantidad} venta{vh.cantidad !== 1 ? 's' : ''}
                {caja ? ` · caja abierta desde ${new Date(caja.fecha_apertura).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : ' · caja cerrada'}
              </Text>
            </View>

            <View style={s.metricsRow}>
              <SmallMetric label="Ventas del mes" value={fmt(vm.total)} />
              <SmallMetric label="Ganancia del mes" value={fmt(gm.ganancia)} color={colors.success} />
            </View>
            <View style={s.metricsRow}>
              <SmallMetric label="Por cobrar (fiado)" value={fmt(cd.total_por_cobrar)}
                color={cd.total_por_cobrar > 0 ? colors.warning : undefined}
                sub={`${cd.cantidad} cliente${cd.cantidad !== 1 ? 's' : ''}`} />
              <SmallMetric label="Agotados" value={String(al.agotados)}
                color={al.agotados > 0 ? colors.danger : undefined}
                sub={`${al.bajo_stock} bajo mínimo`} />
            </View>

            {/* Alertas de stock */}
            {pendientes > 0 ? (
              <TouchableOpacity style={s.alertBox} onPress={verAlertas} activeOpacity={0.8}>
                <View style={s.alertIcon}><Icon name="alert-triangle" size={18} color="#B45309" /></View>
                <View style={s.alertBody}>
                  <Text style={s.alertTitle}>{pendientes} producto{pendientes !== 1 ? 's' : ''} necesitan reposición</Text>
                  <Text style={s.alertSub}>
                    {al.agotados} agotado{al.agotados !== 1 ? 's' : ''} · {al.bajo_stock} bajo mínimo
                    {al.por_vencer > 0 ? ` · ${al.por_vencer} por vencer` : ''}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color="#92400E" />
              </TouchableOpacity>
            ) : (
              <View style={s.okBox}>
                <Icon name="check" size={18} color={colors.success} />
                <Text style={s.okText}>Stock en orden — sin alertas</Text>
              </View>
            )}

            {al.recomendaciones_pendientes > 0 && (
              <TouchableOpacity style={s.recoBox} onPress={() => irAMas('Recomendaciones')} activeOpacity={0.8}>
                <View style={s.alertIcon}><Icon name="bell" size={18} color={colors.ink100} /></View>
                <View style={s.alertBody}>
                  <Text style={s.alertTitle}>
                    {al.recomendaciones_pendientes} recomendación{al.recomendaciones_pendientes !== 1 ? 'es' : ''} del sistema
                  </Text>
                  <Text style={s.alertSub}>Qué pedir y qué revisar</Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.fgMuted} />
              </TouchableOpacity>
            )}

            {/* Top del mes */}
            {d?.top_productos_mes?.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 8 }]}>Más vendidos del mes</Text>
                <View style={s.lista}>
                  {d.top_productos_mes.map((p, i) => (
                    <View key={p.id} style={[s.listaItem, i > 0 && s.listaItemBorde]}>
                      <Text style={s.listaPos}>{i + 1}</Text>
                      <Text style={s.listaNombre} numberOfLines={1}>{p.nombre}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.listaValor}>{fmtCant(p.unidades)} uds</Text>
                        <Text style={s.listaSub}>{fmt(p.ingresos)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Últimas ventas */}
            {d?.ultimas_ventas?.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 8 }]}>Últimas ventas</Text>
                <View style={s.lista}>
                  {d.ultimas_ventas.map((v, i) => (
                    <View key={v.id} style={[s.listaItem, i > 0 && s.listaItemBorde]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.listaNombre} numberOfLines={1}>{v.numero_recibo}</Text>
                        <Text style={s.listaSub}>
                          {v.vendedor} · {v.metodo_pago === 'credito' ? 'fiado' : v.metodo_pago}
                        </Text>
                      </View>
                      <Text style={s.listaValor}>{fmt(v.total)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={[s.sectionLabel, { marginTop: 8 }]}>Acceso rápido</Text>
            <QuickAction icon="package" title="Inventario"
              subtitle="Productos, precios y stock" onPress={() => irAMas('Inventario')} />
            <QuickAction icon="shopping-cart" title="Hacer un pedido"
              subtitle="Orden de compra a proveedor" onPress={() => irAMas('Compras')} />
            <QuickAction icon="trend-up" title="Reportes"
              subtitle="Ventas, ganancia y descargas" onPress={() => irAMas('Reportes')} />
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SmallMetric({ label, value, color, sub }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, color && { color }]}>{value}</Text>
      {!!sub && <Text style={s.metricSub}>{sub}</Text>}
    </View>
  );
}

function QuickAction({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={s.quick} onPress={onPress} activeOpacity={0.7}>
      <View style={s.quickIcon}><Icon name={icon} size={18} color={colors.ink100} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.quickTitle}>{title}</Text>
        <Text style={s.quickSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={17} color={colors.fgMuted} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink05 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  greeting:   { fontSize: 12, color: colors.fgMuted },
  userName:   { fontSize: 16, fontWeight: '700', color: colors.ink100 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
    backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.paper,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  scroll: { padding: 16, gap: 10 },
  espejoAviso: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBd,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  espejoTexto: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 15 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.fgMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4,
  },
  loadingBox: { padding: 50, alignItems: 'center' },

  revenueCard: {
    backgroundColor: colors.ink100, borderRadius: 14, padding: 18,
  },
  revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  revenueValue: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginTop: 2 },
  revenueNote:  { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 13,
  },
  metricLabel: { fontSize: 11, color: colors.fgMuted },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.ink100, letterSpacing: -0.4, marginTop: 2 },
  metricSub:   { fontSize: 10, color: colors.fgMuted, marginTop: 2 },

  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBd,
    borderRadius: 12, padding: 14,
  },
  recoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14,
  },
  alertIcon: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  alertBody:  { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: colors.ink100 },
  alertSub:   { fontSize: 11, color: colors.fgMuted, marginTop: 1 },
  okBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBd,
    borderRadius: 12, padding: 14,
  },
  okText: { fontSize: 13, fontWeight: '600', color: '#15803D' },

  lista: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, overflow: 'hidden',
  },
  listaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  listaItemBorde: { borderTopWidth: 1, borderTopColor: colors.border },
  listaPos:    { fontSize: 12, fontWeight: '700', color: colors.fgSubtle, width: 14 },
  listaNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink100 },
  listaValor:  { fontSize: 13, fontWeight: '700', color: colors.ink100 },
  listaSub:    { fontSize: 11, color: colors.fgMuted, marginTop: 1 },

  quick: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14,
  },
  quickIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ink05,
    alignItems: 'center', justifyContent: 'center',
  },
  quickTitle: { fontSize: 14, fontWeight: '600', color: colors.ink100 },
  quickSub:   { fontSize: 11, color: colors.fgMuted, marginTop: 1 },
});
