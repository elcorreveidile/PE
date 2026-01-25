# Guía de Despliegue en Producción
## Curso de Producción Escrita C2 - Centro de Lenguas Modernas (UGR)

Esta guía te llevará paso a paso para poner tu aplicación en producción con **Supabase** (base de datos) y **Vercel** (hosting).

---

## 📋 Índice

1. [Crear Proyecto en Supabase](#1-crear-proyecto-en-supabase)
2. [Configurar Base de Datos PostgreSQL](#2-configurar-base-de-datos-postgresql)
3. [Generar JWT_SECRET Seguro](#3-generar-jwt_secret-seguro)
4. [Desplegar Backend en Vercel](#4-desplegar-backend-en-vercel)
5. [Desplegar Frontend en Vercel](#5-desplegar-frontend-en-vercel)
6. [Configurar Dominio Personalizado (Opcional)](#6-configurar-dominio-personalizado-opcional)
7. [Verificar Despliegue](#7-verificar-despliegue)

---

## 1. Crear Proyecto en Supabase

### 1.1. Registrar cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en **"Start your project"**
3. Regístrate con GitHub (recomendado) o email

### 1.2. Crear nuevo proyecto

1. Haz clic en **"New Project"**
2. Completa los datos:
   - **Name**: `produccion-escrita-c2`
   - **Database Password**: Genera una contraseña fuerte y **GUÁRDALA** (la necesitarás)
   - **Region**: Elige la más cercana (probablemente `EU West` para España)
   - **Pricing Plan**: **Free** (hasta 500MB de base de datos)

3. Haz clic en **"Create new project** y espera unos minutos mientras se crea

### 1.3. Obtener credenciales de conexión

Una vez creado el proyecto:

1. Ve a **Settings** (icono de engranaje) → **Database**
2. En la sección **Connection string**, copia la **URI**
3. La URL tendrá este formato:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

**Guarda esta URL** - la necesitarás en el paso 4.

---

## 2. Configurar Base de Datos PostgreSQL

### 2.1. Ejecutar script de inicialización

1. En tu proyecto local, crea el archivo `.env` en el directorio `backend/`:

```bash
cd backend
cp .env.example .env
```

2. Edita el archivo `.env` y configura las variables:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=production

# Tipo de base de datos
DB_TYPE=postgres

# Base de datos PostgreSQL (SUPABASE)
# Reemplaza [YOUR-PASSWORD] con tu contraseña de Supabase
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# JWT Secret (generar en el paso 3)
JWT_SECRET=tu_jwt_secret_aqui

# JWT Expiration
JWT_EXPIRES_IN=7d

# Frontend URL (actualizar después del despliegue)
FRONTEND_URL=https://tu-proyecto.vercel.app

# Admin inicial
ADMIN_EMAIL=benitezl@go.ugr.es
ADMIN_PASSWORD=admin123
ADMIN_NAME=Javier Benítez Láinez
```

### 2.2. Instalar dependencias y ejecutar script

```bash
cd backend
npm install
npm run init-db-postgres
```

Este script:
- Creará todas las tablas en Supabase
- Insertará las 32 sesiones del curso
- Creará el usuario admin y un estudiante de demostración

### 2.3. Verificar en Supabase

1. En Supabase, ve a **Table Editor**
2. Deberías ver las tablas creadas: `users`, `submissions`, `feedback`, etc.
3. Verifica que la tabla `users` tiene los usuarios creados

---

## 3. Generar JWT_SECRET Seguro

El JWT_SECRET es crítico para la seguridad de tu aplicación. Genera uno seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia la cadena generada y pégala en tu archivo `.env` en la variable `JWT_SECRET`.

**⚠️ IMPORTANTE**: Nunca commits el archivo `.env` a GitHub. Ya está en `.gitignore`.

---

## 4. Desplegar Backend en Vercel

### 4.1. Preparar Vercel CLI (opcional)

Si prefieres usar la CLI de Vercel:

```bash
npm install -g vercel
```

### 4.2. Crear archivo `vercel.json`

Crea el archivo `backend/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/app.js"
    }
  ]
}
```

### 4.3. Desplegar desde la web de Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub
4. Configura el proyecto:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (dejar vacío)
   - **Output Directory**: (dejar vacío)
   - **Install Command**: `npm install`

5. Haz clic en **"Environment Variables"** y añade:
   - `DB_TYPE` = `postgres`
   - `DATABASE_URL` = (tu URL de Supabase)
   - `JWT_SECRET` = (tu JWT_SECRET generado)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = (tu URL de frontend, por ahora: `http://localhost:5500`)

6. Haz clic en **"Deploy"**

7. Espera a que termine el despliegue. Vercel te dará una URL como:
   ```
   https://tu-proyecto.vercel.app
   ```

**Guarda esta URL** - es tu URL de backend.

---

## 5. Desplegar Frontend en Vercel

### 5.1. Configurar URL de la API

1. Abre el archivo `js/app.js` del frontend
2. Busca la línea que configura la API URL:
   ```javascript
   const API_URL = 'http://localhost:3000/api';
   ```
3. Cámbiala por la URL de tu backend:
   ```javascript
   const API_URL = 'https://tu-proyecto.vercel.app/api';
   ```

### 5.2. Actualizar CORS en el backend

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Actualiza la variable `FRONTEND_URL` con la URL de tu frontend

### 5.3. Desplegar frontend

**Opción A: Desde la web de Vercel**

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub
4. Configura:
   - **Framework Preset**: Other
   - **Root Directory**: `/` (raíz del proyecto)
   - No requiere build command

5. Haz clic en **"Deploy"**

**Opción B: Usar Vercel CLI**

```bash
# Desde la raíz del proyecto
vercel --prod
```

### 5.4. Actualizar FRONTEND_URL

1. Una vez desplegado, copia la URL del frontend
2. Ve al proyecto del backend en Vercel
3. Actualiza la variable de entorno `FRONTEND_URL`
4. Redespliega el backend

---

## 6. Configurar Dominio Personalizado (Opcional)

### 6.1. Comprar dominio

Compra un dominio en un registrador como:
- [Namecheap](https://www.namecheap.com)
- [Google Domains](https://domains.google)
- [DonDominio](https://www.dondominio.com) (España)

### 6.2. Configurar en Vercel

1. Ve a **Settings** → **Domains** en tu proyecto de Vercel
2. Añade tu dominio personalizado
3. Vercel te dará instrucciones para configurar los DNS

### 6.3. Configurar DNS

En tu registrador de dominios, añade los registros DNS que te indica Vercel:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

---

## 7. Verificar Despliegue

### 7.1. Verificar backend

Visita: `https://tu-backend.vercel.app/api/health`

Deberías ver:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2025-...",
  "environment": "production"
}
```

### 7.2. Verificar frontend

Visita: `https://tu-frontend.vercel.app`

Deberías ver la página principal del curso.

### 7.3. Probar autenticación

1. Intenta registrarte con un nuevo usuario
2. Intenta iniciar sesión con el usuario admin:
   - Email: `benitezl@go.ugr.es`
   - Password: `admin123`

### 7.4. Probar entregas

1. Inicia sesión como estudiante
2. Navega a una sesión del curso
3. Crea una entrega
4. Inicia sesión como admin y verifica que puedes verla y corregirla

---

## 🔧 Solución de Problemas

### Error: "Connection refused"

- Verifica que la URL de Supabase es correcta
- Verifica que la contraseña es correcta
- Verifica que el proyecto de Supabase esté activo

### Error: "CORS policy"

- Verifica que la variable `FRONTEND_URL` en el backend incluye la URL correcta del frontend
- Para múltiples orígenes, usa: `FRONTEND_URL=https://dominio1.com,https://dominio2.com`

### Error: "JWT malformed"

- Verifica que `JWT_SECRET` sea el mismo en todos lados
- Regenera el JWT_SECRET si es necesario

### Las entregas no se guardan

- Verifica la conexión a Supabase desde el dashboard de Supabase
- Revisa los logs de Vercel (Deployments → Build Logs)

---

## 📊 Monitoreo y Mantenimiento

### Supabase Dashboard

- Monitorea el uso de la base de datos
- Revisa los logs
- Configura backups automáticos (en plan de pago)

### Vercel Dashboard

- Monitorea el tráfico y errores
- Configura alertas
- Revisa los deployments

---

## 🚀 Próximos Pasos

Una vez en producción:

1. **Cambiar contraseñas por defecto**
   - Cambia la contraseña del admin
   - Elimina el usuario de demostración

2. **Configurar email notifications** (opcional)
   - Supabase tiene soporte para email
   - Configura SMTP para enviar notificaciones

3. **Configurar dominio personalizado**
   - Más profesional
   - Mejor para branding

4. **Configurar HTTPS**
   - Vercel lo hace automáticamente
   - Incluido en el plan gratuito

5. **Monitoreo**
   - Configura alertas de errores
   - Monitorea el uso de la base de datos

---

## 📞 Soporte

Si tienes problemas:

- **Documentación de Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Documentación de Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Issues del proyecto**: Crea un issue en GitHub

---

**¡Felicidades!** Tu aplicación está ahora en producción 🎉

---

_Creado para el curso de Producción Escrita C2 - Centro de Lenguas Modernas, Universidad de Granada_
