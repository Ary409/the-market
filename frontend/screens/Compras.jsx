function ComprasScreen() {
  const [ordenes,   setOrdenes]   = React.useState([]);
  const [loading,   setLoading]   = React.useState(true);
  const [filtro,    setFiltro]    = React.useState("todos");
  const [showNew,   setShowNew]   = React.useState(false);
  const [error,     setError]     = React.useState('');

  async function cargar() {
    setLoading(true); setError('');
    try {
      const params = filtro !== "todos" ? { estado: filtro } : {};
      const res = await API.getCompras(params);
      setOrdenes(res.items || []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  React.useEffect(() => { cargar(); }, [filtro]);

  async function handleRecibir(id) {
    if (!confirm("¿Confirmar recepción de mercadería? Esto actualizará el stock de todos los productos.")) return;
    try {
      await API.recibirCompra(id);
      cargar();
    } catch(e) { alert(e.message); }
  }

  async function handleCancelar(id) {
    if (!confirm("¿Cancelar esta orden de compra?")) return;
    try {
      await API.cancelarCompra(id);
      cargar();
    } catch(e) { alert(e.message); }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {error && <div style={{ padding:'12px 16px', background:'var(--danger-bg)', border:'1px solid var(--danger-bd)', borderRadius:8, color:'var(--danger)', fontSize:13 }}>{error}</div>}

      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <Select value={filtro} onChange={e => setFiltro(e.target.value)}
          options={[{value:"todos",label:"Todos los estados"},{value:"pendiente",label:"Pendientes"},{value:"recibida",label:"Recibidas"},{value:"cancelada",label:"Canceladas"}]}
        />
        <div style={{ flex:1 }} />
        <Button icon="plus" onClick={() => setShowNew(true)}>Nueva orden</Button>
      </div>

      <Card noPadding>
        {loading
          ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner size={24} /></div>
          : ordenes.length === 0
          ? <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--fg-muted)', fontSize:13 }}>Sin órdenes de compra</div>
          : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr><Th>Orden</Th><Th>Proveedor</Th><Th>Fecha</Th><Th align="right">Items</Th>
                    <Th align="right">Total</Th><Th>Estado</Th><Th></Th></tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} style={{ borderTop:"1px solid var(--border)" }}>
                    <Td><span style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>OC-{String(o.id).padStart(4,'0')}</span></Td>
                    <Td>{o.proveedor?.nombre || '—'}</Td>
                    <Td>{new Date(o.fecha).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</Td>
                    <Td align="right">{o.detalles?.length ?? 0}</Td>
                    <Td align="right" mono>{fmtMoney(o.total)}</Td>
                    <Td>
                      {o.estado === "pendiente" ? <Badge variant="warning" dot>Pendiente</Badge>
                        : o.estado === "cancelada" ? <Badge variant="neutral" dot>Cancelada</Badge>
                        : <Badge variant="success" dot>Recibida</Badge>}
                    </Td>
                    <Td align="right" style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'wrap' }}>
                      <Button size="sm" variant="secondary" icon="download"
                        onClick={() => API.descargarOrdenPDF(o.id, 'carta').catch(e => alert(e.message))}
                        title="PDF tamaño carta para el repartidor">PDF</Button>
                      <Button size="sm" variant="secondary"
                        onClick={() => API.descargarOrdenPDF(o.id, 'ticket').catch(e => alert(e.message))}
                        title="Ticket para máquina térmica 80mm">Ticket</Button>
                      {o.estado === "pendiente" && <>
                        <Button size="sm" variant="secondary" onClick={() => handleRecibir(o.id)}>Marcar recibida</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancelar(o.id)}>Cancelar</Button>
                      </>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>

      <NuevaOrdenModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); cargar(); }} />
    </div>
  );
}

function NuevaOrdenModal({ open, onClose, onCreated }) {
  const [proveedores, setProveedores] = React.useState([]);
  const [provId,   setProvId]   = React.useState('');
  const [items,    setItems]    = React.useState([]);      // { producto, cantidad, precio_unitario }
  const [query,    setQuery]    = React.useState('');
  const [sugerencias, setSugerencias] = React.useState([]);
  const [loading,  setLoading]  = React.useState(false);
  const [error,    setError]    = React.useState('');
  const [notas,    setNotas]    = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setItems([]); setQuery(''); setSugerencias([]); setError(''); setNotas('');
    API.getProveedores({ per_page: 200 })
      .then(res => {
        setProveedores(res.items || []);
        if (res.items?.length) setProvId(String(res.items[0].id));
      })
      .catch(e => setError('No se pudieron cargar los proveedores: ' + e.message));
  }, [open]);

  // Búsqueda de productos del inventario (con debounce)
  React.useEffect(() => {
    if (!open || !query.trim()) { setSugerencias([]); return; }
    const t = setTimeout(() => {
      API.getProductos({ q: query, per_page: 8 })
        .then(res => setSugerencias(res.items || []))
        .catch(() => setSugerencias([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  function agregarProducto(p) {
    setItems(prev => {
      if (prev.some(it => it.producto.id === p.id)) return prev;   // ya está en la lista
      return [...prev, { producto: p, cantidad: 1, precio_unitario: p.precio_compra || 0 }];
    });
    setQuery('');
    setSugerencias([]);
  }

  function updItem(id, k, v) {
    setItems(prev => prev.map(it => it.producto.id === id ? { ...it, [k]: v } : it));
  }

  const total = items.reduce((a, b) => a + ((parseFloat(b.cantidad) || 0) * (parseFloat(b.precio_unitario) || 0)), 0);

  async function handleCrear() {
    const validItems = items.filter(it => parseFloat(it.cantidad) > 0);
    if (!provId) { setError('Selecciona un proveedor'); return; }
    if (!validItems.length) { setError('Agrega al menos un producto del inventario'); return; }
    setLoading(true); setError('');
    try {
      const orden = await API.createCompra({
        proveedor_id: parseInt(provId),
        notas: notas || undefined,
        items: validItems.map(it => ({
          producto_id: it.producto.id,
          cantidad: parseFloat(it.cantidad),
          precio_unitario: parseFloat(it.precio_unitario) || 0,
        })),
      });
      onCreated();
      // Ofrecer el PDF de una vez para dárselo al repartidor
      if (confirm(`Orden OC-${String(orden.id).padStart(4,'0')} creada. ¿Descargar el PDF para el repartidor?`)) {
        API.descargarOrdenPDF(orden.id, 'carta').catch(e => alert(e.message));
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva orden de compra"
      subtitle="Elige el proveedor, busca los productos y define cantidades" width={760}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleCrear} disabled={loading}>{loading ? <Spinner size={14}/> : `Crear orden ${total > 0 ? '· ' + fmtMoney(total) : ''}`}</Button>
      </>}
    >
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {error && <div style={{ padding:'10px 14px', background:'var(--danger-bg)', border:'1px solid var(--danger-bd)', borderRadius:8, color:'var(--danger)', fontSize:13 }}>{error}</div>}

        <Select label="Proveedor" value={provId} onChange={e => setProvId(e.target.value)}
          options={proveedores.length
            ? proveedores.map(p => ({ value: String(p.id), label: p.nombre }))
            : [{ value: '', label: 'No hay proveedores — créalos en el módulo Proveedores' }]} />

        {/* Buscador de productos del inventario */}
        <div style={{ position:'relative' }}>
          <TextField label="Agregar producto del inventario" icon="search" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Busca por nombre, código o SKU…" />
          {sugerencias.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20, background:'var(--paper)', border:'1px solid var(--border-strong)', borderRadius:8, marginTop:4, boxShadow:'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12))', maxHeight:220, overflowY:'auto' }}>
              {sugerencias.map(p => (
                <button key={p.id} onClick={() => agregarProducto(p)}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'9px 14px', background:'transparent', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', textAlign:'left' }}>
                  <span style={{ font:'500 13px var(--font-sans)', color:'var(--fg)' }}>{p.nombre}</span>
                  <span style={{ font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>
                    stock {p.stock} · compra {fmtMoney(p.precio_compra)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items de la orden */}
        {items.length > 0 && (
          <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr><Th>Producto</Th><Th align="right">Stock actual</Th><Th align="right">Cantidad a pedir</Th><Th align="right">Precio compra</Th><Th align="right">Subtotal</Th><Th></Th></tr></thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.producto.id} style={{ borderTop:"1px solid var(--border)" }}>
                    <Td><span style={{ font:'500 13px var(--font-sans)' }}>{it.producto.nombre}</span></Td>
                    <Td align="right"><span style={{ font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>{it.producto.stock}</span></Td>
                    <Td align="right">
                      <input type="number" value={it.cantidad} min={0} step="any"
                        onChange={e => updItem(it.producto.id, 'cantidad', e.target.value)}
                        style={{ width:70, height:28, padding:'0 8px', borderRadius:4, border:'1px solid var(--border-strong)', textAlign:'right', font:'600 13px var(--font-sans)', background:'var(--paper)', color:'var(--fg)' }} />
                    </Td>
                    <Td align="right">
                      <input type="number" step="0.01" value={it.precio_unitario}
                        onChange={e => updItem(it.producto.id, 'precio_unitario', e.target.value)}
                        style={{ width:90, height:28, padding:'0 8px', borderRadius:4, border:'1px solid var(--border-strong)', textAlign:'right', font:'600 13px var(--font-sans)', background:'var(--paper)', color:'var(--fg)' }} />
                    </Td>
                    <Td align="right" mono>{fmtMoney((parseFloat(it.cantidad)||0) * (parseFloat(it.precio_unitario)||0))}</Td>
                    <Td align="right">
                      <button onClick={() => setItems(items.filter(x => x.producto.id !== it.producto.id))}
                        style={{ border:'none', background:'transparent', padding:4, cursor:'pointer', color:'var(--fg-muted)' }}>
                        <Icon name="x" size={14} />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 16px", background:"var(--ink-05)", borderTop:"1px solid var(--border)" }}>
              <span style={{ font:"500 13px var(--font-sans)", color:"var(--fg-muted)" }}>{items.length} producto{items.length!==1?'s':''} · Total estimado</span>
              <span style={{ font:"600 16px var(--font-sans)", fontVariantNumeric:"tabular-nums" }}>{fmtMoney(total)}</span>
            </div>
          </div>
        )}
        {items.length === 0 && (
          <div style={{ padding:'22px 16px', border:'1px dashed var(--border-strong)', borderRadius:8, textAlign:'center', font:'400 13px var(--font-sans)', color:'var(--fg-muted)' }}>
            Busca arriba los productos del inventario que quieres pedir. Al recibir la orden, el stock se sumará solo.
          </div>
        )}

        <TextField label="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Referencia, instrucciones de entrega..." />
      </div>
    </Modal>
  );
}

window.ComprasScreen = ComprasScreen;
