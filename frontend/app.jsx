// App — router principal con auth real via JWT

const SCREEN_TITLES = {
  dashboard:   "Dashboard",
  inventario:  "Inventario",
  clientes:    "Clientes",
  compras:     "Compras",
  proveedores: "Proveedores",
  reportes:    "Reportes",
  usuarios:    "Usuarios",
  caja:        "Caja",
  app_movil:   "App Móvil",
};

// Selector de apariencia. Vive en la barra superior porque es una preferencia
// del puesto de trabajo, no de un módulo concreto.
function SelectorTema() {
  const [abierto, setAbierto] = React.useState(false);
  const [tema,    setTema]    = React.useState(() => window.Tema.leer());

  function elegir(id) {
    window.Tema.aplicar(id);
    setTema(id);
    setAbierto(false);
  }

  // Cerrar al hacer clic fuera
  React.useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    document.addEventListener("click", cerrar);
    return () => document.removeEventListener("click", cerrar);
  }, [abierto]);

  const actual = window.Tema.TEMAS.find(t => t.id === tema) || window.Tema.TEMAS[0];

  return (
    <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setAbierto(v => !v)}
        title={`Apariencia: ${actual.nombre}`}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "transparent", border: "1px solid var(--border)",
          borderRadius: 6, padding: "5px 9px", cursor: "pointer", color: "var(--fg-muted)",
        }}
      >
        <span style={{
          width: 14, height: 14, borderRadius: 7, border: "1px solid var(--border-strong)",
          background: `linear-gradient(135deg, ${actual.muestra[0]} 50%, ${actual.muestra[1]} 50%)`,
          display: "inline-block", flexShrink: 0,
        }} />
        <span style={{ font: "500 12px var(--font-sans)" }}>{actual.nombre}</span>
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
          background: "var(--paper)", border: "1px solid var(--border-strong)",
          borderRadius: 10, padding: 6, minWidth: 210, boxShadow: "var(--shadow-xl)",
        }}>
          {window.Tema.TEMAS.map(t => (
            <button key={t.id} onClick={() => elegir(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 10px", borderRadius: 7, cursor: "pointer", textAlign: "left",
                border: "none", background: t.id === tema ? "var(--ink-05)" : "transparent",
              }}>
              <span style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: "1px solid var(--border-strong)",
                background: `linear-gradient(135deg, ${t.muestra[0]} 50%, ${t.muestra[1]} 50%)`,
              }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", font: "600 13px var(--font-sans)", color: "var(--fg)" }}>{t.nombre}</span>
                <span style={{ display: "block", font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>{t.descripcion}</span>
              </span>
              {t.id === tema && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopbarAction({ user }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <SelectorTema />
      <button
        style={{ position: "relative", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "var(--fg-muted)" }}
        title="Alertas de stock"
      >
        <Icon name="bell" size={16} />
      </button>
      <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)", background: "var(--ink-05)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)", textTransform: "capitalize" }}>
        {user ? user.rol : ""}
      </span>
    </div>
  );
}

// Screens that are not yet connected to the API show a placeholder
function ComingSoon({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ink-05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
          <Icon name="settings" size={26} />
        </div>
        <div style={{ font: "600 16px var(--font-sans)", color: "var(--ink-100)" }}>
          {title} — próximamente
        </div>
        <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", maxWidth: 340 }}>
          Este módulo se implementará en la siguiente fase del proyecto.
        </div>
      </div>
    </div>
  );
}

function App() {
  // Restaurar sesión desde localStorage
  const [user,   setUser]   = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [screen, setScreen] = React.useState("dashboard");

  function handleLogin(userData) {
    setUser(userData);
    setScreen("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (user.rol === "vendedor") {
    return <VendedorScreen user={user} onLogout={handleLogout} />;
  }

  // El admin también puede vender: POS a pantalla completa con botón de regreso
  if (screen === "vender") {
    return <VendedorScreen user={user} onLogout={handleLogout} onBack={() => setScreen("dashboard")} />;
  }

  // Detectar qué screens tienen componente real vs placeholder
  const screenMap = {
    dashboard:   () => <DashboardScreen />,
    inventario:  typeof InventarioScreen  !== "undefined" ? () => <InventarioScreen />  : () => <ComingSoon title="Inventario" />,
    clientes:    typeof ClientesScreen    !== "undefined" ? () => <ClientesScreen />    : () => <ComingSoon title="Clientes" />,
    compras:     typeof ComprasScreen     !== "undefined" ? () => <ComprasScreen />     : () => <ComingSoon title="Compras" />,
    proveedores: typeof ProveedoresScreen !== "undefined" ? () => <ProveedoresScreen /> : () => <ComingSoon title="Proveedores" />,
    reportes:    typeof ReportesScreen    !== "undefined" ? () => <ReportesScreen />    : () => <ComingSoon title="Reportes" />,
    usuarios:    typeof UsuariosScreen    !== "undefined" ? () => <UsuariosScreen />    : () => <ComingSoon title="Usuarios" />,
    caja:        typeof CajaScreen        !== "undefined" ? () => <CajaScreen />        : () => <ComingSoon title="Caja" />,
    app_movil:   typeof AppMovilScreen   !== "undefined" ? () => <AppMovilScreen />   : () => <ComingSoon title="App Móvil" />,
  };

  const ScreenComponent = screenMap[screen] || screenMap["dashboard"];

  return (
    <Shell
      active={screen}
      onNav={setScreen}
      onLogout={handleLogout}
      title={SCREEN_TITLES[screen]}
      topbarAction={<TopbarAction user={user} />}
      user={user}
    >
      <ScreenComponent />
    </Shell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
