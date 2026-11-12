/**
 * ui.js — Primitivas de interfaz compartidas por las pantallas móviles.
 * Evita repetir StyleSheets en cada módulo y mantiene una sola identidad visual.
 */
import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Keyboard, Animated, Easing, Pressable,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './theme';
import Icon from './Icon';

export function fmt(n) {
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtCant(n) {
  const f = Number(n || 0);
  return f === Math.trunc(f) ? String(Math.trunc(f)) : String(f);
}

export function fmtFecha(iso, conHora = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
    + (conHora ? ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '');
}

// ── Contenedor de pantalla con encabezado ────────────────────────────────────

export function Screen({ title, onBack, right, children, scroll = false, edges = ['top'] }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={u.safe} edges={edges}>
      <View style={u.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={HIT} style={{ marginRight: 4 }}>
            <Icon name="chevron-left" size={22} color={colors.ink100} />
          </TouchableOpacity>
        )}
        <Text style={u.headerTitle} numberOfLines={1}>{title}</Text>
        {right}
      </View>
      <Body style={{ flex: 1 }} contentContainerStyle={scroll ? { padding: 16 } : undefined}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

export const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

// ── Búsqueda ─────────────────────────────────────────────────────────────────

export function SearchBar({ value, onChange, placeholder = 'Buscar…', cargando, onScan }) {
  return (
    <View style={u.searchWrap}>
      <View style={u.searchBox}>
        <Icon name="search" size={16} color={colors.fgMuted} />
        <TextInput
          style={u.searchInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.fgMuted}
          autoCorrect={false}
        />
        {cargando ? <ActivityIndicator size="small" /> : null}
        {!cargando && !!value && (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={HIT}>
            <Icon name="x" size={15} color={colors.fgMuted} />
          </TouchableOpacity>
        )}
      </View>
      {onScan && (
        <TouchableOpacity style={u.scanBtn} onPress={onScan} activeOpacity={0.8}>
          <Icon name="scan-barcode" size={20} color={colors.ink100} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Campos de formulario ─────────────────────────────────────────────────────

export function Field({ label, value, onChange, placeholder, keyboardType, help, prefix, multiline, autoFocus, editable = true }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {!!label && <Text style={u.label}>{label}</Text>}
      <View style={[u.inputBox, !editable && { backgroundColor: colors.ink05 }, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
        {!!prefix && <Text style={u.prefix}>{prefix}</Text>}
        <TextInput
          style={[u.input, multiline && { height: 60, textAlignVertical: 'top' }]}
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.fgMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoFocus={autoFocus}
          editable={editable}
        />
      </View>
      {!!help && <Text style={u.help}>{help}</Text>}
    </View>
  );
}

export function Picker({ label, value, options, onChange }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {!!label && <Text style={u.label}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map(o => {
          const activo = String(o.value) === String(value);
          return (
            <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)}
              style={[u.chip, activo && u.chipOn]} activeOpacity={0.8}>
              <Text style={[u.chipText, activo && u.chipTextOn]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Botones ──────────────────────────────────────────────────────────────────

export function Btn({ children, onPress, variant = 'primary', disabled, busy, flex, icon, size }) {
  const escala = React.useRef(new Animated.Value(1)).current;
  const animar = (a) => Animated.spring(escala, {
    toValue: a, useNativeDriver: true, speed: 40, bounciness: 4,
  }).start();

  const estilos = {
    primary:   [u.btn, u.btnPri],
    secondary: [u.btn, u.btnSec],
    danger:    [u.btn, u.btnDanger],
  }[variant];
  const textStyle = {
    primary:   u.btnPriText,
    secondary: u.btnSecText,
    danger:    u.btnDangerText,
  }[variant];
  const colorIcono = variant === 'primary' ? '#fff' : variant === 'danger' ? colors.danger : colors.fgMuted;

  return (
    <Animated.View style={[flex ? { flex } : null, { transform: [{ scale: escala }] }]}>
      <TouchableOpacity
        style={[estilos, disabled && { opacity: 0.45 }, size === 'sm' && { height: 36, paddingHorizontal: 12 }]}
        onPress={onPress}
        onPressIn={() => animar(0.96)}
        onPressOut={() => animar(1)}
        disabled={disabled || busy}
        activeOpacity={0.9}
      >
        {busy
          ? <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.fgMuted} />
          : <>
              {icon ? <Icon name={icon} size={15} color={colorIcono} /> : null}
              <Text style={[textStyle, size === 'sm' && { fontSize: 12 }]}>{children}</Text>
            </>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Tarjetas y filas ─────────────────────────────────────────────────────────

export function Card({ children, style, onPress }) {
  const Comp = onPress ? TouchableOpacity : View;
  return <Comp style={[u.card, style]} onPress={onPress} activeOpacity={0.7}>{children}</Comp>;
}

export function Row({ titulo, sub, derecha, subDerecha, onPress, badge, badgeColor }) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp style={u.row} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={u.rowTitulo} numberOfLines={1}>{titulo}</Text>
          {!!badge && (
            <View style={[u.badge, badgeColor && { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
              <Text style={[u.badgeText, badgeColor && { color: badgeColor }]}>{badge}</Text>
            </View>
          )}
        </View>
        {!!sub && <Text style={u.rowSub} numberOfLines={2}>{sub}</Text>}
      </View>
      {(derecha !== undefined || subDerecha !== undefined) && (
        <View style={{ alignItems: 'flex-end' }}>
          {/* `derecha` acepta texto o un componente (ej. un botón de acción) */}
          {derecha !== undefined && (
            ['string', 'number'].includes(typeof derecha)
              ? <Text style={u.rowDerecha}>{derecha}</Text>
              : derecha
          )}
          {subDerecha !== undefined && <Text style={u.rowSubDerecha}>{subDerecha}</Text>}
        </View>
      )}
      {onPress && <Icon name="chevron-right" size={16} color={colors.fgMuted} />}
    </Comp>
  );
}

export function Stat({ label, valor, color }) {
  return (
    <View style={u.stat}>
      <Text style={u.statLabel}>{label}</Text>
      <Text style={[u.statValor, color && { color }]}>{valor}</Text>
    </View>
  );
}

export function Seccion({ children }) {
  return <Text style={u.seccion}>{children}</Text>;
}

export function Empty({ icon = 'package', titulo, texto }) {
  return (
    <View style={u.empty}>
      <Icon name={icon} size={30} color={colors.fgMuted} />
      {!!titulo && <Text style={u.emptyTitulo}>{titulo}</Text>}
      {!!texto && <Text style={u.emptyTexto}>{texto}</Text>}
    </View>
  );
}

export function Cargando() {
  return <View style={u.cargando}><ActivityIndicator size="large" color={colors.ink100} /></View>;
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <View style={u.errorBox}>
      <Icon name="alert-triangle" size={15} color={colors.danger} />
      <Text style={u.errorText}>{children}</Text>
    </View>
  );
}

// ── Modal tipo hoja ──────────────────────────────────────────────────────────

export function Sheet({ visible, title, sub, onClose, children, footer }) {
  return (
    // SafeAreaProvider propio: dentro de un Modal los márgenes del teléfono
    // no se heredan, y sin esto el título se metía debajo de la hora.
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaProvider>
        <SafeAreaView style={u.safe} edges={['top', 'bottom']}>
          <View style={u.header}>
            {/* Botón de retroceso grande: siempre alcanzable, aunque el teclado esté abierto */}
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }}
              style={u.headerBack} hitSlop={HIT} activeOpacity={0.6}>
              <Icon name="chevron-left" size={22} color={colors.ink100} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={u.headerTitle} numberOfLines={1}>{title}</Text>
              {!!sub && <Text style={u.headerSub} numberOfLines={1}>{sub}</Text>}
            </View>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }}
              style={u.headerBack} hitSlop={HIT} activeOpacity={0.6}>
              <Icon name="x" size={20} color={colors.fgMuted} />
            </TouchableOpacity>
          </View>

          {/* El teclado empuja el contenido en vez de tapar los botones */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"      // deslizar cierra el teclado
              showsVerticalScrollIndicator={false}
            >
              <Aparecer>{children}</Aparecer>
            </ScrollView>
            {!!footer && <View style={u.sheetFooter}>{footer}</View>}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Entrada suave del contenido: aparece y sube unos píxeles. */
export function Aparecer({ children, delay = 0, style }) {
  const anim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 260, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View style={[
      style,
      { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
    ]}>
      {children}
    </Animated.View>
  );
}

// ── Confirmación con estilo propio (en vez del Alert gris del sistema) ───────

export function Confirmar({ visible, titulo, mensaje, textoConfirmar = 'Confirmar', peligro, onConfirmar, onCancelar, busy }) {
  const anim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0, duration: visible ? 220 : 140,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <Pressable style={u.overlay} onPress={busy ? undefined : onCancelar}>
        <Animated.View style={[u.dialogo, {
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }]}>
          <Pressable onPress={() => {}}>
            <View style={[u.dialogoIcono, peligro && { backgroundColor: colors.dangerBg }]}>
              <Icon name={peligro ? 'alert-triangle' : 'check'} size={22}
                color={peligro ? colors.danger : colors.success} />
            </View>
            <Text style={u.dialogoTitulo}>{titulo}</Text>
            {!!mensaje && <Text style={u.dialogoMensaje}>{mensaje}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Btn variant="secondary" flex={1} onPress={onCancelar} disabled={busy}>Cancelar</Btn>
              <Btn variant={peligro ? 'danger' : 'primary'} flex={1.3} onPress={onConfirmar} busy={busy}>
                {textoConfirmar}
              </Btn>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ── Aviso flotante de éxito ──────────────────────────────────────────────────

export function Aviso({ texto, tipo = 'exito', onFin }) {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!texto) return;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onFin && onFin());
  }, [texto, anim, onFin]);

  if (!texto) return null;
  const esError = tipo === 'error';
  return (
    <Animated.View pointerEvents="none" style={[
      u.aviso, esError && { backgroundColor: colors.danger },
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
      },
    ]}>
      <Icon name={esError ? 'alert-triangle' : 'check'} size={15} color="#fff" />
      <Text style={u.avisoTexto}>{texto}</Text>
    </Animated.View>
  );
}

/** Hook para mostrar avisos: const [aviso, mostrar] = useAviso() */
export function useAviso() {
  const [estado, setEstado] = React.useState({ texto: '', tipo: 'exito' });
  const mostrar = React.useCallback((texto, tipo = 'exito') => setEstado({ texto, tipo }), []);
  const limpiar = React.useCallback(() => setEstado({ texto: '', tipo: 'exito' }), []);
  return [estado, mostrar, limpiar];
}

const u = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink05 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink100 },
  headerSub:   { fontSize: 12, color: colors.fgMuted, marginTop: 1 },
  headerBack:  { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginHorizontal: -6 },

  searchWrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.ink100 },
  scanBtn: {
    width: 46, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },

  label:  { fontSize: 12, fontWeight: '600', color: colors.fg, marginBottom: 5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: colors.paper,
  },
  prefix: { fontSize: 15, color: colors.fgMuted },
  input:  { flex: 1, height: 46, fontSize: 15, color: colors.ink100 },
  help:   { fontSize: 11, color: colors.fgMuted, marginTop: 4 },

  chip: {
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.paper,
  },
  chipOn:     { backgroundColor: colors.ink100, borderColor: colors.ink100 },
  chipText:   { fontSize: 13, fontWeight: '600', color: colors.fgMuted },
  chipTextOn: { color: '#fff' },

  btn: {
    height: 46, borderRadius: 10, flexDirection: 'row', gap: 7,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  btnPri:       { backgroundColor: colors.ink100 },
  btnPriText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnSec:       { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.paper },
  btnSecText:   { fontSize: 14, fontWeight: '600', color: colors.fgMuted },
  btnDanger:    { borderWidth: 1, borderColor: colors.dangerBd, backgroundColor: colors.dangerBg },
  btnDangerText:{ fontSize: 14, fontWeight: '600', color: colors.danger },

  card: {
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  rowTitulo:     { fontSize: 14, fontWeight: '600', color: colors.ink100, flexShrink: 1 },
  rowSub:        { fontSize: 12, color: colors.fgMuted, marginTop: 2 },
  rowDerecha:    { fontSize: 14, fontWeight: '700', color: colors.ink100 },
  rowSubDerecha: { fontSize: 11, color: colors.fgMuted, marginTop: 1 },

  badge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: colors.ink05, borderWidth: 1, borderColor: colors.border,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.fgMuted },

  stat: {
    flex: 1, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 13,
  },
  statLabel: { fontSize: 11, color: colors.fgMuted },
  statValor: { fontSize: 19, fontWeight: '800', color: colors.ink100, letterSpacing: -0.4, marginTop: 3 },

  seccion: {
    fontSize: 11, fontWeight: '700', color: colors.fgMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8,
  },

  empty:       { alignItems: 'center', justifyContent: 'center', padding: 34, gap: 8 },
  emptyTitulo: { fontSize: 15, fontWeight: '600', color: colors.ink100 },
  emptyTexto:  { fontSize: 13, color: colors.fgMuted, textAlign: 'center' },
  cargando:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBd,
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.danger },

  sheetFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.paper,
  },

  // Diálogo de confirmación
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 26,
  },
  dialogo: {
    width: '100%', maxWidth: 360, backgroundColor: colors.paper,
    borderRadius: 18, padding: 22,
  },
  dialogoIcono: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.successBg,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12,
  },
  dialogoTitulo:  { fontSize: 17, fontWeight: '700', color: colors.ink100, textAlign: 'center' },
  dialogoMensaje: { fontSize: 13.5, color: colors.fgMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  // Aviso flotante
  aviso: {
    position: 'absolute', left: 20, right: 20, bottom: 34,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.ink100, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avisoTexto: { flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '600' },
});

export { colors, Icon, u as uiStyles };
