/**
 * Rutas de OAuth 2.0 (Google + Apple Sign In)
 * Soporta login y registro con código de inscripción
 */

const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Configuración OAuth
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.cognoscencia.com').replace(/\/$/, '');

// Códigos OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || '';

// Código de registro requerido
const REGISTRATION_CODE = process.env.REGISTRATION_CODE || 'PIO7-2026-CLM';

/**
 * Intercambiar código de autorización por token de Google
 */
async function getGoogleToken(code) {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const redirectUri = `${FRONTEND_URL}/auth/oauth-callback.html`;

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    if (!response.ok) {
        throw new Error('Error al obtener token de Google');
    }

    return await response.json();
}

/**
 * Obtener perfil de usuario de Google
 */
async function getGoogleProfile(accessToken) {
    const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );

    if (!response.ok) {
        throw new Error('Error al obtener perfil de Google');
    }

    return await response.json();
}

/**
 * Verificar token de Apple
 */
async function verifyAppleToken(idToken) {
    // Apple requiere verificación JWT del token
    // Por ahora, decodificamos sin verificar firma (para producción, verificar firma)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
        throw new Error('Token de Apple inválido');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Verificar expiración
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token de Apple expirado');
    }

    // Verificar audience
    if (payload.aud !== APPLE_CLIENT_ID) {
        throw new Error('Token de Apple no emitido para esta app');
    }

    return payload;
}

/**
 * POST /api/auth/oauth/google
 * Login o registro con Google OAuth
 */
router.post('/google', [
    body('code').notEmpty().withMessage('Código de OAuth requerido'),
    body('registrationCode').optional().trim()
], async (req, res) => {
    try {
        console.log('=== Google OAuth Request ===');
        console.log('Has GOOGLE_CLIENT_ID:', !!GOOGLE_CLIENT_ID);
        console.log('Has GOOGLE_CLIENT_SECRET:', !!GOOGLE_CLIENT_SECRET);
        console.log('FRONTEND_URL:', FRONTEND_URL);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { code, registrationCode } = req.body;
        console.log('Code received:', !!code);

        // 1. Intercambiar código por access token
        const tokenData = await getGoogleToken(code);

        // 2. Obtener perfil del usuario
        const profile = await getGoogleProfile(tokenData.access_token);

        const googleId = profile.id;
        const email = profile.email;
        const name = profile.given_name && profile.family_name
            ? `${profile.given_name} ${profile.family_name}`
            : profile.name || profile.email.split('@')[0];
        const avatarUrl = profile.picture;

        // 3. Buscar usuario existente por Google ID
        let userResult = await query(
            'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
            ['google', googleId]
        );

        // 4. Si existe usuario con Google ID → Login
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];

            if (!user.active) {
                return res.status(403).json({ error: 'Cuenta desactivada' });
            }

            await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            const token = generateToken(user.id);

            return res.json({
                message: 'Login con Google exitoso',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    level: user.level,
                    avatar_url: user.avatar_url
                },
                token
            });
        }

        // 5. Buscar usuario con mismo email (account linking)
        userResult = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];

            // Si ya existe con email pero sin provider → Link Google
            if (!user.provider) {
                await query(
                    'UPDATE users SET provider = $1, provider_id = $2, avatar_url = $3 WHERE id = $4',
                    ['google', googleId, avatarUrl, user.id]
                );

                await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
                const token = generateToken(user.id);

                return res.json({
                    message: 'Cuenta vinculada con Google exitosamente',
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        level: user.level,
                        avatar_url: user.avatar_url
                    },
                    token
                });
            }

            // Usuario ya existe con otro provider
            return res.status(400).json({
                error: 'Ya existe una cuenta con este email',
                existingProvider: user.provider,
                message: 'Esta cuenta ya está registrada con otro método de inicio de sesión'
            });
        }

        // 6. Nuevo usuario → Verificar código de registro
        if (!registrationCode || registrationCode !== REGISTRATION_CODE) {
            return res.json({
                message: 'Código de registro requerido',
                needsRegistrationCode: true,
                email,
                name,
                provider: 'google',
                providerId: googleId,
                avatarUrl
            });
        }

        // 7. Crear nuevo usuario
        const newUserResult = await query(`
            INSERT INTO users (email, name, provider, provider_id, avatar_url, role, level)
            VALUES ($1, $2, $3, $4, $5, 'student', 'C2')
            RETURNING id, email, name, role, level, avatar_url
        `, [email, name, 'google', googleId, avatarUrl]);

        const newUser = newUserResult.rows[0];

        // Crear notificación de bienvenida
        await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'welcome', 'Bienvenido/a al curso', 'Te has registrado correctamente en el curso de Producción Escrita C2.')
        `, [newUser.id]);

        const token = generateToken(newUser.id);

        res.status(201).json({
            message: 'Registro con Google exitoso',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                level: newUser.level,
                avatar_url: newUser.avatar_url
            },
            token
        });

    } catch (error) {
        console.error('Error en OAuth Google:', error);
        console.error('Stack:', error.stack);
        console.error('Message:', error.message);
        res.status(500).json({
            error: 'Error al autenticar con Google',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * POST /api/auth/oauth/apple
 * Login o registro con Apple Sign In
 */
router.post('/apple', [
    body('id_token').notEmpty().withMessage('ID token de Apple requerido'),
    body('registrationCode').optional().trim(),
    body('firstName').optional(),
    body('lastName').optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id_token, registrationCode, firstName, lastName } = req.body;

        // 1. Verificar token de Apple
        const applePayload = await verifyAppleToken(id_token);

        const appleId = applePayload.sub;
        const email = applePayload.email;
        const name = firstName && lastName
            ? `${firstName} ${lastName}`
            : (firstName || lastName || (email ? email.split('@')[0] : 'Usuario'));

        // Apple no siempre devuelve email (privacidad)
        // Si no hay email, usamos un placeholder basado en Apple ID
        const userEmail = email || `${appleId}@privaterelay.appleid.com`;

        // 2. Buscar usuario existente por Apple ID
        let userResult = await query(
            'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
            ['apple', appleId]
        );

        // 3. Si existe usuario con Apple ID → Login
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];

            if (!user.active) {
                return res.status(403).json({ error: 'Cuenta desactivada' });
            }

            await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            const token = generateToken(user.id);

            return res.json({
                message: 'Login con Apple exitoso',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    level: user.level
                },
                token
            });
        }

        // 4. Buscar usuario con mismo email (account linking)
        userResult = await query('SELECT * FROM users WHERE email = $1', [userEmail]);

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];

            // Si ya existe con email pero sin provider → Link Apple
            if (!user.provider) {
                await query(
                    'UPDATE users SET provider = $1, provider_id = $2 WHERE id = $3',
                    ['apple', appleId, user.id]
                );

                await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
                const token = generateToken(user.id);

                return res.json({
                    message: 'Cuenta vinculada con Apple exitosamente',
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        level: user.level
                    },
                    token
                });
            }

            // Usuario ya existe con otro provider
            return res.status(400).json({
                error: 'Ya existe una cuenta con este email',
                existingProvider: user.provider,
                message: 'Esta cuenta ya está registrada con otro método de inicio de sesión'
            });
        }

        // 5. Nuevo usuario → Verificar código de registro
        if (!registrationCode || registrationCode !== REGISTRATION_CODE) {
            return res.json({
                message: 'Código de registro requerido',
                needsRegistrationCode: true,
                email: userEmail,
                name,
                provider: 'apple',
                providerId: appleId
            });
        }

        // 6. Crear nuevo usuario
        const newUserResult = await query(`
            INSERT INTO users (email, name, provider, provider_id, role, level)
            VALUES ($1, $2, $3, $4, 'student', 'C2')
            RETURNING id, email, name, role, level
        `, [userEmail, name, 'apple', appleId]);

        const newUser = newUserResult.rows[0];

        // Crear notificación de bienvenida
        await query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'welcome', 'Bienvenido/a al curso', 'Te has registrado correctamente en el curso de Producción Escrita C2.')
        `, [newUser.id]);

        const token = generateToken(newUser.id);

        res.status(201).json({
            message: 'Registro con Apple exitoso',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                level: newUser.level
            },
            token
        });

    } catch (error) {
        console.error('Error en OAuth Apple:', error);
        res.status(500).json({ error: 'Error al autenticar con Apple' });
    }
});

module.exports = router;
