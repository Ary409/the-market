/**
 * EstadoConexion — Le dice al vendedor, en todo momento, si sus ventas están
 * yendo al servidor o quedándose guardadas en el teléfono.
 *
 * El mensaje completo aparece unos segundos y luego se encoge a una franja
 * delgada: informa sin estorbar el resto del turno.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from './theme';
import Icon from './Icon';

const SEGUNDOS_EXPANDIDA = 10;

export default function EstadoConexion({
  isOnline, pendientes = 0, sincronizando, onReintentar, cacheListo,
}) {
  const [expandida, setExpandida] = React.useState(true);
  const anim = React.useRef(new Animated.Value(0)).current;

  // Cada vez que cambia el estado, se vuelve a mostrar completo y se encoge solo
  React.useEffect(() => {
    setExpandida(true);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    const t = setTimeout(() => setExpandida(false), SEGUNDOS_EXPANDIDA * 1000);
    return () => clearTimeout(t);
  }, [isOnline, sincronizando, pendientes, anim]);

  // Todo en orden y nada pendiente → no estorbar con avisos
  if (isOnline && pendientes === 0 && !sincronizando) return null;

  const estiloAnim = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
  };

  // ── Sin conexión con el servidor ──────────────────────────────────────────
  if (!isOnline) {
    const listo = (cacheListo?.productos ?? 0) > 0;
    if (!expandida) {
      return (
        <TouchableOpacity onPress={() => setExpandida(true)} activeOpacity={0.8}>
          <View style={[s.franja, s.offline]}>
            <Icon name="wifi-off" size={12} color="#92400E" />
            <Text style={s.franjaTexto}>
              Sin conexión{pendientes > 0 ? ` · ${pendientes} venta${pendientes !== 1 ? 's' : ''} guardada${pendientes !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <Animated.View style={[s.barra, s.offline, estiloAnim]}>
        <Icon name="wifi-off" size={15} color="#92400E" />
        <View style={{ flex: 1 }}>
          <Text style={s.textoOffline}>
            <Text style={s.negrita}>Sin conexión con el sistema.</Text>{' '}
            {pendientes > 0
              ? `${pendientes} venta${pendientes !== 1 ? 's' : ''} guardada${pendientes !== 1 ? 's' : ''} en el teléfono; se suben solas al reconectar.`
              : 'Sigue vendiendo: todo se guarda aquí y se sube al reconectar.'}
          </Text>
          <Text style={s.subOffline}>
            {listo
              ? `${cacheListo.productos} productos y ${cacheListo.clientes ?? 0} clientes disponibles sin conexión`
              : 'Aún no hay productos guardados en el teléfono — conéctate una vez para poder vender sin señal'}
          </Text>
        </View>
        <TouchableOpacity onPress={onReintentar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.accion}>Reintentar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Subiendo lo guardado ──────────────────────────────────────────────────
  if (sincronizando) {
    return (
      <Animated.View style={[s.barra, s.sync, estiloAnim]}>
        <ActivityIndicator size="small" color="#1D4ED8" style={{ transform: [{ scale: 0.7 }] }} />
        <Text style={s.textoSync} numberOfLines={1}>
          Subiendo {pendientes} venta{pendientes !== 1 ? 's' : ''} al sistema…
        </Text>
      </Animated.View>
    );
  }

  // ── Hay conexión pero quedaron ventas sin subir ───────────────────────────
  if (!expandida) {
    return (
      <TouchableOpacity onPress={onReintentar} activeOpacity={0.8}>
        <View style={[s.franja, s.offline]}>
          <Icon name="alert-triangle" size={12} color="#92400E" />
          <Text style={s.franjaTexto}>{pendientes} sin subir · toca para reintentar</Text>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <Animated.View style={[s.barra, s.offline, estiloAnim]}>
      <Icon name="alert-triangle" size={15} color="#92400E" />
      <Text style={[s.textoOffline, { flex: 1 }]}>
        <Text style={s.negrita}>{pendientes} venta{pendientes !== 1 ? 's' : ''} sin subir.</Text>{' '}
        Se reintentará solo.
      </Text>
      <TouchableOpacity onPress={onReintentar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={s.accion}>Reintentar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  franja: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 4, borderBottomWidth: 1,
  },
  franjaTexto: { fontSize: 10.5, fontWeight: '700', color: '#92400E' },
  offline: { backgroundColor: colors.warningBg, borderBottomColor: colors.warningBd },
  sync:    { backgroundColor: '#EFF6FF',        borderBottomColor: '#BFDBFE' },
  textoOffline: { fontSize: 11.5, color: '#92400E', lineHeight: 16 },
  subOffline:   { fontSize: 10.5, color: '#B45309', marginTop: 2 },
  textoSync:    { flex: 1, fontSize: 11.5, color: '#1D4ED8' },
  negrita:      { fontWeight: '700' },
  accion:       { fontSize: 11.5, fontWeight: '700', color: '#92400E', textDecorationLine: 'underline' },
});
