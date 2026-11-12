// Mobile vendedor — mock data + cart state.

window.M = {
  user: { nombre: "Luis Méndez", inicial: "L" },
  business: { nombre: "La Esquina" },

  productos: [
    { id: 1, nombre: "Coca-Cola 600ml",        codigo: "7501031311309", precio: 18.50, stock: 128, thumb: "CC" },
    { id: 2, nombre: "Sabritas Original 45g",  codigo: "7501011112233", precio: 15.00, stock: 4,   thumb: "SB" },
    { id: 3, nombre: "Leche entera Alpura 1L", codigo: "7501055304004", precio: 28.00, stock: 42,  thumb: "LE" },
    { id: 4, nombre: "Pan Bimbo grande",       codigo: "7501030456012", precio: 48.00, stock: 18,  thumb: "PB" },
    { id: 5, nombre: "Galletas Marías 170g",   codigo: "7501030988011", precio: 14.00, stock: 7,   thumb: "GM" },
    { id: 6, nombre: "Aceite Capullo 946ml",   codigo: "7501030600055", precio: 62.00, stock: 32,  thumb: "AC" },
  ],

  // Stamps shown in success and history
  recibo: { numero: "REC-1043", fecha: "23 may, 2026 · 14:42" },
};
