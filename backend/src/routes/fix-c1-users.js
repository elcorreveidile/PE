/**
 * Endpoint temporal para arreglar usuarios de C1 sin course_code correcto
 * Este archivo debe importarse en app.js y luego eliminarse
 */

const express = require('express');
const { query } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/fix-c1-user
 * Actualiza el course_code de un usuario C1 existente
 */
router.post('/fix-c1-user', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Verificar si el usuario ya tiene course_code correcto
        const userCheck = await query('SELECT course_code, course_id FROM users WHERE id = $1', [userId]);
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const user = userCheck.rows[0];
        
        // Si ya tiene course_code de C1, no hacer nada
        if (user.course_code === 'C1-ARTE-SOCIEDAD') {
            return res.json({ 
                message: 'Usuario ya tiene course_code correcto',
                course_code: user.course_code
            });
        }
        
        // Actualizar al usuario con course_code de C1
        await query(`
            UPDATE users 
            SET course_code = 'C1-ARTE-SOCIEDAD', 
                course_id = 2
            WHERE id = $1
        `, [userId]);
        
        res.json({ 
            message: 'Usuario actualizado correctamente',
            course_code: 'C1-ARTE-SOCIEDAD',
            course_id: 2
        });
        
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

module.exports = router;
