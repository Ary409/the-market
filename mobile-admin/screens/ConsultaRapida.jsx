// Consulta rápida — escanea código y muestra ficha completa.

function ConsultaRapida({ onBack, onPhaseChange }) {
  const [phase, setPhase] = React.useState("scan"); // scan | detail
  const product = window.M.productoEscaneado;

  // Auto-detect after delay
  React.useEffect(() => {
    if (phase === "scan") {
      const t = setTimeout(() => setPhase("detail"), 1600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  React.useEffect(() => { onPhaseChange && onPhaseChange(phase); }, [phase, onPhaseChange]);

  if (phase === "scan") return <ScannerView onBack={onBack} />;
  return <ProductDetailView product={product} onBack={onBack} onRescan={() => setPhase("scan")} />;
}

function ScannerView({ onBack }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0A0A0A", color: "#fff", fontFamily: "var(--font-sans)", overflow: "hidden" }}>
      {/* Camera mock */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(120% 100% at 50% 40%, #2A2A2A 0%, #0A0A0A 60%, #000 100%)",
      }}>
        <div style={{
          position: "absolute", left: "10%", right: "10%", top: "44%",
          height: 2, background: "linear-gradient(to right, transparent, #fff, transparent)",
          boxShadow: "0 0 12px rgba(255,255,255,0.5)",
          animation: "scan 1.4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate",
        }} />
      </div>

      {/* Top */}
      <div style={{ position: "relative", zIndex: 2, padding: "calc(env(safe-area-inset-top) + 56px) 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} aria-label="Cerrar" style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)" }}>
          <MIcon name="x" size={18} />
        </button>
        <div style={{ font: "600 14px var(--font-sans)" }}>Consulta rápida</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Viewfinder */}
      <div style={{ position: "relative", zIndex: 1, height: "calc(100% - 200px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Viewfinder />
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "16px 16px calc(34px + env(safe-area-inset-bottom))" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "14px 18px", borderRadius: 12,
          background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
        }}>
          <Spinner light />
          <span style={{ font: "500 14px var(--font-sans)" }}>Buscando código...</span>
        </div>
      </div>

      <style>{`
        @keyframes scan { from { top: 30%; } to { top: 60%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Viewfinder() {
  const size = 240; const corner = 32; const thickness = 3;
  return (
    <div style={{ width: size, height: size * 0.7, position: "relative" }}>
      {[
        { top: 0, left: 0, borderTop: thickness, borderLeft: thickness },
        { top: 0, right: 0, borderTop: thickness, borderRight: thickness },
        { bottom: 0, left: 0, borderBottom: thickness, borderLeft: thickness },
        { bottom: 0, right: 0, borderBottom: thickness, borderRight: thickness },
      ].map((s, i) => (
        <div key={i} style={{
          position: "absolute", width: corner, height: corner,
          borderColor: "#fff", borderStyle: "solid", borderRadius: 8,
          borderTopWidth: s.borderTop || 0, borderRightWidth: s.borderRight || 0,
          borderBottomWidth: s.borderBottom || 0, borderLeftWidth: s.borderLeft || 0,
          ...(s.top !== undefined ? { top: s.top } : {}),
          ...(s.bottom !== undefined ? { bottom: s.bottom } : {}),
          ...(s.left !== undefined ? { left: s.left } : {}),
          ...(s.right !== undefined ? { right: s.right } : {}),
        }} />
      ))}
    </div>
  );
}

function Spinner({ light }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 999,
      border: `2px solid ${light ? "rgba(255,255,255,0.2)" : "var(--ink-15)"}`,
      borderTopColor: light ? "rgba(255,255,255,0.95)" : "var(--ink-100)",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

function ProductDetailView({ product, onBack, onRescan }) {
  const margen = ((product.venta - product.compra) / product.venta) * 100;
  const ganancia = product.venta - product.compra;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 8px 12px 4px", borderBottom: "1px solid var(--border)",
      }}>
        <button onClick={onBack} aria-label="Atrás" style={{ background: "transparent", border: "none", padding: 10, color: "var(--ink-100)", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <MIcon name="chevron-left" size={22} />
        </button>
        <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em" }}>Producto</div>
        <button onClick={onRescan} aria-label="Otro" style={{ background: "transparent", border: "none", padding: 10, color: "var(--ink-100)", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <MIcon name="scan-barcode" size={20} />
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* Hero */}
        <div style={{ padding: "20px 18px 16px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "inline-flex", width: 72, height: 72, borderRadius: 14, background: "var(--ink-10)", alignItems: "center", justifyContent: "center", font: "600 26px var(--font-sans)", color: "var(--fg-muted)", marginBottom: 12 }}>
            {product.thumb}
          </div>
          <div style={{ font: "600 18px var(--font-sans)", letterSpacing: "-0.011em" }}>{product.nombre}</div>
          <div style={{ font: "400 12px var(--font-mono)", color: "var(--fg-muted)", marginTop: 4 }}>{product.codigo}</div>
        </div>

        {/* Stock + price */}
        <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <DetailMetric label="Stock actual" value={product.stock} sub={`Mín. ${product.stockMin}`} />
          <DetailMetric label="Precio venta" value={mFmt(product.venta)} sub={`Compra ${mFmt(product.compra)}`} />
        </div>

        {/* Margen card */}
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{
            background: "#ECFDF3", border: "1px solid #BBF7D0", borderRadius: 12,
            padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ font: "500 12px var(--font-sans)", color: "#15803D" }}>Margen unitario</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <span style={{ font: "600 22px var(--font-sans)", color: "#15803D", letterSpacing: "-0.011em" }}>{margen.toFixed(1)}%</span>
                <span style={{ font: "400 12px var(--font-sans)", color: "#15803D", opacity: 0.85 }}>· {mFmt(ganancia)} por unidad</span>
              </div>
            </div>
            <MIcon name="trend-up" size={28} color="#15803D" stroke={1.5} />
          </div>
        </div>

        {/* Info rows */}
        <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 0 }}>
          <InfoRow label="Categoría" value={product.categoria} />
          <InfoRow label="Proveedor" value={product.proveedor} last />
        </div>

        {/* Movements */}
        <div style={{ padding: "20px 16px 24px" }}>
          <div style={{ font: "600 11px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 8 }}>
            Últimos movimientos
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {product.movimientos.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < product.movimientos.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: m.cantidad > 0 ? "#ECFDF3" : "var(--ink-05)",
                  color: m.cantidad > 0 ? "#15803D" : "var(--fg-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <MIcon name={m.cantidad > 0 ? "arrow-down" : "arrow-up"} size={14} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "500 13px var(--font-sans)" }}>{m.tipo}</div>
                  <div style={{ font: "400 11px var(--font-mono)", color: "var(--fg-muted)" }}>{m.detalle}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums", color: m.cantidad > 0 ? "#15803D" : "var(--ink-100)" }}>
                    {m.cantidad > 0 ? "+" : ""}{m.cantidad}
                  </div>
                  <div style={{ font: "400 10px var(--font-sans)", color: "var(--fg-muted)" }}>{m.fecha}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ font: "600 22px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{sub}</span>
    </div>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 0",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ font: "500 13px var(--font-sans)", color: "var(--ink-100)" }}>{value}</span>
    </div>
  );
}

window.ConsultaRapida = ConsultaRapida;
