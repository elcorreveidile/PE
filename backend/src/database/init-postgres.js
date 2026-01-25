/**
 * Script de inicialización de la base de datos PostgreSQL
 * Para Supabase/Producción
 * Ejecutar con: node src/database/init-postgres.js
 */

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { query } = require('./db');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    try {
        console.log('Iniciando base de datos PostgreSQL...');

        // Leer y ejecutar el esquema SQL
        const schemaPath = path.join(__dirname, 'schema-postgres.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Ejecutando esquema SQL...');

        // Separar y ejecutar cada statement
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await query(statement);
            } catch (err) {
                // Ignorar errores de objetos ya existentes
                if (!err.message.includes('already exists')) {
                    console.warn('Warning:', err.message);
                }
            }
        }

        console.log('Esquema aplicado correctamente.');

        // Datos de las sesiones del curso
        const sessions = [
            { id: 1, date: '2026-02-02', day: 'Lunes', title: 'Introducción al curso y diagnóstico', theme: 1, contents: '[1]' },
            { id: 2, date: '2026-02-04', day: 'Miércoles', title: 'El proceso de escribir: planificación', theme: 1, contents: '[1]' },
            { id: 3, date: '2026-02-09', day: 'Lunes', title: 'Escribir un perfil personal', theme: 1, contents: '[1,2]' },
            { id: 4, date: '2026-02-11', day: 'Miércoles', title: 'Escribir un perfil profesional', theme: 1, contents: '[2]' },
            { id: 5, date: '2026-02-16', day: 'Lunes', title: 'Cartas formales: estructura y fórmulas', theme: 2, contents: '[2,3]' },
            { id: 6, date: '2026-02-18', day: 'Miércoles', title: 'Cartas de solicitud y reclamación', theme: 2, contents: '[3]' },
            { id: 7, date: '2026-02-23', day: 'Lunes', title: 'Textos creativos: descripción de sensaciones', theme: 3, contents: '[4]' },
            { id: 8, date: '2026-02-25', day: 'Miércoles', title: 'Valoraciones artísticas', theme: 3, contents: '[4,5]' },
            { id: 9, date: '2026-03-02', day: 'Lunes', title: 'TALLER: Mini serie web (I)', theme: null, workshop: 1, contents: '[]' },
            { id: 10, date: '2026-03-04', day: 'Miércoles', title: 'Textos de opinión: argumentación', theme: 4, contents: '[5,6]' },
            { id: 11, date: '2026-03-09', day: 'Lunes', title: 'Conectores y marcadores discursivos', theme: 4, contents: '[6]' },
            { id: 12, date: '2026-03-11', day: 'Miércoles', title: 'Coherencia y cohesión textual', theme: 4, contents: '[6]' },
            { id: 13, date: '2026-03-16', day: 'Lunes', title: 'Textos expositivos: ser wikipedista', theme: 5, contents: '[7,8]' },
            { id: 14, date: '2026-03-18', day: 'Miércoles', title: 'Precisión léxica: nominalización', theme: 5, contents: '[7]' },
            { id: 15, date: '2026-03-23', day: 'Lunes', title: 'TALLER: Olvidos de Granada (I)', theme: null, workshop: 2, contents: '[]' },
            { id: 16, date: '2026-03-25', day: 'Miércoles', title: 'Preparar una entrevista', theme: 6, contents: '[7,8]' },
            { id: 17, date: '2026-03-30', day: 'Lunes', title: 'Vocabulario especializado', theme: 6, contents: '[8]' },
            { id: 18, date: '2026-04-01', day: 'Miércoles', title: 'Pros y contras en textos académicos', theme: 7, contents: '[6,11]' },
            { id: 19, date: '2026-04-06', day: 'Lunes', title: 'Lenguaje académico (I)', theme: 7, contents: '[11]' },
            { id: 20, date: '2026-04-08', day: 'Miércoles', title: 'TALLER: Safari fotográfico (I)', theme: null, workshop: 3, contents: '[]' },
            { id: 21, date: '2026-04-13', day: 'Lunes', title: 'Presentaciones especializadas', theme: 8, contents: '[8,11]' },
            { id: 22, date: '2026-04-15', day: 'Miércoles', title: 'Colocaciones e idiomatismos', theme: 8, contents: '[9]' },
            { id: 23, date: '2026-04-20', day: 'Lunes', title: 'Participación en foros', theme: 9, contents: '[9,10]' },
            { id: 24, date: '2026-04-22', day: 'Miércoles', title: 'Variedades léxicas y registros', theme: 9, contents: '[10]' },
            { id: 25, date: '2026-04-27', day: 'Lunes', title: 'TALLER: Granada 2031 (I)', theme: null, workshop: 4, contents: '[]' },
            { id: 26, date: '2026-04-29', day: 'Miércoles', title: 'Crítica cinematográfica', theme: 10, contents: '[3,4]' },
            { id: 27, date: '2026-05-04', day: 'Lunes', title: 'Textos periodísticos', theme: 11, contents: '[2,8]' },
            { id: 28, date: '2026-05-06', day: 'Miércoles', title: 'Lenguaje académico (II)', theme: 11, contents: '[11,12]' },
            { id: 29, date: '2026-05-11', day: 'Lunes', title: 'Resúmenes y síntesis', theme: 12, contents: '[12,13]' },
            { id: 30, date: '2026-05-13', day: 'Miércoles', title: 'Recursos para escribir y citación', theme: 12, contents: '[13,15]' },
            { id: 31, date: '2026-05-18', day: 'Lunes', title: 'Cuestiones ortográficas y formato', theme: 13, contents: '[14]' },
            { id: 32, date: '2026-05-20', day: 'Miércoles', title: 'Repaso general y preparación examen', theme: 14, contents: '[14]' },
        ];

        // Insertar sesiones del curso
        console.log('Insertando sesiones del curso...');

        for (const s of sessions) {
            const checkResult = await query('SELECT id FROM course_sessions WHERE id = $1', [s.id]);
            if (!checkResult.rows || checkResult.rows.length === 0) {
                await query(`
                    INSERT INTO course_sessions (id, date, day, title, theme, workshop, contents)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [s.id, s.date, s.day, s.title, s.theme || null, s.workshop || null, s.contents]);
            }
        }

        console.log(`${sessions.length} sesiones insertadas.`);

        // Crear usuario administrador
        const adminEmail = process.env.ADMIN_EMAIL || 'benitezl@go.ugr.es';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminName = process.env.ADMIN_NAME || 'Javier Benítez Láinez';

        // Verificar si ya existe el admin
        const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);

        if (!existingAdmin.rows || existingAdmin.rows.length === 0) {
            console.log('Creando usuario administrador...');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await query(`
                INSERT INTO users (email, password, name, role, level)
                VALUES ($1, $2, $3, 'admin', 'C2')
            `, [adminEmail, hashedPassword, adminName]);
            console.log(`Admin creado: ${adminEmail}`);
        } else {
            console.log(`Admin ya existe: ${adminEmail}`);
        }

        // Crear un estudiante de demostración
        const demoEmail = 'estudiante@ejemplo.com';
        const existingDemo = await query('SELECT id FROM users WHERE email = $1', [demoEmail]);

        if (!existingDemo.rows || existingDemo.rows.length === 0) {
            console.log('Creando estudiante de demostración...');
            const hashedPassword = await bcrypt.hash('estudiante123', 10);

            await query(`
                INSERT INTO users (email, password, name, role, level)
                VALUES ($1, $2, $3, 'student', 'C2')
            `, [demoEmail, hashedPassword, 'Estudiante Demo']);
            console.log(`Estudiante demo creado: ${demoEmail}`);
        } else {
            console.log(`Estudiante demo ya existe: ${demoEmail}`);
        }

        console.log('\n✅ Base de datos PostgreSQL inicializada correctamente.');
        console.log('\nCuentas creadas:');
        console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
        console.log(`  Demo:  ${demoEmail} / estudiante123`);

    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

initDatabase();
