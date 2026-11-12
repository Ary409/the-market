/**
 * MasScreen — Menú de administración.
 * Las pestañas de abajo guardan lo del día a día (vender, cuentas, consultar);
 * aquí vive todo lo demás para no saturar la barra inferior.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Icon } from '../../components/ui';
import { TEMAS, temaActual, guardarTema } from '../../components/theme';
import * as API from '../../api';

const MODULOS = [
  { ruta: 'Inventario',      icono: 'package',        titulo: 'Inventario',      sub: 'Productos, precios, stock y categorías' },
  { ruta: 'Compras',         icono: 'shopping-cart',  titulo: 'Compras',         sub: 'Pedidos a proveedores y recepción' },
  { ruta: 'Proveedores',     icono: 'truck',          titulo: 'Proveedores',     sub: 'Contactos, estado de cuenta y pagos' },
  { ruta: 'Reportes',        icono: 'trend-up',       titulo: 'Reportes',        sub: 'Ventas, ganancia, turnos y descargas' },
  { ruta: 'Recomendaciones', icono: 'bell',           titulo: 'Recomendaciones', sub: 'Qué reponer y qué revisar' },
  { ruta: 'Caja',            icono: 'wallet',         titulo: 'Caja',            sub: 'Abrir, cerrar e historial de turnos' },
  { ruta: 'Alertas',         icono: 'alert-triangle', titulo: 'Alertas',         sub: 'Stock bajo y productos por vencer' },
  { ruta: 'Historial',       icono: 'receipt',        titulo: 'Historial',       sub: 'Todas las ventas registradas' },
  { ruta: 'Usuarios',        icono: 'users',          titulo: 'Usuarios',        sub: 'Vendedores y accesos' },
];

export default function MasScreen({ navigation, user, onLogout }) {
  const [servidor, setServidor] = React.useState('');

  React.useEffect(() => { API.getApiUrl().then(setServidor).catch(() => {}); }, []);

  // El tema se fija cuando la app arranca, así que hay que reiniciarla.
  // Se avisa antes en lugar de que parezca que la app se cerró sola.
  function cambiarTema(tema) {
    if (tema.id === temaActual) return;
    Alert.alert(
      `Cambiar a tema ${tema.nombre}`,
      'La app se reiniciará para aplicar los colores. No se pierde nada de lo que tengas guardado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            if (!guardarTema(tema.id)) {
              Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
              return;
            }
            try {
              const Updates = require('expo-updates');
              await Updates.reloadAsync();
            } catch {
              Alert.alert(
                'Listo',
                'Cierra la app por completo y vuelve a abrirla para ver el tema nuevo.'
              );
            }
          },
        },
      ],
    );
  }

  function salir() {
    Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.nombre}>{user?.nombre}</Text>
          <Text style={s.rol}>{user?.rol === 'admin' ? 'Administrador' : 'Vendedor'}</Text>
        </View>
        <TouchableOpacity onPress={salir} style={s.salirBtn} activeOpacity={0.7}>
          <Icon name="log-out" size={15} color={colors.fgMuted} />
          <Text style={s.salirText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {MODULOS.map(m => (
          <TouchableOpacity key={m.ruta} style={s.item} activeOpacity={0.7}
            onPress={() => navigation.navigate(m.ruta)}>
            <View style={s.itemIcono}>
              <Icon name={m.icono} size={19} color={colors.ink100} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitulo}>{m.titulo}</Text>
              <Text style={s.itemSub}>{m.sub}</Text>
            </View>
            <Icon name="chevron-right" size={17} color={colors.fgMuted} />
          </TouchableOpacity>
        ))}

        <Text style={s.seccion}>Apariencia</Text>
        <View style={s.temas}>
          {TEMAS.map(t => {
            const activo = t.id === temaActual;
            return (
              <TouchableOpacity key={t.id} style={[s.tema, activo && s.temaActivo]} activeOpacity={0.7}
                onPress={() => cambiarTema(t)}>
                <View style={[s.temaMuestra, { backgroundColor: t.muestra[0], borderColor: t.muestra[1] }]}>
                  <View style={[s.temaMuestraMitad, { backgroundColor: t.muestra[1] }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.temaNombre}>{t.nombre}</Text>
                  <Text style={s.temaSub}>{t.descripcion}</Text>
                </View>
                {activo && <Icon name="check" size={17} color={colors.ink100} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.servidor}>Servidor: {servidor || '—'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink05 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
    backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  nombre: { fontSize: 17, fontWeight: '700', color: colors.ink100 },
  rol:    { fontSize: 12, color: colors.fgMuted, marginTop: 1 },
  salirBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  salirText: { fontSize: 12, fontWeight: '600', color: colors.fgMuted },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  itemIcono: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: colors.ink05,
    alignItems: 'center', justifyContent: 'center',
  },
  itemTitulo: { fontSize: 15, fontWeight: '600', color: colors.ink100 },
  itemSub:    { fontSize: 12, color: colors.fgMuted, marginTop: 1 },
  servidor:   { fontSize: 11, color: colors.fgSubtle, textAlign: 'center', marginTop: 14 },
  seccion: {
    fontSize: 11, fontWeight: '700', color: colors.fgMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8,
  },
  temas: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, overflow: 'hidden',
  },
  tema: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  temaActivo: { backgroundColor: colors.ink05 },
  temaMuestra: {
    width: 34, height: 34, borderRadius: 9, borderWidth: 1,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  temaMuestraMitad: { height: '50%', width: '100%' },
  temaNombre: { fontSize: 14, fontWeight: '600', color: colors.ink100 },
  temaSub:    { fontSize: 11, color: colors.fgMuted, marginTop: 1 },
});
