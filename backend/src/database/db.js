/**
 * Conexión a PostgreSQL (Neon)
 */

const { Pool } = require('pg');

// Determinar si usar SSL basado en la URL de la base de datos
const useSSL = process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1') &&
    process.env.NODE_ENV !== 'development';

// Crear pool de conexiones
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? {
        rejectUnauthorized: false
    } : false
});

// Verificar conexión
pool.on('connect', () => {
    console.log('Conectado a PostgreSQL (Neon)');
});

pool.on('error', (err) => {
    console.error('Error en conexión PostgreSQL:', err);
});

// Helper para ejecutar queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('Query ejecutada', { text: text.substring(0, 50), duration, rows: res.rowCount });
        }
        return res;
    } catch (error) {
        console.error('Error en query:', error.message);
        throw error;
    }
};

// Helper para obtener una conexión del pool
const getClient = async () => {
    return await pool.connect();
};

module.exports = {
    pool,
    query,
    getClient
};
