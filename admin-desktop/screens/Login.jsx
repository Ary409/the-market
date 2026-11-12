// Login screen — centered form, logo, email + password + submit.

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState("ana@laesquina.com");
  const [pwd, setPwd] = React.useState("••••••••");
  const [showError, setShowError] = React.useState(false);
  const [showPwd, setShowPwd] = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.includes("@") || !pwd) {
      setShowError(true);
      return;
    }
    onLogin();
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "var(--font-sans)",
    }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "var(--ink-100)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M5 19 V7 L12 14 L19 7 V19" />
              </svg>
            </div>
            <span style={{ font: "600 22px var(--font-sans)", letterSpacing: "-0.022em", color: "var(--ink-100)" }}>the market</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, font: "600 22px var(--font-sans)", letterSpacing: "-0.022em", color: "var(--ink-100)" }}>Ingresa a tu cuenta</h1>
            <p style={{ margin: "6px 0 0", font: "400 14px var(--font-sans)", color: "var(--fg-muted)" }}>
              Continúa para administrar tu negocio
            </p>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setShowError(false); }}
            placeholder="tu@correo.com"
            error={showError ? " " : ""}
          />
          <div style={{ position: "relative" }}>
            <TextField
              label="Contraseña"
              type={showPwd ? "text" : "password"}
              value={pwd}
              onChange={e => { setPwd(e.target.value); setShowError(false); }}
              placeholder="Tu contraseña"
              error={showError ? "Email o contraseña incorrectos" : ""}
            />
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              style={{ position: "absolute", right: 10, top: 30, border: "none", background: "transparent", padding: 4, cursor: "pointer", color: "var(--fg-muted)" }}
              aria-label={showPwd ? "Ocultar" : "Mostrar"}
            >
              <Icon name={showPwd ? "eye-off" : "eye"} size={16} />
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "400 13px var(--font-sans)", color: "var(--fg)" }}>
              <input type="checkbox" defaultChecked style={{ width: 14, height: 14, accentColor: "var(--ink-100)" }} />
              Recordar sesión
            </label>
            <a href="#" onClick={e => e.preventDefault()} style={{ font: "500 13px var(--font-sans)", color: "var(--ink-80)", textDecoration: "none" }}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <Button type="submit" size="lg" style={{ width: "100%" }}>Ingresar</Button>

        <p style={{ margin: 0, textAlign: "center", font: "400 12px var(--font-sans)", color: "var(--fg-subtle)" }}>
          ¿Problemas para acceder? Contacta a tu administrador.
        </p>
      </form>
    </div>
  );
}

window.LoginScreen = LoginScreen;
