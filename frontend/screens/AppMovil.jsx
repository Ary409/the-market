// AppMovil.jsx — Configuración de app móvil con QR inteligente auto-detectado

const EXPO_GO_URL  = "exp://u.expo.dev/b8f400e6-a5df-4947-b75a-b0b3c38ac017?channel-name=preview";
const APK_URL      = "https://expo.dev/accounts/ary_21/projects/the-market-pos/builds/f80a25a0-d5ad-4417-8cd7-0730efb73fc3";
const QR_API       = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=";

// ── QR dibujado localmente ────────────────────────────────────────────────────
// El backend calcula la matriz (reportlab). NO se usa ningún servicio de
// internet: la tienda debe poder emparejar el teléfono solo con la red WiFi
// local, aunque no haya conexión a internet.

function QrLocal({ data, size = 160, color = "#000", fallbackUrl }) {
  const [matriz, setMatriz] = React.useState(null);
  const [error,  setError]  = React.useState(false);

  React.useEffect(() => {
    if (!data) return;
    setMatriz(null); setError(false);
    fetch(API.getApiUrl() + "/info/qr?data=" + encodeURIComponent(data))
      .then(r => r.json())
      .then(d => setMatriz(d))
      .catch(() => setError(true));
  }, [data]);

  if (error) {
    // Último recurso: servicio externo (solo si hay internet)
    return (
      <img src={"https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=" + encodeURIComponent(fallbackUrl || data)}
        alt="QR" width={size} height={size} style={{ borderRadius: 6, display: "block" }} />
    );
  }
  if (!matriz) {
    return <div style={{ width: size, height: size, background: "var(--ink-05)", borderRadius: 6 }} />;
  }

  const n = matriz.size;
  const celda = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges"
      style={{ display: "block", borderRadius: 6, background: "#fff" }}>
      {matriz.rows.map((fila, r) =>
        fila.split("").map((v, c) => v === "1"
          ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} />
          : null)
      )}
    </svg>
  );
}

function AppMovilScreen() {
  const [serverUrl, setServerUrl] = React.useState(null);
  const [loadingIp, setLoadingIp] = React.useState(true);

  // Auto-detectar la IP del servidor desde el propio backend
  React.useEffect(() => {
    fetch(API.getApiUrl() + "/info")
      .then(r => r.json())
      .then(d => {
        setServerUrl(d.server_url || API.getApiUrl());
        setLoadingIp(false);
      })
      .catch(() => {
        setServerUrl(API.getApiUrl());
        setLoadingIp(false);
      });
  }, []);

  // QR que contiene solo la URL del servidor — se escanea desde dentro de la app
  const setupUrl = serverUrl || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div>
        <h2 style={{ margin: 0, font: "600 20px var(--font-sans)", color: "var(--ink-100)", letterSpacing: "-0.02em" }}>
          App Móvil
        </h2>
        <p style={{ margin: "4px 0 0", font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>
          Instala la app en el celular del vendedor — solo escanea los códigos en orden
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* ── iOS ──────────────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--paper)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <span style={{ font: "600 15px var(--font-sans)", color: "var(--ink-100)" }}>iPhone / iPad</span>
          </div>

          {/* Paso 1 */}
          <PasoCard numero={1} titulo="Instala Expo Go" color="#000">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <img
                src={QR_API + encodeURIComponent("https://apps.apple.com/app/expo-go/id982107779")}
                alt="QR App Store" width="160" height="160"
                style={{ borderRadius: 8, display: "block" }}
              />
              <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", textAlign: "center" }}>
                Escanea para abrir el App Store
              </span>
              <a href="https://apps.apple.com/app/expo-go/id982107779" target="_blank"
                style={{ font: "500 12px var(--font-sans)", color: "var(--ink-100)", textDecoration: "underline" }}>
                O busca "Expo Go" en el App Store
              </a>
            </div>
          </PasoCard>

          {/* Paso 2 — Abrir la app */}
          <PasoCard numero={2} titulo="Abre la app con la cámara" color="#000">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                border: "2px solid var(--ink-100)", borderRadius: 12, padding: 6,
                background: "#fff", display: "inline-flex",
              }}>
                <img
                  src={QR_API + encodeURIComponent(EXPO_GO_URL)}
                  alt="QR Expo Go" width="160" height="160"
                  style={{ borderRadius: 6, display: "block" }}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ font: "600 12px var(--font-sans)", color: "var(--ink-100)" }}>
                  Escanea con la cámara del iPhone → abre Expo Go con la app
                </div>
                <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
                  Expo Go debe estar instalado del paso anterior
                </div>
              </div>
            </div>
          </PasoCard>

          {/* Paso 3 — Configurar servidor */}
          <PasoCard numero={3} titulo="Configura el servidor desde la app" color="#000">
            {loadingIp ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2"
                  style={{ animation: "spin 0.9s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{
                  border: "2px solid var(--ink-100)", borderRadius: 12, padding: 6,
                  background: "#fff", display: "inline-flex",
                }}>
                  <QrLocal data={setupUrl} size={150} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ font: "600 12px var(--font-sans)", color: "var(--ink-100)" }}>
                    Ya en la app → toca "Servidor 📶" → 📷 → escanea este QR
                  </div>
                  <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
                    Escanea <strong>desde dentro de la app</strong>, no con la cámara del teléfono
                  </div>
                  <div style={{ font: "400 10px var(--font-mono)", color: "var(--ink-100)", marginTop: 4 }}>
                    {serverUrl}
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px",
                  background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, width: "100%",
                }}>
                  <Icon name="wifi" size={14} color="#1D4ED8" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ font: "400 11px var(--font-sans)", color: "#1D4ED8", lineHeight: 1.4 }}>
                    iPhone y PC en la <strong>misma red WiFi</strong>
                  </span>
                </div>
              </div>
            )}
          </PasoCard>
        </div>

        {/* ── Android ──────────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--paper)", border: "1px solid var(--border)",
          borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: "#3DDC84", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.16-.65-.06-.83.22l-1.88 3.24A10.3 10.3 0 0 0 12 8c-1.53 0-2.96.33-4.27.91L5.85 5.67c-.18-.28-.54-.38-.83-.22-.3.16-.42.54-.26.85l1.84 3.18A9.6 9.6 0 0 0 2.4 15h19.2a9.6 9.6 0 0 0-4.0-5.52zM8.5 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
              </svg>
            </div>
            <span style={{ font: "600 15px var(--font-sans)", color: "var(--ink-100)" }}>Android</span>
          </div>

          {/* Paso único Android */}
          <PasoCard numero={1} titulo="Descarga e instala el APK" color="#3DDC84">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                border: "2px solid #3DDC84", borderRadius: 12, padding: 6,
                background: "#fff", display: "inline-flex",
              }}>
                <img
                  src={QR_API + encodeURIComponent(APK_URL)}
                  alt="QR APK" width="170" height="170"
                  style={{ borderRadius: 6, display: "block" }}
                />
              </div>
              <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", textAlign: "center" }}>
                Escanea para descargar el APK
              </span>
              <a href={APK_URL} target="_blank" style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, background: "#3DDC84", color: "#fff",
                font: "500 13px var(--font-sans)", textDecoration: "none", width: "100%",
                justifyContent: "center",
              }}>
                <Icon name="download" size={14} />
                Descargar APK
              </a>
            </div>
          </PasoCard>

          <PasoCard numero={2} titulo="Configura el servidor desde la app" color="#3DDC84">
            {loadingIp ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2"
                  style={{ animation: "spin 0.9s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{
                  border: "2px solid #3DDC84", borderRadius: 12, padding: 6,
                  background: "#fff", display: "inline-flex",
                }}>
                  <QrLocal data={setupUrl} size={160} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ font: "600 12px var(--font-sans)", color: "var(--ink-100)" }}>
                    Abre la app → pantalla de login → toca "Servidor" → 📷
                  </div>
                  <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>
                    Escanea este QR <strong>desde dentro de la app</strong>, no con la cámara
                  </div>
                  <div style={{ font: "400 11px var(--font-mono)", color: "var(--ink-100)", marginTop: 2 }}>
                    {serverUrl}
                  </div>
                </div>
              </div>
            )}
          </PasoCard>
        </div>
      </div>

      {/* ── Estado del sistema ───────────────────────────────────────────────── */}
      <div style={{
        background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 12,
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="wifi" size={16} color="var(--fg-muted)" />
          <div>
            <span style={{ font: "500 13px var(--font-sans)", color: "var(--ink-100)" }}>
              Servidor corriendo en{" "}
            </span>
            <span style={{ font: "500 13px var(--font-mono)", color: "var(--ink-100)" }}>
              {serverUrl || "..."}
            </span>
          </div>
        </div>
        <div style={{
          display: "flex", gap: 16, alignItems: "center",
          font: "400 12px var(--font-sans)", color: "var(--fg-muted)",
        }}>
          <span>
            <strong style={{ color: "var(--ink-100)" }}>iOS:</strong> Expo Go (gratis)
          </span>
          <span>
            <strong style={{ color: "var(--ink-100)" }}>Android:</strong> APK directo
          </span>
        </div>
      </div>

    </div>
  );
}

function PasoCard({ numero, titulo, color, children }) {
  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 10,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", background: "var(--ink-05)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%", background: color,
          color: "#fff", font: "700 11px var(--font-sans)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {numero}
        </div>
        <span style={{ font: "600 13px var(--font-sans)", color: "var(--ink-100)" }}>{titulo}</span>
      </div>
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

window.AppMovilScreen = AppMovilScreen;
