// Vercel serverless function handler for Express
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('../backend/src/routes/auth');
const usersRoutes = require('../backend/src/routes/users');
const submissionsRoutes = require('../backend/src/routes/submissions');

// Create Express app
const app = express();
const NODE_ENV = process.env.NODE_ENV || 'production';

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://elcorreveidile.github.io',
        'https://www.cognoscencia.com'
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/submissions', submissionsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV
    });
});

// Course info
app.get('/api/course', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'Producción Escrita C2',
            institution: 'Centro de Lenguas Modernas - Universidad de Granada',
            professor: 'Javier Benítez Láinez',
            email: 'benitezl@go.ugr.es',
            year: '2025-2026',
            sessions: 27,
            duration: '90 minutos',
            schedule: 'Martes y Jueves',
            startDate: '2026-02-03',
            endDate: '2026-05-21'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Recurso no encontrado',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
    });
});

// Export for Vercel
module.exports = app;
