/**
 * Rutas de estadísticas para el admin
 */

const express = require('express');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/statistics/overview
 * Obtiene estadísticas generales para el dashboard
 */
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Total de visitas
        const totalVisitsResult = await query('SELECT COUNT(*) as count FROM visits');
        const totalVisits = parseInt(totalVisitsResult.rows[0].count);

        // Visitas hoy
        const todayVisitsResult = await query(`
            SELECT COUNT(*) as count
            FROM visits
            WHERE DATE(visited_at) = CURRENT_DATE
        `);
        const todayVisits = parseInt(todayVisitsResult.rows[0].count);

        // Visitas únicas hoy
        const uniqueVisitsResult = await query(`
            SELECT COUNT(*) as count
            FROM visits
            WHERE DATE(visited_at) = CURRENT_DATE AND is_unique = true
        `);
        const uniqueVisits = parseInt(uniqueVisitsResult.rows[0].count);

        // Visitas únicas totales
        const totalUniqueResult = await query(`
            SELECT COUNT(DISTINCT CASE
                WHEN user_id IS NOT NULL THEN user_id::text
                ELSE session_id
            END) as count
            FROM visits
        `);
        const totalUnique = parseInt(totalUniqueResult.rows[0].count);

        // Visitas en los últimos 7 días
        const last7DaysResult = await query(`
            SELECT DATE(visited_at) as date, COUNT(*) as visits
            FROM visits
            WHERE visited_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(visited_at)
            ORDER BY date
        `);

        const visitsByDay = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            visitsByDay[dateStr] = 0;
        }

        last7DaysResult.rows.forEach(row => {
            const dateStr = row.date.toISOString().split('T')[0];
            visitsByDay[dateStr] = parseInt(row.visits);
        });

        res.json({
            totalVisits,
            todayVisits,
            uniqueVisits,
            totalUnique,
            visitsByDay
        });

    } catch (error) {
        console.error('Error getting statistics overview:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

/**
 * GET /api/statistics/by-page
 * Obtiene visitas desglosadas por página
 */
router.get('/by-page', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT
                page,
                COUNT(*) as total_visits,
                COUNT(DISTINCT CASE
                    WHEN user_id IS NOT NULL THEN user_id::text
                    ELSE session_id
                END) as unique_visitors,
                MAX(visited_at) as last_visit
            FROM visits
            GROUP BY page
            ORDER BY total_visits DESC
        `);

        res.json({
            pages: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error getting statistics by page:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas por página' });
    }
});

/**
 * GET /api/statistics/recent-visits
 * Obtiene las últimas visitas
 */
router.get('/recent-visits', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const result = await query(`
            SELECT
                v.id,
                v.page,
                v.user_id,
                u.name as user_name,
                u.email as user_email,
                v.ip_address,
                v.visited_at,
                v.is_unique
            FROM visits v
            LEFT JOIN users u ON v.user_id = u.id
            ORDER BY v.visited_at DESC
            LIMIT $1
        `, [limit]);

        res.json({
            visits: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error getting recent visits:', error);
        res.status(500).json({ error: 'Error al obtener visitas recientes' });
    }
});

/**
 * GET /api/statistics/unique-vs-returning
 * Compara visitantes únicos vs recurrentes
 */
router.get('/unique-vs-returning', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const result = await query(`
            SELECT
                DATE(visited_at) as date,
                COUNT(DISTINCT CASE
                    WHEN user_id IS NOT NULL THEN user_id::text
                    ELSE session_id
                END) as unique_visitors,
                COUNT(*) as total_visits,
                COUNT(*) - COUNT(DISTINCT CASE
                    WHEN user_id IS NOT NULL THEN user_id::text
                    ELSE session_id
                END) as returning_visits
            FROM visits
            WHERE visited_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(visited_at)
            ORDER BY date
        `);

        res.json({
            data: result.rows,
            period: `${days} days`
        });

    } catch (error) {
        console.error('Error getting unique vs returning statistics:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas únicos vs recurrentes' });
    }
});

module.exports = router;
