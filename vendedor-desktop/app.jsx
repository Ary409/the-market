// Vendedor Desktop router.

function App() {
  const [screen, setScreen] = React.useState("dashboard");
  const [confirmacion, setConfirmacion] = React.useState(null);

  function handleSaleComplete(sale) {
    setConfirmacion(sale);
  }

  const TITLES = {
    dashboard:  "Inicio",
    pos:        "Punto de venta",
    inventario: "Inventario",
    ventas:     "Mis ventas",
  };

  const Screen = {
    dashboard:  () => <DashboardVendedor onGoPOS={() => setScreen("pos")} />,
    pos:        () => <POSDesktop onComplete={handleSaleComplete} />,
    inventario: () => <ConsultaInventario />,
    ventas:     () => <MisVentas />,
  }[screen];

  return (
    <>
      <Shell
        active={screen}
        onNav={setScreen}
        onLogout={() => { /* prototype: no-op */ }}
        title={TITLES[screen]}
        fullBleed={screen === "pos"}
        topbarAction={
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
            {window.MOCK.business.name}
          </span>
        }
      >
        <Screen />
      </Shell>
      <ConfirmacionVenta
        open={!!confirmacion}
        sale={confirmacion}
        onNueva={() => setConfirmacion(null)}
      />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
