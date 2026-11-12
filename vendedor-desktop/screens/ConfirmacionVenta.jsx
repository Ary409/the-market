// Confirmación de venta — modal grande tras cobrar.

function ConfirmacionVenta({ open, sale, onClose, onNueva }) {
  if (!open || !sale) return null;
  const total = sale.total;
  const itemCount = sale.cart.reduce((a, b) => a + b.qty, 0);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(10,10,10,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fade 220ms cubic-bezier(0.16,1,0.3,1)",
        padding: 24,
      }}
      onClick={onNueva}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxWidth: "100%",
          background: "var(--paper)", borderRadius: 14,
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "slideUp 280ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header — success */}
        <div style={{ padding: "28px 28px 18px", textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: "#ECFDF3", border: "1.5px solid #BBF7D0",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
            animation: "popIn 320ms cubic-bezier(0.16,1,0.3,1)",
          }}>
            <Icon name="check" size={28} strokeWidth={2.5} style={{ color: "#15803D" }} />
          </div>
          <div style={{ font: "600 20px var(--font-sans)", letterSpacing: "-0.022em" }}>Venta registrada</div>
          <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
            Recibo <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-100)" }}>{window.MOCK.recibo.numero}</span>
          </div>
        </div>

        {/* Resumen */}
        <div style={{ padding: "0 28px 16px" }}>
          <div style={{
            border: "1px solid var(--border)", borderRadius: 10,
            overflow: "hidden",
          }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--ink-05)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {itemCount} {itemCount === 1 ? "producto" : "productos"}
              </span>
              <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)" }}>{sale.metodo}</span>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {sale.cart.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ font: "500 12px var(--font-mono)", color: "var(--fg-muted)", minWidth: 22 }}>{item.qty}×</span>
                  <span style={{ flex: 1, font: "400 13px var(--font-sans)", color: "var(--ink-100)" }}>{item.nombre}</span>
                  <span style={{ font: "500 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(item.qty * item.precio)}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 16px", background: "var(--paper)", display: "flex", flexDirection: "column", gap: 6 }}>
              {sale.metodo === "Efectivo" && sale.recibido > total && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>
                    <span>Total</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMoney(total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>
                    <span>Recibido</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMoney(sale.recibido)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", font: "600 16px var(--font-sans)", color: "var(--ink-100)", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                    <span>Cambio</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMoney(sale.cambio)}</span>
                  </div>
                </>
              )}
              {!(sale.metodo === "Efectivo" && sale.recibido > total) && (
                <div style={{ display: "flex", justifyContent: "space-between", font: "600 18px var(--font-sans)", color: "var(--ink-100)" }}>
                  <span>Total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMoney(total)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, padding: "0 28px 24px" }}>
          <Button variant="secondary" size="lg" icon="printer" style={{ flex: 1 }}>Imprimir recibo</Button>
          <Button size="lg" onClick={onNueva} style={{ flex: 1 }}>Nueva venta</Button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmacionVenta = ConfirmacionVenta;
