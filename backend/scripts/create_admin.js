/**
 * Script para crear el usuario admin en la base de datos de producción
 * Uso: node scripts/create_admin.js
 */

const bcrypt = require('bcryptjs');
const { query } = require('../src/database/db');

async function createAdmin() {
    try {
        console.log('=== CREAR USUARIO ADMIN ===\n');

        const adminEmail = 'benitezl@go.ugr.es';
        const adminPassword = 'admin123';
        const adminName = 'Javier Benítez Láinez';

        // Verificar si ya existe
        console.log('Verificando si el admin ya existe...');
        const existing = await query('SELECT id, email, name, role FROM users WHERE email = $1', [adminEmail]);

        if (existing.rows.length > 0) {
            console.log('⚠️  El usuario admin YA EXISTE:');
            console.log(`   ID: ${existing.rows[0].id}`);
            console.log(`   Email: ${existing.rows[0].email}`);
            console.log(`   Nombre: ${existing.rows[0].name}`);
            console.log(`   Rol: ${existing.rows[0].role}`);
            console.log('\nNo se necesita crear el admin.');
            return;
        }

        // Crear admin
        console.log('\nCreando usuario admin...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const result = await query(`
            INSERT INTO users (email, password, name, role, level, active)
            VALUES ($1, $2, $3, 'admin', 'C2', true)
            RETURNING id, email, name, role
        `, [adminEmail, hashedPassword, adminName]);

        console.log('✓ Admin creado exitosamente:');
        console.log(`   ID: ${result.rows[0].id}`);
        console.log(`   Email: ${result.rows[0].email}`);
        console.log(`   Nombre: ${result.rows[0].name}`);
        console.log(`   Rol: ${result.rows[0].role}`);

        console.log('\n=== CREDENCIALES DE ACCESO ===');
        console.log(`   URL: https://www.cognoscencia.com/PE/auth/login.html`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);

        console.log('\n✓ Proceso completado exitosamente');
        console.log('  Ahora puedes acceder al panel de administración.');

    } catch (error) {
        console.error('\n❌ Error al crear admin:', error.message);
        throw error;
    }
}

createAdmin()
    .then(() => {
        console.log('\nProceso finalizado.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nError fatal:', error);
        process.exit(1);
    });
