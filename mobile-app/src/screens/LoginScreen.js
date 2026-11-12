import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../components/theme';
import Icon from '../components/Icon';
import * as API from '../api';
import * as Sesion from '../storage/sesion';
import { VERSION, NOVEDADES, fechaDelPaquete } from '../version';
import BarcodeScanner from '../components/BarcodeScanner';

export default function LoginScreen({ onLogin }) {
  const [apiUrl,      setApiUrl]      = useState('http://192.168.1.1:8000');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showCfg,     setShowCfg]     = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [qrSaved,     setQrSaved]     = useState(false);
  const [entroSinConexion, setEntroSinConexion] = useState(false);
  const [correosGuardados, setCorreosGuardados] = useState([]);
  const [estado,      setEstado]      = useState('');

  // Restaurar URL guardada y ver quién puede entrar sin conexión
  useEffect(() => {
    API.getApiUrl().then(url => { if (url) setApiUrl(url); });
    Sesion.correosRecordados().then(setCorreosGuardados).catch(() => {});
  }, []);

  // "Network request failed" significa que no se alcanzó el servidor,
  // no que las credenciales estén mal.
  const noHuboServidor = (msg = '') => /network|failed to fetch|timeout|abort/i.test(String(msg));

  /** Entrar con la credencial guardada en este teléfono. */
  async function entrarLocal() {
    const { usuario, token } = await Sesion.entrarSinConexion(email, password);
    if (token) await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(usuario));
    setEntroSinConexion(true);
    onLogin(usuario);
  }

  async function handleLogin() {
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    setError('');
    setEntroSinConexion(false);
    try {
      await API.setApiUrl(apiUrl);

      // Preguntar primero si el servidor está: así no se espera al fetch del
      // login, que puede tardar mucho cuando no hay nadie del otro lado.
      setEstado('Buscando el servidor…');
      if (!(await API.servidorDisponible(4000))) {
        setEstado('Sin servidor · entrando con los datos del teléfono');
        await entrarLocal();
        return;
      }

      setEstado('Verificando tu contraseña…');
      const data = await API.login(email, password);
      const usuario = { id: data.user_id, nombre: data.nombre, rol: data.rol };

      await AsyncStorage.setItem('token', data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(usuario));

      // Guardar la llave para poder volver a entrar aunque se caiga la red.
      // Va aparte: si esto fallara, NO debe impedir un inicio de sesión válido.
      try {
        await Sesion.recordarAcceso(email, password, usuario, data.access_token);
      } catch (errGuardar) {
        console.warn('No se pudo guardar el acceso sin conexión:', errGuardar?.message);
      }

      onLogin(usuario);
    } catch (e) {
      if (noHuboServidor(e.message)) {
        // Se cayó durante el intento: probar con lo guardado
        try { await entrarLocal(); return; }
        catch (offlineErr) { setError(offlineErr.message); }
      } else {
        // El servidor respondió y rechazó: contraseña mala, usuario inactivo…
        setError(e.message || 'No se pudo iniciar sesión');
      }
    } finally {
      setEstado('');
      setLoading(false);
    }
  }

  // Cuando se escanea el QR de configuración de servidor
  async function handleQrScanned(data) {
    setScanning(false);
    try {
      let serverUrl = data;

      // Rechazar QR de Expo Go — el usuario escaneó el QR equivocado
      if (data.startsWith('exp://') || data.includes('u.expo.dev') || data.includes('expo.dev')) {
        setError('Ese es el QR para abrir la app, no el del servidor.\nEscanea el QR del Paso 3 (el que muestra la IP de la PC).');
        return;
      }

      // Formato themarket://setup?s=http://...
      if (data.startsWith('themarket://')) {
        const match = data.match(/[?&]s=([^&]+)/);
        if (match) serverUrl = decodeURIComponent(match[1]);
      }

      // Normalizar URL
      serverUrl = serverUrl.replace(/\/$/, '');
      if (!serverUrl.startsWith('http')) serverUrl = `http://${serverUrl}`;

      // Validar que parece una URL de servidor real (IP o hostname + puerto)
      const looksLikeServer = /^https?:\/\/[\d.a-zA-Z\-]+(:\d+)?(\/.*)?$/.test(serverUrl);
      if (!looksLikeServer) {
        setError('QR no reconocido. Escanea el QR del servidor (Paso 3 en la pantalla de la PC).');
        return;
      }

      await API.setApiUrl(serverUrl);
      setApiUrl(serverUrl);
      setQrSaved(true);
      setError('');
      setTimeout(() => setQrSaved(false), 3000);
    } catch {}
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={s.brand}>
          <View style={s.logoBox}>
            <Text style={s.logoMark}>M</Text>
          </View>
          <Text style={s.appName}>the market</Text>
          {/* Sello de versión: sin él es imposible saber si el teléfono ya
              recibió los cambios o sigue con un paquete viejo en caché */}
          <View style={s.versionChip}>
            <Text style={s.versionTexto}>v{VERSION}</Text>
          </View>
        </View>

        <View style={s.heading}>
          <Text style={s.title}>Ingresa a tu cuenta</Text>
          <Text style={s.subtitle}>Continúa para administrar tu negocio</Text>
        </View>

        {/* Campos de credenciales */}
        <View style={s.fields}>
          <View>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            <Text style={s.fieldLabel}>Contraseña</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[s.input, error ? s.inputError : null]}
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                placeholder="Tu contraseña"
                secureTextEntry={!showPwd}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name={showPwd ? 'eye-off' : 'eye'} size={19} color={colors.fgMuted} />
              </TouchableOpacity>
            </View>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
          </View>

          {/* Diagnóstico honesto: decir si este teléfono ya puede entrar sin red */}
          {correosGuardados.length > 0 ? (
            <View style={s.offlineNota}>
              <Icon name="check" size={13} color="#15803D" />
              <Text style={[s.offlineNotaTexto, { color: '#15803D' }]}>
                Listo para entrar sin conexión: {correosGuardados.join(', ')}
              </Text>
            </View>
          ) : (
            <View style={s.offlineNota}>
              <Icon name="wifi-off" size={13} color="#92400E" />
              <Text style={s.offlineNotaTexto}>
                Este teléfono aún no puede entrar sin conexión. Inicia sesión una vez
                con el servidor disponible y quedará habilitado.
              </Text>
            </View>
          )}
        </View>

        {/* Botón ingresar */}
        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                {!!estado && <Text style={s.btnEstado}>{estado}</Text>}
              </View>
            : <Text style={s.btnText}>Ingresar</Text>}
        </TouchableOpacity>

        {/* Configuración de servidor — colapsable */}
        <View style={s.serverSection}>
          <TouchableOpacity onPress={() => setShowCfg(v => !v)} style={s.serverToggle} activeOpacity={0.7}>
            <View style={s.serverToggleLeft}>
              <Icon name="wifi" size={17} color={colors.fgMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.serverToggleLabel}>Servidor</Text>
                <Text style={s.serverToggleUrl} numberOfLines={1}>{apiUrl}</Text>
              </View>
            </View>
            <Icon name={showCfg ? 'chevron-down' : 'chevron-right'} size={17} color={colors.fgMuted} />
          </TouchableOpacity>

          {showCfg && (
            <View style={s.serverBox}>
              {/* Botón escanear QR — la forma fácil */}
              <TouchableOpacity
                style={[s.qrBtn, qrSaved && s.qrBtnSaved]}
                onPress={() => setScanning(true)}
                activeOpacity={0.85}
              >
                <Icon name={qrSaved ? 'check' : 'qr-code'} size={22} color={qrSaved ? colors.success : colors.ink100} />
                <View style={{ flex: 1 }}>
                  <Text style={s.qrBtnText}>
                    {qrSaved ? '✓ Servidor configurado' : 'Escanear QR del servidor'}
                  </Text>
                  <Text style={s.qrBtnSub}>
                    {qrSaved
                      ? `Conectado a ${apiUrl}`
                      : 'Usa el QR que muestra el sistema de la PC'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* O ingresar manualmente */}
              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>o escribe la URL</Text>
                <View style={s.orLine} />
              </View>

              <TextInput
                style={s.input}
                value={apiUrl}
                onChangeText={async (v) => {
                  setApiUrl(v);
                  await API.setApiUrl(v.replace(/\/$/, ''));
                }}
                placeholder="http://192.168.0.2:8000"
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={s.help}>
                La PC y el celular deben estar en la misma red WiFi
              </Text>
            </View>
          )}
        </View>

        {/* Pie con la versión: para saber de un vistazo si el teléfono
            ya recibió los últimos cambios */}
        <View style={s.pie}>
          <Text style={s.pieTexto}>Versión {VERSION} · {NOVEDADES}</Text>
          {!!fechaDelPaquete() && (
            <Text style={s.pieTexto}>Actualizada {fechaDelPaquete()}</Text>
          )}
        </View>

        <Text style={s.footer}>v1.0 · The Market POS</Text>
      </ScrollView>

      {/* Escáner QR */}
      <BarcodeScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={handleQrScanned}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: colors.paper,
    padding: 24, paddingTop: 60, gap: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoBox: {
    width: 44, height: 44, backgroundColor: colors.ink100,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  logoMark: { color: '#fff', fontSize: 22, fontWeight: '700' },
  appName: { fontSize: 24, fontWeight: '700', color: colors.ink100, letterSpacing: -0.5 },
  heading: { alignItems: 'center', gap: 4 },
  title:    { fontSize: 20, fontWeight: '700', color: colors.ink100, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.fgMuted, textAlign: 'center' },
  fields: { gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.fg, marginBottom: 6 },
  input: {
    height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: 16, fontSize: 15, color: colors.fg, backgroundColor: colors.paper,
  },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 4 },
  offlineNota: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBd,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  offlineNotaTexto: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 15 },
  btnEstado: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  versionChip: {
    backgroundColor: colors.ink100, borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 3, marginLeft: 8,
  },
  versionTexto: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  pie: { alignItems: 'center', marginTop: 18, gap: 2 },
  pieTexto: { fontSize: 10.5, color: colors.fgSubtle },
  eyeBtn: {
    position: 'absolute', right: 0, top: 0, height: 48, width: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },
  btn: {
    height: 52, backgroundColor: colors.ink100,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Servidor
  serverSection: { gap: 0 },
  serverToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, backgroundColor: colors.ink05,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  serverToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  serverDot: { fontSize: 16 },
  serverToggleLabel: { fontSize: 11, fontWeight: '600', color: colors.fgMuted },
  serverToggleUrl: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: colors.ink100, maxWidth: 220 },
  serverChevron: { fontSize: 10, color: colors.fgMuted },
  serverBox: {
    marginTop: 4, padding: 14, backgroundColor: colors.ink05,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderTopWidth: 0, gap: 10,
  },

  // QR button
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10,
    backgroundColor: colors.ink100,
  },
  qrBtnSaved: { backgroundColor: '#15803D' },
  qrBtnIcon: { fontSize: 24 },
  qrBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  qrBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 11, color: colors.fgMuted },

  help: { fontSize: 11, color: colors.fgSubtle, lineHeight: 16 },
  footer: { textAlign: 'center', fontSize: 12, color: colors.fgSubtle },
});
