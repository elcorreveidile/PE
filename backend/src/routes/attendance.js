/**
 * Rutas de asistencia - Sistema de control de asistencia con QR
 */

const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function isUndefinedTableError(error) {
    return error && (error.code === '42P01' || String(error.message || '').includes('relation "attendance" does not exist'));
}

function isNotNullUserIdError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error && error.code === '23502' && message.includes('user_id');
}

/**
 * Generar código de verificación único
 */
function generateVerificationCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres hexadecimales
}

/**
 * POST /api/attendance/generate
 * Generar código QR para la sesión de hoy (solo admin)
 */
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { sessionId, force } = req.body;

        // Obtener fecha actual
        const today = new Date().toISOString().split('T')[0];

        // Verificar si ya existe un código para hoy
        const existingResult = await query(`
            SELECT id, verification_code, session_id
            FROM attendance
            WHERE date = $1
            LIMIT 1
        `, [today]);

        if (existingResult.rows.length > 0 && !force) {
            return res.json({
                message: 'Ya existe un código de asistencia para hoy',
                verificationCode: existingResult.rows[0].verification_code,
                sessionId: existingResult.rows[0].session_id,
                date: today,
                reused: true
            });
        }

        // Si force es true, eliminar el código existente del día
        if (existingResult.rows.length > 0 && force) {
            await query(`
                DELETE FROM attendance
                WHERE date = $1
            `, [today]);
        }

        // Generar código único
        let verificationCode;
        let codeExists = true;
        let attempts = 0;

        while (codeExists && attempts < 10) {
            verificationCode = generateVerificationCode();
            const checkResult = await query(
                'SELECT id FROM attendance WHERE verification_code = $1',
                [verificationCode]
            );
            codeExists = checkResult.rows.length > 0;
            attempts++;
        }

        if (codeExists) {
            return res.status(500).json({ error: 'No se pudo generar un código único' });
        }

        // Si no se proporciona session_id, obtener la sesión actual
        let targetSessionId = sessionId;
        if (!targetSessionId) {
            const sessionResult = await query(`
                SELECT id FROM course_sessions
                WHERE
                    date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                    AND (date::text)::date >= CURRENT_DATE
                ORDER BY (date::text)::date ASC
                LIMIT 1
            `);

            if (sessionResult.rows.length > 0) {
                targetSessionId = sessionResult.rows[0].id;
            }
        }

        // Crear registro de código (sin usuario aún)
        await query(`
            INSERT INTO attendance (user_id, session_id, verification_code, date)
            VALUES (NULL, $1, $2, $3)
        `, [targetSessionId, verificationCode, today]);

        res.json({
            message: 'Código de asistencia generado exitosamente',
            verificationCode,
            sessionId: targetSessionId,
            date: today,
            reused: false
        });

    } catch (error) {
        console.error('Error generando código de asistencia:', error);
        if (isUndefinedTableError(error) || isNotNullUserIdError(error)) {
            return res.status(500).json({
                error: 'La tabla de asistencia requiere migración. Ejecuta POST /api/migrate/attendance y vuelve a intentar.'
            });
        }
        res.status(500).json({ error: 'Error al generar código de asistencia' });
    }
});

/**
 * GET /api/attendance/session/:code
 * Obtener información de la sesión por código de verificación
 */
router.get('/session/:code', authenticateToken, async (req, res) => {
    try {
        const code = req.params.code;

        const result = await query(`
            SELECT
                a.id as attendance_id,
                a.session_id,
                a.verification_code,
                a.date,
                cs.title as session_title,
                cs.day as session_day,
                cs.date as session_date
            FROM attendance a
            LEFT JOIN course_sessions cs ON a.session_id = cs.id
            WHERE a.verification_code = $1 AND a.user_id IS NULL
            ORDER BY a.created_at DESC
            LIMIT 1
        `, [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Código no válido o expirado' });
        }

        const attendance = result.rows[0];

        res.json({
            attendanceId: attendance.attendance_id,
            sessionId: attendance.session_id,
            sessionTitle: attendance.session_title,
            sessionDay: attendance.session_day,
            sessionDate: attendance.session_date,
            date: attendance.date,
            verificationCode: attendance.verification_code
        });

    } catch (error) {
        console.error('Error obteniendo sesión por código:', error);
        res.status(500).json({ error: 'Error al verificar código' });
    }
});

/**
 * POST /api/attendance/check-in
 * Registrar asistencia del estudiante
 */
router.post('/check-in', authenticateToken, [
    body('verificationCode').notEmpty().withMessage('El código es requerido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { verificationCode } = req.body;
        const userId = req.user.id;

        // Verificar que el usuario es estudiante
        if (req.user.role !== 'student') {
            return res.status(403).json({ error: 'Solo estudiantes pueden registrar asistencia' });
        }

        // Verificar que el código es válido
        const codeResult = await query(`
            SELECT id, session_id, date, created_at
            FROM attendance
            WHERE verification_code = $1 AND user_id IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `, [verificationCode]);

        if (codeResult.rows.length === 0) {
            console.log('❌ Check-in fallido: Código no encontrado', { code: verificationCode });
            return res.status(404).json({ error: 'Código no válido o expirado' });
        }

        const attendanceRecord = codeResult.rows[0];

        // Verificar que el código es del día de hoy (los códigos expiran al día siguiente)
        const today = new Date().toISOString().split('T')[0];
        console.log('📅 Validando fecha:', { 
            codeDate: attendanceRecord.date, 
            today: today, 
            match: attendanceRecord.date === today,
            recordId: attendanceRecord.id,
            createdAt: attendanceRecord.created_at 
        });

        if (attendanceRecord.date !== today) {
            console.log('❌ Código expirado:', { codeDate: attendanceRecord.date, today });
            return res.status(404).json({ error: 'Código expirado. Los códigos solo son válidos el día de generación.' });
        }

        // Verificar si el usuario ya tiene asistencia registrada hoy
        const existingAttendance = await query(`
            SELECT id FROM attendance
            WHERE user_id = $1 AND date = $2
        `, [userId, attendanceRecord.date]);

        if (existingAttendance.rows.length > 0) {
            return res.status(400).json({
                error: 'Ya tienes registrada la asistencia de hoy'
            });
        }

        // Actualizar el registro con el usuario
        await query(`
            UPDATE attendance
            SET user_id = $1, verified_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [userId, attendanceRecord.id]);

        res.json({
            message: 'Asistencia registrada exitosamente',
            sessionId: attendanceRecord.session_id,
            date: attendanceRecord.date
        });

    } catch (error) {
        console.error('Error registrando asistencia:', error);
        res.status(500).json({ error: 'Error al registrar asistencia' });
    }
});

/**
 * GET /api/attendance
 * Obtener lista de asistencias (solo admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date, userId, sessionId } = req.query;

        let whereClause = [];
        let params = [];
        let paramIndex = 1;

        if (date) {
            whereClause.push(`a.date = $${paramIndex++}`);
            params.push(date);
        }

        if (userId) {
            whereClause.push(`a.user_id = $${paramIndex++}`);
            params.push(userId);
        }

        if (sessionId) {
            whereClause.push(`a.session_id = $${paramIndex++}`);
            params.push(sessionId);
        }

        const whereSQL = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

        const result = await query(`
            SELECT
                a.id,
                a.user_id,
                a.session_id,
                a.date,
                a.verification_code,
                a.verified_at,
                u.name as user_name,
                u.email as user_email,
                u.level as user_level,
                cs.title as session_title,
                cs.day as session_day
            FROM attendance a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN course_sessions cs ON a.session_id = cs.id
            ${whereSQL}
            ORDER BY a.date DESC, a.verified_at DESC
        `, params);

        res.json(result.rows);

    } catch (error) {
        console.error('Error obteniendo asistencias:', error);
        res.status(500).json({ error: 'Error al obtener asistencias' });
    }
});

/**
 * GET /api/attendance/stats
 * Estadísticas de asistencia (solo admin)
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Total de estudiantes
        const totalStudents = await query(`
            SELECT COUNT(*) as count FROM users WHERE role = 'student'
        `);

        // Asistencias hoy
        const todayResult = await query(`
            SELECT COUNT(*) as count FROM attendance
            WHERE date = CURRENT_DATE AND user_id IS NOT NULL
        `);

        // Asistencias esta semana
        const weekResult = await query(`
            SELECT COUNT(*) as count FROM attendance
            WHERE date >= CURRENT_DATE - INTERVAL '7 days' AND user_id IS NOT NULL
        `);

        // Asistencias por sesión
        const bySession = await query(`
            SELECT
                cs.id,
                cs.title,
                cs.date,
                COUNT(a.id) as attendance_count
            FROM course_sessions cs
            LEFT JOIN attendance a ON cs.id = a.session_id
            WHERE
                cs.date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                AND (cs.date::text)::date <= CURRENT_DATE
            GROUP BY cs.id, cs.title, cs.date
            ORDER BY (cs.date::text)::date
        `);

        res.json({
            totalStudents: parseInt(totalStudents.rows[0].count),
            todayAttendance: parseInt(todayResult.rows[0].count),
            weekAttendance: parseInt(weekResult.rows[0].count),
            bySession: bySession.rows
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        if (isUndefinedTableError(error)) {
            const totalStudents = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`);
            return res.json({
                totalStudents: parseInt(totalStudents.rows[0].count),
                todayAttendance: 0,
                weekAttendance: 0,
                bySession: []
            });
        }
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

module.exports = router;
