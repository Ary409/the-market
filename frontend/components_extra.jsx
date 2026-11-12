// Componentes extra del frontend conectado

function PhaseBanner({ phase, text }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px", borderRadius: 8,
      background: "#FEF3C7", border: "1px solid #FDE68A",
      font: "400 12px var(--font-sans)", color: "#92400E",
    }}>
      <Icon name="alert-triangle" size={14} style={{ color: "#B45309", flexShrink: 0 }} />
      <span>{text}</span>
      <span style={{ marginLeft: "auto", background: "#FDE68A", padding: "2px 8px", borderRadius: 20, font: "600 11px var(--font-sans)" }}>
        Fase {phase}
      </span>
    </div>
  );
}

window.PhaseBanner = PhaseBanner;

function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `${Math.max(2, size * 0.12)}px solid var(--ink-10)`,
      borderTopColor: "var(--ink-100)",
      animation: "spin 0.7s linear infinite",
      display: "inline-block", flexShrink: 0,
    }} />
  );
}

window.Spinner = Spinner;

function Th({ children, align = "left" }) {
  return <th style={{
    textAlign: align,
    font: "600 11px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase",
    color: "var(--fg-muted)", padding: "10px 16px", background: "var(--ink-05)", borderBottom: "1px solid var(--border)",
  }}>{children}</th>;
}

function Td({ children, align = "left", mono = false }) {
  return <td style={{
    padding: "12px 16px",
    font: "400 13px var(--font-sans)",
    color: "var(--ink-100)",
    textAlign: align,
    fontVariantNumeric: mono ? "tabular-nums" : "normal",
  }}>{children}</td>;
}

window.Th = Th;
window.Td = Td;
