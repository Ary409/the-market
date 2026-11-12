// POS Desktop — split screen: left products, right cart + payment + COBRAR.

function POSDesktop({ onComplete }) {
  const M = window.MOCK;
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState("Todas");
  const [cart, setCart] = React.useState([
    { ...M.productos[0], qty: 2 },
    { ...M.productos[2], qty: 1 },
    { ...M.productos[3], qty: 1 },
  ]);
  const [metodo, setMetodo] = React.useState("efectivo");
  const [recibido, setRecibido] = React.useState("");

  const total = cart.reduce((a, b) => a + b.precio * b.qty, 0);
  const recibidoNum = parseFloat(recibido) || 0;
  const cambio = Math.max(0, recibidoNum - total);
  const insuficiente = metodo === "efectivo" && recibido !== "" && recibidoNum < total;
  const puedeCobrar = cart.length > 0 && (metodo !== "efectivo" || recibidoNum >= total);

  const cats = ["Todas", ...M.categorias];
  let filtered = M.productos;
  if (cat !== "Todas") filtered = filtered.filter(p => p.categoria === cat);
  if (query) filtered = filtered.filter(p =>
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    p.codigo.includes(query)
  );

  function addToCart(p) {
    if (p.stock === 0) return;
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { ...p, qty: 1 }];
    });
  }
  function updateQty(id, qty) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }
  function removeItem(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }
  function cobrar() {
    if (!puedeCobrar) return;
    onComplete({ cart, total, cambio, metodo: metodo.charAt(0).toUpperCase() + metodo.slice(1), recibido: recibidoNum || total });
    setCart([]); setRecibido(""); setMetodo("efectivo");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", height: "calc(100vh - 0px)", background: "var(--ink-05)" }}>
      {/* LEFT — products */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--border)", background: "var(--paper)" }}>
        {/* Search bar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
          <TextField
            icon="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o código de barras..."
            autoFocus
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  height: 30, padding: "0 12px", borderRadius: 6,
                  background: c === cat ? "var(--ink-100)" : "var(--paper)",
                  color: c === cat ? "var(--paper)" : "var(--ink-80)",
                  border: `1px solid ${c === cat ? "var(--ink-100)" : "var(--border-strong)"}`,
                  font: "500 12px var(--font-sans)", cursor: "pointer",
                }}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="Sin resultados" body={`No encontramos productos para "${query}".`} />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 12,
            }}>
              {filtered.map(p => (
                <ProductCard key={p.id} p={p} onAdd={() => addToCart(p)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — cart + payment */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--paper)" }}>
        {/* Cart header */}
        <div style={{ padding: "16px 24px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ font: "600 16px var(--font-sans)", letterSpacing: "-0.011em" }}>Venta en curso</div>
            <div style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
              {cart.length === 0 ? "Agrega productos" : `${cart.reduce((a, b) => a + b.qty, 0)} items en el carrito`}
            </div>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])}>Limpiar</Button>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", minHeight: 0 }}>
          {cart.length === 0 ? (
            <EmptyState icon="shopping-cart" title="Carrito vacío" body="Escanea o haz click sobre un producto para agregarlo." />
          ) : (
            cart.map(item => (
              <CartLine key={item.id} item={item} onUpdate={q => updateQty(item.id, q)} onRemove={() => removeItem(item.id)} />
            ))
          )}
        </div>

        {/* Payment + totals */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 24px 20px", background: "var(--ink-05)", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Method tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <MethodTab icon="banknote" label="Efectivo" active={metodo === "efectivo"} onClick={() => setMetodo("efectivo")} />
            <MethodTab icon="credit-card" label="Tarjeta" active={metodo === "tarjeta"} onClick={() => setMetodo("tarjeta")} />
            <MethodTab icon="split" label="Mixto" active={metodo === "mixto"} onClick={() => setMetodo("mixto")} />
          </div>

          {/* Recibido (only for efectivo) */}
          {metodo === "efectivo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <TextField
                value={recibido}
                onChange={e => setRecibido(e.target.value)}
                placeholder="Monto recibido"
                prefix="$"
                error={insuficiente ? "Monto insuficiente" : ""}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[
                  Math.ceil(total / 50) * 50,
                  Math.ceil(total / 100) * 100,
                  Math.ceil(total / 200) * 200,
                  Math.ceil(total / 500) * 500,
                ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setRecibido(String(amt))}
                    style={{
                      height: 32, padding: "0 6px", borderRadius: 6,
                      border: "1px solid var(--border-strong)", background: "var(--paper)",
                      font: "600 12px var(--font-sans)", color: "var(--ink-80)",
                      fontVariantNumeric: "tabular-nums",
                      cursor: "pointer",
                    }}
                  >{fmtMoney(amt)}</button>
                ))}
              </div>
            </div>
          )}

          {/* Cambio chip */}
          {metodo === "efectivo" && recibidoNum >= total && cart.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#ECFDF3", border: "1px solid #BBF7D0", borderRadius: 8 }}>
              <span style={{ font: "500 13px var(--font-sans)", color: "#15803D" }}>Cambio</span>
              <span style={{ font: "600 20px var(--font-sans)", letterSpacing: "-0.011em", color: "#15803D", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(cambio)}</span>
            </div>
          )}

          {/* Total */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ font: "500 14px var(--font-sans)", color: "var(--fg-muted)" }}>Total</span>
            <span style={{ font: "600 34px var(--font-sans)", letterSpacing: "-0.022em", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(total)}</span>
          </div>

          {/* COBRAR */}
          <button
            onClick={cobrar}
            disabled={!puedeCobrar}
            style={{
              width: "100%", height: 60,
              background: puedeCobrar ? "var(--ink-100)" : "var(--ink-15)",
              color: puedeCobrar ? "var(--paper)" : "var(--fg-subtle)",
              border: "none", borderRadius: 10,
              font: "700 17px var(--font-sans)", letterSpacing: "0.04em",
              cursor: puedeCobrar ? "pointer" : "not-allowed",
              transition: "background 120ms",
            }}
          >COBRAR</button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ p, onAdd }) {
  const [hover, setHover] = React.useState(false);
  const sinStock = p.stock === 0;
  return (
    <button
      onClick={onAdd}
      disabled={sinStock}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left",
        padding: 10,
        background: "var(--paper)",
        border: `1px solid ${hover && !sinStock ? "var(--ink-100)" : "var(--border)"}`,
        borderRadius: 8,
        cursor: sinStock ? "not-allowed" : "pointer",
        opacity: sinStock ? 0.5 : 1,
        display: "flex", flexDirection: "column", gap: 8,
        transition: "border-color 120ms",
      }}
    >
      <div style={{
        aspectRatio: "1 / 1", background: "var(--ink-05)",
        borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
        font: "600 24px var(--font-sans)", color: "var(--fg-muted)",
      }}>{p.thumb}</div>
      <div style={{
        font: "500 12px var(--font-sans)", color: "var(--ink-100)",
        lineHeight: 1.3,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden", minHeight: 32,
      }}>{p.nombre}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ font: "600 14px var(--font-sans)", color: "var(--ink-100)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(p.precio)}</span>
        {sinStock
          ? <span style={{ font: "600 10px var(--font-sans)", color: "var(--danger)" }}>Agotado</span>
          : <span style={{ font: "500 10px var(--font-sans)", color: "var(--fg-muted)" }}>{p.stock}</span>}
      </div>
    </button>
  );
}

function CartLine({ item, onUpdate, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 8px", borderBottom: "1px solid var(--border)",
    }}>
      <Thumb initials={item.thumb} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          font: "500 13px var(--font-sans)", color: "var(--ink-100)",
          lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{item.nombre}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 3 }}>
          <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(item.precio)}</span>
          <span style={{
            font: "600 12px var(--font-sans)", fontVariantNumeric: "tabular-nums",
            color: "var(--ink-100)",
          }}>{fmtMoney(item.qty * item.precio)}</span>
        </div>
      </div>
      <QtyStepper qty={item.qty} onChange={onUpdate} />
      <button onClick={onRemove} style={{ border: "none", background: "transparent", padding: 4, cursor: "pointer", color: "var(--fg-muted)" }}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function QtyStepper({ qty, onChange }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: 6, overflow: "hidden" }}>
      <button onClick={() => onChange(qty - 1)} style={{ width: 26, height: 26, border: "none", background: "var(--paper)", color: "var(--ink-80)", cursor: "pointer" }}>−</button>
      <span style={{ minWidth: 26, textAlign: "center", font: "600 12px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{qty}</span>
      <button onClick={() => onChange(qty + 1)} style={{ width: 26, height: 26, border: "none", background: "var(--paper)", color: "var(--ink-80)", cursor: "pointer" }}>+</button>
    </div>
  );
}

function MethodTab({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        height: 38, padding: "0 12px",
        background: active ? "var(--ink-100)" : "var(--paper)",
        color: active ? "var(--paper)" : "var(--ink-80)",
        border: `1px solid ${active ? "var(--ink-100)" : "var(--border-strong)"}`,
        borderRadius: 6,
        font: "500 13px var(--font-sans)",
        cursor: "pointer",
      }}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}

Object.assign(window, { POSDesktop });
