-- Migración: Convertir calificaciones textuales a numéricas
-- Creado: 2026-02-07
-- Autor: Javier Benítez Láinez

-- Esta función convertirá las calificaciones textuales a numéricas
-- Se aplicará a todas las entregas que tengan calificación textual pero no numérica

-- Ejemplo de uso (se ejecutará desde el backend, no desde SQL directo):
-- UPDATE feedback SET numeric_grade = CASE grade
--   WHEN 'Excelente' THEN 10
--   WHEN 'Muy bien' THEN 8.5
--   WHEN 'Bien' THEN 7
--   WHEN 'Suficiente' THEN 5
--   WHEN 'Necesita mejorar' THEN 3
--   ELSE NULL
-- END WHERE grade IS NOT NULL AND numeric_grade IS NULL;