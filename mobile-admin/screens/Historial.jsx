// Historial de ventas del día — lista + detalle en bottom sheet.

function Historial({ onBack }) {
  const M = window.M;
  const [selected, setSelected] = React.useState(null);
  const totalDia = M.ventasHoy.reduce((a, b) => a + b.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 8px 12px 4px", borderBottom: "1px solid var(--border)",
      }}>
        <button onClick={onBack} aria-label="Atrás" style={{ background: "transparent", border: "none", padding: 10, color: "var(--ink-100)", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <MIcon name="chevron-left" size={22} />
        </button>
        <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em" }}>Ventas del día</div>
        <div style={{ width: 42 }} />
      </header>

      {/* Day summary */}
      <div style={{
        padding: "16px 16px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--ink-05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Hoy
          </div>
          <div style={{ font: "600 14px var(--font-sans)", color: "var(--ink-100)", marginTop: 2 }}>
            {M.ventasHoy.length} ventas
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Total
          </div>
          <div style={{ font: "600 22px var(--font-sans)", color: "var(--ink-100)", letterSpacing: "-0.011em", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
            {mFmt(totalDia)}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {M.ventasHoy.map(v => (
          <button
            key={v.id}
            onClick={() => setSelected(v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderBottom: "1px solid var(--border)",
              background: "var(--paper)", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none",
              cursor: "pointer", textAlign: "left",
              WebkitTapHighlightColor: "transparent",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: v.metodo === "Efectivo" ? "#ECFDF3" : "#EFF6FF",
              color: v.metodo === "Efectivo" ? "#15803D" : "#1E40AF",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MIcon name={v.metodo === "Efectivo" ? "banknote" : "credit-card"} size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ font: "500 13px var(--font-mono)", color: "var(--ink-100)" }}>{v.id}</span>
                <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>· {v.hora}</span>
              </div>
              <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>
                {v.vendedor} · {v.items} items
              </div>
            </div>
            <div style={{ font: "600 15px var(--font-sans)", fontVariantNumeric: "tabular-nums", color: "var(--ink-100)" }}>
              {mFmt(v.total)}
            </div>
            <MIcon name="chevron-right" size={16} color="var(--fg-muted)" />
          </button>
        ))}
      </div>

      <DetailSheet venta={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function DetailSheet({ venta, onClose }) {
  if (!venta) return null;
  const items = window.M.productoEscaneado;
  // Mock items for the receipt: take N products
  const productos = window.M ? window.M : null;
  const cartItems = productos ? [
    { thumb: "CC", nombre: "Coca-Cola 600ml", qty: 2, precio: 18.50 },
    { thumb: "PB", nombre: "Pan Bimbo grande", qty: 1, precio: 48.00 },
    { thumb: "LE", nombre: "Leche entera Alpura 1L", qty: 1, precio: 28.00 },
    { thumb: "GM", nombre: "Galletas Marías 170g", qty: 2, precio: 14.00 },
  ].slice(0, Math.min(venta.items, 4)) : [];

  return (
    <BottomSheet open={!!venta} onClose={onClose}>
      <div style={{ padding: "8px 18px 0", fontFamily: "var(--font-sans)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ font: "600 18px var(--font-mono)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>{venta.id}</div>
            <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{venta.vendedor} · {venta.hora}</div>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 999,
            background: venta.metodo === "Efectivo" ? "#ECFDF3" : "#EFF6FF",
            color: venta.metodo === "Efectivo" ? "#15803D" : "#1E40AF",
            border: `1px solid ${venta.metodo === "Efectivo" ? "#BBF7D0" : "#BFDBFE"}`,
            font: "600 12px var(--font-sans)",
          }}>
            {venta.metodo}
          </span>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {cartItems.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < cartItems.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ font: "500 12px var(--font-mono)", color: "var(--fg-muted)", minWidth: 22 }}>{it.qty}×</span>
              <span style={{ flex: 1, font: "400 13px var(--font-sans)" }}>{it.nombre}</span>
              <span style={{ font: "500 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{mFmt(it.qty * it.precio)}</span>
            </div>
          ))}
          <div style={{ padding: "14px", background: "var(--ink-05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ font: "500 13px var(--font-sans)", color: "var(--ink-100)" }}>Total</span>
            <span style={{ font: "600 18px var(--font-sans)", fontVariantNumeric: "tabular-nums", color: "var(--ink-100)" }}>{mFmt(venta.total)}</span>
          </div>
        </div>

        <div style={{ paddingTop: 16, paddingBottom: 8 }}>
          <MButton variant="secondary" size="lg" icon="receipt" style={{ width: "100%" }}>Reimprimir recibo</MButton>
        </div>
      </div>
    </BottomSheet>
  );
}

window.Historial = Historial;
