// Mobile Admin app — bottom tab navigation.

const TABS = [
  { id: "dashboard", label: "Inicio",    icon: "layout-dashboard" },
  { id: "alertas",   label: "Alertas",   icon: "bell" },
  { id: "consulta",  label: "Consulta",  icon: "scan-barcode" },
  { id: "historial", label: "Historial", icon: "receipt" },
];

function MobileAdmin() {
  const [tab, setTab] = React.useState("dashboard");
  const [scannerActive, setScannerActive] = React.useState(false);
  // Status bar goes dark only while the scanner camera is actually visible
  const dark = scannerActive;

  // When user navigates to consulta (scan), reset its phase so the camera shows again
  const [scanKey, setScanKey] = React.useState(0);
  React.useEffect(() => {
    if (tab === "consulta") setScanKey(k => k + 1);
    else setScannerActive(false);
  }, [tab]);

  const totalAlerts = window.M.resumenHoy.productosBajos + window.M.resumenHoy.porVencer;

  return (
    <IOSDevice width={402} height={874} dark={dark}>
      <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden", background: "var(--paper)" }}>
        {/* Screen area — leave room for status bar (top) and tab bar (bottom) */}
        <div style={{ position: "absolute", top: 56, bottom: 84, left: 0, right: 0, overflow: "hidden" }}>
          {tab === "dashboard" && (
            <DashboardMobile
              onGoAlerts={() => setTab("alertas")}
              onGoScan={() => setTab("consulta")}
              onGoHistory={() => setTab("historial")}
            />
          )}
          {tab === "alertas"   && <Alertas onBack={() => setTab("dashboard")} />}
          {tab === "consulta"  && <ConsultaRapida key={scanKey} onBack={() => setTab("dashboard")} onPhaseChange={p => setScannerActive(p === "scan")} />}
          {tab === "historial" && <Historial onBack={() => setTab("dashboard")} />}
        </div>

        {/* Tab bar */}
        <TabBar tab={tab} onTab={setTab} totalAlerts={totalAlerts} dark={dark} />
      </div>
    </IOSDevice>
  );
}

function TabBar({ tab, onTab, totalAlerts, dark }) {
  return (
    <nav style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: 28,
      background: dark ? "rgba(10,10,10,0.85)" : "rgba(255,255,255,0.95)",
      borderTop: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "var(--border)"}`,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      display: "flex", justifyContent: "space-around",
    }}>
      {TABS.map(t => {
        const active = t.id === tab;
        const color = active
          ? (dark ? "#fff" : "var(--ink-100)")
          : (dark ? "rgba(255,255,255,0.55)" : "var(--fg-muted)");
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            style={{
              flex: 1, padding: "8px 0 4px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "transparent", border: "none", cursor: "pointer",
              color, position: "relative",
            }}
          >
            <div style={{ position: "relative" }}>
              <MIcon name={t.icon} size={22} stroke={active ? 2 : 1.6} />
              {t.id === "alertas" && totalAlerts > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -7,
                  minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 999, background: "var(--danger)", color: "#fff",
                  font: "600 9px var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid var(--paper)",
                }}>{totalAlerts}</span>
              )}
            </div>
            <span style={{ font: `${active ? 600 : 500} 10px var(--font-sans)`, letterSpacing: "0.01em" }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--ink-05)",
      padding: 24, boxSizing: "border-box",
    }}>
      <MobileAdmin />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
