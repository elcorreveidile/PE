/**
 * Middleware de autenticacion JWT (PostgreSQL)
 */

const jwt = require('jsonwebtoken');
const { query } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

/**
 * Verificar token JWT
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar que el usuario aun existe y esta activo
        const result = await query(
            'SELECT id, email, name, role, active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        if (!user.active) {
            return res.status(403).json({ error: 'Cuenta desactivada' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token invalido' });
        }
        console.error('Error en autenticacion:', err);
        return res.status(500).json({ error: 'Error de autenticacion' });
    }
}

/**
 * Verificar que el usuario es administrador
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    next();
}

/**
 * Middleware opcional - no bloquea si no hay token
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await query(
            'SELECT id, email, name, role, active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length > 0 && result.rows[0].active) {
            req.user = result.rows[0];
        }
    } catch (err) {
        // Token invalido, continuar sin usuario
    }

    next();
}

/**
 * Generar token JWT
 */
function generateToken(userId) {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

module.exports = {
    authenticateToken,
    requireAdmin,
    optionalAuth,
    generateToken
};
