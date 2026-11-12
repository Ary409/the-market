import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../components/theme';
import Icon from '../../components/Icon';
import BarcodeScanner from '../../components/BarcodeScanner';
import * as API from '../../api';

function fmt(n) {
  if (n == null) return '—';
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ConsultaScreen({ navigation }) {
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [product, setProduct]   = useState(null);
  const [error, setError]       = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [assignOpen, setAssignOpen]   = useState(false);   // escáner para ASIGNAR código
  const [asignando, setAsignando]     = useState(false);

  async function buscar() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setProduct(null);
    try {
      // Intenta por código de barras primero; si falla, busca por nombre
      let found = null;
      try {
        found = await API.getProductoByBarcode(q);
      } catch {
        const res = await API.getProductos({ q, per_page: 1 });
        const items = res?.items || res || [];
        if (items.length > 0) found = items[0];
      }
      if (!found) {
        setError('Producto no encontrado');
      } else {
        setProduct(found);
      }
    } catch (e) {
      setError(e.message || 'Error al buscar');
    } finally {
      setLoading(false);
    }
  }

  function limpiar() {
    setQuery('');
    setProduct(null);
    setError('');
  }

  // Asignar código de barras escaneado al producto en pantalla
  async function asignarCodigo(codigo) {
    setAssignOpen(false);
    if (!product) return;
    Alert.alert(
      'Asignar código de barras',
      `¿Asignar el código ${codigo} a "${product.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Asignar',
          onPress: async () => {
            setAsignando(true);
            try {
              const actualizado = await API.updateProducto(product.id, { codigo_barras: codigo });
              setProduct(actualizado);
              Alert.alert('Listo', 'Código de barras asignado. Ya se puede escanear en ventas.');
            } catch (e) {
              Alert.alert('Error', e.message || 'No se pudo asignar el código');
            } finally {
              setAsignando(false);
            }
          },
        },
      ],
    );
  }

  const margen = product && product.precio_compra && product.precio_venta
    ? ((product.precio_venta - product.precio_compra) / product.precio_venta) * 100
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        {/* Consulta es pestaña propia: solo hay "atrás" si se llegó navegando */}
        {navigation?.canGoBack?.() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Icon name="chevron-left" size={22} color={colors.ink100} />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={s.title}>Consulta rápida</Text>
        {product ? (
          <TouchableOpacity onPress={limpiar} style={s.backBtn} activeOpacity={0.7}>
            <Icon name="x" size={20} color={colors.ink100} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Search bar */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Icon name="search" size={18} color={colors.fgMuted} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={t => { setQuery(t); setError(''); }}
              placeholder="Código de barras o nombre..."
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={buscar}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={limpiar}>
                <Icon name="x" size={16} color={colors.fgMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.searchBtn, (!query.trim() || loading) && s.searchBtnDisabled]}
            onPress={buscar}
            disabled={!query.trim() || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Icon name="search" size={18} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={s.scanBtn} onPress={() => setScannerOpen(true)} activeOpacity={0.8}>
            <Icon name="scan-barcode" size={20} color={colors.ink100} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Icon name="alert-triangle" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {!product && !error && !loading && (
          <View style={s.placeholder}>
            <View style={s.placeholderIcon}>
              <Icon name="scan-barcode" size={32} color={colors.fgMuted} />
            </View>
            <Text style={s.placeholderTitle}>Consultar producto</Text>
            <Text style={s.placeholderSub}>
              Escribe el código de barras o nombre del producto para ver todos sus detalles
            </Text>
          </View>
        )}

        {product && (
          <ScrollView contentContainerStyle={s.detail} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={s.hero}>
              <View style={s.heroThumb}>
                <Text style={s.heroThumbText}>
                  {product.nombre?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={s.heroName}>{product.nombre}</Text>
              {product.codigo_barras && (
                <Text style={s.heroCode}>{product.codigo_barras}</Text>
              )}
              {/* Asignar/cambiar código de barras escaneando con la cámara */}
              <TouchableOpacity style={s.assignBtn} onPress={() => setAssignOpen(true)} disabled={asignando} activeOpacity={0.8}>
                {asignando
                  ? <ActivityIndicator size="small" />
                  : <>
                      <Icon name="scan-barcode" size={15} color={colors.ink100} />
                      <Text style={s.assignBtnText}>
                        {product.codigo_barras ? 'Cambiar código con cámara' : 'Asignar código con cámara'}
                      </Text>
                    </>}
              </TouchableOpacity>
            </View>

            {/* Stock + precio */}
            <View style={s.metricsRow}>
              <DetailMetric
                label="Stock actual"
                value={String(product.stock ?? '—')}
                sub={`Mín. ${product.stock_minimo ?? '—'}`}
              />
              <DetailMetric
                label="Precio venta"
                value={fmt(product.precio_venta)}
                sub={`Compra ${fmt(product.precio_compra)}`}
              />
            </View>

            {/* Margen */}
            {margen !== null && (
              <View style={s.margenCard}>
                <View>
                  <Text style={s.margenLabel}>Margen unitario</Text>
                  <View style={s.margenRow}>
                    <Text style={s.margenPct}>{margen.toFixed(1)}%</Text>
                    <Text style={s.margenAmt}>
                      · {fmt(product.precio_venta - product.precio_compra)} por unidad
                    </Text>
                  </View>
                </View>
                <Icon name="arrow-up" size={28} color="#15803D" />
              </View>
            )}

            {/* Info rows */}
            <View style={s.infoCard}>
              <InfoRow label="Categoría" value={product.categoria?.nombre || '—'} />
              <InfoRow label="Proveedor" value={product.proveedor?.nombre || '—'} />
              {product.unidad && <InfoRow label="Unidad" value={product.unidad} />}
              {product.fecha_vencimiento && (
                <InfoRow
                  label="Vencimiento"
                  value={new Date(product.fecha_vencimiento).toLocaleDateString('es-MX')}
                  last
                />
              )}
              {!product.fecha_vencimiento && (
                <InfoRow label="Estado" value={product.activo !== false ? 'Activo' : 'Inactivo'} last />
              )}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={codigo => {
          setScannerOpen(false);
          setQuery(codigo);
          setTimeout(() => buscar(), 100);
        }}
      />

      <BarcodeScanner
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        onScanned={asignarCodigo}
      />
    </SafeAreaView>
  );
}

function DetailMetric({ label, value, sub }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricSub}>{sub}</Text>
    </View>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 46, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.ink05,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.fg },
  searchBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.4 },
  scanBtn: {
    width: 46, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, padding: 14,
    backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBd,
    borderRadius: 12,
  },
  errorText: { fontSize: 14, color: colors.danger, flex: 1 },
  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  placeholderIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.ink05, alignItems: 'center', justifyContent: 'center',
  },
  placeholderTitle: { fontSize: 17, fontWeight: '600', color: colors.ink100, textAlign: 'center' },
  placeholderSub: { fontSize: 14, color: colors.fgMuted, textAlign: 'center', lineHeight: 20 },
  detail: { padding: 16, gap: 12 },
  hero: {
    alignItems: 'center', gap: 8,
    paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  heroThumb: {
    width: 72, height: 72, borderRadius: 14,
    backgroundColor: colors.ink10, alignItems: 'center', justifyContent: 'center',
  },
  heroThumbText: { fontSize: 26, fontWeight: '600', color: colors.fgMuted },
  heroName: { fontSize: 18, fontWeight: '600', color: colors.ink100, textAlign: 'center', letterSpacing: -0.3 },
  heroCode: { fontSize: 12, color: colors.fgMuted },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9, marginTop: 6,
    backgroundColor: colors.paper,
  },
  assignBtnText: { fontSize: 13, fontWeight: '600', color: colors.ink100 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1, backgroundColor: colors.paper,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 2,
  },
  metricLabel: { fontSize: 11, fontWeight: '500', color: colors.fgMuted },
  metricValue: { fontSize: 22, fontWeight: '700', color: colors.ink100, letterSpacing: -0.5 },
  metricSub: { fontSize: 11, color: colors.fgMuted },
  margenCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#ECFDF3',
    borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 12,
  },
  margenLabel: { fontSize: 12, fontWeight: '500', color: '#15803D' },
  margenRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  margenPct: { fontSize: 22, fontWeight: '700', color: '#15803D', letterSpacing: -0.5 },
  margenAmt: { fontSize: 12, color: '#15803D' },
  infoCard: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.fgMuted },
  infoValue: { fontSize: 13, fontWeight: '500', color: colors.ink100 },
});
