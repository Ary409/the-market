# Auditoría del Sistema — FASE 1

> Documento de análisis. **No se ha modificado ningún archivo.** El objetivo es entender
> el estado actual antes de rediseñar la lógica de negocio (Fase 2).
> Fecha: 2026-07-04.

---

## 1. Resumen ejecutivo

El proyecto es un **POS + inventario para un mini‑supermercado** con un backend funcional en
FastAPI y varias interfaces (web/Electron, móvil Expo y varios *mockups* de diseño). El backend
ya cubre el "camino feliz" de: productos, categorías, proveedores, usuarios, ventas, caja,
compras (órdenes), movimientos de stock, reportes y dashboard.

**Veredicto:** hay una **base aprovechable** (modelo de datos razonable, libro de movimientos de
stock, JWT, paginación consistente), pero **no está lista** para lo que pides. Faltan módulos
completos (Clientes/crédito, recomendaciones, estado de cuenta de proveedores), la arquitectura
mezcla responsabilidades (lógica de negocio dentro de los *routers*), y hay **invariantes de
negocio que se pueden violar** (el stock se puede editar directamente saltándose el libro de
movimientos; posibles ventas con stock negativo por condiciones de carrera). No requiere reescribir
desde cero: se puede **refactorizar de forma incremental**.

---

## 2. Stack y estructura

### 2.1 Tecnologías

| Capa | Tecnología | Notas |
|---|---|---|
| Backend | FastAPI + SQLAlchemy 2.0 + **SQLite** | `check_same_thread=False`, sin pool real |
| Auth | JWT (`python-jose`) + `passlib` | Hash `sha256_crypt` (⚠️ `requirements.txt` pide `bcrypt`) |
| Frontend web | React **por CDN** + Babel en el navegador (JSX sin build) | `frontend/` |
| Desktop | **Electron** que empaqueta `frontend/` | `electron-app/` |
| Móvil | **React Native / Expo** con SQLite offline + cola de sync | `mobile-app/` (real) |
| Mockups | `admin-desktop/`, `vendedor-desktop/`, `mobile-admin/`, `mobile-vendedor/` | Prototipos con `mockData.js` |

### 2.2 Estructura del backend

```
backend/app/
├── core/          config, security (JWT/hash), dependencies (guards de rol)
├── crud/          productos, usuarios, categorias, proveedores   ← solo 4 entidades
├── models/        models.py  (10 tablas, todo en un archivo)
├── routers/       auth, categorias, proveedores, productos, usuarios,
│                  inventario, compras, ventas, caja, reportes, dashboard
├── schemas/       schemas.py  (todos los Pydantic en un archivo)
├── database.py    engine + SessionLocal + get_db
└── main.py        crea tablas con create_all(), CORS *, incluye routers
```

**Observación clave:** la capa `crud/` solo existe para las 4 entidades "simples". Toda la lógica
de negocio real (ventas, inventario, compras, caja, reportes, dashboard) vive **directamente dentro
de los routers**. No hay capa de *servicios*, *casos de uso*, *repositorios* ni *dominio*.

---

## 3. Modelo de datos actual

10 tablas en `models/models.py`:

- **Usuario** — `rol` es un `Enum('admin','vendedor')`, `activo`, timestamps.
- **Categoria** — nombre único, descripción.
- **Proveedor** — datos de contacto, `activo`.
- **Producto** — `nombre`, `codigo_barras`, `precio_compra`, `precio_venta`, `stock`,
  `stock_minimo`, `fecha_vencimiento`, `categoria_id` (1), `proveedor_id` (1), `activo`.
- **Venta** — `numero_recibo`, `usuario_id`, `total`, `metodo_pago (efectivo/tarjeta/mixto)`,
  `monto_recibido`, `cambio`, `estado (completada/anulada)`.
- **DetalleVenta** — `venta_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`.
- **MovimientoStock** — `tipo (entrada/salida/ajuste/devolucion)`, `cantidad`, `stock_anterior`,
  `stock_nuevo`, `motivo`, `usuario_id`, `referencia_id`. **Libro de movimientos** ✅
- **CajaSesion** — apertura/cierre, monto inicial/contado/diferencia, `estado`.
- **OrdenCompra** + **DetalleCompra** — órdenes a proveedor, `estado (pendiente/recibida)`.

### Relaciones
`Categoria 1—N Producto`, `Proveedor 1—N Producto`, `Proveedor 1—N OrdenCompra`,
`Venta 1—N DetalleVenta`, `Producto 1—N MovimientoStock`, `OrdenCompra 1—N DetalleCompra`,
`Usuario 1—N Venta / MovimientoStock / CajaSesion`.

---

## 4. Flujo del sistema (actual)

1. **Login** → `POST /auth/login` devuelve JWT + rol + nombre. El front guarda en `localStorage`.
2. **Gating por rol**: el front decide qué mostrar (`vendedor` → pantalla POS; `admin` → Shell
   con módulos). El backend protege con `require_admin` / `require_any_role`.
3. **Venta**: exige **caja abierta** → valida stock por ítem → calcula total y cambio → crea
   `Venta` + `DetalleVenta` → descuenta `producto.stock` y registra un `MovimientoStock` de salida.
4. **Inventario**: `entrada` y `ajuste` pasan por un helper `_registrar_movimiento` que sí crea
   el movimiento. Alertas de stock bajo y "por vencer".
5. **Compras**: crear orden → `recibir` suma stock y registra entrada → `cancelar` (borra).
6. **Caja**: abrir (una sola global) → cerrar calcula ventas desde la apertura y reconcilia.
7. **Reportes/Dashboard**: agregaciones SQL de ventas, top productos, ganancia por categoría.

---

## 5. Qué está BIEN implementado (reutilizable)

- ✅ **Concepto de libro de movimientos** (`MovimientoStock` con `stock_anterior`/`stock_nuevo`).
  Es la pieza correcta para trazabilidad; solo hay que **convertirla en obligatoria**.
- ✅ **Autenticación JWT** limpia, con `get_current_user` y guards de rol reutilizables.
- ✅ **Paginación consistente** (`{total, page, per_page, items}`) en todos los listados.
- ✅ **CRUD de productos** con `joinedload` (evita N+1) y borrado lógico (`activo=False`).
- ✅ **Reportes con agregación en SQL** (top ventas, ganancia bruta por categoría) — buena base.
- ✅ **Reset de contraseña** con `secrets`, borrado lógico de usuarios, no auto‑desactivación.
- ✅ **Caja con arqueo** (apertura/cierre + diferencia).
- ✅ **Móvil con offline real**: caché de productos + cola de ventas pendientes + `sync.js`.
  El diseño "toda la venta se reenvía al backend" es correcto (no duplica lógica de negocio).
- ✅ **Cliente API** (`frontend/api.js`, `mobile-app/src/api`) completo y ordenado.

---

## 6. Qué está MAL o es RIESGOSO (debe reemplazarse/corregirse)

### 🔴 Críticos (violan invariantes o seguridad)

1. **El stock se puede modificar directamente**, saltándose el libro de movimientos:
   - `PUT /productos/{id}` acepta `stock` (`ProductoUpdate.stock`) y lo sobreescribe.
   - `POST /productos` fija `stock` inicial **sin** generar un movimiento de apertura.
   Esto rompe la regla *"nunca modificar stock directamente; todo cambio por movimiento"*.

2. **Condiciones de carrera / stock negativo**: se valida stock y luego se descuenta **sin bloqueo**
   de fila (`with_for_update`). Dos ventas simultáneas del mismo producto pueden sobrevender.
   Con SQLite y `check_same_thread=False` no hay aislamiento suficiente.

3. **El vendedor puede alterar precios**: la venta toma `precio_unitario` **del cliente**
   (`VentaItemCreate.precio_unitario`), no del precio del producto en el servidor. Contradice
   *"el vendedor no debe modificar precios"* y permite manipular el ticket.

4. **`numero_recibo` por `COUNT`**: `VTA-YYYYMMDD-{count+1}` puede colisionar bajo concurrencia y
   reventar la restricción `unique` (500). Debe ser una secuencia atómica.

5. **Seguridad de config**:
   - `CORS allow_origins=["*"]` **con** `allow_credentials=True` (combinación inválida/insegura).
   - `SECRET_KEY` por defecto embebido en el código.
   - Hash `sha256_crypt` (más débil que bcrypt/argon2) y **contradice** `requirements.txt`.
   - Sin *rate limiting* en login. Token de 8 h sin refresh ni revocación.

### 🟠 Importantes (lógica de negocio incompleta o incorrecta)

6. **Caja no está ligada a la venta**: `Venta` no tiene `caja_sesion_id`. El cierre suma ventas por
   `fecha >= apertura` de forma **global** → con dos cajas/turnos se **duplica** el conteo. Además
   solo existe **una caja global** (no hay turno por vendedor, aunque el requisito pide "cerrar turno").

7. **`metodo_pago='mixto'` mal contabilizado**: en el cierre, una venta mixta suma su total **completo**
   tanto a efectivo como a tarjeta (doble conteo) y no hay campos para el desglose efectivo/tarjeta.

8. **`cancelar_orden` hace `DELETE` físico** de la orden → se pierde historial (contradice
   *"nunca eliminar historial"*).

9. **Zona horaria**: "hoy" se calcula en **UTC** (`inicio_hoy`), no en la hora local de la tienda →
   dashboard/reportes de "hoy" quedan corridos según el huso.

10. **Tipos de movimiento insuficientes**: el enum solo tiene `entrada/salida/ajuste/devolucion`.
    Faltan `perdida`, `vencimiento`, `merma`, `auditoria` que tú pides explícitamente.

### 🟡 Estructurales (deuda técnica / escalabilidad)

11. **Sin capa de servicios/casos de uso**: la lógica vive en los routers. La creación de movimientos
    está **duplicada** en `ventas`, `compras`, `inventario` y `anular`. Viola SRP y Clean Architecture.

12. **Sin migraciones (Alembic)**: solo `Base.metadata.create_all()`. Cualquier cambio de modelo en
    una BD existente **no se aplica** → riesgo de pérdida de datos. Choca con *"migrar antes de borrar"*.

13. **Roles rígidos y hardcodeados**: `Enum('admin','vendedor')` + `if rol == 'admin'`. Agregar un rol
    o un permiso fino exige tocar código. No hay tabla de permisos/políticas.

14. **Frontend sin build**: React + Babel **en el navegador** (lento, no apto para producción). El
    *gating* por rol es solo de UI. Varios directorios *mockup* generan ruido/código muerto.

15. **Semilla duplicada e inconsistente**: `backend/seed.py` (`admin@themarket.com`) vs
    `backend/app/seed.py` (`admin@tienda.com`). Hay que consolidar en una sola.

---

## 7. Módulos que FALTAN (según tus requisitos)

| Requisito | Estado actual |
|---|---|
| **Clientes** (registro) | ❌ No existe tabla ni router |
| **Crédito / cuenta corriente / cartera** (saldo, abonos, historial) | ❌ Inexistente |
| **Recomendaciones inteligentes** (stock bajo, agotados, más/menos vendidos, acción sugerida) | ❌ Solo hay `alertas` de stock mínimo |
| **Proveedores: estado de cuenta, historial de pagos, abonos** | ❌ Solo datos de contacto + órdenes |
| **Producto: SKU, unidad de medida, precio mayoreo, stock máximo, stock reservado, lotes** | ❌ Faltan todos esos campos |
| **Auditoría general** (quién cambió precios, desactivó usuarios, etc.) | ❌ Solo movimientos de stock |
| **Dashboard**: ventas del mes, más vendidos, clientes con deuda, total por cobrar, ganancias, compras recientes, agotados | ⚠️ Parcial (falta la mayoría) |
| **Permisos granulares por módulo** | ❌ Solo `admin` vs `vendedor` |
| **Multi‑sucursal / promociones / fidelización / factura electrónica** (futuro) | ❌ Sin base preparada |

---

## 8. Código a REUTILIZAR vs ELIMINAR/DEPRECAR

**Reutilizar (con refactor):** modelos como base, `MovimientoStock`, auth/JWT, patrón de
paginación, CRUD de productos/usuarios, reportes SQL, clientes API (web y móvil), caja (con
correcciones), offline del móvil.

**Eliminar/consolidar:** una de las dos `seed.py`; los *mockups* de diseño que ya no se usen
(`vendedor-desktop`, `mobile-admin`, `mobile-vendedor`) — ⚠️ **ojo**: el build de Electron sí
referencia `admin-desktop/Icon.jsx` y `components.jsx`, revisar antes de borrar; el `DELETE`
físico de órdenes de compra (cambiar por anulación lógica).

---

## 9. Riesgos principales

1. **Integridad de inventario**: hoy el stock puede quedar inconsistente con el libro de movimientos.
2. **Concurrencia**: sobreventa y recibos duplicados bajo carga (varias cajas a la vez).
3. **Pérdida de datos en cambios de esquema**: sin migraciones, evolucionar el modelo es peligroso.
4. **Seguridad**: CORS/JWT/hash como están no son aptos para producción ni red local abierta.
5. **Escalabilidad de SQLite**: sirve para una tienda; "múltiples sucursales" exigirá Postgres.

---

## 10. Propuesta de arquitectura objetivo (adelanto de Fase 2)

Migrar a **Clean Architecture modular** dentro del mismo backend FastAPI, por módulos de dominio:

```
backend/app/
├── modules/
│   ├── inventario/   (domain, application/use_cases, infrastructure/repos, api)
│   ├── ventas/
│   ├── compras/
│   ├── clientes/     ← NUEVO (crédito/cuenta corriente)
│   ├── proveedores/  (+ estado de cuenta / pagos)
│   ├── caja/
│   ├── recomendaciones/  ← NUEVO
│   └── usuarios/     (+ permisos/políticas)
├── shared/    (domain base, errores, unit-of-work, seguridad, paginación)
└── core/      (config, db, DI)
```

Principios: **una sola puerta para tocar stock** (servicio de inventario que siempre pasa por el
libro de movimientos), **casos de uso** por operación, **repositorios** detrás de interfaces,
**políticas de permisos** por módulo (no `if rol==...`), **Alembic** para migraciones, y
transacciones con bloqueo de fila para evitar sobreventa.

---

## 11. Hoja de ruta propuesta (incremental, sin romper lo existente)

| Fase | Entregable | Riesgo |
|---|---|---|
| **1** (esta) | Auditoría ✅ | — |
| **2.0** | Base de arquitectura: Alembic, config segura, capa de servicios/UoW, sin romper API | Bajo |
| **2.1** | **Inventario blindado**: stock solo por movimientos + bloqueo anti‑sobreventa + tipos (pérdida/vencimiento) | Medio |
| **2.2** | **Producto extendido**: SKU, unidad, precio mayoreo, stock min/max/reservado, lotes | Medio |
| **2.3** | **Ventas** por escáner y manual con precio del servidor + recibo atómico + caja ligada a venta | Medio |
| **2.4** | **Clientes + crédito** (cuenta corriente, abonos, cartera) | Alto (nuevo) |
| **2.5** | **Proveedores**: estado de cuenta, pagos; **Compras** sin borrado físico | Medio |
| **2.6** | **Permisos granulares** por módulo (admin/vendedor bien separados) | Medio |
| **2.7** | **Recomendaciones** (cierre diario) + **Dashboard** ampliado | Medio |
| **3** | Actualizar **API** y luego la **app móvil** (escáner, venta manual, turno, sync) | — |

> Cada sub‑fase: analizar → proponer → explicar impacto → **validar contigo** → implementar →
> probar → documentar. No se harán cambios masivos de una sola vez.

---

## 12. Decisiones tomadas (2026-07-04)

| Tema | Decisión | Implicación técnica |
|---|---|---|
| **Base de datos** | **Seguir en SQLite** por ahora | La concurrencia se maneja con transacciones y el *write-lock* de SQLite (chequeo+descuento de stock en la misma transacción). `SELECT ... FOR UPDATE` se añadirá al migrar a Postgres. Alembic en modo *batch* para alterar tablas. |
| **Frontend** | **Mantener React por CDN** (Electron) | No se reescribe la UI. Se siguen consumiendo endpoints; se extienden `frontend/api.js` y pantallas existentes. |
| **Unidad de venta** | **Unidad y peso/volumen** | `Producto` gana `unidad_medida`; `cantidad` pasa a **decimal** en ventas, compras y movimientos (ej. 0.5 kg). |
| **Dinero** | **Decimal exacto** | Migrar `Float` → `Numeric(12,2)` (o centavos) en precios, totales y montos. Redondeo consistente. |

**Pendiente por definir cuando lleguemos a esos módulos:** alcance del crédito (límite por cliente,
intereses, vencimiento de deuda) — se acordará al iniciar la sub‑fase 2.4 (Clientes).
