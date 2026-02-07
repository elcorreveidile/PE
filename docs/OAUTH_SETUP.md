# Guía de Configuración OAuth 2.0

Configuración de Google Sign In y Apple Sign In para el curso de Producción Escrita C2.

---

## Índice

1. [Configuración de Google OAuth](#configuración-de-google-oauth)
2. [Configuración de Apple Sign In](#configuración-de-apple-sign-in)
3. [Variables de Entorno](#variables-de-entorno)
4. [Ejecutar Migración de Base de Datos](#ejecutar-migración-de-base-de-datos)
5. [Testing](#testing)
6. [Solución de Problemas](#solución-de-problemas)

---

## Configuración de Google OAuth

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Busca "Google+ API" en la biblioteca de APIs y actívala

### Paso 2: Crear Credenciales OAuth 2.0

1. En el menú, ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth client ID**
3. Si es la primera vez, te pedirá configurar la pantalla de consentimiento:
   - Selecciona **External** → **Create**
   - Rellena:
     - App name: "Producción Escrita C2"
     - User support email: tu email
     - Developer contact: tu email
   - Guarda y continúa
4. Configura el OAuth client ID:
   - **Application type**: Web application
   - **Name**: "Producción Escrita C2 Web"
   - **Authorized redirect URIs**:
     ```
     https://tu-dominio.com/auth/oauth-callback.html
     https://tu-dominio.com/auth/oauth-callback.html?provider=google
     http://localhost:5500/auth/oauth-callback.html  ( Desarrollo )
     ```

### Paso 3: Copiar Credenciales

1. Después de crear, verás un popup con:
   - **Client ID**: Copia este valor
   - **Client Secret**: Copia este valor (haz clic en SHOW)

**Importante**: Guarda estas credenciales de forma segura.

---

## Configuración de Apple Sign In

### Paso 1: Crear App ID en Apple Developer

1. Ve a [Apple Developer](https://developer.apple.com/)
2. Inicia sesión con tu Apple ID
3. Ve a **Certificates, Identifiers & Profiles**
4. En **Identifiers**, haz clic en **+** para crear uno nuevo
5. Selecciona **App IDs** → **Continue**
6. Configura:
   - **Description**: "Producción Escrita C2"
   - **Bundle ID**: Selecciona **Explicit** y usa un ID único (ej: `com.cognoscencia.c2`)
   - **Capabilities**: Marca **Sign In with Apple**
7. Haz clic en **Continue** → **Register**

### Paso 2: Crear Service ID

1. En el menú lateral, ve a **Identifiers** → **+**
2. Selecciona **Services IDs** → **Continue**
3. Configura:
   - **Description**: "Producción Escrita C2 Web"
   - **Bundle ID**: El mismo que creaste en el paso 1
   - **Sign In with Apple**: Marca la casilla
4. Haz clic en **Configure** junto a "Sign In with Apple"
5. Añade tu dominio y URLs:
   - **Domains and Subdomains**: `tu-dominio.com`
   - **Return URLs**:
     ```
     https://tu-dominio.com/auth/oauth-callback.html
     ```
6. Haz clic en **Save** → **Continue** → **Register**

### Paso 3: Crear Private Key

1. Ve a **Keys** en el menú lateral
2. Haz clic en **+** para crear una clave
3. Configura:
   - **Key Name**: "Sign In with Apple - C2"
   - **Sign In with Apple**: Marca la casilla
4. Haz clic en **Configure** y selecciona el App ID que creaste
5. Haz clic en **Save** y descarga la clave (archivo `.p8`)
6. **IMPORTANTE**: Guarda la clave de forma segura. Solo puedes descargarla una vez.

### Paso 4: Obtener Credenciales

Necesitarás:
- **Client ID**: El Service ID que creaste (Bundle ID)
- **Team ID**: Visible en la esquina superior derecha de Apple Developer
- **Key ID**: Visible en la lista de Keys
- **Private Key**: El contenido del archivo `.p8` que descargaste

---

## Variables de Entorno

### Archivo `.env`

Añade estas variables a tu archivo `.env`:

```bash
# Frontend URL
FRONTEND_URL=https://tu-dominio.com

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui

# Apple Sign In
APPLE_CLIENT_ID=com.cognoscencia.c2  # Tu Service ID
APPLE_TEAM_ID=tu_team_id_aqui        # 10 caracteres alfanuméricos
APPLE_KEY_ID=tu_key_id_aqui          # 10 caracteres alfanuméricos
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(el contenido completo de tu archivo .p8)
-----END PRIVATE KEY-----"

# Código de registro (requerido para nuevos usuarios)
REGISTRATION_CODE=PIO7-2026-CLM
```

**Importante**: El `APPLE_PRIVATE_KEY` debe contener el contenido exacto del archivo `.p8`, incluyendo los encabezados `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`.

### Ejemplo de formato de Private Key

El private key debe estar en formato multilinea en el `.env`:

```bash
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg8FkMNdMfO6nWl5Cx
WqFhWzLrYkqMvPqYQK2ND7rK5M8K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fK
wK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
-----END PRIVATE KEY-----"
```

---

## Ejecutar Migración de Base de Datos

### Backend (PostgreSQL)

1. Conéctate a tu base de datos PostgreSQL
2. Ejecuta el archivo de migración:

```bash
# En el directorio backend
psql $DATABASE_URL -f src/database/add-oauth.sql
```

O ejecútalo directamente desde tu cliente de base de datos (pgAdmin, DBeaver, etc.).

### Verificar la migración

```sql
-- Verificar que los campos se añadieron correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('provider', 'provider_id', 'avatar_url');

-- Deberías ver:
-- provider     | text    | YES
-- provider_id  | text    | YES
-- avatar_url   | text    | YES
```

---

## Testing

### 1. Probar Google OAuth

1. Inicia el backend:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. Abre `login.html` en el navegador

3. Haz clic en **"Continuar con Google"**

4. Deberías ver:
   - Popup de Google solicitando permiso
   - Después de autorizar, si el email no existe:
     - Modal solicitando código de registro
   - Si el código es correcto:
     - Usuario creado y sesión iniciada

### 2. Probar Apple Sign In

1. Asegúrate de estar en HTTPS (Apple lo requiere)
2. Haz clic en **"Continuar con Apple"**
3. Autoriza con Face ID/Touch ID o Apple ID
4. Si es la primera vez, Apple te pedirá permiso para compartir nombre y email

### 3. Verificar en Base de Datos

```sql
-- Ver usuarios OAuth
SELECT email, name, provider, provider_id, avatar_url, created_at
FROM users
WHERE provider IS NOT NULL
ORDER BY created_at DESC;
```

---

## Solución de Problemas

### Error: "redirect_uri_mismatch"

**Problema**: Google devuelve error de redirect URI no coincidente.

**Solución**:
1. Verifica que el redirect URI en Google Cloud Console coincida exactamente con:
   ```
   https://tu-dominio.com/auth/oauth-callback.html
   ```
2. Incluye también con parámetro:
   ```
   https://tu-dominio.com/auth/oauth-callback.html?provider=google
   ```

### Error: "Token inválido o expirado"

**Problema**: Apple token no es válido.

**Solución**:
1. Verifica que el `APPLE_PRIVATE_KEY` esté correctamente formateado
2. Asegúrate de que el Key ID coincida con la clave descargada
3. Verifica que el Service ID sea correcto

### Error: "Popup bloqueado"

**Problema**: El navegador bloquea el popup de OAuth.

**Solución**:
1. Asegúrate de que el usuario haga clic directamente en el botón (no programáticamente)
2. Verifica que no haya bloqueadores de popup activados

### Error: "Código de registro requerido" siempre aparece

**Problema**: El backend no recibe el código de registro.

**Solución**:
1. Verifica que `REGISTRATION_CODE` esté definido en `.env`
2. Verifica que el código enviado coincida exactamente
3. Revisa los logs del backend para ver qué código se está recibiendo

### Error: Usuarios OAuth no pueden hacer login

**Problema**: Usuario OAuth existe pero no puede hacer login.

**Solución**:
1. Verifica que `password` permita NULL en la base de datos:
   ```sql
   ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
   ```
2. Verifica que el `provider_id` se esté guardando correctamente

---

## Checklist de Implementación

- [ ] Crear proyecto en Google Cloud Console
- [ ] Configurar Google OAuth 2.0 credentials
- [ ] Crear App ID en Apple Developer
- [ ] Crear Service ID en Apple Developer
- [ ] Crear Private Key en Apple Developer
- [ ] Añadir variables de entorno al `.env`
- [ ] Ejecutar migración de base de datos `add-oauth.sql`
- [ ] Instalar dependencias: `npm install`
- [ ] Configurar CORS para dominios OAuth
- [ ] Probar Google OAuth en desarrollo
- [ ] Probar Apple Sign In en desarrollo
- [ ] Probar flujo de registro con código
- [ ] Desplegar a producción
- [ ] Configurar redirect URIs de producción
- [ ] Probar en producción

---

## Referencias

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [OAuth 2.0 Specification](https://oauth.net/2/)

---

## Soporte

Para problemas o consultas:
**Email:** benitezl@go.ugr.es
**Proyecto:** Producción Escrita C2 - CLM Universidad de Granada
