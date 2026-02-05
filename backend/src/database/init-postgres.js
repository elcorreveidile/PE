/**
 * Script de inicialización de la base de datos PostgreSQL
 * Ejecutar con: npm run init-db
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

const schema = (process.env.PG_SCHEMA || 'public').trim();
const schemaIsValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema);

if (!schemaIsValid) {
    console.error(`PG_SCHEMA inválido: "${schema}"`);
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});

const sessions = [
    { id: 1, date: '2026-02-03', day: 'Martes', title: 'Introducción al curso y diagnóstico', theme: 1, contents: [1] },
    { id: 2, date: '2026-02-05', day: 'Jueves', title: 'El proceso de escribir: planificación', theme: 1, contents: [1] },
    { id: 3, date: '2026-02-10', day: 'Martes', title: 'Escribir un perfil personal', theme: 1, contents: [1, 2] },
    { id: 4, date: '2026-02-12', day: 'Jueves', title: 'Escribir un perfil profesional', theme: 1, contents: [2] },
    { id: 5, date: '2026-02-17', day: 'Martes', title: 'Cartas formales: estructura y fórmulas', theme: 2, contents: [2, 3] },
    { id: 6, date: '2026-02-19', day: 'Jueves', title: 'Cartas de solicitud y reclamación', theme: 2, contents: [3] },
    { id: 7, date: '2026-02-24', day: 'Martes', title: 'Textos creativos: descripción de sensaciones', theme: 3, contents: [4] },
    { id: 8, date: '2026-02-26', day: 'Jueves', title: 'Valoraciones artísticas', theme: 3, contents: [4, 5] },
    { id: 9, date: '2026-03-03', day: 'Martes', title: 'TALLER: Mini serie web (I)', theme: null, workshop: 1, contents: [] },
    { id: 10, date: '2026-03-05', day: 'Jueves', title: 'Textos de opinión: argumentación', theme: 4, contents: [5, 6] },
    { id: 11, date: '2026-03-10', day: 'Martes', title: 'Conectores y marcadores discursivos', theme: 4, contents: [6] },
    { id: 12, date: '2026-03-12', day: 'Jueves', title: 'Coherencia y cohesión textual', theme: 4, contents: [6] },
    { id: 13, date: '2026-03-17', day: 'Martes', title: 'Textos expositivos: ser wikipedista', theme: 5, contents: [7, 8] },
    { id: 14, date: '2026-03-19', day: 'Jueves', title: 'Precisión léxica: nominalización', theme: 5, contents: [7] },
    { id: 15, date: '2026-03-24', day: 'Martes', title: 'TALLER: Olvidos de Granada (I)', theme: null, workshop: 2, contents: [] },
    { id: 16, date: '2026-04-07', day: 'Martes', title: 'Bienvenida post-vacaciones: Puesta al día social y lingüística', theme: 6, contents: [16] },
    { id: 17, date: '2026-04-09', day: 'Jueves', title: 'La entrevista: Estructura y tipos (Entrevistas de trabajo, a expertos)', theme: 6, contents: [17] },
    { id: 18, date: '2026-04-14', day: 'Martes', title: 'Estrategias de interacción: Preguntas abiertas y seguir el hilo', theme: 7, contents: [18] },
    { id: 19, date: '2026-04-16', day: 'Jueves', title: 'El estilo indirecto: Transmitir mensajes y opiniones de otros', theme: 7, contents: [19] },
    { id: 20, date: '2026-04-21', day: 'Martes', title: 'Estrategias de influencia: Aconsejar, sugerir y advertir', theme: 8, contents: [20] },
    { id: 21, date: '2026-04-23', day: 'Jueves', title: 'Lenguaje persuasivo: Insistir en una petición y gestionar conflictos', theme: 8, contents: [21] },
    { id: 22, date: '2026-04-28', day: 'Martes', title: 'La Conferencia (I): Apertura, captar atención y presentar la idea central', theme: 9, contents: [22] },
    { id: 23, date: '2026-04-30', day: 'Jueves', title: 'La Conferencia (II): Desarrollo, énfasis en detalles y cierre efectivo', theme: 9, contents: [23] },
    { id: 24, date: '2026-05-05', day: 'Martes', title: 'TALLER: Safari fotográfico (I)', theme: null, workshop: 3, contents: [] },
    { id: 25, date: '2026-05-07', day: 'Jueves', title: 'TALLER: Granada 2031 (I)', theme: null, workshop: 4, contents: [] },
    { id: 26, date: '2026-05-12', day: 'Martes', title: 'Crítica cinematográfica', theme: 10, contents: [3, 4] },
    { id: 27, date: '2026-05-14', day: 'Jueves', title: 'Última clase: Presentaciones finales y despedida', theme: 11, contents: [25] }
];

async function init() {
    const client = await pool.connect();
    try {
        const schemaPath = path.join(__dirname, 'schema-postgres.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        if (schema !== 'public') {
            console.log(`Creando schema "${schema}" si no existe...`);
            await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
        }

        await client.query(`SET search_path TO ${schema}`);

        console.log('Ejecutando esquema SQL...');
        await client.query(schema);
        console.log('Esquema aplicado correctamente.');

        console.log('Insertando sesiones del curso...');
        const insertSql = `
            INSERT INTO course_sessions (id, date, day, title, theme, workshop, contents)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                date = EXCLUDED.date,
                day = EXCLUDED.day,
                title = EXCLUDED.title,
                theme = EXCLUDED.theme,
                workshop = EXCLUDED.workshop,
                contents = EXCLUDED.contents
        `;

        for (const session of sessions) {
            await client.query(insertSql, [
                session.id,
                session.date,
                session.day,
                session.title,
                session.theme,
                session.workshop || null,
                JSON.stringify(session.contents || [])
            ]);
        }
        console.log(`${sessions.length} sesiones insertadas.`);

        const adminEmail = process.env.ADMIN_EMAIL || 'benitezl@go.ugr.es';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminName = process.env.ADMIN_NAME || 'Javier Benítez Láinez';

        const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

        if (!existingAdmin.rows[0]) {
            console.log('Creando usuario administrador...');
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            await client.query(
                `INSERT INTO users (email, password, name, role, level)
                 VALUES ($1, $2, $3, 'admin', 'C2')`,
                [adminEmail, hashedPassword, adminName]
            );
            console.log(`Admin creado: ${adminEmail}`);
        } else {
            console.log(`Admin ya existe: ${adminEmail}`);
        }

        if (process.env.CREATE_DEMO_USER === 'true') {
            const demoEmail = 'estudiante@ejemplo.com';
            const existingDemo = await client.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
            if (!existingDemo.rows[0]) {
                console.log('Creando estudiante de demostración...');
                const hashedPassword = bcrypt.hashSync('estudiante123', 10);
                await client.query(
                    `INSERT INTO users (email, password, name, role, level)
                     VALUES ($1, $2, $3, 'student', 'C2')`,
                    [demoEmail, hashedPassword, 'Estudiante Demo']
                );
                console.log(`Estudiante demo creado: ${demoEmail}`);
            } else {
                console.log(`Estudiante demo ya existe: ${demoEmail}`);
            }
        }

        console.log('\n✅ Base de datos PostgreSQL inicializada correctamente.');
        console.log('\nCuentas creadas:');
        console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
        if (process.env.CREATE_DEMO_USER === 'true') {
            console.log('  Demo:  estudiante@ejemplo.com / estudiante123');
        }
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

init();
