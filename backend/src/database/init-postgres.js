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
const crypto = require('crypto');

function splitSqlStatements(sql) {
    const statements = [];
    let current = '';
    let i = 0;
    let inSingle = false;
    let inDouble = false;
    let inLineComment = false;
    let inBlockComment = false;
    let dollarTag = null;

    while (i < sql.length) {
        const ch = sql[i];
        const next = sql[i + 1];

        if (inLineComment) {
            current += ch;
            if (ch === '\n') inLineComment = false;
            i += 1;
            continue;
        }

        if (inBlockComment) {
            current += ch;
            if (ch === '*' && next === '/') {
                current += next;
                i += 2;
                inBlockComment = false;
            } else {
                i += 1;
            }
            continue;
        }

        if (dollarTag) {
            if (sql.startsWith(dollarTag, i)) {
                current += dollarTag;
                i += dollarTag.length;
                dollarTag = null;
            } else {
                current += ch;
                i += 1;
            }
            continue;
        }

        if (!inSingle && !inDouble) {
            if (ch === '-' && next === '-') {
                inLineComment = true;
                current += ch + next;
                i += 2;
                continue;
            }
            if (ch === '/' && next === '*') {
                inBlockComment = true;
                current += ch + next;
                i += 2;
                continue;
            }
            if (ch === '$') {
                const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
                if (match) {
                    dollarTag = match[0];
                    current += dollarTag;
                    i += dollarTag.length;
                    continue;
                }
            }
        }

        if (inSingle) {
            if (ch === "'" && next === "'") {
                current += "''";
                i += 2;
                continue;
            }
            if (ch === "'") {
                inSingle = false;
            }
            current += ch;
            i += 1;
            continue;
        }

        if (inDouble) {
            if (ch === '"' && next === '"') {
                current += '""';
                i += 2;
                continue;
            }
            if (ch === '"') {
                inDouble = false;
            }
            current += ch;
            i += 1;
            continue;
        }

        if (ch === "'") {
            inSingle = true;
            current += ch;
            i += 1;
            continue;
        }

        if (ch === '"') {
            inDouble = true;
            current += ch;
            i += 1;
            continue;
        }

        if (ch === ';') {
            const trimmed = current.trim();
            if (trimmed) statements.push(trimmed);
            current = '';
            i += 1;
            continue;
        }

        current += ch;
        i += 1;
    }

    const trimmed = current.trim();
    if (trimmed) statements.push(trimmed);
    return statements;
}

async function initDatabase() {
    try {
        console.log('Iniciando base de datos PostgreSQL...');

        // Leer y ejecutar el esquema SQL
        const schemaPath = path.join(__dirname, 'schema-postgres.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Ejecutando esquema SQL...');

        // Separar y ejecutar cada statement (respetando $$ de funciones)
        const statements = splitSqlStatements(schema);

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

        // Asegurar estructura básica y columnas necesarias
        const tablesResult = await query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);
        const existingTables = new Set((tablesResult.rows || []).map(row => row.table_name));

        const ensureTable = async (tableName, createSql) => {
            if (existingTables.has(tableName)) return;
            await query(createSql);
            existingTables.add(tableName);
        };

        // Si la tabla users no existe (DB limpia), crearla
        if (!existingTables.has('users')) {
            await ensureTable('users', `
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
                    level TEXT DEFAULT 'C2',
                    motivation TEXT,
                    active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            `);
        }

        // Detectar tipo de users.id y asegurar default si falta
        const userIdInfoResult = await query(`
            SELECT data_type, udt_name, column_default, is_identity
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'id'
        `);
        const userIdInfo = userIdInfoResult.rows?.[0];
        let userIdTypeKey = 'integer';
        let userIdTypeSql = 'INTEGER';
        let userIdHasDefault = false;

        if (userIdInfo) {
            userIdTypeKey = (userIdInfo.udt_name || userIdInfo.data_type || '').toLowerCase();
            if (userIdInfo.data_type === 'character varying') {
                userIdTypeSql = 'VARCHAR';
            } else if (userIdInfo.data_type === 'text') {
                userIdTypeSql = 'TEXT';
            } else if (userIdInfo.data_type === 'uuid') {
                userIdTypeSql = 'UUID';
            } else if (userIdInfo.data_type === 'bigint') {
                userIdTypeSql = 'BIGINT';
            } else if (userIdInfo.data_type === 'smallint') {
                userIdTypeSql = 'SMALLINT';
            } else if (userIdInfo.data_type === 'integer') {
                userIdTypeSql = 'INTEGER';
            } else if (userIdInfo.data_type === 'USER-DEFINED' && userIdInfo.udt_name) {
                userIdTypeSql = `"${userIdInfo.udt_name}"`;
            } else if (userIdInfo.data_type) {
                userIdTypeSql = userIdInfo.data_type.toUpperCase();
            }
            userIdHasDefault = Boolean(userIdInfo.column_default) || userIdInfo.is_identity === 'YES';
        }

        if (!userIdHasDefault) {
            try {
                if (userIdTypeKey.includes('int')) {
                    await query(`CREATE SEQUENCE IF NOT EXISTS users_id_seq`);
                    await query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq')`);
                    await query(`
                        SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0))
                    `);
                    userIdHasDefault = true;
                } else if (userIdTypeKey === 'uuid') {
                    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
                    await query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
                    userIdHasDefault = true;
                } else if (userIdTypeKey === 'text' || userIdTypeKey === 'varchar' || userIdTypeKey === 'character varying') {
                    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
                    await query(`ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`);
                    userIdHasDefault = true;
                }
            } catch (err) {
                console.warn('Warning:', err.message);
            }
        }

        // Crear tablas faltantes con tipos coherentes
        await ensureTable('course_sessions', `
            CREATE TABLE IF NOT EXISTS course_sessions (
                id INTEGER PRIMARY KEY,
                date TEXT NOT NULL,
                day TEXT NOT NULL,
                title TEXT NOT NULL,
                theme INTEGER,
                workshop INTEGER,
                contents TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await ensureTable('submissions', `
            CREATE TABLE IF NOT EXISTS submissions (
                id SERIAL PRIMARY KEY,
                user_id ${userIdTypeSql} NOT NULL,
                session_id INTEGER,
                activity_id TEXT NOT NULL,
                activity_title TEXT NOT NULL,
                content TEXT NOT NULL,
                word_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'returned')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await ensureTable('feedback', `
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER NOT NULL UNIQUE,
                reviewer_id ${userIdTypeSql} NOT NULL,
                feedback_text TEXT NOT NULL,
                grade TEXT,
                annotations TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await ensureTable('student_progress', `
            CREATE TABLE IF NOT EXISTS student_progress (
                id SERIAL PRIMARY KEY,
                user_id ${userIdTypeSql} NOT NULL,
                session_id INTEGER NOT NULL,
                completed INTEGER DEFAULT 0,
                completed_at TIMESTAMP,
                notes TEXT,
                UNIQUE(user_id, session_id)
            )
        `);

        await ensureTable('notifications', `
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id ${userIdTypeSql} NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await ensureTable('messages', `
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                from_user_id ${userIdTypeSql} NOT NULL,
                to_user_id ${userIdTypeSql} NOT NULL,
                subject TEXT NOT NULL,
                content TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                parent_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const ensureByTable = {
            users: [
                `ALTER TABLE users ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'C2'`,
                `ALTER TABLE users ADD COLUMN IF NOT EXISTS motivation TEXT`,
                `ALTER TABLE users ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1`,
                `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
                `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`
            ],
            submissions: [
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id ${userIdTypeSql}`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS session_id INTEGER`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS activity_id TEXT`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS activity_title TEXT`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS content TEXT`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
                `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
            ],
            course_sessions: [
                `ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS theme INTEGER`,
                `ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS workshop INTEGER`,
                `ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS contents TEXT`
            ],
            feedback: [
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS submission_id INTEGER`,
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reviewer_id ${userIdTypeSql}`,
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feedback_text TEXT`,
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS grade TEXT`,
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS annotations TEXT`,
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
                `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
            ],
            student_progress: [
                `ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS user_id ${userIdTypeSql}`,
                `ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS session_id INTEGER`,
                `ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS completed INTEGER DEFAULT 0`,
                `ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`,
                `ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS notes TEXT`
            ],
            notifications: [
                `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id ${userIdTypeSql}`,
                `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT`,
                `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT`,
                `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT`,
                `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read INTEGER DEFAULT 0`,
                `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
            ],
            messages: [
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_user_id ${userIdTypeSql}`,
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_user_id ${userIdTypeSql}`,
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject TEXT`,
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT`,
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read INTEGER DEFAULT 0`,
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_id INTEGER`,
                `ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
            ]
        };

        for (const [table, statements] of Object.entries(ensureByTable)) {
            if (!existingTables.has(table)) continue;
            for (const statement of statements) {
                try {
                    await query(statement);
                } catch (err) {
                    console.warn('Warning:', err.message);
                }
            }
        }

        // Preparar generador de ID si la columna no tiene default
        let userIdGenerator = null;
        if (!userIdHasDefault) {
            if (userIdTypeKey.includes('int')) {
                userIdGenerator = async () => {
                    const nextResult = await query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users`);
                    return nextResult.rows?.[0]?.next_id || 1;
                };
            } else {
                userIdGenerator = async () => crypto.randomUUID();
            }
        }

        // Datos de las sesiones del curso
        const sessions = [
            { id: 1, date: '2026-02-03', day: 'Martes', title: 'Introducción al curso y diagnóstico', theme: 1, contents: '[1]' },
            { id: 2, date: '2026-02-05', day: 'Jueves', title: 'El proceso de escribir: planificación', theme: 1, contents: '[1]' },
            { id: 3, date: '2026-02-10', day: 'Martes', title: 'Escribir un perfil personal', theme: 1, contents: '[1,2]' },
            { id: 4, date: '2026-02-12', day: 'Jueves', title: 'Escribir un perfil profesional', theme: 1, contents: '[2]' },
            { id: 5, date: '2026-02-17', day: 'Martes', title: 'Cartas formales: estructura y fórmulas', theme: 2, contents: '[2,3]' },
            { id: 6, date: '2026-02-19', day: 'Jueves', title: 'Cartas de solicitud y reclamación', theme: 2, contents: '[3]' },
            { id: 7, date: '2026-02-24', day: 'Martes', title: 'Textos creativos: descripción de sensaciones', theme: 3, contents: '[4]' },
            { id: 8, date: '2026-02-26', day: 'Jueves', title: 'Valoraciones artísticas', theme: 3, contents: '[4,5]' },
            { id: 9, date: '2026-03-03', day: 'Martes', title: 'TALLER: Mini serie web (I)', theme: null, workshop: 1, contents: '[]' },
            { id: 10, date: '2026-03-05', day: 'Jueves', title: 'Textos de opinión: argumentación', theme: 4, contents: '[5,6]' },
            { id: 11, date: '2026-03-10', day: 'Martes', title: 'Conectores y marcadores discursivos', theme: 4, contents: '[6]' },
            { id: 12, date: '2026-03-12', day: 'Jueves', title: 'Coherencia y cohesión textual', theme: 4, contents: '[6]' },
            { id: 13, date: '2026-03-17', day: 'Martes', title: 'Textos expositivos: ser wikipedista', theme: 5, contents: '[7,8]' },
            { id: 14, date: '2026-03-19', day: 'Jueves', title: 'Precisión léxica: nominalización', theme: 5, contents: '[7]' },
            { id: 15, date: '2026-03-24', day: 'Martes', title: 'TALLER: Olvidos de Granada (I)', theme: null, workshop: 2, contents: '[]' },
            { id: 16, date: '2026-04-07', day: 'Martes', title: 'Bienvenida post-vacaciones: Puesta al día social y lingüística', theme: 6, contents: '[]' },
            { id: 17, date: '2026-04-09', day: 'Jueves', title: 'La entrevista: Estructura y tipos (Entrevistas de trabajo, a expertos)', theme: 6, contents: '[]' },
            { id: 18, date: '2026-04-14', day: 'Martes', title: 'Estrategias de interacción: Preguntas abiertas y seguir el hilo', theme: 7, contents: '[]' },
            { id: 19, date: '2026-04-16', day: 'Jueves', title: 'El estilo indirecto: Transmitir mensajes y opiniones de otros', theme: 9, contents: '[]' },
            { id: 20, date: '2026-04-21', day: 'Martes', title: 'Estrategias de influencia: Aconsejar, sugerir y advertir', theme: 11, contents: '[]' },
            { id: 21, date: '2026-04-23', day: 'Jueves', title: 'Lenguaje persuasivo: Insistir en una petición y gestionar conflictos', theme: 12, contents: '[]' },
            { id: 22, date: '2026-04-28', day: 'Martes', title: 'La Conferencia (I): Apertura, captar atención y presentar la idea central', theme: 8, contents: '[]' },
            { id: 23, date: '2026-04-30', day: 'Jueves', title: 'La Conferencia (II): Desarrollo, énfasis en detalles y cierre efectivo', theme: 8, contents: '[]' },
            { id: 24, date: '2026-05-05', day: 'Martes', title: 'TALLER: Safari fotográfico (I)', theme: null, workshop: 3, contents: '[]' },
            { id: 25, date: '2026-05-07', day: 'Jueves', title: 'TALLER: Granada 2031 (I)', theme: null, workshop: 4, contents: '[]' },
            { id: 26, date: '2026-05-12', day: 'Martes', title: 'Crítica cinematográfica', theme: 10, contents: '[3,4]' },
            { id: 27, date: '2026-05-14', day: 'Jueves', title: 'Última clase: Presentaciones finales de proyectos y despedida', theme: 13, contents: '[]' },
        ];

        // Insertar sesiones del curso
        console.log('Insertando sesiones del curso...');

        for (const s of sessions) {
            await query(`
                INSERT INTO course_sessions (id, date, day, title, theme, workshop, contents)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    date = EXCLUDED.date,
                    day = EXCLUDED.day,
                    title = EXCLUDED.title,
                    theme = EXCLUDED.theme,
                    workshop = EXCLUDED.workshop,
                    contents = EXCLUDED.contents
            `, [s.id, s.date, s.day, s.title, s.theme || null, s.workshop || null, s.contents]);
        }

        console.log(`${sessions.length} sesiones insertadas.`);

        // Resolver rol según tipo de columna (enum o texto)
        const roleColumn = await query(`
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'role'
        `);

        const resolveRoleValue = async (desired) => {
            if (!roleColumn.rows || roleColumn.rows.length === 0) return desired;
            const { data_type, udt_name } = roleColumn.rows[0];
            if (data_type !== 'USER-DEFINED' || !udt_name) return desired;
            const enumRows = await query(`
                SELECT e.enumlabel
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = $1
                ORDER BY e.enumsortorder
            `, [udt_name]);
            const labels = (enumRows.rows || []).map(r => r.enumlabel);
            if (labels.includes(desired)) return desired;
            const ciMatch = labels.find(l => l.toLowerCase() === desired.toLowerCase());
            return ciMatch || labels[0] || desired;
        };

        const userColumnsResult = await query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
        `);
        const userColumns = new Set((userColumnsResult.rows || []).map(r => r.column_name));
        const quoteIdentifier = (name) => (/^[a-z_][a-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`);
        const nowTimestamp = new Date().toISOString();
        const userTimestampColumns = [
            { name: 'created_at', value: nowTimestamp },
            { name: 'updated_at', value: nowTimestamp },
            { name: 'createdAt', value: nowTimestamp },
            { name: 'updatedAt', value: nowTimestamp }
        ];

        const addUserColumnIfExists = (cols, values, columnName, columnValue) => {
            if (!userColumns.has(columnName)) return;
            if (cols.includes(columnName)) return;
            cols.push(columnName);
            values.push(columnValue);
        };

        // Crear usuario administrador
        const adminEmail = process.env.ADMIN_EMAIL || 'benitezl@go.ugr.es';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminName = process.env.ADMIN_NAME || 'Javier Benítez Láinez';

        // Verificar si ya existe el admin
        const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);

        if (!existingAdmin.rows || existingAdmin.rows.length === 0) {
            console.log('Creando usuario administrador...');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const adminRole = await resolveRoleValue('admin');
            const adminCols = ['email', 'password', 'name'];
            const adminValues = [adminEmail, hashedPassword, adminName];
            if (userIdGenerator && userColumns.has('id')) {
                const adminId = await userIdGenerator();
                adminCols.unshift('id');
                adminValues.unshift(adminId);
            }
            if (userColumns.has('role')) {
                adminCols.push('role');
                adminValues.push(adminRole);
            }
            if (userColumns.has('level')) {
                adminCols.push('level');
                adminValues.push('C2');
            }
            userTimestampColumns.forEach(col => addUserColumnIfExists(adminCols, adminValues, col.name, col.value));
            const adminPlaceholders = adminValues.map((_, i) => `$${i + 1}`).join(', ');
            const adminColumnsSql = adminCols.map(quoteIdentifier).join(', ');
            await query(`INSERT INTO users (${adminColumnsSql}) VALUES (${adminPlaceholders})`, adminValues);
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

            const studentRole = await resolveRoleValue('student');
            const demoCols = ['email', 'password', 'name'];
            const demoValues = [demoEmail, hashedPassword, 'Estudiante Demo'];
            if (userIdGenerator && userColumns.has('id')) {
                const demoId = await userIdGenerator();
                demoCols.unshift('id');
                demoValues.unshift(demoId);
            }
            if (userColumns.has('role')) {
                demoCols.push('role');
                demoValues.push(studentRole);
            }
            if (userColumns.has('level')) {
                demoCols.push('level');
                demoValues.push('C2');
            }
            userTimestampColumns.forEach(col => addUserColumnIfExists(demoCols, demoValues, col.name, col.value));
            const demoPlaceholders = demoValues.map((_, i) => `$${i + 1}`).join(', ');
            const demoColumnsSql = demoCols.map(quoteIdentifier).join(', ');
            await query(`INSERT INTO users (${demoColumnsSql}) VALUES (${demoPlaceholders})`, demoValues);
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
