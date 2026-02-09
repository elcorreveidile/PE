/**
 * Producción Escrita C2 - Configuración Global
 * Este archivo DEBE cargarse antes que app.js
 */

// Configuración de la API Backend
window.PE_CONFIG = {
    // URL del backend en Railway
    API_URL: 'https://produccion-escrita-c2-api-production.up.railway.app',

    // Código de registro (para modo localStorage)
    registrationCode: 'PIO7-2026-CLM',

    // Credenciales OAuth (Google Sign In)
    GOOGLE_CLIENT_ID: '1066185257125-c377b0un3c7rccmvt3jpgrs1unjm8qnf.apps.googleusercontent.com',

    // Credenciales OAuth (Apple Sign In)
    APPLE_CLIENT_ID: 'com.cognoscencia.c2',

    // EXCLUIR DEL TRACKING DE VISITAS:
    // IPs del desarrollador que NO deben contar en las estadísticas
    // Esto evita que tus propias visitas mientras desarrollas se cuenten
    developerIPs: [
        // Agrega aquí tus IPs (deja el array vacío para no filtrar por IP)
        // Ejemplo: ['83.45.67.89', '192.168.1.1']
    ],

    // Opción alternativa: excluir por rol de admin
    excludeAdminFromStats: true
};
