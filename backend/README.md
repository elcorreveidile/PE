# Backend - Producción Escrita C2

API REST para el curso de Producción Escrita C2 del Centro de Lenguas Modernas (CLM) de la Universidad de Granada.

## Requisitos

- Node.js 18 o superior
- npm o yarn

## Instalación

```bash
# Entrar en la carpeta del backend
cd backend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus valores
nano .env

# Inicializar base de datos
npm run init-db

# Iniciar servidor en desarrollo
npm run dev

# O en producción
npm start
```

## Variables de entorno (.env)

```env
# Puerto del servidor
PORT=3000

# Entorno (development/production)
NODE_ENV=development

# Tipo de base de datos: 'sqlite' (desarrollo) o 'postgres' (producción)
DB_TYPE=sqlite

# Base de datos SQLite (desarrollo local)
DATABASE_PATH=./data/database.sqlite

# Base de datos PostgreSQL (producción - Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Clave secreta para JWT (cambiar en producción)
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura

# Tiempo de expiración del token
JWT_EXPIRES_IN=7d

# Orígenes permitidos para CORS (separados por coma)
FRONTEND_URL=http://localhost:5500,https://elcorreveidile.github.io

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin inicial (se crea al inicializar la base de datos)
ADMIN_EMAIL=benitezl@go.ugr.es
ADMIN_PASSWORD=admin123
ADMIN_NAME=Javier Benítez Láinez
```

## Endpoints de la API

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register` | Registrar nuevo usuario |
| POST | `/login` | Iniciar sesión |
| GET | `/me` | Obtener usuario actual |
| PUT | `/password` | Cambiar contraseña |
| PUT | `/profile` | Actualizar perfil |

### Entregas (`/api/submissions`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar entregas (filtros disponibles) |
| GET | `/:id` | Obtener entrega específica |
| POST | `/` | Crear nueva entrega |
| PUT | `/:id` | Actualizar entrega |
| POST | `/:id/feedback` | Añadir retroalimentación (admin) |
| DELETE | `/:id` | Eliminar entrega |
| GET | `/stats/overview` | Estadísticas de entregas |

### Usuarios (`/api/users`) - Solo admin

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar usuarios |
| GET | `/:id` | Obtener usuario |
| PUT | `/:id` | Actualizar usuario |
| DELETE | `/:id` | Eliminar usuario |
| GET | `/stats/overview` | Estadísticas de usuarios |

### Otros

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/course` | Información del curso |

## Despliegue

### 📘 Guía Completa de Despliegue en Producción

Para una guía paso a paso detallada, consulta **[DEPLOYMENT.md](../DEPLOYMENT.md)**.

### Resumen Rápido: Supabase + Vercel

**1. Configurar Supabase (Base de Datos PostgreSQL)**
- Crea proyecto en [supabase.com](https://supabase.com)
- Copia la `DATABASE_URL` del proyecto
- Ejecuta: `npm run init-db-postgres`

**2. Desplegar Backend en Vercel**
- Ve a [vercel.com](https://vercel.com)
- Importa tu repositorio de GitHub
- Configura las variables de entorno (`DB_TYPE=postgres`, `DATABASE_URL`, `JWT_SECRET`)
- Deploy

**3. Desplegar Frontend**
- Despliega el frontend en Vercel
- Actualiza la `API_URL` en `js/app.js`
- Actualiza `FRONTEND_URL` en el backend

### Opción 1: Railway (Alternativa)

1. Crea una cuenta en [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Railway detectará automáticamente Node.js
4. Configura las variables de entorno en el dashboard
5. Despliega

```bash
# O usando Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

### Opción 2: Render

1. Crea una cuenta en [render.com](https://render.com)
2. New > Web Service
3. Conecta tu repositorio
4. Configura:
   - Build Command: `cd backend && npm install && npm run init-db`
   - Start Command: `cd backend && npm start`
5. Añade variables de entorno
6. Despliega

### Opción 3: VPS (DigitalOcean, Linode, etc.)

```bash
# En el servidor
git clone https://github.com/elcorreveidile/PE.git
cd PE/backend
npm install --production
cp .env.example .env
nano .env  # Configurar variables
npm run init-db
npm start

# Usar PM2 para mantener el proceso
npm install -g pm2
pm2 start src/app.js --name "pe-c2-api"
pm2 save
pm2 startup
```

### Opción 4: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
RUN npm run init-db
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t pe-c2-api .
docker run -p 3000:3000 --env-file .env pe-c2-api
```

## Usuarios por defecto

Al inicializar la base de datos se crean:

| Email | Contraseña | Rol |
|-------|------------|-----|
| `benitezl@go.ugr.es` | `admin123` | admin |
| `estudiante@ejemplo.com` | `estudiante123` | student |

**Importante:** Cambiar las contraseñas en producción.

## Estructura del proyecto

```
backend/
├── src/
│   ├── app.js              # Servidor Express
│   ├── database/
│   │   ├── db.js           # Conexión BD (SQLite + PostgreSQL)
│   │   ├── schema.sql      # Esquema SQLite
│   │   ├── schema-postgres.sql  # Esquema PostgreSQL
│   │   ├── init.js         # Inicialización SQLite
│   │   └── init-postgres.js  # Inicialización PostgreSQL
│   ├── middleware/
│   │   └── auth.js         # Autenticación JWT
│   └── routes/
│       ├── auth.js         # Rutas de autenticación
│       ├── users.js        # Rutas de usuarios
│       └── submissions.js  # Rutas de entregas
├── data/                   # Base de datos SQLite (generada)
├── .env.example            # Ejemplo de configuración
├── vercel.json             # Configuración Vercel
├── package.json
└── README.md
```

## Compatibilidad de Base de Datos

Este backend soporta **dos tipos de base de datos**:

- **SQLite**: Para desarrollo local (DB_TYPE=sqlite)
- **PostgreSQL**: Para producción con Supabase (DB_TYPE=postgres)

El cambio entre uno y otro se hace simplemente cambiando la variable de entorno `DB_TYPE`.

## Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación mediante JWT
- Rate limiting para prevenir ataques
- Helmet para cabeceras de seguridad
- CORS configurado
- Validación de entrada con express-validator

## Desarrollo

```bash
# Modo desarrollo con recarga automática
npm run dev

# Reinicializar base de datos
npm run init-db
```

## Licencia

© 2026 Javier Benítez Láinez - CLM Universidad de Granada
