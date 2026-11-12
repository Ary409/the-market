// Success — sale completed. Big receipt number, summary, new sale button.

function Success({ cart, cambio, metodo, onNuevaVenta }) {
  const total = cart.reduce((a, b) => a + b.precio * b.qty, 0);
  const itemCount = cart.reduce((a, b) => a + b.qty, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      {/* Top check icon */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, paddingBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 999,
          background: "#ECFDF3", border: "1.5px solid #BBF7D0",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
          animation: "popIn 320ms cubic-bezier(0.16,1,0.3,1)",
        }}>
          <MIcon name="check" size={32} color="#15803D" stroke={2.5} />
        </div>
        <div style={{ font: "600 18px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>Venta registrada</div>
        <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>{window.M.recibo.fecha}</div>
      </div>

      {/* Recibo number — big */}
      <div style={{ textAlign: "center", padding: "8px 24px 18px" }}>
        <div style={{ font: "500 11px var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>Recibo</div>
        <div style={{ font: "600 32px var(--font-mono)", letterSpacing: "-0.011em", color: "var(--ink-100)", marginTop: 4 }}>{window.M.recibo.numero}</div>
      </div>

      {/* Summary */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 18px" }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {itemCount} {itemCount === 1 ? "producto" : "productos"}
            </span>
            <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)" }}>{metodo}</span>
          </div>
          {cart.map(item => (
            <div key={item.id} style={{ display: "flex", padding: "10px 16px", borderBottom: "1px solid var(--border)", alignItems: "center", gap: 10 }}>
              <span style={{ font: "500 13px var(--font-mono)", color: "var(--fg-muted)", minWidth: 24 }}>{item.qty}×</span>
              <span style={{ flex: 1, font: "400 13px var(--font-sans)", color: "var(--ink-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</span>
              <span style={{ font: "500 13px var(--font-sans)", fontVariantNumeric: "tabular-nums", color: "var(--ink-100)" }}>{mFmt(item.qty * item.precio)}</span>
            </div>
          ))}

          <div style={{ padding: "14px 16px", background: "var(--ink-05)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: "500 14px var(--font-sans)", color: "var(--ink-100)" }}>
              <span>Total</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{mFmt(total)}</span>
            </div>
            {cambio > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", font: "500 13px var(--font-sans)", color: "var(--fg-muted)" }}>
                <span>Cambio entregado</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{mFmt(cambio)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "16px 18px calc(20px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
        <MButton variant="secondary" size="lg" icon="receipt">Imprimir recibo</MButton>
        <MButton size="xl" onClick={onNuevaVenta}>Nueva venta</MButton>
      </div>
    </div>
  );
}

window.Success = Success;
