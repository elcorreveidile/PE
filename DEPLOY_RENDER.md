# 🚀 Desplegar Backend en Render.com

## Pasos para Desplegar

### 1. Crear Cuenta en Render

1. Ve a [render.com](https://render.com)
2. Click en **"Sign Up"**
3. Regístrate con GitHub (recomendado)

### 2. Crear Nuevo Web Service

1. Click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio GitHub: `elcorreveidile/PE`
3. Selecciona la rama: `codex/calendario-2026-min`

### 3. Configurar el Servicio

**Nombre:** `produccion-escrita-c2-api`

**Entorno:** Node

**Comando de Build:**
```bash
cd backend && npm install
```

**Comando de Inicio:**
```bash
cd backend && npm start
```

### 4. Configurar Variables de Entorno

En la sección **"Environment"**, añade estas variables:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_OYgFV3A2IWNy@ep-cool-dream-ag3vppbe-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | `f17d3bf6232cac8f8fae223cb0f0acd1f9f198faa8d009d421d54e33faa3627498998ea1ff0c4dcfaab8c9497260df111541fdff9ffb9bb6f443edc403964b4d` |
| `JWT_EXPIRES_IN` | `7d` |
| `REGISTRATION_CODE` | `PIO7-2026-CLM` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://www.cognoscencia.com` |

### 5. Health Check

**Health Check Path:** `/api/health`

### 6. Desplegar

Click en **"Create Web Service"**

Render automáticamente:
1. Clonará tu repositorio
2. Instalará las dependencias
3. Iniciará el servidor
4. Asignará una URL como: `https://produccion-escrita-c2-api.onrender.com`

---

## ✅ Verificar el Despliegue

1. Abre la URL que te dio Render
2. Prueba: `https://tu-url.onrender.com/api/health`
3. Deberías ver:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2026-02-05T...",
  "environment": "production"
}
```

---

## 🔗 Actualizar el Frontend

Una vez que tengas la URL de Render (ej: `https://produccion-escrita-c2-api.onrender.com`):

### Opción A: Automático (recomendado)

El frontend detectará automáticamente la API si hace el health check correctamente.

### Opción B: Manual

Si necesitas configurar manualmente, edita `js/app.js`:

```javascript
// Línea ~50
API_URL: 'https://produccion-escrita-c2-api.onrender.com',
```

---

## 🌐 Configurar Dominio Custom (Opcional)

Para usar `api.cognoscencia.com`:

1. En tu servicio de Render, ve a **"Settings"** → **"Custom Domains"**
2. Añade: `api.cognoscencia.com`
3. Render te dará un CNAME para añadir en tu DNS

---

## ⚠️ Notas Importantes

- **Plan Gratuito:** El servicio se "duerme" después de 15 minutos de inactividad
- **Despertar:** Tarda ~30 segundos en despertar la primera vez
- **Logs:** Puedes ver los logs en tiempo real en el dashboard de Render
- **Base de datos:** Neon ya está configurado y funcionando

---

## 🐛 Troubleshooting

**Error: "Cannot find module"**
→ Asegúrate de que el build command sea: `cd backend && npm install`

**Error: "Database connection failed"**
→ Verifica que `DATABASE_URL` esté correcta en Environment Variables

**Error: "Port already in use"**
→ Render asigna el puerto automáticamente via `process.env.PORT`

**Health check falla**
→ Verifica que el comando de inicio sea: `cd backend && npm start`

---

## 📞 Soporte

- Render Dashboard: [dashboard.render.com](https://dashboard.render.com)
- Docs: [render.com/docs](https://render.com/docs)
- Status: [status.render.com](https://status.render.com)
