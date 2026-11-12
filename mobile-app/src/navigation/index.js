import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../components/theme';
import Icon from '../components/Icon';

import DashboardScreen       from '../screens/admin/DashboardScreen';
import AlertasScreen         from '../screens/admin/AlertasScreen';
import ConsultaScreen        from '../screens/admin/ConsultaScreen';
import HistorialScreen       from '../screens/admin/HistorialScreen';
import InventarioScreen      from '../screens/admin/InventarioScreen';
import ComprasScreen         from '../screens/admin/ComprasScreen';
import ProveedoresScreen     from '../screens/admin/ProveedoresScreen';
import ReportesScreen        from '../screens/admin/ReportesScreen';
import RecomendacionesScreen from '../screens/admin/RecomendacionesScreen';
import CajaScreen            from '../screens/admin/CajaScreen';
import UsuariosScreen        from '../screens/admin/UsuariosScreen';
import MasScreen             from '../screens/admin/MasScreen';
import POSScreen             from '../screens/vendedor/POSScreen';
import CuentasScreen         from '../screens/CuentasScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Los estilos se definen ANTES de tabOpts: ambos se evalúan al cargar el módulo
// y si el StyleSheet quedara abajo, tabOpts leería `undefined`.
const t = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 84,
    paddingBottom: 24,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  badge: {
    position: 'absolute',
    top: -3, right: -8,
    minWidth: 16, height: 16, paddingHorizontal: 4,
    borderRadius: 8, backgroundColor: '#D97706',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.paper,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

const tabOpts = {
  headerShown: false,
  tabBarStyle: t.tabBar,
  tabBarActiveTintColor: colors.ink100,
  tabBarInactiveTintColor: colors.fgMuted,
  tabBarLabelStyle: t.tabLabel,
};

function TabIcon({ name, focused, alertCount }) {
  const color = focused ? colors.ink100 : colors.fgMuted;
  return (
    <View style={{ alignItems: 'center' }}>
      <Icon name={name} size={22} color={color} />
      {alertCount > 0 && (
        <View style={t.badge}>
          <Text style={t.badgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
        </View>
      )}
    </View>
  );
}

// ── Stack de administración (todo lo que cuelga de "Más") ────────────────────

function MasStack({ user, onLogout, isOnline }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MasHome">
        {props => <MasScreen {...props} user={user} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="Inventario"      component={InventarioScreen} />
      <Stack.Screen name="Compras"         component={ComprasScreen} />
      <Stack.Screen name="Proveedores"     component={ProveedoresScreen} />
      <Stack.Screen name="Reportes"        component={ReportesScreen} />
      <Stack.Screen name="Recomendaciones" component={RecomendacionesScreen} />
      <Stack.Screen name="Caja"            component={CajaScreen} />
      <Stack.Screen name="Alertas">
        {props => <AlertasScreen {...props} isOnline={isOnline} />}
      </Stack.Screen>
      <Stack.Screen name="Historial">
        {props => <HistorialScreen {...props} isOnline={isOnline} />}
      </Stack.Screen>
      <Stack.Screen name="Usuarios">
        {props => <UsuariosScreen {...props} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function DashboardStack({ user, isOnline }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome">
        {props => <DashboardScreen {...props} user={user} isOnline={isOnline} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ── Vendedor: vender, cuentas, consultar e historial propio ──────────────────
export function VendedorTabs({ user, onLogout, isOnline = true, pendingCount = 0, onSaleQueued }) {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen
        name="POS"
        options={{
          tabBarLabel: 'Cobrar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="shopping-cart" focused={focused} alertCount={!isOnline ? pendingCount : 0} />
          ),
        }}
      >
        {props => (
          <POSScreen {...props} user={user} onLogout={onLogout}
            isOnline={isOnline} pendingCount={pendingCount} onSaleQueued={onSaleQueued} />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Cuentas"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} /> }}
      >
        {props => <CuentasScreen {...props} isOnline={isOnline} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Consulta"
        options={{
          tabBarLabel: 'Consultar',
          tabBarIcon: ({ focused }) => <TabIcon name="scan-barcode" focused={focused} />,
        }}
      >
        {props => <ConsultaScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Historial"
        component={HistorialScreen}
        options={{
          tabBarLabel: 'Mis ventas',
          tabBarIcon: ({ focused }) => <TabIcon name="receipt" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Admin: todo el sistema ───────────────────────────────────────────────────
export default function AdminTabs({ user, onLogout, alertCount = 0, isOnline = true, pendingCount = 0, onSaleQueued }) {
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen
        name="Inicio"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="layout-dashboard" focused={focused} /> }}
      >
        {props => <DashboardStack {...props} user={user} isOnline={isOnline} />}
      </Tab.Screen>

      <Tab.Screen
        name="Cobrar"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="shopping-cart" focused={focused} alertCount={!isOnline ? pendingCount : 0} />
          ),
        }}
      >
        {props => (
          <POSScreen {...props} user={user} onLogout={onLogout}
            isOnline={isOnline} pendingCount={pendingCount} onSaleQueued={onSaleQueued} />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Cuentas"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} /> }}
      >
        {props => <CuentasScreen {...props} isOnline={isOnline} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Consulta"
        options={{
          tabBarLabel: 'Consultar',
          tabBarIcon: ({ focused }) => <TabIcon name="scan-barcode" focused={focused} />,
        }}
      >
        {props => <ConsultaScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Mas"
        options={{
          tabBarLabel: 'Más',
          tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} alertCount={alertCount} />,
          // Al salir de la pestaña se vuelve a su menú: si no, al regresar
          // reaparecía la última pantalla abierta (p. ej. Alertas).
          popToTopOnBlur: true,
        }}
      >
        {props => <MasStack {...props} user={user} onLogout={onLogout} isOnline={isOnline} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
