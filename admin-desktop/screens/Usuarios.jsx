// Usuarios — table of vendors with role, status, last connection.

function UsuariosScreen() {
  const [showForm, setShowForm] = React.useState(false);
  const M = window.MOCK;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField icon="search" placeholder="Buscar usuario..." style={{ flex: 1, maxWidth: 400 }} />
        <Select options={["Todos los roles", "Admin", "Vendedor"]} />
        <Select options={["Todos los estados", "Activos", "Inactivos"]} />
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
              <Th>Última conexión</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {M.usuarios.map(u => <UsuarioRow key={u.id} u={u} />)}
          </tbody>
        </table>
      </Card>

      <NuevoUsuarioModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

function UsuarioRow({ u }) {
  const [hover, setHover] = React.useState(false);
  const initials = u.nombre.split(" ").map(p => p[0]).join("").slice(0, 2);
  return (
    <tr
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}
    >
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Thumb initials={initials} />
          <span style={{ font: "500 13px var(--font-sans)" }}>{u.nombre}</span>
        </div>
      </Td>
      <Td><span style={{ color: "var(--fg-muted)" }}>{u.email}</span></Td>
      <Td>
        {u.rol === "Admin"
          ? <Badge variant="info">Admin</Badge>
          : <Badge variant="neutral">Vendedor</Badge>}
      </Td>
      <Td>
        {u.activo
          ? <Badge variant="success" dot>Activo</Badge>
          : <Badge variant="neutral" dot>Inactivo</Badge>}
      </Td>
      <Td><span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{u.ultima}</span></Td>
      <Td align="right">
        <div style={{ display: "inline-flex", gap: 6 }}>
          <Button size="sm" variant="ghost">Editar</Button>
          {u.activo
            ? <Button size="sm" variant="secondary-danger">Desactivar</Button>
            : <Button size="sm" variant="secondary">Reactivar</Button>}
        </div>
      </Td>
    </tr>
  );
}

function NuevoUsuarioModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear vendedor"
      subtitle="Le enviaremos un email con su contraseña temporal"
      width={520}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onClose}>Crear vendedor</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <TextField label="Nombre" placeholder="Nombre" />
          <TextField label="Apellido" placeholder="Apellido" />
        </div>
        <TextField label="Email" type="email" placeholder="vendedor@correo.com" />
        <Select label="Rol" options={["Vendedor", "Admin"]} value="Vendedor" onChange={() => {}} />
        <div style={{ padding: "12px 14px", background: "var(--info-bg)", border: "1px solid var(--info-bd)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="check" size={16} style={{ color: "var(--info)", marginTop: 1 }} />
          <span style={{ font: "400 13px var(--font-sans)", color: "#1E40AF", lineHeight: 1.5 }}>
            El vendedor recibirá un email con su contraseña temporal. Podrá cambiarla en su primer inicio de sesión.
          </span>
        </div>
      </div>
    </Modal>
  );
}

window.UsuariosScreen = UsuariosScreen;
