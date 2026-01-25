# Producción Escrita C2 - Curso de Escritura Avanzada

Plataforma web para el curso de Producción Escrita de nivel C2 del Centro de Lenguas Modernas de la Universidad de Granada.

**Profesor:** Javier Benítez Láinez
**Contacto:** benitezl@go.ugr.es
**Institución:** CLM - Universidad de Granada
**Período:** Febrero - Mayo 2026

---

## Contenido del curso

- **32 sesiones** de 90 minutos (lunes y miércoles)
- **14 temas** de escritura con actividades interactivas
- **4 talleres** obligatorios de escritura creativa
- **Examen final:** 21 de mayo de 2026

---

## Despliegue

### Opción 1: GitHub Pages (Recomendado - Gratis)

1. Ve a tu repositorio en GitHub
2. Accede a **Settings** > **Pages**
3. En "Source", selecciona la rama `main` (o `claude/spanish-c2-writing-course-s5i3F`)
4. Haz clic en **Save**
5. En unos minutos, tu sitio estará disponible en:
   ```
   https://[tu-usuario].github.io/PE/
   ```

### Opción 2: Netlify (Gratis - Muy fácil)

1. Ve a [netlify.com](https://www.netlify.com/) y crea una cuenta
2. Haz clic en **"Add new site"** > **"Import an existing project"**
3. Conecta tu repositorio de GitHub
4. Selecciona la rama y haz clic en **Deploy**
5. Tu sitio estará disponible en `https://[nombre-aleatorio].netlify.app`
6. Puedes personalizar el dominio en la configuración

**Alternativa rápida con Netlify:**
1. Ve a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta del proyecto
3. ¡Listo! Sitio desplegado en segundos

### Opción 3: Vercel (Gratis)

1. Ve a [vercel.com](https://vercel.com/) y crea una cuenta
2. Importa el repositorio desde GitHub
3. Haz clic en **Deploy**
4. Tu sitio estará en `https://[nombre].vercel.app`

### Opción 4: Servidor propio / Universidad

Si tienes acceso a un servidor web (Apache, Nginx):

```bash
# Copiar los archivos al servidor
scp -r ./* usuario@servidor:/var/www/html/produccion-escrita/

# O usar rsync para sincronizar
rsync -avz --delete ./ usuario@servidor:/var/www/html/produccion-escrita/
```

---

## Estructura del proyecto

```
PE/
├── index.html              # Página principal
├── calendario.html         # Calendario del curso
├── css/
│   └── styles.css          # Estilos (diseño moderno)
├── js/
│   └── app.js              # JavaScript (autenticación, actividades)
├── auth/
│   ├── login.html          # Acceso
│   └── registro.html       # Registro de estudiantes
├── usuario/
│   ├── dashboard.html      # Panel del estudiante
│   └── mis-entregas.html   # Historial de entregas
├── admin/
│   ├── index.html          # Panel del profesor
│   └── correcciones.html   # Sistema de corrección
├── sesiones/
│   ├── index.html          # Índice de sesiones
│   └── sesion-01.html      # Sesiones 1-32
│   └── ...
├── temas/
│   └── index.html          # 14 temas del curso
├── talleres/
│   ├── index.html          # Índice de talleres
│   ├── taller-01-miniserie.html
│   ├── taller-02-olvidos.html
│   ├── taller-03-safari.html
│   └── taller-04-granada2031.html
└── recursos/
    └── index.html          # Diccionarios, corpus, bibliografía
```

---

## Cuentas de demostración

### Profesor (Administrador)
- **Email:** `profesor@curso.es`
- **Contraseña:** `admin123`

### Estudiante
- **Email:** `estudiante@ejemplo.com`
- **Contraseña:** `estudiante123`

---

## Características

### Para estudiantes
- Registro y login
- Acceso a las 32 sesiones con actividades interactivas
- Envío de entregas desde cada sesión
- Visualización de feedback y calificaciones
- Calendario del curso
- Recursos lingüísticos (diccionarios, corpus, conectores)

### Para el profesor
- Panel de administración
- Lista de estudiantes registrados
- Sistema de corrección de entregas
- Retroalimentación y calificaciones
- Estadísticas del curso
- Exportación de datos

### Actividades interactivas
- Quizzes de opción múltiple
- Ejercicios de completar espacios
- Ordenar elementos
- Editor de texto con contador de palabras

---

## Tecnologías

- **HTML5** - Estructura
- **CSS3** - Diseño responsive moderno
- **JavaScript (Vanilla)** - Interactividad
- **LocalStorage** - Almacenamiento de datos (sin backend)

> **Nota:** Los datos se almacenan en el navegador del usuario (localStorage). Para una versión con base de datos persistente, se necesitaría añadir un backend.

---

## Personalización

### Cambiar colores
Edita las variables CSS en `css/styles.css`:

```css
:root {
    --primary-color: #1a365d;      /* Azul principal */
    --secondary-color: #c53030;    /* Rojo */
    --accent-color: #d69e2e;       /* Dorado */
}
```

### Modificar sesiones
Edita los archivos en `/sesiones/sesion-XX.html` para cambiar contenidos, actividades o fechas.

### Actualizar información del profesor
Busca y reemplaza:
- `Javier Benítez Láinez` - Nombre del profesor
- `benitezl@go.ugr.es` - Email de contacto
- `Centro de Lenguas Modernas` - Institución

---

## Licencia

© 2026 Javier Benítez Láinez. Todos los derechos reservados.

Desarrollado para el Centro de Lenguas Modernas de la Universidad de Granada.

---

## Soporte

Para consultas sobre el curso:
**Email:** benitezl@go.ugr.es

Para problemas técnicos con la plataforma, abre un issue en este repositorio.
