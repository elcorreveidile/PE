-- Migración: Añadir soporte para OAuth (Google y Apple)
-- Fecha: 2026-02-07
-- Autor: Javier Benítez Láinez

-- Añadir campos para OAuth a la tabla users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Crear índice único para combinación provider + provider_id
-- Esto permite que un usuario tenga múltiples providers (e.g., Google + Apple)
-- pero no pueda tener dos cuentas del mismo provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider
ON users(provider, provider_id)
WHERE provider IS NOT NULL;

-- Añadir comentario a los nuevos campos
COMMENT ON COLUMN users.provider IS 'Proveedor de OAuth: google, apple, o null para email/password';
COMMENT ON COLUMN users.provider_id IS 'ID único del usuario en el proveedor OAuth';
COMMENT ON COLUMN users.avatar_url IS 'URL de la foto de perfil del proveedor OAuth';

-- Permitir NULL en password para usuarios OAuth
-- Los usuarios que se registran con OAuth no tienen password
ALTER TABLE users
ALTER COLUMN password DROP NOT NULL;

-- Crear índice para búsquedas rápidas por email (para account linking)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Reporte de cambios
DO $$
BEGIN
    RAISE NOTICE 'Migración OAuth completada exitosamente.';
    RAISE NOTICE 'Campos añadidos: provider, provider_id, avatar_url';
    RAISE NOTICE 'Índices creados: idx_users_provider, idx_users_email';
    RAISE NOTICE 'Password ahora acepta NULL para usuarios OAuth.';
END $$;
