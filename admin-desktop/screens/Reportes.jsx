// Reportes — date range + tabs (Ventas, Top productos, Ganancia bruta) with chart + exportable table.

function ReportesScreen() {
  const [tab, setTab] = React.useState("ventas");
  const [rango, setRango] = React.useState("Últimos 7 días");
  const M = window.MOCK;

  const tabs = [
    { id: "ventas", label: "Ventas" },
    { id: "top",    label: "Productos más vendidos" },
    { id: "ganancia", label: "Ganancia bruta" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Date range + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <DateRangePicker value={rango} onChange={setRango} />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="download">Exportar CSV</Button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "ventas" && <VentasReport data={M.ventas7dias} />}
      {tab === "top" && <TopProductosReport data={M.topProductos} />}
      {tab === "ganancia" && <GananciaReport />}
    </div>
  );
}

function DateRangePicker({ value, onChange }) {
  const ranges = ["Hoy", "Últimos 7 días", "Últimos 30 días", "Este mes", "Mes anterior", "Personalizado"];
  return (
    <div style={{ position: "relative" }}>
      <Select value={value} onChange={e => onChange(e.target.value)} options={ranges} />
      <Icon name="calendar" size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-muted)", pointerEvents: "none" }} />
      <style>{`select { padding-left: 34px !important; }`}</style>
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: "transparent", border: "none",
            padding: "10px 16px",
            font: `${active === t.id ? 600 : 500} 13px var(--font-sans)`,
            color: active === t.id ? "var(--ink-100)" : "var(--fg-muted)",
            borderBottom: `2px solid ${active === t.id ? "var(--ink-100)" : "transparent"}`,
            marginBottom: -1, cursor: "pointer",
            transition: "color 120ms",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function VentasReport({ data }) {
  const max = Math.max(...data.map(d => d.total));
  const total = data.reduce((a, b) => a + b.total, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Ventas por día" subtitle={`Total del período: ${fmtMoney(total)}`}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 220, paddingTop: 8 }}>
          {data.map((d, i) => {
            const h = (d.total / max) * 100;
            return (
              <div key={d.dia} style={{ flex: 1, alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(d.total)}</span>
                <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", height: `${h}%`, background: "var(--ink-100)", borderRadius: 4 }} />
                </div>
                <span style={{ font: "500 11px var(--font-sans)", color: "var(--fg-muted)" }}>{d.dia}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Día</Th>
              <Th align="right">Transacciones</Th>
              <Th align="right">Ticket promedio</Th>
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.dia} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>{d.dia}</Td>
                <Td align="right">{Math.round(d.total / 70)}</Td>
                <Td align="right" mono>{fmtMoney(d.total / Math.round(d.total / 70))}</Td>
                <Td align="right" mono>{fmtMoney(d.total)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TopProductosReport({ data }) {
  const max = Math.max(...data.map(d => d.unidades));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Top productos por unidades vendidas">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.map(p => (
            <div key={p.nombre} style={{ display: "grid", gridTemplateColumns: "200px 1fr 100px", gap: 16, alignItems: "center" }}>
              <span style={{ font: "500 13px var(--font-sans)" }}>{p.nombre}</span>
              <div style={{ height: 18, background: "var(--ink-05)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(p.unidades / max) * 100}%`, height: "100%", background: "var(--ink-100)", borderRadius: 4 }} />
              </div>
              <span style={{ font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{p.unidades} und</span>
            </div>
          ))}
        </div>
      </Card>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th align="right">Unidades</Th>
              <Th align="right">Ingresos</Th>
              <Th align="right">% del total</Th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => {
              const totalIngresos = data.reduce((a, b) => a + b.ingresos, 0);
              return (
                <tr key={p.nombre} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>{p.nombre}</Td>
                  <Td align="right">{p.unidades}</Td>
                  <Td align="right" mono>{fmtMoney(p.ingresos)}</Td>
                  <Td align="right">{((p.ingresos / totalIngresos) * 100).toFixed(1)}%</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function GananciaReport() {
  const M = window.MOCK;
  const data = M.topProductos.map(p => {
    const prod = M.productos.find(x => x.nombre === p.nombre) || M.productos[0];
    const ganancia = (prod.venta - prod.compra) * p.unidades;
    return { ...p, compra: prod.compra, venta: prod.venta, ganancia };
  });
  const totalGanancia = data.reduce((a, b) => a + b.ganancia, 0);
  const totalIngresos = data.reduce((a, b) => a + b.ingresos, 0);
  const margen = (totalGanancia / totalIngresos) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <SimpleMetric label="Ingresos totales" value={fmtMoney(totalIngresos)} />
        <SimpleMetric label="Ganancia bruta" value={fmtMoney(totalGanancia)} accent />
        <SimpleMetric label="Margen promedio" value={`${margen.toFixed(1)}%`} />
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Producto</Th>
              <Th align="right">Compra</Th>
              <Th align="right">Venta</Th>
              <Th align="right">Unidades</Th>
              <Th align="right">Ganancia</Th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => (
              <tr key={p.nombre} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>{p.nombre}</Td>
                <Td align="right" mono>{fmtMoney(p.compra)}</Td>
                <Td align="right" mono>{fmtMoney(p.venta)}</Td>
                <Td align="right">{p.unidades}</Td>
                <Td align="right" mono>{fmtMoney(p.ganancia)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SimpleMetric({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? "var(--ink-100)" : "var(--paper)",
      color: accent ? "var(--paper)" : "var(--ink-100)",
      border: "1px solid " + (accent ? "var(--ink-100)" : "var(--border)"),
      borderRadius: 10, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{ font: "500 12px var(--font-sans)", color: accent ? "rgba(255,255,255,0.7)" : "var(--fg-muted)" }}>{label}</span>
      <span style={{ font: "600 26px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

window.ReportesScreen = ReportesScreen;
