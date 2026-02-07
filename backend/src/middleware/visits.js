/**
 * Middleware para trackear visitas del sitio
 */

const { query } = require('../database/db');

/**
 * Extraer nombre de página desde la URL
 */
function extractPageName(url) {
    // Eliminar query parameters y hash
    const cleanUrl = url.split('?')[0].split('#')[0];

    // Si es la raíz o index.html
    if (cleanUrl === '/' || cleanUrl === '/index.html') {
        return 'index.html';
    }

    // Eliminar barra inicial si existe
    const page = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;

    // Si no tiene extensión, es un directorio, añadir index.html
    if (!page.includes('.')) {
        return `${page}/index.html`;
    }

    return page;
}

/**
 * Middleware para trackear visitas
 */
async function trackVisit(req, res, next) {
    // Solo trackear visitas GET a páginas HTML
    if (req.method !== 'GET' || !req.path.match(/\.html$/)) {
        return next();
    }

    try {
        const page = extractPageName(req.path);

        // Extraer información de la visita
        const ipAddress = req.ip || req.connection.remoteAddress ||
                          req.headers['x-forwarded-for']?.split(',')[0].trim();
        const userAgent = req.headers['user-agent'] || '';
        const referrer = req.headers['referer'] || req.headers['referrer'] || '';

        // Obtener session_id o user_id
        const userId = req.user?.id || null;
        let sessionId = req.sessionID || null;

        // Si no hay usuario autenticado, usar una cookie para identificar visitantes únicos
        if (!userId && !sessionId) {
            sessionId = req.headers['x-session-id'] || null;
        }

        // Verificar si es una visita única hoy (primera visita del día para este visitante)
        const today = new Date().toISOString().split('T')[0];
        const uniqueCheck = await query(`
            SELECT id FROM visits
            WHERE (user_id = $1 OR (session_id = $2 AND session_id IS NOT NULL))
              AND DATE(visited_at) = $3
            LIMIT 1
        `, [userId, sessionId, today]);

        const isUnique = uniqueCheck.rows.length === 0;

        // Guardar visita (async, no bloquear la respuesta)
        query(`
            INSERT INTO visits (page, user_id, session_id, ip_address, user_agent, referrer, is_unique)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [page, userId, sessionId, ipAddress, userAgent, referrer, isUnique])
            .catch(err => console.error('Error tracking visit:', err));

    } catch (error) {
        // No fallar la petición si hay error tracking visita
        console.error('Error in visit tracking middleware:', error);
    }

    next();
}

module.exports = { trackVisit };
