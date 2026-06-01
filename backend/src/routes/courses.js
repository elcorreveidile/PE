/**
 * Rutas de cursos (Multi-Curso System)
 */

const express = require('express');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/courses
 * Obtener todos los cursos activos (público)
 */
router.get('/', async (req, res) => {
    try {
        const result = await query(`
            SELECT id, code, name, title, description, level, academic_year, is_active
            FROM courses
            WHERE is_active = TRUE
            ORDER BY code
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener cursos:', error);
        res.status(500).json({ error: 'Error al obtener cursos' });
    }
});

/**
 * GET /api/courses/:id
 * Obtener detalles de un curso específico
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const courseResult = await query(`
            SELECT c.id, c.code, c.name, c.title, c.description, c.level, c.academic_year, c.is_active,
                   COUNT(DISTINCT u.id) as student_count
            FROM courses c
            LEFT JOIN users u ON u.course_id = c.id AND u.active = TRUE
            WHERE c.id = $1
            GROUP BY c.id
        `, [id]);

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        const course = courseResult.rows[0];

        // Obtener sesiones del curso
        const sessionsResult = await query(`
            SELECT id, date, day, title, theme, workshop, contents
            FROM course_sessions
            WHERE course_id = $1 OR course_id IS NULL
            ORDER BY date, id
        `, [id]);

        res.json({
            success: true,
            data: {
                ...course,
                sessions: sessionsResult.rows
            }
        });
    } catch (error) {
        console.error('Error al obtener curso:', error);
        res.status(500).json({ error: 'Error al obtener curso' });
    }
});

/**
 * GET /api/courses/code/:code
 * Obtener curso por código
 */
router.get('/code/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const result = await query(`
            SELECT id, code, name, title, description, level, academic_year, is_active
            FROM courses
            WHERE code = $1 AND is_active = TRUE
        `, [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener curso por código:', error);
        res.status(500).json({ error: 'Error al obtener curso' });
    }
});

/**
 * POST /api/courses (Admin only)
 * Crear nuevo curso
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code, name, title, description, level, academic_year } = req.body;

        if (!code || !name || !title) {
            return res.status(400).json({ error: 'Código, nombre y título son requeridos' });
        }

        const result = await query(`
            INSERT INTO courses (code, name, title, description, level, academic_year)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [code, name, title, description || null, level || 'C1', academic_year || '2025-2026']);

        res.status(201).json({
            success: true,
            message: 'Curso creado correctamente',
            data: { id: result.rows[0].id }
        });
    } catch (error) {
        console.error('Error al crear curso:', error);
        res.status(500).json({ error: 'Error al crear curso' });
    }
});

/**
 * POST /api/courses/:courseId/registration-codes (Admin only)
 * Crear código de registro para un curso
 */
router.post('/:courseId/registration-codes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { code, description, max_uses } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Código es requerido' });
        }

        const result = await query(`
            INSERT INTO registration_codes (code, course_id, description, max_uses)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [code, courseId, description || null, max_uses || null]);

        res.status(201).json({
            success: true,
            message: 'Código de registro creado correctamente',
            data: { id: result.rows[0].id }
        });
    } catch (error) {
        console.error('Error al crear código de registro:', error);
        res.status(500).json({ error: 'Error al crear código de registro' });
    }
});

/**
 * GET /api/courses/:courseId/registration-codes (Admin only)
 * Obtener códigos de registro de un curso
 */
router.get('/:courseId/registration-codes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { courseId } = req.params;

        const result = await query(`
            SELECT id, code, description, max_uses, current_uses, valid_from, valid_until, is_active
            FROM registration_codes
            WHERE course_id = $1
            ORDER BY created_at DESC
        `, [courseId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener códigos de registro:', error);
        res.status(500).json({ error: 'Error al obtener códigos de registro' });
    }
});

module.exports = router;