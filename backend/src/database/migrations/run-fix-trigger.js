/**
 * Script para ejecutar la corrección del trigger
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL no está configurada');
        process.exit(1);
    }

    console.log('🔌 Conectando a Neon...');

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Primero actualizar la función para que use updatedAt en camelCase
        console.log('📝 Actualizando función de trigger...');

        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Eliminar trigger anterior
        console.log('🗑️  Eliminando trigger anterior...');
        await pool.query('DROP TRIGGER IF EXISTS set_users_updated_at ON users');

        // Crear nuevo trigger
        console.log('✨ Creando nuevo trigger...');
        await pool.query(`
            CREATE TRIGGER set_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);

        console.log('✅ Trigger actualizado correctamente');
        console.log('');
        console.log('El trigger ahora actualizará automáticamente la columna "updatedAt" (camelCase)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
