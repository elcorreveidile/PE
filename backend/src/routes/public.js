/**
 * Rutas públicas de información (sin autenticación)
 */

const express = require('express');
const { query } = require('../database/db');

const router = express.Router();

/**
 * GET /api/public/courses
 * Obtener lista de cursos activos (información pública)
 */
router.get('/courses', async (req, res) => {
    try {
        const result = await query(`
            SELECT id, code, name, title, description, level, academic_year
            FROM courses
            WHERE is_active = TRUE
            ORDER BY code
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener cursos públicos:', error);
        res.status(500).json({ error: 'Error al obtener cursos' });
    }
});

/**
 * GET /api/public/validate-code/:code
 * Validar un código de registro (sin revelar información sensible)
 */
router.get('/validate-code/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // SOLUCIÓN TEMPORAL: Mapeo directo de códigos mientras se ejecuta la migración en producción
        const temporaryCodeMapping = {
            'C1-2026-ARTE': {
                course_code: 'C1-ARTE-SOCIEDAD',
                course_name: 'Arte y Sociedad C1',
                course_title: 'C1 Arte y Sociedad en la Cultura Hispánica',
                level: 'C1'
            },
            'PIO7-2026-CLM': {
                course_code: 'C2-PROD-ESCRITA',
                course_name: 'Producción Escrita C2',
                course_title: 'Producción Escrita C2 | Curso de Escritura Avanzada en Español',
                level: 'C2'
            }
        };

        // Primero intentar contra la base de datos
        let result;
        try {
            result = await query(`
                SELECT rc.id, c.code as course_code, c.name as course_name, c.title as course_title, c.level
                FROM registration_codes rc
                JOIN courses c ON rc.course_id = c.id
                WHERE rc.code = $1
                AND rc.is_active = TRUE
                AND (rc.valid_until IS NULL OR rc.valid_until > CURRENT_TIMESTAMP)
                AND (rc.max_uses IS NULL OR rc.current_uses < rc.max_uses)
            `, [code]);
        } catch (dbError) {
            console.warn('Error consultando tabla registration_codes, usando fallback:', dbError.message);
            result = { rows: [] };
        }

        // Si no hay resultados en BD, verificar mapeo temporal
        if (result.rows.length === 0) {
            if (temporaryCodeMapping[code]) {
                return res.json({
                    success: true,
                    valid: true,
                    data: temporaryCodeMapping[code],
                    using_temporary_mapping: true
                });
            }

            return res.json({
                success: false,
                valid: false,
                message: 'Código de registro inválido o expirado'
            });
        }

        res.json({
            success: true,
            valid: true,
            data: {
                course_code: result.rows[0].course_code,
                course_name: result.rows[0].course_name,
                course_title: result.rows[0].course_title,
                level: result.rows[0].level
            }
        });
    } catch (error) {
        console.error('Error al validar código:', error);
        res.status(500).json({ error: 'Error al validar código' });
    }
});

module.exports = router;