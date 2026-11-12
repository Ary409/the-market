// Dashboard del administrador — indicadores ampliados (Fase 2.7)

function DashboardScreen() {
  const [data,    setData]    = React.useState(null);
  const [recs,    setRecs]    = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      API.getDashboard().catch(() => null),
      API.getRecomendaciones("pendiente").catch(() => []),
    ]).then(([d, r]) => { setData(d); setRecs(r || []); })
      .finally(() => setLoading(false));
  }

  React.useEffect(load, []);

  if (loading) return <DashboardSkeleton />;

  const d = data || {};
  const vh = d.ventas_hoy    || { total: 0, cantidad: 0 };
  const vs = d.ventas_semana || { total: 0, cantidad: 0 };
  const vm = d.ventas_mes    || { total: 0, cantidad: 0 };
  const gm = d.ganancias_mes || { ingresos: 0, ganancia: 0 };
  const cd = d.clientes_con_deuda || { cantidad: 0, total_por_cobrar: 0, top: [] };
  const al = d.alertas       || { bajo_stock: 0, por_vencer: 0, agotados: 0, recomendaciones_pendientes: 0 };
  const caja = d.caja_actual;

  const metrics = [
    {
      label: "Ventas hoy",
      value: fmtMoney(vh.total),
      delta: `${vh.cantidad} venta${vh.cantidad !== 1 ? "s" : ""}`,
      trend: vh.cantidad > 0 ? "up" : "neutral",
      sub: `semana: ${fmtMoney(vs.total)}`,
    },
    {
      label: "Ventas del mes",
      value: fmtMoney(vm.total),
      delta: `Ganancia ${fmtMoney(gm.ganancia)}`,
      trend: gm.ganancia > 0 ? "up" : "neutral",
      sub: `${vm.cantidad} transacciones`,
    },
    {
      label: "Por cobrar (crédito)",
      value: fmtMoney(cd.total_por_cobrar),
      delta: `${cd.cantidad} cliente${cd.cantidad !== 1 ? "s" : ""}`,
      trend: cd.total_por_cobrar > 0 ? "down" : "up",
      sub: cd.top && cd.top[0] ? `mayor deuda: ${cd.top[0].nombre}` : "sin deudas activas",
    },
    {
      label: "Inventario",
      value: String(al.bajo_stock + al.agotados),
      delta: al.agotados > 0 ? `${al.agotados} agotados` : "Sin agotados",
      trend: al.agotados > 0 ? "down" : al.bajo_stock > 0 ? "down" : "up",
      sub: `${al.bajo_stock} bajo mínimo · ${al.por_vencer} por vencer`,
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Métricas principales */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* Caja */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background: caja ? "#ECFDF3" : "var(--paper)", border:`1px solid ${caja ? "#BBF7D0" : "var(--border)"}`, borderRadius:10 }}>
        <Icon name="wallet" size={16} />
        <span style={{ font:"500 13px var(--font-sans)" }}>
          Caja {caja ? "abierta" : "cerrada"}
        </span>
        {caja && (
          <span style={{ font:"400 12px var(--font-sans)", color:"var(--fg-muted)" }}>
            fondo inicial {fmtMoney(caja.monto_inicial)} · desde {new Date(caja.fecha_apertura).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}
          </span>
        )}
      </div>

      {/* Recomendaciones */}
      <RecomendacionesPanel recs={recs} onChange={load} />

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, alignItems:"start" }}>
        {/* Últimas ventas */}
        <Card title="Últimas ventas" subtitle="5 transacciones más recientes" noPadding>
          {!d.ultimas_ventas || d.ultimas_ventas.length === 0
            ? <div style={{ padding:"40px 20px", textAlign:"center", color:"var(--fg-muted)", fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                <Icon name="shopping-cart" size={22} />
                Sin ventas registradas aún
              </div>
            : <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr><Th>Recibo</Th><Th>Hora</Th><Th>Vendedor</Th><Th>Pago</Th><Th align="right">Total</Th></tr>
                </thead>
                <tbody>
                  {d.ultimas_ventas.map(v => (
                    <tr key={v.id} style={{ borderTop:"1px solid var(--border)" }}>
                      <Td><span style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{v.numero_recibo}</span></Td>
                      <Td>{new Date(v.fecha).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</Td>
                      <Td>{v.vendedor}</Td>
                      <Td><Badge variant={v.metodo_pago==='efectivo'?'success':v.metodo_pago==='credito'?'warning':'neutral'}>{v.metodo_pago}</Badge></Td>
                      <Td align="right" mono>{fmtMoney(v.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Card>

        {/* Top del mes */}
        <Card title="Más vendidos del mes" subtitle="Top 5 por unidades" noPadding>
          {(!d.top_productos_mes || d.top_productos_mes.length === 0)
            ? <div style={{ padding:"30px 20px", textAlign:"center", color:"var(--fg-muted)", fontSize:13 }}>Sin datos este mes</div>
            : <ul style={{ margin:0, padding:0, listStyle:"none" }}>
                {d.top_productos_mes.map((p, i) => (
                  <li key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ font:"600 12px var(--font-mono)", color:"var(--fg-subtle)", width:16 }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ font:"500 13px var(--font-sans)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nombre}</div>
                      <div style={{ font:"400 11px var(--font-sans)", color:"var(--fg-muted)" }}>{p.unidades} uds · {fmtMoney(p.ingresos)}</div>
                    </div>
                  </li>
                ))}
              </ul>}
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" }}>
        {/* Stock bajo / agotados */}
        <LowStockPanel productos={[...(d.productos_agotados||[]).map(p=>({...p, stock:0, stock_minimo:0})), ...(d.productos_bajo_stock||[])]} />

        {/* Compras recientes */}
        <Card title="Compras recientes" subtitle="Últimas órdenes a proveedores" noPadding>
          {(!d.compras_recientes || d.compras_recientes.length === 0)
            ? <div style={{ padding:"30px 20px", textAlign:"center", color:"var(--fg-muted)", fontSize:13 }}>Sin órdenes de compra</div>
            : <ul style={{ margin:0, padding:0, listStyle:"none" }}>
                {d.compras_recientes.map(o => (
                  <li key={o.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ font:"500 13px var(--font-sans)" }}>{o.proveedor}</div>
                      <div style={{ font:"400 11px var(--font-sans)", color:"var(--fg-muted)" }}>{new Date(o.fecha).toLocaleDateString('es',{day:'2-digit',month:'short'})}</div>
                    </div>
                    <Badge variant={o.estado==='recibida'?'success':o.estado==='cancelada'?'neutral':'warning'}>{o.estado}</Badge>
                    <span style={{ font:"600 13px var(--font-sans)", fontVariantNumeric:"tabular-nums" }}>{fmtMoney(o.total)}</span>
                  </li>
                ))}
              </ul>}
        </Card>
      </div>
    </div>
  );
}

// ── Recomendaciones inteligentes ──────────────────────────────────────────────

const REC_LABELS = {
  reponer_urgente:         { label: "Reponer urgente",    variant: "danger"  },
  realizar_pedido:         { label: "Hacer pedido",       variant: "warning" },
  aumentar_inventario:     { label: "Aumentar inventario",variant: "warning" },
  revisar_producto:        { label: "Revisar producto",   variant: "neutral" },
  considerar_descontinuar: { label: "Poco movimiento",    variant: "neutral" },
};

function RecomendacionesPanel({ recs, onChange }) {
  const [busy, setBusy] = React.useState(null);

  if (!recs || recs.length === 0) return null;

  async function marcar(rec, estado) {
    setBusy(rec.id);
    try { await API.updateRecomendacion(rec.id, estado); onChange(); }
    catch (e) { alert(e.message); }
    finally  { setBusy(null); }
  }

  return (
    <Card title="Recomendaciones" subtitle={`${recs.length} sugerencia${recs.length!==1?"s":""} del sistema tras el último cierre`} noPadding>
      <ul style={{ margin:0, padding:0, listStyle:"none", maxHeight:280, overflowY:"auto" }}>
        {recs.map(r => {
          const meta = REC_LABELS[r.tipo] || { label: r.tipo, variant: "neutral" };
          return (
            <li key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--border)" }}>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <span style={{ flex:1, font:"400 13px var(--font-sans)", color:"var(--fg)" }}>{r.mensaje}</span>
              <div style={{ display:"inline-flex", gap:6 }}>
                <Button variant="secondary" size="sm" disabled={busy===r.id} onClick={() => marcar(r, "atendida")}>Atendida</Button>
                <Button variant="secondary" size="sm" disabled={busy===r.id} onClick={() => marcar(r, "descartada")}>Descartar</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function MetricCard({ label, value, delta, trend, sub }) {
  const colors = {
    up:      { bg:"#ECFDF3", fg:"#15803D", bd:"#BBF7D0", icon:"arrow-up"   },
    down:    { bg:"#FEF2F2", fg:"#991B1B", bd:"#FECACA", icon:"arrow-down" },
    neutral: { bg:"#F7F7F7", fg:"#525252", bd:"#E5E5E5", icon:null         },
  };
  const c = colors[trend];
  return (
    <div style={{ background:"var(--paper)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
      <span style={{ font:"500 12px var(--font-sans)", color:"var(--fg-muted)" }}>{label}</span>
      <span style={{ font:"600 28px var(--font-sans)", letterSpacing:"-0.022em", color:"var(--ink-100)", fontVariantNumeric:"tabular-nums" }}>{value}</span>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:999, background:c.bg, color:c.fg, border:`1px solid ${c.bd}`, font:"600 11px var(--font-sans)" }}>
          {c.icon && <Icon name={c.icon} size={10} strokeWidth={2.5} />}
          {delta}
        </span>
        <span style={{ font:"400 11px var(--font-sans)", color:"var(--fg-muted)" }}>{sub}</span>
      </div>
    </div>
  );
}

function LowStockPanel({ productos }) {
  if (productos.length === 0) {
    return (
      <Card title="Stock bajo" subtitle="Sin alertas activas">
        <EmptyState icon="check" title="Todo en orden" body="Todos los productos están sobre el mínimo." />
      </Card>
    );
  }
  return (
    <Card title="Stock bajo y agotados" subtitle={`${productos.length} producto${productos.length!==1?"s":""} requieren reposición`} noPadding>
      <ul style={{ margin:0, padding:0, listStyle:"none", maxHeight:260, overflowY:"auto" }}>
        {productos.map(p => {
          const initials = p.nombre.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
          return (
            <li key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--border)" }}>
              <Thumb initials={initials} size={28} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ font:"500 13px var(--font-sans)", color:"var(--ink-100)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nombre}</div>
                <div style={{ font:"400 12px var(--font-sans)", color:"var(--fg-muted)" }}>{p.stock === 0 ? (p.categoria || "") : `Mín. ${p.stock_minimo}`}</div>
              </div>
              <Badge variant={p.stock===0?"danger":"warning"}>{p.stock===0?"Agotado":`${p.stock}`}</Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DashboardSkeleton() {
  const box = (w,h) => <div style={{ width:w, height:h, borderRadius:6, background:"var(--ink-10)", animation:"pulse 1.4s ease-in-out infinite" }} />;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ background:"var(--paper)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
            {box("60%",12)}{box("40%",28)}{box("80%",10)}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
