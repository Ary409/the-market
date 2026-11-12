// Mobile admin — mock data.

window.M = {
  user: { nombre: "Ana Reyes", inicial: "A" },
  business: { nombre: "La Esquina" },

  // Hoy
  resumenHoy: {
    ventas: 48,
    ingresos: 3245.50,
    productosBajos: 4,
    porVencer: 3,
    cajaActual: 3780.00,
    ticketPromedio: 67.61,
  },

  // Alertas
  stockBajo: [
    { id: 1, nombre: "Sabritas Original 45g",   stock: 4,  minimo: 12, categoria: "Snacks",   thumb: "SB" },
    { id: 2, nombre: "Galletas Marías 170g",    stock: 7,  minimo: 15, categoria: "Snacks",   thumb: "GM" },
    { id: 3, nombre: "Yogurt Yoplait 1L",       stock: 9,  minimo: 10, categoria: "Lácteos",  thumb: "YO" },
    { id: 4, nombre: "Fabuloso lavanda 1L",     stock: 0,  minimo: 8,  categoria: "Limpieza", thumb: "FB" },
  ],
  porVencer: [
    { id: 11, nombre: "Leche entera Alpura 1L", vence: "Mañana, 24 may",     diasRestantes: 1, thumb: "LE" },
    { id: 12, nombre: "Pan Bimbo grande",       vence: "En 3 días, 27 may",   diasRestantes: 3, thumb: "PB" },
    { id: 13, nombre: "Yogurt Yoplait 1L",      vence: "En 5 días, 29 may",   diasRestantes: 5, thumb: "YO" },
  ],

  // Producto detalle (para consulta rápida)
  productoEscaneado: {
    id: 1,
    nombre: "Coca-Cola 600ml",
    codigo: "7501031311309",
    categoria: "Bebidas",
    proveedor: "Distribuidora Centro",
    compra: 12.50,
    venta: 18.50,
    stock: 128,
    stockMin: 24,
    thumb: "CC",
    movimientos: [
      { fecha: "23 may", tipo: "Venta",   cantidad: -2,  detalle: "REC-1042" },
      { fecha: "23 may", tipo: "Venta",   cantidad: -1,  detalle: "REC-1041" },
      { fecha: "22 may", tipo: "Entrada", cantidad: 48,  detalle: "OC-0086"  },
      { fecha: "22 may", tipo: "Venta",   cantidad: -4,  detalle: "REC-1030" },
      { fecha: "21 may", tipo: "Venta",   cantidad: -3,  detalle: "REC-1024" },
    ],
  },

  // Historial ventas del día
  ventasHoy: [
    { id: "REC-1042", hora: "14:32", items: 6,  total: 184.50, metodo: "Efectivo", vendedor: "Luis M." },
    { id: "REC-1041", hora: "14:18", items: 3,  total: 96.00,  metodo: "Tarjeta",  vendedor: "Luis M." },
    { id: "REC-1040", hora: "14:02", items: 12, total: 412.00, metodo: "Efectivo", vendedor: "Ana R."  },
    { id: "REC-1039", hora: "13:48", items: 2,  total: 58.50,  metodo: "Efectivo", vendedor: "Luis M." },
    { id: "REC-1038", hora: "13:21", items: 8,  total: 246.00, metodo: "Tarjeta",  vendedor: "Ana R."  },
    { id: "REC-1037", hora: "13:12", items: 4,  total: 142.00, metodo: "Efectivo", vendedor: "Luis M." },
    { id: "REC-1036", hora: "12:58", items: 9,  total: 312.50, metodo: "Tarjeta",  vendedor: "Sofía C." },
    { id: "REC-1035", hora: "12:45", items: 5,  total: 218.50, metodo: "Tarjeta",  vendedor: "Luis M." },
  ],
};
