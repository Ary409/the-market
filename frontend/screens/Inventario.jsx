// Inventario — conectado al API real

function InventarioScreen() {
  const [productos,   setProductos]   = React.useState([]);
  const [categorias,  setCategorias]  = React.useState([]);
  const [proveedores, setProveedores] = React.useState([]);
  const [total,       setTotal]       = React.useState(0);
  const [page,        setPage]        = React.useState(1);
  const [query,       setQuery]       = React.useState("");
  const [catId,       setCatId]       = React.useState("");
  const [loading,     setLoading]     = React.useState(true);
  const [showForm,    setShowForm]    = React.useState(false);
  const [editing,     setEditing]     = React.useState(null);
  const [adjusting,   setAdjusting]   = React.useState(null);
  const [showCats,    setShowCats]    = React.useState(false);
  const PER_PAGE = 20;

  function loadCategorias() {
    API.getCategorias().then(r => setCategorias(r.items || [])).catch(() => {});
  }

  // Carga inicial de selectores
  React.useEffect(() => {
    loadCategorias();
    API.getProveedores().then(r => setProveedores(r.items || [])).catch(() => {});
  }, []);

  // Carga de productos con debounce en búsqueda
  React.useEffect(() => {
    const t = setTimeout(loadProductos, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, catId, page]);

  async function loadProductos() {
    setLoading(true);
    try {
      const params = { page, per_page: PER_PAGE };
      if (query)  params.q            = query;
      if (catId)  params.categoria_id = catId;
      const res = await API.getProductos(params);
      setProductos(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(p)  { setEditing(p);    setShowForm(true); }
  function onSaved()    { setShowForm(false); loadProductos(); }

  async function handleDelete(p) {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return;
    try {
      await API.deleteProducto(p.id);
      loadProductos();
    } catch (e) { alert(e.message); }
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField
          icon="search"
          placeholder="Buscar por nombre o código..."
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Select
          value={catId}
          onChange={e => { setCatId(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Todas las categorías" },
            ...categorias.map(c => ({ value: String(c.id), label: c.nombre })),
          ]}
        />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={() => setShowCats(true)}>Categorías</Button>
        <Button icon="plus" onClick={openCreate}>Agregar producto</Button>
      </div>

      {/* Table */}
      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th>Código</Th>
              <Th>Categoría</Th>
              <Th align="right">Stock</Th>
              <Th align="right">Compra</Th>
              <Th align="right">Venta</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)", font: "400 13px var(--font-sans)" }}>Cargando…</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState icon="package" title="Sin productos"
                  body={query ? `No hay resultados para "${query}".` : "Agrega tu primer producto."} />
              </td></tr>
            ) : productos.map(p => (
              <ProductRow key={p.id} p={p} onEdit={() => openEdit(p)} onAdjust={() => setAdjusting(p)} onDelete={() => handleDelete(p)} />
            ))}
          </tbody>
        </table>

        {/* Footer paginación */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--ink-05)" }}>
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
            <b style={{ color: "var(--fg)" }}>{total}</b> producto{total !== 1 ? "s" : ""} en total
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
            <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", padding: "0 6px" }}>{page} / {Math.max(1, totalPages)}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
          </div>
        </div>
      </Card>

      <ProductoFormModal
        open={showForm}
        product={editing}
        categorias={categorias}
        proveedores={proveedores}
        onClose={() => setShowForm(false)}
        onSaved={onSaved}
      />

      <AjusteStockModal
        product={adjusting}
        onClose={() => setAdjusting(null)}
        onSaved={() => { setAdjusting(null); loadProductos(); }}
      />

      <CategoriasModal
        open={showCats}
        categorias={categorias}
        onClose={() => setShowCats(false)}
        onChanged={loadCategorias}
      />
    </div>
  );
}

// ── Gestión de categorías ─────────────────────────────────────────────────────

function CategoriasModal({ open, categorias, onClose, onChanged }) {
  const [nombre, setNombre] = React.useState("");
  const [busy,   setBusy]   = React.useState(false);
  const [error,  setError]  = React.useState("");

  React.useEffect(() => { if (open) { setNombre(""); setError(""); } }, [open]);

  async function agregar() {
    if (!nombre.trim()) { setError("Escribe el nombre de la categoría"); return; }
    setBusy(true);
    try {
      await API.createCategoria({ nombre: nombre.trim() });
      setNombre("");
      onChanged();
    } catch (e) { setError(e.message); }
    finally    { setBusy(false); }
  }

  async function eliminar(cat) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?\nLos productos que la usan quedarán sin categoría.`)) return;
    try {
      await API.deleteCategoria(cat.id);
      onChanged();
    } catch (e) { alert(e.message); }
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Categorías"
      subtitle="Agrega o elimina categorías de productos"
      width={440}
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <TextField label="Nueva categoría" value={nombre} onChange={e => { setNombre(e.target.value); setError(""); }}
            placeholder="Ej. Abarrotes" style={{ flex: 1 }} autoFocus />
          <Button onClick={agregar} disabled={busy}>{busy ? "…" : "Agregar"}</Button>
        </div>
        {error && <span style={{ font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
          {categorias.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>Sin categorías</div>
          ) : categorias.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ font: "500 13px var(--font-sans)" }}>{c.nombre}</span>
              <IconButton icon="trash" label="Eliminar" onClick={() => eliminar(c)} />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ProductRow({ p, onEdit, onAdjust, onDelete }) {
  const [hover, setHover] = React.useState(false);
  const initials = p.nombre.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const stockCell = p.stock === 0
    ? <Badge variant="danger">0 · agotado</Badge>
    : p.stock <= p.stock_minimo
      ? <Badge variant="warning">{p.stock} · bajo</Badge>
      : <span style={{ fontVariantNumeric: "tabular-nums", font: "600 13px var(--font-sans)" }}>{p.stock}</span>;

  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}>
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Thumb initials={initials} />
          <span style={{ font: "500 13px var(--font-sans)" }}>{p.nombre}</span>
        </div>
      </Td>
      <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>{p.codigo_barras || "—"}</span></Td>
      <Td><Badge variant="neutral">{p.categoria?.nombre || "—"}</Badge></Td>
      <Td align="right">{stockCell}</Td>
      <Td align="right" mono>{fmtMoney(p.precio_compra)}</Td>
      <Td align="right" mono>{fmtMoney(p.precio_venta)}</Td>
      <Td align="right">
        <div style={{ display: "inline-flex", gap: 4 }}>
          <IconButton icon="pencil"  label="Editar"        onClick={onEdit}   />
          <IconButton icon="package" label="Ajustar stock" onClick={onAdjust} />
          <IconButton icon="trash"   label="Desactivar"    onClick={onDelete} />
        </div>
      </Td>
    </tr>
  );
}

function IconButton({ icon, label, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={label} aria-label={label}
      style={{
        border: `1px solid ${hover ? "var(--border)" : "transparent"}`,
        background: hover ? "var(--paper)" : "transparent",
        padding: 6, borderRadius: 6, cursor: "pointer",
        color: "var(--fg-muted)", display: "inline-flex", alignItems: "center",
      }}>
      <Icon name={icon} size={15} />
    </button>
  );
}

function ProductoFormModal({ open, product, categorias, proveedores, onClose, onSaved }) {
  const isEdit = !!product;
  const empty = { nombre: "", codigo_barras: "", categoria_id: "", proveedor_id: "", precio_compra: "", precio_venta: "", stock: "", stock_minimo: "5", conVenc: false, fecha_vencimiento: "" };

  const [data,    setData]    = React.useState(empty);
  const [saving,  setSaving]  = React.useState(false);
  const [error,   setError]   = React.useState("");

  React.useEffect(() => {
    if (open) {
      setError("");
      setData(product ? {
        nombre:           product.nombre,
        codigo_barras:    product.codigo_barras || "",
        categoria_id:     product.categoria_id  ? String(product.categoria_id)  : "",
        proveedor_id:     product.proveedor_id  ? String(product.proveedor_id)  : "",
        precio_compra:    product.precio_compra,
        precio_venta:     product.precio_venta,
        stock:            product.stock,
        stock_minimo:     product.stock_minimo,
        conVenc:          !!product.fecha_vencimiento,
        fecha_vencimiento: product.fecha_vencimiento ? product.fecha_vencimiento.slice(0, 10) : "",
      } : empty);
    }
  }, [open, product]);

  function set(k, v) { setData(d => ({ ...d, [k]: v })); setError(""); }

  async function handleSave() {
    if (!data.nombre)       { setError("El nombre es requerido");         return; }
    if (!data.precio_venta) { setError("El precio de venta es requerido"); return; }
    setSaving(true);
    try {
      const payload = {
        nombre:        data.nombre,
        codigo_barras: data.codigo_barras || null,
        categoria_id:  data.categoria_id  ? parseInt(data.categoria_id)  : null,
        proveedor_id:  data.proveedor_id  ? parseInt(data.proveedor_id)  : null,
        precio_compra: parseFloat(data.precio_compra) || 0,
        precio_venta:  parseFloat(data.precio_venta),
        stock_minimo:  parseInt(data.stock_minimo) || 5,
        fecha_vencimiento: data.conVenc && data.fecha_vencimiento ? data.fecha_vencimiento : null,
      };
      // El stock solo se envía al CREAR (se registra como movimiento de
      // inventario inicial). Al editar, el stock se cambia con "Ajustar stock".
      if (!isEdit) payload.stock = parseInt(data.stock) || 0;
      if (isEdit) await API.updateProducto(product.id, payload);
      else        await API.createProducto(payload);
      onSaved();
    } catch (e) { setError(e.message); }
    finally    { setSaving(false); }
  }

  const margen = data.precio_compra && data.precio_venta
    ? Math.round(((data.precio_venta - data.precio_compra) / data.precio_venta) * 100)
    : null;

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? "Editar producto" : "Agregar producto"}
      subtitle={isEdit ? `Modificando "${product?.nombre}"` : "Completa los datos del nuevo producto"}
      width={640}
      footer={<>
        {error && <span style={{ flex: 1, font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar producto"}
        </Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 88, height: 88, background: "var(--ink-05)", border: "1px dashed var(--border-strong)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--fg-muted)", flexShrink: 0 }}>
            <Icon name="package" size={20} />
            <span style={{ font: "500 10px var(--font-sans)" }}>Imagen</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <TextField label="Nombre del producto" value={data.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej. Coca-Cola 600ml" autoFocus />
            <TextField label="Código de barras" value={data.codigo_barras} onChange={e => set("codigo_barras", e.target.value)} placeholder="Escanea o escribe" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Select label="Categoría" value={data.categoria_id} onChange={e => set("categoria_id", e.target.value)}
            options={[{ value: "", label: "Sin categoría" }, ...categorias.map(c => ({ value: String(c.id), label: c.nombre }))]} />
          <Select label="Proveedor" value={data.proveedor_id} onChange={e => set("proveedor_id", e.target.value)}
            options={[{ value: "", label: "Sin proveedor" }, ...proveedores.map(p => ({ value: String(p.id), label: p.nombre }))]} />
          <TextField label="Precio de compra" value={data.precio_compra} onChange={e => set("precio_compra", e.target.value)} prefix="L" placeholder="0.00" />
          <TextField label="Precio de venta"  value={data.precio_venta}  onChange={e => set("precio_venta",  e.target.value)} prefix="L" placeholder="0.00"
            help={margen !== null ? `Margen: ${margen}%` : null} />
          <TextField label={isEdit ? "Stock actual (solo lectura)" : "Stock inicial"} value={data.stock} onChange={e => set("stock", e.target.value)} placeholder="0"
            disabled={isEdit}
            help={isEdit ? "Usa el botón «Ajustar stock» de la tabla — cada cambio queda registrado" : null} />
          <TextField label="Stock mínimo"  value={data.stock_minimo} onChange={e => set("stock_minimo", e.target.value)} placeholder="5" help="Aviso cuando baje de este valor" />
        </div>

        <div style={{ padding: "14px 16px", background: "var(--ink-05)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 13px var(--font-sans)", cursor: "pointer" }}>
            <input type="checkbox" checked={data.conVenc} onChange={e => set("conVenc", e.target.checked)} style={{ width: 14, height: 14, accentColor: "var(--ink-100)" }} />
            Producto con fecha de vencimiento
          </label>
          {data.conVenc && (
            <TextField label="Fecha de vencimiento" type="date" value={data.fecha_vencimiento} onChange={e => set("fecha_vencimiento", e.target.value)} />
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Ajuste de stock ───────────────────────────────────────────────────────────
// Todo cambio de stock pasa por /inventario/ajuste y queda en el libro de
// movimientos con su motivo. Nunca se edita producto.stock directamente.

function AjusteStockModal({ product, onClose, onSaved }) {
  const open = !!product;
  const [stockNuevo, setStockNuevo] = React.useState("");
  const [motivo,     setMotivo]     = React.useState("");
  const [saving,     setSaving]     = React.useState(false);
  const [error,      setError]      = React.useState("");

  React.useEffect(() => {
    if (open) { setStockNuevo(String(product.stock)); setMotivo(""); setError(""); }
  }, [open, product]);

  const diferencia = open && stockNuevo !== "" ? parseInt(stockNuevo) - product.stock : null;

  async function handleSave() {
    const nuevo = parseInt(stockNuevo);
    if (isNaN(nuevo) || nuevo < 0) { setError("Indica un stock válido (0 o más)"); return; }
    if (nuevo === product.stock)   { setError("El stock nuevo es igual al actual"); return; }
    if (!motivo.trim())            { setError("El motivo es obligatorio — queda en el historial"); return; }
    setSaving(true);
    try {
      await API.ajustarStock({ producto_id: product.id, stock_nuevo: nuevo, motivo: motivo.trim() });
      onSaved();
    } catch (e) { setError(e.message); }
    finally    { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Ajustar stock"
      subtitle={product ? `${product.nombre} — stock actual: ${product.stock}` : ""}
      width={440}
      footer={<>
        {error && <span style={{ flex: 1, font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Registrar ajuste"}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField label="Stock nuevo" value={stockNuevo} onChange={e => setStockNuevo(e.target.value)} placeholder="0" autoFocus
          help={diferencia !== null && !isNaN(diferencia) && diferencia !== 0
            ? (diferencia > 0 ? `Se registrará una entrada de +${diferencia}` : `Se registrará una salida de ${diferencia}`)
            : null} />
        <TextField label="Motivo del ajuste" value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Ej. conteo físico, merma, producto dañado…"
          help="Obligatorio — queda registrado en el historial de movimientos" />
      </div>
    </Modal>
  );
}

window.InventarioScreen = InventarioScreen;
window.IconButton = IconButton;   // reutilizado por Clientes y otras pantallas
