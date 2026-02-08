/**
 * Rutas de suscripciones y planes (PostgreSQL)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// RUTAS PÚBLICAS
// ============================================================

/**
 * GET /api/subscriptions/plans
 * Obtener todos los planes activos
 */
router.get('/plans', async (req, res) => {
    try {
        const result = await query(
            'SELECT id, name, display_name, price_cents, currency, billing_period, features, includes_certificate, post_course_access_days, priority_feedback FROM subscription_plans WHERE active = true ORDER BY price_cents ASC'
        );

        const plans = result.rows.map(plan => ({
            ...plan,
            price: (plan.price_cents / 100).toFixed(2),
            features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
        }));

        res.json({
            success: true,
            data: plans
        });
    } catch (err) {
        console.error('Error obteniendo planes:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los planes'
        });
    }
});

/**
 * GET /api/subscriptions/plans/:name
 * Obtener un plan específico por nombre
 */
router.get('/plans/:name', async (req, res) => {
    try {
        const result = await query(
            'SELECT id, name, display_name, price_cents, currency, billing_period, features, includes_certificate, post_course_access_days, priority_feedback FROM subscription_plans WHERE name = $1 AND active = true',
            [req.params.name]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plan no encontrado'
            });
        }

        const plan = result.rows[0];
        plan.price = (plan.price_cents / 100).toFixed(2);
        plan.features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;

        res.json({
            success: true,
            data: plan
        });
    } catch (err) {
        console.error('Error obteniendo plan:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el plan'
        });
    }
});

// ============================================================
// RUTAS AUTENTICADAS (ESTUDIANTES)
// ============================================================

/**
 * GET /api/subscriptions/my-subscription
 * Obtener la suscripción activa del usuario
 */
router.get('/my-subscription', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT s.*, sp.name as plan_name, sp.display_name, sp.price_cents, sp.currency,
                    sp.billing_period, sp.features, sp.includes_certificate,
                    sp.post_course_access_days, sp.priority_feedback
             FROM subscriptions s
             JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE s.user_id = $1 AND s.status = 'active'
             ORDER BY s.created_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No tienes una suscripcion activa'
            });
        }

        const subscription = result.rows[0];
        subscription.price = (subscription.price_cents / 100).toFixed(2);
        subscription.features = typeof subscription.features === 'string'
            ? JSON.parse(subscription.features)
            : subscription.features;

        res.json({
            success: true,
            data: subscription
        });
    } catch (err) {
        console.error('Error obteniendo suscripcion:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la suscripcion'
        });
    }
});

/**
 * POST /api/subscriptions/subscribe
 * Crear una nueva suscripción
 */
router.post('/subscribe', authenticateToken, [
    body('plan_name').isString().isIn(['free', 'monthly', 'complete']).withMessage('Plan no valido'),
    body('payment_method').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Datos de suscripcion no validos',
            details: errors.array()
        });
    }

    try {
        const { plan_name, payment_method } = req.body;

        // Verificar que el plan existe
        const planResult = await query(
            'SELECT * FROM subscription_plans WHERE name = $1 AND active = true',
            [plan_name]
        );

        if (planResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Plan no encontrado'
            });
        }

        const plan = planResult.rows[0];

        // Verificar si ya tiene una suscripción activa
        const existingResult = await query(
            "SELECT id, plan_id FROM subscriptions WHERE user_id = $1 AND status = 'active'",
            [req.user.id]
        );

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ya tienes una suscripcion activa. Cancela la actual antes de cambiar de plan.'
            });
        }

        // Calcular fecha de expiración
        let expiresAt = null;
        if (plan.billing_period === 'monthly') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (plan.name === 'complete') {
            // Curso completo: hasta fin del curso + acceso post-curso
            expiresAt = new Date('2026-05-21');
            expiresAt.setDate(expiresAt.getDate() + plan.post_course_access_days);
        }

        // Crear suscripción
        const subscriptionResult = await query(
            `INSERT INTO subscriptions (user_id, plan_id, status, expires_at, payment_method)
             VALUES ($1, $2, 'active', $3, $4)
             RETURNING *`,
            [req.user.id, plan.id, expiresAt, payment_method || null]
        );

        const subscription = subscriptionResult.rows[0];

        // Registrar pago si el plan no es gratuito
        if (plan.price_cents > 0) {
            await query(
                `INSERT INTO payments (user_id, subscription_id, amount_cents, currency, status, payment_method, description)
                 VALUES ($1, $2, $3, $4, 'completed', $5, $6)`,
                [
                    req.user.id,
                    subscription.id,
                    plan.price_cents,
                    plan.currency,
                    payment_method || null,
                    `Suscripcion: ${plan.display_name}`
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: `Suscripcion al plan "${plan.display_name}" creada correctamente`,
            data: {
                subscription_id: subscription.id,
                plan: plan.display_name,
                status: subscription.status,
                expires_at: subscription.expires_at,
                price: (plan.price_cents / 100).toFixed(2),
                currency: plan.currency
            }
        });
    } catch (err) {
        console.error('Error creando suscripcion:', err);
        res.status(500).json({
            success: false,
            error: 'Error al crear la suscripcion'
        });
    }
});

/**
 * POST /api/subscriptions/cancel
 * Cancelar la suscripción activa
 */
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `UPDATE subscriptions
             SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND status = 'active'
             RETURNING *`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No tienes una suscripcion activa para cancelar'
            });
        }

        res.json({
            success: true,
            message: 'Suscripcion cancelada correctamente. Mantendras el acceso hasta la fecha de expiracion.',
            data: {
                cancelled_at: result.rows[0].cancelled_at,
                expires_at: result.rows[0].expires_at
            }
        });
    } catch (err) {
        console.error('Error cancelando suscripcion:', err);
        res.status(500).json({
            success: false,
            error: 'Error al cancelar la suscripcion'
        });
    }
});

/**
 * GET /api/subscriptions/my-payments
 * Historial de pagos del usuario
 */
router.get('/my-payments', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT p.*, sp.display_name as plan_name
             FROM payments p
             LEFT JOIN subscriptions s ON p.subscription_id = s.id
             LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        const payments = result.rows.map(p => ({
            ...p,
            amount: (p.amount_cents / 100).toFixed(2)
        }));

        res.json({
            success: true,
            data: payments
        });
    } catch (err) {
        console.error('Error obteniendo pagos:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el historial de pagos'
        });
    }
});

// ============================================================
// RUTAS DE ADMINISTRACIÓN
// ============================================================

/**
 * GET /api/subscriptions/admin/overview
 * Estadísticas generales de suscripciones (solo admin)
 */
router.get('/admin/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [subsResult, revenueResult, planBreakdown] = await Promise.all([
            query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions,
                    COUNT(*) FILTER (WHERE status = 'expired') as expired_subscriptions,
                    COUNT(*) as total_subscriptions
                FROM subscriptions
            `),
            query(`
                SELECT
                    COALESCE(SUM(amount_cents) FILTER (WHERE status = 'completed'), 0) as total_revenue_cents,
                    COUNT(*) FILTER (WHERE status = 'completed') as total_payments
                FROM payments
            `),
            query(`
                SELECT sp.display_name, sp.name,
                       COUNT(s.id) as subscriber_count
                FROM subscription_plans sp
                LEFT JOIN subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
                WHERE sp.active = true
                GROUP BY sp.id, sp.display_name, sp.name
                ORDER BY sp.price_cents ASC
            `)
        ]);

        const stats = subsResult.rows[0];
        const revenue = revenueResult.rows[0];

        res.json({
            success: true,
            data: {
                subscriptions: {
                    active: parseInt(stats.active_subscriptions),
                    cancelled: parseInt(stats.cancelled_subscriptions),
                    expired: parseInt(stats.expired_subscriptions),
                    total: parseInt(stats.total_subscriptions)
                },
                revenue: {
                    total: (parseInt(revenue.total_revenue_cents) / 100).toFixed(2),
                    currency: 'EUR',
                    total_payments: parseInt(revenue.total_payments)
                },
                plan_breakdown: planBreakdown.rows.map(p => ({
                    plan: p.display_name,
                    name: p.name,
                    subscribers: parseInt(p.subscriber_count)
                }))
            }
        });
    } catch (err) {
        console.error('Error obteniendo estadisticas:', err);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadisticas de suscripciones'
        });
    }
});

/**
 * GET /api/subscriptions/admin/all
 * Listar todas las suscripciones (solo admin)
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await query(
            `SELECT s.*, u.name as user_name, u.email as user_email,
                    sp.display_name as plan_name, sp.price_cents
             FROM subscriptions s
             JOIN users u ON s.user_id = u.id
             JOIN subscription_plans sp ON s.plan_id = sp.id
             ORDER BY s.created_at DESC`
        );

        res.json({
            success: true,
            data: result.rows.map(s => ({
                ...s,
                price: (s.price_cents / 100).toFixed(2)
            }))
        });
    } catch (err) {
        console.error('Error listando suscripciones:', err);
        res.status(500).json({
            success: false,
            error: 'Error al listar las suscripciones'
        });
    }
});

module.exports = router;
