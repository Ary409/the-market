# The Market — Guía de instalación en la PC del cliente

Documento para quien instala el sistema. Tiempo estimado: **15 minutos**.

---

## Antes de salir de casa

Lleva en una USB la carpeta completa **`Market System`**, con estas cosas dentro:

```
Market System\
  backend\            ← el sistema y la base de datos
  frontend\           ← las pantallas
  admin-desktop\      ← iconos y componentes compartidos
  electron-app\dist\The Market Setup 2.0.0.exe   ← el instalador
  colors_and_type.css
  iniciar_servidor.vbs
```

> La base de datos ya viene **vacía y lista**: sin productos, sin ventas, sin
> clientes. Solo trae el usuario administrador y 5 categorías de ejemplo.

---

## Paso 1 — Instalar Python (solo si la PC no lo tiene)

En el buscador de Windows escribe `cmd`, ábrelo y teclea:

```
python --version
```

* **Si responde `Python 3.11` o superior** → salta al Paso 2.
* **Si dice que no reconoce el comando** → descarga Python desde
  [python.org/downloads](https://www.python.org/downloads/) e instálalo.
  **Marca la casilla "Add Python to PATH"** durante la instalación; sin eso el
  sistema no arranca.

---

## Paso 2 — Copiar la carpeta

Copia la carpeta `Market System` de la USB al disco de la PC. Recomendado:

```
C:\Market System
```

Evita el Escritorio o carpetas sincronizadas con OneDrive: la base de datos se
escribe constantemente y la sincronización puede corromperla.

---

## Paso 3 — Preparar el sistema

Entra a la carpeta `Market System` y **doble clic en `instalar.bat`**.

Esto instala lo que el sistema necesita y prepara la base de datos. Tarda unos
minutos y deja el servidor listo para arrancar solo cada vez que se encienda la
computadora. Cuando termine, cierra la ventana.

---

## Paso 4 — Instalar la aplicación de escritorio

Doble clic en `electron-app\dist\The Market Setup 2.0.0.exe` y sigue el
asistente. Al terminar quedará el ícono **The Market** en el escritorio.

La primera vez que abras la app te pedirá ubicar la carpeta del sistema:
selecciona `C:\Market System`. Solo se pregunta una vez.

---

## Paso 5 — Entrar y cambiar la contraseña

Credenciales iniciales:

| | |
|---|---|
| Usuario | `admin@tienda.com` |
| Contraseña | `admin1234` |

> **Cámbiala de inmediato.** Ve a **Usuarios**, toca el administrador y
> restablece la contraseña. Esta clave es pública en este documento.

---

## Paso 6 — Conectar el celular (opcional)

1. **La PC y el celular deben estar en la misma red WiFi.** No hace falta que
   esa red tenga internet: el sistema vive en la computadora de la tienda.
2. En el celular instala **Expo Go** desde la tienda de aplicaciones.
3. En la PC, abre la app y entra al módulo **App Móvil**.
4. Con la cámara del celular escanea el **QR de Expo Go** (el segundo).
5. Ya dentro de la app, en la pantalla de inicio de sesión toca **Servidor →
   Escanear QR** y escanea el **QR del servidor** (el tercero).
6. Entra con las credenciales. **Este primer inicio de sesión debe hacerse con
   el servidor encendido**: así el teléfono queda habilitado para entrar
   después aunque se caiga la red.

---

## Puesta en marcha del negocio

En este orden, desde la app de escritorio:

1. **Inventario → Categorías** — ajusta las categorías a lo que vende la tienda.
2. **Proveedores** — da de alta a quienes le surten. Anota el teléfono: sale
   impreso en el PDF de las órdenes de compra.
3. **Inventario → Agregar producto** — carga el catálogo con su stock inicial.
4. **Usuarios** — crea una cuenta para cada vendedor (rol *Vendedor*).
5. **Caja → Abrir caja** — con esto ya se puede vender.

---

## Lo que hay que saber para el día a día

**El servidor arranca solo** al encender la computadora. Si algo no responde,
reinicia la PC antes que nada.

**La computadora tiene que estar encendida** para que el celular funcione en
línea. Si se apaga, el celular sigue vendiendo sin conexión y sube todo cuando
la PC vuelva.

**Respaldos.** El archivo `backend\inventario.db` **es el negocio entero**.
Cópialo a una USB o a la nube con regularidad. Si se pierde, se pierde todo.

**Apariencia.** Arriba a la derecha se elige entre Claro, Oscuro y Pink. Es una
preferencia de cada computadora.

---

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| La app abre en blanco o no carga | Reinicia la PC; el servidor arranca solo |
| El celular dice "sin conexión" | Verifica que ambos estén en la misma WiFi y que la PC esté encendida |
| Cambió la red y el celular no conecta | En la PC, módulo App Móvil, vuelve a escanear el QR del servidor: la dirección cambia con la red |
| Olvidó la contraseña de un vendedor | Módulo Usuarios → Restablecer contraseña |
| Olvidó la contraseña del administrador | Requiere asistencia técnica |

---

## Datos de la instalación

Anota aquí lo de esta tienda, para futuras visitas:

```
Fecha de instalación : ____________________
Carpeta              : ____________________
Dirección del servidor (módulo App Móvil): ____________________
Contraseña nueva del administrador: la definió el cliente
Teléfonos conectados : ____________________
```
