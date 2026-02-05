# 🚀 Desplegar en Fly.io

## Requisitos Previos

1. Tener cuenta en Fly.io
2. Fly CLI instalado
3. Haber iniciado sesión con `flyctl auth login`

---

## PASO 1: Crear Nueva App en Fly.io

En la terminal, en la raíz del proyecto:

```bash
cd /Users/blablaele/Desktop/AI/PE
flyctl launch
```

**Responde las preguntas:**

1. ¿Crear nueva app? → **`y`**
2. Nombre de la app? → **`produccion-escrita-c2-api`** (o presiona Enter)
3. Región? → **`Madrid, Spain (mad)`** (escribe `mad`)
4. ¿Añadir base de datos? → **`N`** (ya tienes Neon)
5. ¿Crear Dockerfile? → **`N`** (ya lo creamos)

---

## PASO 2: Configurar Variables de Entorno

```bash
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:npg_OYgFV3A2IWNy@ep-cool-dream-ag3vppbe-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

flyctl secrets set JWT_SECRET="f17d3bf6232cac8f8fae223cb0f0acd1f9f198faa8d009d421d54e33faa3627498998ea1ff0c4dcfaab8c9497260df111541fdff9ffb9bb6f443edc403964b4d"

flyctl secrets set REGISTRATION_CODE="PIO7-2026-CLM"

flyctl secrets set FRONTEND_URL="https://www.cognoscencia.com"

flyctl secrets set CORS_ORIGIN="https://www.cognoscencia.com,https://elcorreveidile.github.io"
```

---

## PASO 3: Desplegar

```bash
flyctl deploy
```

Esto tomará 2-3 minutos.

---

## PASO 4: Obtener la URL

Cuando termine, verás algo como:

```
==> Building image...
==> Deploying...
Successful!
Your app is now live at: https://produccion-escrita-c2-api.fly.dev
```

📌 **Copia esa URL** - la necesitarás después.

---

## PASO 5: Verificar que Funciona

```bash
curl https://produccion-escrita-c2-api.fly.dev/api/health
```

Deberías ver:
```json
{
  "success": true,
  "message": "API funcionando correctamente"
}
```

---

## PASO 6: Actualizar Frontend

Edita `index.html` (línea 617):

```javascript
API_URL: 'https://produccion-escrita-c2-api.fly.dev'
```

Guarda, haz commit y push.

---

## 🎯 Comandos Útiles

```bash
# Ver logs en tiempo real
flyctl logs

# Ver estado de la app
flyctl status

# Abrir la app en el navegador
flyctl open

# Verificar que esté corriendo
flyctl ps
```

---

## ✅ Costo

- **CPU/Memory:** Gratis hasta 3 small VMs
- **Bandwidth:** 160GB salida/mes gratis
- **SIN tarjeta de crédito**

---

## 🐛 Troubleshooting

**Error: "Could not resolve App"**
→ Espera 30 segundos después de `flyctl launch` y vuelve a intentar `flyctl deploy`

**Error: "Database connection failed"**
→ Verifica que configuraste el secret DATABASE_URL correctamente

**Health check falla**
→ Verifica que el puerto sea 8080 en fly.toml

---

## 📞 Ayuda

- Fly.io Docs: https://fly.io/docs/
- Community: https://community.fly.io/
