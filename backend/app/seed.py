from app.database import SessionLocal
from app.models.models import Usuario, Categoria, Proveedor
from app.core.security import hash_password
from app.core.bootstrap import run_migrations


def seed():
    run_migrations()  # crea/actualiza el esquema versionado con Alembic
    db = SessionLocal()
    try:
        if db.query(Usuario).first():
            print("Base de datos ya inicializada.")
            return

        admin = Usuario(
            nombre="Administrador",
            email="admin@tienda.com",
            password_hash=hash_password("admin1234"),
            rol="admin",
        )
        db.add(admin)

        categorias = [
            Categoria(nombre="Bebidas", descripcion="Gaseosas, jugos, agua"),
            Categoria(nombre="Lácteos", descripcion="Leche, queso, yogur"),
            Categoria(nombre="Panadería", descripcion="Pan, galletas"),
            Categoria(nombre="Limpieza", descripcion="Detergentes, jabones"),
            Categoria(nombre="Snacks", descripcion="Papas fritas, dulces"),
        ]
        db.add_all(categorias)

        proveedor = Proveedor(
            nombre="Distribuidora Central",
            telefono="555-0100",
            email="ventas@distribuidora.com",
        )
        db.add(proveedor)

        db.commit()
        print("[OK] Datos iniciales creados.")
        print("  Admin: admin@tienda.com / admin1234")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
