/**
 * Rutas para recursos protegidos con enlaces temporales
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query } = require('../database/db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';
const DOWNLOADS_DIR = path.join(__dirname, '../../uploads/profesor');

// Asegurar que el directorio existe
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

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

        // Servir el archivo
        const filePath = path.join(DOWNLOADS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        res.download(filePath, filename);

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
        const files = fs.readdirSync(DOWNLOADS_DIR);
        const fileList = files
            .filter(f => f.endsWith('.pdf'))
            .map(f => ({
                filename: f,
                size: fs.statSync(path.join(DOWNLOADS_DIR, f)).size,
                createdAt: fs.statSync(path.join(DOWNLOADS_DIR, f)).birthtime
            }));

        res.json({ files: fileList });

    } catch (error) {
        console.error('Error listando recursos:', error);
        res.status(500).json({ error: 'Error al listar archivos' });
    }
});

module.exports = router;
