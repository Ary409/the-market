// Proveedores — table with name, phone, products, add/edit modal.

function ProveedoresScreen() {
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const M = window.MOCK;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TextField icon="search" placeholder="Buscar proveedor..." style={{ flex: 1, maxWidth: 400 }} />
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={() => { setEditing(null); setShowForm(true); }}>Agregar proveedor</Button>
      </div>

      <Card noPadding>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Proveedor</Th>
              <Th>Contacto</Th>
              <Th>Teléfono</Th>
              <Th align="right">Productos</Th>
              <Th align="right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {M.proveedores.map(p => (
              <ProveedorRow key={p.id} p={p} onEdit={() => { setEditing(p); setShowForm(true); }} />
            ))}
          </tbody>
        </table>
      </Card>

      <ProveedorFormModal open={showForm} proveedor={editing} onClose={() => setShowForm(false)} />
    </div>
  );
}

function ProveedorRow({ p, onEdit }) {
  const [hover, setHover] = React.useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderTop: "1px solid var(--border)", background: hover ? "var(--ink-05)" : "transparent" }}
    >
      <Td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--ink-100)", color: "var(--paper)", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="truck" size={15} />
          </div>
          <span style={{ font: "500 13px var(--font-sans)" }}>{p.nombre}</span>
        </div>
      </Td>
      <Td><span style={{ font: "400 13px var(--font-sans)", color: "var(--fg-muted)" }}>{p.contacto}</span></Td>
      <Td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.telefono}</span></Td>
      <Td align="right"><span style={{ font: "600 13px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{p.productos}</span></Td>
      <Td align="right">
        <Button size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
      </Td>
    </tr>
  );
}

function ProveedorFormModal({ open, proveedor, onClose }) {
  const isEdit = !!proveedor;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar proveedor" : "Agregar proveedor"}
      subtitle={isEdit ? `Modificando "${proveedor?.nombre}"` : "Registra un nuevo proveedor"}
      width={520}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={onClose}>{isEdit ? "Guardar cambios" : "Agregar proveedor"}</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField
          label="Nombre del proveedor"
          defaultValue={proveedor?.nombre || ""}
          placeholder="Ej. Distribuidora Centro"
        />
        <TextField
          label="Contacto"
          defaultValue={proveedor?.contacto || ""}
          placeholder="Nombre del contacto principal"
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <TextField
            label="Teléfono"
            defaultValue={proveedor?.telefono || ""}
            placeholder="55 1234 5678"
          />
          <TextField
            label="Email (opcional)"
            placeholder="ventas@proveedor.com"
          />
        </div>
        <TextField
          label="Notas (opcional)"
          placeholder="Días de entrega, condiciones de pago..."
        />
      </div>
    </Modal>
  );
}

window.ProveedoresScreen = ProveedoresScreen;
