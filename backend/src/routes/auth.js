/**
 * Rutas de autenticacion (PostgreSQL)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Resend } = require('resend');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { generateToken, authenticateToken } = require('../middleware/auth');


const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.cognoscencia.com').replace(/\/$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@cognoscencia.com';

// Inicializar Resend si hay API key
let resend;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
}

function buildResetLink(token) {
    return `${FRONTEND_URL}/auth/reset-password.html?token=${token}`;
}

async function sendPasswordResetEmail({ email, name, resetLink }) {
    if (!resend) {
        console.warn('Resend no configurado (RESEND_API_KEY no definida)');
        return false;
    }

    try {
        await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: email,
            subject: 'Restablecer contraseña - Cognoscencia',
            html: `
                <p>Hola ${name || ''},</p>
                <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                <p><a href="${resetLink}">Haz clic aquí para restablecer tu contraseña</a></p>
                <p>Este enlace expira en 1 hora.</p>
                <p>Si no solicitaste este cambio, ignora este correo.</p>
            `
        });
        return true;
    } catch (error) {
        console.error('Error enviando email con Resend:', error);
        return false;
    }
}

/**
 * POST /api/auth/register
 * Registrar nuevo usuario con soporte multi-curso
 */
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
    body('name').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('level').optional().isIn(['C1', 'C2-8', 'C2-9', 'C2']).withMessage('Nivel invalido'),
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

        // Validar código de registro y obtener curso
        let courseId = null;
        let courseName = '';
        let courseTitle = '';

        // SOLUCIÓN TEMPORAL: Mapeo directo de códigos mientras se ejecuta la migración en producción
        const temporaryCodeMapping = {
            'C1-2026-ARTE': {
                courseId: 2, // ID temporal para C1
                courseName: 'Arte y Sociedad C1',
                courseTitle: 'C1 Arte y Sociedad en la Cultura Hispánica',
                level: 'C1'
            },
            'PIO7-2026-CLM': {
                courseId: 1, // ID temporal para C2
                courseName: 'Producción Escrita C2',
                courseTitle: 'Producción Escrita C2 | Curso de Escritura Avanzada en Español',
                level: 'C2'
            }
        };

        try {
            // Intentar validar contra la nueva tabla registration_codes
            const codeValidation = await query(`
                SELECT rc.course_id, c.name, c.title, rc.current_uses, rc.max_uses
                FROM registration_codes rc
                JOIN courses c ON rc.course_id = c.id
                WHERE rc.code = $1
                AND rc.is_active = TRUE
                AND (rc.valid_until IS NULL OR rc.valid_until > CURRENT_TIMESTAMP)
                AND (rc.max_uses IS NULL OR rc.current_uses < rc.max_uses)
            `, [registrationCode]);

            if (codeValidation.rows.length === 0) {
                // Verificar si es un código del mapeo temporal
                if (temporaryCodeMapping[registrationCode]) {
                    const tempCourse = temporaryCodeMapping[registrationCode];
                    courseId = tempCourse.courseId;
                    courseName = tempCourse.courseName;
                    courseTitle = tempCourse.courseTitle;

                    console.log(`Usando mapeo temporal para código: ${registrationCode}`);
                } else {
                    // Fallback al sistema antiguo
                    const validCode = process.env.REGISTRATION_CODE || 'PIO7-2026-CLM';
                    if (registrationCode !== validCode) {
                        return res.status(400).json({ error: 'Codigo de registro invalido' });
                    }
                    // Usar curso por defecto (C2)
                    const defaultCourse = await query("SELECT id, name, title FROM courses WHERE code = 'C2-PROD-ESCRITA'");
                    if (defaultCourse.rows.length > 0) {
                        courseId = defaultCourse.rows[0].id;
                        courseName = defaultCourse.rows[0].name;
                        courseTitle = defaultCourse.rows[0].title;
                    }
                }
            } else {
                const codeData = codeValidation.rows[0];
                courseId = codeData.course_id;
                courseName = codeData.name;
                courseTitle = codeData.title;

                // Incrementar contador de usos del código
                await query(`
                    UPDATE registration_codes
                    SET current_uses = current_uses + 1
                    WHERE code = $1
                `, [registrationCode]);
            }
        } catch (error) {
            // Si falla la consulta, usar mapeo temporal primero
            console.warn('Error al validar código contra nueva tabla, usando fallback:', error.message);

            if (temporaryCodeMapping[registrationCode]) {
                const tempCourse = temporaryCodeMapping[registrationCode];
                courseId = tempCourse.courseId;
                courseName = tempCourse.courseName;
                courseTitle = tempCourse.courseTitle;
            } else {
                // Último fallback al sistema antiguo
                const validCode = process.env.REGISTRATION_CODE || 'PIO7-2026-CLM';
                if (registrationCode !== validCode) {
                    return res.status(400).json({ error: 'Codigo de registro invalido' });
                }
                if (registrationCode === validCode) {
                    courseId = 1;
                    courseName = 'Producción Escrita C2';
                    courseTitle = 'Producción Escrita C2 | Curso de Escritura Avanzada en Español';
                }
            }
        }

        // Verificar si el email ya existe
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Este email ya esta registrado' });
        }

        // Hash de la contrasena
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario con course_id
        const result = await query(`
            INSERT INTO users (email, password, name, level, motivation, course_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, course_id
        `, [email, hashedPassword, name, level || 'C2', motivation || null, courseId]);

        const userId = result.rows[0].id;

        // Generar token
        const token = generateToken(userId);

        // Mensaje de bienvenida personalizado según curso
        const welcomeMessage = courseTitle
            ? `Te has registrado correctamente en ${courseTitle}. Bienvenido/a al curso.`
            : 'Te has registrado correctamente en el curso de Produccion Escrita C2. El curso comienza el 2 de febrero de 2026.';

        // Crear notificacion de bienvenida
        await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'welcome', 'Bienvenido/a al curso', $2)
        `, [userId, welcomeMessage]);

        res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: {
                id: userId,
                email,
                name,
                level: level || 'C2',
                role: 'student',
                course_id: courseId,
                course_name: courseName
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

        // Buscar usuario con información del curso
        const result = await query(`
            SELECT u.*, c.name as course_name, c.title as course_title, c.code as course_code
            FROM users u
            LEFT JOIN courses c ON u.course_id = c.id
            WHERE u.email = $1
        `, [email]);

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
                role: user.role,
                course_id: user.course_id,
                course_name: user.course_name,
                course_title: user.course_title,
                course_code: user.course_code
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
            SELECT u.id, u.email, u.name, u.role, u.level, u.motivation, u.created_at, u.last_login, u.course_id,
                   c.name as course_name, c.title as course_title, c.code as course_code, c.description as course_description
            FROM users u
            LEFT JOIN courses c ON u.course_id = c.id
            WHERE u.id = $1
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
        try {
            await sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                resetLink
            });
        } catch (emailError) {
            console.error('Error enviando email de recuperacion:', emailError);
        }

        if (!isDevelopment) {
            return res.json({ message: 'Si el email existe, recibiras instrucciones para restablecer la contrasena' });
        }

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
