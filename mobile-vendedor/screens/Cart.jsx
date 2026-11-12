// Cart Mobile — full list with swipe-to-delete and qty editing.

function CartMobile({ cart, onClose, onUpdateQty, onRemove, onCobrar }) {
  const [openItem, setOpenItem] = React.useState(null); // id of item currently swiped open
  const total = cart.reduce((a, b) => a + b.precio * b.qty, 0);
  const itemCount = cart.reduce((a, b) => a + b.qty, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 12px 12px", borderBottom: "1px solid var(--border)",
      }}>
        <button onClick={onClose} aria-label="Atrás" style={{ background: "transparent", border: "none", padding: 8, color: "var(--ink-100)", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <MIcon name="chevron-left" size={22} />
        </button>
        <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em" }}>Carrito</div>
        <span style={{ font: "500 12px var(--font-sans)", color: "var(--fg-muted)", marginRight: 12 }}>{itemCount} items</span>
      </header>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ font: "500 11px var(--font-sans)", color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase", padding: "2px 4px 4px" }}>
          Desliza un producto a la izquierda para eliminar
        </div>
        {cart.map(item => (
          <SwipeableLine
            key={item.id}
            item={item}
            isOpen={openItem === item.id}
            onOpen={() => setOpenItem(item.id)}
            onClose={() => setOpenItem(null)}
            onUpdateQty={q => onUpdateQty(item.id, q)}
            onRemove={() => onRemove(item.id)}
            initiallyOpen={cart.indexOf(item) === 0 && cart.length > 1 && openItem === null}
          />
        ))}
      </div>

      {/* Totals + Cobrar */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "14px 18px 14px", background: "var(--paper)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", font: "500 13px var(--font-sans)", color: "var(--fg-muted)" }}>
          <span>Subtotal</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{mFmt(total)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ font: "500 13px var(--font-sans)", color: "var(--fg-muted)" }}>Total</span>
          <span style={{ font: "600 28px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums", color: "var(--ink-100)" }}>{mFmt(total)}</span>
        </div>
        <MButton size="xl" onClick={onCobrar} style={{ width: "100%" }}>COBRAR</MButton>
      </div>
    </div>
  );
}

function SwipeableLine({ item, isOpen, onOpen, onClose, onUpdateQty, onRemove, initiallyOpen }) {
  const [swiped, setSwiped] = React.useState(initiallyOpen);
  const open = isOpen || swiped;
  const REVEAL = 80;

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
      {/* Delete background (revealed when swiped) */}
      <button
        onClick={onRemove}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: REVEAL,
          background: "var(--danger)", color: "#fff",
          border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
        }}
        aria-label="Eliminar"
      >
        <MIcon name="trash" size={18} />
        <span style={{ font: "600 11px var(--font-sans)" }}>Eliminar</span>
      </button>

      {/* Main line */}
      <div
        onClick={() => { if (open) { setSwiped(false); onClose && onClose(); } else { setSwiped(true); onOpen && onOpen(); } }}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px",
          background: "var(--paper)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          transform: open ? `translateX(-${REVEAL}px)` : "translateX(0)",
          transition: "transform 240ms cubic-bezier(0.16,1,0.3,1)",
          position: "relative", zIndex: 1,
          cursor: "pointer",
        }}
      >
        <MThumb initials={item.thumb} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "500 14px var(--font-sans)", color: "var(--ink-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</div>
          <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {mFmt(item.precio)} c/u
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <QtyStepper qty={item.qty} onChange={onUpdateQty} />
        </div>
        <span style={{
          font: "600 14px var(--font-sans)", fontVariantNumeric: "tabular-nums",
          color: "var(--ink-100)", minWidth: 68, textAlign: "right",
        }}>{mFmt(item.qty * item.precio)}</span>
      </div>
    </div>
  );
}

window.CartMobile = CartMobile;
