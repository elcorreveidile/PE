/**
 * Rutas de notificaciones - sistema de comunicación con estudiantes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * Función helper para crear notificaciones individuales
 * @param {number} userId - ID del usuario
 * @param {string} type - Tipo de notificación (task, feedback, broadcast, etc.)
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @returns {Promise<Object>} Resultado de la inserción
 */
async function createNotification(userId, type, title, message) {
    try {
        const result = await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [userId, type, title, message]);
        return result.rows[0];
    } catch (error) {
        console.error('[Notifications] Error creating notification:', error);
        throw error;
    }
}

/**
 * Crear notificaciones para múltiples usuarios
 * @param {Array<number>} userIds - IDs de los usuarios
 * @param {string} type - Tipo de notificación
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje de la notificación
 * @returns {Promise<number>} Número de notificaciones creadas
 */
async function createBulkNotifications(userIds, type, title, message) {
    let createdCount = 0;
    for (const userId of userIds) {
        try {
            await createNotification(userId, type, title, message);
            createdCount++;
        } catch (error) {
            console.error(`[Notifications] Error creating notification for user ${userId}:`, error);
        }
    }
    return createdCount;
}

/**
 * GET /api/notifications
 * Obtener notificaciones del usuario actual
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.id]);

        // Contar no leídas
        const unreadResult = await query(`
            SELECT COUNT(*) as count FROM notifications
            WHERE user_id = $1 AND read = false
        `, [req.user.id]);

        res.json({
            notifications: result.rows,
            unread: parseInt(unreadResult.rows[0].count)
        });

    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Marcar notificación como leída
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Verificar que la notificación pertenece al usuario
        const notifResult = await query(
            'SELECT user_id FROM notifications WHERE id = $1',
            [notificationId]
        );

        if (notifResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        if (notifResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta notificación' });
        }

        await query(
            'UPDATE notifications SET read = true WHERE id = $1',
            [notificationId]
        );

        res.json({ message: 'Notificación marcada como leída' });

    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ error: 'Error al marcar notificación' });
    }
});

/**
 * PUT /api/notifications/read-all
 * Marcar todas las notificaciones como leídas
 */
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await query(
            'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
            [req.user.id]
        );

        res.json({ message: 'Todas las notificaciones marcadas como leídas' });

    } catch (error) {
        console.error('Error al marcar notificaciones:', error);
        res.status(500).json({ error: 'Error al marcar notificaciones' });
    }
});

/**
 * DELETE /api/notifications/old
 * Eliminar notificaciones antiguas del usuario actual
 * Query params:
 * - before (opcional): fecha límite YYYY-MM-DD. Default: 2026-02-03
 */
router.delete('/old', authenticateToken, async (req, res) => {
    try {
        const before = (req.query.before || '2026-02-03').toString();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) {
            return res.status(400).json({ error: 'Parámetro before inválido. Usa formato YYYY-MM-DD' });
        }

        const deleteResult = await query(`
            DELETE FROM notifications
            WHERE user_id = $1
              AND created_at < $2::date
            RETURNING id
        `, [req.user.id, before]);

        return res.json({
            message: 'Notificaciones antiguas eliminadas',
            deleted: deleteResult.rowCount,
            before
        });
    } catch (error) {
        console.error('Error al eliminar notificaciones antiguas:', error);
        return res.status(500).json({ error: 'Error al eliminar notificaciones antiguas' });
    }
});

/**
 * DELETE /api/notifications/:id
 * Eliminar notificación
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Verificar que la notificación pertenece al usuario
        const notifResult = await query(
            'SELECT id, user_id, type, title, message, created_at FROM notifications WHERE id = $1',
            [notificationId]
        );

        if (notifResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        const notif = notifResult.rows[0];

        if (notif.user_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta notificación' });
        }

        // Para broadcasts, eliminar el lote completo del usuario.
        // Se usa una ventana de 60s para cubrir filas creadas con pequeñas diferencias de timestamp.
        if (notif.type === 'broadcast') {
            await query(`
                DELETE FROM notifications
                WHERE user_id = $1
                  AND type = 'broadcast'
                  AND title = $2
                  AND message = $3
                  AND created_at BETWEEN ($4::timestamp - INTERVAL '60 seconds') AND ($4::timestamp + INTERVAL '60 seconds')
            `, [req.user.id, notif.title, notif.message, notif.created_at]);
        } else {
            await query('DELETE FROM notifications WHERE id = $1', [notificationId]);
        }

        res.json({ message: 'Notificación eliminada' });

    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});

/**
 * POST /api/admin/notifications/broadcast
 * Enviar notificación masiva (solo admin)
 */
router.post('/broadcast', authenticateToken, requireAdmin, [
    body('title').notEmpty().withMessage('El título es requerido'),
    body('message').notEmpty().withMessage('El mensaje es requerido'),
    body('target').optional().isIn(['all', 'active', 'inactive'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, message, target = 'all', userIds } = req.body;

        let recipients = [];

        // Determinar destinatarios
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            // Usuarios específicos
            recipients = userIds;
        } else {
            // Filtrar por target
            let targetFilter = '';
            let params = [];

            if (target === 'active') {
                // Estudiantes con al menos una entrega
                targetFilter = 'WHERE u.role = $1 AND EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = u.id)';
                params.push('student');
            } else if (target === 'inactive') {
                // Estudiantes sin entregas
                targetFilter = 'WHERE u.role = $1 AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = u.id)';
                params.push('student');
            } else {
                // Todos los estudiantes
                targetFilter = 'WHERE u.role = $1';
                params.push('student');
            }

            const usersResult = await query(`
                SELECT id FROM users u ${targetFilter}
            `, params);

            recipients = usersResult.rows.map(u => u.id);
        }

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'No hay destinatarios para esta notificación' });
        }

        // Insertar notificaciones para todos los recipientes con timestamp común de lote
        const batchCreatedAt = new Date().toISOString();
        let insertedCount = 0;
        for (const userId of recipients) {
            await query(`
                INSERT INTO notifications (user_id, type, title, message, created_at)
                VALUES ($1, 'broadcast', $2, $3, $4)
            `, [userId, title, message, batchCreatedAt]);
            insertedCount++;
        }

        res.json({
            message: 'Notificación enviada exitosamente',
            recipients: insertedCount,
            title,
            message
        });

    } catch (error) {
        console.error('Error al enviar notificación masiva:', error);
        res.status(500).json({ error: 'Error al enviar notificación masiva' });
    }
});

/**
 * GET /api/admin/notifications/stats
 * Estadísticas de notificaciones (solo admin)
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalResult = await query('SELECT COUNT(*) as count FROM notifications WHERE read = false');
        const byTypeResult = await query(`
            SELECT type, COUNT(*) as count
            FROM notifications
            WHERE read = false
            GROUP BY type
        `);

        res.json({
            totalUnread: parseInt(totalResult.rows[0].count),
            byType: byTypeResult.rows
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

/**
 * GET /api/admin/notifications/sent
 * Obtener historial de notificaciones enviadas (solo admin)
 */
router.get('/sent', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const result = await query(`
            SELECT
                MIN(n.id) as id,
                n.title,
                n.message,
                n.type,
                n.created_at,
                COUNT(DISTINCT n.user_id) as recipients_count
            FROM notifications n
            WHERE n.type = 'broadcast'
            GROUP BY n.title, n.message, n.type, n.created_at
            ORDER BY n.created_at DESC
            LIMIT $1
        `, [limit]);

        res.json({
            notifications: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error al obtener historial de notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

/**
 * DELETE /api/admin/notifications/:id
 * Eliminar todas las notificaciones de un broadcast (solo admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Verificar que existe y es un broadcast
        const notifResult = await query(`
            SELECT title, message, type, created_at
            FROM notifications
            WHERE id = $1 AND type = 'broadcast'
        `, [notificationId]);

        if (notifResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        const notif = notifResult.rows[0];

        // Eliminar todas las notificaciones del lote de broadcast.
        // Ventana de 60s para cubrir filas creadas con pequeñas diferencias de timestamp.
        const deleteResult = await query(`
            DELETE FROM notifications
            WHERE title = $1
              AND message = $2
              AND type = $3
              AND created_at BETWEEN ($4::timestamp - INTERVAL '60 seconds') AND ($4::timestamp + INTERVAL '60 seconds')
            RETURNING id
        `, [notif.title, notif.message, notif.type, notif.created_at]);

        res.json({
            message: 'Notificación eliminada correctamente',
            deleted: deleteResult.rowCount
        });

    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});

/**
 * DELETE /api/admin/notifications/broadcast/:id
 * Eliminar todas las notificaciones de un broadcast (solo admin)
 */
router.delete('/broadcast/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;

        // Verificar que existe y es un broadcast
        const notifResult = await query(`
            SELECT title, message, type, created_at
            FROM notifications
            WHERE id = $1 AND type = 'broadcast'
        `, [notificationId]);

        if (notifResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        const notif = notifResult.rows[0];

        // Eliminar todas las notificaciones del lote de broadcast.
        // Ventana de 60s para cubrir filas creadas con pequeñas diferencias de timestamp.
        const deleteResult = await query(`
            DELETE FROM notifications
            WHERE title = $1
              AND message = $2
              AND type = $3
              AND created_at BETWEEN ($4::timestamp - INTERVAL '60 seconds') AND ($4::timestamp + INTERVAL '60 seconds')
            RETURNING id
        `, [notif.title, notif.message, notif.type, notif.created_at]);

        res.json({
            message: 'Notificación eliminada correctamente',
            deleted: deleteResult.rowCount
        });

    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});

// Exportar funciones helper para usar en otros módulos
module.exports = router;
module.exports.createNotification = createNotification;
module.exports.createBulkNotifications = createBulkNotifications;
