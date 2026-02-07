# Cómo Ejecutar la Migración de Rúbricas

## Opción 1: Ejecutar desde tu computadora (MÁS FÁCIL) ✅

Esta es la opción más sencilla. Ejecutas el script desde tu computadora local conectándote a la base de datos de Railway.

### Paso 1: Obtener la URL de conexión de Railway

1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto "Producción Escrita C2"
4. Haz clic en el servicio de base de datos (PostgreSQL)
5. Ve a la pestaña **"Connect"** (icono de conexión)
6. Copia la **"Connection URL"** que se ve así:
   ```
   postgresql://postgres:tu_contraseña@containers.railway.app:puerto/railway
   ```

### Paso 2: Configurar la URL en tu computadora

**En macOS/Linux:**
```bash
export DATABASE_URL="postgresql://postgres:tu_contraseña@containers.railway.app:puerto/railway"
```

**En Windows (PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://postgres:tu_contraseña@containers.railway.app:puerto/railway"
```

**O crear archivo `.env`:**
Crea un archivo llamado `.env` en la raíz del proyecto con:
```
DATABASE_URL=postgresql://postgres:tu_contraseña@containers.railway.app:puerto/railway
```

### Paso 3: Ejecutar el script de migración

```bash
cd backend
node migrate-database.js
```

Verás una salida como esta:
```
╔════════════════════════════════════════════════════════════╗
║     Migración de Rúbricas - Producción Escrita C2          ║
╚════════════════════════════════════════════════════════════╝

🔄 Conectando a la base de datos...
📝 Ejecutando migración...

✅ Comando 1/5 ejecutado
✅ Comando 2/5 ejecutado
✅ Comando 3/5 ejecutado
✅ Comando 4/5 ejecutado
✅ Comando 5/5 ejecutado

✅ Migración completada exitosamente

📊 Verificando campos...
✅ Campos creados correctamente:
   - criterion_scores (jsonb)
   - rubric_id (character varying)

🎉 La base de datos está ahora lista para usar rúbricas
```

## Opción 2: Ejecutar desde Railway CLI

Si tienes instalado Railway CLI en tu computadora:

### Paso 1: Instalar Railway CLI (si no lo tienes)

```bash
npm install -g @railway/cli
```

### Paso 2: Autenticarse

```bash
railway login
```

Esto abrirá tu navegador para autorizar Railway CLI.

### Paso 3: Ejecutar un comando SQL directamente

```bash
railway run "cat src/database/add-rubric-to-submissions.sql" --db
```

O ejecutar el script de migración:

```bash
railway run "node migrate-database.js" --service=produccion-escrita-c2-api
```

## Opción 3: Usar psql directamente (Línea de comandos)

Si tienes `psql` instalado:

```bash
psql "postgresql://postgres:tu_contraseña@containers.railway.app:puerto/railway" -f backend/src/database/add-rubric-to-submissions.sql
```

## Opción 4: Usar la consola de Railway (NO RECOMENDADO)

Railway no tiene una consola SQL nativa en su interfaz web. Para ejecutar SQL desde la web, tendrías que:

1. Ir a Railway Dashboard
2. Seleccionar el servicio de base de datos
3. Ir a la pestaña "Connect"
4. Usar un cliente SQL de terceros (como DBeaver, TablePlus, etc.)

**Esto es más complicado que las opciones anteriores.**

## Verificar que la migración funcionó

Después de ejecutar la migración, verifica que funciona:

### Opción A: Usar el script de verificación

Crea un archivo `verify-migration.js`:

```javascript
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'submissions' 
        AND column_name IN ('rubric_id', 'criterion_scores')
        ORDER BY column_name
    `);
    
    console.log('📊 Campos en la tabla submissions:');
    result.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    if (result.rows.length === 2) {
        console.log('\n🎉 Migración verificada exitosamente');
    } else {
        console.log('\n❌ Faltan campos en la migración');
    }
    
    await pool.end();
}

verify();
```

Ejecutar:
```bash
node verify-migration.js
```

### Opción B: Probar la aplicación

1. Ve a `https://produccion-escrita-c2-api-production.up.railway.app`
2. Inicia sesión como admin
3. Crea una rúbrica en `admin/rubricas.html`
4. Corrige una entrega usando esa rúbrica en `admin/correcciones.html`
5. Si todo funciona correctamente, la rúbrica se guardó en la base de datos

## Solución de Problemas

### Error: "No se encontró DATABASE_URL"

Asegúrate de haber configurado la variable de entorno:

```bash
echo $DATABASE_URL
```

Si no muestra nada, configurala nuevamente.

### Error: "connection refused"

Verifica que la URL de conexión sea correcta. Revisa en Railway Dashboard > PostgreSQL > Connect.

### Error: "certificate has expired"

El script ya está configurado para manejar esto (`rejectUnauthorized: false`), pero si sigue dando problemas, verifica que Railway esté funcionando correctamente.

### Error: "relation does not exist"

Esto significa que la tabla `submissions` no existe. Asegúrate de que la base de datos esté inicializada correctamente.

## ¿Cuál opción debo usar?

**Para la mayoría de usuarios:** Usa la **Opción 1** (ejecutar desde tu computadora)

**Para usuarios avanzados:** Usa la **Opción 2** (Railway CLI)

**Para usuarios con psql instalado:** Usa la **Opción 3**

**Evita la Opción 4** (consola web) porque no hay soporte nativo.

## Resumen rápido

```bash
# 1. Obtener URL desde Railway Dashboard
# 2. Configurar variable de entorno
export DATABASE_URL="postgresql://postgres:tu_contraseña@containers.railway.app:puerto/railway"

# 3. Ejecutar migración
cd backend
node migrate-database.js

# 4. Verificar
node ../verify-migration.js  # (si creaste el archivo de verificación)
```

## Soporte

Si encuentras algún problema:

1. Revisa que la URL de conexión sea correcta
2. Verifica que Railway esté funcionando (ve al dashboard)
3. Asegúrate de tener npm y Node.js instalados
4. Verifica que tienes permisos de conexión a Railway

Documentación relacionada:
- `docs/MIGRACION_RUBRICAS_DB.md` - Detalles técnicos de la migración
- `backend/src/database/add-rubric-to-submissions.sql` - Archivo SQL de migración
- `backend/migrate-database.js` - Script de migración