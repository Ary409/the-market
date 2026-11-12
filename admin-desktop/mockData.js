// Mock data for The Market admin desktop UI kit.
// All data is hardcoded; no API calls.

window.MOCK = {
  user: {
    name: "Ana Reyes",
    email: "ana@laesquina.com",
    role: "Admin",
    initials: "AR",
  },

  business: { name: "La Esquina" },

  categorias: ["Bebidas", "Snacks", "Lácteos", "Limpieza", "Abarrotes", "Panadería"],

  productos: [
    { id: 1, nombre: "Coca-Cola 600ml",        codigo: "7501031311309", categoria: "Bebidas",   stock: 128, stockMin: 24, compra: 12.50, venta: 18.50, activo: true,  thumb: "CC" },
    { id: 2, nombre: "Sabritas Original 45g",  codigo: "7501011112233", categoria: "Snacks",    stock: 4,   stockMin: 12, compra: 10.00, venta: 15.00, activo: true,  thumb: "SB" },
    { id: 3, nombre: "Leche entera Alpura 1L", codigo: "7501055304004", categoria: "Lácteos",   stock: 42,  stockMin: 20, compra: 22.00, venta: 28.00, activo: true,  thumb: "LE" },
    { id: 4, nombre: "Pan Bimbo grande",       codigo: "7501030456012", categoria: "Panadería", stock: 18,  stockMin: 10, compra: 38.00, venta: 48.00, activo: true,  thumb: "PB" },
    { id: 5, nombre: "Fabuloso lavanda 1L",    codigo: "7501025410098", categoria: "Limpieza",  stock: 0,   stockMin: 8,  compra: 28.00, venta: 38.00, activo: true,  thumb: "FB" },
    { id: 6, nombre: "Arroz Verde Valle 1kg",  codigo: "7501030122005", categoria: "Abarrotes", stock: 65,  stockMin: 20, compra: 24.00, venta: 32.00, activo: true,  thumb: "AR" },
    { id: 7, nombre: "Galletas Marías 170g",   codigo: "7501030988011", categoria: "Snacks",    stock: 7,   stockMin: 15, compra:  8.50, venta: 14.00, activo: true,  thumb: "GM" },
    { id: 8, nombre: "Aceite Capullo 946ml",   codigo: "7501030600055", categoria: "Abarrotes", stock: 32,  stockMin: 10, compra: 48.00, venta: 62.00, activo: true,  thumb: "AC" },
    { id: 9, nombre: "Huevo San Juan 12pz",    codigo: "7501030122887", categoria: "Abarrotes", stock: 24,  stockMin: 12, compra: 42.00, venta: 56.00, activo: true,  thumb: "HU" },
    { id: 10, nombre: "Cloralex 950ml",        codigo: "7501025411222", categoria: "Limpieza",  stock: 14,  stockMin: 8,  compra: 18.00, venta: 26.00, activo: true,  thumb: "CL" },
    { id: 11, nombre: "Yogurt Yoplait 1L",     codigo: "7501055308890", categoria: "Lácteos",   stock: 9,   stockMin: 10, compra: 32.00, venta: 42.00, activo: true,  thumb: "YO" },
    { id: 12, nombre: "Atún Dolores lata",     codigo: "7501030456789", categoria: "Abarrotes", stock: 88,  stockMin: 20, compra: 16.00, venta: 22.00, activo: true,  thumb: "AT" },
  ],

  ventasRecientes: [
    { id: "REC-1042", hora: "14:32", items: 6,  total: 184.50, metodo: "Efectivo", vendedor: "Luis M." },
    { id: "REC-1041", hora: "14:18", items: 3,  total: 96.00,  metodo: "Tarjeta",  vendedor: "Luis M." },
    { id: "REC-1040", hora: "14:02", items: 12, total: 412.00, metodo: "Efectivo", vendedor: "Ana R."  },
    { id: "REC-1039", hora: "13:48", items: 2,  total: 58.50,  metodo: "Efectivo", vendedor: "Luis M." },
    { id: "REC-1038", hora: "13:21", items: 8,  total: 246.00, metodo: "Tarjeta",  vendedor: "Ana R."  },
  ],

  ventas7dias: [
    { dia: "Lun", total: 2840 },
    { dia: "Mar", total: 3120 },
    { dia: "Mié", total: 2960 },
    { dia: "Jue", total: 3540 },
    { dia: "Vie", total: 4280 },
    { dia: "Sáb", total: 5120 },
    { dia: "Dom", total: 3245 },
  ],

  proveedores: [
    { id: 1, nombre: "Distribuidora Centro",   telefono: "55 1234 5678", productos: 24, contacto: "Carlos Méndez" },
    { id: 2, nombre: "Alpura S.A.",            telefono: "55 8888 0011", productos: 8,  contacto: "Línea de pedidos" },
    { id: 3, nombre: "Bimbo Distribución",     telefono: "55 5050 7070", productos: 12, contacto: "Ruta 42 — Sr. Pérez" },
    { id: 4, nombre: "PepsiCo Local",          telefono: "55 9012 3344", productos: 18, contacto: "Mariana López" },
    { id: 5, nombre: "Limpieza del Norte",     telefono: "55 7700 2211", productos: 9,  contacto: "Roberto Silva" },
  ],

  ordenesCompra: [
    { id: "OC-0087", proveedor: "Distribuidora Centro", fecha: "12 oct, 2026", items: 14, total: 4280.00, estado: "pendiente" },
    { id: "OC-0086", proveedor: "Alpura S.A.",          fecha: "10 oct, 2026", items: 6,  total: 1840.00, estado: "recibida" },
    { id: "OC-0085", proveedor: "Bimbo Distribución",   fecha: "09 oct, 2026", items: 8,  total: 2120.00, estado: "recibida" },
    { id: "OC-0084", proveedor: "PepsiCo Local",        fecha: "08 oct, 2026", items: 12, total: 3460.00, estado: "pendiente" },
    { id: "OC-0083", proveedor: "Limpieza del Norte",   fecha: "06 oct, 2026", items: 5,  total: 940.00,  estado: "recibida" },
  ],

  usuarios: [
    { id: 1, nombre: "Ana Reyes",     email: "ana@laesquina.com",   rol: "Admin",    activo: true,  ultima: "Hace 2 min" },
    { id: 2, nombre: "Luis Méndez",   email: "luis@laesquina.com",  rol: "Vendedor", activo: true,  ultima: "Hace 14 min" },
    { id: 3, nombre: "Sofía Cruz",    email: "sofia@laesquina.com", rol: "Vendedor", activo: true,  ultima: "Ayer, 19:32" },
    { id: 4, nombre: "Diego Ramírez", email: "diego@laesquina.com", rol: "Vendedor", activo: false, ultima: "Hace 3 días" },
  ],

  cajaActual: {
    estado: "abierta",
    abiertaPor: "Luis Méndez",
    horaApertura: "08:32",
    montoInicial: 500.00,
    ventasEfectivo: 1640.00,
    ventasTarjeta: 1245.50,
    total: 2140.00 + 1640.00, // 3780
  },

  sesionesCaja: [
    { id: "S-0142", fecha: "23 may, 2026", apertura: "08:30", cierre: "20:15", inicial: 500.00, final: 4280.00, vendedor: "Luis M." },
    { id: "S-0141", fecha: "22 may, 2026", apertura: "08:25", cierre: "20:08", inicial: 500.00, final: 3920.00, vendedor: "Sofía C." },
    { id: "S-0140", fecha: "21 may, 2026", apertura: "08:40", cierre: "20:22", inicial: 500.00, final: 4540.00, vendedor: "Luis M." },
    { id: "S-0139", fecha: "20 may, 2026", apertura: "08:32", cierre: "20:11", inicial: 500.00, final: 3680.00, vendedor: "Luis M." },
  ],

  topProductos: [
    { nombre: "Coca-Cola 600ml",       unidades: 248, ingresos: 4588.00 },
    { nombre: "Pan Bimbo grande",      unidades: 124, ingresos: 5952.00 },
    { nombre: "Sabritas Original 45g", unidades: 198, ingresos: 2970.00 },
    { nombre: "Leche entera Alpura 1L",unidades:  86, ingresos: 2408.00 },
    { nombre: "Galletas Marías 170g",  unidades:  92, ingresos: 1288.00 },
  ],
};
