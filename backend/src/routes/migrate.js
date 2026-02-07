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
 * GET /api/migrate/status
 * Verificar el estado de las migraciones
 */
router.get('/status', async (req, res) => {
    try {
        // Verificar si la tabla attendance existe
        const result = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'attendance'
            );
        `);

        const exists = result.rows[0].exists;

        res.json({
            attendance: exists,
            message: exists ? 'Tabla attendance creada' : 'Tabla attendance no encontrada'
        });

    } catch (error) {
        console.error('Error verificando estado:', error);
        res.status(500).json({ error: 'Error al verificar estado' });
    }
});

module.exports = router;
