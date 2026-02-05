-- Actualizar trigger para usar columnas camelCase

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS set_users_updated_at ON users;

-- Crear trigger para actualizar updatedAt (camelCase)
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
