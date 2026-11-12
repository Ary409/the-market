// Mock data for The Market vendedor desktop UI kit.

window.MOCK = {
  user: {
    name: "Luis Méndez",
    email: "luis@laesquina.com",
    role: "Vendedor",
    initials: "LM",
  },

  business: { name: "La Esquina" },

  cajaActual: {
    estado: "abierta",
    horaApertura: "08:32",
    montoInicial: 500.00,
    ventasEfectivo: 1640.00,
    ventasTarjeta: 1245.50,
  },

  // Productos (con stock visible, sin info de proveedor)
  productos: [
    { id: 1,  nombre: "Coca-Cola 600ml",        codigo: "7501031311309", categoria: "Bebidas",   precio: 18.50, stock: 128, thumb: "CC" },
    { id: 2,  nombre: "Sabritas Original 45g",  codigo: "7501011112233", categoria: "Snacks",    precio: 15.00, stock: 4,   thumb: "SB" },
    { id: 3,  nombre: "Leche entera Alpura 1L", codigo: "7501055304004", categoria: "Lácteos",   precio: 28.00, stock: 42,  thumb: "LE" },
    { id: 4,  nombre: "Pan Bimbo grande",       codigo: "7501030456012", categoria: "Panadería", precio: 48.00, stock: 18,  thumb: "PB" },
    { id: 5,  nombre: "Galletas Marías 170g",   codigo: "7501030988011", categoria: "Snacks",    precio: 14.00, stock: 7,   thumb: "GM" },
    { id: 6,  nombre: "Aceite Capullo 946ml",   codigo: "7501030600055", categoria: "Abarrotes", precio: 62.00, stock: 32,  thumb: "AC" },
    { id: 7,  nombre: "Huevo San Juan 12pz",    codigo: "7501030122887", categoria: "Abarrotes", precio: 56.00, stock: 24,  thumb: "HU" },
    { id: 8,  nombre: "Cloralex 950ml",         codigo: "7501025411222", categoria: "Limpieza",  precio: 26.00, stock: 14,  thumb: "CL" },
    { id: 9,  nombre: "Arroz Verde Valle 1kg",  codigo: "7501030122005", categoria: "Abarrotes", precio: 32.00, stock: 65,  thumb: "AR" },
    { id: 10, nombre: "Yogurt Yoplait 1L",      codigo: "7501055308890", categoria: "Lácteos",   precio: 42.00, stock: 9,   thumb: "YO" },
    { id: 11, nombre: "Atún Dolores lata",      codigo: "7501030456789", categoria: "Abarrotes", precio: 22.00, stock: 88,  thumb: "AT" },
    { id: 12, nombre: "Fabuloso lavanda 1L",    codigo: "7501025410098", categoria: "Limpieza",  precio: 38.00, stock: 0,   thumb: "FB" },
  ],

  categorias: ["Bebidas", "Snacks", "Lácteos", "Limpieza", "Abarrotes", "Panadería"],

  // Mis ventas del día (de Luis)
  misVentasHoy: [
    { id: "REC-1042", hora: "14:32", items: 6,  total: 184.50, metodo: "Efectivo" },
    { id: "REC-1041", hora: "14:18", items: 3,  total: 96.00,  metodo: "Tarjeta"  },
    { id: "REC-1039", hora: "13:48", items: 2,  total: 58.50,  metodo: "Efectivo" },
    { id: "REC-1037", hora: "13:12", items: 4,  total: 142.00, metodo: "Efectivo" },
    { id: "REC-1035", hora: "12:45", items: 5,  total: 218.50, metodo: "Tarjeta"  },
  ],

  // Resumen del día del vendedor
  resumenVendedor: {
    ventas: 22,
    ingresos: 1845.50,
    ticketPromedio: 83.89,
    efectivo: 1240.50,
    tarjeta: 605.00,
  },

  recibo: { numero: "REC-1043" },
};
