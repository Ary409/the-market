// Usuarios — conectado al API real

function UsuariosScreen() {
  const [usuarios, setUsuarios] = React.useState([]);
  const [loading,  setLoading]  = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [query,    setQuery]    = React.useState("");
  const [rolFiltro, setRolFiltro] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(load, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, rolFiltro]);

  async function load() {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (query)    params.search = query;
      const res = await API.getUsuarios(params);
      let items = res.items || [];
      if (rolFiltro) items = items.filter(u => u.rol === rolFiltro);
      setUsuarios(items);
    } catch { setUsuarios([]); }
    finally  { setLoading(false); }
  }

  async function handleToggle(u) {
    const action = u.activo ? "desactivar" : "reactivar";
    if (!confirm(`¿${action} a ${u.nombre}?`)) return;
    try {
      if (u.activo) await API.deactivateUsuario(u.id);
      else          await API.updateUsuario(u.id, { activo: true });
      load();
    } catch (e) { alert(e.message); }
  }

  async function handleResetPwd(u) {
    if (!confirm(`¿Generar contraseña temporal para ${u.nombre}?`)) return;
    try {
      const res = await API.resetPassword(u.id);
      alert(`Contraseña temporal: ${res.password_temporal}\n\nComunícala de forma segura.`);
    } catch (e) { alert(e.message); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField icon="search" placeholder="Buscar usuario..." value={query}
          onChange={e => setQuery(e.target.value)} style={{ flex: 1, maxWidth: 400 }} />
        <Select value={rolFiltro} onChange={e => setRolFiltro(e.target.value)}
          options={[{ value: "", label: "Todos los roles" }, { value: "admin", label: "Admin" }, { value: "vendedor", label: "Vendedor" }]} />
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={() => setShowForm(true)}>Crear vendedor</Button>
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Email</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th>Registrado</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)", font: "400 13px var(--font-sans)" }}>Cargando…</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="users" title="Sin usuarios" /></td></tr>
            ) : usuarios.map(u => (
              <UsuarioRow key={u.id} u={u} onToggle={() => handleToggle(u)} onResetPwd={() => handleResetPwd(u)} />
            ))}
          </tbody>
        </table>
      </Card>

      <NuevoUsuarioModal open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
    </div>
  );
}

function UsuarioRow({ u, onToggle, onResetPwd }) {
  const [hover,    setHover]    = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const initials = u.nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const fecha = new Date(u.created_at).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); }}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}>
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Thumb initials={initials} />
          <span style={{ font: "500 13px var(--font-sans)" }}>{u.nombre}</span>
        </div>
      </Td>
      <Td><span style={{ color: "var(--fg-muted)" }}>{u.email}</span></Td>
      <Td>
        {u.rol === "admin"
          ? <Badge variant="info">Admin</Badge>
          : <Badge variant="neutral">Vendedor</Badge>}
      </Td>
      <Td>
        {u.activo
          ? <Badge variant="success" dot>Activo</Badge>
          : <Badge variant="neutral" dot>Inactivo</Badge>}
      </Td>
      <Td><span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{fecha}</span></Td>
      <Td align="right">
        <div style={{ display: "inline-flex", gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={onResetPwd}>Reset pwd</Button>
          {u.activo
            ? <Button size="sm" variant="secondary-danger" onClick={onToggle}>Desactivar</Button>
            : <Button size="sm" variant="secondary"        onClick={onToggle}>Reactivar</Button>}
        </div>
      </Td>
    </tr>
  );
}

function NuevoUsuarioModal({ open, onClose, onSaved }) {
  const empty = { nombre: "", email: "", password: "", rol: "vendedor" };
  const [data,   setData]   = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState("");

  React.useEffect(() => { if (open) { setData(empty); setError(""); } }, [open]);

  function set(k, v) { setData(d => ({ ...d, [k]: v })); setError(""); }

  async function handleSave() {
    if (!data.nombre || !data.email || !data.password) { setError("Todos los campos son requeridos"); return; }
    setSaving(true);
    try {
      await API.createUsuario(data);
      onSaved();
    } catch (e) { setError(e.message); }
    finally    { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Crear vendedor"
      subtitle="El usuario podrá iniciar sesión de inmediato con la contraseña que le asignes"
      width={520}
      footer={<>
        {error && <span style={{ flex: 1, font: "400 12px var(--font-sans)", color: "var(--danger)" }}>{error}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Creando…" : "Crear usuario"}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField label="Nombre completo" value={data.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre Apellido" autoFocus />
        <TextField label="Email"     type="email"    value={data.email}    onChange={e => set("email",    e.target.value)} placeholder="vendedor@correo.com" />
        <TextField label="Contraseña" type="password" value={data.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" />
        <Select    label="Rol" value={data.rol} onChange={e => set("rol", e.target.value)}
          options={[{ value: "vendedor", label: "Vendedor" }, { value: "admin", label: "Admin" }]} />
        <div style={{ padding: "12px 14px", background: "var(--ink-05)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="alert-triangle" size={16} style={{ color: "var(--warning)", marginTop: 1, flexShrink: 0 }} />
          <span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)", lineHeight: 1.5 }}>
            Comparte la contraseña de forma segura. Podrás resetearla en cualquier momento desde esta pantalla.
          </span>
        </div>
      </div>
    </Modal>
  );
}

window.UsuariosScreen = UsuariosScreen;
