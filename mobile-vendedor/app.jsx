// Mobile Vendedor app — router + cart state, mounted inside iOS frame.

function MobileApp() {
  const [screen, setScreen] = React.useState("login"); // login | pos | scanner | cart | success
  const [showCobro, setShowCobro] = React.useState(false);
  const [cart, setCart] = React.useState([]);
  const [lastSale, setLastSale] = React.useState(null);

  const total = cart.reduce((a, b) => a + b.precio * b.qty, 0);

  // ----- Cart mutations -----
  function addProduct(p) {
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { ...p, qty: 1 }];
    });
    setScreen("pos");
  }
  function updateQty(id, qty) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }
  function removeItem(id) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  // ----- Flow handlers -----
  function startScan() { setScreen("scanner"); }
  function openCart() { setScreen("cart"); }
  function openCobro() { setShowCobro(true); }
  function confirmSale(metodo, recibido) {
    setShowCobro(false);
    setLastSale({
      cart: cart,
      total,
      metodo: metodo || "Efectivo",
      cambio: Math.max(0, (recibido || total) - total),
    });
    setScreen("success");
  }
  function newSale() {
    setCart([]);
    setLastSale(null);
    setScreen("pos");
  }

  // Pre-seed a couple of items for visual richness on first POS view
  React.useEffect(() => {
    if (screen === "pos" && cart.length === 0 && !lastSale) {
      const p1 = window.M.productos[0];
      const p2 = window.M.productos[2];
      setCart([
        { ...p1, qty: 2 },
        { ...p2, qty: 1 },
      ]);
    }
  }, [screen]);

  // ----- Render device + appropriate screen -----
  const dark = screen === "scanner";
  return (
    <IOSDevice width={402} height={874} dark={dark}>
      <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden", background: "var(--paper)" }}>
        {screen === "login" && (
          <div style={{ paddingTop: 56, height: "100%", boxSizing: "border-box" }}>
            <LoginMobile onLogin={() => setScreen("pos")} />
          </div>
        )}

        {screen === "pos" && (
          <div style={{ paddingTop: 56, height: "100%", boxSizing: "border-box" }}>
            <POSHome
              cart={cart}
              onScan={startScan}
              onSearch={startScan}
              onOpenCart={openCart}
              onCobrar={openCobro}
              onLogout={() => { setCart([]); setLastSale(null); setScreen("login"); }}
              removeItem={removeItem}
              updateQty={updateQty}
            />
          </div>
        )}

        {screen === "scanner" && (
          <Scanner
            onClose={() => setScreen("pos")}
            onAdd={p => addProduct(p)}
          />
        )}

        {screen === "cart" && (
          <div style={{ paddingTop: 56, height: "100%", boxSizing: "border-box" }}>
            <CartMobile
              cart={cart}
              onClose={() => setScreen("pos")}
              onUpdateQty={updateQty}
              onRemove={removeItem}
              onCobrar={openCobro}
            />
          </div>
        )}

        {screen === "success" && lastSale && (
          <div style={{ paddingTop: 56, height: "100%", boxSizing: "border-box" }}>
            <Success
              cart={lastSale.cart}
              cambio={lastSale.cambio}
              metodo={lastSale.metodo}
              onNuevaVenta={newSale}
            />
          </div>
        )}

        <CobroSheet
          open={showCobro}
          total={total}
          onClose={() => setShowCobro(false)}
          onConfirm={() => confirmSale("Efectivo", total + 50)}
        />
      </div>
    </IOSDevice>
  );
}

// Mount inside scaled wrapper so the phone fits nicely
function App() {
  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--ink-05)",
      padding: 24, boxSizing: "border-box",
    }}>
      <MobileApp />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
