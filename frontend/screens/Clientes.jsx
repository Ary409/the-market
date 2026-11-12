// Clientes — cartera y cuenta corriente (crédito), conectado al API real

function ClientesScreen() {
  const [clientes,  setClientes]  = React.useState([]);
  const [total,     setTotal]     = React.useState(0);
  const [page,      setPage]      = React.useState(1);
  const [query,     setQuery]     = React.useState("");
  const [soloCred,  setSoloCred]  = React.useState(false);
  const [loading,   setLoading]   = React.useState(true);
  const [showForm,  setShowForm]  = React.useState(false);
  const [editing,   setEditing]   = React.useState(null);
  const [cuenta,    setCuenta]    = React.useState(null);   // cliente para estado de cuenta
  const [abonando,  setAbonando]  = React.useState(null);   // cliente para abono
  const PER_PAGE = 20;

  React.useEffect(() => {
    const t = setTimeout(load, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, soloCred, page]);

  async function load() {
    setLoading(true);
    try {
      const params = { page: soloCred ? 1 : page, per_page: soloCred ? 200 : PER_PAGE };
      if (query) params.search = query;
      const res = await API.getClientes(params);
      let items = res.items || [];
      if (soloCred) items = items.filter(c => c.saldo > 0);
      setClientes(items);
      setTotal(soloCred ? items.length : (res.total || 0));
    } catch (e) { setClientes([]); }
    finally     { setLoading(false); }
  }

  const totalPages = Math.ceil(total / PER_PAGE);
  const totalDeuda = clientes.reduce((s, c) => s + (c.saldo > 0 ? c.saldo : 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField icon="search" placeholder="Buscar por nombre o teléfono..." value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }} style={{ flex: 1, maxWidth: 400 }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 13px var(--font-sans)", cursor: "pointer", color: "var(--fg)" }}>
          <input type="checkbox" checked={soloCred} onChange={e => { setSoloCred(e.target.checked); setPage(1); }}
            style={{ width: 14, height: 14, accentColor: "var(--ink-100)" }} />
          Solo con cuenta pendiente
        </label>
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={() => { setEditing(null); setShowForm(true); }}>Registrar cliente</Button>
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Cliente</Th>
              <Th>Teléfono</Th>
              <Th align="right">Límite de fiado</Th>
              <Th align="right">Cuenta pendiente</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)", font: "400 13px var(--font-sans)" }}>Cargando…</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState icon="users" title="Sin clientes"
                  body={query ? `No hay resultados para "${query}".` : "Registra tu primer cliente."} />
              </td></tr>
            ) : clientes.map(c => (
              <ClienteRow key={c.id} c={c}
                onEdit={() => { setEditing(c); setShowForm(true); }}
                onCuenta={() => setCuenta(c)}
                onAbono={() => setAbonando(c)}
              />
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--ink-05)" }}>
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
            <b style={{ color: "var(--fg)" }}>{total}</b> cliente{total !== 1 ? "s" : ""}
            {totalDeuda > 0 && <> · por cobrar en esta página: <b style={{ color: "var(--danger)" }}>{fmtMoney(totalDeuda)}</b></>}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
            <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", padding: "0 6px" }}>{page} / {Math.max(1, totalPages)}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
          </div>
        </div>
      </Card>

      <ClienteFormModal open={showForm} cliente={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }} />

      <EstadoCuentaModal cliente={cuenta} onClose={() => setCuenta(null)}
        onAbonar={(c) => { setCuenta(null); setAbonando(c); }}
        onLiquidada={() => { setCuenta(null); load(); }} />

      <AbonoModal cliente={abonando} onClose={() => setAbonando(null)}
        onSaved={() => { setAbonando(null); load(); }} />
    </div>
  );
}

function ClienteRow({ c, onEdit, onCuenta, onAbono }) {
  const [hover, setHover] = React.useState(false);
  const initials = c.nombre.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}>
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Thumb initials={initials} />
          <span style={{ font: "500 13px var(--font-sans)" }}>{c.nombre}</span>
          {!c.activo && <Badge variant="neutral">inactivo</Badge>}
        </div>
      </Td>
      <Td><span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{c.telefono || "—"}</span></Td>
      <Td align="right" mono>{c.limite_credito != null ? fmtMoney(c.limite_credito) : "Sin límite"}</Td>
      <Td align="right">
        {c.saldo > 0
          ? <Badge variant="danger">{fmtMoney(c.saldo)}</Badge>
          : <span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{fmtMoney(0)}</span>}
      </Td>
      <Td align="right">
        <div style={{ display: "inline-flex", gap: 4 }}>
          <IconButton icon="eye"    label="Estado de cuenta" onClick={onCuenta} />
          {c.saldo > 0 && <IconButton icon="wallet" label="Registrar abono" onClick={onAbono} />}
          <IconButton icon="pencil" label="Editar"           onClick={onEdit}   />
        </div>
      </Td>
    </tr>
  );
}

// ── Alta / edición ────────────────────────────────────────────────────────────

function ClienteFormModal({ open, cliente, onClose, onSaved }) {
  const isEdit = !!cliente;
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
  const isAdmin = user && user.rol === "admin";
  const empty = { nombre: "", telefono: "", email: "", direccion: "", permite_credito: false, limite_credito: "", notas: "" };
  const [data,   setData]   = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState("");

  React.useEffect(() => {
    if (open) {
      setError("");
      setData(cliente ? {
        nombre: cliente.nombre, telefono: cliente.telefono || "", email: cliente.email || "",
        direccion: cliente.direccion || "", permite_credito: cliente.permite_credito,
        limite_credito: cliente.limite_credito != null ? String(cliente.limite_credito) : "",
        notas: cliente.notas || "",
      } : empty);
    }
  }, [open, cliente]);

  function set(k, v) { setData(d => ({ ...d, [k]: v })); setError(""); }

  async function handleSave() {
    if (!data.nombre) { setError("El nombre es requerido"); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: data.nombre, telefono: data.telefono || null, email: data.email || null,
        direccion: data.direccion || null, notas: data.notas || null,
      };
      if (isAdmin) {
        payload.limite_credito = data.limite_credito !== "" ? parseFloat(data.limite_credito) : null;
      }
      if (isEdit) await API.updateCliente(cliente.id, payload);
      else        await API.createCliente(payload);
      onSaved();
    } catch (e) { setError(e.message); }
    finally    { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? "Editar cliente" : "Registrar cliente"}
      subtitle={isEdit ? `Modificando "${cliente?.nombre}"` : "Datos del nuevo cliente"}
      width={560}
      footer={<>
        {error && <span style={{ flex: 1, font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar"}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <TextField label="Nombre completo" value={data.nombre} onChange={e => set("nombre", e.target.value)} autoFocus />
          <TextField label="Teléfono" value={data.telefono} onChange={e => set("telefono", e.target.value)} />
          <TextField label="Email" value={data.email} onChange={e => set("email", e.target.value)} />
          <TextField label="Dirección" value={data.direccion} onChange={e => set("direccion", e.target.value)} />
        </div>
        <div style={{ padding: "14px 16px", background: "var(--ink-05)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", lineHeight: 1.5 }}>
            Todo cliente registrado puede llevar <b>fiado</b>: sus compras quedan anotadas
            en su cuenta hasta que las cancele.
          </span>
          {isAdmin && (
            <TextField label="Límite de fiado (opcional)" value={data.limite_credito} onChange={e => set("limite_credito", e.target.value)}
              prefix="L" placeholder="Sin límite" help="Vacío = puede fiar sin tope. Si defines un monto, no podrá deber más que eso." />
          )}
        </div>
        <TextField label="Notas" value={data.notas} onChange={e => set("notas", e.target.value)} placeholder="Observaciones…" />
      </div>
    </Modal>
  );
}

// ── Estado de cuenta (cartelera) ──────────────────────────────────────────────

function EstadoCuentaModal({ cliente, onClose, onAbonar, onLiquidada }) {
  const open = !!cliente;
  const [data,    setData]    = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setData(null);
      API.getEstadoCuenta(cliente.id).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [open, cliente]);

  const fmtFecha = (iso) => iso ? new Date(iso).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <Modal open={open} onClose={onClose}
      title="Estado de cuenta"
      subtitle={cliente ? cliente.nombre : ""}
      width={680}
      footer={<>
        <div style={{ flex: 1 }} />
        {data && data.saldo_pendiente > 0 && (
          <>
            <Button variant="secondary" icon="wallet" onClick={() => onAbonar(cliente)}>Abonar</Button>
            <LiquidarButton cliente={cliente} saldo={data.saldo_pendiente} onDone={onLiquidada} />
          </>
        )}
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </>}
    >
      {loading || !data ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--fg-muted)", font: "400 13px var(--font-sans)" }}>Cargando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Resumen */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <ResumenBox label="Saldo pendiente" value={fmtMoney(data.saldo_pendiente)} danger={data.saldo_pendiente > 0} />
            <ResumenBox label="Límite de crédito" value={data.cliente.limite_credito != null ? fmtMoney(data.cliente.limite_credito) : "Sin límite"} />
            <ResumenBox label="Crédito disponible" value={data.credito_disponible != null ? fmtMoney(data.credito_disponible) : "—"} />
          </div>

          {/* Compras al crédito */}
          <div>
            <div style={{ font: "600 12px var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", marginBottom: 8 }}>
              Compras al crédito ({data.compras_credito.length})
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              {data.compras_credito.length === 0 ? (
                <div style={{ padding: 16, font: "400 12px var(--font-sans)", color: "var(--fg-muted)", textAlign: "center" }}>Sin compras al crédito</div>
              ) : data.compras_credito.map(v => (
                <div key={v.venta_id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ font: "500 12px var(--font-mono)", color: "var(--fg-muted)" }}>{v.numero_recibo}</span>
                    <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-subtle)" }}>{fmtFecha(v.fecha)}</span>
                    <span style={{ font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMoney(v.total)} {v.estado === "anulada" && <Badge variant="neutral">anulada</Badge>}
                    </span>
                  </div>
                  <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", marginTop: 4 }}>
                    {v.productos.map(p => `${p.cantidad}× ${p.nombre}`).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagos */}
          <div>
            <div style={{ font: "600 12px var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", marginBottom: 8 }}>
              Pagos realizados ({data.pagos.length})
            </div>
            <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              {data.pagos.length === 0 ? (
                <div style={{ padding: 16, font: "400 12px var(--font-sans)", color: "var(--fg-muted)", textAlign: "center" }}>Sin pagos registrados</div>
              ) : data.pagos.map(p => (
                <div key={p.id} style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ font: "400 11px var(--font-sans)", color: "var(--fg-subtle)" }}>{fmtFecha(p.fecha)}</span>
                  <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)", textTransform: "capitalize" }}>{p.metodo}{p.notas ? ` · ${p.notas}` : ""}</span>
                  <span style={{ font: "600 13px var(--font-sans)", color: "var(--success, #16a34a)", fontVariantNumeric: "tabular-nums" }}>−{fmtMoney(p.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function LiquidarButton({ cliente, saldo, onDone }) {
  const [busy, setBusy] = React.useState(false);
  async function liquidar() {
    if (!confirm(`¿Liquidar la cuenta completa de ${cliente.nombre} por ${fmtMoney(saldo)}?\n\nSe registrará un pago por el total y la cuenta quedará en cero.`)) return;
    setBusy(true);
    try {
      await API.liquidarCuenta(cliente.id, { metodo: "efectivo" });
      onDone();
    } catch (e) { alert(e.message); }
    finally    { setBusy(false); }
  }
  return <Button onClick={liquidar} disabled={busy}>{busy ? "Liquidando…" : `Liquidar ${fmtMoney(saldo)}`}</Button>;
}

function ResumenBox({ label, value, danger }) {
  return (
    <div style={{ padding: "12px 14px", background: "var(--ink-05)", borderRadius: 8 }}>
      <div style={{ font: "400 11px var(--font-sans)", color: "var(--fg-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ font: "600 16px var(--font-sans)", color: danger ? "var(--danger)" : "var(--ink-100)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

// ── Abono ─────────────────────────────────────────────────────────────────────

function AbonoModal({ cliente, onClose, onSaved }) {
  const open = !!cliente;
  const [monto,  setMonto]  = React.useState("");
  const [metodo, setMetodo] = React.useState("efectivo");
  const [notas,  setNotas]  = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState("");

  React.useEffect(() => {
    if (open) { setMonto(""); setMetodo("efectivo"); setNotas(""); setError(""); }
  }, [open, cliente]);

  async function handleSave() {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) { setError("Indica un monto válido"); return; }
    setSaving(true);
    try {
      await API.registrarAbono(cliente.id, { monto: m, metodo: metodo, notas: notas || null });
      onSaved();
    } catch (e) { setError(e.message); }
    finally    { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Registrar abono"
      subtitle={cliente ? `${cliente.nombre} — deuda: ${fmtMoney(cliente.saldo || 0)}` : ""}
      width={420}
      footer={<>
        {error && <span style={{ flex: 1, font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Registrar abono"}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField label="Monto del abono" value={monto} onChange={e => { setMonto(e.target.value); setError(""); }} prefix="L" placeholder="0.00" autoFocus
          help="El abono disminuye automáticamente la deuda y entra al arqueo de caja" />
        <Select label="Método de pago" value={metodo} onChange={e => setMetodo(e.target.value)}
          options={[{ value: "efectivo", label: "Efectivo" }, { value: "tarjeta", label: "Tarjeta" }]} />
        <TextField label="Notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" />
      </div>
    </Modal>
  );
}

window.ClientesScreen = ClientesScreen;
