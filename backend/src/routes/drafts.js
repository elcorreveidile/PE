/**
 * Rutas de Borradores
 * API para gestionar borradores de entregas
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

// =============================================================================
// GET /api/drafts - Obtener todos los borradores (filtrados por user_id si se proporciona)
// =============================================================================
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.query;

        let query = `
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
            WHERE 1=1
        `;

        const params = [];

        // Si se proporciona user_id, filtrar por ese usuario
        // Si no, solo mostrar borradores del usuario autenticado
        if (user_id) {
            // Solo los admins pueden ver borradores de otros usuarios
            if (req.user.role !== 'admin' && req.user.id !== user_id) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para ver estos borradores'
                });
            }
            query += ` AND d.user_id = ?`;
            params.push(user_id);
        } else {
            // Por defecto, mostrar solo los borradores del usuario autenticado
            query += ` AND d.user_id = ?`;
            params.push(req.user.id);
        }

        query += ` ORDER BY d.updated_at DESC`;

        const db = req.app.get('db');
        const drafts = await db.all(query, params);

        res.json({
            success: true,
            drafts: drafts,
            count: drafts.length
        });
    } catch (error) {
        console.error('[Drafts] Error al obtener borradores:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener borradores'
        });
    }
});

// =============================================================================
// GET /api/drafts/:id - Obtener un borrador por ID
// =============================================================================
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const db = req.app.get('db');
        const draft = await db.get(`
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
            WHERE d.id = ?
        `, [id]);

        if (!draft) {
            return res.status(404).json({
                success: false,
                error: 'Borrador no encontrado'
            });
        }

        // Verificar permisos: solo el dueño o admin puede ver
        if (req.user.role !== 'admin' && req.user.id !== draft.user_id) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para ver este borrador'
            });
        }

        res.json({
            success: true,
            draft: draft
        });
    } catch (error) {
        console.error('[Drafts] Error al obtener borrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener borrador'
        });
    }
});

// =============================================================================
// POST /api/drafts - Crear nuevo borrador
// =============================================================================
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { session_id, session_title, activity_id, activity_title, content } = req.body;

        // Validaciones
        if (!session_id || !content) {
            return res.status(400).json({
                success: false,
                error: 'session_id y content son obligatorios'
            });
        }

        const word_count = content ? content.split(/\s+/).filter(w => w.length > 0).length : 0;

        const db = req.app.get('db');
        const result = await db.run(`
            INSERT INTO drafts (
                user_id, session_id, session_title, activity_id, activity_title,
                content, word_count, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))
        `, [
            req.user.id,
            session_id,
            session_title || '',
            activity_id || null,
            activity_title || '',
            content,
            word_count
        ]);

        const draft = await db.get(`SELECT * FROM drafts WHERE id = ?`, [result.lastID]);

        res.status(201).json({
            success: true,
            message: 'Borrador creado exitosamente',
            draft: draft
        });
    } catch (error) {
        console.error('[Drafts] Error al crear borrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear borrador'
        });
    }
});

// =============================================================================
// PUT /api/drafts/:id - Actualizar borrador
// =============================================================================
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'content es obligatorio'
            });
        }

        const db = req.app.get('db');

        // Verificar que el borrador existe y pertenece al usuario
        const draft = await db.get(`SELECT * FROM drafts WHERE id = ?`, [id]);

        if (!draft) {
            return res.status(404).json({
                success: false,
                error: 'Borrador no encontrado'
            });
        }

        if (req.user.role !== 'admin' && req.user.id !== draft.user_id) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para editar este borrador'
            });
        }

        const word_count = content.split(/\s+/).filter(w => w.length > 0).length;

        // Actualizar borrador
        await db.run(`
            UPDATE drafts
            SET content = ?,
                word_count = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `, [content, word_count, id]);

        const updated = await db.get(`SELECT * FROM drafts WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Borrador actualizado exitosamente',
            draft: updated
        });
    } catch (error) {
        console.error('[Drafts] Error al actualizar borrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar borrador'
        });
    }
});

// =============================================================================
// DELETE /api/drafts/:id - Eliminar borrador
// =============================================================================
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const db = req.app.get('db');

        // Verificar que el borrador existe y pertenece al usuario
        const draft = await db.get(`SELECT * FROM drafts WHERE id = ?`, [id]);

        if (!draft) {
            return res.status(404).json({
                success: false,
                error: 'Borrador no encontrado'
            });
        }

        if (req.user.role !== 'admin' && req.user.id !== draft.user_id) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permiso para eliminar este borrador'
            });
        }

        await db.run(`DELETE FROM drafts WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Borrador eliminado exitosamente'
        });
    } catch (error) {
        console.error('[Drafts] Error al eliminar borrador:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar borrador'
        });
    }
});

module.exports = router;
