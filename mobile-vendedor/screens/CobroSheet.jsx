// Cobro bottom sheet — payment method, amount received, change.

function CobroSheet({ open, total, onClose, onConfirm }) {
  const [metodo, setMetodo] = React.useState("efectivo");
  const [recibido, setRecibido] = React.useState("");

  const recibidoNum = parseFloat(recibido) || 0;
  const cambio = Math.max(0, recibidoNum - total);
  const insuficiente = metodo === "efectivo" && recibido !== "" && recibidoNum < total;
  const puedeConfirmar = metodo !== "efectivo" || recibidoNum >= total;

  // Quick cash amounts
  const quickAmounts = [
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 200) * 200,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v > total);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ padding: "8px 20px 0", fontFamily: "var(--font-sans)" }}>
        <div style={{ font: "600 18px var(--font-sans)", letterSpacing: "-0.011em", marginBottom: 4 }}>Cobro</div>
        <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>Total a cobrar</div>
        <div style={{ font: "600 36px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums", margin: "2px 0 18px" }}>{mFmt(total)}</div>

        {/* Method selector */}
        <div style={{ font: "600 11px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 8 }}>Método de pago</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
          <MethodButton icon="banknote" label="Efectivo" active={metodo === "efectivo"} onClick={() => setMetodo("efectivo")} />
          <MethodButton icon="credit-card" label="Tarjeta" active={metodo === "tarjeta"} onClick={() => setMetodo("tarjeta")} />
          <MethodButton icon="split" label="Mixto" active={metodo === "mixto"} onClick={() => setMetodo("mixto")} />
        </div>

        {/* Amount received (efectivo only) */}
        {metodo === "efectivo" && (
          <>
            <MField
              label="Monto recibido"
              value={recibido}
              onChange={e => setRecibido(e.target.value)}
              type="number"
              placeholder="0.00"
              error={insuficiente ? "El monto recibido es menor al total" : ""}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {quickAmounts.slice(0, 4).map(amt => (
                <button
                  key={amt}
                  onClick={() => setRecibido(String(amt))}
                  style={{
                    flex: "1 1 0", minWidth: 60,
                    height: 36, padding: "0 8px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--paper)",
                    borderRadius: 8,
                    font: "600 13px var(--font-sans)", color: "var(--ink-80)",
                    fontVariantNumeric: "tabular-nums",
                    cursor: "pointer",
                  }}
                >{mFmt(amt)}</button>
              ))}
            </div>

            {recibidoNum >= total && (
              <div style={{
                marginTop: 16, padding: "14px 16px",
                background: "#ECFDF3", border: "1px solid #BBF7D0", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ font: "500 13px var(--font-sans)", color: "#15803D" }}>Cambio a entregar</span>
                <span style={{ font: "600 22px var(--font-sans)", letterSpacing: "-0.011em", fontVariantNumeric: "tabular-nums", color: "#15803D" }}>{mFmt(cambio)}</span>
              </div>
            )}
          </>
        )}

        {metodo === "tarjeta" && (
          <div style={{ padding: "20px 16px", background: "var(--ink-05)", border: "1px solid var(--border)", borderRadius: 10, textAlign: "center" }}>
            <MIcon name="credit-card" size={28} style={{ color: "var(--fg-muted)", marginBottom: 8 }} />
            <div style={{ font: "500 14px var(--font-sans)" }}>Pasa la tarjeta por la terminal</div>
            <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>Confirma cuando termine la transacción</div>
          </div>
        )}

        {metodo === "mixto" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MField label="Efectivo" type="number" placeholder="0.00" />
            <MField label="Tarjeta" type="number" placeholder="0.00" />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, marginBottom: 8 }}>
          <MButton variant="secondary" size="lg" onClick={onClose} style={{ flex: 1 }}>Cancelar</MButton>
          <MButton variant="success" size="lg" onClick={onConfirm} disabled={!puedeConfirmar} style={{ flex: 2 }}>
            Confirmar venta
          </MButton>
        </div>
      </div>
    </BottomSheet>
  );
}

function MethodButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 72, padding: 8,
        background: active ? "var(--ink-100)" : "var(--paper)",
        color: active ? "var(--paper)" : "var(--ink-100)",
        border: `1px solid ${active ? "var(--ink-100)" : "var(--border-strong)"}`,
        borderRadius: 10,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        cursor: "pointer", WebkitTapHighlightColor: "transparent",
      }}
    >
      <MIcon name={icon} size={22} stroke={1.5} />
      <span style={{ font: "500 12px var(--font-sans)" }}>{label}</span>
    </button>
  );
}

window.CobroSheet = CobroSheet;
