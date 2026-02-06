/**
 * Rutas de exportación de datos
 */

const express = require('express');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/export/students
 * Exportar estudiantes a CSV o Excel
 */
router.get('/students', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'csv';

        const result = await query(`
            SELECT
                u.id,
                u.email,
                u.name,
                u.level,
                u.role,
                u.active,
                u.created_at as "registro",
                u.last_login as "ultimo_acceso",
                COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = u.id), 0) as "total_entregas",
                COALESCE((SELECT COUNT(*) FROM submissions WHERE user_id = u.id AND status = 'reviewed'), 0) as "entregas_corregidas",
                COALESCE((SELECT SUM(word_count) FROM submissions WHERE user_id = u.id), 0) as "total_palabras"
            FROM users u
            WHERE u.role = 'student'
            ORDER BY u.name
        `);

        if (format === 'csv') {
            // Convertir a CSV
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
                { label: 'Total Palabras', value: 'total_palabras' }
            ];

            const parser = new Parser({ fields });
            const csv = parser.parse(result.rows);

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=estudiantes_${new Date().toISOString().split('T')[0]}.csv`);
            res.send('\uFEFF' + csv); // BOM para UTF-8 en Excel

        } else if (format === 'xlsx') {
            // Crear Excel
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
                { header: 'Total Palabras', key: 'total_palabras', width: 15 }
            ];

            worksheet.addRow({ id: '', email: 'Producción Escrita C2', name: 'CLM - UGR', level: '', active: '', registro: '', ultimo_acceso: '', total_entregas: '', entregas_corregidas: '', total_palabras: '' });
            worksheet.addRow({ id: '', email: `Exportado: ${new Date().toLocaleString('es-ES')}`, name: '', level: '', active: '', registro: '', ultimo_acceso: '', total_entregas: '', entregas_corregidas: '', total_palabras: '' });
            worksheet.addRow({});

            result.rows.forEach(row => {
                worksheet.addRow(row);
            });

            // Dar estilo a la cabecera
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
 * GET /api/admin/export/submissions
 * Exportar entregas a CSV o Excel
 */
router.get('/submissions', authenticateToken, requireAdmin, async (req, res) => {
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
 * GET /api/admin/export/stats
 * Exportar estadísticas a CSV o Excel
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
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

        const bySession = await query(`
            SELECT
                s.session_id as "sesion",
                cs.title as "titulo",
                COUNT(s.id) as "total_entregas",
                SUM(s.word_count) as "total_palabras",
                AVG(s.word_count) as "media_palabras"
            FROM submissions s
            LEFT JOIN course_sessions cs ON s.session_id = cs.id
            WHERE s.session_id IS NOT NULL
            GROUP BY s.session_id, cs.title
            ORDER BY s.session_id
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

            // Hoja de estudiantes
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

            // Hoja de sesiones
            const sessionSheet = workbook.addWorksheet('Por Sesión');
            sessionSheet.columns = [
                { header: 'Sesión', key: 'sesion', width: 10 },
                { header: 'Título', key: 'titulo', width: 40 },
                { header: 'Total Entregas', key: 'total_entregas', width: 15 },
                { header: 'Total Palabras', key: 'total_palabras', width: 15 },
                { header: 'Media Palabras', key: 'media_palabras', width: 15 }
            ];

            sessionSheet.addRow({ sesion: 'Producción Escrita C2', titulo: 'CLM - UGR', total_entregas: '', total_palabras: '', media_palabras: '' });
            sessionSheet.addRow({});
            bySession.rows.forEach(row => sessionSheet.addRow(row));

            sessionSheet.getRow(3).eachCell((cell) => {
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
