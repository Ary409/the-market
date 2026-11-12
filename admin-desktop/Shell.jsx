// Shell — sidebar + topbar layout for the admin desktop UI kit.
// Depends on Icon, all primitives in components.jsx.

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: "layout-dashboard" },
  { id: "inventario",  label: "Inventario",  icon: "package" },
  { id: "compras",     label: "Compras",     icon: "shopping-cart" },
  { id: "proveedores", label: "Proveedores", icon: "truck" },
  { id: "reportes",    label: "Reportes",    icon: "bar-chart-3" },
  { id: "usuarios",    label: "Usuarios",    icon: "users" },
  { id: "caja",        label: "Caja",        icon: "wallet" },
];

function Shell({ active, onNav, onLogout, children, title, topbarAction }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ink-05)", fontFamily: "var(--font-sans)" }}>
      <Sidebar active={active} onNav={onNav} onLogout={onLogout} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar title={title} action={topbarAction} />
        <main style={{ padding: "24px 32px 48px", maxWidth: 1440, width: "100%", boxSizing: "border-box", margin: "0 auto", flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ active, onNav, onLogout }) {
  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: "var(--paper)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 18px 24px" }}>
        <div style={{ width: 28, height: 28, background: "var(--ink-100)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
            <path d="M5 19 V7 L12 14 L19 7 V19" />
          </svg>
        </div>
        <span style={{ font: "600 15px var(--font-sans)", letterSpacing: "-0.022em", color: "var(--ink-100)" }}>the market</span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 10px", flex: 1 }}>
        <div style={{ font: "600 10px var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-subtle)", padding: "12px 10px 6px" }}>
          Navegación
        </div>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.id} item={item} active={item.id === active} onClick={() => onNav(item.id)} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <Thumb initials={window.MOCK.user.initials} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 12px var(--font-sans)", color: "var(--ink-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{window.MOCK.user.name}</div>
          <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>{window.MOCK.user.role}</div>
        </div>
        <button
          onClick={onLogout}
          title="Salir"
          style={{ border: "none", background: "transparent", padding: 6, borderRadius: 6, cursor: "pointer", color: "var(--fg-muted)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-05)"; e.currentTarget.style.color = "var(--ink-100)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--fg-muted)"; }}
        >
          <Icon name="log-out" size={16} />
        </button>
      </div>
    </aside>
  );
}

function NavItem({ item, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? "var(--ink-100)" : hover ? "var(--ink-05)" : "transparent";
  const color = active ? "var(--paper)" : "var(--ink-80)";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 10px",
        background: bg, color, border: "none",
        borderRadius: 6, cursor: "pointer",
        font: "500 13px var(--font-sans)",
        textAlign: "left",
        transition: "background 120ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <Icon name={item.icon} size={16} />
      <span>{item.label}</span>
    </button>
  );
}

function Topbar({ title, action }) {
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 32px", borderBottom: "1px solid var(--border)",
      background: "var(--paper)",
    }}>
      <h1 style={{ margin: 0, font: "600 18px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>{title}</h1>
      {action}
    </header>
  );
}

Object.assign(window, { Shell, NAV_ITEMS });
