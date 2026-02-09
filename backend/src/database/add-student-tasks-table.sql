-- Tabla de tareas para estudiantes
-- Profesores pueden crear tareas que se asignan a estudiantes específicos o a todo el curso
-- Los estudiantes pueden enviar sus respuestas usando el sistema de submissions existente

CREATE TABLE IF NOT EXISTS student_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'all' CHECK (assignment_type IN ('all', 'specific')),
    assigned_students JSONB DEFAULT '[]'::jsonb,
    session_id INTEGER REFERENCES course_sessions(id) ON DELETE SET NULL,
    rubric_id TEXT REFERENCES rubrics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_student_tasks_status ON student_tasks(status);
CREATE INDEX IF NOT EXISTS idx_student_tasks_due_date ON student_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_student_tasks_created_by ON student_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_student_tasks_session ON student_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_rubric ON student_tasks(rubric_id);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS set_student_tasks_updated_at ON student_tasks;
CREATE TRIGGER set_student_tasks_updated_at
BEFORE UPDATE ON student_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Añadir columna task_id a submissions si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'submissions' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE submissions ADD COLUMN task_id TEXT REFERENCES student_tasks(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id);
    END IF;
END
$$;
