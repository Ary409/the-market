// API client — all calls to the FastAPI backend

(function () {
  function getBaseUrl() {
    return localStorage.getItem("api_url") || "http://localhost:8000";
  }

  function getHeaders(extra) {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...extra,
    };
  }

  async function apiFetch(path, options) {
    options = options || {};
    const res = await fetch(getBaseUrl() + path, {
      ...options,
      headers: getHeaders(options.headers),
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({ detail: "Error de servidor" }));
    if (!res.ok) {
      const msg = data.detail || JSON.stringify(data);
      throw new Error(Array.isArray(msg) ? msg.map(function(e){ return e.msg; }).join(", ") : msg);
    }
    return data;
  }

  // Descarga autenticada (window.open no manda el token → 401)
  async function descargarArchivo(path, nombreFallback) {
    const res = await fetch(getBaseUrl() + path, { headers: getHeaders() });
    if (!res.ok) throw new Error("No se pudo generar el archivo (" + res.status + ")");
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename=([^;]+)/);
    const nombre = match ? match[1].trim() : nombreFallback;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  window.API = {
    // ── Auth ──────────────────────────────────────────────────
    login: function(email, password) {
      return apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email, password: password }),
      });
    },

    // ── Productos ─────────────────────────────────────────────
    getProductos: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/productos" + qs);
    },
    getProductoById: function(id) { return apiFetch("/productos/" + id); },
    getProductoByBarcode: function(codigo) { return apiFetch("/productos/barcode/" + encodeURIComponent(codigo)); },
    createProducto: function(data) { return apiFetch("/productos", { method: "POST", body: JSON.stringify(data) }); },
    updateProducto: function(id, data) { return apiFetch("/productos/" + id, { method: "PUT", body: JSON.stringify(data) }); },
    deleteProducto: function(id) { return apiFetch("/productos/" + id, { method: "DELETE" }); },

    // ── Categorías ────────────────────────────────────────────
    getCategorias: function() { return apiFetch("/categorias?per_page=200"); },
    createCategoria: function(data) { return apiFetch("/categorias", { method: "POST", body: JSON.stringify(data) }); },
    updateCategoria: function(id, data) { return apiFetch("/categorias/" + id, { method: "PUT", body: JSON.stringify(data) }); },
    deleteCategoria: function(id) { return apiFetch("/categorias/" + id, { method: "DELETE" }); },

    // ── Proveedores ───────────────────────────────────────────
    getProveedores: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/proveedores" + qs);
    },
    createProveedor: function(data) { return apiFetch("/proveedores", { method: "POST", body: JSON.stringify(data) }); },
    updateProveedor: function(id, data) { return apiFetch("/proveedores/" + id, { method: "PUT", body: JSON.stringify(data) }); },

    // ── Usuarios ──────────────────────────────────────────────
    getUsuarios: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/usuarios" + qs);
    },
    createUsuario: function(data) { return apiFetch("/usuarios", { method: "POST", body: JSON.stringify(data) }); },
    updateUsuario: function(id, data) { return apiFetch("/usuarios/" + id, { method: "PUT", body: JSON.stringify(data) }); },
    deactivateUsuario: function(id) { return apiFetch("/usuarios/" + id, { method: "DELETE" }); },
    resetPassword: function(id) { return apiFetch("/usuarios/" + id + "/reset-password", { method: "POST" }); },

    // ── Inventario ────────────────────────────────────────────
    getAlertas: function() { return apiFetch("/inventario/alertas"); },
    getPorVencer: function(dias) { return apiFetch("/inventario/por-vencer?dias=" + (dias || 30)); },
    getMovimientos: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/inventario/movimientos" + qs);
    },
    registrarEntrada: function(data) { return apiFetch("/inventario/entrada", { method: "POST", body: JSON.stringify(data) }); },
    registrarSalida: function(data) { return apiFetch("/inventario/salida", { method: "POST", body: JSON.stringify(data) }); },
    ajustarStock: function(data) { return apiFetch("/inventario/ajuste", { method: "POST", body: JSON.stringify(data) }); },

    // ── Compras ───────────────────────────────────────────────
    getCompras: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/compras" + qs);
    },
    getCompra: function(id) { return apiFetch("/compras/" + id); },
    createCompra: function(data) { return apiFetch("/compras", { method: "POST", body: JSON.stringify(data) }); },
    recibirCompra: function(id) { return apiFetch("/compras/" + id + "/recibir", { method: "PUT" }); },
    cancelarCompra: function(id) { return apiFetch("/compras/" + id, { method: "DELETE" }); },

    // ── Ventas ────────────────────────────────────────────────
    getVentas: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/ventas" + qs);
    },
    getVenta: function(id) { return apiFetch("/ventas/" + id); },
    crearVenta: function(data) { return apiFetch("/ventas", { method: "POST", body: JSON.stringify(data) }); },
    anularVenta: function(id, motivo) { return apiFetch("/ventas/" + id + "/anular", { method: "POST", body: JSON.stringify({ motivo: motivo }) }); },
    getRecibo: function(id) { return apiFetch("/ventas/" + id + "/recibo"); },

    // ── Caja ──────────────────────────────────────────────────
    getCajaActual: function() { return apiFetch("/caja/actual"); },
    getSesionesCaja: function() { return apiFetch("/caja/sesiones"); },
    abrirCaja: function(monto_inicial) { return apiFetch("/caja/abrir", { method: "POST", body: JSON.stringify({ monto_inicial: monto_inicial }) }); },
    cerrarCaja: function(monto_contado) { return apiFetch("/caja/cerrar", { method: "POST", body: JSON.stringify({ monto_contado: monto_contado }) }); },

    // ── Clientes ──────────────────────────────────────────────
    getClientes: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/clientes" + qs);
    },
    getCliente: function(id) { return apiFetch("/clientes/" + id); },
    getClientesConDeuda: function() { return apiFetch("/clientes/con-deuda"); },
    createCliente: function(data) { return apiFetch("/clientes", { method: "POST", body: JSON.stringify(data) }); },
    updateCliente: function(id, data) { return apiFetch("/clientes/" + id, { method: "PUT", body: JSON.stringify(data) }); },
    deactivateCliente: function(id) { return apiFetch("/clientes/" + id, { method: "DELETE" }); },
    getEstadoCuenta: function(id) { return apiFetch("/clientes/" + id + "/estado-cuenta"); },
    registrarAbono: function(id, data) { return apiFetch("/clientes/" + id + "/pagos", { method: "POST", body: JSON.stringify(data) }); },
    liquidarCuenta: function(id, data) { return apiFetch("/clientes/" + id + "/liquidar", { method: "POST", body: JSON.stringify(data || {}) }); },

    // ── Proveedores: estado de cuenta y pagos ─────────────────
    getEstadoCuentaProveedor: function(id) { return apiFetch("/proveedores/" + id + "/estado-cuenta"); },
    registrarPagoProveedor: function(id, data) { return apiFetch("/proveedores/" + id + "/pagos", { method: "POST", body: JSON.stringify(data) }); },
    getProductosProveedor: function(id) { return apiFetch("/proveedores/" + id + "/productos"); },

    // ── Recomendaciones ───────────────────────────────────────
    getRecomendaciones: function(estado) { return apiFetch("/recomendaciones?estado=" + (estado || "pendiente")); },
    generarRecomendaciones: function() { return apiFetch("/recomendaciones/generar", { method: "POST" }); },
    updateRecomendacion: function(id, estado) { return apiFetch("/recomendaciones/" + id, { method: "PUT", body: JSON.stringify({ estado: estado }) }); },

    // ── Dashboard ─────────────────────────────────────────────
    getDashboard: function() { return apiFetch("/dashboard"); },

    // ── Reportes ──────────────────────────────────────────────
    getReporteVentas: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/reportes/ventas" + qs);
    },
    getTopProductos: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/reportes/productos/top-ventas" + qs);
    },
    getGananciaBruta: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch("/reportes/ganancia-bruta" + qs);
    },
    exportarVentasCSV: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return descargarArchivo("/reportes/ventas/exportar" + qs, "ventas.csv");
    },
    exportarInventarioCSV: function() {
      return descargarArchivo("/reportes/inventario/exportar", "inventario.csv");
    },
    exportarVentasPDF: function(params) {
      var qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return descargarArchivo("/reportes/ventas/pdf" + qs, "ventas.pdf");
    },
    descargarOrdenPDF: function(id, formato) {
      return descargarArchivo("/compras/" + id + "/pdf?formato=" + (formato || "carta"), "orden.pdf");
    },
    getAnalitica: function(dias) { return apiFetch("/reportes/analitica?dias=" + (dias || 30)); },

    // ── Helpers ───────────────────────────────────────────────
    setApiUrl: function(url) { localStorage.setItem("api_url", url); },
    getApiUrl: getBaseUrl,
  };
})();
