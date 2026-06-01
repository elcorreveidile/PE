/**
 * Ejecutar migración de sistema multi-curso
 * Uso: node src/database/migrate-courses.js
 */

const { query } = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Iniciando migración de sistema multi-curso...\n');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, 'add-courses-table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Dividir el SQL en sentencias individuales
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Ejecutando ${statements.length} sentencias SQL...\n`);

        let completed = 0;
        for (const statement of statements) {
            try {
                await query(statement);
                completed++;
                console.log(`✅ [${completed}/${statements.length}] Ejecutado correctamente`);
            } catch (error) {
                // Ignorar errores de "already exists" o duplicados
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate') ||
                    error.message.includes('does not exist')) {
                    console.log(`⚠️  [${completed}/${statements.length}] Ya existe (ignorado)`);
                } else {
                    console.error(`❌ [${completed}/${statements.length}] Error: ${error.message}`);
                    throw error;
                }
            }
        }

        console.log('\n✅ Migración completada exitosamente!\n');

        // Verificar cursos creados
        const coursesResult = await query('SELECT code, name, title FROM courses ORDER BY code');
        console.log('📚 Cursos disponibles:');
        coursesResult.rows.forEach(course => {
            console.log(`   • ${course.code}: ${course.title}`);
        });

        // Verificar códigos de registro
        const codesResult = await query(`
            SELECT rc.code, rc.description, c.name as course_name
            FROM registration_codes rc
            JOIN courses c ON rc.course_id = c.id
            ORDER BY rc.code
        `);
        console.log('\n🔑 Códigos de registro activos:');
        codesResult.rows.forEach(code => {
            console.log(`   • ${code.code}: ${code.course_name}`);
        });

        console.log('\n🎉 Sistema multi-curso configurado correctamente!\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error en migración:', error.message);
        process.exit(1);
    }
}

runMigration();