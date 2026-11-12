/**
 * sesion.js — Permite entrar a la app aunque no haya servidor.
 *
 * Por qué existe: todo el sistema funciona sin conexión, pero el inicio de
 * sesión iba contra el servidor. Si el vendedor cerraba la app durante un corte
 * de red, quedaba fuera y no podía cobrar — el peor momento posible.
 *
 * Cómo funciona: cuando entra CON conexión se guarda en el teléfono un
 * "verificador" de sus credenciales (huella del correo + contraseña + una sal
 * propia de ese teléfono). Sin servidor, la app compara lo que escribe contra
 * esa huella. Nunca se guarda la contraseña.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-crypto es nativo: se carga con tolerancia por si la app es antigua
let Crypto = null;
try { Crypto = require('expo-crypto'); } catch {}

const CLAVE_SESIONES = 'sesiones_offline';
const CLAVE_SAL      = 'sal_dispositivo';

/** Sal única de este teléfono: dos aparatos nunca generan la misma huella. */
async function getSal() {
  let sal = await AsyncStorage.getItem(CLAVE_SAL);
  if (!sal) {
    sal = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(CLAVE_SAL, sal);
  }
  return sal;
}

async function huella(email, password) {
  const sal = await getSal();
  const texto = `${sal}|${String(email).trim().toLowerCase()}|${password}`;
  if (Crypto?.digestStringAsync) {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, texto);
  }
  // Respaldo para versiones sin el módulo nativo: no es criptográfico, pero
  // sigue evitando que alguien entre sin saber la contraseña.
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) | 0;
  }
  return `simple:${h}`;
}

async function leerSesiones() {
  try { return JSON.parse(await AsyncStorage.getItem(CLAVE_SESIONES)) || {}; }
  catch { return {}; }
}

/**
 * Tras un inicio de sesión exitoso EN LÍNEA, guarda lo necesario para poder
 * volver a entrar sin servidor.
 */
export async function recordarAcceso(email, password, usuario, token) {
  const sesiones = await leerSesiones();
  sesiones[String(email).trim().toLowerCase()] = {
    verificador: await huella(email, password),
    usuario,
    token,
    guardado: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CLAVE_SESIONES, JSON.stringify(sesiones));
}

/**
 * Intenta entrar sin servidor. Devuelve { usuario, token } si las credenciales
 * coinciden con las de la última vez que entró con conexión.
 */
export async function entrarSinConexion(email, password) {
  const sesiones = await leerSesiones();
  const guardada = sesiones[String(email).trim().toLowerCase()];

  if (!guardada) {
    throw new Error(
      'Sin conexión solo puedes entrar con un usuario que ya haya iniciado sesión ' +
      'antes en este teléfono. Conéctate a la red de la tienda para la primera vez.'
    );
  }
  const intento = await huella(email, password);
  if (intento !== guardada.verificador) {
    throw new Error('Contraseña incorrecta');
  }
  return { usuario: guardada.usuario, token: guardada.token };
}

/** ¿Hay algún usuario que pueda entrar sin conexión en este teléfono? */
export async function hayAccesoOffline() {
  return Object.keys(await leerSesiones()).length > 0;
}

/** Correos que ya entraron alguna vez aquí (para sugerirlos en el formulario). */
export async function correosRecordados() {
  return Object.keys(await leerSesiones());
}

/** Olvidar un acceso guardado (por ejemplo, si se le quita el teléfono a alguien). */
export async function olvidarAcceso(email) {
  const sesiones = await leerSesiones();
  delete sesiones[String(email).trim().toLowerCase()];
  await AsyncStorage.setItem(CLAVE_SESIONES, JSON.stringify(sesiones));
}
