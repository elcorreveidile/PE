/**
 * Verificar nombre de columna last_login
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkColumn() {
    const connectionString = process.env.DATABASE_URL;

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const result = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND (column_name LIKE '%login%' OR column_name LIKE '%Login%');
        `);

        console.log('Columnas con "login":');
        result.rows.forEach(row => {
            console.log('  -', row.column_name);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkColumn();
