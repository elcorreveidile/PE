/**
 * Rutas de entregas (submissions)
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
 * GET /api/submissions
 * Obtener entregas (estudiante: las suyas, admin: todas)
 */
router.get('/', authenticateToken, [
    queryValidator('status').optional().isIn(['pending', 'reviewed', 'all']),
    queryValidator('session_id').optional().isInt(),
    queryValidator('user_id').optional().isInt(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
    queryValidator('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const { status, session_id, user_id, limit = 50, offset = 0 } = req.query;

        const whereClause = [];
        const params = [];

        if (req.user.role !== 'admin') {
            params.push(req.user.id);
            whereClause.push(`s.user_id = $${params.length}`);
        } else if (user_id) {
            params.push(parseInt(user_id, 10));
            whereClause.push(`s.user_id = $${params.length}`);
        }

        if (status && status !== 'all') {
            params.push(status);
            whereClause.push(`s.status = $${params.length}`);
        }

        if (session_id) {
            params.push(parseInt(session_id, 10));
            whereClause.push(`s.session_id = $${params.length}`);
        }

        const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

        const countResult = await query(
            `SELECT COUNT(*)::int as total FROM submissions s ${whereSQL}`,
            params
        );
        const total = countResult.rows[0]?.total || 0;

        params.push(parseInt(limit, 10));
        const limitIndex = params.length;
        params.push(parseInt(offset, 10));
        const offsetIndex = params.length;

        const submissionsResult = await query(
            `SELECT
                s.*,
                u.name as user_name,
                u.email as user_email,
                f.feedback_text,
                f.grade,
                f.created_at as feedback_date
             FROM submissions s
             LEFT JOIN users u ON s.user_id = u.id
             LEFT JOIN feedback f ON s.id = f.submission_id
             ${whereSQL}
             ORDER BY s.created_at DESC
             LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
            params
        );

        res.json({
            submissions: submissionsResult.rows,
            pagination: {
                total,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                hasMore: (parseInt(offset, 10) + submissionsResult.rows.length) < total
            }
        });
    } catch (error) {
        console.error('Error al obtener entregas:', error);
        res.status(500).json({ error: 'Error al obtener entregas' });
    }
});

/**
 * GET /api/submissions/:id
 * Obtener una entrega específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const submissionId = req.params.id;

        const submissionResult = await query(
            `SELECT
                s.*,
                u.name as user_name,
                u.email as user_email,
                f.feedback_text,
                f.grade,
                f.annotations,
                f.created_at as feedback_date,
                r.name as reviewer_name
             FROM submissions s
             LEFT JOIN users u ON s.user_id = u.id
             LEFT JOIN feedback f ON s.id = f.submission_id
             LEFT JOIN users r ON f.reviewer_id = r.id
             WHERE s.id = $1`,
            [submissionId]
        );

        const submission = submissionResult.rows[0];

        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

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
    body('activity_id').notEmpty().withMessage('ID de actividad requerido'),
    body('activity_title').notEmpty().withMessage('Título de actividad requerido'),
    body('content').isLength({ min: 10 }).withMessage('El contenido debe tener al menos 10 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { session_id, activity_id, activity_title, content } = req.body;
        const wordCount = countWords(content);

        const insertResult = await query(
            `INSERT INTO submissions (user_id, session_id, activity_id, activity_title, content, word_count)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, activity_id, activity_title, word_count, status, created_at`,
            [req.user.id, session_id || null, activity_id, activity_title, content, wordCount]
        );

        const submission = insertResult.rows[0];

        const adminsResult = await query("SELECT id FROM users WHERE role = 'admin'");
        const insertNotificationText = `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'new_submission', 'Nueva entrega', $2)`;

        for (const admin of adminsResult.rows) {
            await query(insertNotificationText, [admin.id, `${req.user.name} ha enviado: ${activity_title}`]);
        }

        res.status(201).json({
            message: 'Entrega realizada correctamente',
            submission
        });
    } catch (error) {
        console.error('Error al crear entrega:', error);
        res.status(500).json({ error: 'Error al realizar la entrega' });
    }
});

/**
 * PUT /api/submissions/:id
 * Actualizar entrega (solo si está pendiente)
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

        const submissionResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
        const submission = submissionResult.rows[0];

        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        if (submission.user_id !== req.user.id) {
            return res.status(403).json({ error: 'No puedes editar esta entrega' });
        }

        if (submission.status === 'reviewed') {
            return res.status(400).json({ error: 'No puedes editar una entrega ya corregida' });
        }

        const { content } = req.body;
        const wordCount = countWords(content);

        await query(
            'UPDATE submissions SET content = $1, word_count = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [content, wordCount, submissionId]
        );

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
 * Añadir feedback a una entrega (solo admin)
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
        const { feedback_text, grade, annotations } = req.body;

        const submissionResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
        const submission = submissionResult.rows[0];
        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        const existingFeedback = await query('SELECT id FROM feedback WHERE submission_id = $1', [submissionId]);

        if (existingFeedback.rows[0]) {
            await query(
                `UPDATE feedback
                 SET feedback_text = $1, grade = $2, annotations = $3, reviewer_id = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE submission_id = $5`,
                [feedback_text, grade || null, annotations || null, req.user.id, submissionId]
            );
        } else {
            await query(
                `INSERT INTO feedback (submission_id, reviewer_id, feedback_text, grade, annotations)
                 VALUES ($1, $2, $3, $4, $5)`,
                [submissionId, req.user.id, feedback_text, grade || null, annotations || null]
            );
        }

        await query('UPDATE submissions SET status = $1 WHERE id = $2', ['reviewed', submissionId]);

        await query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'feedback', 'Tu entrega ha sido corregida', $2)`,
            [submission.user_id, `El profesor ha corregido tu entrega: ${submission.activity_title}`]
        );

        res.json({ message: 'Feedback añadido correctamente' });
    } catch (error) {
        console.error('Error al añadir feedback:', error);
        res.status(500).json({ error: 'Error al añadir feedback' });
    }
});

/**
 * DELETE /api/submissions/:id
 * Eliminar entrega (solo admin o propietario si está pendiente)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const submissionId = req.params.id;

        const submissionResult = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
        const submission = submissionResult.rows[0];

        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

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

/**
 * GET /api/submissions/stats/overview
 * Estadísticas de entregas (solo admin)
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const statsResult = await query(
            `SELECT
                COUNT(*)::int as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int as pending,
                SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END)::int as reviewed,
                AVG(word_count)::float as avg_word_count
             FROM submissions`
        );

        const bySessionResult = await query(
            `SELECT
                s.session_id,
                cs.title as session_title,
                COUNT(*)::int as count
             FROM submissions s
             LEFT JOIN course_sessions cs ON s.session_id = cs.id
             GROUP BY s.session_id, cs.title
             ORDER BY s.session_id`
        );

        const recentResult = await query(
            `SELECT DATE(created_at) as date, COUNT(*)::int as count
             FROM submissions
             WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        res.json({
            stats: statsResult.rows[0],
            bySession: bySessionResult.rows,
            recentActivity: recentResult.rows
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
