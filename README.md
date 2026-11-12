# The Market — Punto de venta e inventario

Sistema de punto de venta (POS) e inventario para una tienda de abarrotes, con aplicación de escritorio, aplicación móvil y una API central. Diseñado para funcionar en la **red local de la tienda, sin depender de internet**, y para seguir vendiendo desde el teléfono aunque el servidor no esté disponible.

| | |
|---|---|
| **Versión** | 2.0.0 |
| **Estado** | Entregado e instalado en el negocio del cliente |
| **Backend** | Python · FastAPI · SQLAlchemy 2 · Alembic · SQLite |
| **Escritorio** | Electron · React |
| **Móvil** | React Native · Expo 54 · SQLite local |
| **Moneda / región** | Lempiras (L), `es-HN` |

---

## Tabla de contenido

1. [Qué resuelve](#qué-resuelve)
2. [Funcionalidades](#funcionalidades)
3. [Arquitectura](#arquitectura)
4. [Decisiones técnicas](#decisiones-técnicas)
5. [Modo sin conexión](#modo-sin-conexión)
6. [Seguridad](#seguridad)
7. [Estructura del repositorio](#estructura-del-repositorio)
8. [Puesta en marcha](#puesta-en-marcha)
9. [Documentación](#documentación)
10. [Autor](#autor)

---

## Qué resuelve

Un mercadito lleva sus ventas, su inventario y sus cuentas por cobrar ("fiado") en cuadernos. El sistema reemplaza ese flujo con:

- una **caja** para vender rápido, con lector de código de barras;
- un **inventario** que se descuenta solo con cada venta y avisa cuando falta producto;
- un control de **clientes con crédito** y de **cuentas por pagar a proveedores**;
- **reportes** que el dueño puede consultar desde la computadora o desde el teléfono.

La tienda tiene internet inestable, así que todo corre en una sola PC dentro del local y los teléfonos se conectan a ella por WiFi.

---

## Funcionalidades

| Módulo | Descripción |
|---|---|
| **Venta (POS)** | Venta por unidad o por peso/volumen (cantidades decimales), cuatro métodos de pago, selección de cliente, recibo con numeración consecutiva. |
| **Caja** | Apertura y cierre por turno, con corte que incluye ventas, fiados y cobros del turno. |
| **Inventario** | Entradas, salidas y ajustes con historial de movimientos. Alertas de existencia mínima. |
| **Productos y categorías** | Catálogo con código de barras; asignación de código desde la cámara del teléfono. |
| **Compras y proveedores** | Órdenes de compra, recepción de mercadería y pagos a proveedores. |
| **Clientes y fiado** | Ventas a crédito con límite opcional, abonos y liquidación de cuenta. |
| **Recomendaciones** | Sugerencias de reabastecimiento a partir del movimiento de ventas. |
| **Reportes** | Ventas, analítica e inventario; exportación a PDF (carta y ticket de 80 mm) y CSV. |
| **Usuarios** | Roles **administrador** y **vendedor** con permisos declarativos. |

La aplicación móvil tiene paridad con la de escritorio: el administrador puede operar el negocio completo desde el teléfono.

---

## Arquitectura

```text
            Red local de la tienda (WiFi)

 ┌────────────────────┐        ┌─────────────────────┐
 │  Escritorio        │        │  Móvil              │
 │  Electron + React  │        │  React Native/Expo  │
 │  (admin, caja)     │        │  SQLite local       │
 └─────────┬──────────┘        └──────────┬──────────┘
           │        HTTP/JSON + JWT       │
           └──────────────┬───────────────┘
                          ▼
              ┌──────────────────────┐
              │  API  FastAPI        │
              │  routers → services  │
              │  → SQLAlchemy        │
              └──────────┬───────────┘
                         ▼
                  SQLite (un archivo)
```

La API se organiza por capas:

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Routers | `backend/app/routers/` | 13 módulos HTTP. Validan la entrada y delegan. |
| Servicios | `backend/app/services/` | Reglas de negocio: inventario, clientes, recomendaciones. |
| Núcleo | `backend/app/core/` | Configuración, seguridad, permisos, generación de PDF, arranque. |
| Modelos y esquemas | `backend/app/models/`, `schemas/` | SQLAlchemy y Pydantic v2. |
| Migraciones | `backend/alembic/` | Esquema versionado; se aplican solas al arrancar. |

El emparejamiento del teléfono con el servidor se hace escaneando un **código QR** que la propia API genera, de modo que el usuario no escribe direcciones IP.

---

## Decisiones técnicas

Las que más pesaron en el diseño, con su motivo:

- **Una sola puerta al stock.** Toda modificación de existencias pasa por `InventarioService`; el endpoint de edición de productos no acepta el campo `stock`. Así cada cambio deja un movimiento auditable y no hay dos rutas que puedan descuadrar el inventario.
- **Dinero como decimal, nunca flotante.** Los importes usan `Numeric(12,2)` y las cantidades `Numeric(10,3)`. Con `float`, la suma de un turno puede diferir por centavos de lo que hay en la caja.
- **El precio lo fija el servidor.** El cliente envía qué producto y cuánto; el precio se toma de la base de datos. Un cliente manipulado no puede vender a otro precio.
- **Numeración de recibos atómica.** Una tabla de secuencias evita recibos duplicados cuando dos cajas venden a la vez.
- **Permisos declarativos.** `core/permissions.py` define permisos `modulo.accion` por rol y los routers los exigen con `require_permission`, en lugar de comparaciones `if rol == "admin"` repartidas por el código.
- **SQLite a propósito.** Un solo comercio, una sola PC y nadie que administre un servidor de base de datos: un archivo que se respalda copiándolo es la opción más fácil de mantener. El acceso por SQLAlchemy deja abierta la migración a PostgreSQL.
- **Migraciones con Alembic desde el arranque.** Las instalaciones se actualizan sin intervención manual sobre la base de datos.

El razonamiento completo y el historial de cambios están en [`docs/AUDITORIA.md`](docs/AUDITORIA.md) y [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

---

## Modo sin conexión

La aplicación móvil sigue operando si pierde el servidor:

- `src/storage/offline.js` es la única puerta de lectura y escritura: decide si responde el servidor o el **espejo local** en SQLite.
- Las ventas y acciones hechas sin conexión (abonos, apertura y cierre de caja, clientes nuevos) se guardan en una **cola** y se suben en orden cronológico al reconectar.
- La disponibilidad se mide con un *ping* a la API, no con el estado de internet del teléfono: el servidor vive en la red local y un WiFi sin internet sigue siendo útil.
- **Inicio de sesión sin conexión:** tras un ingreso en línea se guarda un hash SHA-256 con sal única por dispositivo. La contraseña nunca se almacena.
- Todas las peticiones tienen tiempo de espera, para que la aplicación pase a modo local en segundos en vez de quedarse colgada.

---

## Seguridad

- Contraseñas con **bcrypt**, con re-hash transparente de formatos anteriores.
- Autenticación con **JWT**; la clave de firma se genera en la instalación y se guarda fuera del repositorio.
- Autorización por permisos verificada en el servidor en cada endpoint.
- Validación de entrada con Pydantic en toda la API.
- La base de datos, la clave de firma y los respaldos están excluidos por `.gitignore`.

> El usuario administrador que crea `app/seed.py` es solo para la primera instalación; su contraseña debe cambiarse al entrar por primera vez.

---

## Estructura del repositorio

```text
backend/            API FastAPI, migraciones Alembic y datos iniciales
frontend/           Pantallas de escritorio (React)
electron-app/       Empaquetado de escritorio para Windows
mobile-app/         Aplicación móvil (Expo / React Native)
admin-desktop/      Iconos y componentes compartidos del escritorio
vendedor-desktop/   Prototipos de diseño
mobile-admin/       Prototipos de diseño
mobile-vendedor/    Prototipos de diseño
docs/               Auditoría, historial de cambios, instalación y manual
instalar.bat        Instalador para la PC de la tienda
backup.py           Respaldo de la base de datos
```

---

## Puesta en marcha

**Requisitos:** Python 3.11+, Node.js 20+.

### API

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Documentación interactiva en `http://localhost:8000/docs`. Las variables opcionales están en [`backend/.env.example`](backend/.env.example).

### Escritorio

```bash
cd electron-app
npm install
npm start
```

`npm run build` genera el instalador de Windows.

### Móvil

```bash
cd mobile-app
npm install
npm start
```

`npm run check` ejecuta una verificación de carga de módulos.

---

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/INSTALACION.md`](docs/INSTALACION.md) | Instalación paso a paso en la PC del negocio. |
| [`docs/AUDITORIA.md`](docs/AUDITORIA.md) | Auditoría técnica previa al rediseño y plan por fases. |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Cambios por ronda, con el impacto técnico de cada uno. |
| [`docs/manual_usuario.html`](docs/manual_usuario.html) | Manual para el usuario final. |

---

## Autor

**Jeferson Herrera** — [@Ary409](https://github.com/Ary409)

Diseño, desarrollo e instalación del sistema completo: API, aplicación de escritorio y aplicación móvil.

Proyecto publicado con fines de portafolio. Todos los derechos reservados.
