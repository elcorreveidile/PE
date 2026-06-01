-- ============================================
-- Sistema Multi-Curso: Migración de Base de Datos
-- ============================================

-- 1. Crear tabla de cursos
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    level TEXT DEFAULT 'C1',
    academic_year TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla de códigos de registro
CREATE TABLE IF NOT EXISTS registration_codes (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    description TEXT,
    max_uses INTEGER DEFAULT NULL,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Añadir course_id a tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;

-- 4. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_course_id ON users(course_id);
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_active ON registration_codes(is_active, is_active);

-- 5. Insertar curso C2 existente (Producción Escrita)
INSERT INTO courses (code, name, title, description, level, academic_year, is_active)
VALUES (
    'C2-PROD-ESCRITA',
    'Producción Escrita C2',
    'Producción Escrita C2 | Curso de Escritura Avanzada en Español',
    'Curso intensivo de producción escrita diseñado para estudiantes de nivel C2. Desarrolla competencias avanzadas en escritura académica, profesional y creativa a través de talleres prácticos y retroalimentación personalizada.',
    'C2',
    '2025-2026',
    TRUE
) ON CONFLICT (code) DO NOTHING;

-- 6. Insertar código de registro para C2
INSERT INTO registration_codes (code, course_id, description, max_uses)
VALUES (
    'PIO7-2026-CLM',
    (SELECT id FROM courses WHERE code = 'C2-PROD-ESCRITA'),
    'Código de registro para Producción Escrita C2 - CLM UGR 2026',
    NULL
) ON CONFLICT (code) DO NOTHING;

-- 7. Insertar curso C1 nuevo (Arte y Sociedad)
INSERT INTO courses (code, name, title, description, level, academic_year, is_active)
VALUES (
    'C1-ARTE-SOCIEDAD',
    'Arte y Sociedad C1',
    'C1 Arte y Sociedad en la Cultura Hispánica',
    'Curso de arte y sociedad en la cultura hispánica. 12 sesiones para hablar, leer y discutir en español a través del análisis de obras de arte, literatura y cine.',
    'C1',
    '2025-2026',
    TRUE
) ON CONFLICT (code) DO NOTHING;

-- 8. Insertar código de registro para C1
INSERT INTO registration_codes (code, course_id, description, max_uses)
VALUES (
    'C1-2026-ARTE',
    (SELECT id FROM courses WHERE code = 'C1-ARTE-SOCIEDAD'),
    'Código de registro para C1 Arte y Sociedad - CLM UGR 2026',
    NULL
) ON CONFLICT (code) DO NOTHING;

-- 9. Actualizar usuarios existentes al curso C2
UPDATE users SET course_id = (SELECT id FROM courses WHERE code = 'C2-PROD-ESCRITA')
WHERE course_id IS NULL;

-- 10. Crear función para validar código de registro
CREATE OR REPLACE FUNCTION validate_registration_code(p_code TEXT)
RETURNS TABLE(course_id INTEGER, is_valid BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.course_id,
        (rc.is_active = TRUE AND rc.current_uses < rc.max_uses) AS is_valid
    FROM registration_codes rc
    WHERE rc.code = p_code
    AND (rc.valid_until IS NULL OR rc.valid_until > CURRENT_TIMESTAMP)
    AND rc.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear función para incrementar uso de código
CREATE OR REPLACE FUNCTION increment_code_usage(p_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE registration_codes
    SET current_uses = current_uses + 1
    WHERE code = p_code;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;