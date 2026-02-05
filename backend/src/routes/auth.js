/**
 * Rutas de autenticación
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('level').optional().isIn(['C2-8', 'C2-9', 'C2']).withMessage('Nivel inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, level, motivation, registrationCode } = req.body;

        const requiredCode = process.env.REGISTRATION_CODE;
        if (requiredCode) {
            const providedCode = (registrationCode || '').trim();
            if (!providedCode) {
                return res.status(400).json({ error: 'Código de inscripción requerido' });
            }
            if (providedCode !== requiredCode) {
                return res.status(403).json({ error: 'Código de inscripción incorrecto' });
            }
        }

        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows[0]) {
            return res.status(400).json({ error: 'Este email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertResult = await query(
            `INSERT INTO users (email, password, name, level, motivation)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [email, hashedPassword, name, level || 'C2', motivation || null]
        );

        const userId = insertResult.rows[0].id;
        const token = generateToken(userId);

        await query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'welcome', 'Bienvenido/a al curso', 'Te has registrado correctamente en el curso de Producción Escrita C2. El curso comienza el 3 de febrero de 2026.')`,
            [userId]
        );

        res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: {
                id: userId,
                email,
                name,
                level: level || 'C2',
                role: 'student'
            },
            token
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        if (!user.active) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        const token = generateToken(user.id);

        res.json({
            message: 'Sesión iniciada correctamente',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                level: user.level,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await query(
            `SELECT id, email, name, role, level, motivation, created_at, last_login
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const statsResult = await query(
            `SELECT
                (SELECT COUNT(*)::int FROM submissions WHERE user_id = $1) as submissions_count,
                (SELECT COUNT(*)::int FROM submissions WHERE user_id = $1 AND status = 'reviewed') as reviewed_count,
                (SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND read = false) as unread_notifications`,
            [req.user.id]
        );

        res.json({
            ...user,
            stats: statsResult.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener información del usuario' });
    }
});

/**
 * PUT /api/auth/password
 * Cambiar contraseña
 */
router.put('/password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        const userResult = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

/**
 * PUT /api/auth/profile
 * Actualizar perfil
 */
router.put('/profile', authenticateToken, [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Nombre inválido'),
    body('motivation').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, motivation } = req.body;
        const updates = [];
        const values = [];

        if (name) {
            values.push(name);
            updates.push(`name = $${values.length}`);
        }

        if (motivation !== undefined) {
            values.push(motivation);
            updates.push(`motivation = $${values.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        values.push(req.user.id);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

        res.json({ message: 'Perfil actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

module.exports = router;
