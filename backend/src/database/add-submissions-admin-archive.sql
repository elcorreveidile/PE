-- Soft-delete/archivo para que el profesor pueda "eliminar" entregas sin borrar calificaciones del estudiante.
-- PostgreSQL. Seguro de ejecutar múltiples veces.

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS archived_by_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS archived_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_submissions_archived_by_admin ON submissions(archived_by_admin);

