function CajaScreen() {
  const [caja,      setCaja]      = React.useState(null);
  const [sesiones,  setSesiones]  = React.useState([]);
  const [loading,   setLoading]   = React.useState(true);
  const [showAbrir, setShowAbrir] = React.useState(false);
  const [showCerrar,setShowCerrar]= React.useState(false);
  const [cierre,    setCierre]    = React.useState(null); // resultado del cierre
  const [error,     setError]     = React.useState('');

  async function cargar() {
    setLoading(true);
    try {
      const [actual, hist] = await Promise.all([
        API.getCajaActual(),
        API.getSesionesCaja(),
      ]);
      setCaja(actual);
      setSesiones(hist || []);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { cargar(); }, []);

  async function handleAbrir(monto) {
    try {
      const nueva = await API.abrirCaja(parseFloat(monto));
      setCaja(nueva);
      setShowAbrir(false);
      cargar();
    } catch(e) {
      throw e;
    }
  }

  async function handleCerrar(montoCont) {
    try {
      const res = await API.cerrarCaja(parseFloat(montoCont));
      setCaja(null);
      setCierre(res);
      setShowCerrar(false);
      cargar();
    } catch(e) {
      throw e;
    }
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {error && <div style={{ padding:'12px 16px', background:'var(--danger-bg)', border:'1px solid var(--danger-bd)', borderRadius:8, color:'var(--danger)', fontSize:13 }}>{error}</div>}

      {/* Resumen de cierre reciente */}
      {cierre && <ResumenCierre data={cierre} onClose={() => setCierre(null)} />}

      {/* Estado de caja */}
      {caja
        ? <CajaAbierta caja={caja} onCerrar={() => setShowCerrar(true)} />
        : <CajaCerrada onAbrir={() => setShowAbrir(true)} />}

      {/* Historial */}
      <Card title="Historial de sesiones" subtitle="Últimas sesiones de caja" noPadding>
        {sesiones.length === 0
          ? <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--fg-muted)', fontSize:13 }}>Sin sesiones registradas</div>
          : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <Th>Sesión</Th><Th>Fecha</Th><Th>Apertura</Th><Th>Cierre</Th>
                  <Th align="right">Monto inicial</Th><Th align="right">Contado</Th>
                  <Th align="right">Diferencia</Th><Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map(s => {
                  const dif = s.diferencia;
                  return (
                    <tr key={s.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <Td><span style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>S-{String(s.id).padStart(4,'0')}</span></Td>
                      <Td>{new Date(s.fecha_apertura).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</Td>
                      <Td>{new Date(s.fecha_apertura).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</Td>
                      <Td>{s.fecha_cierre ? new Date(s.fecha_cierre).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}</Td>
                      <Td align="right" mono>{fmtMoney(s.monto_inicial)}</Td>
                      <Td align="right" mono>{s.monto_contado != null ? fmtMoney(s.monto_contado) : '—'}</Td>
                      <Td align="right" mono>
                        {dif != null
                          ? <span style={{ color: dif >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {dif >= 0 ? '+' : ''}{fmtMoney(dif)}
                            </span>
                          : '—'}
                      </Td>
                      <Td><Badge variant={s.estado === 'abierta' ? 'success' : 'neutral'} dot>{s.estado}</Badge></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </Card>

      <AbrirCajaModal open={showAbrir} onClose={() => setShowAbrir(false)} onAbrir={handleAbrir} />
      <CerrarCajaModal open={showCerrar} onClose={() => setShowCerrar(false)} caja={caja} onCerrar={handleCerrar} />
    </div>
  );
}

function CajaAbierta({ caja, onCerrar }) {
  const horaAp = new Date(caja.fecha_apertura).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'flex-start', gap:20, marginBottom:20 }}>
        <div style={{ width:44, height:44, background:'#ECFDF3', border:'1px solid #BBF7D0', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#15803D' }}>
          <Icon name="wallet" size={22} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h2 style={{ margin:0, font:'600 18px var(--font-sans)', color:'var(--ink-100)' }}>Caja abierta</h2>
            <Badge variant="success" dot>Activa</Badge>
          </div>
          <p style={{ margin:'4px 0 0', font:'400 13px var(--font-sans)', color:'var(--fg-muted)' }}>
            Sesión #{caja.id} · Abierta a las {horaAp}
          </p>
        </div>
        <Button variant="secondary-danger" onClick={onCerrar}>Cerrar caja</Button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, borderTop:'1px solid var(--border)', paddingTop:20 }}>
        <CajaStat label="Monto inicial" value={fmtMoney(caja.monto_inicial)} muted />
        <CajaStat label="Estado" value="Abierta" />
      </div>
    </Card>
  );
}

function CajaCerrada({ onAbrir }) {
  return (
    <Card>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px', textAlign:'center', gap:4 }}>
        <div style={{ width:56, height:56, borderRadius:12, background:'var(--ink-05)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--fg-muted)', marginBottom:12 }}>
          <Icon name="wallet" size={26} />
        </div>
        <div style={{ font:'600 18px var(--font-sans)', color:'var(--ink-100)' }}>Caja cerrada</div>
        <div style={{ font:'400 13px var(--font-sans)', color:'var(--fg-muted)', maxWidth:360 }}>
          Abre la caja para empezar a registrar ventas. Necesitarás ingresar el monto inicial en efectivo.
        </div>
        <div style={{ marginTop:16 }}><Button size="lg" onClick={onAbrir}>Abrir caja</Button></div>
      </div>
    </Card>
  );
}

function ResumenCierre({ data, onClose }) {
  const r = data.resumen;
  return (
    <Card>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h3 style={{ margin:0, font:'600 16px var(--font-sans)' }}>Resumen de cierre</h3>
          <p style={{ margin:'2px 0 0', fontSize:13, color:'var(--fg-muted)' }}>Sesión #{data.sesion.id} cerrada</p>
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--fg-muted)', padding:4 }}>
          <Icon name="x" size={18} />
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        <CajaStat label="Total ventas"     value={fmtMoney(r.total_ventas)} />
        <CajaStat label="Ventas efectivo"  value={fmtMoney(r.ventas_efectivo)} />
        <CajaStat label="Ventas tarjeta"   value={fmtMoney(r.ventas_tarjeta)} />
        <CajaStat label="Fiado (no entra a caja)" value={fmtMoney(r.ventas_credito || 0)} muted />
        <CajaStat label="Cuentas cobradas" value={fmtMoney((r.cobros_credito_efectivo || 0) + (r.cobros_credito_tarjeta || 0))} />
        <CajaStat label="Monto esperado"   value={fmtMoney(r.monto_esperado)} muted />
        <CajaStat label="Monto contado"    value={fmtMoney(data.sesion.monto_contado)} />
        <CajaStat label="Diferencia"       value={(r.diferencia >= 0 ? '+' : '') + fmtMoney(r.diferencia)}
          accent color={r.diferencia >= 0 ? 'var(--success)' : 'var(--danger)'} />
      </div>

      {/* Detalle del turno: fiados y cuentas cobradas */}
      {(data.fiados_turno?.length > 0 || data.cobros_turno?.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:16, borderTop:'1px solid var(--border)', paddingTop:16 }}>
          <div>
            <div style={{ font:'600 12px var(--font-sans)', color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
              Fiados de este turno ({data.fiados_turno?.length || 0})
            </div>
            {(data.fiados_turno || []).length === 0
              ? <span style={{ font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>Nadie llevó fiado</span>
              : (data.fiados_turno || []).map((f, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', font:'400 13px var(--font-sans)', borderBottom:'1px solid var(--border)' }}>
                    <span>{f.cliente} <span style={{ color:'var(--fg-subtle)', fontFamily:'var(--font-mono)', fontSize:11 }}>{f.numero_recibo}</span></span>
                    <span style={{ fontVariantNumeric:'tabular-nums', color:'#B45309' }}>{fmtMoney(f.total)}</span>
                  </div>
                ))}
          </div>
          <div>
            <div style={{ font:'600 12px var(--font-sans)', color:'var(--fg-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
              Cuentas cobradas ({data.cobros_turno?.length || 0})
            </div>
            {(data.cobros_turno || []).length === 0
              ? <span style={{ font:'400 12px var(--font-sans)', color:'var(--fg-muted)' }}>No se cobraron cuentas</span>
              : (data.cobros_turno || []).map((c, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', font:'400 13px var(--font-sans)', borderBottom:'1px solid var(--border)' }}>
                    <span>{c.cliente} <span style={{ color:'var(--fg-subtle)', fontSize:11 }}>({c.metodo})</span></span>
                    <span style={{ fontVariantNumeric:'tabular-nums', color:'#15803D' }}>+{fmtMoney(c.monto)}</span>
                  </div>
                ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function CajaStat({ label, value, muted, accent, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <span style={{ font:'500 12px var(--font-sans)', color:'var(--fg-muted)' }}>{label}</span>
      <span style={{ font:`600 ${accent ? 20 : 17}px var(--font-sans)`, letterSpacing:'-0.011em',
        color: color || (muted ? 'var(--fg-muted)' : 'var(--ink-100)'), fontVariantNumeric:'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function AbrirCajaModal({ open, onClose, onAbrir }) {
  const [monto,   setMonto]   = React.useState('500');
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState('');

  async function handleSubmit() {
    if (!monto || isNaN(parseFloat(monto))) { setError('Ingresa un monto válido'); return; }
    setLoading(true); setError('');
    try { await onAbrir(monto); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Abrir caja" subtitle="Ingresa el monto inicial en efectivo" width={440}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size={14} /> : 'Abrir caja'}</Button></>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {error && <div style={{ padding:'10px 14px', background:'var(--danger-bg)', border:'1px solid var(--danger-bd)', borderRadius:8, color:'var(--danger)', fontSize:13 }}>{error}</div>}
        <TextField label="Monto inicial" value={monto} onChange={e => setMonto(e.target.value)} prefix="L" autoFocus
          help="Esta cantidad se descontará al hacer el corte de caja." />
        <div style={{ padding:'12px 14px', background:'var(--ink-05)', border:'1px solid var(--border)', borderRadius:8, display:'flex', gap:10 }}>
          <Icon name="alert-triangle" size={16} style={{ color:'var(--warning)', marginTop:1, flexShrink:0 }} />
          <span style={{ font:'400 12px var(--font-sans)', color:'var(--fg-muted)', lineHeight:1.5 }}>
            Solo puede haber una caja abierta a la vez. La sesión quedará registrada con tu nombre.
          </span>
        </div>
      </div>
    </Modal>
  );
}

function CerrarCajaModal({ open, onClose, caja, onCerrar }) {
  const [contado, setContado] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState('');

  async function handleSubmit() {
    if (!contado || isNaN(parseFloat(contado))) { setError('Ingresa el monto contado'); return; }
    setLoading(true); setError('');
    try { await onCerrar(contado); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cerrar caja" subtitle="Ingresa el efectivo contado para hacer el corte" width={440}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="secondary-danger" onClick={handleSubmit} disabled={loading}>{loading ? <Spinner size={14} /> : 'Cerrar caja'}</Button></>}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {error && <div style={{ padding:'10px 14px', background:'var(--danger-bg)', border:'1px solid var(--danger-bd)', borderRadius:8, color:'var(--danger)', fontSize:13 }}>{error}</div>}
        <TextField label="Efectivo contado en caja" value={contado} onChange={e => setContado(e.target.value)} prefix="L" autoFocus
          help="Cuenta el efectivo físico en la caja y escribe el total aquí." />
      </div>
    </Modal>
  );
}

window.CajaScreen = CajaScreen;
