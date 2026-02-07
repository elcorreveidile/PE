-- Migración: Crear tabla de visitas para estadísticas
-- Fecha: 2026-02-07
-- Autor: Javier Benítez Láinez

-- Tabla de visitas
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    page VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    is_unique BOOLEAN DEFAULT false,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_page ON visits(page);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_is_unique ON visits(is_unique);

-- Comentarios
COMMENT ON TABLE visits IS 'Registro de visitas al sitio para estadísticas del admin';
COMMENT ON COLUMN visits.page IS 'Página visitada (ej: index.html, sesiones/index.html)';
COMMENT ON COLUMN visits.user_id IS 'Usuario autenticado (null si es visitante anónimo)';
COMMENT ON COLUMN visits.session_id IS 'Identificador de sesión para trackear visitantes únicos';
COMMENT ON COLUMN visits.ip_address IS 'Dirección IP del visitante';
COMMENT ON COLUMN visits.user_agent IS 'User Agent del navegador';
COMMENT ON COLUMN visits.referrer IS 'URL de donde vino el visitante (referrer)';
COMMENT ON COLUMN visits.is_unique IS 'True si es la primera visita del día para este visitante';

-- Reporte de cambios
DO $$
BEGIN
    RAISE NOTICE 'Migración de visits completada exitosamente.';
    RAISE NOTICE 'Tabla visits creada con índices optimizados para consultas de estadísticas.';
END $$;
