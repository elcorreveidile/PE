/**
 * Rutas de rúbricas - rubrics (PostgreSQL)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/rubrics
 * Obtener todas las rúbricas
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT
                r.id,
                r.name,
                r.description,
                r.criteria,
                r.max_points as maxPoints,
                r.active,
                r.is_template as isTemplate,
                r.created_at as createdAt,
                r.updated_at as updatedAt,
                COALESCE(u.name, u.email) as authorName
            FROM rubrics r
            LEFT JOIN users u ON r.created_by = u.id
            ORDER BY r.created_at DESC
        `);

        // Convertir criteria de JSON a objeto si está almacenado como texto
        const rubrics = result.rows.map(r => ({
            ...r,
            criteria: typeof r.criteria === 'string' ? JSON.parse(r.criteria) : r.criteria
        }));

        res.json(rubrics);

    } catch (error) {
        console.error('Error al obtener rúbricas:', error);
        res.status(500).json({ error: 'Error al obtener rúbricas' });
    }
});

/**
 * GET /api/rubrics/:id
 * Obtener una rúbrica específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const rubricId = req.params.id;

        const result = await query(`
            SELECT
                r.id,
                r.name,
                r.description,
                r.criteria,
                r.max_points as maxPoints,
                r.active,
                r.is_template as isTemplate,
                r.created_at as createdAt,
                r.updated_at as updatedAt,
                COALESCE(u.name, u.email) as authorName
            FROM rubrics r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = $1
        `, [rubricId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rúbrica no encontrada' });
        }

        const rubric = result.rows[0];
        rubric.criteria = typeof rubric.criteria === 'string' ? JSON.parse(rubric.criteria) : rubric.criteria;

        res.json(rubric);

    } catch (error) {
        console.error('Error al obtener rúbrica:', error);
        res.status(500).json({ error: 'Error al obtener rúbrica' });
    }
});

/**
 * POST /api/rubrics
 * Crear nueva rúbrica (solo admin)
 */
router.post('/', authenticateToken, requireAdmin, [
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('description').optional().isString(),
    body('criteria').isArray({ min: 1 }).withMessage('Debe haber al menos un criterio'),
    body('maxPoints').optional().isInt({ min: 1, max: 20 }),
    body('active').optional().isBoolean(),
    body('isTemplate').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id, name, description, criteria, maxPoints = 10, active = true, isTemplate = false } = req.body;

        // Validar que el peso total de los criterios sea 100
        const totalWeight = criteria.reduce((sum, c) => sum + (parseInt(c.weight) || 0), 0);
        if (totalWeight !== 100) {
            return res.status(400).json({ 
                error: 'El peso total de los criterios debe ser 100%',
                totalWeight,
                expectedWeight: 100
            });
        }

        const criteriaJson = JSON.stringify(criteria);

        const result = await query(`
            INSERT INTO rubrics (id, name, description, criteria, max_points, active, is_template, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [id, name, description, criteriaJson, maxPoints, active, isTemplate, req.user.id]);

        const rubricId = result.rows[0].id;

        res.status(201).json({
            message: 'Rúbrica creada correctamente',
            rubric: {
                id: rubricId,
                name,
                description,
                criteria,
                maxPoints,
                active,
                isTemplate,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al crear rúbrica:', error);
        res.status(500).json({ error: 'Error al crear rúbrica' });
    }
});

/**
 * PUT /api/rubrics/:id
 * Actualizar rúbrica completa (solo admin)
 */
router.put('/:id', authenticateToken, requireAdmin, [
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('description').optional().isString(),
    body('criteria').isArray({ min: 1 }).withMessage('Debe haber al menos un criterio'),
    body('maxPoints').optional().isInt({ min: 1, max: 20 }),
    body('active').optional().isBoolean(),
    body('isTemplate').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const rubricId = req.params.id;
        const { name, description, criteria, maxPoints, active, isTemplate } = req.body;

        // Verificar que la rúbrica existe
        const existingRubric = await query('SELECT id FROM rubrics WHERE id = $1', [rubricId]);
        if (existingRubric.rows.length === 0) {
            return res.status(404).json({ error: 'Rúbrica no encontrada' });
        }

        // Validar que el peso total de los criterios sea 100
        const totalWeight = criteria.reduce((sum, c) => sum + (parseInt(c.weight) || 0), 0);
        if (totalWeight !== 100) {
            return res.status(400).json({ 
                error: 'El peso total de los criterios debe ser 100%',
                totalWeight,
                expectedWeight: 100
            });
        }

        const criteriaJson = JSON.stringify(criteria);

        await query(`
            UPDATE rubrics 
            SET name = $1, description = $2, criteria = $3, max_points = $4, 
                active = $5, is_template = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
        `, [name, description, criteriaJson, maxPoints, active, isTemplate, rubricId]);

        res.json({
            message: 'Rúbrica actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar rúbrica:', error);
        res.status(500).json({ error: 'Error al actualizar rúbrica' });
    }
});

/**
 * PATCH /api/rubrics/:id
 * Actualizar parcialmente una rúbrica (solo admin)
 * Útil para activar/desactivar sin modificar toda la rúbrica
 */
router.patch('/:id', authenticateToken, requireAdmin, [
    body('active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const rubricId = req.params.id;
        const { active } = req.body;

        // Verificar que la rúbrica existe
        const existingRubric = await query('SELECT id FROM rubrics WHERE id = $1', [rubricId]);
        if (existingRubric.rows.length === 0) {
            return res.status(404).json({ error: 'Rúbrica no encontrada' });
        }

        // Construir query dinámica basada en los campos proporcionados
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (active !== undefined) {
            updates.push(`active = $${paramIndex++}`);
            values.push(active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(rubricId);

        const queryText = `
            UPDATE rubrics 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `;

        await query(queryText, values);

        res.json({
            message: 'Rúbrica actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar rúbrica:', error);
        res.status(500).json({ error: 'Error al actualizar rúbrica' });
    }
});

/**
 * DELETE /api/rubrics/:id
 * Eliminar rúbrica (solo admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const rubricId = req.params.id;

        // Verificar que la rúbrica existe
        const existingRubric = await query('SELECT id FROM rubrics WHERE id = $1', [rubricId]);
        if (existingRubric.rows.length === 0) {
            return res.status(404).json({ error: 'Rúbrica no encontrada' });
        }

        await query('DELETE FROM rubrics WHERE id = $1', [rubricId]);

        res.json({ message: 'Rúbrica eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar rúbrica:', error);
        res.status(500).json({ error: 'Error al eliminar rúbrica' });
    }
});

module.exports = router;