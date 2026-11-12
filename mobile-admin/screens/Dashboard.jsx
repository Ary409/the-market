// Mobile Admin Dashboard — metrics + quick access to alerts.

function DashboardMobile({ onGoAlerts, onGoScan, onGoHistory }) {
  const M = window.M;
  const r = M.resumenHoy;
  const totalAlerts = r.productosBajos + r.porVencer;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--ink-05)", fontFamily: "var(--font-sans)", overflowY: "auto" }}>
      {/* Header */}
      <header style={{
        padding: "14px 18px 18px",
        background: "var(--paper)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MThumb initials={M.user.inicial} size={36} />
            <div>
              <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>Hola,</div>
              <div style={{ font: "600 15px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>
                {M.user.nombre.split(" ")[0]}
              </div>
            </div>
          </div>
          <button
            onClick={onGoAlerts}
            style={{ position: "relative", width: 40, height: 40, borderRadius: 999, border: "1px solid var(--border)", background: "var(--paper)", color: "var(--ink-80)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            aria-label="Alertas"
          >
            <MIcon name="bell" size={18} />
            {totalAlerts > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                minWidth: 18, height: 18, padding: "0 5px",
                borderRadius: 999, background: "var(--danger)", color: "var(--paper)",
                font: "600 10px var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid var(--paper)",
              }}>{totalAlerts}</span>
            )}
          </button>
        </div>
      </header>

      {/* Today summary */}
      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ font: "600 11px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-subtle)", padding: "0 4px" }}>
          Resumen de hoy
        </div>

        {/* Big revenue card */}
        <div style={{
          background: "var(--ink-100)", color: "var(--paper)",
          borderRadius: 14, padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <span style={{ font: "500 12px var(--font-sans)", opacity: 0.7 }}>Ingresos hoy</span>
          <span style={{ font: "600 32px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums" }}>{mFmt(r.ingresos)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", font: "600 11px var(--font-sans)" }}>
              <MIcon name="arrow-up" size={11} stroke={2.5} />+12%
            </span>
            <span style={{ font: "400 11px var(--font-sans)", opacity: 0.7 }}>vs ayer · {r.ventas} ventas</span>
          </div>
        </div>

        {/* Secondary metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SmallMetric label="Caja actual" value={mFmt(r.cajaActual)} />
          <SmallMetric label="Ticket promedio" value={mFmt(r.ticketPromedio)} />
        </div>
      </div>

      {/* Quick actions / alerts callout */}
      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {totalAlerts > 0 && (
          <button
            onClick={onGoAlerts}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px",
              background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12,
              cursor: "pointer", textAlign: "left",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(180,83,9,0.12)", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="alert-triangle" size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "600 14px var(--font-sans)", color: "#92400E" }}>{totalAlerts} alertas requieren atención</div>
              <div style={{ font: "400 12px var(--font-sans)", color: "#92400E", opacity: 0.85, marginTop: 2 }}>
                {r.productosBajos} productos bajo stock · {r.porVencer} por vencer
              </div>
            </div>
            <MIcon name="chevron-right" size={18} color="#92400E" />
          </button>
        )}

        <div style={{ font: "600 11px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-subtle)", padding: "8px 4px 0" }}>
          Acceso rápido
        </div>

        <QuickAction icon="scan-barcode" title="Consulta rápida" subtitle="Escanea un producto para ver detalles" onClick={onGoScan} />
        <QuickAction icon="receipt" title="Ventas de hoy" subtitle={`${M.ventasHoy.length} transacciones registradas`} onClick={onGoHistory} />
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ font: "600 18px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function QuickAction({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px",
        background: "var(--paper)", border: "1px solid var(--border)",
        borderRadius: 12,
        cursor: "pointer", textAlign: "left",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--ink-05)", color: "var(--ink-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MIcon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: "600 14px var(--font-sans)", color: "var(--ink-100)" }}>{title}</div>
        <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{subtitle}</div>
      </div>
      <MIcon name="chevron-right" size={18} color="var(--fg-muted)" />
    </button>
  );
}

window.DashboardMobile = DashboardMobile;
