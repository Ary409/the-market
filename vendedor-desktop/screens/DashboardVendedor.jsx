// Dashboard vendedor — versión simplificada para el cajero.

function DashboardVendedor({ onGoPOS }) {
  const M = window.MOCK;
  const r = M.resumenVendedor;
  const caja = M.cajaActual;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Greeting + quick POS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 style={{ margin: "4px 0 0", font: "600 26px var(--font-sans)", letterSpacing: "-0.022em" }}>
            Hola, {M.user.name.split(" ")[0]}
          </h1>
        </div>
        <Button size="lg" icon="shopping-cart" onClick={onGoPOS}>Abrir punto de venta</Button>
      </div>

      {/* Metric row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <SimpleMetric label="Mis ventas hoy" value={r.ventas} />
        <SimpleMetric label="Ingresos generados" value={fmtMoney(r.ingresos)} />
        <SimpleMetric label="Ticket promedio" value={fmtMoney(r.ticketPromedio)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Recent sales */}
        <Card
          title="Mis ventas de hoy"
          subtitle={`${M.misVentasHoy.length} ventas registradas`}
          noPadding
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Recibo</Th>
                <Th>Hora</Th>
                <Th>Items</Th>
                <Th>Método</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {M.misVentasHoy.map(v => (
                <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>{v.id}</span></Td>
                  <Td>{v.hora}</Td>
                  <Td>{v.items}</Td>
                  <Td>{v.metodo}</Td>
                  <Td align="right" mono>{fmtMoney(v.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Caja + breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Estado de la caja">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Estado" value={
                <Badge variant={caja.estado === "abierta" ? "success" : "neutral"} dot>
                  {caja.estado === "abierta" ? "Abierta" : "Cerrada"}
                </Badge>
              } />
              <Row label="Apertura" value={caja.horaApertura} />
              <Row label="Monto inicial" value={fmtMoney(caja.montoInicial)} mono />
            </div>
          </Card>
          <Card title="Métodos de pago">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Efectivo" value={fmtMoney(r.efectivo)} mono />
              <Row label="Tarjeta" value={fmtMoney(r.tarjeta)} mono />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SimpleMetric({ label, value }) {
  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ font: "600 26px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{
        font: "600 13px var(--font-sans)", color: "var(--ink-100)",
        fontVariantNumeric: mono ? "tabular-nums" : "normal",
      }}>{value}</span>
    </div>
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
    padding: "11px 16px",
    font: `${mono ? 600 : 400} 13px var(--font-sans)`,
    color: "var(--ink-100)", textAlign: align,
    fontVariantNumeric: mono ? "tabular-nums" : "normal",
  }}>{children}</td>;
}

Object.assign(window, { DashboardVendedor, Th, Td });
