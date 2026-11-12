// Pantalla POS para el rol vendedor
// Precio, stock y validaciones los resuelve SIEMPRE el backend; aquí solo se
// refleja lo que el servidor cobrará (incluye precio de mayoreo por cantidad).

function precioEfectivo(p, cantidad) {
  // Réplica de la regla del servidor: mayoreo si la cantidad alcanza el umbral.
  if (p.precio_mayoreo != null && p.cantidad_mayoreo != null && cantidad >= p.cantidad_mayoreo) {
    return p.precio_mayoreo;
  }
  return p.precio_venta;
}

function VendedorScreen({ user, onLogout, onBack }) {
  const [query,      setQuery]      = React.useState('');
  const [resultados, setResultados] = React.useState([]);
  const [buscando,   setBuscando]   = React.useState(false);
  const [cart,       setCart]       = React.useState([]);
  const [metodo,     setMetodo]     = React.useState('efectivo');
  const [recibido,   setRecibido]   = React.useState('');
  const [efectivoMix,setEfectivoMix]= React.useState('');
  const [cliente,    setCliente]    = React.useState(null);
  const [procesando, setProcesando] = React.useState(false);
  const [recibo,     setRecibo]     = React.useState(null);
  const [caja,       setCaja]       = React.useState(null);
  const [cajaError,  setCajaError]  = React.useState(false);
  const [showAbrir,  setShowAbrir]  = React.useState(false);
  const [showCerrar, setShowCerrar] = React.useState(false);
  const [cierre,     setCierre]     = React.useState(null);   // resumen tras cerrar turno
  const [error,      setError]      = React.useState('');

  function refreshCaja() {
    API.getCajaActual()
      .then(c => { setCaja(c); setCajaError(!c); })
      .catch(() => { setCaja(null); setCajaError(true); });
  }

  React.useEffect(refreshCaja, []);

  React.useEffect(() => {
    if (!query.trim()) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        if (/^\d{6,}$/.test(query.trim())) {
          try {
            const p = await API.getProductoByBarcode(query.trim());
            addToCart(p);
            setQuery('');
            setResultados([]);
            setBuscando(false);
            return;
          } catch {}
        }
        const res = await API.getProductos({ q: query, per_page: 12 });
        setResultados(res.items || []);
      } catch {}
      finally { setBuscando(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function addToCart(producto) {
    const paso = producto.unidad_medida && producto.unidad_medida !== 'unidad' ? 1 : 1;
    setCart(prev => {
      const existing = prev.find(i => i.producto.id === producto.id);
      if (existing) {
        return prev.map(i =>
          i.producto.id === producto.id
            ? { ...i, cantidad: +(i.cantidad + paso).toFixed(3) }
            : i
        );
      }
      return [...prev, { producto, cantidad: paso }];
    });
  }

  function setCantidad(id, val) {
    setCart(prev => prev.map(i => {
      if (i.producto.id !== id) return i;
      const porUnidad = !i.producto.unidad_medida || i.producto.unidad_medida === 'unidad';
      let n = porUnidad ? parseInt(val) : parseFloat(val);
      if (isNaN(n) || n <= 0) n = porUnidad ? 1 : 0.001;
      if (porUnidad) n = Math.max(1, Math.floor(n));
      return { ...i, cantidad: n };
    }));
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.producto.id !== id));
  }

  const total = +cart.reduce((s, i) => s + precioEfectivo(i.producto, i.cantidad) * i.cantidad, 0).toFixed(2);
  const cambio = metodo === 'efectivo' && recibido && parseFloat(recibido) >= total
    ? +(parseFloat(recibido) - total).toFixed(2)
    : null;
  const tarjetaMix = metodo === 'mixto' && efectivoMix !== ''
    ? +(total - parseFloat(efectivoMix || 0)).toFixed(2)
    : null;

  function resetPago() { setRecibido(''); setEfectivoMix(''); }

  async function cobrar() {
    if (!cart.length) return;
    setError('');

    if (metodo === 'efectivo') {
      if (!recibido || parseFloat(recibido) < total) { setError('El monto recibido es insuficiente'); return; }
    }
    if (metodo === 'mixto') {
      const ef = parseFloat(efectivoMix);
      if (isNaN(ef) || ef < 0 || ef > total) { setError('El monto en efectivo del pago mixto no es válido'); return; }
    }
    if (metodo === 'credito' && !cliente) { setError('Selecciona el cliente para la venta a crédito'); return; }

    setProcesando(true);
    try {
      const payload = {
        items: cart.map(i => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
        metodo_pago: metodo,
      };
      if (metodo === 'efectivo') payload.monto_recibido = parseFloat(recibido);
      if (metodo === 'mixto') {
        payload.monto_efectivo = +parseFloat(efectivoMix).toFixed(2);
        payload.monto_tarjeta  = +(total - parseFloat(efectivoMix)).toFixed(2);
      }
      if (metodo === 'credito') payload.cliente_id = cliente.id;
      if (cliente && metodo !== 'credito') payload.cliente_id = cliente.id;

      const venta = await API.crearVenta(payload);
      const r = await API.getRecibo(venta.id);
      setRecibo(r);
      setCart([]);
      resetPago();
      setCliente(null);
      setQuery('');
      setResultados([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  if (recibo) {
    return (
      <ReciboVista
        recibo={recibo}
        onNuevaVenta={() => {
          setRecibo(null);
          setMetodo('efectivo');
          API.getCajaActual().then(c => setCajaError(!c)).catch(() => setCajaError(true));
        }}
      />
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--ink-05)', fontFamily:'var(--font-sans)' }}>

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 24px', background:'var(--paper)', borderBottom:'1px solid var(--border)', height:52, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, background:'var(--ink-100)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M5 19 V7 L12 14 L19 7 V19" />
            </svg>
          </div>
          <span style={{ font:'600 14px var(--font-sans)', letterSpacing:'-0.022em', color:'var(--ink-100)' }}>the market</span>
          <span style={{ font:'500 12px var(--font-sans)', color:'var(--fg-muted)', background:'var(--ink-05)', padding:'2px 8px', borderRadius:20, border:'1px solid var(--border)' }}>POS</span>
        </div>
        <div style={{ flex:1 }} />
        {cajaError ? (
          <>
            <span style={{ display:'flex', alignItems:'center', gap:6, font:'500 12px var(--font-sans)', color:'#B45309', background:'#FEF3C7', padding:'4px 10px', borderRadius:20, border:'1px solid #FDE68A' }}>
              <Icon name="alert-triangle" size={13} />
              Caja cerrada
            </span>
            <button onClick={() => setShowAbrir(true)}
              style={{ border:'none', background:'var(--ink-100)', color:'var(--paper)', borderRadius:6, padding:'6px 14px', cursor:'pointer', font:'600 12px var(--font-sans)', display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="wallet" size={13} /> Abrir caja
            </button>
          </>
        ) : (
          <button onClick={() => setShowCerrar(true)}
            title="Cierre de turno: cuenta el efectivo y haz el corte"
            style={{ border:'1px solid var(--border-strong)', background:'transparent', borderRadius:6, padding:'5px 12px', cursor:'pointer', font:'500 12px var(--font-sans)', color:'var(--fg-muted)', display:'flex', alignItems:'center', gap:6 }}>
            <Icon name="wallet" size={13} /> Cerrar turno
          </button>
        )}
        <span style={{ font:'500 12px var(--font-sans)', color:'var(--fg-muted)' }}>{user?.nombre}</span>
        <button
          onClick={onBack || onLogout}
          style={{ border:'1px solid var(--border-strong)', background:'transparent', borderRadius:6, padding:'5px 12px', cursor:'pointer', font:'500 12px var(--font-sans)', color:'var(--fg-muted)', display:'flex', alignItems:'center', gap:6 }}
        >
          <Icon name={onBack ? "chevron-left" : "log-out"} size={13} /> {onBack ? "Volver al panel" : "Salir"}
        </button>
      </header>

      {/* Body */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 380px', gap:0, overflow:'hidden', height:'calc(100vh - 52px)' }}>

        {/* Left: search + results + cart */}
        <div style={{ display:'flex', flexDirection:'column', gap:0, padding:16, overflow:'auto' }}>

          {/* Search bar */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <Icon name="scan-barcode" size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--fg-muted)', pointerEvents:'none' }} />
            {buscando && <Spinner size={14} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }} />}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre, código o SKU · o escanear código de barras..."
              autoFocus
              style={{ width:'100%', height:44, padding:'0 40px 0 40px', borderRadius:8, border:'2px solid var(--border-strong)', background:'var(--paper)', font:'400 14px var(--font-sans)', outline:'none', boxSizing:'border-box', color:'var(--fg)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ink-100)'; e.target.style.boxShadow = '0 0 0 3px var(--focus-ring)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Product results grid */}
          {resultados.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:10, marginBottom:12 }}>
              {resultados.map(p => <ProductCard key={p.id} p={p} onAdd={() => { addToCart(p); setQuery(''); setResultados([]); }} />)}
            </div>
          )}

          {/* Cart table */}
          {cart.length > 0 ? (
            <Card noPadding style={{ flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th align="right">Precio</Th>
                    <Th align="center">Cantidad</Th>
                    <Th align="right">Subtotal</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => {
                    const porUnidad = !item.producto.unidad_medida || item.producto.unidad_medida === 'unidad';
                    const precio = precioEfectivo(item.producto, item.cantidad);
                    const esMayoreo = precio !== item.producto.precio_venta;
                    return (
                    <tr key={item.producto.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <Td>
                        <span style={{ font:'500 13px var(--font-sans)' }}>{item.producto.nombre}</span>
                        {!porUnidad && <span style={{ marginLeft:6, font:'500 10px var(--font-sans)', color:'var(--fg-muted)' }}>/{item.producto.unidad_medida}</span>}
                        {esMayoreo && (
                          <span style={{ marginLeft:6, font:'500 10px var(--font-sans)', color:'#15803D', background:'#ECFDF3', padding:'1px 6px', borderRadius:10 }}>Mayoreo</span>
                        )}
                        {item.producto.stock <= item.producto.stock_minimo && (
                          <span style={{ marginLeft:6, font:'500 10px var(--font-sans)', color:'#B45309', background:'#FEF3C7', padding:'1px 6px', borderRadius:10 }}>Stock bajo</span>
                        )}
                      </Td>
                      <Td align="right" mono>{fmtMoney(precio)}</Td>
                      <Td align="center">
                        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                          <button
                            onClick={() => setCantidad(item.producto.id, porUnidad ? item.cantidad - 1 : +(item.cantidad - 0.5).toFixed(3))}
                            style={{ width:26, height:26, border:'1px solid var(--border-strong)', borderRadius:4, background:'transparent', cursor:'pointer', font:'600 16px var(--font-sans)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-80)' }}
                          >−</button>
                          <input
                            type="number"
                            value={item.cantidad}
                            min={porUnidad ? 1 : 0.001}
                            step={porUnidad ? 1 : 0.001}
                            onChange={e => setCantidad(item.producto.id, e.target.value)}
                            style={{ width:52, height:26, border:'1px solid var(--border-strong)', borderRadius:4, textAlign:'center', font:'600 13px var(--font-sans)', outline:'none', background:'var(--paper)', color:'var(--fg)', fontVariantNumeric:'tabular-nums' }}
                          />
                          <button
                            onClick={() => setCantidad(item.producto.id, porUnidad ? item.cantidad + 1 : +(item.cantidad + 0.5).toFixed(3))}
                            style={{ width:26, height:26, border:'1px solid var(--border-strong)', borderRadius:4, background:'transparent', cursor:'pointer', font:'600 16px var(--font-sans)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-80)' }}
                          >+</button>
                        </div>
                      </Td>
                      <Td align="right" mono>{fmtMoney(precio * item.cantidad)}</Td>
                      <Td align="right">
                        <button onClick={() => removeFromCart(item.producto.id)}
                          style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--fg-muted)', padding:4, borderRadius:4, display:'flex', alignItems:'center' }}>
                          <Icon name="x" size={14} />
                        </button>
                      </Td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            !resultados.length && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:240, color:'var(--fg-muted)' }}>
                <Icon name="shopping-cart" size={40} style={{ opacity:0.25, marginBottom:12 }} />
                <span style={{ font:'500 14px var(--font-sans)' }}>El carrito está vacío</span>
                <span style={{ font:'400 12px var(--font-sans)', marginTop:4 }}>Busca un producto o escanea su código</span>
              </div>
            )
          )}
        </div>

        {/* Right: payment panel */}
        <div style={{ borderLeft:'1px solid var(--border)', background:'var(--paper)', display:'flex', flexDirection:'column', overflow:'auto' }}>
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16, flex:1 }}>

            {/* Total */}
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ font:'500 12px var(--font-sans)', color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Total a cobrar</span>
              <span style={{ font:'700 36px var(--font-sans)', letterSpacing:'-0.03em', color:'var(--ink-100)', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{fmtMoney(total)}</span>
              <span style={{ font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>
                {cart.length} artículo{cart.length!==1?'s':''}
              </span>
            </div>

            <div style={{ height:1, background:'var(--border)' }} />

            {/* Cliente */}
            <ClienteSelector cliente={cliente} onSelect={setCliente} requerido={metodo === 'credito'} />

            {/* Payment method */}
            <div>
              <div style={{ font:'600 12px var(--font-sans)', color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Método de pago</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { id:'efectivo', label:'Efectivo', icon:'wallet' },
                  { id:'tarjeta',  label:'Tarjeta',  icon:'more' },
                  { id:'mixto',    label:'Mixto',    icon:'more' },
                  { id:'credito',  label:'Fiado',    icon:'users' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMetodo(m.id); setError(''); resetPago(); }}
                    style={{
                      padding:'10px 8px', borderRadius:8, cursor:'pointer',
                      border: metodo === m.id ? '2px solid var(--ink-100)' : '1px solid var(--border-strong)',
                      background: metodo === m.id ? 'var(--ink-100)' : 'var(--paper)',
                      color: metodo === m.id ? 'var(--paper)' : 'var(--ink-80)',
                      font:'600 13px var(--font-sans)',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      transition:'all 100ms',
                    }}
                  >
                    <Icon name={m.icon} size={16} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash input */}
            {metodo === 'efectivo' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <TextField label="Monto recibido" value={recibido} onChange={e => { setRecibido(e.target.value); setError(''); }} prefix="L" placeholder="0.00" type="number" />
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[50, 100, 200, 500].map(amt => (
                    <button key={amt} onClick={() => setRecibido(String(amt))}
                      style={{ border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 10px', background:'transparent', cursor:'pointer', font:'500 12px var(--font-sans)', color:'var(--fg-muted)' }}
                    >${amt}</button>
                  ))}
                  <button onClick={() => setRecibido(total.toFixed(2))}
                    style={{ border:'1px solid var(--border-strong)', borderRadius:6, padding:'4px 10px', background:'transparent', cursor:'pointer', font:'500 12px var(--font-sans)', color:'var(--fg-muted)' }}
                  >Exacto</button>
                </div>
                {cambio !== null && (
                  <div style={{ padding:'12px 14px', borderRadius:8, background:'#ECFDF3', border:'1px solid #BBF7D0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ font:'500 13px var(--font-sans)', color:'#15803D' }}>Cambio</span>
                    <span style={{ font:'700 20px var(--font-sans)', color:'#15803D', fontVariantNumeric:'tabular-nums' }}>{fmtMoney(cambio)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Mixto input */}
            {metodo === 'mixto' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <TextField label="Monto en efectivo" value={efectivoMix} onChange={e => { setEfectivoMix(e.target.value); setError(''); }} prefix="L" placeholder="0.00" type="number"
                  help="El resto se cobra con tarjeta" />
                {tarjetaMix !== null && tarjetaMix >= 0 && (
                  <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--ink-05)', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ font:'500 13px var(--font-sans)', color:'var(--fg-muted)' }}>Con tarjeta</span>
                    <span style={{ font:'700 18px var(--font-sans)', color:'var(--ink-100)', fontVariantNumeric:'tabular-nums' }}>{fmtMoney(tarjetaMix)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Crédito info */}
            {metodo === 'credito' && (
              <div style={{ padding:'10px 14px', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, font:'400 12px var(--font-sans)', color:'#92400E' }}>
                {cliente
                  ? `Se anotarán ${fmtMoney(total)} a la cuenta de ${cliente.nombre}. ${cliente.saldo > 0 ? `Ya debe ${fmtMoney(cliente.saldo)}.` : 'No tiene deuda previa.'}`
                  : 'Selecciona (o crea) el cliente para anotarle el fiado.'}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding:'10px 14px', background:'var(--danger-bg)', border:'1px solid var(--danger-bd)', borderRadius:8, color:'var(--danger)', fontSize:13 }}>
                {error}
              </div>
            )}

            <div style={{ flex:1 }} />

            {/* Cobrar button */}
            <Button
              onClick={cobrar}
              disabled={cart.length === 0 || procesando || cajaError}
              style={{ width:'100%', height:52, fontSize:15 }}
            >
              {procesando
                ? <Spinner size={18} />
                : cart.length === 0
                  ? 'Agrega productos al carrito'
                  : metodo === 'credito'
                    ? `Fiar ${fmtMoney(total)}`
                    : `Cobrar ${fmtMoney(total)}`}
            </Button>

            {cart.length > 0 && (
              <button
                onClick={() => { setCart([]); setError(''); resetPago(); }}
                style={{ border:'none', background:'transparent', color:'var(--fg-muted)', cursor:'pointer', font:'400 12px var(--font-sans)', padding:4, textAlign:'center' }}
              >Limpiar carrito</button>
            )}
          </div>
        </div>
      </div>

      {/* Caja: el vendedor abre y cierra su turno desde aquí */}
      <AbrirTurnoModal open={showAbrir} onClose={() => setShowAbrir(false)}
        onDone={() => { setShowAbrir(false); refreshCaja(); }} />
      <CerrarTurnoModal open={showCerrar} onClose={() => setShowCerrar(false)}
        onDone={res => { setShowCerrar(false); setCierre(res); refreshCaja(); }} />
      <ResumenTurnoModal cierre={cierre} onClose={() => setCierre(null)} />
    </div>
  );
}

// ── Caja: abrir y cerrar turno desde el POS (vendedor) ───────────────────────

function AbrirTurnoModal({ open, onClose, onDone }) {
  const [monto,   setMonto]   = React.useState('500');
  const [saving,  setSaving]  = React.useState(false);
  const [error,   setError]   = React.useState('');

  React.useEffect(() => { if (open) { setError(''); } }, [open]);

  async function abrir() {
    const m = parseFloat(monto);
    if (isNaN(m) || m < 0) { setError('Ingresa el monto inicial en efectivo'); return; }
    setSaving(true);
    try { await API.abrirCaja(m); onDone(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Abrir caja" subtitle="Inicia tu turno con el fondo inicial" width={420}
      footer={<>
        {error && <span style={{ flex:1, font:'400 12px var(--font-sans)', color:'var(--danger)' }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={abrir} disabled={saving}>{saving ? 'Abriendo…' : 'Abrir caja'}</Button>
      </>}
    >
      <TextField label="Monto inicial en efectivo" value={monto} onChange={e => setMonto(e.target.value)} prefix="L" autoFocus
        help="El efectivo con el que arranca la caja. Se usa para el corte al cerrar." />
    </Modal>
  );
}

function CerrarTurnoModal({ open, onClose, onDone }) {
  const [contado, setContado] = React.useState('');
  const [saving,  setSaving]  = React.useState(false);
  const [error,   setError]   = React.useState('');

  React.useEffect(() => { if (open) { setContado(''); setError(''); } }, [open]);

  async function cerrar() {
    const m = parseFloat(contado);
    if (isNaN(m) || m < 0) { setError('Cuenta el efectivo de la caja y escribe el total'); return; }
    setSaving(true);
    try {
      const res = await API.cerrarCaja(m);
      onDone(res);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cerrar turno" subtitle="Cuenta el efectivo físico para hacer el corte" width={420}
      footer={<>
        {error && <span style={{ flex:1, font:'400 12px var(--font-sans)', color:'var(--danger)' }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="secondary-danger" onClick={cerrar} disabled={saving}>{saving ? 'Cerrando…' : 'Cerrar turno'}</Button>
      </>}
    >
      <TextField label="Efectivo contado en caja" value={contado} onChange={e => setContado(e.target.value)} prefix="L" autoFocus
        help="Incluye el fondo inicial. El sistema calcula la diferencia contra lo esperado." />
    </Modal>
  );
}

function ResumenTurnoModal({ cierre, onClose }) {
  if (!cierre) return null;
  const r = cierre.resumen;
  const fila = (label, valor, color) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', font:'400 13px var(--font-sans)' }}>
      <span style={{ color:'var(--fg-muted)' }}>{label}</span>
      <span style={{ font:'600 13px var(--font-sans)', fontVariantNumeric:'tabular-nums', color: color || 'var(--ink-100)' }}>{valor}</span>
    </div>
  );
  return (
    <Modal open={true} onClose={onClose} title="Turno cerrado" subtitle={`Sesión #${cierre.sesion.id} — corte de caja`} width={460}
      footer={<Button onClick={onClose} style={{ width:'100%' }}>Entendido</Button>}
    >
      <div style={{ display:'flex', flexDirection:'column' }}>
        {fila('Total vendido', fmtMoney(r.total_ventas))}
        {fila('Ventas en efectivo', fmtMoney(r.ventas_efectivo))}
        {fila('Ventas con tarjeta', fmtMoney(r.ventas_tarjeta))}
        {fila('Fiado (no entra a caja)', fmtMoney(r.ventas_credito || 0), '#B45309')}
        {fila('Cuentas cobradas', fmtMoney((r.cobros_credito_efectivo || 0) + (r.cobros_credito_tarjeta || 0)), '#15803D')}
        {fila('Efectivo esperado', fmtMoney(r.monto_esperado))}
        {fila('Efectivo contado', fmtMoney(cierre.sesion.monto_contado))}
        {fila('Diferencia', (r.diferencia >= 0 ? '+' : '') + fmtMoney(r.diferencia), r.diferencia >= 0 ? '#15803D' : 'var(--danger)')}
        {(cierre.fiados_turno?.length > 0) && (
          <div style={{ marginTop:10, font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>
            Fiados del turno: {cierre.fiados_turno.map(f => `${f.cliente} (${fmtMoney(f.total)})`).join(', ')}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Selector de cliente ─────────────────────────────────────────────────────────

function ClienteSelector({ cliente, onSelect, requerido }) {
  const [open,      setOpen]      = React.useState(false);
  const [query,     setQuery]     = React.useState('');
  const [resultados,setResultados]= React.useState([]);
  const [creando,   setCreando]   = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await API.getClientes({ search: query, per_page: 8 });
        setResultados(res.items || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  async function crearRapido() {
    if (!query.trim()) return;
    setCreando(true);
    try {
      const nuevo = await API.createCliente({ nombre: query.trim() });
      onSelect({ ...nuevo, saldo: 0 });
      setOpen(false); setQuery('');
    } catch (e) { alert(e.message); }
    finally { setCreando(false); }
  }

  if (cliente) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--ink-05)', borderRadius:8, border:'1px solid var(--border)' }}>
        <Icon name="users" size={15} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ font:'600 13px var(--font-sans)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cliente.nombre}</div>
          {cliente.saldo > 0 && <div style={{ font:'400 11px var(--font-sans)', color:'var(--danger)' }}>Deuda: {fmtMoney(cliente.saldo)}</div>}
        </div>
        <button onClick={() => onSelect(null)} style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--fg-muted)', padding:4 }}>
          <Icon name="x" size={14} />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'transparent', border:'1px dashed var(--border-strong)', borderRadius:8, cursor:'pointer', font:'500 12px var(--font-sans)', color:'var(--fg-muted)', width:'100%' }}>
        <Icon name="plus" size={14} /> {requerido ? 'Seleccionar cliente (requerido)' : 'Asociar cliente (opcional)'}
      </button>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, padding:10, background:'var(--ink-05)', borderRadius:8, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', gap:6 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente..." autoFocus
          style={{ flex:1, height:32, padding:'0 10px', borderRadius:6, border:'1px solid var(--border-strong)', font:'400 13px var(--font-sans)', outline:'none', background:'var(--paper)', color:'var(--fg)' }} />
        <button onClick={() => { setOpen(false); setQuery(''); }} style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--fg-muted)', padding:'0 6px' }}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        {resultados.map(c => (
          <button key={c.id} onClick={() => { onSelect(c); setOpen(false); setQuery(''); }}
            style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'var(--paper)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', textAlign:'left' }}>
            <span style={{ font:'500 12px var(--font-sans)' }}>{c.nombre}</span>
            {c.saldo > 0 && <span style={{ font:'500 11px var(--font-sans)', color:'var(--danger)' }}>{fmtMoney(c.saldo)}</span>}
          </button>
        ))}
        {query.trim() && (
          <button onClick={crearRapido} disabled={creando}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'transparent', border:'1px dashed var(--border-strong)', borderRadius:6, cursor:'pointer', font:'500 12px var(--font-sans)', color:'var(--fg-muted)' }}>
            <Icon name="plus" size={13} /> Crear cliente "{query.trim()}"
          </button>
        )}
      </div>
    </div>
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────

function ProductCard({ p, onAdd }) {
  const agotado = p.stock === 0;
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={() => !agotado && onAdd()}
      disabled={agotado}
      onMouseEnter={() => !agotado && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: hover ? '2px solid var(--ink-100)' : '1px solid var(--border)',
        borderRadius:10, padding:'12px 10px',
        background: hover ? 'var(--ink-05)' : 'var(--paper)',
        cursor: agotado ? 'not-allowed' : 'pointer',
        display:'flex', flexDirection:'column', gap:5, textAlign:'left',
        opacity: agotado ? 0.5 : 1,
        transition:'all 120ms',
      }}
    >
      <span style={{ font:'500 13px var(--font-sans)', lineHeight:1.3, color:'var(--ink-100)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{p.nombre}</span>
      <span style={{ font:'700 15px var(--font-sans)', fontVariantNumeric:'tabular-nums', color:'var(--ink-100)' }}>
        {fmtMoney(p.precio_venta)}{p.unidad_medida && p.unidad_medida !== 'unidad' ? <span style={{ font:'400 11px var(--font-sans)', color:'var(--fg-muted)' }}>/{p.unidad_medida}</span> : null}
      </span>
      {agotado
        ? <Badge variant="danger">Agotado</Badge>
        : <span style={{ font:'400 11px var(--font-sans)', color:'var(--fg-muted)' }}>Stock: {p.stock}</span>}
    </button>
  );
}

// ── Receipt view ───────────────────────────────────────────────────────────────

function ReciboVista({ recibo, onNuevaVenta }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', alignItems:'center', justifyContent:'center', background:'var(--ink-05)', padding:24, fontFamily:'var(--font-sans)' }}>
      <div style={{ background:'var(--paper)', border:'1px solid var(--border)', borderRadius:14, padding:'32px 28px', maxWidth:440, width:'100%', display:'flex', flexDirection:'column', gap:20, boxShadow:'var(--shadow-xl)' }}>

        <div style={{ textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'#ECFDF3', border:'1px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', color:'#15803D', margin:'0 auto 12px' }}>
            <Icon name="check" size={26} />
          </div>
          <div style={{ font:'700 20px var(--font-sans)', letterSpacing:'-0.011em', color:'var(--ink-100)' }}>
            {recibo.es_credito ? 'Venta a crédito registrada' : 'Venta registrada'}
          </div>
          <div style={{ font:'400 13px var(--font-sans)', color:'var(--fg-muted)', marginTop:4 }}>
            {recibo.numero_recibo} · {new Date(recibo.fecha).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}
          </div>
          {recibo.cliente && (
            <div style={{ font:'500 12px var(--font-sans)', color:'var(--fg-muted)', marginTop:2 }}>Cliente: {recibo.cliente}</div>
          )}
        </div>

        <div style={{ borderTop:'1px dashed var(--border)', borderBottom:'1px dashed var(--border)', padding:'12px 0', display:'flex', flexDirection:'column', gap:6 }}>
          {recibo.items?.map((item, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', font:'400 13px var(--font-sans)', color:'var(--ink-100)' }}>
              <span style={{ flex:1 }}>{item.nombre}</span>
              <span style={{ color:'var(--fg-muted)', marginRight:16 }}>×{item.cantidad}</span>
              <span style={{ fontVariantNumeric:'tabular-nums', minWidth:60, textAlign:'right' }}>{fmtMoney(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', font:'700 20px var(--font-sans)', letterSpacing:'-0.011em' }}>
            <span>Total</span>
            <span style={{ fontVariantNumeric:'tabular-nums' }}>{fmtMoney(recibo.total)}</span>
          </div>
          {recibo.metodo_pago === 'efectivo' && recibo.monto_recibido != null && (
            <div style={{ display:'flex', justifyContent:'space-between', font:'400 13px var(--font-sans)', color:'var(--fg-muted)' }}>
              <span>Recibido</span>
              <span style={{ fontVariantNumeric:'tabular-nums' }}>{fmtMoney(recibo.monto_recibido)}</span>
            </div>
          )}
          {recibo.metodo_pago === 'mixto' && (
            <div style={{ display:'flex', flexDirection:'column', gap:2, font:'400 13px var(--font-sans)', color:'var(--fg-muted)' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>Efectivo</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{fmtMoney(recibo.monto_efectivo)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span>Tarjeta</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{fmtMoney(recibo.monto_tarjeta)}</span></div>
            </div>
          )}
          {recibo.cambio > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', font:'600 15px var(--font-sans)', color:'#15803D', background:'#ECFDF3', padding:'8px 12px', borderRadius:8 }}>
              <span>Cambio</span>
              <span style={{ fontVariantNumeric:'tabular-nums' }}>{fmtMoney(recibo.cambio)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>
            <span>Método</span>
            <span style={{ textTransform:'capitalize' }}>{recibo.metodo_pago}</span>
          </div>
        </div>

        <Button size="lg" onClick={onNuevaVenta} style={{ width:'100%' }}>
          Nueva venta
        </Button>
      </div>
    </div>
  );
}

window.VendedorScreen = VendedorScreen;
