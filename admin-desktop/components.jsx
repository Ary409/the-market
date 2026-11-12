// Shared primitives for The Market admin desktop UI kit.
// Depends on Icon (window.Icon).

// ----- Button -----
function Button({ variant = "primary", size = "md", icon, children, onClick, type = "button", disabled, className = "", style }) {
  const sizes = { sm: { height: 30, padding: "0 12px", fontSize: 12 }, md: { height: 36, padding: "0 14px", fontSize: 13 }, lg: { height: 44, padding: "0 20px", fontSize: 14 } };
  const variants = {
    primary:   { background: "var(--ink-100)", color: "var(--paper)", border: "1px solid var(--ink-100)" },
    secondary: { background: "var(--paper)",   color: "var(--ink-100)", border: "1px solid var(--border-strong)" },
    ghost:     { background: "transparent",    color: "var(--ink-80)", border: "1px solid transparent" },
    danger:    { background: "var(--danger)",  color: "var(--paper)", border: "1px solid var(--danger)" },
    "secondary-danger": { background: "var(--paper)", color: "var(--danger)", border: "1px solid var(--danger-bd)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tm-btn ${variant} ${className}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        borderRadius: 6, fontFamily: "var(--font-sans)", fontWeight: 600, letterSpacing: "-0.005em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 120ms cubic-bezier(0.16,1,0.3,1)",
        whiteSpace: "nowrap",
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

// ----- Input / TextField -----
function TextField({ label, value, onChange, placeholder, type = "text", icon, error, help, suffix, prefix, autoFocus, disabled, style, className }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }} className={className}>
      {label && <label style={{ font: "500 12px var(--font-sans)", color: "var(--fg)" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {icon && <Icon name={icon} size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-subtle)" }} />}
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-subtle)", font: "400 13px var(--font-sans)" }}>{prefix}</span>}
        <input
          type={type}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          style={{
            height: 36, width: "100%", boxSizing: "border-box",
            padding: icon ? "0 12px 0 32px" : prefix ? "0 12px 0 24px" : "0 12px",
            borderRadius: 6,
            border: `1px solid ${error ? "var(--danger)" : "var(--border-strong)"}`,
            background: disabled ? "var(--ink-05)" : "var(--paper)",
            font: "400 13px var(--font-sans)",
            color: disabled ? "var(--fg-muted)" : "var(--fg)",
            cursor: disabled ? "not-allowed" : "text",
            outline: "none",
          }}
          onFocus={e => { e.target.style.borderColor = error ? "var(--danger)" : "var(--ink-100)"; e.target.style.boxShadow = "0 0 0 2px var(--focus-ring)"; }}
          onBlur={e => { e.target.style.borderColor = error ? "var(--danger)" : "var(--border-strong)"; e.target.style.boxShadow = "none"; }}
        />
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", font: "400 12px var(--font-mono)" }}>{suffix}</span>}
      </div>
      {error && <span style={{ font: "400 11px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
      {help && !error && <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>{help}</span>}
    </div>
  );
}

// ----- Select -----
function Select({ label, value, onChange, options, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && <label style={{ font: "500 12px var(--font-sans)", color: "var(--fg)" }}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          height: 36, padding: "0 32px 0 12px",
          borderRadius: 6,
          border: "1px solid var(--border-strong)",
          background: `var(--paper) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23525252' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>") no-repeat right 10px center / 14px`,
          font: "400 13px var(--font-sans)",
          color: "var(--fg)",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map(opt => typeof opt === "string"
          ? <option key={opt} value={opt}>{opt}</option>
          : <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

// ----- Badge -----
const BADGE_VARIANTS = {
  success: { bg: "#ECFDF3", bd: "#BBF7D0", fg: "#15803D", dot: "#16A34A" },
  warning: { bg: "#FEF3C7", bd: "#FDE68A", fg: "#92400E", dot: "#B45309" },
  danger:  { bg: "#FEF2F2", bd: "#FECACA", fg: "#991B1B", dot: "#B91C1C" },
  info:    { bg: "#EFF6FF", bd: "#BFDBFE", fg: "#1E40AF", dot: "#1D4ED8" },
  neutral: { bg: "#F7F7F7", bd: "#E5E5E5", fg: "#525252", dot: "#8A8A8A" },
};

function Badge({ variant = "neutral", dot = false, children, style }) {
  const v = BADGE_VARIANTS[variant];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "2px 8px", borderRadius: 999,
      font: "600 11px var(--font-sans)",
      border: `1px solid ${v.bd}`, background: v.bg, color: v.fg,
      whiteSpace: "nowrap",
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: v.dot }} />}
      {children}
    </span>
  );
}

// ----- Card -----
function Card({ title, subtitle, action, padding = 20, children, style, bodyStyle, noPadding }) {
  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      ...style,
    }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div>
            {title && <div style={{ font: "600 14px var(--font-sans)", letterSpacing: "-0.005em", color: "var(--ink-100)" }}>{title}</div>}
            {subtitle && <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : padding, ...bodyStyle }}>{children}</div>
    </div>
  );
}

// ----- Thumb -----
function Thumb({ initials, size = 32 }) {
  return (
    <span style={{
      width: size, height: size, background: "var(--ink-10)",
      borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
      font: `600 ${Math.round(size * 0.36)}px var(--font-sans)`, color: "var(--fg-muted)",
      letterSpacing: "-0.01em", flexShrink: 0,
    }}>{initials}</span>
  );
}

// ----- Modal -----
function Modal({ open, onClose, title, subtitle, children, footer, width = 560 }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(10,10,10,0.48)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fade 180ms cubic-bezier(0.16,1,0.3,1)",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: "calc(100vw - 48px)", maxHeight: "calc(100vh - 64px)",
          background: "var(--paper)", borderRadius: 12,
          boxShadow: "var(--shadow-xl)",
          display: "flex", flexDirection: "column",
          animation: "slideUp 220ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em", color: "var(--ink-100)" }}>{title}</div>
            {subtitle && <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", padding: 4, cursor: "pointer", color: "var(--fg-muted)", borderRadius: 6 }} aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ padding: 24, overflow: "auto", flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--ink-05)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Empty state -----
function EmptyState({ icon = "package", title, body, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", textAlign: "center", gap: 4 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--ink-05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", marginBottom: 8 }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ font: "600 15px var(--font-sans)", color: "var(--ink-100)" }}>{title}</div>
      {body && <div style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", maxWidth: 360 }}>{body}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ----- Money -----
function fmtMoney(n) {
  return "L " + Number(n).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

Object.assign(window, { Button, TextField, Select, Badge, Card, Thumb, Modal, EmptyState, fmtMoney });
