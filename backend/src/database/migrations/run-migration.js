/**
 * Script para ejecutar migraciones en la base de datos Neon
 * Uso: node backend/src/database/migrations/run-migration.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const { Pool } = require('pg');

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL no está configurada en .env');
        process.exit(1);
    }

    console.log('🔌 Conectando a Neon...');

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'add_timestamps.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Ejecutando migración...');

        // Ejecutar la migración
        await pool.query(migrationSQL);

        console.log('✅ Migración ejecutada correctamente');
        console.log('');
        console.log('Columnas agregadas:');
        console.log('  - users.created_at');
        console.log('  - users.updated_at');
        console.log('  - Trigger para actualizar updated_at automáticamente');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
