// Mobile primitives + icon set for The Market vendedor móvil.
// Tokens come from colors_and_type.css.

// ----- Inline Lucide icons (subset for mobile) -----
const M_ICONS = {
  "scan-barcode": <><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 7v10"/><path d="M11 7v10"/><path d="M15 7v10"/></>,
  "shopping-cart": <><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></>,
  "search":     <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  "plus":       <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  "minus":      <><path d="M5 12h14"/></>,
  "x":          <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  "check":      <><path d="M20 6 9 17l-5-5"/></>,
  "trash":      <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  "chevron-left": <><path d="m15 18-6-6 6-6"/></>,
  "chevron-right":<><path d="m9 18 6-6-6-6"/></>,
  "chevron-down": <><path d="m6 9 6 6 6-6"/></>,
  "eye":        <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  "eye-off":    <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>,
  "wifi":       <><path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><line x1="12" x2="12" y1="20" y2="20"/></>,
  "banknote":   <><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></>,
  "credit-card":<><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></>,
  "split":      <><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="m21 3-7 7"/><path d="m3 3 7 7"/><path d="M14 21h7v-5"/><path d="M3 21h7v-5"/><path d="m14 14 7 7"/><path d="m3 21 7-7"/></>,
  "receipt":    <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v2m0 8v2"/></>,
  "user":       <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  "log-out":    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
  "circle":     <circle cx="12" cy="12" r="10"/>,
  "bell":       <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  "alert-triangle":<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.4" fill="currentColor"/></>,
  "arrow-up":   <><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>,
  "arrow-down": <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
  "refresh":    <><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.74 1 6.36 2.64L21 8"/><path d="M21 3v5h-5"/></>,
  "package":    <><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></>,
  "calendar":   <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></>,
  "clock":      <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  "trend-up":   <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
  "layout-dashboard": <><rect width="7" height="9"  x="3"  y="3" rx="1"/><rect width="7" height="5"  x="14" y="3" rx="1"/><rect width="7" height="9"  x="14" y="12" rx="1"/><rect width="7" height="5"  x="3"  y="16" rx="1"/></>,
};

function MIcon({ name, size = 20, stroke = 1.75, color = "currentColor", style }) {
  const path = M_ICONS[name];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      {path}
    </svg>
  );
}

// ----- Mobile money fmt -----
function mFmt(n) {
  return "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ----- Mobile button -----
function MButton({ children, onClick, variant = "primary", size = "lg", icon, style, disabled, type = "button" }) {
  const sizes = {
    md: { height: 44, padding: "0 16px", fontSize: 14, radius: 10 },
    lg: { height: 52, padding: "0 20px", fontSize: 16, radius: 12 },
    xl: { height: 64, padding: "0 24px", fontSize: 18, radius: 14 },
  };
  const variants = {
    primary:   { bg: "var(--ink-100)", fg: "var(--paper)",   bd: "var(--ink-100)" },
    secondary: { bg: "var(--paper)",   fg: "var(--ink-100)", bd: "var(--border-strong)" },
    ghost:     { bg: "transparent",    fg: "var(--ink-80)",  bd: "transparent" },
    success:   { bg: "#15803D",        fg: "#fff",           bd: "#15803D" },
  };
  const s = sizes[size]; const v = variants[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
        height: s.height, padding: s.padding, borderRadius: s.radius,
        fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: s.fontSize, letterSpacing: "-0.005em",
        background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        WebkitTapHighlightColor: "transparent",
        transition: "transform 120ms cubic-bezier(0.16,1,0.3,1)",
        ...style,
      }}
      onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.985)"; }}
      onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {icon && <MIcon name={icon} size={size === "xl" ? 22 : 18} />}
      {children}
    </button>
  );
}

// ----- Mobile text field -----
function MField({ label, value, onChange, placeholder, type = "text", icon, suffix, help, error, autoFocus }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ font: "500 13px var(--font-sans)", color: "var(--fg)" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {icon && <MIcon name={icon} size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--fg-subtle)" }} />}
        <input
          type={type}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: "100%", boxSizing: "border-box",
            height: 48,
            padding: icon ? "0 16px 0 40px" : "0 16px",
            borderRadius: 10,
            border: `1px solid ${error ? "var(--danger)" : "var(--border-strong)"}`,
            background: "var(--paper)",
            font: "400 15px var(--font-sans)",
            color: "var(--fg)",
            outline: "none",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", font: "500 12px var(--font-sans)" }}>{suffix}</span>}
      </div>
      {error && <span style={{ font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
      {help && !error && <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>{help}</span>}
    </div>
  );
}

// ----- Mobile thumbnail -----
function MThumb({ initials, size = 40 }) {
  return (
    <span style={{
      width: size, height: size, background: "var(--ink-10)",
      borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
      font: `600 ${Math.round(size * 0.36)}px var(--font-sans)`,
      color: "var(--fg-muted)", flexShrink: 0,
    }}>{initials}</span>
  );
}

// ----- Bottom sheet -----
function BottomSheet({ open, onClose, children, height = "auto" }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 100,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        animation: "fade 200ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.42)" }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1,
          background: "var(--paper)",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: "8px 0 calc(34px + env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
          height,
          animation: "sheetUp 280ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 8px" }}>
          <div style={{ width: 36, height: 4, background: "var(--ink-15)", borderRadius: 2 }} />
        </div>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { MIcon, MButton, MField, MThumb, BottomSheet, mFmt });
