/**
 * ReportesScreen — Los números del negocio en el celular.
 * Ventas y ganancia por hoy/semana/mes, gráfica por día, más vendidos,
 * turnos de caja y descarga/compartir de PDF y CSV.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  Screen, Btn, Row, Picker, Empty, Cargando, Stat, Seccion, ErrorBox,
  fmt, fmtCant, fmtFecha, colors, Icon,
} from '../../components/ui';
import * as API from '../../api';
import * as Offline from '../../storage/offline';

export default function ReportesScreen({ navigation, isOnline = true }) {
  const [dias,      setDias]      = useState('7');
  const [data,      setData]      = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [tab,       setTab]       = useState('resumen');
  const [bajando,   setBajando]   = useState('');
  const [deEspejo,  setDeEspejo]  = useState(false);
  const [actualizado, setActualizado] = useState(null);
  const [error,     setError]     = useState('');

  const rango = useCallback(() => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - (parseInt(dias) - 1));
    desde.setHours(0, 0, 0, 0);
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }, [dias]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // Sin conexión se muestra la última copia descargada, con su hora
      const [analitica, top, ganancia] = await Promise.all([
        Offline.getAnalitica(isOnline, Math.max(parseInt(dias), 7)),
        Offline.getTopProductos(isOnline),
        Offline.getGanancia(isOnline),
      ]);
      setData({ analitica: analitica.datos, top: top.datos, ganancia: ganancia.datos });
      setDeEspejo(analitica.deEspejo);
      setActualizado(analitica.actualizado);
      setError('');
    } catch (e) {
      setData(null);
      setError(e.message || 'No se pudieron cargar los reportes');
    }
    finally { setCargando(false); }
  }, [dias, isOnline]);

  React.useEffect(() => { cargar(); }, [cargar]);

  async function descargar(tipo) {
    setBajando(tipo);
    try {
      if (tipo === 'pdf')       await API.compartirVentasPDF(rango());
      if (tipo === 'csv')       await API.compartirVentasCSV(rango());
      if (tipo === 'inventario') await API.compartirInventarioCSV();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBajando(''); }
  }

  if (cargando && !data) {
    return <Screen title="Reportes" onBack={navigation ? () => navigation.goBack() : undefined}><Cargando /></Screen>;
  }

  const a = data?.analitica;

  return (
    <Screen title="Reportes" onBack={navigation ? () => navigation.goBack() : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ErrorBox>{error}</ErrorBox>
        {deEspejo && (
          <View style={s.espejoAviso}>
            <Icon name="clock" size={14} color="#92400E" />
            <Text style={s.espejoTexto}>
              Copia guardada en el teléfono · {Offline.desdeCuando(actualizado)}.
              Al reconectar se actualiza con lo más reciente.
            </Text>
          </View>
        )}
        <Picker value={dias} onChange={setDias} options={[
          { value: '1',  label: 'Hoy' },
          { value: '7',  label: '7 días' },
          { value: '30', label: '30 días' },
          { value: '90', label: '3 meses' },
        ]} />

        {/* Hoy / semana / mes */}
        {a && (
          <View style={{ gap: 10 }}>
            {[
              ['Hoy', a.hoy], ['Esta semana', a.semana], ['Este mes', a.mes],
            ].map(([label, d]) => (
              <View key={label} style={s.periodo}>
                <View style={{ flex: 1 }}>
                  <Text style={s.periodoLabel}>{label}</Text>
                  <Text style={s.periodoVentas}>{fmt(d.ventas)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.periodoGanancia}>Ganancia {fmt(d.ganancia)}</Text>
                  <Text style={s.periodoTx}>{d.transacciones} venta{d.transacciones !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pestañas */}
        <View style={s.tabs}>
          {[
            { id: 'resumen', label: 'Por día' },
            { id: 'top',     label: 'Más vendidos' },
            { id: 'turnos',  label: 'Turnos' },
          ].map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={[s.tab, tab === t.id && s.tabOn]} activeOpacity={0.8}>
              <Text style={[s.tabText, tab === t.id && s.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'resumen' && <SerieDiaria serie={a?.serie_diaria || []} />}
        {tab === 'top'     && <TopProductos top={data?.top || []} ganancia={data?.ganancia} />}
        {tab === 'turnos'  && <Turnos turnos={a?.turnos || []} />}

        <Seccion>Descargar</Seccion>
        <View style={{ gap: 8 }}>
          <Btn icon="receipt" onPress={() => descargar('pdf')} busy={bajando === 'pdf'}>
            Reporte de ventas (PDF)
          </Btn>
          <Btn variant="secondary" onPress={() => descargar('csv')} busy={bajando === 'csv'}>
            Ventas en Excel (CSV)
          </Btn>
          <Btn variant="secondary" onPress={() => descargar('inventario')} busy={bajando === 'inventario'}>
            Inventario completo (CSV)
          </Btn>
        </View>
        <Text style={s.nota}>
          Al descargar se abre la hoja de compartir: puedes mandarlo por WhatsApp, correo o guardarlo.
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

// ── Gráfica de barras por día ────────────────────────────────────────────────

function SerieDiaria({ serie }) {
  if (!serie.length) return <Empty icon="trend-up" titulo="Sin ventas" texto="No hay ventas en este período." />;
  const max = Math.max(...serie.map(d => d.ventas), 1);
  const ultimos = serie.slice(-14);

  return (
    <View>
      <View style={s.grafica}>
        {ultimos.map((d, i) => {
          const alto = Math.max((d.ventas / max) * 100, 2);
          const esUltimo = i === ultimos.length - 1;
          const dia = new Date(d.fecha + 'T12:00:00');
          return (
            <View key={d.fecha} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                <View style={[s.barra, { height: `${alto}%` }, esUltimo && { backgroundColor: colors.ink100 }]} />
              </View>
              <Text style={[s.barraLabel, esUltimo && { color: colors.ink100, fontWeight: '700' }]}>
                {dia.toLocaleDateString('es', { day: 'numeric' })}
              </Text>
            </View>
          );
        })}
      </View>
      {ultimos.slice().reverse().map(d => (
        <Row key={d.fecha}
          titulo={new Date(d.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}
          sub={`${d.transacciones} venta${d.transacciones !== 1 ? 's' : ''} · ganancia ${fmt(d.ganancia)}`}
          derecha={fmt(d.ventas)}
        />
      ))}
    </View>
  );
}

function TopProductos({ top, ganancia }) {
  if (!top.length) return <Empty icon="package" titulo="Sin datos" texto="No hay ventas en este período." />;
  const max = Math.max(...top.map(p => p.unidades), 1);
  return (
    <View>
      {ganancia && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Stat label="Ingresos" valor={fmt(ganancia.total_ingresos)} />
          <Stat label="Ganancia" valor={fmt(ganancia.total_ganancia)} color={colors.success} />
          <Stat label="Margen" valor={`${(ganancia.margen_promedio || 0).toFixed(0)}%`} />
        </View>
      )}
      {top.map((p, i) => (
        <View key={p.id} style={s.topItem}>
          <Text style={s.topPos}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.topNombre} numberOfLines={1}>{p.nombre}</Text>
            <View style={s.topBarraFondo}>
              <View style={[s.topBarra, { width: `${(p.unidades / max) * 100}%` }]} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.topUnidades}>{fmtCant(p.unidades)} uds</Text>
            <Text style={s.topIngresos}>{fmt(p.ingresos)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Turnos({ turnos }) {
  if (!turnos.length) return <Empty icon="wallet" titulo="Sin turnos" texto="Aún no se han abierto cajas." />;
  return (
    <View>
      {turnos.map(t => (
        <Row key={t.id}
          titulo={`S-${String(t.id).padStart(4, '0')} · ${t.usuario}`}
          sub={`${fmtFecha(t.apertura, true)} → ${t.cierre ? fmtFecha(t.cierre, true) : 'abierta'}`}
          badge={t.estado}
          badgeColor={t.estado === 'abierta' ? colors.success : undefined}
          derecha={fmt(t.total_ventas)}
          subDerecha={`${t.transacciones} tx${t.diferencia != null ? ` · dif ${t.diferencia >= 0 ? '+' : ''}${fmt(t.diferencia)}` : ''}`}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  periodo: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14,
  },
  periodoLabel:    { fontSize: 12, color: colors.fgMuted },
  periodoVentas:   { fontSize: 22, fontWeight: '800', color: colors.ink100, letterSpacing: -0.5 },
  periodoGanancia: { fontSize: 13, fontWeight: '700', color: colors.success },
  periodoTx:       { fontSize: 11, color: colors.fgMuted, marginTop: 2 },

  tabs: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 12 },
  tab: {
    flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper,
  },
  tabOn:     { backgroundColor: colors.ink100, borderColor: colors.ink100 },
  tabText:   { fontSize: 12, fontWeight: '600', color: colors.fgMuted },
  tabTextOn: { color: '#fff' },

  grafica: {
    flexDirection: 'row', gap: 4, height: 130, marginBottom: 14,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12,
  },
  barra:      { width: '100%', backgroundColor: colors.ink20, borderRadius: 3 },
  barraLabel: { fontSize: 9, color: colors.fgMuted },

  topItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  topPos:       { fontSize: 12, fontWeight: '700', color: colors.fgSubtle, width: 16 },
  topNombre:    { fontSize: 13, fontWeight: '600', color: colors.ink100, marginBottom: 5 },
  topBarraFondo:{ height: 6, backgroundColor: colors.ink05, borderRadius: 3, overflow: 'hidden' },
  topBarra:     { height: '100%', backgroundColor: colors.ink100, borderRadius: 3 },
  topUnidades:  { fontSize: 12, fontWeight: '700', color: colors.ink100 },
  topIngresos:  { fontSize: 11, color: colors.fgMuted },

  nota: { fontSize: 11, color: colors.fgMuted, marginTop: 10, textAlign: 'center', lineHeight: 16 },
  espejoAviso: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBd,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12,
  },
  espejoTexto: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 15 },
});
