# Migración de Rúbricas a la Base de Datos

## Descripción

Esta documentación explica cómo ejecutar la migración para añadir soporte de rúbricas a la base de datos PostgreSQL. Esta migración añade dos campos nuevos a la tabla `submissions` para almacenar la rúbrica utilizada y las puntuaciones por criterio.

## Campos Nuevos

### Tabla `submissions`

1. **`rubric_id` (VARCHAR(255))**
   - Referencia a la rúbrica utilizada para evaluar esta entrega
   - Foreign key a la tabla `rubrics(id)`
   - Permite NULL (entregas evaluadas sin rúbrica)
   - ON DELETE SET NULL (si se elimina la rúbrica, se mantiene la entrega pero sin rúbrica)

2. **`criterion_scores` (JSONB)**
   - Almacena las puntuaciones por criterio de evaluación
   - Formato JSON: `{"Gramática y ortografía": 8.5, "Vocabulario": 7.0, "Estructura": 9.0}`
   - Permite NULL (entregas evaluadas sin rúbrica)
   - Valor por defecto: `{}`::jsonb (objeto vacío)

## Archivo de Migración

**Ubicación:** `backend/src/database/add-rubric-to-submissions.sql`

```sql
-- Migración para añadir campos de rúbrica a submissions y feedback
-- Creado: 2026-02-07
-- Autor: Javier Benítez Láinez

-- Añadir campos a la tabla submissions
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS rubric_id VARCHAR(255) REFERENCES rubrics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS criterion_scores JSONB DEFAULT '{}'::jsonb;

-- Añadir índices para mejorar rendimiento en búsquedas por rúbrica
CREATE INDEX IF NOT EXISTS idx_submissions_rubric ON submissions(rubric_id);

-- Comentarios
COMMENT ON COLUMN submissions.rubric_id IS 'ID de la rúbrica utilizada para evaluar esta entrega';
COMMENT ON COLUMN submissions.criterion_scores IS 'Puntuaciones por criterio en formato JSON: {"criterio1": 8.5, "criterio2": 7.0}';
```

## Pasos para Ejecutar la Migración

### Opción 1: Usando psql (Línea de Comandos)

1. **Conectarse a la base de datos:**
   ```bash
   psql -h localhost -U tu_usuario -d produccion_escrita_c2
   ```

2. **Ejecutar el archivo de migración:**
   ```bash
   \i backend/src/database/add-rubric-to-submissions.sql
   ```

3. **Verificar que los campos se crearon:**
   ```sql
   \d submissions
   ```

### Opción 2: Usando Railway (Producción)

1. **Obtener credenciales de la base de datos:**
   - Ve al dashboard de Railway
   - Selecciona el proyecto de la API
   - Copia la URL de conexión de PostgreSQL

2. **Conectarse usando psql:**
   ```bash
   psql "postgresql://usuario:contraseña@host:puerto/base_de_datos"
   ```

3. **Ejecutar el archivo de migración:**
   ```bash
   cat backend/src/database/add-rubric-to-submissions.sql | psql "postgresql://usuario:contraseña@host:puerto/base_de_datos"
   ```

### Opción 3: Usando Node.js (Script de Migración)

Si prefieres ejecutar la migración desde un script Node.js:

```javascript
// backend/migrations/run-migration.js
const { query } = require('./src/database/db');
const fs = require('fs');

async function runMigration() {
    try {
        console.log('Ejecutando migración de rúbricas...');
        
        const sql = fs.readFileSync('./src/database/add-rubric-to-submissions.sql', 'utf8');
        await query(sql);
        
        console.log('✅ Migración completada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

runMigration();
```

Ejecutar:
```bash
cd backend
node migrations/run-migration.js
```

## Verificación Post-Migración

### Verificar que los campos existen:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'submissions' 
AND column_name IN ('rubric_id', 'criterion_scores');
```

### Verificar los índices creados:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'submissions' 
AND indexname = 'idx_submissions_rubric';
```

### Verificar las relaciones (Foreign Keys):

```sql
SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'submissions'
AND tc.constraint_type = 'FOREIGN KEY';
```

## Rollback (Desactivar la Migración)

Si necesitas revertir la migración:

```sql
-- Eliminar índice
DROP INDEX IF EXISTS idx_submissions_rubric;

-- Eliminar campos
ALTER TABLE submissions 
DROP COLUMN IF EXISTS rubric_id,
DROP COLUMN IF EXISTS criterion_scores;
```

## Impacto en el Código

### Backend (Node.js)

**Archivo:** `backend/src/routes/submissions.js`

- El endpoint `POST /api/submissions/:id/feedback` ahora acepta:
  - `rubric_id`: ID de la rúbrica utilizada
  - `criterion_scores`: JSON con puntuaciones por criterio

Ejemplo de payload:
```json
{
  "feedback_text": "Buen trabajo en general...",
  "grade": "Muy bien",
  "numeric_grade": 8.5,
  "rubric_id": "abc123",
  "criterion_scores": {
    "Gramática y ortografía": 8.5,
    "Vocabulario": 7.0,
    "Estructura": 9.0
  }
}
```

### Frontend (HTML/JavaScript)

**Archivo:** `admin/correcciones.html`

- La función `saveGrading()` ahora envía `rubric_id` y `criterion_scores` a la API
- Los datos se guardan tanto en localStorage como en la API
- Se usa el endpoint correcto: `POST /api/submissions/:id/feedback`

## Consideraciones Importantes

1. **Compatibilidad hacia atrás:**
   - Los campos son opcionales (pueden ser NULL)
   - Las entregas existentes no se ven afectadas
   - Las calificaciones sin rúbrica siguen funcionando

2. **Rendimiento:**
   - Se creó un índice en `rubric_id` para optimizar consultas
   - El tipo JSONB es eficiente para consultas y almacenamiento

3. **Integridad de datos:**
   - Si se elimina una rúbrica, las entregas no se borran
   - El campo `rubric_id` se establece en NULL (ON DELETE SET NULL)
   - Se mantiene el historial de calificaciones

4. **Migración de datos existentes:**
   - No es necesario migrar datos de entregas anteriores
   - Las nuevas calificaciones utilizarán rúbricas
   - Las calificaciones existentes siguen siendo válidas

## Testing

Después de la migración, prueba el siguiente flujo:

1. **Crear una rúbrica** en `admin/rubricas.html`
2. **Corregir una entrega** en `admin/correcciones.html` usando esa rúbrica
3. **Verificar que se guardó en la base de datos:**
   ```sql
   SELECT s.*, r.name as rubric_name, s.criterion_scores
   FROM submissions s
   LEFT JOIN rubrics r ON s.rubric_id = r.id
   WHERE s.rubric_id IS NOT NULL
   LIMIT 1;
   ```
4. **Verificar en el boletín** que aparece la información de la rúbrica

## Soporte

Si encuentras algún problema durante la migración:

1. Verifica que tienes los permisos necesarios en la base de datos
2. Asegúrate de que la tabla `rubrics` existe antes de ejecutar la migración
3. Revisa los logs de la aplicación para posibles errores
4. Verifica la conectividad con la base de datos

## Fecha y Versión

- **Fecha de creación:** 2026-02-07
- **Autor:** Javier Benítez Láinez
- **Versión:** 1.0
- **Compatibilidad:** PostgreSQL 12+