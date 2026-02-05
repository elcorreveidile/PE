/**
 * Script para verificar usuarios en la base de datos
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkUsers() {
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
        console.log('📋 Usuarios registrados:\n');

        const result = await pool.query(`
            SELECT id, email, name, level, role, "createdAt", "updatedAt"
            FROM users
            ORDER BY "createdAt" DESC
            LIMIT 5;
        `);

        if (result.rows.length === 0) {
            console.log('No hay usuarios registrados');
        } else {
            console.log('ID'.substring(0, 8).padEnd(12), 'Email'.padEnd(35), 'Nombre'.padEnd(20), 'Nivel');
            console.log('─'.repeat(90));

            result.rows.forEach(row => {
                const shortId = row.id.substring(0, 8);
                console.log(
                    shortId.padEnd(12),
                    row.email.padEnd(35),
                    row.name.padEnd(20),
                    row.level || 'N/A'
                );
            });

            console.log(`\nTotal de usuarios: ${result.rows.length} (mostrando últimos 5)`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers();
