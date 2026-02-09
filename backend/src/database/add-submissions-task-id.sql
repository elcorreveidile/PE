-- Migración mínima: añadir submissions.task_id para tareas de estudiantes
-- Seguro de ejecutar múltiples veces.

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS task_id TEXT;

CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions(task_id);

