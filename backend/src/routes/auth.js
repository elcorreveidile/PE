/**
 * Rutas de autenticacion (PostgreSQL)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');


const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.cognoscencia.com').replace(/\/$/, '');

function buildResetLink(token) {
    return `${FRONTEND_URL}/auth/reset-password.html?token=${token}`;
}

async function sendPasswordResetEmail({ email, name, resetLink }) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: 'Restablecer contrasena - Cognoscencia',
        text: `Hola ${name || ''}.

Para restablecer tu contrasena visita: ${resetLink}

Este enlace expira en 1 hora.
Si no solicitaste este cambio, ignora este mensaje.`,
        html: `
            <p>Hola ${name || ''},</p>
            <p>Hemos recibido una solicitud para restablecer tu contrasena.</p>
            <p><a href="${resetLink}">Haz clic aqui para restablecer tu contrasena</a></p>
            <p>Este enlace expira en 1 hora.</p>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
        `
    });

    return true;
}

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('level').optional().isIn(['C2-8', 'C2-9', 'C2']).withMessage('Nivel invalido'),
    body().custom((value, { req }) => {
        const registrationCode = req.body.registration_code ?? req.body.registrationCode;
        if (!registrationCode || !String(registrationCode).trim()) {
            throw new Error('Codigo de registro requerido');
        }
        return true;
    })
], async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, level, motivation } = req.body;
        const registrationCode = (req.body.registration_code ?? req.body.registrationCode ?? '').toString().trim();

        // Verificar codigo de registro
        const validCode = process.env.REGISTRATION_CODE || 'PIO7-2026-CLM';
        if (registrationCode !== validCode) {
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

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperacion de contrasena
 */
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Email invalido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        const isDevelopment = process.env.NODE_ENV !== 'production';

        // Buscar usuario
        const result = await query('SELECT id, email, name FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            // Por seguridad, no revelamos si el email existe
            return res.json({ message: 'Si el email existe, recibiras instrucciones para restablecer la contrasena' });
        }

        const user = result.rows[0];

        // Generar token seguro
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetLink = buildResetLink(resetToken);

        // Expiracion: 1 hora
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Limpiar tokens anteriores del mismo usuario
        await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

        // Guardar token en base de datos
        await query(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
        `, [user.id, resetToken, expiresAt]);

        console.log(`[Password Reset] Token for ${email}: ${resetToken}`);
        console.log(`[Password Reset] Reset link: https://www.cognoscencia.com/auth/reset-password.html?token=${resetToken}`);

        const sendResetEmail = () => sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetLink
        });

        if (!isDevelopment) {
            sendResetEmail().catch((emailError) => {
                console.error('Error enviando email de recuperacion:', emailError);
            });

            return res.json({ message: 'Si el email existe, recibiras instrucciones para restablecer la contrasena' });
        }

        await sendResetEmail().catch((emailError) => {
            console.error('Error enviando email de recuperacion:', emailError);
        });

        res.json({
            message: 'Token de recuperacion generado (modo desarrollo)',
            devToken: resetToken,
            resetLink: `https://www.cognoscencia.com/auth/reset-password.html?token=${resetToken}`,
            isDevelopment: true
        });

    } catch (error) {
        console.error('Error en solicitud de recuperacion:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

/**
 * POST /api/auth/verify-reset-token
 * Verificar si el token de recuperacion es valido
 */
router.post('/verify-reset-token', [
    body('token').notEmpty().withMessage('Token requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token } = req.body;

        // Buscar token
        const result = await query(`
            SELECT prt.*, u.email
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > CURRENT_TIMESTAMP
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token invalido o expirado' });
        }

        res.json({
            valid: true,
            email: result.rows[0].email
        });

    } catch (error) {
        console.error('Error al verificar token:', error);
        res.status(500).json({ error: 'Error al verificar token' });
    }
});

/**
 * POST /api/auth/reset-password
 * Restablecer contrasena con token
 */
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Token requerido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, password } = req.body;

        // Buscar token y obtener user_id
        const tokenResult = await query(`
            SELECT user_id, expires_at, used
            FROM password_reset_tokens
            WHERE token = $1
        `, [token]);

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ error: 'Token invalido' });
        }

        const tokenData = tokenResult.rows[0];

        // Verificar expiracion
        if (new Date(tokenData.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Token expirado' });
        }

        // Verificar si ya fue usado
        if (tokenData.used) {
            return res.status(400).json({ error: 'Token ya utilizado' });
        }

        // Hash de nueva contrasena
        const hashedPassword = await bcrypt.hash(password, 10);

        // Actualizar contrasena
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, tokenData.user_id]);

        // Marcar token como usado
        await query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

        res.json({ message: 'Contrasena restablecida correctamente' });

    } catch (error) {
        console.error('Error al restablecer contrasena:', error);
        res.status(500).json({ error: 'Error al restablecer contrasena' });
    }
});

module.exports = router;
