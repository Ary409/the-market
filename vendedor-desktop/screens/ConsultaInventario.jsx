// Consulta de Inventario — sólo lectura para el vendedor.

function ConsultaInventario() {
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState("Todas");
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
      <div style={{
        padding: "14px 16px",
        background: "#EFF6FF", border: "1px solid #BFDBFE",
        borderRadius: 10,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <Icon name="eye" size={18} style={{ color: "#1D4ED8", marginTop: 2 }} />
        <div>
          <div style={{ font: "600 13px var(--font-sans)", color: "#1E40AF" }}>Vista de sólo lectura</div>
          <div style={{ font: "400 13px var(--font-sans)", color: "#1E40AF", marginTop: 2, opacity: 0.85 }}>
            Puedes consultar productos y stock disponible. Para modificar inventario contacta al administrador.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField
          icon="search"
          placeholder="Buscar por nombre o código..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 480 }}
        />
        <Select value={cat} onChange={e => setCat(e.target.value)} options={cats} />
        <div style={{ flex: 1 }} />
        <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
          {filtered.length} de {M.productos.length} productos
        </span>
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th>Código</Th>
              <Th>Categoría</Th>
              <Th align="right">Stock</Th>
              <Th align="right">Precio</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Thumb initials={p.thumb} />
                    <span style={{ font: "500 13px var(--font-sans)" }}>{p.nombre}</span>
                  </div>
                </Td>
                <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>{p.codigo}</span></Td>
                <Td><Badge variant="neutral">{p.categoria}</Badge></Td>
                <Td align="right">
                  {p.stock === 0
                    ? <Badge variant="danger">Agotado</Badge>
                    : p.stock <= 10
                      ? <Badge variant="warning">{p.stock} bajo</Badge>
                      : <span style={{ font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{p.stock}</span>}
                </Td>
                <Td align="right" mono>{fmtMoney(p.precio)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState icon="search" title="Sin resultados" body={`No encontramos productos para "${query}".`} />
        )}
      </Card>
    </div>
  );
}

window.ConsultaInventario = ConsultaInventario;
