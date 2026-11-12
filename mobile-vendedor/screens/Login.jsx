// Mobile Login — IP del servidor + email + password.

function LoginMobile({ onLogin }) {
  const [ip, setIp] = React.useState("192.168.1.42");
  const [email, setEmail] = React.useState("luis@laesquina.com");
  const [pwd, setPwd] = React.useState("••••••••");
  const [showPwd, setShowPwd] = React.useState(false);
  const [err, setErr] = React.useState(false);

  function submit(e) {
    e?.preventDefault();
    if (!ip || !email || !pwd) { setErr(true); return; }
    onLogin();
  }

  return (
    <form onSubmit={submit} style={{
      display: "flex", flexDirection: "column",
      padding: "32px 24px 0", gap: 28,
      minHeight: "100%", boxSizing: "border-box",
      background: "var(--paper)",
      fontFamily: "var(--font-sans)",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, background: "var(--ink-100)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M5 19 V7 L12 14 L19 7 V19" />
            </svg>
          </div>
          <span style={{ font: "600 24px var(--font-sans)", letterSpacing: "-0.022em", color: "var(--ink-100)" }}>the market</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, font: "600 20px var(--font-sans)", letterSpacing: "-0.022em" }}>Conecta tu equipo</h1>
          <p style={{ margin: "6px 0 0", font: "400 14px var(--font-sans)", color: "var(--fg-muted)" }}>
            Ingresa la IP de la PC del negocio para conectarte
          </p>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MField
          label="IP del servidor"
          value={ip}
          onChange={e => { setIp(e.target.value); setErr(false); }}
          placeholder="192.168.1.10"
          icon="wifi"
          help="Pídela al administrador de la tienda"
        />
        <MField
          label="Email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErr(false); }}
          type="email"
          placeholder="tu@correo.com"
        />
        <div style={{ position: "relative" }}>
          <MField
            label="Contraseña"
            value={pwd}
            onChange={e => { setPwd(e.target.value); setErr(false); }}
            type={showPwd ? "text" : "password"}
            placeholder="Tu contraseña"
            error={err ? "Verifica tus datos" : ""}
          />
          <button
            type="button"
            onClick={() => setShowPwd(s => !s)}
            style={{ position: "absolute", right: 8, top: 30, height: 42, width: 42, border: "none", background: "transparent", cursor: "pointer", color: "var(--fg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Mostrar/ocultar"
          >
            <MIcon name={showPwd ? "eye-off" : "eye"} size={18} />
          </button>
        </div>
      </div>

      <MButton type="submit" size="lg" style={{ width: "100%" }}>Ingresar</MButton>

      <div style={{ flex: 1 }} />
      <p style={{ textAlign: "center", margin: "0 0 16px", font: "400 12px var(--font-sans)", color: "var(--fg-subtle)" }}>
        v1.0 · The Market POS
      </p>
    </form>
  );
}

window.LoginMobile = LoginMobile;
