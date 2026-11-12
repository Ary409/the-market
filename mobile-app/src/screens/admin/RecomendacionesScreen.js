/**
 * RecomendacionesScreen — Sugerencias que el sistema genera al cerrar caja.
 * (Reponer, pedir, revisar productos sin movimiento…)
 */
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  Screen, Btn, Empty, Cargando, Picker, fmt, colors, Icon,
} from '../../components/ui';
import * as API from '../../api';

const TIPO = {
  reponer_urgente:         { label: 'Reponer ya',     color: colors.danger },
  realizar_pedido:         { label: 'Hacer pedido',   color: colors.warning },
  aumentar_inventario:     { label: 'Subir inventario', color: colors.warning },
  revisar_producto:        { label: 'Revisar',        color: colors.fgMuted },
  considerar_descontinuar: { label: 'Poco movimiento', color: colors.fgMuted },
};

export default function RecomendacionesScreen({ navigation }) {
  const [lista,    setLista]    = useState([]);
  const [estado,   setEstado]   = useState('pendiente');
  const [cargando, setCargando] = useState(true);
  const [busy,     setBusy]     = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setLista(await API.getRecomendaciones(estado) || []); }
    catch { setLista([]); }
    finally { setCargando(false); }
  }, [estado]);

  React.useEffect(() => { cargar(); }, [cargar]);

  async function marcar(rec, nuevoEstado) {
    setBusy(rec.id);
    try { await API.updateRecomendacion(rec.id, nuevoEstado); cargar(); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(null); }
  }

  async function regenerar() {
    setCargando(true);
    try {
      const r = await API.generarRecomendaciones();
      Alert.alert('Listo', `${r.nuevas} nueva(s) · ${r.resueltas_auto} resuelta(s) automáticamente`);
      cargar();
    } catch (e) { Alert.alert('Error', e.message); setCargando(false); }
  }

  return (
    <Screen
      title="Recomendaciones"
      onBack={navigation ? () => navigation.goBack() : undefined}
      right={
        <TouchableOpacity onPress={regenerar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.link}>Actualizar</Text>
        </TouchableOpacity>
      }
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Picker value={estado} onChange={setEstado} options={[
          { value: 'pendiente',  label: 'Pendientes' },
          { value: 'atendida',   label: 'Atendidas' },
          { value: 'descartada', label: 'Descartadas' },
        ]} />
      </View>

      {cargando && !lista.length ? <Cargando /> : (
        <FlatList
          data={lista}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          renderItem={({ item }) => {
            const meta = TIPO[item.tipo] || { label: item.tipo, color: colors.fgMuted };
            return (
              <View style={s.card}>
                <View style={[s.tag, { backgroundColor: meta.color + '18', borderColor: meta.color + '55' }]}>
                  <Text style={[s.tagText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={s.mensaje}>{item.mensaje}</Text>
                {estado === 'pendiente' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Btn size="sm" variant="secondary" flex={1} busy={busy === item.id}
                      onPress={() => marcar(item, 'atendida')}>Ya lo hice</Btn>
                    <Btn size="sm" variant="secondary" flex={1} busy={busy === item.id}
                      onPress={() => marcar(item, 'descartada')}>Descartar</Btn>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Empty icon="check" titulo="Nada pendiente"
            texto="El sistema genera sugerencias cada vez que cierras la caja." />}
          refreshing={cargando}
          onRefresh={cargar}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  link: { fontSize: 13, fontWeight: '600', color: colors.ink100 },
  card: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  tag: {
    alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  mensaje: { fontSize: 14, color: colors.fg, lineHeight: 20 },
});
