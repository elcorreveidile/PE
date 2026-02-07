/**
 * Endpoint de migración automática
 * Ejecuta migraciones pendientes de la base de datos
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { query } = require('../database/db');

const router = express.Router();

/**
 * POST /api/migrate/attendance
 * Ejecuta la migración de la tabla attendance
 */
router.post('/attendance', async (req, res) => {
    try {
        console.log('[MIGRATION] Iniciando migración de tabla attendance...');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '../database/add-attendance-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el SQL
        await query(sql);
        // Asegurar compatibilidad: el código QR crea registro sin user_id y luego lo confirma.
        await query('ALTER TABLE attendance ALTER COLUMN user_id DROP NOT NULL');

        console.log('[MIGRATION] Migración completada exitosamente');

        res.json({
            success: true,
            message: 'Migración completada exitosamente',
            table: 'attendance'
        });

    } catch (error) {
        console.error('[MIGRATION] Error:', error);

        // Si es porque la tabla ya existe, no es un error real
        if (error.message.includes('already exists')) {
            return res.json({
                success: true,
                message: 'La tabla attendance ya existe',
                table: 'attendance'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/migrate/rubrics
 * Ejecuta la migración de la tabla rubrics
 */
router.post('/rubrics', async (req, res) => {
    try {
        console.log('[MIGRATION] Iniciando migración de tabla rubrics...');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '../database/add-rubrics-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar el SQL
        await query(sql);

        console.log('[MIGRATION] Migración de rubrics completada exitosamente');

        res.json({
            success: true,
            message: 'Migración de rubrics completada exitosamente',
            table: 'rubrics'
        });

    } catch (error) {
        console.error('[MIGRATION] Error en rubrics:', error);

        // Si es porque la tabla ya existe, no es un error real
        if (error.message.includes('already exists')) {
            return res.json({
                success: true,
                message: 'La tabla rubrics ya existe',
                table: 'rubrics'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/migrate/grades
 * Convierte calificaciones textuales a numéricas
 */
router.post('/grades', async (req, res) => {
    try {
        console.log('[MIGRATION] Iniciando conversión de calificaciones...');

        // Primero, verificar si la columna numeric_grade existe en feedback
        try {
            await query(`
                ALTER TABLE feedback 
                ADD COLUMN IF NOT EXISTS numeric_grade DECIMAL(3,2);
            `);
            console.log('[MIGRATION] Columna numeric_grade verificada/creada');
        } catch (error) {
            if (!error.message.includes('already exists')) {
                throw error;
            }
        }

        // Convertir calificaciones textuales a numéricas
        const updateResult = await query(`
            UPDATE feedback 
            SET numeric_grade = CASE grade
                WHEN 'Excelente' THEN 10
                WHEN 'Muy bien' THEN 8.5
                WHEN 'Bien' THEN 7
                WHEN 'Suficiente' THEN 5
                WHEN 'Necesita mejorar' THEN 3
                ELSE NULL
            END
            WHERE grade IS NOT NULL 
            AND numeric_grade IS NULL;
        `);

        console.log(`[MIGRATION] Calificaciones convertidas: ${updateResult.rowCount} registros`);

        // Verificar el estado actual
        const statsResult = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN numeric_grade IS NOT NULL THEN 1 END) as with_numeric_grade,
                COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as with_textual_grade,
                AVG(numeric_grade) as avg_grade
            FROM feedback
        `);

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            message: 'Calificaciones convertidas exitosamente',
            converted: updateResult.rowCount,
            stats: {
                total: parseInt(stats.total),
                withNumericGrade: parseInt(stats.with_numeric_grade),
                withTextualGrade: parseInt(stats.with_textual_grade),
                averageGrade: stats.avg_grade ? parseFloat(stats.avg_grade).toFixed(2) : null
            }
        });

    } catch (error) {
        console.error('[MIGRATION] Error en conversión de grades:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/migrate/status
 * Verificar el estado de las migraciones
 */
router.get('/status', async (req, res) => {
    try {
        // Verificar si la tabla attendance existe
        const attendanceResult = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'attendance'
            );
        `);

        // Verificar si la tabla rubrics existe
        const rubricsResult = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'rubrics'
            );
        `);

        const attendanceExists = attendanceResult.rows[0].exists;
        const rubricsExists = rubricsResult.rows[0].exists;

        res.json({
            attendance: attendanceExists,
            rubrics: rubricsExists,
            message: `${attendanceExists ? 'Attendance' : 'Falta Attendance'}, ${rubricsExists ? 'Rubrics' : 'Falta Rubrics'}`
        });

    } catch (error) {
        console.error('Error verificando estado:', error);
        res.status(500).json({ error: 'Error al verificar estado' });
    }
});

module.exports = router;
