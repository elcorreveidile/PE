/**
 * Rutas de tareas para estudiantes - studentTasks (PostgreSQL)
 * Profesores crean tareas que estudiantes deben completar
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Resend } = require('resend');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.cognoscencia.com').replace(/\/$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@cognoscencia.com';

// Inicializar Resend si hay API key
let resend;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
}

/**
 * Enviar email de notificación de nueva tarea asignada
 */
async function sendTaskAssignmentEmail({ studentEmail, studentName, taskTitle, taskDescription, dueDate, teacherName, taskId }) {
    if (!resend) {
        console.warn('Resend no configurado (RESEND_API_KEY no definida)');
        return false;
    }

    try {
        const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Sin fecha límite';

        const taskUrl = `${FRONTEND_URL}/usuario/mis-entregas.html`;

        await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: studentEmail,
            subject: `📝 Nueva tarea asignada: ${taskTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #c53030;">Nueva tarea asignada</h2>
                    <p>Hola ${studentName || 'estudiante'},</p>
                    <p>${teacherName || 'Tu profesor'} te ha asignado una nueva tarea:</p>

                    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2d3748;">${taskTitle}</h3>
                        <p style="color: #4a5568; line-height: 1.6;">${taskDescription}</p>
                        ${dueDate ? `<p><strong>📅 Fecha límite:</strong> ${formattedDueDate}</p>` : ''}
                    </div>

                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${taskUrl}" style="background: #c53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Ver y entregar tarea
                        </a>
                    </p>

                    <p style="color: #718096; font-size: 14px;">Si tienes preguntas, contacta a tu profesor.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                        Producción Escrita C2 - CLM Universidad de Granada<br>
                        ${FRONTEND_URL}
                    </p>
                </div>
            `
        });
        console.log(`✅ Email enviado a ${studentEmail} para tarea "${taskTitle}"`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando email de tarea con Resend:', error);
        return false;
    }
}

/**
 * GET /api/student-tasks
 * Obtener todas las tareas (solo admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT
                st.id,
                st.title,
                st.description,
                st.due_date as dueDate,
                st.assignment_type as assignmentType,
                st.assigned_students as assignedStudents,
                st.session_id as sessionId,
                st.rubric_id as rubricId,
                st.status,
                st.created_by as createdBy,
                st.created_at as createdAt,
                st.updated_at as updatedAt,
                COALESCE(u.name, u.email) as authorName
            FROM student_tasks st
            LEFT JOIN users u ON st.created_by = u.id
            ORDER BY st.due_date ASC
        `);

        // Convertir assignedStudents de JSON a array si está almacenado como JSONB
        const tasks = result.rows.map(t => ({
            ...t,
            assignedStudents: typeof t.assignedStudents === 'string'
                ? JSON.parse(t.assignedStudents || '[]')
                : (t.assignedStudents || [])
        }));

        // Obtener conteo de submissions para cada tarea
        for (const task of tasks) {
            const submissionsResult = await query(
                'SELECT COUNT(*) as count FROM submissions WHERE task_id = $1',
                [task.id]
            );
            task.submissions = Array(submissionsResult.rows[0].count).fill(null);
        }

        res.json(tasks);

    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ error: 'Error al obtener tareas' });
    }
});

/**
 * GET /api/student-tasks/me
 * Obtener tareas asignadas al estudiante actual
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(`
            SELECT
                st.id,
                st.title,
                st.description,
                st.due_date as dueDate,
                st.assignment_type as assignmentType,
                st.assigned_students as assignedStudents,
                st.session_id as sessionId,
                st.rubric_id as rubricId,
                st.status,
                st.created_at as createdAt
            FROM student_tasks st
            WHERE st.status = 'active'
                AND st.due_date >= CURRENT_TIMESTAMP
                AND (st.assignment_type = 'all' OR st.assigned_students @> $1)
            ORDER BY st.due_date ASC
        `, [JSON.stringify([userId])]);

        const tasks = result.rows.map(t => ({
            ...t,
            assignedStudents: typeof t.assignedStudents === 'string'
                ? JSON.parse(t.assignedStudents || '[]')
                : (t.assignedStudents || [])
        }));

        res.json(tasks);

    } catch (error) {
        console.error('Error al obtener tareas del estudiante:', error);
        res.status(500).json({ error: 'Error al obtener tareas del estudiante' });
    }
});

/**
 * GET /api/student-tasks/:id
 * Obtener una tarea específica
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        const result = await query(`
            SELECT
                st.id,
                st.title,
                st.description,
                st.due_date as dueDate,
                st.assignment_type as assignmentType,
                st.assigned_students as assignedStudents,
                st.session_id as sessionId,
                st.rubric_id as rubricId,
                st.status,
                st.created_by as createdBy,
                st.created_at as createdAt,
                st.updated_at as updatedAt,
                COALESCE(u.name, u.email) as authorName
            FROM student_tasks st
            LEFT JOIN users u ON st.created_by = u.id
            WHERE st.id = $1
        `, [taskId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        const task = result.rows[0];

        // Manejar assignedStudents de forma segura
        try {
            if (typeof task.assignedStudents === 'string') {
                task.assignedStudents = JSON.parse(task.assignedStudents || '[]');
            } else if (Array.isArray(task.assignedStudents)) {
                task.assignedStudents = task.assignedStudents;
            } else {
                task.assignedStudents = [];
            }
        } catch (parseError) {
            console.error('Error parsing assignedStudents:', parseError);
            task.assignedStudents = [];
        }

        // Obtener submissions de esta tarea
        const submissionsResult = await query(`
            SELECT
                s.id,
                s.user_id as userId,
                s.user_name as userName,
                s.content,
                s.word_count as wordCount,
                s.status,
                s.created_at as createdAt
            FROM submissions s
            WHERE s.task_id = $1
            ORDER BY s.created_at DESC
        `, [taskId]);

        task.submissions = submissionsResult.rows;

        res.json(task);

    } catch (error) {
        console.error('Error al obtener tarea:', error);
        res.status(500).json({ error: 'Error al obtener tarea' });
    }
});

/**
 * POST /api/student-tasks
 * Crear nueva tarea (solo admin)
 */
router.post('/', authenticateToken, requireAdmin, [
    body('title').notEmpty().withMessage('El título es requerido'),
    body('description').notEmpty().withMessage('La descripción es requerida'),
    body('dueDate').isISO8601().withMessage('Fecha límite inválida'),
    body('assignmentType').isIn(['all', 'specific']).withMessage('Tipo de asignación inválido'),
    body('assignedStudents').optional().isArray(),
    body('sessionId').optional({ nullable: true }).isInt().withMessage('Sesión inválida'),
    body('rubricId').optional({ nullable: true }).isString().withMessage('Rúbrica inválida'),
    body('status').optional().isIn(['active', 'inactive', 'draft'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, dueDate, assignmentType, assignedStudents = [], sessionId, rubricId, status = 'active' } = req.body;

        // Validar assignedStudents cuando assignmentType es 'specific'
        if (assignmentType === 'specific' && assignedStudents.length === 0) {
            return res.status(400).json({ error: 'Debe seleccionar al menos un estudiante para asignación específica' });
        }

        const assignedStudentsJson = JSON.stringify(assignedStudents);

        const result = await query(`
            INSERT INTO student_tasks (id, title, description, due_date, assignment_type, assigned_students, session_id, rubric_id, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `, [req.body.id || `task_${Date.now()}`, title, description, dueDate, assignmentType, assignedStudentsJson, sessionId, rubricId, status, req.user.id]);

        const taskId = result.rows[0].id;

        // Enviar emails a los estudiantes asignados (en background, no bloquear la respuesta)
        sendTaskEmailsInBackground({ taskId, title, description, dueDate, assignmentType, assignedStudents, teacherId: req.user.id })
            .catch(emailError => {
                console.error('[StudentTasks] Error enviando emails en background:', emailError);
            });

        res.status(201).json({
            message: 'Tarea creada correctamente',
            task: {
                id: taskId,
                title,
                description,
                dueDate,
                assignmentType,
                assignedStudents,
                sessionId,
                rubricId,
                status,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ error: 'Error al crear tarea' });
    }
});

/**
 * Función auxiliar para enviar emails en background
 * No bloquea la respuesta HTTP
 */
async function sendTaskEmailsInBackground({ taskId, title, description, dueDate, assignmentType, assignedStudents, teacherId }) {
    try {
        // Si es asignación a todos, obtener todos los estudiantes
        let studentsToSend = [];

        if (assignmentType === 'all') {
            const allStudentsResult = await query(`
                SELECT id, email, name
                FROM users
                WHERE role = 'student'
                AND email IS NOT NULL
                AND email != ''
                ORDER BY name
            `);
            studentsToSend = allStudentsResult.rows;
        } else {
            // Asignación específica
            if (assignedStudents.length === 0) {
                console.log('[StudentTasks] No hay estudiantes asignados, omitiendo emails');
                return;
            }

            // Obtener información de los estudiantes específicos
            const placeholders = assignedStudents.map((_, i) => `$${i + 1}`).join(',');
            const studentsResult = await query(`
                SELECT id, email, name
                FROM users
                WHERE id IN (${placeholders})
                AND email IS NOT NULL
                AND email != ''
            `, assignedStudents);
            studentsToSend = studentsResult.rows;
        }

        if (studentsToSend.length === 0) {
            console.log('[StudentTasks] No se encontraron estudiantes con email válido');
            return;
        }

        // Obtener nombre del profesor
        const teacherResult = await query('SELECT name, email FROM users WHERE id = $1', [teacherId]);
        const teacherName = teacherResult.rows[0]?.name || 'Tu profesor';

        // Enviar emails en paralelo
        const emailPromises = studentsToSend.map(student =>
            sendTaskAssignmentEmail({
                studentEmail: student.email,
                studentName: student.name,
                taskTitle: title,
                taskDescription: description,
                dueDate: dueDate,
                teacherName: teacherName,
                taskId: taskId
            })
        );

        const results = await Promise.allSettled(emailPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = results.length - successful;

        console.log(`[StudentTasks] Emails enviados: ${successful} exitosos, ${failed} fallidos de un total de ${results.length}`);
    } catch (error) {
        console.error('[StudentTasks] Error en sendTaskEmailsInBackground:', error);
        throw error;
    }
}

/**
 * PUT /api/student-tasks/:id
 * Actualizar tarea completa (solo admin)
 */
router.put('/:id', authenticateToken, requireAdmin, [
    body('title').notEmpty().withMessage('El título es requerido'),
    body('description').notEmpty().withMessage('La descripción es requerida'),
    body('dueDate').isISO8601().withMessage('Fecha límite inválida'),
    body('assignmentType').isIn(['all', 'specific']).withMessage('Tipo de asignación inválido'),
    body('assignedStudents').optional().isArray(),
    body('sessionId').optional({ nullable: true }).isInt().withMessage('Sesión inválida'),
    body('rubricId').optional({ nullable: true }).isString().withMessage('Rúbrica inválida'),
    body('status').optional().isIn(['active', 'inactive', 'draft'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const taskId = req.params.id;
        const { title, description, dueDate, assignmentType, assignedStudents, sessionId, rubricId, status } = req.body;

        // Verificar que la tarea existe
        const existingTask = await query('SELECT id FROM student_tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // Validar assignedStudents cuando assignmentType es 'specific'
        if (assignmentType === 'specific' && (!assignedStudents || assignedStudents.length === 0)) {
            return res.status(400).json({ error: 'Debe seleccionar al menos un estudiante para asignación específica' });
        }

        const assignedStudentsJson = assignedStudents ? JSON.stringify(assignedStudents) : '[]';

        await query(`
            UPDATE student_tasks
            SET title = $1, description = $2, due_date = $3, assignment_type = $4,
                assigned_students = $5, session_id = $6, rubric_id = $7, status = $8, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
        `, [title, description, dueDate, assignmentType, assignedStudentsJson, sessionId, rubricId, status, taskId]);

        res.json({
            message: 'Tarea actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ error: 'Error al actualizar tarea' });
    }
});

/**
 * PATCH /api/student-tasks/:id
 * Actualizar parcialmente una tarea (solo admin)
 * Útil para activar/desactivar sin modificar toda la tarea
 */
router.patch('/:id', authenticateToken, requireAdmin, [
    body('status').optional().isIn(['active', 'inactive', 'draft'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const taskId = req.params.id;
        const { status } = req.body;

        // Verificar que la tarea existe
        const existingTask = await query('SELECT id FROM student_tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // Construir query dinámica basada en los campos proporcionados
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(taskId);

        const queryText = `
            UPDATE student_tasks
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `;

        await query(queryText, values);

        res.json({
            message: 'Tarea actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ error: 'Error al actualizar tarea' });
    }
});

/**
 * DELETE /api/student-tasks/:id
 * Eliminar tarea (solo admin)
 * También eliminará las submissions asociadas (CASCADE)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;

        // Verificar que la tarea existe
        const existingTask = await query('SELECT id FROM student_tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        await query('DELETE FROM student_tasks WHERE id = $1', [taskId]);

        res.json({ message: 'Tarea eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({ error: 'Error al eliminar tarea' });
    }
});

module.exports = router;
