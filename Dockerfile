# Dockerfile para Fly.io
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY backend/package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY backend/src ./src

# Exponer puerto
EXPOSE 8080

# Iniciar aplicación
CMD ["node", "src/app.js"]
