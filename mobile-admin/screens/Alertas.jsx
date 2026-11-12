// Alertas — productos bajo stock + por vencer.

function Alertas({ onBack }) {
  const M = window.M;
  const [tab, setTab] = React.useState("stock"); // stock | vencer
  const [refreshing, setRefreshing] = React.useState(false);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }

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
        <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em" }}>Alertas</div>
        <button onClick={refresh} aria-label="Actualizar" style={{ background: "transparent", border: "none", padding: 10, color: "var(--fg-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <MIcon name="refresh" size={18} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
        </button>
      </header>

      {/* Tab switcher */}
      <div style={{ display: "flex", padding: "10px 16px 0", gap: 8 }}>
        <TabPill active={tab === "stock"} onClick={() => setTab("stock")} count={M.stockBajo.length}>
          Stock bajo
        </TabPill>
        <TabPill active={tab === "vencer"} onClick={() => setTab("vencer")} count={M.porVencer.length}>
          Por vencer
        </TabPill>
      </div>

      {/* Pull-to-refresh hint */}
      {refreshing && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", color: "var(--fg-muted)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 12px var(--font-sans)" }}>
            <Spinner /> Actualizando…
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {tab === "stock" && M.stockBajo.map(p => <StockAlertRow key={p.id} p={p} />)}
        {tab === "vencer" && M.porVencer.map(p => <VencerAlertRow key={p.id} p={p} />)}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TabPill({ active, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 34, padding: "0 14px",
        borderRadius: 999,
        background: active ? "var(--ink-100)" : "var(--paper)",
        color: active ? "var(--paper)" : "var(--ink-80)",
        border: `1px solid ${active ? "var(--ink-100)" : "var(--border-strong)"}`,
        font: "500 13px var(--font-sans)",
        cursor: "pointer",
      }}
    >
      {children}
      <span style={{
        minWidth: 18, padding: "0 6px", height: 18, borderRadius: 999,
        background: active ? "rgba(255,255,255,0.18)" : "var(--ink-05)",
        color: active ? "var(--paper)" : "var(--fg-muted)",
        font: "600 11px var(--font-sans)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontVariantNumeric: "tabular-nums",
      }}>{count}</span>
    </button>
  );
}

function StockAlertRow({ p }) {
  const agotado = p.stock === 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      background: "var(--paper)",
      border: "1px solid var(--border)", borderRadius: 12,
    }}>
      <MThumb initials={p.thumb} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "500 14px var(--font-sans)", color: "var(--ink-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
        <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{p.categoria}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 999,
          background: agotado ? "#FEF2F2" : "#FEF3C7",
          color: agotado ? "#991B1B" : "#92400E",
          border: `1px solid ${agotado ? "#FECACA" : "#FDE68A"}`,
          font: "600 11px var(--font-sans)",
        }}>
          {agotado ? "Agotado" : `${p.stock} de ${p.minimo}`}
        </span>
      </div>
    </div>
  );
}

function VencerAlertRow({ p }) {
  const urgente = p.diasRestantes <= 1;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      background: "var(--paper)",
      border: "1px solid var(--border)", borderRadius: 12,
    }}>
      <MThumb initials={p.thumb} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "500 14px var(--font-sans)", color: "var(--ink-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "400 12px var(--font-sans)", color: urgente ? "var(--danger)" : "var(--fg-muted)", marginTop: 4 }}>
          <MIcon name="calendar" size={11} />
          {p.vence}
        </div>
      </div>
      {urgente && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 999,
          background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA",
          font: "600 11px var(--font-sans)",
        }}>
          {p.diasRestantes}d
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: 999,
      border: "2px solid var(--ink-15)",
      borderTopColor: "var(--ink-100)",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

window.Alertas = Alertas;
