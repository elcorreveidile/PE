/**
 * Rutas de Borradores - drafts (PostgreSQL)
 * API para gestionar borradores de entregas
 */

const express = require('express');
const { query } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function countWords(text) {
    return String(text || '').trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * GET /api/drafts
 * Obtener borradores (por defecto: del usuario actual)
 * Query:
 * - user_id (opcional): id del usuario. Solo admin o el propio usuario.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userIdParam = req.query.user_id;

        let targetUserId = req.user.id;
        if (userIdParam !== undefined) {
            const requested = parseInt(userIdParam, 10);
            if (Number.isNaN(requested)) {
                return res.status(400).json({ success: false, error: 'user_id inválido' });
            }
            if (req.user.role !== 'admin' && req.user.id !== requested) {
                return res.status(403).json({ success: false, error: 'No tienes permiso para ver estos borradores' });
            }
            targetUserId = requested;
        }

        const result = await query(`
            SELECT
                d.id,
                d.user_id,
                u.name as user_name,
                d.session_id,
                d.session_title,
                d.activity_id,
                d.activity_title,
                d.content,
                d.word_count,
                d.status,
                d.created_at,
                d.updated_at
            FROM drafts d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.user_id = $1
            ORDER BY d.updated_at DESC
        `, [targetUserId]);

        return res.json({
            success: true,
            drafts: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('[Drafts] Error al obtener borradores:', error);
        if (error && error.code === '42P01' && /drafts/i.test(error.message || '')) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos desactualizada: falta la tabla drafts. Aplica la migración add-drafts-table.sql.'
            });
        }
        return res.status(500).json({ success: false, error: 'Error al obtener borradores' });
    }
});

/**
 * GET /api/drafts/:id
 * Obtener un borrador por ID (dueño o admin)
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const draftId = parseInt(req.params.id, 10);
        if (Number.isNaN(draftId)) {
            return res.status(400).json({ success: false, error: 'ID de borrador inválido' });
        }

        const result = await query(`
            SELECT
                d.id,
                d.user_id,
                u.name as user_name,
                d.session_id,
                d.session_title,
                d.activity_id,
                d.activity_title,
                d.content,
                d.word_count,
                d.status,
                d.created_at,
                d.updated_at
            FROM drafts d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = $1
        `, [draftId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Borrador no encontrado' });
        }

        const draft = result.rows[0];
        if (req.user.role !== 'admin' && req.user.id !== draft.user_id) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para ver este borrador' });
        }

        return res.json({ success: true, draft });
    } catch (error) {
        console.error('[Drafts] Error al obtener borrador:', error);
        if (error && error.code === '42P01' && /drafts/i.test(error.message || '')) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos desactualizada: falta la tabla drafts. Aplica la migración add-drafts-table.sql.'
            });
        }
        return res.status(500).json({ success: false, error: 'Error al obtener borrador' });
    }
});

/**
 * POST /api/drafts
 * Crear nuevo borrador
 * Body:
 * - session_id (obligatorio)
 * - content (obligatorio)
 * - session_title, activity_id, activity_title (opcionales)
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { session_id, session_title, activity_id, activity_title, content } = req.body || {};

        const sessionId = parseInt(session_id, 10);
        if (Number.isNaN(sessionId)) {
            return res.status(400).json({ success: false, error: 'session_id es obligatorio e inválido' });
        }
        if (!content || String(content).trim().length < 1) {
            return res.status(400).json({ success: false, error: 'content es obligatorio' });
        }

        const wc = countWords(content);

        const insert = await query(`
            INSERT INTO drafts (
                user_id, session_id, session_title, activity_id, activity_title,
                content, word_count, status, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING
                id,
                user_id,
                session_id,
                session_title,
                activity_id,
                activity_title,
                content,
                word_count,
                status,
                created_at,
                updated_at
        `, [
            req.user.id,
            sessionId,
            session_title || '',
            activity_id || null,
            activity_title || '',
            content,
            wc
        ]);

        const draft = insert.rows[0];
        return res.status(201).json({ success: true, message: 'Borrador creado exitosamente', draft });
    } catch (error) {
        console.error('[Drafts] Error al crear borrador:', error);
        if (error && error.code === '42P01' && /drafts/i.test(error.message || '')) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos desactualizada: falta la tabla drafts. Aplica la migración add-drafts-table.sql.'
            });
        }
        return res.status(500).json({ success: false, error: 'Error al crear borrador' });
    }
});

/**
 * PUT /api/drafts/:id
 * Actualizar borrador (dueño o admin)
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const draftId = parseInt(req.params.id, 10);
        if (Number.isNaN(draftId)) {
            return res.status(400).json({ success: false, error: 'ID de borrador inválido' });
        }

        const { content } = req.body || {};
        if (!content || String(content).trim().length < 1) {
            return res.status(400).json({ success: false, error: 'content es obligatorio' });
        }

        const existing = await query('SELECT id, user_id FROM drafts WHERE id = $1', [draftId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Borrador no encontrado' });
        }

        const ownerId = existing.rows[0].user_id;
        if (req.user.role !== 'admin' && req.user.id !== ownerId) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para editar este borrador' });
        }

        const wc = countWords(content);

        const updated = await query(`
            UPDATE drafts
            SET content = $1,
                word_count = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING
                id,
                user_id,
                session_id,
                session_title,
                activity_id,
                activity_title,
                content,
                word_count,
                status,
                created_at,
                updated_at
        `, [content, wc, draftId]);

        return res.json({ success: true, message: 'Borrador actualizado exitosamente', draft: updated.rows[0] });
    } catch (error) {
        console.error('[Drafts] Error al actualizar borrador:', error);
        if (error && error.code === '42P01' && /drafts/i.test(error.message || '')) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos desactualizada: falta la tabla drafts. Aplica la migración add-drafts-table.sql.'
            });
        }
        return res.status(500).json({ success: false, error: 'Error al actualizar borrador' });
    }
});

/**
 * DELETE /api/drafts/:id
 * Eliminar borrador (dueño o admin)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const draftId = parseInt(req.params.id, 10);
        if (Number.isNaN(draftId)) {
            return res.status(400).json({ success: false, error: 'ID de borrador inválido' });
        }

        const existing = await query('SELECT id, user_id FROM drafts WHERE id = $1', [draftId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Borrador no encontrado' });
        }

        const ownerId = existing.rows[0].user_id;
        if (req.user.role !== 'admin' && req.user.id !== ownerId) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para eliminar este borrador' });
        }

        await query('DELETE FROM drafts WHERE id = $1', [draftId]);
        return res.json({ success: true, message: 'Borrador eliminado exitosamente' });
    } catch (error) {
        console.error('[Drafts] Error al eliminar borrador:', error);
        if (error && error.code === '42P01' && /drafts/i.test(error.message || '')) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos desactualizada: falta la tabla drafts. Aplica la migración add-drafts-table.sql.'
            });
        }
        return res.status(500).json({ success: false, error: 'Error al eliminar borrador' });
    }
});

module.exports = router;
