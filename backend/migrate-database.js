/**
 * Script de Migración de Base de Datos
 * Ejecuta la migración de rúbricas en la base de datos de Railway
 * 
 * Uso: node backend/migrate-database.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Obtener URL de la base de datos
const DATABASE_URL = process.env.DATABASE_URL || process.env.PGURL;

if (!DATABASE_URL) {
    console.error('❌ Error: No se encontró DATABASE_URL o PGURL en las variables de entorno');
    console.error('');
    console.error('Opciones:');
    console.error('1. Ejecutar: export DATABASE_URL="postgresql://..."');
    console.error('2. O crear un archivo .env con la variable DATABASE_URL');
    console.error('');
    console.error('Para obtener la URL de Railway:');
    console.error('- Ve a railway.app');
    console.error('- Selecciona tu proyecto');
    console.error('- Haz clic en la base de datos PostgreSQL');
    console.error('- Ve a la pestaña "Connect"');
    console.error('- Copia la "Connection URL"');
    process.exit(1);
}

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Railway requiere esto
    }
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Conectando a la base de datos...');
        
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'src/database/add-rubric-to-submissions.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📝 Ejecutando migración...');
        console.log('');
        
        // Ejecutar migración en orden correcto
        console.log('1/5 Creando rubric_id...');
        try {
            await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rubric_id VARCHAR(255) REFERENCES rubrics(id) ON DELETE SET NULL`);
            console.log('   ✅ rubric_id creado o ya existe');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('   ⚠️  rubric_id ya existe (OK)');
        }

        console.log('2/5 Creando criterion_scores...');
        try {
            await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS criterion_scores JSONB DEFAULT '{}'::jsonb`);
            console.log('   ✅ criterion_scores creado o ya existe');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('   ⚠️  criterion_scores ya existe (OK)');
        }

        console.log('3/5 Creando índice idx_submissions_rubric...');
        try {
            await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_rubric ON submissions(rubric_id)`);
            console.log('   ✅ índice creado o ya existe');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('   ⚠️  índice ya existe (OK)');
        }

        console.log('4/5 Añadiendo comentarios...');
        try {
            await client.query(`COMMENT ON COLUMN submissions.rubric_id IS 'ID de la rúbrica utilizada para evaluar esta entrega'`);
            await client.query(`COMMENT ON COLUMN submissions.criterion_scores IS 'Puntuaciones por criterio en formato JSON: {"criterio1": 8.5, "criterio2": 7.0}'`);
            console.log('   ✅ comentarios añadidos');
        } catch (error) {
            console.log('   ⚠️  no se pudieron añadir comentarios (no crítico)');
        }
        
        console.log('');
        console.log('✅ Migración completada exitosamente');
        console.log('');
        console.log('📊 Verificando campos...');
        
        // Verificar que los campos existen
        const checkResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'submissions' 
            AND column_name IN ('rubric_id', 'criterion_scores')
            ORDER BY column_name
        `);
        
        if (checkResult.rows.length === 2) {
            console.log('✅ Campos creados correctamente:');
            checkResult.rows.forEach(row => {
                console.log(`   - ${row.column_name} (${row.data_type})`);
            });
        } else {
            console.log('⚠️  Solo se crearon ' + checkResult.rows.length + ' de 2 campos');
        }
        
        console.log('');
        console.log('🎉 La base de datos está ahora lista para usar rúbricas');
        
    } catch (error) {
        console.error('');
        console.error('❌ Error ejecutando la migración:');
        console.error(error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Migración de Rúbricas - Producción Escrita C2          ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

runMigration();