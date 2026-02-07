/**
 * Rutas de usuarios - admin (PostgreSQL)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
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

// ============================================================
// RUTAS DE EXPORTACIÓN (movidas aquí para asegurar despliegue)
// ============================================================

/**
 * GET /api/users/export/students
 * Exportar estudiantes a CSV o Excel (solo admin)
 */
router.get('/export/students', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'csv';

        // Primero obtener el total de sesiones para calcular el porcentaje
        const totalSessionsResult = await query(`
            SELECT COUNT(*) as total
            FROM course_sessions
            WHERE date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                AND (date::text)::date <= CURRENT_DATE
        `);
        const totalSessions = parseInt(totalSessionsResult.rows[0].total) || 1;

        const result = await query(`
            SELECT
                u.id,
                u.email,
                u.name,
                u.level,
                u.active,
                u.created_at as "registro",
                u.last_login as "ultimo_acceso",
                COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = u.id), 0) as "total_entregas",
                COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = u.id AND status = 'reviewed'), 0) as "entregas_corregidas",
                COALESCE((SELECT SUM(word_count) FROM submissions WHERE user_id = u.id), 0) as "total_palabras",
                COALESCE((SELECT COUNT(*) FROM attendance WHERE user_id = u.id), 0) as "asistencias",
                ROUND((COALESCE((SELECT COUNT(*) FROM attendance WHERE user_id = u.id), 0)::numeric / $1 * 100), 2) as "porcentaje_asistencia"
            FROM users u
            WHERE u.role = 'student'
            ORDER BY u.name
        `, [totalSessions]);

        if (format === 'csv') {
            const fields = [
                { label: 'ID', value: 'id' },
                { label: 'Email', value: 'email' },
                { label: 'Nombre', value: 'name' },
                { label: 'Nivel', value: 'level' },
                { label: 'Activo', value: 'active' },
                { label: 'Fecha Registro', value: 'registro' },
                { label: 'Último Acceso', value: 'ultimo_acceso' },
                { label: 'Total Entregas', value: 'total_entregas' },
                { label: 'Entregas Corregidas', value: 'entregas_corregidas' },
                { label: 'Total Palabras', value: 'total_palabras' },
                { label: 'Asistencias', value: 'asistencias' },
                { label: 'Porcentaje Asistencia', value: 'porcentaje_asistencia' }
            ];

            const parser = new Parser({ fields });
            const csv = parser.parse(result.rows);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=estudiantes_${new Date().toISOString().split('T')[0]}.csv`);
            res.send('\uFEFF' + csv);

        } else if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Estudiantes');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Nombre', key: 'name', width: 25 },
                { header: 'Nivel', key: 'level', width: 10 },
                { header: 'Activo', key: 'active', width: 10 },
                { header: 'Fecha Registro', key: 'registro', width: 20 },
                { header: 'Último Acceso', key: 'ultimo_acceso', width: 20 },
                { header: 'Total Entregas', key: 'total_entregas', width: 15 },
                { header: 'Entregas Corregidas', key: 'entregas_corregidas', width: 18 },
                { header: 'Total Palabras', key: 'total_palabras', width: 15 },
                { header: 'Asistencias', key: 'asistencias', width: 12 },
                { header: '% Asistencia', key: 'porcentaje_asistencia', width: 15 }
            ];

            worksheet.addRow({ id: '', email: 'Producción Escrita C2', name: 'CLM - UGR', level: '', active: '', registro: '', ultimo_acceso: '', total_entregas: '', entregas_corregidas: '', total_palabras: '', asistencias: '', porcentaje_asistencia: '' });
            worksheet.addRow({ id: '', email: `Exportado: ${new Date().toLocaleString('es-ES')}`, name: '', level: '', active: '', registro: '', ultimo_acceso: '', total_entregas: '', entregas_corregidas: '', total_palabras: '', asistencias: '', porcentaje_asistencia: '' });
            worksheet.addRow({});

            result.rows.forEach(row => {
                worksheet.addRow(row);
            });

            worksheet.getRow(5).eachCell((cell) => {
                cell.font = { bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6E6FA' }
                };
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=estudiantes_${new Date().toISOString().split('T')[0]}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } else {
            res.status(400).json({ error: 'Formato no soportado. Usa csv o xlsx' });
        }

    } catch (error) {
        console.error('Error exportando estudiantes:', error);
        res.status(500).json({ error: 'Error al exportar estudiantes' });
    }
});

/**
 * GET /api/users/export/submissions
 * Exportar entregas a CSV o Excel (solo admin)
 */
router.get('/export/submissions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'csv';

        const result = await query(`
            SELECT
                s.id,
                u.name as "estudiante",
                u.email,
                s.activity_title as "actividad",
                s.session_id as "sesion",
                s.status,
                s.word_count as "palabras",
                s.created_at as "fecha_entrega",
                f.feedback_text as "feedback",
                f.grade as "calificacion",
                f.created_at as "fecha_correccion"
            FROM submissions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN feedback f ON s.id = f.submission_id
            WHERE u.role = 'student'
            ORDER BY s.created_at DESC
        `);

        if (format === 'csv') {
            const fields = [
                { label: 'ID', value: 'id' },
                { label: 'Estudiante', value: 'estudiante' },
                { label: 'Email', value: 'email' },
                { label: 'Actividad', value: 'actividad' },
                { label: 'Sesión', value: 'sesion' },
                { label: 'Estado', value: 'status' },
                { label: 'Palabras', value: 'palabras' },
                { label: 'Fecha Entrega', value: 'fecha_entrega' },
                { label: 'Feedback', value: 'feedback' },
                { label: 'Calificación', value: 'calificacion' },
                { label: 'Fecha Corrección', value: 'fecha_correccion' }
            ];

            const parser = new Parser({ fields });
            const csv = parser.parse(result.rows);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=entregas_${new Date().toISOString().split('T')[0]}.csv`);
            res.send('\uFEFF' + csv);

        } else if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Entregas');

            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Estudiante', key: 'estudiante', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Actividad', key: 'actividad', width: 30 },
                { header: 'Sesión', key: 'sesion', width: 10 },
                { header: 'Estado', key: 'status', width: 12 },
                { header: 'Palabras', key: 'palabras', width: 12 },
                { header: 'Fecha Entrega', key: 'fecha_entrega', width: 20 },
                { header: 'Feedback', key: 'feedback', width: 40 },
                { header: 'Calificación', key: 'calificacion', width: 15 },
                { header: 'Fecha Corrección', key: 'fecha_correccion', width: 20 }
            ];

            worksheet.addRow({ id: '', estudiante: 'Producción Escrita C2', email: 'CLM - UGR', actividad: '', sesion: '', status: '', palabras: '', fecha_entrega: '', feedback: '', calificacion: '', fecha_correccion: '' });
            worksheet.addRow({ id: '', estudiante: `Exportado: ${new Date().toLocaleString('es-ES')}`, email: '', actividad: '', sesion: '', status: '', palabras: '', fecha_entrega: '', feedback: '', calificacion: '', fecha_correccion: '' });
            worksheet.addRow({});

            result.rows.forEach(row => {
                worksheet.addRow(row);
            });

            worksheet.getRow(5).eachCell((cell) => {
                cell.font = { bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6E6FA' }
                };
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=entregas_${new Date().toISOString().split('T')[0]}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } else {
            res.status(400).json({ error: 'Formato no soportado. Usa csv o xlsx' });
        }

    } catch (error) {
        console.error('Error exportando entregas:', error);
        res.status(500).json({ error: 'Error al exportar entregas' });
    }
});

/**
 * GET /api/users/export/stats
 * Exportar estadísticas a CSV o Excel (solo admin)
 */
router.get('/export/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'csv';

        // Obtener datos agrupados
        const byStudent = await query(`
            SELECT
                u.name as "estudiante",
                u.email,
                u.level,
                COUNT(s.id) as "total_entregas",
                SUM(s.word_count) as "total_palabras",
                AVG(s.word_count) as "media_palabras",
                COUNT(CASE WHEN s.status = 'reviewed' THEN 1 END) as "corregidas",
                COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as "pendientes"
            FROM users u
            LEFT JOIN submissions s ON u.id = s.user_id
            WHERE u.role = 'student'
            GROUP BY u.id, u.name, u.email, u.level
            ORDER BY "total_entregas" DESC
        `);

        if (format === 'csv') {
            const fields = [
                { label: 'Estudiante', value: 'estudiante' },
                { label: 'Email', value: 'email' },
                { label: 'Nivel', value: 'level' },
                { label: 'Total Entregas', value: 'total_entregas' },
                { label: 'Total Palabras', value: 'total_palabras' },
                { label: 'Media Palabras', value: 'media_palabras' },
                { label: 'Corregidas', value: 'corregidas' },
                { label: 'Pendientes', value: 'pendientes' }
            ];

            const parser = new Parser({ fields });
            const csv = parser.parse(byStudent.rows);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=estadisticas_${new Date().toISOString().split('T')[0]}.csv`);
            res.send('\uFEFF' + csv);

        } else if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const studentSheet = workbook.addWorksheet('Por Estudiante');

            studentSheet.columns = [
                { header: 'Estudiante', key: 'estudiante', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Nivel', key: 'level', width: 10 },
                { header: 'Total Entregas', key: 'total_entregas', width: 15 },
                { header: 'Total Palabras', key: 'total_palabras', width: 15 },
                { header: 'Media Palabras', key: 'media_palabras', width: 15 },
                { header: 'Corregidas', key: 'corregidas', width: 12 },
                { header: 'Pendientes', key: 'pendientes', width: 12 }
            ];

            studentSheet.addRow({ estudiante: 'Producción Escrita C2', email: 'CLM - UGR', level: '', total_entregas: '', total_palabras: '', media_palabras: '', corregidas: '', pendientes: '' });
            studentSheet.addRow({});
            byStudent.rows.forEach(row => studentSheet.addRow(row));

            studentSheet.getRow(3).eachCell((cell) => {
                cell.font = { bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6E6FA' }
                };
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=estadisticas_${new Date().toISOString().split('T')[0]}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } else {
            res.status(400).json({ error: 'Formato no soportado. Usa csv o xlsx' });
        }

    } catch (error) {
        console.error('Error exportando estadísticas:', error);
        res.status(500).json({ error: 'Error al exportar estadísticas' });
    }
});

module.exports = router;
