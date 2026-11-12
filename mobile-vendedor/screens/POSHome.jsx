// POS Mobile — main vendor screen.
// Big central "Escanear código" button, cart items below, total + COBRAR fixed at bottom.

function POSHome({ cart, onScan, onSearch, onOpenCart, onCobrar, onLogout, removeItem, updateQty }) {
  const total = cart.reduce((a, b) => a + b.precio * b.qty, 0);
  const itemCount = cart.reduce((a, b) => a + b.qty, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px 12px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MThumb initials={window.M.user.inicial} size={32} />
          <div>
            <div style={{ font: "600 13px var(--font-sans)", color: "var(--ink-100)" }}>{window.M.user.nombre.split(" ")[0]}</div>
            <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)" }}>{window.M.business.nombre}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ border: "none", background: "transparent", padding: 8, color: "var(--fg-muted)", cursor: "pointer" }} aria-label="Salir">
          <MIcon name="log-out" size={18} />
        </button>
      </header>

      {/* Scan + Search row */}
      <div style={{ padding: "20px 18px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={onScan}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
            height: 132, borderRadius: 16,
            background: "var(--ink-100)", color: "var(--paper)", border: "none",
            cursor: "pointer", WebkitTapHighlightColor: "transparent",
            fontFamily: "var(--font-sans)",
          }}
        >
          <MIcon name="scan-barcode" size={36} stroke={1.6} />
          <div style={{ textAlign: "left" }}>
            <div style={{ font: "600 19px var(--font-sans)", letterSpacing: "-0.011em" }}>Escanear código</div>
            <div style={{ font: "400 13px var(--font-sans)", opacity: 0.7, marginTop: 2 }}>Apunta la cámara al código</div>
          </div>
        </button>
        <button
          onClick={onSearch}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            height: 44, padding: "0 14px", borderRadius: 10,
            background: "var(--ink-05)", color: "var(--fg-muted)",
            border: "1px solid var(--border)",
            font: "400 14px var(--font-sans)",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <MIcon name="search" size={16} />
          Buscar producto manualmente...
        </button>
      </div>

      {/* Cart preview */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "8px 18px 0",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 4px" }}>
          <span style={{ font: "600 12px var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
            Carrito {cart.length > 0 && `· ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
          </span>
          {cart.length > 2 && (
            <button onClick={onOpenCart} style={{ background: "transparent", border: "none", font: "600 12px var(--font-sans)", color: "var(--ink-80)", padding: 0, cursor: "pointer" }}>
              Ver todo →
            </button>
          )}
        </div>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fg-muted)" }}>
            <MIcon name="shopping-cart" size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ font: "500 14px var(--font-sans)" }}>Carrito vacío</div>
            <div style={{ font: "400 12px var(--font-sans)", marginTop: 4 }}>Escanea un producto para empezar</div>
          </div>
        ) : (
          cart.slice(0, 3).map(item => (
            <CartLineItem key={item.id} item={item} onRemove={() => removeItem(item.id)} onUpdateQty={q => updateQty(item.id, q)} compact />
          ))
        )}
      </div>

      {/* Sticky bottom: total + COBRAR */}
      <div style={{
        borderTop: "1px solid var(--border)",
        padding: "14px 18px 14px",
        background: "var(--paper)",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ font: "500 13px var(--font-sans)", color: "var(--fg-muted)" }}>Total</span>
          <span style={{ font: "600 28px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums", color: "var(--ink-100)" }}>{mFmt(total)}</span>
        </div>
        <MButton
          size="xl"
          variant={cart.length === 0 ? "secondary" : "primary"}
          disabled={cart.length === 0}
          onClick={onCobrar}
          style={{ width: "100%" }}
        >
          COBRAR
        </MButton>
      </div>
    </div>
  );
}

// ----- Cart line item (also used in full cart) -----
function CartLineItem({ item, onRemove, onUpdateQty, compact }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 12px", background: "var(--paper)",
      border: "1px solid var(--border)", borderRadius: 10,
    }}>
      <MThumb initials={item.thumb} size={compact ? 36 : 44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          font: "500 14px var(--font-sans)", color: "var(--ink-100)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{item.nombre}</div>
        <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
          {mFmt(item.precio)} c/u
        </div>
      </div>
      <QtyStepper qty={item.qty} onChange={onUpdateQty} small={compact} />
      <span style={{
        font: "600 14px var(--font-sans)", fontVariantNumeric: "tabular-nums",
        color: "var(--ink-100)", minWidth: 64, textAlign: "right",
      }}>{mFmt(item.qty * item.precio)}</span>
    </div>
  );
}

function QtyStepper({ qty, onChange, small }) {
  const size = small ? 28 : 32;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 0, border: "1px solid var(--border-strong)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        style={{ width: size, height: size, border: "none", background: "var(--paper)", color: "var(--ink-80)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Menos"
      >
        <MIcon name="minus" size={14} />
      </button>
      <span style={{ minWidth: 28, textAlign: "center", font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{qty}</span>
      <button
        onClick={() => onChange(qty + 1)}
        style={{ width: size, height: size, border: "none", background: "var(--paper)", color: "var(--ink-80)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Más"
      >
        <MIcon name="plus" size={14} />
      </button>
    </div>
  );
}

Object.assign(window, { POSHome, CartLineItem, QtyStepper });
