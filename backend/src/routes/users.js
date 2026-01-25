/**
 * Rutas de usuarios (admin)
 * Compatible con SQLite y PostgreSQL
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query: dbQuery } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Listar usuarios (solo admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, active } = req.query;

        let whereClause = [];
        let params = [];

        if (role) {
            whereClause.push('role = ?');
            params.push(role);
        }

        if (active !== undefined) {
            whereClause.push('active = ?');
            params.push(active === 'true' ? 1 : 0);
        }

        const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        const usersResult = await dbQuery(`
            SELECT
                u.id, u.email, u.name, u.role, u.level, u.active, u.created_at, u.last_login,
                (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) as submissions_count,
                (SELECT COUNT(*) FROM submissions WHERE user_id = u.id AND status = 'reviewed') as reviewed_count
            FROM users u
            ${whereSQL}
            ORDER BY u.created_at DESC
        `, params);

        const users = usersResult.rows || usersResult;
        res.json(users);

    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});

/**
 * GET /api/users/:id
 * Obtener usuario específico (solo admin)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const userResult = await dbQuery(`
            SELECT id, email, name, role, level, motivation, active, created_at, last_login
            FROM users WHERE id = ?
        `, [userId]);

        const user = userResult.rows?.[0] || userResult;

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener entregas del usuario
        const submissionsResult = await dbQuery(`
            SELECT s.*, f.grade
            FROM submissions s
            LEFT JOIN feedback f ON s.id = f.submission_id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        `, [userId]);

        const submissions = submissionsResult.rows || submissionsResult;

        // Obtener progreso
        const progressResult = await dbQuery(`
            SELECT * FROM student_progress WHERE user_id = ?
        `, [userId]);

        const progress = progressResult.rows || progressResult;

        res.json({
            ...user,
            submissions,
            progress
        });

    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

/**
 * PUT /api/users/:id
 * Actualizar usuario (solo admin)
 */
router.put('/:id', authenticateToken, requireAdmin, [
    body('name').optional().trim().isLength({ min: 2 }),
    body('level').optional().isString(),
    body('role').optional().isIn(['student', 'admin']),
    body('active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const { name, level, role, active } = req.body;

        // Verificar que el usuario existe
        const userResult = await dbQuery('SELECT id FROM users WHERE id = ?', [userId]);
        const user = userResult.rows?.[0] || userResult;

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const updates = [];
        const params = [];

        if (name) { updates.push('name = ?'); params.push(name); }
        if (level) { updates.push('level = ?'); params.push(level); }
        if (role) { updates.push('role = ?'); params.push(role); }
        if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        params.push(userId);
        await dbQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ message: 'Usuario actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

/**
 * PUT /api/users/:id/password
 * Cambiar contraseña de usuario (solo admin)
 */
router.put('/:id/password', authenticateToken, requireAdmin, [
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const { password } = req.body;

        const userResult = await dbQuery('SELECT id FROM users WHERE id = ?', [userId]);
        const user = userResult.rows?.[0] || userResult;

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await dbQuery('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

/**
 * DELETE /api/users/:id
 * Eliminar usuario (solo admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // No permitir que admin se elimine a sí mismo
        if (userId == req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const userResult = await dbQuery('SELECT id FROM users WHERE id = ?', [userId]);
        const user = userResult.rows?.[0] || userResult;

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await dbQuery('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ message: 'Usuario eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

/**
 * GET /api/users/stats/overview
 * Estadísticas de usuarios (solo admin)
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const statsResult = await dbQuery(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active
            FROM users
        `);
        const stats = statsResult.rows?.[0] || statsResult;

        const byLevelResult = await dbQuery(`
            SELECT level, COUNT(*) as count
            FROM users
            WHERE role = 'student'
            GROUP BY level
        `);
        const byLevel = byLevelResult.rows || byLevelResult;

        const recentRegistrationsResult = await dbQuery(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= date('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        const recentRegistrations = recentRegistrationsResult.rows || recentRegistrationsResult;

        res.json({
            stats,
            byLevel,
            recentRegistrations
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
