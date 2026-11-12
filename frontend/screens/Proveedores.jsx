// Proveedores — conectado al API real

function ProveedoresScreen() {
  const [proveedores, setProveedores] = React.useState([]);
  const [total,       setTotal]       = React.useState(0);
  const [loading,     setLoading]     = React.useState(true);
  const [query,       setQuery]       = React.useState("");
  const [showForm,    setShowForm]    = React.useState(false);
  const [editing,     setEditing]     = React.useState(null);

  React.useEffect(() => {
    const t = setTimeout(load, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query]);

  async function load() {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (query) params.search = query;
      const res = await API.getProveedores(params);
      setProveedores(res.items || []);
      setTotal(res.total || 0);
    } catch { setProveedores([]); }
    finally  { setLoading(false); }
  }

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(p)  { setEditing(p);    setShowForm(true); }
  function onSaved()    { setShowForm(false); load(); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField icon="search" placeholder="Buscar proveedor..." value={query}
          onChange={e => setQuery(e.target.value)} style={{ flex: 1, maxWidth: 400 }} />
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={openCreate}>Agregar proveedor</Button>
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Proveedor</Th>
              <Th>Email</Th>
              <Th>Teléfono</Th>
              <Th>Estado</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)", font: "400 13px var(--font-sans)" }}>Cargando…</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState icon="truck" title="Sin proveedores"
                  body={query ? `No hay resultados para "${query}".` : "Agrega tu primer proveedor."} />
              </td></tr>
            ) : proveedores.map(p => (
              <ProveedorRow key={p.id} p={p} onEdit={() => openEdit(p)} onRefresh={load} />
            ))}
          </tbody>
        </table>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--ink-05)" }}>
          <span style={{ font: "400 12px var(--font-sans)", color: "var(--fg-muted)" }}>
            <b style={{ color: "var(--fg)" }}>{total}</b> proveedor{total !== 1 ? "es" : ""} registrado{total !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>

      <ProveedorFormModal open={showForm} proveedor={editing} onClose={() => setShowForm(false)} onSaved={onSaved} />
    </div>
  );
}

function ProveedorRow({ p, onEdit, onRefresh }) {
  const [hover, setHover] = React.useState(false);
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}>
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--ink-100)", color: "var(--paper)", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="truck" size={15} />
          </div>
          <span style={{ font: "500 13px var(--font-sans)" }}>{p.nombre}</span>
        </div>
      </Td>
      <Td><span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{p.email || "—"}</span></Td>
      <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.telefono || "—"}</span></Td>
      <Td>
        {p.activo
          ? <Badge variant="success" dot>Activo</Badge>
          : <Badge variant="neutral" dot>Inactivo</Badge>}
      </Td>
      <Td align="right">
        <Button size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
      </Td>
    </tr>
  );
}

function ProveedorFormModal({ open, proveedor, onClose, onSaved }) {
  const isEdit = !!proveedor;
  const empty = { nombre: "", telefono: "", email: "", direccion: "" };
  const [data,   setData]   = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState("");

  React.useEffect(() => {
    if (open) {
      setError("");
      setData(proveedor ? {
        nombre:    proveedor.nombre    || "",
        telefono:  proveedor.telefono  || "",
        email:     proveedor.email     || "",
        direccion: proveedor.direccion || "",
      } : empty);
    }
  }, [open, proveedor]);

  function set(k, v) { setData(d => ({ ...d, [k]: v })); setError(""); }

  async function handleSave() {
    if (!data.nombre) { setError("El nombre es requerido"); return; }
    setSaving(true);
    try {
      if (isEdit) await API.updateProveedor(proveedor.id, data);
      else        await API.createProveedor(data);
      onSaved();
    } catch (e) { setError(e.message); }
    finally    { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? "Editar proveedor" : "Agregar proveedor"}
      subtitle={isEdit ? `Modificando "${proveedor?.nombre}"` : "Registra un nuevo proveedor"}
      width={520}
      footer={<>
        {error && <span style={{ flex: 1, font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar proveedor"}
        </Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField label="Nombre del proveedor" value={data.nombre}    onChange={e => set("nombre",    e.target.value)} placeholder="Ej. Distribuidora Centro" autoFocus />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <TextField label="Teléfono"        value={data.telefono}  onChange={e => set("telefono",  e.target.value)} placeholder="55 1234 5678" />
          <TextField label="Email (opcional)" value={data.email}     onChange={e => set("email",     e.target.value)} placeholder="ventas@proveedor.com" />
        </div>
        <TextField label="Dirección (opcional)" value={data.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Calle, colonia, ciudad" />
      </div>
    </Modal>
  );
}

window.ProveedoresScreen = ProveedoresScreen;
