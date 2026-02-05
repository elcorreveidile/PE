/**
 * Conexión a la base de datos PostgreSQL
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('DATABASE_URL no está configurada. La API no podrá conectar a la base de datos.');
}

const schema = (process.env.PG_SCHEMA || 'public').trim();
const schemaIsValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema);

if (!schemaIsValid) {
    throw new Error(`PG_SCHEMA inválido: "${schema}"`);
}

const sslRequired = connectionString && connectionString.includes('sslmode=require');

const pool = new Pool({
    connectionString,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined
});

pool.on('connect', async (client) => {
    try {
        await client.query(`SET search_path TO ${schema}`);
    } catch (error) {
        console.error('Error al configurar search_path:', error);
        throw error;
    }
});

async function query(text, params) {
    return pool.query(text, params);
}

async function getClient() {
    return pool.connect();
}

async function closeDb() {
    await pool.end();
}

module.exports = { query, getClient, closeDb, pool, schema };
