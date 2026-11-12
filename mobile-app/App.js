import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Linking, View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import AdminTabs, { VendedorTabs } from './src/navigation/index';
import EstadoConexion from './src/components/EstadoConexion';
import { colors } from './src/components/theme';
import {
  initDB, getPendingCount, getCachedProductCount, getCachedClienteCount,
  getAccionesPendientesCount,
} from './src/storage/db';
import { syncPendingSales, refreshProductCache, refreshClienteCache, refreshEspejo } from './src/storage/sync';
import { servidorDisponible } from './src/api';

export default function App() {
  const [user,         setUser]         = useState(null);
  const [ready,        setReady]        = useState(false);
  const [isOnline,     setIsOnline]     = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [cacheListo,   setCacheListo]   = useState({ productos: 0, clientes: 0 });

  // Ref para evitar sincronizaciones simultáneas
  const syncing = useRef(false);
  // Para no repetir el aviso de "sin conexión" en cada parpadeo de la señal
  const avisoOfflineMostrado = useRef(false);
  const online = useRef(true);
  const userRef = useRef(null);

  // Cuántos productos/clientes hay guardados para poder trabajar sin conexión
  const refreshCache = useCallback(async () => {
    try {
      const [productos, clientes] = await Promise.all([
        getCachedProductCount(), getCachedClienteCount(),
      ]);
      setCacheListo({ productos, clientes });
    } catch {}
  }, []);

  // ── Actualizar contador de ventas pendientes ─────────────────────────────
  // Pendientes = ventas + acciones (abonos, apertura y cierre de turno)
  const refreshPendingCount = useCallback(async () => {
    try {
      const [ventas, acciones] = await Promise.all([
        getPendingCount(), getAccionesPendientesCount(),
      ]);
      const cnt = ventas + acciones;
      setPendingCount(cnt);
      return cnt;
    } catch { return 0; }
  }, []);

  // ── Sincronizar: subir lo guardado y refrescar catálogos ─────────────────
  const runSync = useCallback(async (avisar = false) => {
    if (syncing.current) return;
    syncing.current = true;
    const antes = await refreshPendingCount();
    if (antes > 0) setSincronizando(true);
    try {
      const res = await syncPendingSales();
      await refreshProductCache();
      await refreshClienteCache();
      await refreshEspejo({ esAdmin: userRef.current?.rol === 'admin' });
      await refreshCache();
      const quedan = await refreshPendingCount();

      // Confirmarle al vendedor que su trabajo ya quedó en el sistema
      if (avisar && antes > 0) {
        if (res.synced > 0 && res.failed === 0) {
          Alert.alert(
            'Trabajo sincronizado',
            `Se subieron ${res.synced} registro${res.synced !== 1 ? 's' : ''} al sistema ` +
            '(ventas, cobros y movimientos de caja). Ya aparecen en la computadora.'
          );
        } else if (res.failed > 0) {
          // Si la sesión venció mientras estaba sin conexión, hay que volver a
          // entrar: si no, todo lo guardado fallaría en silencio para siempre.
          const sesionVencida = (res.detalle || [])
            .some(d => /token|expirado|autenticad|credencial/i.test(d.error || ''));

          if (sesionVencida) {
            Alert.alert(
              'Vuelve a iniciar sesión',
              'Tu sesión venció mientras trabajabas sin conexión.\n\n' +
              `Las ${res.failed} operaciones siguen guardadas en el teléfono y NO se han perdido: ` +
              'vuelve a entrar con tu contraseña y se subirán solas.',
              [{ text: 'Entendido' }]
            );
          } else {
            const lista = (res.detalle || []).slice(0, 3)
              .map(d => `· ${d.etiqueta}: ${d.error}`).join('\n');
            Alert.alert(
              'Quedaron registros sin subir',
              `Se subieron ${res.synced}, pero ${res.failed} fallaron y siguen guardados en el teléfono.\n\n` +
              (lista ? lista + '\n\n' : '') +
              'Se reintentará solo; si continúa, avisa al administrador.'
            );
          }
        }
      }
      return quedan;
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      syncing.current = false;
      setSincronizando(false);
    }
  }, [refreshPendingCount, refreshCache]);

  // ── Manejar deeplink themarket://setup?s=URL ─────────────────────────────
  async function handleDeepLink(url) {
    if (!url) return;
    try {
      // Formato: themarket://setup?s=http://192.168.0.2:8000
      if (url.includes('themarket://setup') || url.includes('themarket://')) {
        const match = url.match(/[?&]s=([^&]+)/);
        if (match) {
          const serverUrl = decodeURIComponent(match[1]).replace(/\/$/, '');
          await AsyncStorage.setItem('api_url', serverUrl);
          Alert.alert('Servidor configurado', `La app se conectará a ${serverUrl}`);
        }
      }
    } catch {}
  }

  // ── Inicialización: sesión + base de datos local ──────────────────────────
  useEffect(() => {
    async function init() {
      // Restaurar sesión
      try {
        const [[, token], [, userStr]] = await AsyncStorage.multiGet(['token', 'user']);
        if (token && userStr) {
          const u = JSON.parse(userStr);
          setUser(u);
          userRef.current = u;
        }
      } catch {}

      // Inicializar SQLite
      try {
        await initDB();
      } catch (e) {
        console.warn('DB init error:', e);
      }

      // Manejar deeplink inicial (si la app se abrió desde un QR)
      try {
        const url = await Linking.getInitialURL();
        await handleDeepLink(url);
      } catch {}

      // Actualizar contador de pendientes y estado de la caché
      await refreshPendingCount();
      await refreshCache();

      setReady(true);

      // Cargar cachés y el espejo en segundo plano (no bloquea la UI)
      refreshProductCache().then(refreshCache).catch(() => {});
      refreshClienteCache().then(refreshCache).catch(() => {});
      refreshEspejo({ esAdmin: userRef.current?.rol === 'admin' }).catch(() => {});
    }
    init();

    // Escuchar deeplinks mientras la app está abierta
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [refreshPendingCount, refreshCache]);

  // ── Monitor de conexión CON EL SERVIDOR ───────────────────────────────────
  // Lo que importa no es si hay internet, sino si responde el servidor de la
  // tienda: vive en la red local, así que un WiFi sin internet sirve igual.
  const aplicarEstado = useCallback((conectado) => {
    const antes = online.current;
    online.current = conectado;
    setIsOnline(conectado);

    if (antes && !conectado && !avisoOfflineMostrado.current) {
      avisoOfflineMostrado.current = true;
      Alert.alert(
        'Sin conexión con el sistema',
        'Puedes seguir cobrando con normalidad.\n\n' +
        'Las ventas de este turno se guardan en el teléfono y se suben solas ' +
        'en cuanto vuelva la conexión. No cierres la sesión hasta que se hayan subido.',
        [{ text: 'Entendido' }]
      );
    }
    if (!antes && conectado) {
      avisoOfflineMostrado.current = false;
      runSync(true);
    }
  }, [runSync]);

  const comprobarServidor = useCallback(async () => {
    aplicarEstado(await servidorDisponible());
  }, [aplicarEstado]);

  useEffect(() => {
    if (!ready) return;
    comprobarServidor();

    // Cambio de red (WiFi/datos) → volver a comprobar de inmediato
    const unsub = NetInfo.addEventListener(state => {
      if (!state.isConnected) { aplicarEstado(false); return; }
      comprobarServidor();
    });

    // Sondeo: rápido si estamos caídos (para volver pronto), lento si todo va bien
    const timer = setInterval(() => {
      comprobarServidor();
    }, online.current ? 45000 : 10000);

    return () => { unsub(); clearInterval(timer); };
  }, [ready, comprobarServidor, aplicarEstado, isOnline]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  function handleLogin(userData) {
    setUser(userData);
    userRef.current = userData;
    // Al loguearse, refrescar cachés y subir lo que haya quedado pendiente
    refreshProductCache().catch(() => {});
    refreshClienteCache().catch(() => {});
    refreshEspejo({ esAdmin: userData.rol === 'admin' }).catch(() => {});
    runSync(false);
  }

  async function handleLogout() {
    // No dejar que se pierda el rastro de ventas sin subir
    const pendientes = await refreshPendingCount();
    if (pendientes > 0) {
      Alert.alert(
        'Tienes ventas sin subir',
        `Hay ${pendientes} venta${pendientes !== 1 ? 's' : ''} guardada${pendientes !== 1 ? 's' : ''} en este teléfono. ` +
        'Si cierras sesión seguirán guardadas, pero conviene esperar a tener conexión para que se suban.',
        [
          { text: 'Esperar', style: 'cancel' },
          {
            text: 'Cerrar sesión igual',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.multiRemove(['token', 'user']);
              setUser(null);
            },
          },
        ]
      );
      return;
    }
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
  }

  // ── Splash ────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <View style={s.splash}>
        <ActivityIndicator color={colors.ink100} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ConBarraDeConexion
        isOnline={isOnline}
        pendientes={pendingCount}
        sincronizando={sincronizando}
        cacheListo={cacheListo}
        onReintentar={() => { comprobarServidor(); runSync(true); }}
      >
        <NavigationContainer>
          {user.rol === 'vendedor'
            ? <VendedorTabs
                user={user}
                onLogout={handleLogout}
                isOnline={isOnline}
                pendingCount={pendingCount}
                onSaleQueued={refreshPendingCount}
              />
            : <AdminTabs
                user={user}
                onLogout={handleLogout}
                isOnline={isOnline}
                pendingCount={pendingCount}
                onSaleQueued={refreshPendingCount}
              />}
        </NavigationContainer>
      </ConBarraDeConexion>
    </SafeAreaProvider>
  );
}

/**
 * Coloca la barra de conexión encima de toda la app.
 * La barra absorbe el margen superior del teléfono (muesca) y les pasa a las
 * pantallas un margen superior de 0, para que no quede un hueco doble.
 */
function ConBarraDeConexion({ isOnline, pendientes, sincronizando, cacheListo, onReintentar, children }) {
  const insets  = useSafeAreaInsets();
  const visible = !isOnline || pendientes > 0 || sincronizando;

  if (!visible) return children;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingTop: insets.top }}>
        <EstadoConexion
          isOnline={isOnline}
          pendientes={pendientes}
          sincronizando={sincronizando}
          cacheListo={cacheListo}
          onReintentar={onReintentar}
        />
      </View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
