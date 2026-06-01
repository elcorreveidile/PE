/**
 * Endpoint temporal para arreglar usuarios de C1 sin course_code correcto
 * DELETE THIS FILE AFTER ALL C1 USERS ARE FIXED
 */

const express = require('express');
const { query } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/fix-c1-profile
 * Actualiza el course_code de un usuario C1 existente si no lo tiene correcto
 */
router.post('/fix-c1-profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Verificar estado actual del usuario (con fallback si course_code no existe)
        let userCheck;
        try {
            userCheck = await query('SELECT id, email, name, course_code, course_id FROM users WHERE id = $1', [userId]);
        } catch (selectError) {
            // Si falla por course_code, intentar sin esa columna
            if (selectError.message && selectError.message.includes('course_code')) {
                console.warn('Columna course_code no existe, usando fallback');
                userCheck = await query('SELECT id, email, name, course_id FROM users WHERE id = $1', [userId]);
                // Añadir course_code como null al resultado
                if (userCheck.rows.length > 0) {
                    userCheck.rows[0].course_code = null;
                }
            } else {
                throw selectError;
            }
        }

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userCheck.rows[0];

        // Si ya tiene course_code de C1, no hacer nada
        if (user.course_code === 'C1-ARTE-SOCIEDAD') {
            return res.json({
                success: true,
                message: 'Usuario ya tiene course_code correcto',
                course_code: user.course_code,
                updated: false
            });
        }

        // Intentar actualizar al usuario con course_code de C1
        try {
            await query(`
                UPDATE users
                SET course_code = 'C1-ARTE-SOCIEDAD',
                    course_id = 2
                WHERE id = $1
            `, [userId]);
        } catch (updateError) {
            // Si falla por course_code, intentar solo course_id
            if (updateError.message && updateError.message.includes('course_code')) {
                console.warn('Columna course_code no existe, actualizando solo course_id');
                await query(`
                    UPDATE users
                    SET course_id = 2
                    WHERE id = $1
                `, [userId]);
                // Guardar course_code en localStorage para el frontend
                return res.json({
                    success: true,
                    message: 'Perfil actualizado (course_id). Guardando course_code en localStorage...',
                    user: {
                        ...user,
                        course_id: 2,
                        course_code: 'C1-ARTE-SOCIEDAD' // Para guardar en localStorage
                    },
                    updated: true,
                    localOnly: true // Indica que course_code solo está en localStorage
                });
            } else {
                throw updateError;
            }
        }

        // Devolver usuario actualizado
        let updatedUser;
        try {
            updatedUser = await query('SELECT id, email, name, course_code, course_id, role, level FROM users WHERE id = $1', [userId]);
        } catch (selectError) {
            if (selectError.message && selectError.message.includes('course_code')) {
                updatedUser = await query('SELECT id, email, name, course_id, role, level FROM users WHERE id = $1', [userId]);
                if (updatedUser.rows.length > 0) {
                    updatedUser.rows[0].course_code = 'C1-ARTE-SOCIEDAD'; // Añadir manualmente
                }
            } else {
                throw selectError;
            }
        }

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente para curso C1',
            user: updatedUser.rows[0],
            updated: true
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario: ' + error.message });
    }
});

module.exports = router;
