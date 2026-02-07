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
