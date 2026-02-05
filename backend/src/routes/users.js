/**
 * Rutas de usuarios (admin)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Listar usuarios (solo admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, active } = req.query;
        const whereClause = [];
        const params = [];

        if (role) {
            params.push(role);
            whereClause.push(`role = $${params.length}`);
        }

        if (active !== undefined) {
            params.push(active === 'true');
            whereClause.push(`active = $${params.length}`);
        }

        const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

        const usersResult = await query(
            `SELECT
                u.id, u.email, u.name, u.role, u.level, u.active, u.created_at, u.last_login,
                (SELECT COUNT(*)::int FROM submissions WHERE user_id = u.id) as submissions_count,
                (SELECT COUNT(*)::int FROM submissions WHERE user_id = u.id AND status = 'reviewed') as reviewed_count
             FROM users u
             ${whereSQL}
             ORDER BY u.created_at DESC`,
            params
        );

        res.json(usersResult.rows);
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});

/**
 * POST /api/users
 * Crear usuario (solo admin)
 */
router.post('/', authenticateToken, requireAdmin, [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('role').optional().isIn(['student', 'admin']).withMessage('Rol inválido'),
    body('level').optional().isString(),
    body('active').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, role = 'student', level, active } = req.body;

        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows[0]) {
            return res.status(400).json({ error: 'Este email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const activeValue = active === undefined ? true : Boolean(active);

        const insertResult = await query(
            `INSERT INTO users (email, password, name, role, level, active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [email, hashedPassword, name, role, level || 'C2', activeValue]
        );

        const userId = insertResult.rows[0].id;

        res.status(201).json({
            id: userId,
            email,
            name,
            role,
            level: level || 'C2',
            active: activeValue
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

/**
 * GET /api/users/:id
 * Obtener usuario específico (solo admin)
 */
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const userResult = await query(
            `SELECT id, email, name, role, level, motivation, active, created_at, last_login
             FROM users WHERE id = $1`,
            [userId]
        );

        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const submissionsResult = await query(
            `SELECT s.*, f.grade
             FROM submissions s
             LEFT JOIN feedback f ON s.id = f.submission_id
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC`,
            [userId]
        );

        const progressResult = await query(
            'SELECT * FROM student_progress WHERE user_id = $1',
            [userId]
        );

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

        const userResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (!userResult.rows[0]) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const updates = [];
        const values = [];

        if (name) {
            values.push(name);
            updates.push(`name = $${values.length}`);
        }

        if (level) {
            values.push(level);
            updates.push(`level = $${values.length}`);
        }

        if (role) {
            values.push(role);
            updates.push(`role = $${values.length}`);
        }

        if (active !== undefined) {
            values.push(Boolean(active));
            updates.push(`active = $${values.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        values.push(userId);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

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

        const userResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (!userResult.rows[0]) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

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

        if (String(userId) === String(req.user.id)) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const userResult = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (!userResult.rows[0]) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await query('DELETE FROM users WHERE id = $1', [userId]);

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
        const statsResult = await query(
            `SELECT
                COUNT(*)::int as total,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END)::int as students,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END)::int as admins,
                SUM(CASE WHEN active = true THEN 1 ELSE 0 END)::int as active
             FROM users`
        );

        const byLevelResult = await query(
            `SELECT level, COUNT(*)::int as count
             FROM users
             WHERE role = 'student'
             GROUP BY level`
        );

        const recentResult = await query(
            `SELECT DATE(created_at) as date, COUNT(*)::int as count
             FROM users
             WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        res.json({
            stats: statsResult.rows[0],
            byLevel: byLevelResult.rows,
            recentRegistrations: recentResult.rows
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
