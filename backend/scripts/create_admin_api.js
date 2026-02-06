/**
 * Script para crear el usuario admin usando la API en producción
 * Uso: node scripts/create_admin_api.js
 */

const API_URL = 'https://produccion-escrita-c2-api-production.up.railway.app';

async function createAdmin() {
    try {
        console.log('=== CREAR USUARIO ADMIN (vía API) ===\n');

        const adminEmail = 'benitezl@go.ugr.es';
        const adminPassword = 'admin123';
        const adminName = 'Javier Benítez Láinez';

        // Intentar registrar el admin
        console.log('Intentando registrar admin...');
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: adminEmail,
                password: adminPassword,
                name: adminName,
                level: 'C2',
                registration_code: 'PIO7-2026-CLM'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✓ Admin creado exitosamente:');
            console.log(`   ID: ${data.user?.id}`);
            console.log(`   Email: ${data.user?.email}`);
            console.log(`   Nombre: ${data.user?.name}`);
            console.log(`   Rol: ${data.user?.role}`);

            console.log('\n=== CREDENCIALES DE ACCESO ===');
            console.log(`   URL: https://www.cognoscencia.com/PE/auth/login.html`);
            console.log(`   Email: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);

            console.log('\n✓ Proceso completado exitosamente');
            console.log('  Ahora puedes acceder al panel de administración.');
        } else {
            const error = await response.json();

            if (error.error === 'Este email ya esta registrado') {
                console.log('⚠️  El usuario admin YA EXISTE en la base de datos.');
                console.log('   No se necesita crear el admin.');
                console.log('\nIntenta hacer login para verificar que funciona.');
            } else {
                console.log('❌ Error al crear admin:', error.error);
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
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
