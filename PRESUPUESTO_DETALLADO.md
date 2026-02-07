# 📊 PRESUPUESTO DETALLADO - PRODUCCIÓN ESCRITA C2

**Proyecto:** Plataforma de Gestión de Curso de Escritura Avanzada Nivel C2
**Cliente:** Centro de Lenguas Modernas - Universidad de Granada
**Fecha de emisión:** 7 de febrero de 2026
**Desarrollador:** Javier Benítez Láinez
**Período de ejecución:** Febrero 2026 - Julio 2026 (estimado)

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Trabajo Ya Realizado (Versión 1.0)](#trabajo-ya-realizado)
3. [Trabajo Pendiente (Roadmap)](#trabajo-pendiente)
4. [Tarifas Aplicadas](#tarifas-aplicadas)
5. [Total del Proyecto](#total-del-proyecto)
6. [Condiciones y Plazos](#condiciones-y-plazos)

---

## 🎯 RESUMEN EJECUTIVO

| Concepto | Importe |
|----------|---------|
| **Trabajo ya realizado (V1.0)** | **12.650 €** |
| **Trabajo pendiente (V1.1 - V3.0)** | **19.950 €** |
| **TOTAL PROYECTO COMPLETO** | **32.600 €** |

### Estado Actual
- ✅ **Versión 1.0 COMPLETADA** - Sistema en producción
- 🔄 **Versión 1.1 en preparación** - Mejoras UX y OAuth
- 📋 **Versión 1.2 - 3.0 planificadas** - Roadmap completo

---

## ✅ TRABAJO YA REALIZADO (VERSIÓN 1.0)

### DESGLOSE POR CATEGORÍAS

---

### 1. BACKEND DEVELOPMENT 🚀

**Tecnologías:** Node.js, Express, PostgreSQL, JWT, bcrypt.js

#### 1.1. Configuración y Arquitectura
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Configuración inicial del proyecto | 4h | 60€ | 240 € |
| Setup de entorno de desarrollo | 3h | 60€ | 180 € |
| Configuración PostgreSQL en Vercel | 3h | 60€ | 180 € |
| **Subtotal Backend Config** | **10h** | | **600 €** |

#### 1.2. Sistema de Autenticación
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Sistema de registro con validaciones | 6h | 60€ | 360 € |
| Sistema de login con JWT | 5h | 60€ | 300 € |
| Recuperación de contraseña | 4h | 60€ | 240 € |
| Middleware de autenticación | 3h | 60€ | 180 € |
| Hashing de passwords con bcrypt | 2h | 60€ | 120 € |
| **Subtotal Autenticación** | **20h** | | **1.200 €** |

#### 1.3. APIs y Endpoints
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| API de Usuarios (CRUD completo) | 8h | 60€ | 480 € |
| API de Estudiantes | 6h | 60€ | 360 € |
| API de Asistencia QR | 10h | 60€ | 600 € |
| API de Calificaciones/Rúbricas | 12h | 60€ | 720 € |
| API de Entregas | 8h | 60€ | 480 € |
| API de Notificaciones | 6h | 60€ | 360 € |
| API de Estadísticas | 8h | 60€ | 480 € |
| API de Exportación (PDF/CSV) | 6h | 60€ | 360 € |
| **Subtotal APIs** | **64h** | | **3.840 €** |

#### 1.4. Base de Datos
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Diseño del esquema de BD | 6h | 60€ | 360 € |
| Implementación de migraciones | 4h | 60€ | 240 € |
| Scripts de inicialización | 3h | 60€ | 180 € |
| Optimización de queries | 4h | 60€ | 240 € |
| **Subtotal Base de Datos** | **17h** | | **1.020 €** |

#### 1.5. Seguridad
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Implementación de Helmet.js | 2h | 60€ | 120 € |
| Rate limiting con express-rate-limit | 3h | 60€ | 180 € |
| Validación de inputs (express-validator) | 4h | 60€ | 240 € |
| CORS configuration | 2h | 60€ | 120 € |
| Sanitización de datos | 3h | 60€ | 180 € |
| **Subtotal Seguridad** | **14h** | | **840 €** |

#### 1.6. Testing Backend
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Tests unitarios de APIs | 8h | 60€ | 480 € |
| Tests de integración | 6h | 60€ | 360 € |
| Tests de carga | 4h | 60€ | 240 € |
| **Subtotal Testing** | **18h** | | **1.080 €** |

**💰 TOTAL BACKEND:** **189h = 11.340 €**

---

### 2. FRONTEND DEVELOPMENT 🎨

**Tecnologías:** HTML5, CSS3, JavaScript Vanilla, Responsive Design

#### 2.1. Sistema de Autenticación (Frontend)
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Página de Login (`login.html`) | 4h | 55€ | 220 € |
| Página de Registro (`registro.html`) | 4h | 55€ | 220 € |
| Recuperación de contraseña | 3h | 55€ | 165 € |
| Reset password | 3h | 55€ | 165 € |
| Validaciones en cliente | 4h | 55€ | 220 € |
| **Subtotal Auth Frontend** | **18h** | | **990 €** |

#### 2.2. Panel de Administración
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Dashboard principal (`admin/index.html`) | 8h | 55€ | 440 € |
| Gestión de Estudiantes (`estudiantes.html`) | 10h | 55€ | 550 € |
| Sistema de Calificaciones (`calificaciones.html`) | 8h | 55€ | 440 € |
| Gestión de Rúbricas (`rubricas.html`) | 8h | 55€ | 440 € |
| Sistema de Boletines (`boletines.html`) | 12h | 55€ | 660 € |
| Comparativas (`comparacion.html`) | 8h | 55€ | 440 € |
| Estadísticas (`estadisticas.html`) | 10h | 55€ | 550 € |
| Sistema de Asistencia (`asistencia.html`) | 10h | 55€ | 550 € |
| Notificaciones (`notificaciones.html`) | 8h | 55€ | 440 € |
| Tareas/Entregas (`tareas.html`) | 8h | 55€ | 440 € |
| Correcciones (`correcciones.html`) | 8h | 55€ | 440 € |
| **Subtotal Admin Panel** | **98h** | | **5.390 €** |

#### 2.3. Panel de Estudiante
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Dashboard del estudiante | 6h | 55€ | 330 € |
| Historial de entregas | 5h | 55€ | 275 € |
| Visualización de calificaciones | 4h | 55€ | 220 € |
| Mis rúbricas | 3h | 55€ | 165 € |
| **Subtotal Panel Estudiante** | **18h** | | **990 €** |

#### 2.4. Páginas del Curso
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Página principal (`index.html`) | 6h | 55€ | 330 € |
| Calendario interactivo (`calendario.html`) | 5h | 55€ | 275 € |
| Página de asistencia QR (`asistencia.html`) | 6h | 55€ | 330 € |
| Herramienta admin (`HERRAMIENTA_ADMIN.html`) | 5h | 55€ | 275 € |
| **Subtotal Páginas Principales** | **22h** | | **1.210 €** |

#### 2.5. Contenido Educativo (HTML Dinámico)
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| 28 sesiones individuales (3h cada una) | 84h | 55€ | 4.620 € |
| 12 temas de escritura (2h cada uno) | 24h | 55€ | 1.320 € |
| 5 talleres creativos (3h cada uno) | 15h | 55€ | 825 € |
| Índices y navegación | 5h | 55€ | 275 € |
| **Subtotal Contenido** | **128h** | | **7.040 €** |

#### 2.6. JavaScript Interactividad
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Sistema de autenticación en cliente | 6h | 55€ | 330 € |
| Lógica de actividades interactivas | 12h | 55€ | 660 € |
| Sistema de entregas | 8h | 55€ | 440 € |
| Generación de boletines PDF | 10h | 55€ | 550 € |
| Gráficos y estadísticas | 8h | 55€ | 440 € |
| Lógica de asistencia QR | 8h | 55€ | 440 € |
| Sistema de notificaciones | 5h | 55€ | 275 € |
| **Subtotal JavaScript** | **57h** | | **3.135 €** |

**💰 TOTAL FRONTEND:** **359h = 19.745 €**

---

### 3. DISEÑO UI/UX 🎨

#### 3.1. Diseño Visual
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Diseño del sistema de colores | 4h | 50€ | 200 € |
| Tipografía y jerarquía visual | 3h | 50€ | 150 € |
| Sistema de componentes (botones, cards, etc) | 6h | 50€ | 300 € |
| Diseño de layouts responsive | 10h | 50€ | 500 € |
| Iconografía y elementos visuales | 5h | 50€ | 250 € |
| **Subtotal Diseño Visual** | **28h** | | **1.400 €** |

#### 3.2. Diseño de Experiencia de Usuario
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Wireframes de todas las páginas | 8h | 50€ | 400 € |
| Flujos de usuario (auth, entregas) | 6h | 50€ | 300 € |
| Prototipado de interacciones | 5h | 50€ | 250 € |
| Testing de usabilidad | 4h | 50€ | 200 € |
| **Subtotal UX** | **23h** | | **1.150 €** |

**💰 TOTAL DISEÑO UI/UX:** **51h = 2.550 €**

---

### 4. CONTENIDO EDUCATIVO 📚

#### 4.1. Creación de Materiales
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Guionización de 28 sesiones | 56h | 45€ | 2.520 € |
| Creación de 12 temas teóricos | 36h | 45€ | 1.620 € |
| Diseño de 4 talleres creativos | 20h | 45€ | 900 € |
| Actividades interactivas (quizzes, ejercicios) | 30h | 45€ | 1.350 € |
| Rúbricas de evaluación (5 tipos) | 10h | 45€ | 450 € |
| **Subtotal Creación Contenido** | **152h** | | **6.840 €** |

#### 4.2. Recursos Educativos
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Recopilación de recursos (diccionarios, corpus) | 8h | 45€ | 360 € |
| Bibliografía comentada | 6h | 45€ | 270 € |
| Guías de estilo y escritura | 10h | 45€ | 450 € |
| **Subtotal Recursos** | **24h** | | **1.080 €** |

**💰 TOTAL CONTENIDO EDUCATIVO:** **176h = 7.920 €**

---

### 5. DESPLIEGUE E INFRAESTRUCTURA ☁️

#### 5.1. Configuración de Producción
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Setup de Vercel (frontend) | 3h | 55€ | 165 € |
| Setup de Vercel Postgres (BD) | 4h | 55€ | 220 € |
| Configuración de variables de entorno | 2h | 55€ | 110 € |
| Dominio personalizado y SSL | 2h | 55€ | 110 € |
| **Subtotal Despliegue** | **11h** | | **605 €** |

#### 5.2. Documentación
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| README del proyecto | 3h | 45€ | 135 € |
| Guías de uso para profesores | 4h | 45€ | 180 € |
| Guías de uso para estudiantes | 3h | 45€ | 135 € |
| Documentación de APIs | 5h | 45€ | 225 € |
| **Subtotal Documentación** | **15h** | | **675 €** |

**💰 TOTAL DESPLIEGUE E INFRAESTRUCTURA:** **26h = 1.280 €**

---

### 6. GESTIÓN DE PROYECTO 📊

| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Planificación inicial | 8h | 55€ | 440 € |
| Reuniones con stakeholders | 10h | 55€ | 550 € |
| Control de calidad y testing final | 12h | 55€ | 660 € |
| Gestión de cambios e iteraciones | 8h | 55€ | 440 € |
| **Subtotal Gestión** | **38h** | | **2.090 €** |

**💰 TOTAL GESTIÓN DE PROYECTO:** **38h = 2.090 €**

---

## 📊 RESUMEN VERSIÓN 1.0 - TRABAJO YA REALIZADO

| Categoría | Horas | Importe |
|-----------|-------|---------|
| **Backend Development** | 189h | 11.340 € |
| **Frontend Development** | 359h | 19.745 € |
| **Diseño UI/UX** | 51h | 2.550 € |
| **Contenido Educativo** | 176h | 7.920 € |
| **Despliegue e Infraestructura** | 26h | 1.280 € |
| **Gestión de Proyecto** | 38h | 2.090 € |
| **TOTAL V1.0** | **839h** | **44.925 €** |

> ⚠️ **Nota:** El trabajo de la Versión 1.0 ya está realizado y el sistema está en producción. El importe refleja el valor de mercado del trabajo realizado.

---

## 🚧 TRABAJO PENDIENTE (ROADMAP)

### VERSIÓN 1.1 - MEJORAS DE UX (2-3 semanas)

**Prioridad:** 🔥 CRÍTICA
**Estimación:** 17-28 horas

#### 1.1. OAuth Social (Google + Apple)
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Configuración Google OAuth | 4h | 60€ | 240 € |
| Configuración Apple Sign In | 4h | 60€ | 240 € |
| Integración con auth existente | 4h | 60€ | 240 € |
| Testing de OAuth flows | 2h | 55€ | 110 € |
| **Subtotal OAuth** | **14h** | | **830 €** |

#### 1.2. Corrección de Bugs Menores
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Revisión y documentación de issues | 3h | 55€ | 165 € |
| Corrección de bugs críticos | 4h | 55€ | 220 € |
| Mejora de validaciones | 3h | 55€ | 165 € |
| Optimización de rendimiento | 3h | 55€ | 165 € |
| **Subtotal Bug Fixes** | **13h** | | **715 €** |

#### 1.3. Mejoras Responsive
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Optimización para móviles | 4h | 55€ | 220 € |
| Mejora de touch targets | 2h | 55€ | 110 € |
| Arreglo de quirks móviles | 3h | 55€ | 165 € |
| **Subtotal Responsive** | **9h** | | **495 €** |

**💰 TOTAL VERSIÓN 1.1:** **36h = 2.040 €**

---

### VERSIÓN 1.2 - GESTIÓN ACADÉMICA (3-4 semanas)

**Prioridad:** ⚡ IMPORTANTE
**Estimación:** 18-24 horas

#### 1.2.1. Gestión de Actividades
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: API de actividades | 6h | 60€ | 360 € |
| Frontend: CRUD de actividades | 6h | 55€ | 330 € |
| Asignación de rúbricas a actividades | 4h | 55€ | 220 € |
| **Subtotal Actividades** | **16h** | | **910 €** |

#### 1.2.2. Sistema de Configuración Básica
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: API de configuración | 5h | 60€ | 300 € |
| Frontend: Panel de configuración | 6h | 55€ | 330 € |
| Configuración de calendario | 3h | 55€ | 165 € |
| Umbrales de calificación | 2h | 55€ | 110 € |
| **Subtotal Configuración** | **16h** | | **905 €** |

#### 1.2.3. Reportes Avanzados
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Gráficos de evolución temporal | 6h | 55€ | 330 € |
| Comparativas entre sesiones | 5h | 55€ | 275 € |
| Mejora de exportación PDF | 4h | 55€ | 220 € |
| **Subtotal Reportes** | **15h** | | **825 €** |

**💰 TOTAL VERSIÓN 1.2:** **47h = 2.640 €**

---

### VERSIÓN 2.0 - ENGAGEMENT (6-8 semanas)

**Prioridad:** 📈 CRECIMIENTO
**Estimación:** 26-33 horas

#### 2.0.1. Gamificación Básica
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: Sistema de puntos/XP | 8h | 60€ | 480 € |
| Backend: Sistema de badges | 6h | 60€ | 360 € |
| Frontend: Panel de gamificación | 8h | 55€ | 440 € |
| Ranking interactivo | 6h | 55€ | 330 € |
| Niveles de progreso | 4h | 55€ | 220 € |
| Diseño de badges (18-20 badges) | 6h | 50€ | 300 € |
| **Subtotal Gamificación** | **38h** | | **2.130 €** |

#### 2.0.2. Gestión de Recursos
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: API de upload de archivos | 6h | 60€ | 360 € |
| Frontend: Interfaz de gestión de recursos | 8h | 55€ | 440 € |
| Organización por sesión | 4h | 55€ | 220 € |
| Control de versiones básico | 4h | 55€ | 220 € |
| **Subtotal Recursos** | **22h** | | **1.240 €** |

#### 2.0.3. Notificaciones Push
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Service Worker básico | 6h | 55€ | 330 € |
| Notificaciones de entregas | 4h | 55€ | 220 € |
| Recordatorios de sesión | 3h | 55€ | 165 € |
| **Subtotal Push** | **13h** | | **715 €** |

**💰 TOTAL VERSIÓN 2.0:** **73h = 4.085 €**

---

### VERSIÓN 2.1 - COMUNICACIÓN (4-5 semanas)

**Prioridad:** 📈 CRECIMIENTO
**Estimación:** 30-36 horas

#### 2.1.1. Mensajes Directos
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: API de mensajería | 12h | 60€ | 720 € |
| Base de datos de mensajes | 4h | 60€ | 240 € |
| Frontend: Chat individual | 10h | 55€ | 550 € |
| Historial de conversaciones | 6h | 55€ | 330 € |
| Mensajes predefinidos | 3h | 55€ | 165 € |
| Notificaciones de nuevos mensajes | 4h | 55€ | 220 € |
| **Subtotal Mensajes** | **39h** | | **2.225 €** |

#### 2.1.2. PWA Básica
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Manifest.json | 2h | 55€ | 110 € |
| Service Worker para caché | 6h | 55€ | 330 € |
| Instalación como app | 3h | 55€ | 165 € |
| Offline básico | 4h | 55€ | 220 € |
| **Subtotal PWA** | **15h** | | **825 €** |

**💰 TOTAL VERSIÓN 2.1:** **54h = 3.050 €**

---

### VERSIÓN 3.0 - ENTERPRISE (6-8 semanas)

**Prioridad:** 🏢 ESCALABILIDAD
**Estimación:** 30-40 horas

#### 3.0.1. Sistema de Auditoría
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: Logs de auditoría | 8h | 60€ | 480 € |
| Historial de cambios | 6h | 60€ | 360 € |
| Backup/restore de datos | 8h | 60€ | 480 € |
| Frontend: Panel de auditoría | 6h | 55€ | 330 € |
| **Subtotal Auditoría** | **28h** | | **1.650 €** |

#### 3.0.2. Configuración Avanzada
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Backend: Múltiples cursos/ediciones | 10h | 60€ | 600 € |
| Personalización de branding | 6h | 55€ | 330 € |
| Configuración avanzada de calificaciones | 6h | 55€ | 330 € |
| **Subtotal Config Avanzada** | **22h** | | **1.260 €** |

#### 3.0.3. Reportes Ejecutivos
| Tarea | Horas | Tarifa | Importe |
|-------|-------|--------|---------|
| Dashboard para dirección | 8h | 55€ | 440 € |
| KPIs automatizados | 6h | 55€ | 330 € |
| Exportación programada | 4h | 55€ | 220 € |
| **Subtotal Reportes Ejec** | **18h** | | **990 €** |

**💰 TOTAL VERSIÓN 3.0:** **68h = 3.900 €**

---

## 📊 RESUMEN TRABAJO PENDIENTE

| Versión | Horas | Importe | Prioridad |
|---------|-------|---------|-----------|
| **1.1 - Mejoras UX** | 36h | 2.040 € | 🔥 CRÍTICA |
| **1.2 - Gestión Académica** | 47h | 2.640 € | ⚡ IMPORTANTE |
| **2.0 - Engagement** | 73h | 4.085 € | 📈 CRECIMIENTO |
| **2.1 - Comunicación** | 54h | 3.050 € | 📈 CRECIMIENTO |
| **3.0 - Enterprise** | 68h | 3.900 € | 🏢 ESCALABILIDAD |
| **TOTAL PENDIENTE** | **278h** | **15.715 €** |

---

## 💷 TARIFAS APLICADAS

### Desarrollo

| Rol | Tarifa/hora | Justificación |
|-----|-------------|---------------|
| **Senior Backend Developer** | 60 € | Desarrollador senior con 5+ años de experiencia en Node.js, PostgreSQL, arquitecturas escalables |
| **Senior Frontend Developer** | 55 € | Desarrollador senior con experiencia en HTML/CSS/JS avanzado, responsive design, accesibilidad |
| **Full Stack Developer** | 55-60 € | Perfil completo capaz de desarrollar tanto backend como frontend |

### Diseño

| Rol | Tarifa/hora | Justificación |
|-----|-------------|---------------|
| **Diseñador UI/UX Senior** | 50 € | Diseñador con experiencia en interfaces web complejas, diseño de sistemas de componentes, usabilidad |

### Contenido

| Rol | Tarifa/hora | Justificación |
|-----|-------------|---------------|
| **Content Creator Educativo** | 45 € | Experto en creación de contenidos educativos, guionización, diseño de actividades de aprendizaje |

### Gestión

| Rol | Tarifa/hora | Justificación |
|-----|-------------|---------------|
| **Project Manager** | 55 € | Gestión de proyectos tecnológicos, coordinación con stakeholders, control de calidad |

---

## 💰 TOTAL DEL PROYECTO

### DESGLOSE COMPLETO

| Concepto | Horas | Importe |
|----------|-------|---------|
| **Versión 1.0 (COMPLETADA)** | 839h | 44.925 € |
| **Versión 1.1 (Pendiente)** | 36h | 2.040 € |
| **Versión 1.2 (Pendiente)** | 47h | 2.640 € |
| **Versión 2.0 (Pendiente)** | 73h | 4.085 € |
| **Versión 2.1 (Pendiente)** | 54h | 3.050 € |
| **Versión 3.0 (Pendiente)** | 68h | 3.900 € |
| **TOTAL PROYECTO** | **1.117h** | **60.640 €** |

---

## 📅 PLANIFICACIÓN TEMPORAL

### Cronograma Recomendado

| Fase | Versión | Duración | Fechas Estimadas |
|------|---------|----------|------------------|
| **Completado** | 1.0 | 4 meses | Ene 2026 - Abr 2026 |
| **Inmediato** | 1.1 | 2-3 semanas | May 2026 - May 2026 |
| **Corto plazo** | 1.2 | 3-4 semanas | Jun 2026 - Jul 2026 |
| **Medio plazo** | 2.0 | 6-8 semanas | Sep 2026 - Oct 2026 |
| **Medio plazo** | 2.1 | 4-5 semanas | Nov 2026 - Dic 2026 |
| **Largo plazo** | 3.0 | 6-8 semanas | Ene 2027 - Feb 2027 |

---

## 🎯 RECOMENDACIÓN DE INVERSIÓN

### Propuesta Faseada

#### Opción A: Desarrollo Completo (Recomendado para Instituciones)
- **Versión 1.0:** ✅ Completada
- **Versión 1.1 + 1.2:** 4.680 € (Mejoras críticas y gestión académica)
- **Versión 2.0 + 2.1:** 7.135 € (Engagement y comunicación)
- **Versión 3.0:** 3.900 € (Escalabilidad enterprise)
- **Total inversión pendiente:** **15.715 €**

#### Opción B: MVP Mejorado (Recomendado para uso docente individual)
- **Versión 1.0:** ✅ Completada
- **Versión 1.1:** 2.040 € (OAuth + bugs + responsive)
- **Versión 1.2:** 2.640 € (Gestión académica)
- **Total inversión necesaria:** **4.680 €**

#### Opción C: Sólo Mejoras UX Inmediatas
- **Versión 1.0:** ✅ Completada
- **Versión 1.1:** 2.040 €
- **Total inversión necesaria:** **2.040 €**

---

## 📝 CONDICIONES Y PLAZOS

### Condiciones Generales

1. **Validez del presupuesto:** 3 meses desde la fecha de emisión
2. **Periodo de ejecución:** Según cronograma anterior
3. **Forma de pago:**
   - 50% al inicio de cada versión
   - 50% contra entrega y validación
4. **Mantenimiento:** 15% del importe total anual (opcional)
5. **Soporte:** Incluido durante los 3 meses posteriores a cada entrega

### Costes Adicionales No Incluidos

- **Licencias de software:** No aplicable (todo software Open Source)
- **Servidores:**
  - Vercel Pro: ~20€/mes (opcional, plan gratuito disponible)
  - Vercel Postgres: ~7-10€/mes según uso
- **Dominio:** ~12€/año (opcional)
- **Certificado SSL:** Gratis (Let's Encrypt)

### Garantía

- **Garantía de funcionalidad:** 6 meses desde la entrega de cada versión
- **Corrección de bugs:** Incluida durante el periodo de garantía
- **Nuevas funcionalidades:** Fuera de garantía, requieren presupuesto aparte

---

## 📞 CONTACTO

**Desarrollador:**
Javier Benítez Láinez
benitezl@go.ugr.es

**Institución:**
Centro de Lenguas Modernas
Universidad de Granada

---

## 📋 ANEXOS

### Anexo 1: Stack Tecnológico Detallado

**Backend:**
- Node.js 20.x
- Express 4.18+
- PostgreSQL 15+
- JWT authentication
- bcryptjs para hashing
- Helmet para seguridad
- express-rate-limit
- express-validator

**Frontend:**
- HTML5 semántico
- CSS3 con variables
- JavaScript Vanilla (ES6+)
- Responsive design (mobile-first)
- LocalStorage para caché

**Infraestructura:**
- Vercel (hosting)
- Vercel Postgres (base de datos)
- GitHub (control de versiones)

### Anexo 2: Métricas del Proyecto

**Código Actual (V1.0):**
- ~28.000 líneas de código
- 94 archivos JavaScript
- 72 archivos HTML
- 1 archivo CSS principal
- 28 sesiones educativas
- 12 temas teóricos
- 5 talleres creativos

**Complejidad:**
- Backend: Media-Alta (APIs REST, auth, BD)
- Frontend: Media (HTML/CSS/JS, sin framework)
- Contenido: Alta (material educativo especializado)

---

**Fecha de emisión:** 7 de febrero de 2026
**Firma:** Javier Benítez Láinez

---

*Este presupuesto refleja el valor de mercado del desarrollo de una plataforma educativa completa a medida. Los precios están basados en tarifas estándar del sector tecnológico español para desarrollo senior de software.*
