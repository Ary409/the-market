// Caja — current cash register status, open/close, history of sessions.

function CajaScreen() {
  const [estado, setEstado] = React.useState("abierta"); // "abierta" | "cerrada"
  const [showOpen, setShowOpen] = React.useState(false);
  const M = window.MOCK;
  const caja = M.cajaActual;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Current state hero */}
      {estado === "abierta" ? (
        <CajaAbierta caja={caja} onClose={() => setEstado("cerrada")} />
      ) : (
        <CajaCerrada onOpen={() => setShowOpen(true)} />
      )}

      {/* Historial */}
      <Card title="Historial de sesiones" subtitle="Últimas sesiones de caja" noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Sesión</Th>
              <Th>Fecha</Th>
              <Th>Apertura</Th>
              <Th>Cierre</Th>
              <Th>Vendedor</Th>
              <Th align="right">Monto inicial</Th>
              <Th align="right">Monto final</Th>
              <Th align="right">Diferencia</Th>
            </tr>
          </thead>
          <tbody>
            {M.sesionesCaja.map(s => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.id}</span></Td>
                <Td>{s.fecha}</Td>
                <Td>{s.apertura}</Td>
                <Td>{s.cierre}</Td>
                <Td>{s.vendedor}</Td>
                <Td align="right" mono>{fmtMoney(s.inicial)}</Td>
                <Td align="right" mono>{fmtMoney(s.final)}</Td>
                <Td align="right" mono><span style={{ color: "var(--success)" }}>+{fmtMoney(s.final - s.inicial)}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <AbrirCajaModal open={showOpen} onClose={() => setShowOpen(false)} onOpen={() => { setShowOpen(false); setEstado("abierta"); }} />
    </div>
  );
}

function CajaAbierta({ caja, onClose }) {
  return (
    <Card style={{ borderColor: "var(--success-bd)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, background: "var(--success-bg)", border: "1px solid var(--success-bd)",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)",
        }}>
          <Icon name="wallet" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, font: "600 18px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>Caja abierta</h2>
            <Badge variant="success" dot>Activa</Badge>
          </div>
          <p style={{ margin: "4px 0 0", font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>
            Abierta por <b style={{ color: "var(--fg)" }}>{caja.abiertaPor}</b> a las {caja.horaApertura}
          </p>
        </div>
        <Button variant="secondary-danger" onClick={onClose}>Cerrar caja</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
        <CajaStat label="Monto inicial" value={fmtMoney(caja.montoInicial)} muted />
        <CajaStat label="Ventas en efectivo" value={fmtMoney(caja.ventasEfectivo)} />
        <CajaStat label="Ventas con tarjeta" value={fmtMoney(caja.ventasTarjeta)} />
        <CajaStat label="Total en caja" value={fmtMoney(caja.montoInicial + caja.ventasEfectivo)} accent />
      </div>
    </Card>
  );
}

function CajaCerrada({ onOpen }) {
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", textAlign: "center", gap: 4 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--ink-05)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", marginBottom: 12 }}>
          <Icon name="wallet" size={26} />
        </div>
        <div style={{ font: "600 18px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>Caja cerrada</div>
        <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", maxWidth: 360 }}>
          Abre la caja para empezar a registrar ventas. Necesitarás ingresar el monto inicial en efectivo.
        </div>
        <div style={{ marginTop: 16 }}>
          <Button size="lg" onClick={onOpen}>Abrir caja</Button>
        </div>
      </div>
    </Card>
  );
}

function CajaStat({ label, value, muted, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)" }}>{label}</span>
      <span style={{
        font: `600 ${accent ? 22 : 18}px var(--font-sans)`,
        letterSpacing: "-0.011em",
        color: muted ? "var(--fg-muted)" : "var(--ink-100)",
        fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
    </div>
  );
}

function AbrirCajaModal({ open, onClose, onOpen }) {
  const [monto, setMonto] = React.useState("500");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir caja"
      subtitle="Ingresa el monto inicial en efectivo"
      width={440}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onOpen}>Abrir caja</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField
          label="Monto inicial"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          prefix="$"
          autoFocus
          help="Esta cantidad se descontará al hacer el corte de caja."
        />
        <div style={{ padding: "12px 14px", background: "var(--ink-05)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="alert-triangle" size={16} style={{ color: "var(--warning)", marginTop: 1 }} />
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", lineHeight: 1.5 }}>
            Solo se puede abrir una caja a la vez. Esta sesión quedará registrada con tu nombre.
          </span>
        </div>
      </div>
    </Modal>
  );
}

window.CajaScreen = CajaScreen;
