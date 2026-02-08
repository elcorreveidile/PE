/**
 * Rutas de contacto
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Resend } = require('resend');

const router = express.Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@cognoscencia.com';
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'benitezl@go.ugr.es';

// Inicializar Resend si hay API key
let resend;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
}

/**
 * POST /api/contact
 * Envía un mensaje de contacto
 */
router.post('/', [
    body('name').trim().notEmpty().withMessage('El nombre es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('subject').trim().notEmpty().withMessage('El asunto es requerido'),
    body('message').trim().notEmpty().withMessage('El mensaje es requerido'),
    body('message').isLength({ min: 10 }).withMessage('El mensaje debe tener al menos 10 caracteres')
], async (req, res) => {
    // Validar
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { name, email, subject, message } = req.body;

    if (!resend) {
        console.error('Resend no configurado (RESEND_API_KEY no definida)');
        return res.status(500).json({
            success: false,
            error: 'Servicio de correo no disponible. Por favor contacta directamente.'
        });
    }

    try {
        // Enviar email usando Resend
        await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: CONTACT_TO_EMAIL,
            replyTo: email,
            subject: `Contacto Web: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Nuevo mensaje de contacto</h2>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>De:</strong> ${name} &lt;${email}&gt;</p>
                        <p><strong>Asunto:</strong> ${subject}</p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                    </div>
                    <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h3 style="margin-top: 0;">Mensaje:</h3>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                    </div>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 0.9em;">
                        Este mensaje se envió desde el formulario de contacto de Producción Escrita C2
                    </p>
                </div>
            `
        });

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente. Te contactaré pronto.'
        });

    } catch (error) {
        console.error('Error al enviar email de contacto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar el mensaje. Por favor intenta más tarde.'
        });
    }
});

module.exports = router;
