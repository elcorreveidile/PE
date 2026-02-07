# 📘 Guía Paso a Paso - Configurar Apple Sign In

**Objetivo:** Configurar Sign In with Apple para el curso de Producción Escrita C2

**Tiempo estimado:** 20-25 minutos

**Requisito previo:** Cuenta de Apple Developer (gratuita)

---

## 🎯 RESUMEN RÁPIDO

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Acceder a Apple Developer | 2 min |
| 2 | Crear App ID | 5 min |
| 3 | Crear Service ID | 5 min |
| 4 | Crear Private Key (.p8) | 5 min |
| 5 | Copiar credenciales al proyecto | 3 min |

---

## REQUISITOS PREVIOS

### Cuenta de Apple Developer

Antes de comenzar, necesitas:

1. **Apple ID**: Si no tienes, crea uno en: https://appleid.apple.com/
2. **Cuenta de Apple Developer**: Accede a https://developer.apple.com/ e inicia sesión
3. **Autenticación de dos factores**: Debe estar activada en tu Apple ID

⚠️ **Nota:** No necesitas pagar la cuenta de desarrollador ($99/año). La cuenta gratuita es suficiente para Sign In with Apple en la web.

---

## PASO 1: Acceder a Apple Developer

### 1.1 Iniciar Sesión

1. Ve a: **https://developer.apple.com/**

2. Haz clic en **"Account"** en la esquina superior derecha

3. Inicia sesión con tu **Apple ID**

4. Si es tu primera vez, acepta los términos y condiciones

### 1.2 Navegar a Certificates, IDs & Profiles

1. En el menú lateral, busca la sección **"Certificates, Identifiers & Profiles"**

2. Haz clic en **"Identifiers"** (o accede directamente: https://developer.apple.com/account/resources/identifiers/list)

---

## PASO 2: Crear App ID

### 2.1 Crear Nuevo Identificador

1. En la pestaña **"Identifiers"**, haz clic en el botón azul **"+"** (o "Create a new identifier")

2. Selecciona **"App IDs"** y haz clic en **"Continue"**

### 2.2 Configurar App ID

**Paso 1: Register an App ID**

Rellena el formulario:

| Campo | Valor |
|-------|-------|
| **Platform** | iOS, macOS, tvOS, watchOS (selecciona la primera opción) |
| **Description** | Producción Escrita C2 |
| **Bundle ID** | Selecciona **Explicit** |

**Bundle ID (App ID Suffix):**
```
com.cognoscencia.c2
```

⚠️ **Importante:** Anota este Bundle ID. Lo necesitarás más tarde.

Haz clic en **"Continue"**

**Paso 2: Select Capabilities**

1. Busca y marca la casilla **"Sign In with Apple"**

2. Haz clic en **"Continue"**

**Paso 3: Confirm**

1. Verifica la información:
   - Description: Producción Escrita C2
   - Bundle ID: com.cognoscencia.c2
   - Capabilities: Sign In with Apple

2. Haz clic en **"Register"**

3. Verás una confirmación: "App ID registered successfully"

---

## PASO 3: Crear Service ID

### 3.1 Crear Nuevo Service ID

1. En el menú lateral **"Identifiers"**, haz clic en **"+"** nuevamente

2. Esta vez, selecciona **"Services IDs"** y haz clic en **"Continue"**

### 3.2 Configurar Service ID

**Paso 1: Register a Services ID**

Rellena el formulario:

| Campo | Valor |
|-------|-------|
| **Description** | Producción Escrita C2 Web |
| **Bundle ID** | com.cognoscencia.c2 (el mismo que creaste en el Paso 2) |

⚠️ **Crítico:** El Bundle ID debe ser **idéntico** al del App ID.

Haz clic en **"Continue"**

**Paso 2: Configure Sign In with Apple**

1. Marca la casilla **"Sign In with Apple"**

2. Haz clic en el botón **"Configure"** junto a la casilla

### 3.3 Configurar Dominios y Return URLs

Se abrirá un modal. Configura lo siguiente:

**Domains and Subdomains:**
```
cognoscencia.com
www.cognoscencia.com
```

⚠️ **Nota:** Añade ambos (con y sin www)

**Return URLs:**
```
https://www.cognoscencia.com/auth/oauth-callback.html
```

⚠️ **Crítico:**
- Debe ser **HTTPS** (Apple lo requiere)
- Debe incluir `/auth/oauth-callback.html`
- No incluyas parámetros como `?provider=apple`

Haz clic en **"Save"**

**Paso 3: Confirm**

1. Haz clic en **"Continue"**

2. Verifica la información y haz clic en **"Register"**

---

## PASO 4: Crear Private Key

### 4.1 Crear Nueva Clave

1. En el menú lateral, haz clic en **"Keys"** (o accede: https://developer.apple.com/account/resources/keys/list)

2. Haz clic en el botón azul **"+"** (o "Create a new key")

### 4.2 Configurar la Key

**Paso 1: Configure Key**

Rellena el formulario:

| Campo | Valor |
|-------|-------|
| **Key Name** | Sign In with Apple - C2 |

**Key Description:**
```
Clave para Sign In with Apple - Producción Escrita C2
```

⚠️ **Importante:** Anota el nombre de la clave.

Haz clic en **"Continue"**

**Paso 2: Configure Key Capabilities**

1. Marca la casilla **"Sign In with Apple"**

2. Haz clic en **"Configure"** junto a la casilla

3. Selecciona el **App ID** que creaste en el Paso 2:
   - "Producción Escrita C2" (com.cognoscencia.c2)

4. Haz clic en **"Save"**

5. Haz clic en **"Continue"**

**Paso 3: Review**

1. Revisa la configuración:
   - Key Name: Sign In with Apple - C2
   - Sign In with Apple: ✓
   - App ID: Producción Escrita C2

2. Haz clic en **"Register"**

### 4.3 Descargar la Key

⚠️ **MUY IMPORTANTE:** Solo puedes descargar la clave **UNA VEZ**.

1. Verás un mensaje: **"Download Your Key"**

2. Haz clic en el botón **"Download"**

3. Se descargará un archivo llamado: `AuthKey_XXXXXXXXXX.p8`
   - Las `X` son el **Key ID** (10 caracteres alfanuméricos)

4. **Guarda este archivo en un lugar seguro.** No podrás volver a descargarlo.

5. Haz clic en **"Done"**

---

## PASO 5: Obtener las Credenciales

### 5.1 Team ID

1. En Apple Developer, mira en la **esquina superior derecha**

2. Verás tu nombre y un código de 10 caracteres: **Team ID**

Ejemplo: `ABCD123456`

Anótalo: **APPLE_TEAM_ID** = `ABCD123456`

### 5.2 Client ID (Service ID)

Es el **Bundle ID** que creaste en el Paso 2:

```
com.cognoscencia.c2
```

Anótalo: **APPLE_CLIENT_ID** = `com.cognoscencia.c2`

### 5.3 Key ID

1. Ve a **"Keys"** en el menú lateral

2. Busca la clave "Sign In with Apple - C2"

3. Verás una columna **"Key ID"** con un código de 10 caracteres

Ejemplo: `XYZ1234567`

Anótalo: **APPLE_KEY_ID** = `XYZ1234567`

### 5.4 Private Key

1. Abre el archivo `.p8` que descargaste en un editor de texto

2. Verás algo como:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg8FkMNdMfO6nWl5Cx
WqFhWzLrYkqMvPqYQK2ND7rK5M8K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fK
wK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
-----END PRIVATE KEY-----
```

3. Copia **todo el contenido**, incluyendo los encabezados `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`

⚠️ **CRÍTICO:** Guarda esta clave de forma segura. No la compartas ni la subas a repositorios públicos.

---

## PASO 6: Añadir al Proyecto

### 6.1 Abrir archivo .env

1. En tu proyecto, abre el archivo: `backend/.env`

### 6.2 Añadir las variables de entorno

Añade al final del archivo:

```bash
# Apple Sign In
APPLE_CLIENT_ID=com.cognoscencia.c2
APPLE_TEAM_ID=ABCD123456
APPLE_KEY_ID=XYZ1234567
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg8FkMNdMfO6nWl5Cx
WqFhWzLrYkqMvPqYQK2ND7rK5M8K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fK
wK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
K2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKwK2qN4fKw
-----END PRIVATE KEY-----"
```

⚠️ **Reemplaza con tus credenciales reales**

⚠️ **Importante:** El private key debe estar entre comillas dobles `"` y puede contener saltos de línea.

### 6.3 Verificar FRONTEND_URL

Asegúrate de que también tengas:

```bash
FRONTEND_URL=https://www.cognoscencia.com
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de continuar, verifica:

- [ ] Cuenta de Apple Developer creada
- [ ] App ID "Producción Escrita C2" creado con Bundle ID `com.cognoscencia.c2`
- [ ] Sign In with Apple capability añadida al App ID
- [ ] Service ID "Producción Escrita C2 Web" creado
- [ ] Dominio configurado en Service ID (cognoscencia.com y www.cognoscencia.com)
- [ ] Return URL configurada (con `/auth/oauth-callback.html`)
- [ ] Private Key creada y descargada (archivo .p8)
- [ ] Team ID anotado (10 caracteres)
- [ ] Key ID anotado (10 caracteres)
- [ ] Client ID anotado (Bundle ID: com.cognoscencia.c2)
- [ ] Private Key copiada (contenido del .p8)
- [ ] Variables de entorno añadidas al archivo `.env`

---

## 🧪 TESTING LOCAL

### Limitaciones de Apple Sign In

⚠️ **IMPORTANTE:** Apple Sign In **NO funciona en HTTP/localhost**.

Apple **requiere HTTPS** para todas las peticiones de Sign In with Apple.

### Opciones para Testing

**Opción 1: Usar un tunel HTTPS (ngrok)**

1. Instala ngrok: https://ngrok.com/download
2. Ejecuta ngrok en tu puerto local:
   ```bash
   ngrok http 5500
   ```
3. Copia la URL HTTPS que te da ngrok (ej: `https://abc123.ngrok.io`)
4. Añádela temporalmente en Apple Developer:
   - Ve a Service ID → Configure
   - Añade: `abc123.ngrok.io` en Domains
   - Añade: `https://abc123.ngrok.io/auth/oauth-callback.html` en Return URLs
5. Abre tu proyecto usando la URL de ngrok

**Opción 2: Deploy a staging/producción**

1. Despliega tu proyecto a un servicio con HTTPS (Vercel, Netlify, Railway)
2. Configura los dominios de producción en Apple Developer
3. Prueba directamente en producción

**Opción 3: Modo desarrollo de Apple**

Apple ofrece un modo de desarrollo que permite testing sin HTTPS, pero requiere configuración adicional en Xcode. No recomendado para web.

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error: "redirect_uri_mismatch"

**Causa:** La URL de redirección no coincide exactamente.

**Solución:**
1. Verifica que la URL en el error coincida con una de las que configuraste
2. Asegúrate de incluir `/auth/oauth-callback.html` al final
3. Verifica que uses HTTPS (no HTTP)

### Error: "invalid_client"

**Causa:** El Client ID (Bundle ID) es incorrecto.

**Solución:**
1. Verifica que `APPLE_CLIENT_ID` sea `com.cognoscencia.c2`
2. Asegúrate de que el Service ID tenga el mismo Bundle ID que el App ID
3. Verifica que Sign In with Apple esté habilitado en ambos

### Error: "invalid_key" o "invalid_token"

**Causa:** El Private Key no es válida o está mal formateada.

**Solución:**
1. Verifica que el `APPLE_PRIVATE_KEY` incluya los encabezados `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
2. Asegúrate de que la clave esté entre comillas dobles en el `.env`
3. Verifica que el `APPLE_KEY_ID` corresponda a la clave que descargaste
4. Verifica que el `APPLE_TEAM_ID` sea correcto

### Error: "origin_not_allowed"

**Causa:** El dominio no está configurado en Apple Developer.

**Solución:**
1. Ve al Service ID en Apple Developer
2. Haz clic en "Configure" junto a Sign In with Apple
3. Añade tu dominio a "Domains and Subdomains"
4. Asegúrate de incluir tanto con `www` como sin `www`

### Error: "Apple Sign In no funciona en localhost"

**Causa:** Apple requiere HTTPS obligatoriamente.

**Solución:**
Usa ngrok o prueba directamente en producción (ver sección "Testing Local" arriba).

---

## 🔒 SEGURIDAD

### Proteger las Credenciales

⚠️ **CRÍTICO:**

1. **Nunca** commits el archivo `.env` a Git
2. **Nunca** compartas el Private Key (.p8)
3. **Añade `.env` a `.gitignore`**:
   ```bash
   # Environment variables
   .env
   .env.local
   .env.production
   ```

4. **Guarda el .p8 en un lugar seguro** (password manager, drive seguro)

### Rotación de Claves

Si pierdes el Private Key:

1. Ve a Apple Developer → Keys
2. Crea una nueva Key
3. Descarga el nuevo archivo .p8
4. Actualiza `APPLE_PRIVATE_KEY` y `APPLE_KEY_ID` en el `.env`
5. Reinicia el servidor

---

## 📞 ¿NECESITAS AYUDA?

Si tienes problemas en algún paso:

1. **Verifica** que estás usando la misma cuenta de Apple Developer
2. **Verifica** que el Bundle ID sea idéntico en App ID y Service ID
3. **Espera** 5-10 minutos después de crear las credenciales (a veces tardan en propagarse)
4. **Verifica** que tu dominio tenga HTTPS válido (Apple lo requiere estrictamente)

---

## 🎯 SIGUIENTE PASO

Una vez configurado Apple Sign In, el siguiente paso es **ejecutar la migración de base de datos** e **instalar las dependencias**.

¿Continuamos con la migración de base de datos?

---

## 📋 RESUMEN DE CREDENCIALES

Al finalizar, deberás tener:

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| **APPLE_CLIENT_ID** | Bundle ID | `com.cognoscencia.c2` |
| **APPLE_TEAM_ID** | Team ID (10 caracteres) | `ABCD123456` |
| **APPLE_KEY_ID** | Key ID (10 caracteres) | `XYZ1234567` |
| **APPLE_PRIVATE_KEY** | Contenido del .p8 | `-----BEGIN PRIVATE KEY-----...` |

**Recursos útiles:**
- [Apple Developer Portal](https://developer.apple.com/)
- [Sign In with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Managing Your Keys](https://developer.apple.com/help/account/create-keys/)
