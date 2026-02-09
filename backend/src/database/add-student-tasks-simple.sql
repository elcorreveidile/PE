-- Versión simplificada de la migración para ejecutar desde el endpoint
-- Sin bloques DO $$ para evitar problemas de parsing

-- Crear tabla student_tasks
CREATE TABLE IF NOT EXISTS student_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'all' CHECK (assignment_type IN ('all', 'specific')),
    assigned_students JSONB DEFAULT '[]'::jsonb,
    session_id INTEGER,
    rubric_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_student_tasks_status ON student_tasks(status);
CREATE INDEX IF NOT EXISTS idx_student_tasks_due_date ON student_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_student_tasks_created_by ON student_tasks(created_by);

-- Añadir columna task_id a submissions si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'submissions' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE submissions ADD COLUMN task_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id);
    END IF;
END
$$;
