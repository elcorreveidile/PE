/**
 * Rutas de entregas - submissions (PostgreSQL)
 */

const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Contar palabras de un texto
 */
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * GET /api/submissions/stats/overview
 * Estadisticas de entregas (solo admin)
 * IMPORTANTE: Esta ruta debe ir ANTES de /:id
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const statsResult = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
                AVG(word_count) as avg_word_count
            FROM submissions
        `);

        const bySessionResult = await query(`
            SELECT
                s.session_id,
                cs.title as session_title,
                COUNT(*) as count
            FROM submissions s
            LEFT JOIN course_sessions cs ON s.session_id = cs.id
            GROUP BY s.session_id, cs.title
            ORDER BY s.session_id
        `);

        const recentResult = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM submissions
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json({
            stats: statsResult.rows[0],
            bySession: bySessionResult.rows,
            recentActivity: recentResult.rows
        });

    } catch (error) {
        console.error('Error al obtener estadisticas:', error);
        res.status(500).json({ error: 'Error al obtener estadisticas' });
    }
});

/**
 * GET /api/submissions
 * Obtener entregas (estudiante: las suyas, admin: todas)
 */
router.get('/', authenticateToken, [
    queryValidator('status').optional().isIn(['pending', 'reviewed', 'all']),
    queryValidator('session_id').optional().isInt(),
    queryValidator('user_id').optional().isInt(),
    queryValidator('task_id').optional().isString(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
    queryValidator('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const { status, session_id, user_id, task_id, limit = 50, offset = 0 } = req.query;

        let whereClause = [];
        let params = [];
        let paramIndex = 1;

        // Si no es admin, solo puede ver sus propias entregas
        if (req.user.role !== 'admin') {
            whereClause.push(`s.user_id = $${paramIndex++}`);
            params.push(req.user.id);
        } else if (user_id) {
            whereClause.push(`s.user_id = $${paramIndex++}`);
            params.push(user_id);
        }

        if (status && status !== 'all') {
            whereClause.push(`s.status = $${paramIndex++}`);
            params.push(status);
        }

        if (session_id) {
            whereClause.push(`s.session_id = $${paramIndex++}`);
            params.push(session_id);
        }

        if (task_id) {
            whereClause.push(`s.task_id = $${paramIndex++}`);
            params.push(task_id);
        }

        const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        // Contar total
        const countResult = await query(
            `SELECT COUNT(*) as total FROM submissions s ${whereSQL}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Obtener entregas con informacion de usuario y feedback
        const limitParam = paramIndex++;
        const offsetParam = paramIndex;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(`
            SELECT
                s.*,
                u.name as user_name,
                u.email as user_email,
                f.feedback_text,
                f.grade,
                f.numeric_grade,
                f.created_at as feedback_date
            FROM submissions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN feedback f ON s.id = f.submission_id
            ${whereSQL}
            ORDER BY s.created_at DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `, params);

        res.json({
            submissions: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + result.rows.length) < total
            }
        });

    } catch (error) {
        // Compatibilidad: si la BD aun no tiene submissions.task_id, devolver lista vacia en vez de 500.
        if (error && error.code === '42703' && /task_id/i.test(error.message || '')) {
            console.warn('[Submissions] BD sin submissions.task_id; devolviendo lista vacia');
            return res.json({
                submissions: [],
                pagination: {
                    total: 0,
                    limit: parseInt(req.query.limit || 50),
                    offset: parseInt(req.query.offset || 0),
                    hasMore: false
                },
                warning: 'DB missing submissions.task_id'
            });
        }
        console.error('Error al obtener entregas:', error);
        res.status(500).json({ error: 'Error al obtener entregas' });
    }
});

/**
 * GET /api/submissions/:id
 * Obtener una entrega especifica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const submissionId = req.params.id;

        const result = await query(`
            SELECT
                s.*,
                u.name as user_name,
                u.email as user_email,
                f.feedback_text,
                f.grade,
                f.numeric_grade,
                f.annotations,
                f.created_at as feedback_date,
                r.name as reviewer_name
            FROM submissions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN feedback f ON s.id = f.submission_id
            LEFT JOIN users r ON f.reviewer_id = r.id
            WHERE s.id = $1
        `, [submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        const submission = result.rows[0];

        // Verificar permisos: admin o propietario
        if (req.user.role !== 'admin' && submission.user_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta entrega' });
        }

        res.json(submission);

    } catch (error) {
        console.error('Error al obtener entrega:', error);
        res.status(500).json({ error: 'Error al obtener entrega' });
    }
});

/**
 * POST /api/submissions
 * Crear nueva entrega
 */
router.post('/', authenticateToken, [
    body('session_id').optional().isInt(),
    body('task_id').optional().isString(),
    body('activity_id').optional().isString(),
    body('activity_title').optional().isString(),
    body('content').isLength({ min: 10 }).withMessage('El contenido debe tener al menos 10 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let { session_id, activity_id, activity_title, task_id, content } = req.body;

        // Validacion cruzada: o bien viene task_id (entrega de tarea), o bien activity_id+activity_title (entrega normal).
        if (!task_id && (!activity_id || !activity_title)) {
            return res.status(400).json({
                error: 'Datos incompletos: se requiere task_id o activity_id + activity_title'
            });
        }

        // Entrega de tarea: derivar activity_id/activity_title desde student_tasks y validar permisos.
        if (task_id) {
            // Evitar duplicados: 1 entrega por alumno y tarea.
            const existingForTask = await query(
                'SELECT id FROM submissions WHERE user_id = $1 AND task_id = $2 LIMIT 1',
                [req.user.id, task_id]
            );
            if (existingForTask.rows.length > 0) {
                return res.status(409).json({ error: 'Ya has entregado esta tarea' });
            }

            const taskResult = await query(`
                SELECT
                    id,
                    title,
                    session_id as "sessionId",
                    due_date as "dueDate",
                    assignment_type as "assignmentType",
                    assigned_students as "assignedStudents",
                    status
                FROM student_tasks
                WHERE id = $1
            `, [task_id]);

            if (taskResult.rows.length === 0) {
                return res.status(404).json({ error: 'Tarea no encontrada' });
            }

            const task = taskResult.rows[0];

            if (task.status !== 'active') {
                return res.status(400).json({ error: 'Esta tarea no está activa' });
            }

            if (task.dueDate && new Date(task.dueDate) < new Date()) {
                return res.status(400).json({ error: 'La fecha límite de esta tarea ya ha pasado' });
            }

            // assignedStudents puede venir como string o array dependiendo del parser de PG.
            let assignedStudents = task.assignedStudents;
            try {
                if (typeof assignedStudents === 'string') assignedStudents = JSON.parse(assignedStudents || '[]');
            } catch {
                assignedStudents = [];
            }

            if (task.assignmentType === 'specific') {
                const list = Array.isArray(assignedStudents) ? assignedStudents.map(String) : [];
                if (!list.includes(String(req.user.id))) {
                    return res.status(403).json({ error: 'No tienes permiso para entregar esta tarea' });
                }
            }

            session_id = task.sessionId ?? null;
            activity_id = task.id;
            activity_title = task.title;
        }

        const wordCount = countWords(content);

        // Nota: task_id es opcional y puede no existir en BDs antiguas.
        let result;
        try {
            result = await query(`
                INSERT INTO submissions (user_id, session_id, activity_id, activity_title, task_id, content, word_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [req.user.id, session_id || null, activity_id, activity_title, task_id || null, content, wordCount]);
        } catch (insertError) {
            if (task_id && insertError && insertError.code === '42703' && /task_id/i.test(insertError.message || '')) {
                console.error('[Submissions] BD sin submissions.task_id; no se puede entregar tareas hasta aplicar migracion');
                return res.status(500).json({
                    error: 'Funcionalidad de tareas no disponible (base de datos desactualizada). Contacta con el administrador.'
                });
            }
            throw insertError;
        }

        const submissionId = result.rows[0].id;

        // Notificar al admin
        const adminsResult = await query("SELECT id FROM users WHERE role = 'admin'");

        for (const admin of adminsResult.rows) {
            await query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES ($1, 'new_submission', 'Nueva entrega', $2)
            `, [admin.id, `${req.user.name} ha enviado: ${activity_title}`]);
        }

        res.status(201).json({
            message: 'Entrega realizada correctamente',
            submission: {
                id: submissionId,
                activity_id,
                activity_title,
                task_id: task_id || null,
                word_count: wordCount,
                status: 'pending',
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al crear entrega:', error);
        res.status(500).json({ error: 'Error al realizar la entrega' });
    }
});

/**
 * PUT /api/submissions/:id
 * Actualizar entrega (solo si esta pendiente)
 */
router.put('/:id', authenticateToken, [
    body('content').isLength({ min: 10 }).withMessage('El contenido debe tener al menos 10 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const submissionId = req.params.id;

        // Verificar que existe y es del usuario
        const submissionResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        const submission = submissionResult.rows[0];

        if (submission.user_id !== req.user.id) {
            return res.status(403).json({ error: 'No puedes editar esta entrega' });
        }

        if (submission.status === 'reviewed') {
            return res.status(400).json({ error: 'No puedes editar una entrega ya corregida' });
        }

        const { content } = req.body;
        const wordCount = countWords(content);

        await query(`
            UPDATE submissions SET content = $1, word_count = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [content, wordCount, submissionId]);

        res.json({
            message: 'Entrega actualizada correctamente',
            word_count: wordCount
        });

    } catch (error) {
        console.error('Error al actualizar entrega:', error);
        res.status(500).json({ error: 'Error al actualizar entrega' });
    }
});

/**
 * POST /api/submissions/:id/feedback
 * Anadir feedback a una entrega (solo admin)
 */
router.post('/:id/feedback', authenticateToken, requireAdmin, [
    body('feedback_text').notEmpty().withMessage('El feedback es requerido'),
    body('grade').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const submissionId = req.params.id;
        const { feedback_text, grade, numeric_grade, annotations, rubric_id, criterion_scores } = req.body;

        // Verificar que la entrega existe
        const submissionResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        const submission = submissionResult.rows[0];

        // Insertar o actualizar feedback
        const existingFeedback = await query('SELECT id FROM feedback WHERE submission_id = $1', [submissionId]);

        if (existingFeedback.rows.length > 0) {
            await query(`
                UPDATE feedback
                SET feedback_text = $1, grade = $2, numeric_grade = $3, annotations = $4, reviewer_id = $5, updated_at = CURRENT_TIMESTAMP
                WHERE submission_id = $6
            `, [feedback_text, grade || null, numeric_grade || null, annotations || null, req.user.id, submissionId]);
        } else {
            await query(`
                INSERT INTO feedback (submission_id, reviewer_id, feedback_text, grade, numeric_grade, annotations)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [submissionId, req.user.id, feedback_text, grade || null, numeric_grade || null, annotations || null]);
        }

        // Actualizar estado de la entrega y guardar datos de rúbrica
        await query(`
            UPDATE submissions 
            SET status = 'reviewed', 
                rubric_id = $1, 
                criterion_scores = $2, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [rubric_id || null, criterion_scores || null, submissionId]);

        // Notificar al estudiante
        await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'feedback', 'Tu entrega ha sido corregida', $2)
        `, [submission.user_id, `El profesor ha corregido tu entrega: ${submission.activity_title}`]);

        res.json({
            message: 'Feedback anadido correctamente'
        });

    } catch (error) {
        console.error('Error al anadir feedback:', error);
        res.status(500).json({ error: 'Error al anadir feedback' });
    }
});

/**
 * DELETE /api/submissions/:id
 * Eliminar entrega (solo admin o propietario si esta pendiente)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const submissionId = req.params.id;

        const submissionResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        const submission = submissionResult.rows[0];

        // Admin puede eliminar cualquiera, usuario solo las suyas si estan pendientes
        if (req.user.role !== 'admin') {
            if (submission.user_id !== req.user.id) {
                return res.status(403).json({ error: 'No puedes eliminar esta entrega' });
            }
            if (submission.status === 'reviewed') {
                return res.status(400).json({ error: 'No puedes eliminar una entrega corregida' });
            }
        }

        await query('DELETE FROM submissions WHERE id = $1', [submissionId]);

        res.json({ message: 'Entrega eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar entrega:', error);
        res.status(500).json({ error: 'Error al eliminar entrega' });
    }
});

module.exports = router;
