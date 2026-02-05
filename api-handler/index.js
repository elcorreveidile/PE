// Vercel serverless function - Express wrapper
const express = require('express');

// Import routes
const authRoutes = require('../backend/src/routes/auth');
const usersRoutes = require('../backend/src/routes/users');
const submissionsRoutes = require('../backend/src/routes/submissions');

// Create Express app (without listening)
const app = express();

// Middleware
app.use((req, res, next) => {
    // Parse JSON body manually for Vercel
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            if (data) {
                try {
                    req.body = JSON.parse(data);
                } catch (e) {
                    req.body = {};
                }
            }
            next();
        });
    } else {
        next();
    }
});

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});

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
        environment: process.env.NODE_ENV || 'production'
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

// Vercel serverless handler
module.exports = (req, res) => {
    app(req, res);
};
