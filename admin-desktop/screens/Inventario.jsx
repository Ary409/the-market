// Inventario — table of products with search, category filter, add-button, low-stock badge.

function InventarioScreen() {
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState("Todas");
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const M = window.MOCK;
  const cats = ["Todas", ...M.categorias];
  let filtered = M.productos;
  if (cat !== "Todas") filtered = filtered.filter(p => p.categoria === cat);
  if (query) filtered = filtered.filter(p =>
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    p.codigo.includes(query)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField
          icon="search"
          placeholder="Buscar por nombre o código..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Select
          value={cat}
          onChange={e => setCat(e.target.value)}
          options={cats}
        />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="download">Exportar</Button>
        <Button icon="plus" onClick={() => { setEditing(null); setShowForm(true); }}>Agregar producto</Button>
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
            {filtered.map(p => (
              <ProductRow key={p.id} p={p} onEdit={() => { setEditing(p); setShowForm(true); }} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon="search"
            title="Sin resultados"
            body={`No encontramos productos que coincidan con "${query}".`}
          />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--ink-05)" }}>
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
            Mostrando <b style={{ color: "var(--fg)" }}>{filtered.length}</b> de <b style={{ color: "var(--fg)" }}>{M.productos.length}</b> productos
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="secondary" size="sm" disabled>← Anterior</Button>
            <Button variant="secondary" size="sm">Siguiente →</Button>
          </div>
        </div>
      </Card>

      <ProductoFormModal
        open={showForm}
        product={editing}
        onClose={() => setShowForm(false)}
        onSave={() => setShowForm(false)}
      />
    </div>
  );
}

function ProductRow({ p, onEdit }) {
  const [hover, setHover] = React.useState(false);
  const stockCell = p.stock === 0
    ? <Badge variant="danger">0 · agotado</Badge>
    : p.stock < p.stockMin
      ? <Badge variant="warning">{p.stock} · bajo</Badge>
      : <span style={{ fontVariantNumeric: "tabular-nums", font: "600 13px var(--font-sans)" }}>{p.stock}</span>;

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}
    >
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Thumb initials={p.thumb} />
          <span style={{ font: "500 13px var(--font-sans)" }}>{p.nombre}</span>
        </div>
      </Td>
      <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>{p.codigo}</span></Td>
      <Td><Badge variant="neutral">{p.categoria}</Badge></Td>
      <Td align="right">{stockCell}</Td>
      <Td align="right" mono>{fmtMoney(p.compra)}</Td>
      <Td align="right" mono>{fmtMoney(p.venta)}</Td>
      <Td align="right">
        <div style={{ display: "inline-flex", gap: 4 }}>
          <IconButton icon="pencil" label="Editar" onClick={onEdit} />
          <IconButton icon="trash" label="Desactivar" />
        </div>
      </Td>
    </tr>
  );
}

function IconButton({ icon, label, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={label} aria-label={label}
      style={{
        border: "1px solid transparent", background: hover ? "var(--paper)" : "transparent",
        borderColor: hover ? "var(--border)" : "transparent",
        padding: 6, borderRadius: 6, cursor: "pointer",
        color: "var(--fg-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function ProductoFormModal({ open, product, onClose, onSave }) {
  const isEdit = !!product;
  const [data, setData] = React.useState({
    nombre: product?.nombre || "",
    codigo: product?.codigo || "",
    categoria: product?.categoria || "Bebidas",
    proveedor: "Distribuidora Centro",
    compra: product?.compra || "",
    venta: product?.venta || "",
    stock: product?.stock || "",
    stockMin: product?.stockMin || "",
    venc: "",
    conVenc: false,
  });
  React.useEffect(() => {
    if (open) {
      setData({
        nombre: product?.nombre || "",
        codigo: product?.codigo || "",
        categoria: product?.categoria || "Bebidas",
        proveedor: "Distribuidora Centro",
        compra: product?.compra || "",
        venta: product?.venta || "",
        stock: product?.stock || "",
        stockMin: product?.stockMin || "",
        venc: "",
        conVenc: false,
      });
    }
  }, [open, product]);

  const M = window.MOCK;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar producto" : "Agregar producto"}
      subtitle={isEdit ? `Modificando "${product?.nombre}"` : "Completa los datos para registrar un nuevo producto"}
      width={640}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onSave}>{isEdit ? "Guardar cambios" : "Agregar producto"}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Image + name row */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 88, height: 88, background: "var(--ink-05)", border: "1px dashed var(--border-strong)",
            borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            color: "var(--fg-muted)", cursor: "pointer", flexShrink: 0,
          }}>
            <Icon name="package" size={20} />
            <span style={{ font: "500 10px var(--font-sans)" }}>Imagen</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <TextField
              label="Nombre del producto"
              value={data.nombre}
              onChange={e => setData({ ...data, nombre: e.target.value })}
              placeholder="Ej. Coca-Cola 600ml"
            />
            <div style={{ position: "relative" }}>
              <TextField
                label="Código de barras"
                value={data.codigo}
                onChange={e => setData({ ...data, codigo: e.target.value })}
                placeholder="Escanea o escribe"
              />
              <button
                type="button"
                title="Escanear"
                style={{
                  position: "absolute", right: 4, bottom: 4,
                  height: 28, padding: "0 10px", borderRadius: 4,
                  background: "var(--ink-05)", border: "1px solid var(--border)",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  font: "500 11px var(--font-sans)", color: "var(--ink-80)", cursor: "pointer",
                }}
              >
                <Icon name="scan-barcode" size={13} />
                Escanear
              </button>
            </div>
          </div>
        </div>

        {/* Two-column section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Select
            label="Categoría"
            value={data.categoria}
            onChange={e => setData({ ...data, categoria: e.target.value })}
            options={M.categorias}
          />
          <Select
            label="Proveedor"
            value={data.proveedor}
            onChange={e => setData({ ...data, proveedor: e.target.value })}
            options={M.proveedores.map(p => p.nombre)}
          />
          <TextField
            label="Precio de compra"
            value={data.compra}
            onChange={e => setData({ ...data, compra: e.target.value })}
            prefix="$"
            placeholder="0.00"
          />
          <TextField
            label="Precio de venta"
            value={data.venta}
            onChange={e => setData({ ...data, venta: e.target.value })}
            prefix="$"
            placeholder="0.00"
            help={data.compra && data.venta ? `Margen: ${Math.round(((data.venta - data.compra) / data.venta) * 100)}%` : null}
          />
          <TextField
            label="Stock actual"
            value={data.stock}
            onChange={e => setData({ ...data, stock: e.target.value })}
            placeholder="0"
          />
          <TextField
            label="Stock mínimo"
            value={data.stockMin}
            onChange={e => setData({ ...data, stockMin: e.target.value })}
            placeholder="0"
            help="Aviso cuando el stock baje de este valor"
          />
        </div>

        {/* Optional expiration */}
        <div style={{ padding: "14px 16px", background: "var(--ink-05)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 13px var(--font-sans)", cursor: "pointer" }}>
            <input type="checkbox" checked={data.conVenc} onChange={e => setData({ ...data, conVenc: e.target.checked })} style={{ width: 14, height: 14, accentColor: "var(--ink-100)" }} />
            Producto con fecha de vencimiento
          </label>
          {data.conVenc && (
            <TextField
              label="Fecha de vencimiento"
              type="date"
              value={data.venc}
              onChange={e => setData({ ...data, venc: e.target.value })}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

window.InventarioScreen = InventarioScreen;
