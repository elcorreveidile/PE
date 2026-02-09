/**
 * Rutas de tareas para estudiantes - studentTasks (PostgreSQL)
 * Profesores crean tareas que estudiantes deben completar
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/student-tasks
 * Obtener todas las tareas (solo admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT
                st.id,
                st.title,
                st.description,
                st.due_date as dueDate,
                st.assignment_type as assignmentType,
                st.assigned_students as assignedStudents,
                st.session_id as sessionId,
                st.rubric_id as rubricId,
                st.status,
                st.created_by as createdBy,
                st.created_at as createdAt,
                st.updated_at as updatedAt,
                COALESCE(u.name, u.email) as authorName
            FROM student_tasks st
            LEFT JOIN users u ON st.created_by = u.id
            ORDER BY st.due_date ASC
        `);

        // Convertir assignedStudents de JSON a array si está almacenado como JSONB
        const tasks = result.rows.map(t => ({
            ...t,
            assignedStudents: typeof t.assignedStudents === 'string'
                ? JSON.parse(t.assignedStudents || '[]')
                : (t.assignedStudents || [])
        }));

        // Obtener conteo de submissions para cada tarea
        for (const task of tasks) {
            const submissionsResult = await query(
                'SELECT COUNT(*) as count FROM submissions WHERE task_id = $1',
                [task.id]
            );
            task.submissions = Array(submissionsResult.rows[0].count).fill(null);
        }

        res.json(tasks);

    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

/**
 * GET /api/student-tasks/me
 * Obtener tareas asignadas al estudiante actual
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(`
            SELECT
                st.id,
                st.title,
                st.description,
                st.due_date as dueDate,
                st.assignment_type as assignmentType,
                st.assigned_students as assignedStudents,
                st.session_id as sessionId,
                st.rubric_id as rubricId,
                st.status,
                st.created_at as createdAt
            FROM student_tasks st
            WHERE st.status = 'active'
                AND st.due_date >= CURRENT_TIMESTAMP
                AND (st.assignment_type = 'all' OR st.assigned_students @> $1)
            ORDER BY st.due_date ASC
        `, [JSON.stringify([userId])]);

        const tasks = result.rows.map(t => ({
            ...t,
            assignedStudents: typeof t.assignedStudents === 'string'
                ? JSON.parse(t.assignedStudents || '[]')
                : (t.assignedStudents || [])
        }));

        res.json(tasks);

    } catch (error) {
        console.error('Error al obtener tareas del estudiante:', error);
        res.status(500).json({ error: 'Error al obtener tareas del estudiante' });
    }
});

/**
 * GET /api/student-tasks/:id
 * Obtener una tarea específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        const result = await query(`
            SELECT
                st.id,
                st.title,
                st.description,
                st.due_date as dueDate,
                st.assignment_type as assignmentType,
                st.assigned_students as assignedStudents,
                st.session_id as sessionId,
                st.rubric_id as rubricId,
                st.status,
                st.created_by as createdBy,
                st.created_at as createdAt,
                st.updated_at as updatedAt,
                COALESCE(u.name, u.email) as authorName
            FROM student_tasks st
            LEFT JOIN users u ON st.created_by = u.id
            WHERE st.id = $1
        `, [taskId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        const task = result.rows[0];
        task.assignedStudents = typeof task.assignedStudents === 'string'
            ? JSON.parse(task.assignedStudents || '[]')
            : (task.assignedStudents || []);

        // Obtener submissions de esta tarea
        const submissionsResult = await query(`
            SELECT
                s.id,
                s.user_id as userId,
                s.user_name as userName,
                s.content,
                s.word_count as wordCount,
                s.status,
                s.created_at as createdAt
            FROM submissions s
            WHERE s.task_id = $1
            ORDER BY s.created_at DESC
        `, [taskId]);

        task.submissions = submissionsResult.rows;

        res.json(task);

    } catch (error) {
        console.error('Error al obtener tarea:', error);
        res.status(500).json({ error: 'Error al obtener tarea' });
    }
});

/**
 * POST /api/student-tasks
 * Crear nueva tarea (solo admin)
 */
router.post('/', authenticateToken, requireAdmin, [
    body('title').notEmpty().withMessage('El título es requerido'),
    body('description').notEmpty().withMessage('La descripción es requerida'),
    body('dueDate').isISO8601().withMessage('Fecha límite inválida'),
    body('assignmentType').isIn(['all', 'specific']).withMessage('Tipo de asignación inválido'),
    body('assignedStudents').optional().isArray(),
    body('sessionId').optional({ nullable: true }).isInt().withMessage('Sesión inválida'),
    body('rubricId').optional({ nullable: true }).isString().withMessage('Rúbrica inválida'),
    body('status').optional().isIn(['active', 'inactive', 'draft'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, dueDate, assignmentType, assignedStudents = [], sessionId, rubricId, status = 'active' } = req.body;

        // Validar assignedStudents cuando assignmentType es 'specific'
        if (assignmentType === 'specific' && assignedStudents.length === 0) {
            return res.status(400).json({ error: 'Debe seleccionar al menos un estudiante para asignación específica' });
        }

        const assignedStudentsJson = JSON.stringify(assignedStudents);

        const result = await query(`
            INSERT INTO student_tasks (id, title, description, due_date, assignment_type, assigned_students, session_id, rubric_id, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `, [req.body.id || `task_${Date.now()}`, title, description, dueDate, assignmentType, assignedStudentsJson, sessionId, rubricId, status, req.user.id]);

        const taskId = result.rows[0].id;

        res.status(201).json({
            message: 'Tarea creada correctamente',
            task: {
                id: taskId,
                title,
                description,
                dueDate,
                assignmentType,
                assignedStudents,
                sessionId,
                rubricId,
                status,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ error: 'Error al crear tarea' });
    }
});

/**
 * PUT /api/student-tasks/:id
 * Actualizar tarea completa (solo admin)
 */
router.put('/:id', authenticateToken, requireAdmin, [
    body('title').notEmpty().withMessage('El título es requerido'),
    body('description').notEmpty().withMessage('La descripción es requerida'),
    body('dueDate').isISO8601().withMessage('Fecha límite inválida'),
    body('assignmentType').isIn(['all', 'specific']).withMessage('Tipo de asignación inválido'),
    body('assignedStudents').optional().isArray(),
    body('sessionId').optional({ nullable: true }).isInt().withMessage('Sesión inválida'),
    body('rubricId').optional({ nullable: true }).isString().withMessage('Rúbrica inválida'),
    body('status').optional().isIn(['active', 'inactive', 'draft'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const taskId = req.params.id;
        const { title, description, dueDate, assignmentType, assignedStudents, sessionId, rubricId, status } = req.body;

        // Verificar que la tarea existe
        const existingTask = await query('SELECT id FROM student_tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // Validar assignedStudents cuando assignmentType es 'specific'
        if (assignmentType === 'specific' && (!assignedStudents || assignedStudents.length === 0)) {
            return res.status(400).json({ error: 'Debe seleccionar al menos un estudiante para asignación específica' });
        }

        const assignedStudentsJson = assignedStudents ? JSON.stringify(assignedStudents) : '[]';

        await query(`
            UPDATE student_tasks
            SET title = $1, description = $2, due_date = $3, assignment_type = $4,
                assigned_students = $5, session_id = $6, rubric_id = $7, status = $8, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
        `, [title, description, dueDate, assignmentType, assignedStudentsJson, sessionId, rubricId, status, taskId]);

        res.json({
            message: 'Tarea actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ error: 'Error al actualizar tarea' });
    }
});

/**
 * PATCH /api/student-tasks/:id
 * Actualizar parcialmente una tarea (solo admin)
 * Útil para activar/desactivar sin modificar toda la tarea
 */
router.patch('/:id', authenticateToken, requireAdmin, [
    body('status').optional().isIn(['active', 'inactive', 'draft'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const taskId = req.params.id;
        const { status } = req.body;

        // Verificar que la tarea existe
        const existingTask = await query('SELECT id FROM student_tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // Construir query dinámica basada en los campos proporcionados
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(taskId);

        const queryText = `
            UPDATE student_tasks
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `;

        await query(queryText, values);

        res.json({
            message: 'Tarea actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ error: 'Error al actualizar tarea' });
    }
});

/**
 * DELETE /api/student-tasks/:id
 * Eliminar tarea (solo admin)
 * También eliminará las submissions asociadas (CASCADE)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;

        // Verificar que la tarea existe
        const existingTask = await query('SELECT id FROM student_tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        await query('DELETE FROM student_tasks WHERE id = $1', [taskId]);

        res.json({ message: 'Tarea eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({ error: 'Error al eliminar tarea' });
    }
});

module.exports = router;
