# Migración de Calificaciones a Numéricas

## 📋 Resumen

Este documento explica cómo convertir las calificaciones textuales existentes a numéricas para que funcionen los boletines de notas.

## 🎯 Objetivo

Las entregas existentes tienen calificaciones textuales (Excelente, Muy bien, etc.) pero no tienen notas numéricas. Los boletines necesitan notas numéricas para calcular promedios y generar reportes.

## 🔄 Tabla de Conversión

| Calificación Textual | Nota Numérica |
|---------------------|---------------|
| Excelente           | 10            |
| Muy bien            | 8.5           |
| Bien                | 7             |
| Suficiente          | 5             |
| Necesita mejorar    | 3             |

## 📝 Pasos para Ejecutar la Migración

### Paso 1: Ejecutar la migración de calificaciones

```bash
curl -X POST https://produccion-escrita-c2-api-production.up.railway.app/api/migrate/grades \
  -H "Content-Type: application/json"
```

### Paso 2: Verificar el resultado

Deberías recibir una respuesta como esta:

```json
{
  "success": true,
  "message": "Calificaciones convertidas exitosamente",
  "converted": 25,
  "stats": {
    "total": 30,
    "withNumericGrade": 25,
    "withTextualGrade": 25,
    "averageGrade": "7.85"
  }
}
```

**Explicación de los campos:**
- `converted`: Cantidad de calificaciones convertidas
- `total`: Total de feedbacks en la base de datos
- `withNumericGrade`: Cantidad de feedbacks con nota numérica
- `withTextualGrade`: Cantidad de feedbacks con calificación textual
- `averageGrade`: Promedio de todas las calificaciones numéricas

### Paso 3: Verificar los boletines

1. Ve a `admin/boletines.html`
2. Ahora deberías ver:
   - Número de entregas calificadas (no 0)
   - Notas medias por estudiante
   - Botones "Ver boletín" y "Imprimir" funcionando

## 🛠️ Qué hace la migración

1. **Crea la columna `numeric_grade`** en la tabla `feedback` si no existe
2. **Convierte calificaciones textuales a numéricas** usando la tabla de conversión
3. **Solo afecta feedbacks** que tienen calificación textual pero no numérica
4. **No sobrescribe** calificaciones numéricas existentes

## 🔧 Solución de Problemas

### Problema: "Error al ejecutar migración"

**Solución:** Verifica que la API esté funcionando:
```bash
curl https://produccion-escrita-c2-api-production.up.railway.app/api/migrate/status
```

### Problema: "0 calificaciones convertidas"

**Posibles causas:**
1. No hay feedbacks con calificaciones textuales
2. Todas las calificaciones ya tienen nota numérica
3. Las calificaciones textuales no coinciden con los valores esperados

**Solución:** Verifica los datos existentes:
```bash
# Consultar calificaciones actuales (requiere acceso a base de datos)
SELECT grade, COUNT(*) FROM feedback GROUP BY grade;
```

### Problema: Los boletines siguen mostrando 0 calificadas

**Solución:** 
1. Verifica que la migración se ejecutó correctamente
2. Refresca la página de boletines
3. Abre la consola del navegador (F12) para ver errores
4. Verifica que el endpoint `/api/submissions` está devolviendo `numeric_grade`

## 📊 Calificación Manual Futura

Después de la migración, puedes asignar notas numéricas al corregir entregas:

1. Ve a `admin/correcciones.html`
2. Selecciona una entrega pendiente
3. En el formulario de feedback, ahora verás dos campos:
   - **Calificación textual** (opcional): Excelente, Muy bien, etc.
   - **Nota numérica** (recomendado): 0-10
4. Guarda el feedback

## 🔒 Seguridad

- La migración **solo convierte** calificaciones, no las elimina
- Las calificaciones textuales originales **se conservan**
- Puedes ejecutar la migración **múltiples veces** sin problemas
- Solo afecta feedbacks donde `numeric_grade` es NULL

## 📞 Soporte

Si tienes problemas:
1. Verifica los logs de Railway en el dashboard
2. Revisa la consola del navegador (F12)
3. Consulta la documentación en `docs/SISTEMA_CALIFICACIONES.md`

---

**Autor:** Javier Benítez Láinez  
**Fecha:** 7 de febrero de 2026  
**Versión:** 1.0