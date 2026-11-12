/**
 * smoke_movil.js — Carga REALMENTE cada módulo de la app móvil con las
 * dependencias nativas simuladas, para detectar errores de inicialización
 * (como usar un StyleSheet antes de definirlo) que el chequeo de sintaxis
 * no ve porque solo ocurren al ejecutar el módulo.
 */
const fs   = require('fs');
const path = require('path');
const babel = require(path.join(__dirname, '..', '..', 'frontend', 'lib', 'babel.min.js'));

const RAIZ = path.join(__dirname, '..');

// ── Mocks de las dependencias nativas ────────────────────────────────────────
const compStub = (nombre) => { const f = () => null; f.displayName = nombre; return f; };

const reactNative = {
  View: compStub('View'), Text: compStub('Text'), TextInput: compStub('TextInput'),
  TouchableOpacity: compStub('TouchableOpacity'), ScrollView: compStub('ScrollView'),
  FlatList: compStub('FlatList'), Modal: compStub('Modal'), Image: compStub('Image'),
  ActivityIndicator: compStub('ActivityIndicator'), RefreshControl: compStub('RefreshControl'),
  KeyboardAvoidingView: compStub('KeyboardAvoidingView'), Pressable: compStub('Pressable'),
  SafeAreaView: compStub('SafeAreaView'), Switch: compStub('Switch'),
  StyleSheet: { create: (o) => o, flatten: (o) => o, absoluteFill: {}, hairlineWidth: 1 },
  Alert: { alert: () => {} },
  Platform: { OS: 'android', select: (o) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Linking: { addEventListener: () => ({ remove: () => {} }), getInitialURL: async () => null },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Vibration: { vibrate: () => {} },
};

const react = {
  createElement: () => null, Fragment: 'Fragment',
  useState: (v) => [v, () => {}], useEffect: () => {}, useCallback: (f) => f,
  useMemo: (f) => f(), useRef: () => ({ current: null }), useContext: () => ({}),
  createContext: () => ({ Provider: compStub('Provider'), Consumer: compStub('Consumer') }),
  memo: (c) => c, forwardRef: (c) => c,
};
react.default = react;

const navStub = {
  createBottomTabNavigator: () => ({ Navigator: compStub('TabNav'), Screen: compStub('TabScreen') }),
  createNativeStackNavigator: () => ({ Navigator: compStub('StackNav'), Screen: compStub('StackScreen') }),
  NavigationContainer: compStub('NavigationContainer'),
  useNavigation: () => ({ navigate: () => {}, goBack: () => {}, canGoBack: () => false }),
  useFocusEffect: () => {},
};

const MOCKS = {
  'react': react,
  'react-native': reactNative,
  'react-native-safe-area-context': { SafeAreaView: compStub('SafeAreaView'), SafeAreaProvider: compStub('SafeAreaProvider'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  '@react-navigation/native': navStub,
  '@react-navigation/bottom-tabs': navStub,
  '@react-navigation/native-stack': navStub,
  '@react-native-async-storage/async-storage': { default: { getItem: async () => null, setItem: async () => {}, multiGet: async () => [], multiRemove: async () => {} } },
  '@react-native-community/netinfo': { default: { addEventListener: () => () => {} } },
  'expo-camera': { CameraView: compStub('CameraView'), useCameraPermissions: () => [{ granted: true }, async () => {}] },
  'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Light: 'l' }, notificationAsync: async () => {}, NotificationFeedbackType: { Success: 's' } },
  'expo-sqlite': { openDatabaseSync: () => ({ execAsync: async () => {}, runAsync: async () => {}, getAllAsync: async () => [], getFirstAsync: async () => null }) },
  'expo-status-bar': { StatusBar: compStub('StatusBar') },
  'expo-file-system/legacy': { cacheDirectory: '/tmp/', downloadAsync: async () => ({ status: 200 }) },
  'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async () => {} },
  'expo-updates': { reloadAsync: async () => {} },
};

// ── Cargador con caché ───────────────────────────────────────────────────────
const cache = new Map();

function resolver(desde, pedido) {
  const base = path.resolve(path.dirname(desde), pedido);
  for (const cand of [base, base + '.js', base + '.jsx', path.join(base, 'index.js')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

function cargar(archivo) {
  const abs = path.resolve(archivo);
  if (cache.has(abs)) return cache.get(abs);

  const codigo = fs.readFileSync(abs, 'utf8');
  // Solo JSX + módulos a CommonJS: Node ya soporta el resto de la sintaxis moderna
  const { code } = babel.transform(codigo, {
    presets: ['react'],
    plugins: ['transform-modules-commonjs'],
    filename: abs,
  });

  const modulo = { exports: {} };
  cache.set(abs, modulo.exports);

  const requerir = (pedido) => {
    if (MOCKS[pedido]) return MOCKS[pedido];
    if (pedido.startsWith('.')) {
      const destino = resolver(abs, pedido);
      if (!destino) throw new Error(`No se resolvió: ${pedido} desde ${path.basename(abs)}`);
      return cargar(destino);
    }
    return {};   // cualquier otra dependencia no relevante para la carga
  };

  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', code)(requerir, modulo, modulo.exports);
  cache.set(abs, modulo.exports);
  return modulo.exports;
}

// ── Ejecución ────────────────────────────────────────────────────────────────
const OBJETIVOS = [
  'App.js',
  'src/navigation/index.js',
  'src/components/ui.js',
  'src/components/Icon.js',
  'src/api/index.js',
  'src/storage/db.js',
  'src/storage/sync.js',
  'src/screens/LoginScreen.js',
  'src/screens/CuentasScreen.js',
  'src/screens/vendedor/POSScreen.js',
  'src/screens/admin/DashboardScreen.js',
  'src/screens/admin/AlertasScreen.js',
  'src/screens/admin/ConsultaScreen.js',
  'src/screens/admin/HistorialScreen.js',
  'src/screens/admin/InventarioScreen.js',
  'src/screens/admin/ComprasScreen.js',
  'src/screens/admin/ProveedoresScreen.js',
  'src/screens/admin/ReportesScreen.js',
  'src/screens/admin/UsuariosScreen.js',
  'src/screens/admin/RecomendacionesScreen.js',
  'src/screens/admin/CajaScreen.js',
  'src/screens/admin/MasScreen.js',
];

let fallos = 0;
for (const rel of OBJETIVOS) {
  cache.clear();
  try {
    const exportado = cargar(path.join(RAIZ, rel));
    const tieneAlgo = exportado && (exportado.default || Object.keys(exportado).length > 0);
    console.log(`[${tieneAlgo ? 'OK ' : 'VACÍO'}] ${rel}`);
    if (!tieneAlgo) fallos++;
  } catch (e) {
    fallos++;
    console.log(`[FALLA] ${rel}\n         ${e.message.split('\n')[0]}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(fallos === 0
  ? 'TODOS LOS MÓDULOS CARGAN SIN ERROR'
  : `${fallos} MÓDULO(S) FALLAN AL CARGAR`);
process.exit(fallos ? 1 : 0);
