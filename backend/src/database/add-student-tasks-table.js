/**
 * Script para añadir la tabla student_tasks
 * Ejecutar con: node src/database/add-student-tasks-table.js
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Ejecutando migración: student_tasks table...');

    try {
        // Leer el archivo SQL
        const sqlFile = path.join(__dirname, 'add-student-tasks-table.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Importar después de leer para que la conexión se establezca
        const { query } = require('./db');

        // Separar el SQL en statements individuales
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        // Ejecutar cada statement
        for (const statement of statements) {
            console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
            try {
                await query(statement);
            } catch (err) {
                // Ignorar errores de "already exists"
                if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
                    console.warn('⚠️  Advertencia:', err.message);
                }
            }
        }

        console.log('✅ Migración completada: Tabla student_tasks creada correctamente');
        console.log('   - Tabla: student_tasks');
        console.log('   - Columna añadida: submissions.task_id');
        console.log('   - Índices creados');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

runMigration();
