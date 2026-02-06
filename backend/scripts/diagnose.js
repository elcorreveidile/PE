const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function diagnose() {
    const client = await pool.connect();

    try {
        console.log('=== DIAGNÓSTICO DE BASE DE DATOS ===\n');

        // Verificar conexión
        console.log('✓ Conectado a PostgreSQL (Supabase)');

        // Contar usuarios
        const result = await client.query('SELECT COUNT(*) as total FROM users');
        console.log(`\nTotal de usuarios en la base de datos: ${result.rows[0].total}`);

        // Listar todos los usuarios
        const users = await client.query(`
            SELECT id, email, name, role, level, active, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        console.log('\n=== USUARIOS REGISTRADOS ===');
        if (users.rows.length === 0) {
            console.log('⚠️  NO HAY USUARIOS EN LA BASE DE DATOS');
            console.log('Este es el PROBLEMA PRINCIPAL: Los estudiantes se están registrando');
            console.log('pero los datos se guardan en localStorage en lugar de la base de datos.');
        } else {
            users.rows.forEach(u => {
                console.log(`\nID: ${u.id}`);
                console.log(`  Email: ${u.email}`);
                console.log(`  Nombre: ${u.name}`);
                console.log(`  Rol: ${u.role}`);
                console.log(`  Nivel: ${u.level || 'N/A'}`);
                console.log(`  Activo: ${u.active ? 'Si' : 'No'}`);
                console.log(`  Creado: ${u.created_at}`);
            });
        }

        // Verificar admin específicamente
        const adminCheck = await client.query("SELECT * FROM users WHERE email = 'benitezl@go.ugr.es'");
        console.log('\n=== VERIFICACIÓN DE ADMIN ===');
        if (adminCheck.rows.length === 0) {
            console.log('❌ El usuario admin (benitezl@go.ugr.es) NO EXISTE en la base de datos');
            console.log('   Necesitas ejecutar: npm run init-db');
        } else {
            console.log('✓ El usuario admin EXISTE');
            console.log(`  ID: ${adminCheck.rows[0].id}`);
            console.log(`  Nombre: ${adminCheck.rows[0].name}`);
            console.log(`  Rol: ${adminCheck.rows[0].role}`);
            console.log(`  Activo: ${adminCheck.rows[0].active ? 'Si' : 'No'}`);
        }

        // Verificar entregas
        const submissions = await client.query('SELECT COUNT(*) as total FROM submissions');
        console.log(`\n=== ENTREGAS ===`);
        console.log(`Total de entregas: ${submissions.rows[0].total}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
