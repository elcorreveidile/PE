/**
 * Conexión a la base de datos
 * Soporta SQLite (desarrollo) y PostgreSQL (producción)
 * Proporciona una capa de abstracción para usar la misma sintaxis
 */

const path = require('path');
const fs = require('fs');

// Determinar tipo de base de datos
const dbType = process.env.DB_TYPE || 'sqlite';

let pool = null; // Para PostgreSQL
let db = null;   // Para SQLite

/**
 * Obtiene la conexión a la base de datos (SQLite o PostgreSQL)
 */
async function getDb() {
    if (dbType === 'postgres') {
        // PostgreSQL con pool de conexiones
        if (!pool) {
            const { Pool } = require('pg');
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });
            console.log('PostgreSQL pool creado');
        }
        return pool;
    } else {
        // SQLite
        if (!db) {
            const Database = require('better-sqlite3');
            const DB_PATH = process.env.DATABASE_PATH || './data/database.sqlite';
            const dbPath = path.resolve(__dirname, '../../', DB_PATH);

            // Crear directorio si no existe
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            db = new Database(dbPath);
            db.pragma('foreign_keys = ON');
            db.pragma('journal_mode = WAL');
        }
        return db;
    }
}

/**
 * Cierra la conexión a la base de datos
 */
async function closeDb() {
    if (dbType === 'postgres') {
        if (pool) {
            await pool.end();
            pool = null;
        }
    } else {
        if (db) {
            db.close();
            db = null;
        }
    }
}

/**
 * Convierte parámetros de estilo SQLite (?) a PostgreSQL ($1, $2, ...)
 */
function convertSql(sql) {
    if (dbType !== 'postgres') return sql;

    let paramIndex = 0;
    return sql.replace(/\?/g, () => `$${++paramIndex}`);
}

/**
 * Ejecuta una consulta SQL
 * @param {string} sql - Consulta SQL (sintaxis SQLite con ?)
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<Object>} Resultado de la consulta
 */
async function query(sql, params = []) {
    const database = await getDb();

    if (dbType === 'postgres') {
        // Convertir ? a $1, $2, ...
        const pgSql = convertSql(sql);
        const result = await database.query(pgSql, params);

        return {
            rows: result.rows,
            rowCount: result.rowCount,
            // Compatibilidad con SQLite
            run: () => ({
                changes: result.rowCount,
                lastInsertRowid: result.rows[0]?.id || null
            }),
            get: () => result.rows[0] || null,
            all: () => result.rows
        };
    } else {
        // SQLite: devuelve el resultado directamente
        const stmt = database.prepare(sql);
        const method = sql.trim().toUpperCase().startsWith('SELECT')
            ? (params.length > 1 ? 'all' : 'get')
            : 'run';

        const result = stmt[method](...params);

        // Añadir lastInsertRowid para compatibilidad
        if (result && typeof result === 'object' && !result.lastInsertRowid) {
            result.lastInsertRowid = result.lastID;
        }

        return result;
    }
}

/**
 * Wrapper para prepared statements que funciona con ambos motores
 */
function prepare(sql) {
    return {
        async get(...params) {
            const result = await query(sql, params);
            return result;
        },
        async all(...params) {
            const result = await query(sql, params);
            return result.rows || result;
        },
        async run(...params) {
            const result = await query(sql, params);
            return result.run ? result.run() : result;
        }
    };
}

/**
 * Verifica si es PostgreSQL
 */
function isPostgres() {
    return dbType === 'postgres';
}

/**
 * Obtiene el tipo de base de datos
 */
function getDbType() {
    return dbType;
}

module.exports = {
    getDb,
    closeDb,
    query,
    prepare,
    isPostgres,
    getDbType
};
