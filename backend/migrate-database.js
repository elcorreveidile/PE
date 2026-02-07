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
        
        // Separar en comandos individuales
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        // Ejecutar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                await client.query(statement);
                console.log(`✅ Comando ${i + 1}/${statements.length} ejecutado`);
            } catch (error) {
                // Ignorar errores de "ya existe" o duplicados
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate key')) {
                    console.log(`⚠️  Comando ${i + 1}/${statements.length} ya existe (OK)`);
                } else {
                    throw error;
                }
            }
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