// Scanner — camera viewfinder + barcode detection + product confirmation.

function Scanner({ onClose, onAdd }) {
  // Phases: "scanning" -> "detected"
  const [phase, setPhase] = React.useState("scanning");
  const [product, setProduct] = React.useState(null);

  // Simulate detection after a short delay
  React.useEffect(() => {
    if (phase === "scanning") {
      const t = setTimeout(() => {
        const candidate = window.M.productos[0]; // Coca-Cola
        setProduct(candidate);
        setPhase("detected");
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  function rescan() {
    setProduct(null);
    setPhase("scanning");
  }

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#0A0A0A",
      display: "flex", flexDirection: "column",
      color: "#fff", fontFamily: "var(--font-sans)",
      overflow: "hidden",
    }}>
      {/* Camera "view" — mock with dark gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(120% 100% at 50% 40%, #2A2A2A 0%, #0A0A0A 60%, #000 100%)",
      }}>
        {/* moving scan line */}
        {phase === "scanning" && (
          <div style={{
            position: "absolute", left: "10%", right: "10%", top: "44%",
            height: 2, background: "linear-gradient(to right, transparent, #fff, transparent)",
            boxShadow: "0 0 12px rgba(255,255,255,0.5)",
            animation: "scan 1.4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate",
          }} />
        )}
      </div>

      {/* Top bar */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "calc(env(safe-area-inset-top) + 56px) 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={onClose} aria-label="Cerrar" style={{
          width: 40, height: 40, borderRadius: 20,
          background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.18)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        }}>
          <MIcon name="x" size={18} />
        </button>
        <div style={{ font: "600 14px var(--font-sans)", color: "rgba(255,255,255,0.95)" }}>
          Escanear código
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Viewfinder */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <Viewfinder />
      </div>

      {/* Bottom hint or detected card */}
      <div style={{
        position: "relative", zIndex: 2,
        padding: "16px 16px calc(34px + env(safe-area-inset-bottom))",
      }}>
        {phase === "scanning" ? (
          <SearchingHint />
        ) : (
          <DetectedCard
            product={product}
            onAdd={() => onAdd(product)}
            onRescan={rescan}
          />
        )}
      </div>

      <style>{`
        @keyframes scan {
          from { top: 30%; }
          to { top: 60%; }
        }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

function Viewfinder() {
  const size = 240; const corner = 32; const thickness = 3;
  return (
    <div style={{
      width: size, height: size * 0.7,
      position: "relative",
    }}>
      {/* corners */}
      {[
        { top: 0, left: 0, borderTop: thickness, borderLeft: thickness },
        { top: 0, right: 0, borderTop: thickness, borderRight: thickness },
        { bottom: 0, left: 0, borderBottom: thickness, borderLeft: thickness },
        { bottom: 0, right: 0, borderBottom: thickness, borderRight: thickness },
      ].map((s, i) => (
        <div key={i} style={{
          position: "absolute", width: corner, height: corner,
          borderColor: "#fff",
          borderTopWidth: s.borderTop || 0,
          borderRightWidth: s.borderRight || 0,
          borderBottomWidth: s.borderBottom || 0,
          borderLeftWidth: s.borderLeft || 0,
          borderStyle: "solid",
          borderRadius: 8,
          ...(s.top !== undefined ? { top: s.top } : {}),
          ...(s.bottom !== undefined ? { bottom: s.bottom } : {}),
          ...(s.left !== undefined ? { left: s.left } : {}),
          ...(s.right !== undefined ? { right: s.right } : {}),
        }} />
      ))}
    </div>
  );
}

function SearchingHint() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      padding: "14px 18px", borderRadius: 12,
      background: "rgba(0,0,0,0.55)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    }}>
      <Spinner />
      <span style={{ font: "500 14px var(--font-sans)" }}>Buscando código...</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 999,
      border: "2px solid rgba(255,255,255,0.2)",
      borderTopColor: "rgba(255,255,255,0.95)",
      animation: "spin 0.8s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DetectedCard({ product, onAdd, onRescan }) {
  return (
    <div style={{
      background: "var(--paper)", color: "var(--ink-100)",
      borderRadius: 16, padding: 16,
      display: "flex", flexDirection: "column", gap: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      animation: "popIn 220ms cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <MThumb initials={product.thumb} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", background: "#ECFDF3", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 999, font: "600 10px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <MIcon name="check" size={10} stroke={2.5} />Encontrado
          </div>
          <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em", marginTop: 6 }}>{product.nombre}</div>
          <div style={{ font: "400 12px var(--font-mono)", color: "var(--fg-muted)", marginTop: 2 }}>{product.codigo}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ font: "600 20px var(--font-sans)", letterSpacing: "-0.011em", fontVariantNumeric: "tabular-nums" }}>{mFmt(product.precio)}</div>
          <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>Stock: {product.stock}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <MButton variant="secondary" size="lg" onClick={onRescan} style={{ flex: 1 }}>Otra vez</MButton>
        <MButton size="lg" icon="plus" onClick={onAdd} style={{ flex: 2 }}>Agregar al carrito</MButton>
      </div>
    </div>
  );
}

window.Scanner = Scanner;
