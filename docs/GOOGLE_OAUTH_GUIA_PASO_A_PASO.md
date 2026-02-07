# 📘 Guía Paso a Paso - Configurar Google OAuth

**Objetivo:** Configurar Google Sign In para el curso de Producción Escrita C2

**Tiempo estimado:** 15-20 minutos

---

## 🎯 RESUMEN RÁPIDO

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Crear proyecto en Google Cloud Console | 3 min |
| 2 | Activar Google+ API | 2 min |
| 3 | Configurar pantalla de consentimiento | 5 min |
| 4 | Crear credenciales OAuth 2.0 | 5 min |
| 5 | Copiar credenciales al proyecto | 2 min |

---

## PASO 1: Crear Proyecto en Google Cloud Console

### 1.1 Acceder a Google Cloud Console

1. Ve a: **https://console.cloud.google.com/**

2. Inicia sesión con tu cuenta de Google (@gmail.com o @ugr.es)

3. Si es tu primera vez, verás un mensaje de bienvenida. Haz clic en **"Aceptar"**

### 1.2 Crear Nuevo Proyecto

1. En la barra superior, junto al logo de Google Cloud, haz clic en el selector de proyecto

2. Haz clic en **"NUEVO PROYECTO"** (o "NEW PROJECT")

3. Rellena el formulario:
   ```
   Nombre del proyecto: Produccion Escrita C2
   Organización: (sin organizacion) o selecciona la tuya
   Ubicación: No organization (o tu organización)
   ```

4. Haz clic en **"CREAR"** (o "CREATE")

5. Espera 30-60 segundos mientras se crea el proyecto

6. Verás una notificación: "El proyecto [Produccion Escrita C2] se ha creado correctamente"

---

## PASO 2: Activar Google+ API

### 2.1 Buscar la API

1. En el menú izquierdo, haz clic en **"APIs y servicios"** → **"Biblioteca"**
   - O accede directamente: https://console.cloud.google.com/apis/dashboard

2. En el buscador, escribe: **"Google+ API"** o **"Google Plus API"**

3. Haz clic en el resultado **"Google+ API"**

### 2.2 Activar la API

1. Haz clic en el botón **"ACTIVAR"** (o "ENABLE")

2. Espera unos segundos hasta que veas el mensaje: "La API se ha activado para el proyecto"

3. Ahora vuelve al dashboard: **"APIs y servicios"** → **"Panel"**

---

## PASO 3: Configurar Pantalla de Consentimiento (OAuth Consent Screen)

### 3.1 Acceder a la Pantalla de Consentimiento

1. En el menú izquierdo: **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
   - O directamente: https://console.cloud.google.com/apis/credentials/consent

### 3.2 Seleccionar Tipo de Usuario

1. Elige: **"Externo"** (External) - Para cualquier usuario con Google
   - ⚠️ NO elijas "Interno" (solo para usuarios de tu organización)

2. Haz clic en **"CREAR"** (o "CREATE")

### 3.3 Configurar la Pantalla de Consentimiento

**Paso 1: Información de la app de OAuth**

Rellena los campos:

| Campo | Valor |
|-------|-------|
| **Nombre de la app** | Producción Escrita C2 |
| **Logo de la app** | (Opcional) Sube tu logo o deja vacío |
| **Correo electrónico de asistencia al usuario** | benitezl@go.ugr.es |
| **Dominios autorizados** | cognoscencia.com (tu dominio) |

Para **"Información de contacto del desarrollador"**:
- **Correo electrónico**: benitezl@go.ugr.es

Haz clic en **"GUARDAR Y CONTINUAR"**

**Paso 2: Alcances (Scopes)**

1. Verás una lista de permisos. Haz clic en **"AGREGAR O QUITAR ALCANCES"**

2. Busca y selecciona:
   - ✅ `./auth/userinfo.email`
   - ✅ `./auth/userinfo.profile`
   - ✅ `openid`

3. Haz clic en **"ACTUALIZAR"** o **"AGREGAR"**

4. Haz clic en **"GUARDAR Y CONTINUAR"**

**Paso 3: Usuarios de prueba**

- Deja vacío (no añadas usuarios de prueba)
- Haz clic en **"GUARDAR Y CONTINUAR"**

**Paso 4: Resumen**

Revisa la configuración y haz clic en **"VOLVER AL PANEL"** (o "BACK TO DASHBOARD")

---

## PASO 4: Crear Credenciales OAuth 2.0

### 4.1 Acceder a Credenciales

1. Menú izquierdo: **"APIs y servicios"** → **"Credenciales"**
   - O directamente: https://console.cloud.google.com/apis/credentials

### 4.2 Crear ID de Cliente OAuth 2.0

1. Haz clic en **"CREAR CREDENCIALES"** → **"ID de cliente de OAuth"**
   - O en inglés: **"CREATE CREDENTIALS"** → **"OAuth client ID"**

### 4.3 Configurar el Cliente OAuth

**Application type (Tipo de aplicación):**
- Selecciona: **"Aplicación web"** (Web application)

**Name (Nombre):**
- Escribe: `Producción Escrita C2 Web`

**Authorized JavaScript origins (Orígenes JavaScript autorizados):**

Añade estos dominios:

```
https://www.cognoscencia.com
https://cognoscencia.com
http://localhost:5500
```

⚠️ **Importante:**
- NO añadas `/` al final
- Usa `https://` para producción
- Usa `http://localhost:5500` para desarrollo

**Authorized redirect URIs (URI de redirección autorizadas):**

Añade estas URLs **exactamente** (con `/` al final):

```
https://www.cognoscencia.com/auth/oauth-callback.html
https://www.cognoscencia.com/auth/oauth-callback.html
https://www.cognoscencia.com/auth/oauth-callback.html?provider=google
http://localhost:5500/auth/oauth-callback.html
```

⚠️ **CRÍTICO:**
- Las URLs DEBEN terminar en `.html`
- Incluye la versión con `?provider=google`
- Verifica que NO haya espacios extras

4. Haz clic en **"CREAR"** (o "CREATE")

---

## PASO 5: Copiar Credenciales

### 5.1 Ver las Credenciales

Después de crear, verás un **modal emergente** con tus credenciales:

```
┌─────────────────────────────────────────┐
│  OAuth client creado                    │
│                                         │
│  Client ID:                             │
│  123456789-abc123def456.apps.googleuser  │
│  .content.com                            │
│                                         │
│  Client secret:                         │
│  GOCSPX-XXXXXXXXXXXX_XXXXXXXXXXXX       │
│                                         │
│  [ COPIAR ]  [ GUARDAR ]               │
└─────────────────────────────────────────┘
```

### 5.2 Copiar las Credenciales

**Client ID:**
1. Haz clic en el botón **"COPIAR"** junto a Client ID
2. Guárdalo temporalmente en un archivo de texto

**Client Secret:**
1. Haz clic en **"MOSTRAR"** o **"SHOW"** para ver el secret
2. Haz clic en **"COPIAR"** junto a Client Secret
3. ⚠️ **IMPORTANTE:** Guarda el secret de forma segura

### 5.3 Guardar las Credenciales

Crea un archivo temporal `google-credentials.txt`:

```
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-XXXXXXXXXXXX_XXXXXXXXXXXX
```

---

## PASO 6: Añadir al Proyecto

### 6.1 Abrir archivo .env

1. En tu proyecto, abre el archivo: `backend/.env`

### 6.2 Añadir las variables de entorno

Añade al final del archivo:

```bash
# Google OAuth 2.0
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-XXXXXXXXXXXX_XXXXXXXXXXXX
```

⚠️ **Reemplaza con tus credenciales reales**

### 6.3 Verificar FRONTEND_URL

Asegúrate de que también tengas:

```bash
FRONTEND_URL=https://www.cognoscencia.com
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de continuar, verifica:

- [ ] Proyecto "Produccion Escrita C2" creado en Google Cloud Console
- [ ] Google+ API activada
- [ ] Pantalla de consentimiento configurada como "Externo"
- [ ] Cliente OAuth 2.0 creado como "Web application"
- [ ] Dominio añadido en "Authorized JavaScript origins"
- [ ] URI de redirección añadida (con `/auth/oauth-callback.html`)
- [ ] Client ID copiado
- [ ] Client Secret copiado y guardado de forma segura
- [ ] Variables de entorno añadidas al archivo `.env`

---

## 🧪 TESTING LOCAL

Para probar en tu máquina local:

### Añadir localhost como origen autorizado

1. Vuelve a: **APIs y servicios** → **Credenciales**
2. Haz clic en tu cliente OAuth (puedes editarlo)
3. Añade a **Authorized JavaScript origins**:
   ```
   http://127.0.0.1:5500
   http://localhost:5500
   ```
4. Añade a **Authorized redirect URIs**:
   ```
   http://127.0.0.1:5500/auth/oauth-callback.html
   http://localhost:5500/auth/oauth-callback.html
   ```

### Abrir el proyecto local

1. Abre el archivo `auth/login.html` con Live Server (VS Code) o similar
2. Abre la consola del navegador (F12)
3. Haz clic en **"Continuar con Google"**
4. Verás el popup de Google
5. Autoriza la aplicación
6. Deberías volver al login con el mensaje de éxito

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error: "redirect_uri_mismatch"

**Causa:** La URL de redirección no coincide exactamente

**Solución:**
1. Verifica que la URL en el error coincida con una de las que configuraste
2. Asegúrate de incluir `/auth/oauth-callback.html` al final
3. Incluye tanto con como sin `?provider=google`

### Error: "origin_mismatch"

**Causa:** El dominio JavaScript no está autorizado

**Solución:**
1. Añade tu dominio a **Authorized JavaScript origins**
2. Incluye `https://www.cognoscencia.com` Y `https://cognoscencia.com`
3. Para local, añade `http://localhost:5500`

### Error: "API not activated"

**Causa:** No activaste Google+ API

**Solución:**
1. Ve a **APIs y servicios** → **Biblioteca**
2. Busca "Google+ API"
3. Haz clic en **ACTIVAR**

---

## 📞 ¿NECESITAS AYUDA?

Si tienes problemas en algún paso:

1. **Verifica** que estás en el proyecto correcto (selector de proyectos en la barra superior)
2. **Verifica** que los dominios están escritos correctamente (sin `/` al final en origins)
3. **Espera** 5-10 minutos después de crear las credenciales (a veces tardan en propagarse)

---

## 🎯 SIGUIENTE PASO

Una vez configurado Google OAuth, el siguiente paso es **configurar Apple Sign In**.

¿Continuamos con Apple o prefieres probar Google primero?
