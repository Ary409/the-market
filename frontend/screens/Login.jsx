// Login screen — conectado al backend real

function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = React.useState("");
  const [pwd,      setPwd]      = React.useState("");
  const [showPwd,  setShowPwd]  = React.useState(false);
  const [error,    setError]    = React.useState("");
  const [loading,  setLoading]  = React.useState(false);
  const [serverOk, setServerOk] = React.useState(null); // null=checking, true=ok, false=offline

  // Verificar conexión al servidor al cargar y cada 8 segundos
  React.useEffect(() => {
    function checkServer() {
      fetch(API.getApiUrl() + "/")
        .then(r => setServerOk(r.ok))
        .catch(() => setServerOk(false));
    }
    checkServer();
    const t = setInterval(checkServer, 8000);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !pwd) { setError("Completa todos los campos"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await API.login(email, pwd);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user",  JSON.stringify({ nombre: data.nombre, rol: data.rol, id: data.user_id }));
      onLogin({ nombre: data.nombre, rol: data.rol, id: data.user_id });
    } catch (err) {
      if (err.message === "Failed to fetch" || err instanceof TypeError) {
        setError("No se puede conectar al servidor. Asegúrate de que el servidor esté iniciado y vuelve a intentarlo.");
        setServerOk(false);
      } else {
        setError(err.message || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
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
            onChange={e => { setEmail(e.target.value); setError(""); }}
            placeholder="tu@correo.com"
            autoFocus
          />

          <div style={{ position: "relative" }}>
            <TextField
              label="Contraseña"
              type={showPwd ? "text" : "password"}
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError(""); }}
              placeholder="Tu contraseña"
              error={error}
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
        </div>

        {/* Estado del servidor */}
        {serverOk === false && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8 }}>
            <Icon name="alert-triangle" size={16} style={{ color:"#B91C1C", flexShrink:0, marginTop:1 }} />
            <div>
              <div style={{ font:"600 13px var(--font-sans)", color:"#991B1B" }}>Servidor no disponible</div>
              <div style={{ font:"400 12px var(--font-sans)", color:"#B91C1C", marginTop:2 }}>
                El servidor no está corriendo. Ejecuta <strong>iniciar_servidor.vbs</strong> y espera unos segundos.
              </div>
            </div>
          </div>
        )}

        {/* Server URL */}
        <ServerConfig onUrlChange={() => setServerOk(null)} />

        <Button type="submit" size="lg" style={{ width: "100%" }} disabled={loading}>
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Ingresando…
            </span>
          ) : "Ingresar"}
        </Button>

        <p style={{ margin: 0, textAlign: "center", font: "400 12px var(--font-sans)", color: "var(--fg-subtle)" }}>
          ¿Problemas para acceder? Contacta a tu administrador.
        </p>
      </form>
    </div>
  );
}

function ServerConfig({ onUrlChange }) {
  const [open,  setOpen]  = React.useState(false);
  const [url,   setUrl]   = React.useState(API.getApiUrl());
  const [saved, setSaved] = React.useState(false);

  function save() {
    API.setApiUrl(url.replace(/\/$/, ""));
    setSaved(true);
    if (onUrlChange) onUrlChange();
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: "none", cursor: "pointer", font: "400 12px var(--font-sans)", color: "var(--fg-subtle)", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
      >
        <Icon name="settings" size={12} />
        Servidor: {API.getApiUrl()}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="http://localhost:8000"
              style={{
                flex: 1, height: 32, padding: "0 10px", borderRadius: 6,
                border: "1px solid var(--border-strong)", font: "400 12px var(--font-mono)",
                color: "var(--fg)", background: "var(--paper)", outline: "none",
              }}
            />
            <Button size="sm" onClick={save} variant={saved ? "secondary" : "primary"}>
              {saved ? "Guardado" : "Guardar"}
            </Button>
          </div>
          <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>
            Para uso en red local, escribe la IP de la PC. Ej: http://192.168.0.3:8000
          </span>
        </div>
      )}
    </div>
  );
}

window.LoginScreen = LoginScreen;
