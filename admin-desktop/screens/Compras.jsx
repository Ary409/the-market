// Compras — orders table + new order modal.

function ComprasScreen() {
  const [showNew, setShowNew] = React.useState(false);
  const M = window.MOCK;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField icon="search" placeholder="Buscar orden o proveedor..." style={{ flex: 1, maxWidth: 400 }} />
        <Select options={["Todos los estados", "Pendientes", "Recibidas"]} />
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={() => setShowNew(true)}>Nueva orden</Button>
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Orden</Th>
              <Th>Proveedor</Th>
              <Th>Fecha</Th>
              <Th align="right">Items</Th>
              <Th align="right">Total</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {M.ordenesCompra.map(o => (
              <CompraRow key={o.id} o={o} />
            ))}
          </tbody>
        </table>
      </Card>

      <NuevaOrdenModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function CompraRow({ o }) {
  const [hover, setHover] = React.useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}
    >
      <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-100)" }}>{o.id}</span></Td>
      <Td>{o.proveedor}</Td>
      <Td>{o.fecha}</Td>
      <Td align="right">{o.items}</Td>
      <Td align="right" mono>{fmtMoney(o.total)}</Td>
      <Td>
        {o.estado === "pendiente"
          ? <Badge variant="warning" dot>Pendiente</Badge>
          : <Badge variant="success" dot>Recibida</Badge>}
      </Td>
      <Td align="right">
        {o.estado === "pendiente"
          ? <Button size="sm" variant="secondary">Marcar recibida</Button>
          : <Button size="sm" variant="ghost">Ver detalle</Button>}
      </Td>
    </tr>
  );
}

function NuevaOrdenModal({ open, onClose }) {
  const M = window.MOCK;
  const [proveedor, setProveedor] = React.useState(M.proveedores[0].nombre);
  const [items, setItems] = React.useState([
    { producto: M.productos[0], cantidad: 24, precio: M.productos[0].compra },
    { producto: M.productos[1], cantidad: 12, precio: M.productos[1].compra },
  ]);

  const total = items.reduce((a, b) => a + b.cantidad * b.precio, 0);

  function updateItem(i, key, value) {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    setItems(next);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva orden de compra"
      subtitle="Selecciona un proveedor y agrega los productos a recibir"
      width={760}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onClose}>Crear orden</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Select
          label="Proveedor"
          value={proveedor}
          onChange={e => setProveedor(e.target.value)}
          options={M.proveedores.map(p => p.nombre)}
        />

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ font: "600 13px var(--font-sans)" }}>Productos</span>
            <Button size="sm" variant="secondary" icon="plus">Agregar producto</Button>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Producto</Th>
                  <Th align="right">Cantidad</Th>
                  <Th align="right">Precio compra</Th>
                  <Th align="right">Subtotal</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Thumb initials={it.producto.thumb} size={28} />
                        <span style={{ font: "500 13px var(--font-sans)" }}>{it.producto.nombre}</span>
                      </div>
                    </Td>
                    <Td align="right">
                      <input
                        type="number"
                        value={it.cantidad}
                        onChange={e => updateItem(i, "cantidad", parseInt(e.target.value) || 0)}
                        style={{ width: 64, height: 28, padding: "0 8px", borderRadius: 4, border: "1px solid var(--border-strong)", textAlign: "right", font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
                      />
                    </Td>
                    <Td align="right">
                      <input
                        type="number"
                        step="0.01"
                        value={it.precio}
                        onChange={e => updateItem(i, "precio", parseFloat(e.target.value) || 0)}
                        style={{ width: 84, height: 28, padding: "0 8px", borderRadius: 4, border: "1px solid var(--border-strong)", textAlign: "right", font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
                      />
                    </Td>
                    <Td align="right" mono>{fmtMoney(it.cantidad * it.precio)}</Td>
                    <Td align="right">
                      <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", padding: 4, cursor: "pointer", color: "var(--fg-muted)" }}>
                        <Icon name="x" size={14} />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--ink-05)", borderTop: "1px solid var(--border)" }}>
              <span style={{ font: "500 13px var(--font-sans)", color: "var(--fg-muted)" }}>Total estimado</span>
              <span style={{ font: "600 16px var(--font-sans)", color: "var(--ink-100)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

window.ComprasScreen = ComprasScreen;
