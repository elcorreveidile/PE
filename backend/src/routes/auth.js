/**
 * Rutas de autenticacion (PostgreSQL)
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
    body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('level').optional().isIn(['C2-8', 'C2-9', 'C2']).withMessage('Nivel invalido'),
    body('registration_code').notEmpty().withMessage('Codigo de registro requerido')
], async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, level, motivation, registration_code } = req.body;

        // Verificar codigo de registro
        const validCode = process.env.REGISTRATION_CODE || 'PIO7-2026-CLM';
        if (registration_code !== validCode) {
            return res.status(400).json({ error: 'Codigo de registro invalido' });
        }

        // Verificar si el email ya existe
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Este email ya esta registrado' });
        }

        // Hash de la contrasena
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const result = await query(`
            INSERT INTO users (email, password, name, level, motivation)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [email, hashedPassword, name, level || 'C2', motivation || null]);

        const userId = result.rows[0].id;

        // Generar token
        const token = generateToken(userId);

        // Crear notificacion de bienvenida
        await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'welcome', 'Bienvenido/a al curso', 'Te has registrado correctamente en el curso de Produccion Escrita C2. El curso comienza el 2 de febrero de 2026.')
        `, [userId]);

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
 * Iniciar sesion
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
    body('password').notEmpty().withMessage('Contrasena requerida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Buscar usuario
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email o contrasena incorrectos' });
        }

        const user = result.rows[0];

        if (!user.active) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        // Verificar contrasena
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email o contrasena incorrectos' });
        }

        // Actualizar ultimo login
        await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        // Generar token
        const token = generateToken(user.id);

        res.json({
            message: 'Sesion iniciada correctamente',
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
        res.status(500).json({ error: 'Error al iniciar sesion' });
    }
});

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await query(`
            SELECT id, email, name, role, level, motivation, created_at, last_login
            FROM users WHERE id = $1
        `, [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userResult.rows[0];

        // Contar entregas y notificaciones no leidas
        const statsResult = await query(`
            SELECT
                (SELECT COUNT(*) FROM submissions WHERE user_id = $1) as submissions_count,
                (SELECT COUNT(*) FROM submissions WHERE user_id = $1 AND status = 'reviewed') as reviewed_count,
                (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false) as unread_notifications
        `, [req.user.id]);

        const stats = statsResult.rows[0];

        res.json({
            ...user,
            stats
        });

    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener informacion del usuario' });
    }
});

/**
 * PUT /api/auth/password
 * Cambiar contrasena
 */
router.put('/password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Contrasena actual requerida'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contrasena debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Obtener usuario con contrasena
        const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        // Verificar contrasena actual
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contrasena actual incorrecta' });
        }

        // Hash de nueva contrasena
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar contrasena
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

        res.json({ message: 'Contrasena actualizada correctamente' });

    } catch (error) {
        console.error('Error al cambiar contrasena:', error);
        res.status(500).json({ error: 'Error al cambiar contrasena' });
    }
});

/**
 * PUT /api/auth/profile
 * Actualizar perfil
 */
router.put('/profile', authenticateToken, [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Nombre invalido'),
    body('motivation').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, motivation } = req.body;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (name) {
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
        }
        if (motivation !== undefined) {
            updates.push(`motivation = $${paramIndex++}`);
            params.push(motivation);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        params.push(req.user.id);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

        res.json({ message: 'Perfil actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

module.exports = router;
