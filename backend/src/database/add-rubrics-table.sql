-- Tabla de rúbricas de evaluación
-- Creado: 2026-02-07
-- Autor: Javier Benítez Láinez

CREATE TABLE IF NOT EXISTS rubrics (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_points INTEGER NOT NULL DEFAULT 10,
    active BOOLEAN NOT NULL DEFAULT true,
    is_template BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_rubrics_active ON rubrics(active);
CREATE INDEX IF NOT EXISTS idx_rubrics_created_by ON rubrics(created_by);
CREATE INDEX IF NOT EXISTS idx_rubrics_created_at ON rubrics(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_rubrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rubrics_updated_at ON rubrics;
CREATE TRIGGER trigger_update_rubrics_updated_at
    BEFORE UPDATE ON rubrics
    FOR EACH ROW
    EXECUTE FUNCTION update_rubrics_updated_at();

-- Comentario en la tabla
COMMENT ON TABLE rubrics IS 'Almacena las rúbricas de evaluación para calificar entregas de estudiantes';
COMMENT ON COLUMN rubrics.criteria IS 'Array de criterios de evaluación con sus pesos y descripciones en formato JSON';
COMMENT ON COLUMN rubrics.max_points IS 'Puntuación máxima de la rúbrica';
COMMENT ON COLUMN rubrics.active IS 'Indica si la rúbrica está activa para uso';
COMMENT ON COLUMN rubrics.is_template IS 'Indica si es una plantilla predefinida (no eliminable)';