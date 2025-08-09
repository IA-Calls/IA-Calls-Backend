# 🚀 Instrucciones de Despliegue - IA-Calls Backend

## 📋 Preparación del Build

Este proyecto ha sido optimizado para producción con los siguientes archivos:

- `package.json` - Optimizado para producción
- `start.js` - Script de inicio optimizado
- `.env.production` - Variables de entorno para producción
- `ecosystem.config.js` - Configuración de PM2
- `logs/` - Directorio para logs

## 🚀 Opciones de Despliegue

### Opción 1: Despliegue Simple
```bash
# Instalar dependencias de producción
npm install --production

# Iniciar servidor
npm start
```

### Opción 2: Con PM2 (Recomendado)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Instalar dependencias
npm install --production

# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Ver logs
pm2 logs ia-calls-backend

# Monitorear
pm2 monit
```

### Opción 3: Con Docker
```bash
# Crear Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
```

## ⚙️ Configuración

1. **Editar variables de entorno:**
   - Modificar `.env.production` con tus valores reales

2. **Configurar base de datos:**
   - Asegúrate de que la base de datos esté configurada

3. **Configurar Google Cloud Storage:**
   - Actualizar credenciales en `.env.production`

## 📊 Monitoreo

- **Logs:** Revisar archivos en `logs/`
- **PM2:** `pm2 monit` para monitoreo en tiempo real
- **Health Check:** `GET /api/health`

## 🔧 Mantenimiento

- **Reiniciar:** `pm2 restart ia-calls-backend`
- **Actualizar:** `pm2 reload ia-calls-backend`
- **Detener:** `pm2 stop ia-calls-backend`

## 📞 Soporte

Para problemas o consultas, revisar:
- Logs de aplicación
- Logs de PM2
- Configuración de variables de entorno

---
Generado el: 9/8/2025, 6:12:46 p. m.
