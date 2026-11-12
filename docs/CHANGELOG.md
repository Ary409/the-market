# Changelog — Fase 2 (rediseño de lógica de negocio)

Registro de cambios por sub-fase. Cada entrada explica **qué** se cambió, **por qué**
y su **impacto técnico**. Ver el análisis previo en `AUDITORIA.md`.

---

## Fase 2.0 — Cimientos de arquitectura (2026-07-04) ✅

**Objetivo:** base segura y versionada para todo lo que sigue, sin romper la API
ni el instalador. **Probado:** 25/25 smoke tests sobre copia de la BD real +
verificación en el servidor real (v1.1.0).

### 1. Migraciones con Alembic (nuevo)

| Archivo | Cambio |
|---|---|
| `backend/alembic.ini`, `backend/alembic/` | Configuración de Alembic con `render_as_batch` (necesario en SQLite) |
| `backend/alembic/versions/0001_baseline.py` | Esquema actual **congelado** como revisión baseline |
| `backend/app/core/bootstrap.py` | Migraciones automáticas al arrancar el servidor |
| `backend/app/main.py` | `run_migrations()` reemplaza a `Base.metadata.create_all()` |
| `backend/app/seed.py` | Usa `run_migrations()` — las instalaciones nuevas nacen versionadas |

**Por qué:** sin migraciones, cualquier cambio de modelo sobre una BD con datos
significaba pérdida de información. Ahora:
- BD nueva → `upgrade head` crea todo el esquema.
- BD existente sin versionar → se marca (stamp) en el baseline y sigue desde ahí.
- BD versionada → aplica solo lo pendiente.

**Impacto:** cero para el usuario. La BD real quedó marcada en revisión `0001`
sin tocar los datos. Respaldo previo: `backups/inventario_pre_fase2_20260704_225440.db`.

### 2. Seguridad endurecida

| Cambio | Antes | Ahora |
|---|---|---|
| `SECRET_KEY` | Hardcodeada en el código | Generada aleatoria y persistida en `backend/.secret_key` (gitignored); se puede fijar por `.env` |
| CORS | `allow_origins=["*"]` **+** `allow_credentials=True` (combinación inválida) | Orígenes configurables (`CORS_ORIGINS`), `allow_credentials=False` (la API usa Bearer, no cookies) |
| Hash de contraseñas | `sha256_crypt` | **bcrypt** para todo hash nuevo; los hashes viejos se verifican y **re-hashean automáticamente en el siguiente login** (migración transparente, ya aplicada al admin real) |

**Impacto:** al cambiar la SECRET_KEY, los tokens emitidos antes quedaron
inválidos — solo hubo que volver a iniciar sesión una vez.

### 3. `InventarioService` — única puerta al stock (nuevo)

`backend/app/services/inventario_service.py`:

- `registrar_movimiento(...)` — **única** función autorizada a cambiar `producto.stock`.
  Registra siempre el `MovimientoStock` y **lanza `StockInsuficienteError` si el
  resultado sería negativo** (regla: nunca stock negativo).
- `ajustar_a(...)` — ajuste absoluto que registra la diferencia.
- El servicio **no hace commit**: participa en la transacción del caso de uso, así
  la validación y el descuento son atómicos (anti-sobreventa en SQLite).

Refactorizados para usarlo (eliminada la lógica duplicada, misma API):
`routers/ventas.py` (venta y anulación), `routers/compras.py` (recepción),
`routers/inventario.py` (entrada y ajuste).

### 4. Stock blindado en productos

- `PUT /productos/{id}` **ya no acepta `stock`** (`ProductoUpdate` sin ese campo;
  si un cliente viejo lo envía, se ignora — sin errores).
- `POST /productos` con stock inicial ahora lo registra como **movimiento
  "Inventario inicial"** (el libro cuadra desde el día uno).
- Frontend (`frontend/screens/Inventario.jsx`):
  - Al editar, el campo stock aparece **deshabilitado** con explicación.
  - Nuevo botón **"Ajustar stock"** por fila → modal que exige **motivo** y llama
    a `/inventario/ajuste` (todo cambio queda en el historial de movimientos).
  - `TextField` (components.jsx) ganó soporte `disabled`.

**Invariante verificado en pruebas:** `stock == Σ movimientos` en todo momento.

### 5. Arreglos colaterales

- `backend/seed.py` (raíz) estaba **roto** (usaba el campo `contrasena`, inexistente
  en el modelo) y lo ejecuta `instalar.bat` → ahora es un wrapper de `app/seed.py`.
- Versión de API: `1.0.0` → `1.1.0`.
- `requirements.txt`: + `alembic`.
- `.gitignore`: + `.secret_key`.
- `.env.example` actualizado (SECRET_KEY opcional, `CORS_ORIGINS`).

### Compatibilidad

- Endpoints y respuestas **sin cambios de contrato** (solo `ProductoUpdate.stock`
  eliminado, que era justamente el agujero a cerrar).
- App móvil: **sin cambios necesarios** (no editaba stock directamente).
- Instalador y `start.bat`: funcionan igual; además `instalar.bat` quedó reparado.

### Pruebas ejecutadas

25 aserciones automatizadas sobre copia de la BD real: migración/stamp, re-hash,
producto con stock inicial, PUT ignora stock, venta descuenta por movimiento,
venta sin stock rechazada (y nada cambia), ajuste con diferencia, anulación repone,
libro cuadra con stock, permisos de vendedor (403), baseline crea esquema completo
en BD nueva. Resultado: **25 OK / 0 FAIL**. Después se verificó login y re-hash
en el servidor real.

---

## Fases 2.1 – 2.7 — Rediseño completo de la lógica de negocio (2026-07-05) ✅

**Probado:** 66/66 aserciones automatizadas sobre copia de la BD real + verificación
en el servidor vivo (v2.0.0) tras migrar la BD real a la revisión `0002`. Todos los
JSX del frontend compilan con el Babel del proyecto. Respaldo previo:
`backups/inventario_pre_fase2full_*.db`.

### Modelo de datos (migración `0002_fase2_negocio`)

Todo el dinero pasó de `Float` a **`Numeric(12,2)`** (exacto, sin errores de
redondeo) y las cantidades a **`Numeric(10,3)`** (permite venta por peso/volumen).
Nuevas tablas: `clientes`, `pagos_cliente`, `pagos_proveedor`, `secuencias`,
`recomendaciones`. Migración con `batch_alter_table` (requisito de SQLite); datos
existentes preservados (probado sobre la BD real).

### Fase 2.1 — Inventario extendido

- Tipos de movimiento nuevos: `perdida`, `merma`, `vencimiento` (además de
  entrada/salida/ajuste/devolución).
- `POST /inventario/salida` con **motivo obligatorio** para auditoría.
- `InventarioService` ahora valida el tipo, usa `Decimal` y sigue siendo la
  **única** puerta al stock. Campo `stock_reservado` preparado para apartados.

### Fase 2.2 — Producto extendido

- Nuevos campos: `sku`, `unidad_medida` (unidad/kg/g/lt/ml/paquete/caja),
  `precio_mayoreo` + `cantidad_mayoreo`, `stock_maximo`, `stock_reservado`.
- Búsqueda de productos ahora también por **SKU**.

### Fase 2.3 — Ventas blindadas

- **El precio lo fija SIEMPRE el servidor** (precio de venta, o mayoreo si la
  cantidad alcanza el umbral). El precio que envíe el cliente se ignora → el
  vendedor no puede alterar precios. *Probado: enviar precio 1.00 cobra el real.*
- Numeración de recibo por **secuencia atómica** (tabla `secuencias`): sin
  colisiones aunque haya ventas simultáneas.
- Toda venta queda **ligada a la sesión de caja** (`caja_sesion_id`).
- Pago **mixto** con desglose validado (`efectivo + tarjeta == total`).
- Productos por unidad rechazan cantidades decimales; los de peso las aceptan.

### Fase 2.4 — Clientes y crédito (cuenta corriente)

- Módulo `clientes` completo. `saldo = Σ ventas a crédito − Σ abonos`.
- Venta a **crédito**: exige cliente con crédito habilitado y **respeta el límite**.
- Abonos (`POST /clientes/{id}/pagos`) que **bajan la deuda automáticamente**,
  exigen caja abierta y entran al arqueo.
- Estado de cuenta (cartelera): compras a crédito con productos, pagos, saldo y
  crédito disponible. Historial **inmutable**; no se puede desactivar un cliente
  con deuda.

### Fase 2.5 — Proveedores

- Estado de cuenta (`compras recibidas − pagos`), pagos a proveedor, productos
  que suministra.
- Cancelar orden ahora es **lógico** (`estado='cancelada'`), ya no un DELETE
  físico → el historial se conserva.

### Fase 2.6 — Permisos por módulo

- Capa de políticas declarativa (`core/permissions.py`): permisos `modulo.accion`
  por rol, extensible sin tocar routers. Guard `require_permission(...)`.
- El **vendedor** solo puede: vender, consultar productos/existencias, registrar
  clientes, cobrar abonos, ver sus propias ventas y operar su caja. Todo lo demás
  (dashboard, reportes, compras, usuarios, inventario, recomendaciones) → **403**.
  *Verificado con 7 rutas de admin bloqueadas al vendedor.*

### Fase 2.7 — Recomendaciones y dashboard

- Motor de recomendaciones (`recomendaciones_service`) que corre **al cerrar caja**
  (y bajo demanda): detecta agotados, stock bajo, más/menos vendidos y productos
  sin movimiento; genera sugerencias con prioridad. Aislado para poder sustituirlo
  por IA en el futuro sin tocar el resto.
- Cierre de caja **corregido**: suma solo las ventas de **esa** sesión (antes
  duplicaba entre turnos), desglosa el mixto sin duplicar, e incluye los abonos
  cobrados en el arqueo.
- Dashboard ampliado: ventas hoy/semana/mes, ganancia del mes, top productos,
  stock bajo/agotados/por vencer, clientes con deuda, total por cobrar, compras
  recientes, recomendaciones pendientes. **"Hoy/semana/mes" en hora local** de la
  tienda (antes se corría por usar UTC).

### Frontend desktop

- Nueva pantalla **Clientes** (cartera, estado de cuenta, abonos) + entrada en el
  menú.
- **Dashboard** rediseñado con los indicadores nuevos y panel de recomendaciones
  accionable.
- **POS del vendedor** ampliado: 4 formas de pago (efectivo/tarjeta/mixto/crédito),
  selector de cliente con alta rápida, precio de mayoreo reflejado en pantalla y
  cantidades decimales para productos por peso.
- `Inventario`: el stock nunca se edita directo (campo bloqueado + botón
  "Ajustar stock" con motivo).

### App móvil

**Sin tocar**, según lo acordado — se actualizará en la Fase 3, cuando el sistema
de escritorio esté validado. La API mantiene compatibilidad: el móvil sigue
funcionando (el precio que enviaba ahora simplemente se ignora a favor del
servidor).

---

## Ronda 10 — Entrar sin conexión (2026-07-27) ✅

**Hueco encontrado en producción:** se hizo que todo el sistema funcionara sin
conexión… menos el inicio de sesión. Si el vendedor cerraba la app durante un
corte de red quedaba fuera y no podía cobrar — el peor momento posible.

### Corrección posterior: dos bugs que impedían que funcionara

Al reportar el usuario que **seguía** sin poder entrar, se encontró que el
mecanismo era correcto pero nunca llegaba a ejecutarse:

1. **`fetch` sin límite de tiempo.** Con el WiFi conectado pero el servidor
   apagado o fuera de alcance, la petición se quedaba esperando más de un
   minuto: el botón giraba y jamás se alcanzaba el respaldo sin conexión.
   Ahora toda llamada tiene límite (12 s; el login 6 s) y el login **pregunta
   primero si el servidor responde** (4 s) para pasar de inmediato al modo
   local. Verificado: se rinde a los 6,0 s en vez de colgarse.
2. **Guardar la credencial rompía el inicio de sesión válido.** `recordarAcceso`
   estaba dentro del `try` principal: si fallaba, un login correcto caía al
   `catch` y se mostraba como error. Ahora va en su propio bloque.

Además el botón dice qué está haciendo ("Buscando el servidor…", "Sin servidor ·
entrando con los datos del teléfono") en vez de un giro mudo.

### Cómo se resolvió (`storage/sesion.js`)

* Al entrar **con conexión** se guarda un **verificador** de las credenciales:
  `SHA-256(sal_del_teléfono | correo | contraseña)` vía `expo-crypto`.
  **La contraseña nunca se guarda** (verificado en pruebas).
* Sin servidor, el login compara lo escrito contra ese verificador y restaura la
  sesión. Si el usuario nunca ha entrado en ese teléfono, se le explica que debe
  conectarse la primera vez.
* La sal es **única por teléfono**: el mismo usuario y contraseña producen
  huellas distintas en dos aparatos, así que copiar el archivo no sirve.
* Varios usuarios pueden tener acceso guardado en el mismo teléfono.
* La pantalla de login avisa quién puede entrar sin red.

### Sesión vencida

El token dura 8 horas. Si vence mientras se trabaja sin conexión, al reconectar
la app lo detecta y pide volver a entrar, aclarando que **lo guardado no se ha
perdido** y se subirá solo. Antes habría fallado en silencio para siempre.

**Probado:** 13/13 aserciones (rechazo de usuario desconocido, contraseña
incorrecta, correo insensible a mayúsculas, contraseña ausente del
almacenamiento, huella distinta por dispositivo, varios usuarios, olvidar
acceso).

---

## Ronda 9 — El negocio entero funciona sin conexión (2026-07-27) ✅

**Probado:** 21/21 aserciones de un turno completo sin servidor + 22 módulos
cargando. Publicado a `preview`.

### Arquitectura: espejo local + cola de acciones

Se pasó de "vender sin internet" a **operar sin internet**. Dos piezas nuevas:

* **`storage/offline.js`** — una sola puerta para leer y escribir. Las pantallas
  ya no preguntan si hay red: piden aquí y esta capa decide entre el servidor y
  la copia del teléfono.
* **Cola unificada** (`cola_acciones` + `ventas_pendientes`) — todo lo hecho sin
  conexión se sube **en el orden real en que ocurrió**. Ese orden importa: no se
  puede registrar una venta de un turno que aún no se abrió. Verificado:
  `abrir caja → venta → venta → abono → cerrar caja`.
* **Tabla `espejo`** — última copia conocida de cada vista, con su hora.

### Qué funciona ahora sin conexión

| | Antes | Ahora |
|---|---|---|
| Vender (escáner y manual) | ✅ | ✅ |
| **Abrir y cerrar turno** | ❌ | ✅ corte calculado en el teléfono |
| **Cobrar abonos y liquidar cuentas** | ❌ | ✅ |
| **Consultar clientes y su saldo** | ❌ | ✅ ajustado por lo que está en cola |
| **Registrar clientes nuevos** | ❌ | ✅ y se les puede fiar de una vez |
| **Historial de ventas del día** | ❌ | ✅ incluye las no subidas |
| **Inicio, alertas y reportes** | ❌ | ✅ última copia, con su hora |

Los saldos mostrados suman los fiados y restan los abonos que aún están en cola,
para que el vendedor vea de inmediato el efecto de lo que acaba de hacer.

### Tolerancia a conflictos

Si al reconectar el servidor responde "ya hay una caja abierta" (porque se abrió
desde la PC), la acción se da por resuelta en vez de atascar la cola. Verificado.

### Dos bugs encontrados de paso

* **Alertas fallaba en silencio**: pedía 200 productos y el servidor permite 100
  (error 422). Ahora se calcula desde la copia local — se arregla y además
  funciona sin conexión.
* La copia local de productos no guardaba `stock_minimo` ni la fecha de
  vencimiento, así que no había forma de calcular alertas sin conexión.

### Límite honesto

Los reportes históricos (ganancias del mes, top de 30 días) viven en la base de
la PC. Sin conexión se muestra **la última copia descargada con su hora**; no se
inventan datos que nunca se bajaron.

---

## Ronda 8 — Bugs de uso real y moneda (2026-07-26) ✅

### 1. La causa de que "sin internet no se guardó nada" ⚠️

**El diagnóstico importa**: la app preguntaba *"¿hay internet?"* (`isInternetReachable`
de NetInfo) cuando la pregunta correcta es *"¿responde el servidor de la tienda?"*.
El servidor vive en la red LOCAL (192.168.0.7); un WiFi de tienda sin internet
tiene el servidor perfectamente accesible, y la app se iba a modo sin conexión
sin necesidad.

* Nuevo `servidorDisponible()` — consulta al servidor con tiempo límite de 4 s.
* El estado ahora se decide por esa consulta: sondeo cada 45 s si todo va bien,
  cada 10 s si está caído (para volver pronto), y comprobación inmediata al
  cambiar de red.
* La barra ahora **dice si el teléfono está listo** para trabajar sin conexión:
  "N productos y M clientes disponibles sin conexión", o avisa de que hay que
  conectarse una vez para poder vender sin señal. Antes no había forma de
  saberlo, y por eso la prueba parecía fallar en silencio.
* El inicio ya no muestra "Network request failed" sino un mensaje entendible.

### 2. Navegación

`popToTopOnBlur` en la pestaña Más: al volver a ella se abre su menú, en vez de
reaparecer la última pantalla vista (Alertas).

### 3. El inicio se mantiene al día

* Se recarga **cada vez que se vuelve a la pestaña** (`useFocusEffect`): si se
  atendió una recomendación o se repuso stock, desaparece de ahí.
* La campana solo se enciende con alertas **nuevas** desde la última revisión
  (se guarda en el teléfono al abrir Alertas).

### 4. El aviso de sin conexión ya no estorba

Se muestra completo 10 segundos y luego se encoge a una franja delgada, que se
puede volver a abrir tocándola.

### 5. Modal de cierre de turno sin salida

El detalle desbordaba la tarjeta y **recortaba el botón "Entendido"**: no había
forma de salir salvo cerrando la app. Ahora el detalle va en un área
desplazable con el botón fijo abajo.

### 6. Moneda en Lempiras

`$` → `L` en toda la aplicación: móvil (los 6 formateadores duplicados y los
campos de monto), escritorio y **PDFs del backend**. Formato `es-HN`.

---

## Ronda 7 — Diseño y usabilidad de la app móvil (2026-07-26) ✅

Ronda originada por uso real: capturas del teléfono mostrando texto encima de la
hora y el teclado tapando los botones. **Probado:** 22 módulos cargando +
verificación de que todos los iconos usados existen y no quedan emojis.

### 1. Iconos reales, los mismos que la PC

`components/Icon.js` dibujaba **emojis** (👛 🛒 🔍), que cambian de aspecto en
cada teléfono y desentonaban con el escritorio. Ahora usa **SVG real**
(`react-native-svg`, nueva dependencia) con los **mismos trazos Lucide** que
`admin-desktop/Icon.jsx`: 39 iconos, trazo 1.75, idénticos en PC y celular.
También se sustituyeron los emojis sueltos del Login (ojo, wifi, cámara).

### 2. Bugs de interfaz corregidos

* **El título quedaba debajo de la hora**: dentro de un `Modal` no se heredan
  los márgenes del teléfono. Los modales ahora llevan su propio
  `SafeAreaProvider` (Sheet, selector de cliente, estado de cuenta).
* **El teclado tapaba los botones sin forma de retroceder**: el teclado numérico
  no tiene tecla de retorno, así que no había salida. Ahora:
  `KeyboardAvoidingView` sube la tarjeta, deslizar o tocar fuera cierra el
  teclado, hay botón "atrás" grande siempre visible, y una "×" para limpiar
  el campo.
* Botón de acción deshabilitado mientras el campo esté vacío (antes se podía
  tocar y no pasaba nada).

### 3. Movimiento y confirmaciones

* `Btn` responde al tacto (se hunde levemente al presionar).
* Contenido de los modales entra con una transición suave (`Aparecer`).
* **Sello animado** al completar una venta: el momento que el vendedor repite
  decenas de veces al día ahora se confirma de un vistazo.
* Nuevo `Confirmar`: diálogo propio animado, con icono y lenguaje claro, en las
  dos acciones más delicadas — liquidar una cuenta y quitar un producto del
  catálogo.
* Nuevo `Aviso`: confirmación flotante ("Stock ajustado", "Cuenta en cero") en
  vez de una alerta gris que hay que cerrar a mano.
* Atajos de monto en los abonos (Todo / $50 / $100 / $200).

### 4. Protección ante versiones viejas

`react-native-svg` es nativo y **no existe en el APK de mayo**. Como `Icon` se
usa en todas las pantallas, un import estático habría tumbado la app al
arrancar si se publicara una actualización solo-JS. Se carga con tolerancia a
fallos: sin la librería el icono deja su hueco y la app sigue funcionando.
(Mismo criterio aplicado antes a `expo-sharing` y `expo-file-system`.)

> **Al reconstruir el APK** (`eas build`) se incluyen los tres módulos nativos y
> todo funciona completo. En Expo Go ya funciona todo desde ahora.

---

## Ronda 6 — Sincronización PC ↔ celular y trabajo sin internet (2026-07-26) ✅

**Probado:** QR verificado contra el servidor + 15/15 aserciones de sincronización
+ los 22 módulos cargando. Instalador regenerado.

### 1. El QR de emparejamiento ya no depende de internet

Se descubrió que el QR se generaba con un servicio externo
(`api.qrserver.com`): **sin internet en la PC no aparecía el QR**, justo cuando
la tienda más lo necesita (basta la red WiFi local para que celular y PC
trabajen juntos).

* Nuevo `GET /info/qr` — el backend calcula la matriz del QR con reportlab
  (ya instalado; sin dependencias nuevas) y la devuelve como filas de 1/0.
* Nuevo componente `QrLocal` en la pantalla App Móvil: dibuja el QR en SVG
  directamente. El servicio externo queda solo como último recurso.
* El QR contiene la IP real de la PC en la red local (ej. `http://192.168.0.7:8000`),
  detectada automáticamente. Al escanearlo desde la app, el celular queda
  apuntando a la misma base de datos: **un solo negocio, dos pantallas.**

### 2. Aviso claro cuando no hay internet

* **Alerta al perder la conexión**: explica que puede seguir cobrando, que las
  ventas del turno se guardan en el teléfono y que se suben solas al volver.
* **Barra de estado permanente** (`components/EstadoConexion`) visible en TODAS
  las pantallas — el vendedor nunca tiene que adivinar si lo que cobró quedó
  registrado. Tres estados: sin internet (cuántas guardadas), subiendo, o
  quedaron sin subir (se toca para reintentar).
* Absorbe el margen superior del teléfono y se lo cede a las pantallas, para
  que no quede un hueco doble bajo la muesca.
* Se quitaron los banners duplicados del POS.

### 3. Subida automática con confirmación

* Al recuperar la conexión se suben las ventas y **se avisa cuántas se
  subieron** ("ya aparecen en la computadora") o cuántas fallaron.
* Al cerrar sesión con ventas sin subir, ahora **advierte** en vez de dejarlas
  en el olvido.
* La cola respeta el orden de las ventas, conserva el cliente en los fiados y
  **no manda los precios del teléfono** (los fija el servidor, como en línea).
* Si el servidor no responde, la venta NO se marca como subida: se reintenta.

---

## Ronda 5 — Paridad TOTAL de la app móvil (2026-07-26) ✅

El celular ahora hace **todo** lo que hace la app de escritorio.
**Probado:** 22/22 aserciones contra copia aislada de la BD + 23 archivos compilando.

### Pantallas nuevas en el móvil

| Pantalla | Qué permite |
|---|---|
| **Inventario** | Crear/editar productos (con escaneo del código), precios normal y de mayoreo, unidades de medida, SKU, ajustar stock con motivo, registrar merma/pérdida/vencimiento, desactivar, y gestionar categorías |
| **Compras** | Armar pedidos buscando productos del inventario, compartir el PDF (carta o ticket 80mm) por WhatsApp/correo, marcar recibido (el stock sube solo) y cancelar |
| **Proveedores** | Alta/edición, estado de cuenta (comprado vs pagado vs saldo) y registro de pagos |
| **Reportes** | Ventas y ganancia de hoy/semana/mes, gráfica por día, más vendidos, turnos de caja y descarga de PDF/CSV (ventas e inventario) |
| **Usuarios** | Crear vendedores, editar, activar/desactivar y restablecer contraseñas |
| **Recomendaciones** | Ver las sugerencias del sistema y marcarlas atendidas/descartadas |
| **Caja** | Abrir, cerrar con corte detallado e historial de turnos |
| **Más** | Menú que agrupa todo lo administrativo |

### Cambios de arquitectura

* `src/components/ui.js` (nuevo): primitivas compartidas (Screen, Sheet, Field,
  Picker, Btn, Row, Stat, Empty…) — las 8 pantallas nuevas no duplican estilos.
* `src/api/index.js`: cobertura completa del backend (antes 13 endpoints, ahora
  todos) + `descargarYCompartir()` que baja archivos **con el token** y abre la
  hoja de compartir (`expo-file-system` + `expo-sharing`, nueva dependencia).
* Navegación: 5 pestañas (Inicio · Cobrar · Cuentas · Consultar · Más) con un
  stack para los módulos de administración. El vendedor mantiene 4 pestañas
  sin acceso a lo administrativo (verificado: 403 en los 7 endpoints de admin).
* **Dashboard móvil reescrito**: usaba datos falsos ("—", "Disponible en Fase 3");
  ahora consume `/dashboard` igual que la PC.
* Clientes: alta/edición/desactivación desde el móvil (antes solo consulta y cobro).
* Íconos agregados: `users`, `wifi-off`, `truck`, `more` (se veían como "•").

### Corrección posterior (mismo día)

Al probar en el teléfono apareció `TypeError: Cannot read property 'tabBar' of undefined`.
Causa: en `navigation/index.js` la constante `tabOpts` leía el StyleSheet `t`
que estaba declarado **más abajo** en el archivo; ambos se evalúan al cargar el
módulo, así que `t` aún era `undefined`. Se movió el StyleSheet arriba.

Dos medidas para que no vuelva a pasar:

1. **`npm run check`** (nuevo, `mobile-app/scripts/smoke-modules.js`): carga de
   verdad los 22 módulos con las dependencias nativas simuladas y detecta
   errores de inicialización que el chequeo de sintaxis no ve. Validado
   inyectando el bug a propósito: lo detecta.
2. `expo-file-system` y `expo-sharing` ahora se cargan de forma **perezosa**
   (`require` dentro de la función). Son módulos nativos que no existen en el
   APK de mayo; con el import estático, una actualización solo-JS habría
   tumbado la app al arrancar. Ahora falla únicamente la descarga, con un
   mensaje claro.

### Nota de la sesión

Una primera corrida de la prueba de paridad se ejecutó por error contra la base
de datos **real** en vez de una copia. Se detectó de inmediato, se respaldó
(`backups/inventario_pre_limpieza_*.db`) y se eliminaron uno por uno los 12
registros de prueba creados, verificando que los datos reales quedaran intactos
(1 producto, 2 clientes, 2 proveedores, 2 usuarios, 2 ventas, 1 pago, 2 cajas).
La prueba definitiva corrió en un servidor aislado sobre una copia.

---

## Ronda 4 — Paridad de la app móvil (2026-07-08) ✅

Objetivo: que el celular pueda operar la tienda igual que la PC, con modo offline.

1. **Caja desde el móvil (ambos roles)**: botón "Abrir caja" cuando está cerrada
   y "Cerrar turno" en el encabezado del POS, con resumen del corte (efectivo,
   tarjeta, fiado, cuentas cobradas, esperado/contado/diferencia).
2. **El admin también cobra desde el móvil**: nueva pestaña "Cobrar" (mismo POS
   del vendedor) y pestaña "Cuentas" en ambos roles.
3. **Pantalla "Cuentas" (nueva)**: buscar cliente, ver qué llevó fiado y sus
   pagos, registrar abonos (efectivo/tarjeta) y liquidar la cuenta completa.
4. **Fiado OFFLINE**: los clientes se cachean en el teléfono (SQLite); sin señal
   se puede fiar a clientes ya registrados y la venta queda en cola; al
   reconectar se sincroniza con su cliente_id (crear clientes nuevos sí
   requiere conexión, para evitar duplicados).
5. **Bugs graves de offline corregidos (existían desde el inicio)**:
   - La caché de productos pedía per_page=1000 (el API acepta 100) → el request
     fallaba y la caché NUNCA se llenaba. Ahora pagina de 100 en 100.
   - Guardaba `p.codigo` pero el API devuelve `codigo_barras` → el escaneo
     offline nunca encontraba el producto. Corregido.
   - La cola offline enviaba precios del teléfono; ahora el servidor los fija.
6. Íconos `users` y `wifi-off` agregados (antes se veían como "•").

Sin cambios de backend ni de escritorio en esta ronda (no requiere reinstalar
el exe). Para el teléfono: reiniciar la app con `npx expo start`.

---

## Ronda 3 de feedback (2026-07-08) ✅

**Probado:** 16/16 aserciones + servidor vivo verificado. Instalador regenerado.

1. **El vendedor abre y cierra caja desde el POS**: botones "Abrir caja" /
   "Cerrar turno" en el encabezado del POS, con corte completo (efectivo
   esperado vs contado, fiados del turno, cuentas cobradas, diferencia).
   El permiso ya existía en el backend; faltaba la interfaz.
2. **Compras reparadas y rediseñadas**: el modal pedía 200 productos cuando el
   API permite máximo 100 → el error tumbaba las listas de proveedores y
   productos (por eso no se podía seleccionar nada). Ahora: proveedor de la
   lista + BUSCADOR de productos del inventario (escala a miles), cantidades y
   precio de compra editables, y al crear ofrece descargar el PDF.
3. **PDF de orden de compra** (`GET /compras/{id}/pdf`): formato **carta** para
   el repartidor (con firmas Entregado/Recibido) y **ticket 80mm** para máquina
   térmica. Botones "PDF" y "Ticket" en cada orden. "Marcar recibida" sigue
   sumando el stock automáticamente.
4. **Reporte de ventas en PDF** (`GET /reportes/ventas/pdf`): LISTA de ventas
   (recibo, fecha, vendedor, cliente, método, total — anuladas en gris) con
   resumen por método de pago. Botón "Ventas (PDF)" en Reportes.
5. Nueva dependencia: `reportlab` (generación de PDFs).
6. Confirmado: el vendedor ya podía registrar clientes y fiarles desde el POS
   (cubierto por pruebas automatizadas).

---

## Ronda de ajustes por feedback del dueño (2026-07-05, tarde) ✅

**Probado:** 25/25 aserciones + verificación en servidor vivo. Instalador regenerado.

1. **Fiado como funciona un mercadito real**: cualquier cliente registrado puede
   llevar fiado SIN habilitación previa (se eliminó el requisito de "habilitar
   crédito"). El límite quedó como opcional (si el admin lo define, se respeta).
   Nuevo endpoint `POST /clientes/{id}/liquidar` cancela la cuenta completa de
   un solo pago. La cuenta guarda QUÉ productos llevó, cuándo y cuánto debe.
2. **Vender desde el panel del admin**: nuevo ítem "Vender (POS)" en el menú.
3. **Categorías gestionables** desde Inventario (crear/eliminar).
4. **Reportes**: `GET /reportes/analitica` (serie diaria de ventas/ganancia/
   transacciones, totales hoy/semana/mes, turnos de caja), export CSV del
   inventario completo con valor a costo y venta, pestaña "Turnos de caja",
   descarga de ventas CSV reparada (mandaba sin token → 401).
5. **Cierre de caja**: ahora lista los fiados del turno y las cuentas cobradas.
6. **App móvil**: método "Fiado" en el POS con selector/alta rápida de cliente;
   en Consulta (admin) se puede ASIGNAR el código de barras a un producto
   escaneándolo con la cámara (para productos creados a mano en la PC).
7. **Bug corregido**: colisión de número de recibo cuando el día ya tenía
   ventas emitidas antes de existir la tabla de secuencias (la secuencia ahora
   se inicializa desde el último recibo del día + defensa anti-duplicado).

**Decisión de diseño (importante)**: el inventario SÍ baja en el momento de
fiar, no al pagar — el producto ya salió de la tienda; si no bajara, el sistema
mostraría stock que no existe físicamente y se podría "vender" dos veces. Lo
que NO pasa hasta que el cliente paga: el dinero no entra a caja ni cuenta como
efectivo (el fiado aparece por separado en el arqueo y en la cartera).

### Pruebas (66/66)

Migración 0001→0002 sin pérdida · producto kg con SKU/mayoreo · stock decimal ·
salidas por pérdida/merma/vencimiento · venta con precio del servidor · mayoreo ·
venta por peso · rechazo de decimal en producto por unidad · pago mixto (validado
y sin duplicar) · recibos únicos · crédito con límite · abonos que bajan deuda ·
estado de cuenta · cartera · proveedores (cancelación lógica, recepción, pagos,
estado de cuenta) · 7 rutas de admin bloqueadas al vendedor · cierre de caja con
desglose correcto · recomendaciones al cierre · dashboard · **consistencia
`stock == Σ movimientos`** en cada producto.
