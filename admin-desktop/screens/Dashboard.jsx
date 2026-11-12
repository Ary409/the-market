// Dashboard — 4 metric cards, 7-day sales chart, recent sales table, low stock panel.

function DashboardScreen() {
  const M = window.MOCK;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <MetricRow />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        <SalesChart data={M.ventas7dias} />
        <LowStockPanel productos={M.productos.filter(p => p.stock < p.stockMin).slice(0, 6)} />
      </div>
      <RecentSales ventas={M.ventasRecientes} />
    </div>
  );
}

function MetricRow() {
  const metrics = [
    { label: "Ventas hoy",          value: "48",          delta: "+12%",  trend: "up",   sub: "vs ayer" },
    { label: "Ingresos hoy",        value: "$3,245.50",   delta: "+$420", trend: "up",   sub: "vs ayer" },
    { label: "Productos bajo stock",value: "7",           delta: "+2",    trend: "down", sub: "nuevos hoy" },
    { label: "Caja actual",         value: "$3,780.00",   delta: "Abierta", trend: "neutral", sub: "desde 08:32" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {metrics.map(m => <MetricCard key={m.label} {...m} />)}
    </div>
  );
}

function MetricCard({ label, value, delta, trend, sub }) {
  const colors = {
    up:      { bg: "#ECFDF3", fg: "#15803D", bd: "#BBF7D0", icon: "arrow-up" },
    down:    { bg: "#FEF2F2", fg: "#991B1B", bd: "#FECACA", icon: "arrow-up" },
    neutral: { bg: "#F7F7F7", fg: "#525252", bd: "#E5E5E5", icon: null },
  };
  const c = colors[trend];
  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ font: "600 28px var(--font-sans)", letterSpacing: "-0.022em", color: "var(--ink-100)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 8px", borderRadius: 999,
          background: c.bg, color: c.fg, border: `1px solid ${c.bd}`,
          font: "600 11px var(--font-sans)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {c.icon && <Icon name={c.icon} size={10} strokeWidth={2.5} />}
          {delta}
        </span>
        <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>{sub}</span>
      </div>
    </div>
  );
}

function SalesChart({ data }) {
  const max = Math.max(...data.map(d => d.total));
  return (
    <Card title="Ventas últimos 7 días" subtitle={"Total: " + fmtMoney(data.reduce((a, b) => a + b.total, 0))}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 200, paddingTop: 8 }}>
        {data.map((d, i) => {
          const h = (d.total / max) * 100;
          const isToday = i === data.length - 1;
          return (
            <div key={d.dia} style={{ flex: 1, alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>
                {(d.total / 1000).toFixed(1) + "k"}
              </span>
              <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: `${h}%`,
                  background: isToday ? "var(--ink-100)" : "var(--ink-20)",
                  borderRadius: 4,
                  transition: "all 280ms cubic-bezier(0.16,1,0.3,1)",
                }} />
              </div>
              <span style={{ font: "500 11px var(--font-sans)", color: isToday ? "var(--ink-100)" : "var(--fg-muted)" }}>{d.dia}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function LowStockPanel({ productos }) {
  return (
    <Card
      title="Stock bajo"
      subtitle={`${productos.length} productos requieren reposición`}
      noPadding
    >
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {productos.map(p => (
          <li key={p.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
          }}>
            <Thumb initials={p.thumb} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "500 13px var(--font-sans)", color: "var(--ink-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</div>
              <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>Mín. {p.stockMin}</div>
            </div>
            <Badge variant={p.stock === 0 ? "danger" : "warning"}>
              {p.stock === 0 ? "0 agotado" : `${p.stock} bajo`}
            </Badge>
          </li>
        ))}
      </ul>
      <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        <Button variant="ghost" size="sm" style={{ width: "100%" }}>Ver todos</Button>
      </div>
    </Card>
  );
}

function RecentSales({ ventas }) {
  return (
    <Card
      title="Últimas ventas"
      subtitle="Hoy"
      action={<Button variant="ghost" size="sm">Ver todas →</Button>}
      noPadding
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <Th>Recibo</Th>
            <Th>Hora</Th>
            <Th>Items</Th>
            <Th>Vendedor</Th>
            <Th>Método</Th>
            <Th align="right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {ventas.map(v => (
            <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
              <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>{v.id}</span></Td>
              <Td>{v.hora}</Td>
              <Td>{v.items}</Td>
              <Td>{v.vendedor}</Td>
              <Td>{v.metodo}</Td>
              <Td align="right" mono>{fmtMoney(v.total)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

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
    font: `${mono ? 600 : 400} 13px ${mono ? "var(--font-sans)" : "var(--font-sans)"}`,
    color: "var(--ink-100)",
    textAlign: align,
    fontVariantNumeric: mono ? "tabular-nums" : "normal",
  }}>{children}</td>;
}

Object.assign(window, { DashboardScreen, Th, Td });
