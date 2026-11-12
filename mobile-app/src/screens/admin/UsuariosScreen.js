/**
 * UsuariosScreen — Alta y control de vendedores desde el celular.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  Screen, Field, Picker, Btn, Row, Sheet, Empty, Cargando, ErrorBox,
  fmtFecha, colors, Icon, HIT,
} from '../../components/ui';
import * as API from '../../api';

export default function UsuariosScreen({ navigation, user }) {
  const [lista,    setLista]    = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);   // usuario | 'nuevo'

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // Sin filtro `activo` el API devuelve activos e inactivos
      const res = await API.getUsuarios({ per_page: 100 });
      setLista(res.items || []);
    } catch { setLista([]); }
    finally { setCargando(false); }
  }, []);

  React.useEffect(() => { cargar(); }, [cargar]);

  function resetPassword(u) {
    Alert.alert('Restablecer contraseña', `Se generará una contraseña temporal para ${u.nombre}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Generar',
        onPress: async () => {
          try {
            const res = await API.resetPasswordUsuario(u.id);
            Alert.alert('Contraseña temporal', `${res.password_temporal}\n\nAnótala: no se vuelve a mostrar. Pídele que la cambie al entrar.`);
          } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  function toggleActivo(u) {
    const accion = u.activo ? 'Desactivar' : 'Reactivar';
    Alert.alert(`${accion} usuario`, `${accion} el acceso de ${u.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: accion, style: u.activo ? 'destructive' : 'default',
        onPress: async () => {
          try {
            if (u.activo) await API.desactivarUsuario(u.id);
            else          await API.updateUsuario(u.id, { activo: true });
            cargar();
          } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  function acciones(u) {
    const esYo = user && u.id === user.user_id;
    const opciones = [
      { text: 'Editar datos', onPress: () => setEditando(u) },
      { text: 'Restablecer contraseña', onPress: () => resetPassword(u) },
    ];
    if (!esYo) {
      opciones.push({
        text: u.activo ? 'Desactivar acceso' : 'Reactivar acceso',
        style: u.activo ? 'destructive' : 'default',
        onPress: () => toggleActivo(u),
      });
    }
    opciones.push({ text: 'Cerrar', style: 'cancel' });
    Alert.alert(u.nombre, `${u.email}\nRol: ${u.rol}${esYo ? '\n(es tu propia cuenta)' : ''}`, opciones);
  }

  return (
    <Screen
      title="Usuarios"
      onBack={navigation ? () => navigation.goBack() : undefined}
      right={
        <TouchableOpacity onPress={() => setEditando('nuevo')} hitSlop={HIT}>
          <Icon name="plus" size={20} color={colors.ink100} />
        </TouchableOpacity>
      }
    >
      {cargando && lista.length === 0 ? <Cargando /> : (
        <FlatList
          data={lista}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Row
              titulo={item.nombre}
              sub={`${item.email} · desde ${fmtFecha(item.created_at)}`}
              badge={item.activo ? item.rol : 'inactivo'}
              badgeColor={!item.activo ? colors.danger : item.rol === 'admin' ? colors.ink100 : undefined}
              onPress={() => acciones(item)}
            />
          )}
          ListEmptyComponent={<Empty icon="users" titulo="Sin usuarios" texto="Agrega vendedores con el botón +" />}
          refreshing={cargando}
          onRefresh={cargar}
        />
      )}

      <UsuarioSheet usuario={editando} onClose={() => setEditando(null)}
        onSaved={() => { setEditando(null); cargar(); }} />
    </Screen>
  );
}

function UsuarioSheet({ usuario, onClose, onSaved }) {
  const visible = !!usuario;
  const esNuevo = usuario === 'nuevo';
  const vacio = { nombre: '', email: '', password: '', rol: 'vendedor' };
  const [d, setD]         = useState(vacio);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    setError('');
    setD(esNuevo ? vacio : {
      nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol,
    });
  }, [visible, usuario]);

  const set = (k, v) => { setD(p => ({ ...p, [k]: v })); setError(''); };

  async function guardar() {
    if (!d.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!d.email.trim())  { setError('El email es obligatorio'); return; }
    if (esNuevo && d.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setBusy(true);
    try {
      if (esNuevo) {
        await API.createUsuario({
          nombre: d.nombre.trim(), email: d.email.trim(), password: d.password, rol: d.rol,
        });
      } else {
        await API.updateUsuario(usuario.id, {
          nombre: d.nombre.trim(), email: d.email.trim(), rol: d.rol,
        });
      }
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Sheet visible={visible} title={esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
      sub={esNuevo ? 'Dale acceso al sistema' : usuario?.nombre} onClose={onClose}
      footer={<>
        <Btn variant="secondary" flex={1} onPress={onClose}>Cancelar</Btn>
        <Btn flex={1.4} onPress={guardar} busy={busy}>{esNuevo ? 'Crear' : 'Guardar'}</Btn>
      </>}
    >
      <ErrorBox>{error}</ErrorBox>
      <Field label="Nombre" value={d.nombre} onChange={v => set('nombre', v)} autoFocus={esNuevo} />
      <Field label="Email (con el que inicia sesión)" value={d.email} onChange={v => set('email', v)}
        keyboardType="email-address" />
      {esNuevo && (
        <Field label="Contraseña" value={d.password} onChange={v => set('password', v)}
          help="Mínimo 8 caracteres. Podrás restablecerla después si se le olvida." />
      )}
      <Picker label="Rol" value={d.rol} onChange={v => set('rol', v)} options={[
        { value: 'vendedor', label: 'Vendedor' },
        { value: 'admin',    label: 'Administrador' },
      ]} />
      <Text style={s.nota}>
        El <Text style={{ fontWeight: '700' }}>vendedor</Text> solo puede vender, consultar productos,
        registrar clientes, cobrar cuentas y abrir/cerrar su turno. El{' '}
        <Text style={{ fontWeight: '700' }}>administrador</Text> tiene acceso completo.
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  nota: { fontSize: 12, color: colors.fgMuted, lineHeight: 18, marginTop: 4 },
});
