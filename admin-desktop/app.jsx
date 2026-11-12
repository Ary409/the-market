// Main router for The Market admin desktop UI kit.

const SCREEN_TITLES = {
  dashboard:   "Dashboard",
  inventario:  "Inventario",
  compras:     "Compras",
  proveedores: "Proveedores",
  reportes:    "Reportes",
  usuarios:    "Usuarios",
  caja:        "Caja",
};

function TopbarAction({ screen }) {
  // (Right side actions are screen-managed via toolbar rows; we leave the topbar minimal.)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button style={{ position: "relative", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--fg-muted)" }} title="Alertas">
        <Icon name="bell" size={16} />
        <span style={{
          position: "absolute", top: 4, right: 4,
          width: 7, height: 7, borderRadius: 999, background: "var(--danger)",
          border: "1.5px solid var(--paper)",
        }} />
      </button>
      <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
        {window.MOCK.business.name}
      </span>
    </div>
  );
}

function App() {
  // null = login screen, otherwise screen id
  const [screen, setScreen] = React.useState(null);

  if (screen === null) {
    return <LoginScreen onLogin={() => setScreen("dashboard")} />;
  }

  const ScreenComponent = {
    dashboard:   DashboardScreen,
    inventario:  InventarioScreen,
    compras:     ComprasScreen,
    proveedores: ProveedoresScreen,
    reportes:    ReportesScreen,
    usuarios:    UsuariosScreen,
    caja:        CajaScreen,
  }[screen];

  return (
    <Shell
      active={screen}
      onNav={setScreen}
      onLogout={() => setScreen(null)}
      title={SCREEN_TITLES[screen]}
      topbarAction={<TopbarAction screen={screen} />}
    >
      <ScreenComponent />
    </Shell>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
