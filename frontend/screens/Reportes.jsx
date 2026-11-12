function ReportesScreen() {
  const [tab,    setTab]    = React.useState("ventas");
  const [rango,  setRango]  = React.useState("7");
  const [data,   setData]   = React.useState(null);
  const [loading,setLoading]= React.useState(true);
  const [error,  setError]  = React.useState('');

  function getRango() {
    const hasta = new Date();
    const desde = new Date();
    const dias = parseInt(rango);
    desde.setDate(desde.getDate() - (dias - 1));
    desde.setHours(0,0,0,0);
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }

  async function cargar() {
    setLoading(true); setError('');
    const params = getRango();
    try {
      const [ventas, top, ganancia, analitica] = await Promise.all([
        API.getReporteVentas(params),
        API.getTopProductos({ ...params, limite: 10 }),
        API.getGananciaBruta(params),
        API.getAnalitica(Math.max(parseInt(rango), 7)),
      ]);
      setData({ ventas, top, ganancia, analitica });
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  React.useEffect(() => { cargar(); }, [rango]);

  const tabs = [
    { id:"ventas",   label:"Ventas" },
    { id:"top",      label:"Más vendidos" },
    { id:"ganancia", label:"Ganancia" },
    { id:"turnos",   label:"Turnos de caja" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <Select value={rango} onChange={e => setRango(e.target.value)} options={[
          { value:"1",  label:"Hoy" },
          { value:"7",  label:"Últimos 7 días" },
          { value:"30", label:"Últimos 30 días" },
          { value:"90", label:"Últimos 3 meses" },
        ]} />
        <div style={{ flex:1 }} />
        <Button variant="secondary" icon="download" onClick={() => API.exportarInventarioCSV().catch(e => alert(e.message))}>Inventario (CSV)</Button>
        <Button icon="download" onClick={() => API.exportarVentasPDF(getRango()).catch(e => alert(e.message))}>Ventas (PDF)</Button>
        <Button variant="secondary" icon="download" onClick={() => API.exportarVentasCSV(getRango()).catch(e => alert(e.message))}>CSV</Button>
      </div>

      {/* Los números que más importan: hoy / semana / mes con su ganancia */}
      {data && data.analitica && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { label:"Hoy",       d: data.analitica.hoy },
            { label:"Esta semana", d: data.analitica.semana },
            { label:"Este mes",  d: data.analitica.mes },
          ].map(k => (
            <div key={k.label} style={{ background:"var(--paper)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 18px", display:"flex", flexDirection:"column", gap:6 }}>
              <span style={{ font:"500 12px var(--font-sans)", color:"var(--fg-muted)" }}>{k.label}</span>
              <span style={{ font:"600 24px var(--font-sans)", letterSpacing:"-0.022em", fontVariantNumeric:"tabular-nums" }}>{fmtMoney(k.d.ventas)}</span>
              <span style={{ font:"400 12px var(--font-sans)", color:"var(--fg-muted)" }}>
                Ganancia <b style={{ color:"#15803D" }}>{fmtMoney(k.d.ganancia)}</b> · {k.d.transacciones} venta{k.d.transacciones!==1?"s":""}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:4, borderBottom:"1px solid var(--border)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background:"transparent", border:"none", padding:"10px 16px",
            font:`${tab===t.id?600:500} 13px var(--font-sans)`,
            color:tab===t.id?"var(--ink-100)":"var(--fg-muted)",
            borderBottom:`2px solid ${tab===t.id?"var(--ink-100)":"transparent"}`,
            marginBottom:-1, cursor:"pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {error && <div style={{ padding:"12px 16px", background:"var(--danger-bg)", border:"1px solid var(--danger-bd)", borderRadius:8, color:"var(--danger)", fontSize:13 }}>{error}</div>}

      {loading
        ? <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={28} /></div>
        : data && <>
            {tab === "ventas"   && <VentasReport   data={data.ventas} serie={data.analitica ? data.analitica.serie_diaria : []} />}
            {tab === "top"      && <TopProductosReport data={data.top} />}
            {tab === "ganancia" && <GananciaReport data={data.ganancia} />}
            {tab === "turnos"   && <TurnosReport turnos={data.analitica ? data.analitica.turnos : []} />}
          </>}
    </div>
  );
}

// ── Turnos de caja ────────────────────────────────────────────────────────────

function TurnosReport({ turnos }) {
  if (!turnos || turnos.length === 0) {
    return <Card><EmptyState icon="wallet" title="Sin turnos" body="Aún no se han abierto sesiones de caja." /></Card>;
  }
  const fmtF = iso => iso ? new Date(iso).toLocaleString("es", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";
  return (
    <Card title="Transacciones por turno" subtitle="Últimas sesiones de caja con sus ventas" noPadding>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            <Th>Turno</Th><Th>Quién abrió</Th><Th>Apertura</Th><Th>Cierre</Th>
            <Th align="right">Transacciones</Th><Th align="right">Total vendido</Th>
            <Th align="right">Diferencia</Th><Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {turnos.map(t => (
            <tr key={t.id} style={{ borderTop:"1px solid var(--border)" }}>
              <Td><span style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>S-{String(t.id).padStart(4,"0")}</span></Td>
              <Td>{t.usuario}</Td>
              <Td>{fmtF(t.apertura)}</Td>
              <Td>{fmtF(t.cierre)}</Td>
              <Td align="right">{t.transacciones}</Td>
              <Td align="right" mono>{fmtMoney(t.total_ventas)}</Td>
              <Td align="right" mono>
                {t.diferencia != null
                  ? <span style={{ color: t.diferencia >= 0 ? "var(--success)" : "var(--danger)" }}>{t.diferencia >= 0 ? "+" : ""}{fmtMoney(t.diferencia)}</span>
                  : "—"}
              </Td>
              <Td><Badge variant={t.estado === "abierta" ? "success" : "neutral"} dot>{t.estado}</Badge></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function VentasReport({ data, serie }) {
  if (!data) return null;
  const dias = data.por_dia || [];
  const max  = Math.max(...dias.map(d => d.total), 1);
  const gananciaPorDia = {};
  (serie || []).forEach(s => { gananciaPorDia[s.fecha] = s.ganancia; });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Métricas resumen */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {[
          { label:"Total ingresos",   value: fmtMoney(data.total) },
          { label:"Transacciones",    value: String(data.cantidad) },
          { label:"Ticket promedio",  value: fmtMoney(data.ticket_promedio) },
        ].map(m => (
          <div key={m.label} style={{ background:"var(--paper)", border:"1px solid var(--border)", borderRadius:10, padding:"18px 20px" }}>
            <div style={{ font:"500 12px var(--font-sans)", color:"var(--fg-muted)", marginBottom:8 }}>{m.label}</div>
            <div style={{ font:"600 24px var(--font-sans)", letterSpacing:"-0.022em", fontVariantNumeric:"tabular-nums" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de barras */}
      {dias.length > 0 && (
        <Card title="Ventas por día" subtitle={`Total: ${fmtMoney(data.total)}`}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, height:220, paddingTop:8 }}>
            {dias.map((d,i) => {
              const h = (d.total / max) * 100;
              const last = i === dias.length-1;
              const label = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric'});
              return (
                <div key={d.fecha} style={{ flex:1, alignSelf:"stretch", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  <span style={{ font:"500 10px var(--font-sans)", color:"var(--fg-muted)", fontVariantNumeric:"tabular-nums" }}>
                    {d.total >= 1000 ? (d.total/1000).toFixed(1)+'k' : fmtMoney(d.total)}
                  </span>
                  <div style={{ width:"100%", flex:1, display:"flex", alignItems:"flex-end" }}>
                    <div style={{ width:"100%", height:`${Math.max(h,2)}%`, background:last?"var(--ink-100)":"var(--ink-20)", borderRadius:4 }} />
                  </div>
                  <span style={{ font:"500 10px var(--font-sans)", color:last?"var(--ink-100)":"var(--fg-muted)", textAlign:"center" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tabla detalle */}
      {dias.length > 0 && (
        <Card noPadding>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><Th>Fecha</Th><Th align="right">Transacciones</Th><Th align="right">Ticket promedio</Th><Th align="right">Ganancia</Th><Th align="right">Total</Th></tr></thead>
            <tbody>
              {dias.map(d => (
                <tr key={d.fecha} style={{ borderTop:"1px solid var(--border)" }}>
                  <Td>{new Date(d.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</Td>
                  <Td align="right">{d.cantidad}</Td>
                  <Td align="right" mono>{fmtMoney(d.cantidad ? d.total/d.cantidad : 0)}</Td>
                  <Td align="right" mono><span style={{ color:"#15803D" }}>{gananciaPorDia[d.fecha] != null ? fmtMoney(gananciaPorDia[d.fecha]) : "—"}</span></Td>
                  <Td align="right" mono>{fmtMoney(d.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {dias.length === 0 && (
        <Card><EmptyState icon="bar-chart-3" title="Sin ventas en este período" body="Registra ventas para ver el reporte." /></Card>
      )}
    </div>
  );
}

function TopProductosReport({ data }) {
  if (!data || data.length === 0) return (
    <Card><EmptyState icon="package" title="Sin datos" body="No hay ventas en el período seleccionado." /></Card>
  );
  const max           = Math.max(...data.map(d => d.unidades), 1);
  const totalIngresos = data.reduce((a,b) => a + b.ingresos, 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card title="Top productos por unidades vendidas">
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {data.map(p => (
            <div key={p.id} style={{ display:"grid", gridTemplateColumns:"200px 1fr 100px", gap:16, alignItems:"center" }}>
              <span style={{ font:"500 13px var(--font-sans)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nombre}</span>
              <div style={{ height:18, background:"var(--ink-05)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${(p.unidades/max)*100}%`, height:"100%", background:"var(--ink-100)", borderRadius:4 }} />
              </div>
              <span style={{ font:"600 13px var(--font-sans)", fontVariantNumeric:"tabular-nums", textAlign:"right" }}>{p.unidades} und</span>
            </div>
          ))}
        </div>
      </Card>
      <Card noPadding>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr><Th>Producto</Th><Th align="right">Unidades</Th><Th align="right">Ingresos</Th><Th align="right">% del total</Th></tr></thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id} style={{ borderTop:"1px solid var(--border)" }}>
                <Td>{p.nombre}</Td>
                <Td align="right">{p.unidades}</Td>
                <Td align="right" mono>{fmtMoney(p.ingresos)}</Td>
                <Td align="right">{totalIngresos ? ((p.ingresos/totalIngresos)*100).toFixed(1) : 0}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function GananciaReport({ data }) {
  if (!data) return null;
  const cats = data.por_categoria || [];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {[
          { label:"Ingresos totales", value:fmtMoney(data.total_ingresos) },
          { label:"Ganancia bruta",   value:fmtMoney(data.total_ganancia), accent:true },
          { label:"Margen promedio",  value:`${data.margen_promedio?.toFixed(1) ?? 0}%` },
        ].map(m => (
          <div key={m.label} style={{ background:m.accent?"var(--ink-100)":"var(--paper)", color:m.accent?"var(--paper)":"var(--ink-100)", border:`1px solid ${m.accent?"var(--ink-100)":"var(--border)"}`, borderRadius:10, padding:"18px 20px", display:"flex", flexDirection:"column", gap:8 }}>
            <span style={{ font:"500 12px var(--font-sans)", color:m.accent?"rgba(255,255,255,0.7)":"var(--fg-muted)" }}>{m.label}</span>
            <span style={{ font:"600 26px var(--font-sans)", letterSpacing:"-0.022em", fontVariantNumeric:"tabular-nums" }}>{m.value}</span>
          </div>
        ))}
      </div>
      {cats.length > 0 && (
        <Card noPadding>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><Th>Categoría</Th><Th align="right">Unidades</Th><Th align="right">Ingresos</Th><Th align="right">Ganancia</Th><Th align="right">Margen</Th></tr></thead>
            <tbody>
              {cats.map(c => (
                <tr key={c.categoria} style={{ borderTop:"1px solid var(--border)" }}>
                  <Td>{c.categoria}</Td>
                  <Td align="right">{c.unidades}</Td>
                  <Td align="right" mono>{fmtMoney(c.ingresos)}</Td>
                  <Td align="right" mono>{fmtMoney(c.ganancia)}</Td>
                  <Td align="right">{c.ingresos ? ((c.ganancia/c.ingresos)*100).toFixed(1) : 0}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {cats.length === 0 && (
        <Card><EmptyState icon="trending-up" title="Sin datos" body="No hay ventas en el período seleccionado." /></Card>
      )}
    </div>
  );
}

window.ReportesScreen = ReportesScreen;
