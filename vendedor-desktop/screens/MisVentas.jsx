// Mis ventas — lista de recibos del día del vendedor con detalle.

function MisVentas() {
  const M = window.MOCK;
  const [selected, setSelected] = React.useState(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>
      {/* Lista */}
      <Card title="Hoy" subtitle={`${M.misVentasHoy.length} ventas · ${fmtMoney(M.misVentasHoy.reduce((a, b) => a + b.total, 0))}`} noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Recibo</Th>
              <Th>Hora</Th>
              <Th>Items</Th>
              <Th>Método</Th>
              <Th align="right">Total</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {M.misVentasHoy.map(v => {
              const isSelected = selected?.id === v.id;
              return (
                <tr
                  key={v.id}
                  onClick={() => setSelected(v)}
                  style={{
                    borderTop: "1px solid var(--border)",
                    background: isSelected ? "var(--ink-05)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-100)" }}>{v.id}</span></Td>
                  <Td>{v.hora}</Td>
                  <Td>{v.items}</Td>
                  <Td>{v.metodo}</Td>
                  <Td align="right" mono>{fmtMoney(v.total)}</Td>
                  <Td align="right">
                    <Icon name="chevron-right" size={14} style={{ color: "var(--fg-muted)" }} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Detail panel */}
      {selected ? <VentaDetalle venta={selected} onClose={() => setSelected(null)} /> : (
        <Card title="Detalle">
          <EmptyState icon="receipt" title="Selecciona una venta" body="Haz click sobre cualquier fila para ver el detalle." />
        </Card>
      )}
    </div>
  );
}

function VentaDetalle({ venta, onClose }) {
  const M = window.MOCK;
  // Mock items based on venta.items count
  const items = M.productos.slice(0, venta.items).map(p => ({ ...p, qty: 1 }));

  return (
    <Card
      title={venta.id}
      subtitle={`${venta.hora} · ${venta.metodo}`}
      action={<button onClick={onClose} style={{ border: "none", background: "transparent", padding: 4, cursor: "pointer", color: "var(--fg-muted)" }}><Icon name="x" size={16} /></button>}
      noPadding
    >
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ font: "500 12px var(--font-mono)", color: "var(--fg-muted)", minWidth: 24 }}>{item.qty}×</span>
            <span style={{ flex: 1, font: "400 13px var(--font-sans)" }}>{item.nombre}</span>
            <span style={{ font: "500 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(item.qty * item.precio)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ font: "600 14px var(--font-sans)" }}>Total</span>
        <span style={{ font: "600 18px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(venta.total)}</span>
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <Button variant="secondary" size="sm" icon="printer" style={{ flex: 1 }}>Imprimir</Button>
      </div>
    </Card>
  );
}

window.MisVentas = MisVentas;
