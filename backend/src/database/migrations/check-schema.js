/**
 * Script para verificar el esquema actual de la tabla users
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkSchema() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL no está configurada');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('📋 Estructura de la tabla users:\n');

        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('Columna'.padEnd(25), 'Tipo'.padEnd(20), 'Nullable', 'Default');
        console.log('─'.repeat(80));

        result.rows.forEach(row => {
            console.log(
                row.column_name.padEnd(25),
                row.data_type.padEnd(20),
                row.is_nullable.padEnd(8),
                row.column_default || ''
            );
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
