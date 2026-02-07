-- Migración para añadir campos de rúbrica a submissions y feedback
-- Creado: 2026-02-07
-- Autor: Javier Benítez Láinez

-- Añadir campos a la tabla submissions
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS rubric_id VARCHAR(255) REFERENCES rubrics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS criterion_scores JSONB DEFAULT '{}'::jsonb;

-- Añadir índices para mejorar rendimiento en búsquedas por rúbrica
CREATE INDEX IF NOT EXISTS idx_submissions_rubric ON submissions(rubric_id);

-- Comentarios
COMMENT ON COLUMN submissions.rubric_id IS 'ID de la rúbrica utilizada para evaluar esta entrega';
COMMENT ON COLUMN submissions.criterion_scores IS 'Puntuaciones por criterio en formato JSON: {"criterio1": 8.5, "criterio2": 7.0}';

-- Nota: El campo numeric_grade ya existe en la tabla feedback
-- Si se desea moverlo a submissions, se puede hacer con:
-- ALTER TABLE submissions ADD COLUMN IF NOT EXISTS numeric_grade DECIMAL(3,2);
-- Y migrar los datos existentes desde feedback