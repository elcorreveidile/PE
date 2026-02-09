/**
 * Rutas para recursos protegidos con enlaces temporales
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

// Mapeo de archivos a URLs del frontend
const RESOURCE_FILES = {
    'analisis-sesion-03-perfil-personal.pdf': 'analisis-s3-85f50154cfaf495cc9a4593f.pdf'
};

/**
 * Generar un enlace temporal para descargar un recurso
 * POST /api/recursos/temporal-link
 * Requiere: rol admin
 */
router.post('/temporal-link', authenticateToken, requireAdmin, [
    express.json()
], async (req, res) => {
    try {
        const { filename } = req.body;

        if (!filename) {
            return res.status(400).json({ error: 'Nombre de archivo requerido' });
        }

        // Validar que el archivo no contenga rutas de directorio (security)
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Nombre de archivo inválido' });
        }

        // Verificar que el archivo existe
        const filePath = path.join(DOWNLOADS_DIR, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Generar token JWT con expiración (por defecto 2 horas)
        const expiresIn = req.body.expiry || '2h';
        const token = jwt.sign(
            {
                filename,
                purpose: 'resource-download',
                adminId: req.user.id
            },
            JWT_SECRET,
            { expiresIn }
        );

        // Generar enlace temporal
        const baseUrl = process.env.FRONTEND_URL || 'https://www.cognoscencia.com';
        const downloadLink = `${baseUrl}/api/recursos/download/${filename}?token=${token}`;

        res.json({
            success: true,
            downloadLink,
            expiresIn,
            message: `Enlace temporal generado. Expira en ${expiresIn}`
        });

    } catch (error) {
        console.error('Error generando enlace temporal:', error);
        res.status(500).json({ error: 'Error al generar enlace temporal' });
    }
});

/**
 * Descargar un recurso protegido con token temporal
 * GET /api/recursos/download/:filename?token=xyz
 */
router.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const { token } = req.query;

        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        // Validar que el filename no tenga rutas
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Nombre de archivo inválido' });
        }

        // Verificar token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'El enlace ha expirado' });
            }
            return res.status(403).json({ error: 'Token inválido' });
        }

        // Verificar que el token sea para el propósito correcto
        if (decoded.purpose !== 'resource-download') {
            return res.status(403).json({ error: 'Token inválido' });
        }

        // Verificar que el filename coincida
        if (decoded.filename !== filename) {
            return res.status(403).json({ error: 'El token no corresponde a este archivo' });
        }

        // Obtener el nombre real del archivo en el frontend
        const realFilename = RESOURCE_FILES[filename];
        if (!realFilename) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Redirigir al archivo en el frontend
        const frontendUrl = process.env.FRONTEND_URL || 'https://www.cognoscencia.com';
        const fileUrl = `${frontendUrl}/recursos/profesor/${realFilename}`;

        console.log(`[Recursos] Redirigiendo descarga: ${filename} -> ${fileUrl}`);
        res.redirect(302, fileUrl);

    } catch (error) {
        console.error('Error descargando recurso:', error);
        res.status(500).json({ error: 'Error al descargar archivo' });
    }
});

/**
 * Listar archivos disponibles (solo admin)
 * GET /api/recursos/list
 */
router.get('/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Listar archivos disponibles en el mapeo
        const fileList = Object.keys(RESOURCE_FILES).map(filename => ({
            filename,
            realFilename: RESOURCE_FILES[filename],
            size: 'N/A (almacenado en frontend)'
        }));

        res.json({ files: fileList });

    } catch (error) {
        console.error('Error listando recursos:', error);
        res.status(500).json({ error: 'Error al listar archivos' });
    }
});

module.exports = router;
