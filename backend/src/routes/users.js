/**
 * Rutas de usuarios - admin (PostgreSQL)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users/stats/overview
 * Estadisticas de usuarios (solo admin)
 * IMPORTANTE: Esta ruta debe ir ANTES de /:id
 */
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const statsResult = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as active
            FROM users
        `);

        const byLevelResult = await query(`
            SELECT level, COUNT(*) as count
            FROM users
            WHERE role = 'student'
            GROUP BY level
        `);

        const recentResult = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json({
            stats: statsResult.rows[0],
            byLevel: byLevelResult.rows,
            recentRegistrations: recentResult.rows
        });

    } catch (error) {
        console.error('Error al obtener estadisticas:', error);
        res.status(500).json({ error: 'Error al obtener estadisticas' });
    }
});

/**
 * GET /api/users
 * Listar usuarios (solo admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, active } = req.query;

        let whereClause = [];
        let params = [];
        let paramIndex = 1;

        if (role) {
            whereClause.push(`role = $${paramIndex++}`);
            params.push(role);
        }

        if (active !== undefined) {
            whereClause.push(`active = $${paramIndex++}`);
            params.push(active === 'true');
        }

        const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        const result = await query(`
            SELECT
                u.id, u.email, u.name, u.role, u.level, u.active, u.created_at, u.last_login,
                (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) as submissions_count,
                (SELECT COUNT(*) FROM submissions WHERE user_id = u.id AND status = 'reviewed') as reviewed_count
            FROM users u
            ${whereSQL}
            ORDER BY u.created_at DESC
        `, params);

        res.json(result.rows);

    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});

/**
 * GET /api/users/:id
 * Obtener usuario especifico (solo admin)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const userResult = await query(`
            SELECT id, email, name, role, level, motivation, active, created_at, last_login
            FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userResult.rows[0];

        // Obtener entregas del usuario
        const submissionsResult = await query(`
            SELECT s.*, f.grade
            FROM submissions s
            LEFT JOIN feedback f ON s.id = f.submission_id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [userId]);

        // Obtener progreso
        const progressResult = await query(`
            SELECT * FROM student_progress WHERE user_id = $1
        `, [userId]);

        res.json({
            ...user,
            submissions: submissionsResult.rows,
            progress: progressResult.rows
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
        const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
        if (level) { updates.push(`level = $${paramIndex++}`); params.push(level); }
        if (role) { updates.push(`role = $${paramIndex++}`); params.push(role); }
        if (active !== undefined) { updates.push(`active = $${paramIndex++}`); params.push(active); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        params.push(userId);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

        res.json({ message: 'Usuario actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

/**
 * PUT /api/users/:id/password
 * Cambiar contrasena de usuario (solo admin)
 */
router.put('/:id/password', authenticateToken, requireAdmin, [
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.params.id;
        const { password } = req.body;

        const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        res.json({ message: 'Contrasena actualizada correctamente' });

    } catch (error) {
        console.error('Error al cambiar contrasena:', error);
        res.status(500).json({ error: 'Error al cambiar contrasena' });
    }
});

/**
 * DELETE /api/users/:id
 * Eliminar usuario (solo admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // No permitir que admin se elimine a si mismo
        if (userId == req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'Usuario eliminado correctamente' });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;
