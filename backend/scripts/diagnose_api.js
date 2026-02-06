/**
 * Script de diagnóstico que usa la API en lugar de conectar directamente a la BD
 */

const API_URL = 'https://produccion-escrita-c2-api-production.up.railway.app';

async function diagnose() {
    console.log('=== DIAGNÓSTICO DEL SISTEMA ===\n');

    // 1. Verificar salud de la API
    console.log('1. Verificando API...');
    try {
        const healthResponse = await fetch(`${API_URL}/api/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('   ✓ API funcionando correctamente');
            console.log(`   Environment: ${health.environment}`);
        } else {
            console.log('   ❌ API no responde correctamente');
            return;
        }
    } catch (error) {
        console.log('   ❌ Error al conectar con la API:', error.message);
        return;
    }

    // 2. Intentar hacer login como admin
    console.log('\n2. Verificando credenciales de admin...');
    try {
        const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'benitezl@go.ugr.es',
                password: 'admin123'
            })
        });

        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('   ✓ Login exitoso');
            console.log(`   Token obtenido: ${loginData.token ? 'Si' : 'No'}`);
            console.log(`   Usuario: ${loginData.user?.name} (${loginData.user?.role})`);

            const token = loginData.token;

            // 3. Obtener lista de usuarios
            console.log('\n3. Obteniendo lista de usuarios...');
            const usersResponse = await fetch(`${API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (usersResponse.ok) {
                const users = await usersResponse.json();
                console.log(`   ✓ Total de usuarios: ${users.length}`);

                if (users.length === 0) {
                    console.log('\n   ⚠️  ⚠️  ⚠️  PROBLEMA CRÍTICO ⚠️  ⚠️  ⚠️');
                    console.log('   NO HAY USUARIOS EN LA BASE DE DATOS');
                    console.log('');
                    console.log('   Esto explica por qué:');
                    console.log('   - Los estudiantes se "registran" pero no aparecen en tu panel');
                    console.log('   - Cuando cambias de navegador/ordenador no los ves');
                    console.log('   - Las tareas que envían no se registran');
                    console.log('');
                    console.log('   CAUSA RAÍZ:');
                    console.log('   El frontend tiene un fallback a localStorage. Cuando la API falla');
                    console.log('   o tarda más de 3 segundos, silenciosamente usa localStorage en lugar');
                    console.log('   de la base de datos. Los datos se guardan en el navegador del');
                    console.log('   estudiante, pero tú no los puedes ver desde tu navegador.');
                } else {
                    console.log('\n   === USUARIOS REGISTRADOS ===');
                    users.forEach((u, i) => {
                        console.log(`\n   ${i + 1}. ${u.name} (${u.email})`);
                        console.log(`      Rol: ${u.role} | Nivel: ${u.level || 'N/A'}`);
                        console.log(`      Entregas: ${u.submissions_count || 0} | Revisadas: ${u.reviewed_count || 0}`);
                    });
                }

                // 4. Verificar si hay estudiantes recientes
                const students = users.filter(u => u.role === 'student');
                console.log(`\n   Total de estudiantes: ${students.length}`);
                console.log(`   Total de admins: ${users.filter(u => u.role === 'admin').length}`);

            } else {
                const error = await usersResponse.json();
                console.log('   ❌ Error al obtener usuarios:', error.error);
            }

        } else {
            const error = await loginResponse.json();
            console.log('   ❌ Login fallido:', error.error);
            console.log('   Esto indica que el usuario admin no existe en la base de datos');
        }
    } catch (error) {
        console.log('   ❌ Error en login:', error.message);
    }

    // 5. Probar registro de un usuario nuevo
    console.log('\n4. Probando registro de nuevo usuario...');
    try {
        const testEmail = `test_${Date.now()}@example.com`;
        const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: 'test123456',
                name: 'Usuario Test',
                level: 'C2',
                registration_code: 'PIO7-2026-CLM'
            })
        });

        if (registerResponse.ok) {
            const data = await registerResponse.json();
            console.log('   ✓ Registro exitoso');
            console.log(`   Usuario creado: ${data.user?.name} (ID: ${data.user?.id})`);
            console.log('');
            console.log('   ⚠️  Esto confirma que la API SÍ funciona y SÍ guarda usuarios');
            console.log('   en la base de datos. El problema está en el FRONTEND.');
        } else {
            const error = await registerResponse.json();
            console.log('   ❌ Registro fallido:', error.error);
        }
    } catch (error) {
        console.log('   ❌ Error en registro:', error.message);
    }

    console.log('\n=== FIN DEL DIAGNÓSTICO ===\n');
}

diagnose().catch(console.error);
