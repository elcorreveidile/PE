# Sistema de Calificaciones - Producción Escrita C2

## 📋 Resumen

El sistema de calificaciones del curso de Producción Escrita C2 incluye herramientas completas para gestionar, evaluar y reportar el progreso de los estudiantes.

## 🎯 Características Principales

### 1. 📊 Rúbricas de Evaluación
- **Gestión personalizada**: Crea y edita rúbricas específicas para cada tipo de actividad
- **Criterios flexibles**: Define hasta 8 criterios de evaluación por rúbrica
- **Escalas numéricas**: Asigna pesos de 0-10 puntos a cada criterio
- **Plantillas predefinidas**: Incluye rúbricas para textos expositivos, argumentativos, cartas, etc.
- **Integración automática**: Las rúbricas se aplican automáticamente al corregir entregas

### 2. 📝 Calificación Numérica de Entregas
- **Notas de 0-10**: Sistema numérico español estándar
- **Categorías automáticas**:
  - **Sobresaliente (9-10)**: Excelente dominio del lenguaje
  - **Notable (7-8.9)**: Muy buen desempeño
  - **Bien (6-6.9)**: Competencia adecuada
  - **Suficiente (5-5.9)**: Cumple requisitos mínimos
  - **Insuficiente (<5)**: No alcanza objetivos
- **Cálculo automático**: La nota se calcula según la rúbrica aplicada
- **Edición manual**: Posibilidad de ajustar notas manualmente

### 3. 📈 Cálculo de Promedios
- **Por estudiante**: Calcula la media de todas las entregas calificadas
- **Por actividad**: Promedio de notas por tipo de actividad
- **Por período**: Filtra por fechas o sesiones
- **Ponderación**: Se puede asignar diferentes pesos a diferentes tipos de entregas

### 4. 📋 Boletines de Notas
- **Reportes individuales**: Boletines personalizados para cada estudiante
- **Evaluación automática**: Genera comentarios según el desempeño
- **Detalle completo**: Incluye todas las entregas con notas y retroalimentación
- **Múltiples formatos**:
  - Visualización en pantalla
  - Impresión directa
  - Exportación a HTML
  - Exportación a PDF
- **Generación masiva**: Crea todos los boletines con un clic

### 5. 📊 Estadísticas de Calificaciones
- **Distribución de notas**: Gráfica de frecuencias por rangos
- **Rankings**: Estudiantes con mejores promedios
- **Tendencias**: Evolución de notas a lo largo del tiempo
- **Comparativas**: Análisis entre grupos o períodos

## 🚀 Guía de Uso Rápido

### Crear una Rúbrica

1. Navega a **Rúbricas** en el panel de administración
2. Haz clic en **"📝 Crear nueva rúbrica"**
3. Completa el formulario:
   - Nombre de la rúbrica
   - Descripción de la actividad
   - Tipo de actividad (expositivo, argumentativo, carta, etc.)
4. Añade criterios de evaluación:
   - Nombre del criterio
   - Peso (puntos, max 10)
   - Descripción de cada nivel (0-5, 5-7, 7-9, 9-10)
5. Guarda la rúbrica

### Calificar una Entrega con Rúbrica

1. Ve a **Correcciones** en el panel de administración
2. Selecciona una entrega pendiente
3. Elige la rúbrica apropiada en el selector
4. Evalúa cada criterio:
   - Selecciona el nivel de desempeño
   - Añade comentarios específicos
5. El sistema calcula automáticamente la nota total
6. Revisa y ajusta si es necesario
7. Envía la corrección

### Generar un Boletín

1. Accede a **Boletines** en el panel de administración
2. Busca o filtra el estudiante deseado
3. Haz clic en **"📋 Ver boletín"**
4. El sistema genera:
   - Resumen académico
   - Detalle de todas las entregas
   - Nota media
   - Evaluación general automática
5. Opciones:
   - Imprimir directamente
   - Exportar a HTML
   - Exportar a PDF

### Ver Estadísticas de Notas

1. Entra en **Estadísticas**
2. Visualiza:
   - Distribución de notas por rangos
   - Ranking de estudiantes
   - Promedios generales
3. Exporta datos si es necesario:
   - CSV para análisis en Excel
   - JSON para procesamiento automático

## 📊 Sistema de Categorización

### Rangos de Notas

| Rango | Categoría | Descripción | Color en UI |
|--------|-------------|--------------|---------------|
| 9.0 - 10.0 | Sobresaliente | Excelente dominio, vocabulario sofisticado, estructuras complejas | Verde |
| 7.0 - 8.9 | Notable | Muy buen desempeño, buenas competencias generales | Azul |
| 6.0 - 6.9 | Bien | Competencia adecuada, cumple con objetivos | Cian |
| 5.0 - 5.9 | Suficiente | Cumple requisitos mínimos, necesita mejorar | Amarillo |
| 0.0 - 4.9 | Insuficiente | No alcanza objetivos, requiere apoyo adicional | Rojo |

### Cálculo de Nota Media

```
Nota Media = (Σ Notas Calificadas) / (Número de Entregas Calificadas)
```

Solo se incluyen en el promedio las entregas que tengan una nota numérica asignada.

## 🔧 Configuración Técnica

### Estructura de Datos

```javascript
// Rúbrica
{
  id: "string",
  name: "string",
  description: "string",
  activityType: "expositivo|argumentativo|carta|descripcion|entrevista|otro",
  criteria: [
    {
      id: "string",
      name: "string",
      weight: number,  // 1-10
      descriptions: {
        "0-5": "string",
        "5-7": "string",
        "7-9": "string",
        "9-10": "string"
      }
    }
  ],
  createdAt: "ISO8601",
  createdBy: "user_id"
}

// Entrega calificada
{
  id: "string",
  userId: "string",
  sessionId: number,
  activityTitle: "string",
  content: "string",
  wordCount: number,
  rubricId: "string",
  rubricScores: {
    "criterionId": {
      score: number,  // 0-10
      level: "0-5|5-7|7-9|9-10",
      comment: "string"
    }
  },
  numericGrade: number,  // 0-10
  gradeCategory: "Sobresaliente|Notable|Bien|Suficiente|Insuficiente",
  feedback: "string",
  status: "pending|reviewed",
  createdAt: "ISO8601",
  reviewedAt: "ISO8601"
}

// Boletín
{
  studentId: "string",
  studentName: "string",
  studentEmail: "string",
  studentLevel: "string",
  submissions: [...],  // Todas las entregas
  avgGrade: number,  // Nota media
  gradeCategory: "string",
  totalWords: number,
  progressPercent: number,
  evaluationComment: "string"  // Generado automáticamente
}
```

### API Endpoints

#### Rúbricas
- `GET /api/rubrics` - Listar todas las rúbricas
- `POST /api/rubrics` - Crear nueva rúbrica
- `PUT /api/rubrics/:id` - Actualizar rúbrica
- `DELETE /api/rubrics/:id` - Eliminar rúbrica
- `POST /api/rubrics/:id/apply` - Aplicar rúbrica a entrega

#### Calificaciones
- `PUT /api/submissions/:id/grade` - Calificar entrega
- `GET /api/submissions/avg/:studentId` - Obtener promedio de estudiante
- `GET /api/grades/distribution` - Distribución de notas
- `GET /api/grades/ranking` - Ranking de estudiantes

#### Boletines
- `GET /api/bulletins/:studentId` - Generar boletín
- `GET /api/bulletins/bulk` - Generar todos los boletines
- `POST /api/bulletins/export` - Exportar boletín en formato específico

#### Estadísticas
- `GET /api/stats/grades` - Estadísticas generales de notas
- `GET /api/stats/grades/by-session` - Notas por sesión
- `GET /api/stats/grades/by-activity` - Notas por tipo de actividad
- `GET /api/stats/grades/trends` - Tendencias temporales

## 🎓 Mejores Prácticas

### Para los Profesores

1. **Usa rúbricas consistentes**: Define criterios claros y usalos regularmente
2. **Proporciona feedback específico**: Comenta qué hacer para mejorar
3. **Califica rápidamente**: No dejes muchas entregas pendientes
4. **Revisa promedios periódicamente**: Detecta estudiantes que necesitan ayuda
5. **Usa los boletines**: Comparte progreso formal con estudiantes

### Para los Estudiantes

1. **Revisa tu boletín regularmente**: Consulta tus notas y comentarios
2. **Lee el feedback detallado**: Aprende de las correcciones
3. **Identifica áreas de mejora**: Enfócate en tus puntos débiles
4. **Compara con tus objetivos**: Verifica si estás cumpliendo tu meta
5. **Pregunta si hay dudas**: Consulta al profesor sobre las evaluaciones

## 🔍 Solución de Problemas

### Problema: Las notas no se calculan correctamente
**Solución**: Verifica que todos los criterios de la rúbrica tengan un peso asignado

### Problema: No aparecen boletines
**Solución**: Asegúrate de que el estudiante tenga al menos una entrega calificada

### Problema: La categoría de nota es incorrecta
**Solución**: El sistema usa rangos estándar españoles (9-10 = Sobresaliente, etc.)

### Problema: No se puede exportar boletín
**Solución**: Verifica los permisos del navegador para descargas de archivos

## 📚 Recursos Adicionales

- [Guía de Evaluación C2 CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages)
- [Ejemplos de Rúbricas EFL](https://www.cambridgeenglish.org/teaching-english/resources-for-teachers/)
- [Mejores Prácticas en Evaluación](https://www.oecd.org/education/assessment/)

## 📞 Soporte

Para preguntas o problemas con el sistema de calificaciones:
- Contacta al administrador del sistema
- Revisa la documentación técnica del API
- Consulta los logs del navegador para errores específicos

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026  
**Autor**: Javier Benítez Láinez - Sistema de Producción Escrita C2 - CLM UGR
