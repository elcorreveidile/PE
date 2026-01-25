/**
 * Rutas de entregas (submissions)
 * Compatible con SQLite y PostgreSQL
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { query: dbQuery } = require('../database/db');
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
    query('status').optional().isIn(['pending', 'reviewed', 'all']),
    query('session_id').optional().isInt(),
    query('user_id').optional().isInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const { status, session_id, user_id, limit = 50, offset = 0 } = req.query;

        let whereClause = [];
        let params = [];

        // Si no es admin, solo puede ver sus propias entregas
        if (req.user.role !== 'admin') {
            whereClause.push('s.user_id = ?');
            params.push(req.user.id);
        } else if (user_id) {
            whereClause.push('s.user_id = ?');
            params.push(user_id);
        }

        if (status && status !== 'all') {
            whereClause.push('s.status = ?');
            params.push(status);
        }

        if (session_id) {
            whereClause.push('s.session_id = ?');
            params.push(session_id);
        }

        const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        // Contar total
        const countSQL = `SELECT COUNT(*) as total FROM submissions s ${whereSQL}`;
        const countResult = await dbQuery(countSQL, params);
        const total = countResult.rows?.[0]?.total || countResult.total;

        // Obtener entregas con información de usuario y feedback
        const sql = `
            SELECT
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
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), parseInt(offset));
        const submissionsResult = await dbQuery(sql, params);
        const submissions = submissionsResult.rows || submissionsResult;

        res.json({
            submissions,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + submissions.length) < total
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

        const submissionResult = await dbQuery(`
            SELECT
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
            WHERE s.id = ?
        `, [submissionId]);

        const submission = submissionResult.rows?.[0] || submissionResult;

        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

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

        const result = await dbQuery(`
            INSERT INTO submissions (user_id, session_id, activity_id, activity_title, content, word_count)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id
        `, [req.user.id, session_id || null, activity_id, activity_title, content, wordCount]);

        const submissionId = result.rows?.[0]?.id || result.lastInsertRowid;

        // Notificar al admin
        const adminsResult = await dbQuery('SELECT id FROM users WHERE role = ?', ['admin']);
        const admins = adminsResult.rows || adminsResult;

        for (const admin of admins) {
            await dbQuery(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (?, 'new_submission', 'Nueva entrega', ?)
            `, [admin.id, `${req.user.name} ha enviado: ${activity_title}`]);
        }

        res.status(201).json({
            message: 'Entrega realizada correctamente',
            submission: {
                id: submissionId,
                activity_id,
                activity_title,
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

        // Verificar que existe y es del usuario
        const submissionResult = await dbQuery('SELECT * FROM submissions WHERE id = ?', [submissionId]);
        const submission = submissionResult.rows?.[0] || submissionResult;

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

        await dbQuery(`
            UPDATE submissions SET content = ?, word_count = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
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

        // Verificar que la entrega existe
        const submissionResult = await dbQuery('SELECT * FROM submissions WHERE id = ?', [submissionId]);
        const submission = submissionResult.rows?.[0] || submissionResult;

        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        // Insertar o actualizar feedback
        const existingFeedbackResult = await dbQuery('SELECT id FROM feedback WHERE submission_id = ?', [submissionId]);
        const existingFeedback = existingFeedbackResult.rows?.[0] || existingFeedbackResult;

        if (existingFeedback && existingFeedback.id) {
            await dbQuery(`
                UPDATE feedback
                SET feedback_text = ?, grade = ?, annotations = ?, reviewer_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE submission_id = ?
            `, [feedback_text, grade || null, annotations || null, req.user.id, submissionId]);
        } else {
            await dbQuery(`
                INSERT INTO feedback (submission_id, reviewer_id, feedback_text, grade, annotations)
                VALUES (?, ?, ?, ?, ?)
            `, [submissionId, req.user.id, feedback_text, grade || null, annotations || null]);
        }

        // Actualizar estado de la entrega
        await dbQuery('UPDATE submissions SET status = ? WHERE id = ?', ['reviewed', submissionId]);

        // Notificar al estudiante
        await dbQuery(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'feedback', 'Tu entrega ha sido corregida', ?)
        `, [submission.user_id, `El profesor ha corregido tu entrega: ${submission.activity_title}`]);

        res.json({
            message: 'Feedback añadido correctamente'
        });

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

        const submissionResult = await dbQuery('SELECT * FROM submissions WHERE id = ?', [submissionId]);
        const submission = submissionResult.rows?.[0] || submissionResult;

        if (!submission) {
            return res.status(404).json({ error: 'Entrega no encontrada' });
        }

        // Admin puede eliminar cualquiera, usuario solo las suyas si están pendientes
        if (req.user.role !== 'admin') {
            if (submission.user_id !== req.user.id) {
                return res.status(403).json({ error: 'No puedes eliminar esta entrega' });
            }
            if (submission.status === 'reviewed') {
                return res.status(400).json({ error: 'No puedes eliminar una entrega corregida' });
            }
        }

        await dbQuery('DELETE FROM submissions WHERE id = ?', [submissionId]);

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
        const statsResult = await dbQuery(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
                AVG(word_count) as avg_word_count
            FROM submissions
        `);
        const stats = statsResult.rows?.[0] || statsResult;

        const bySessionResult = await dbQuery(`
            SELECT
                s.session_id,
                cs.title as session_title,
                COUNT(*) as count
            FROM submissions s
            LEFT JOIN course_sessions cs ON s.session_id = cs.id
            GROUP BY s.session_id, cs.title
            ORDER BY s.session_id
        `);
        const bySession = bySessionResult.rows || bySessionResult;

        const recentActivityResult = await dbQuery(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM submissions
            WHERE created_at >= date('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        const recentActivity = recentActivityResult.rows || recentActivityResult;

        res.json({
            stats,
            bySession,
            recentActivity
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
