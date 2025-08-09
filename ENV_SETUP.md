# 🚀 Configuración de Variables de Entorno - IA Calls Backend

## 📋 Variables Requeridas

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

### 🔐 Base de Datos
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls
DB_USER=your_username
DB_PASSWORD=your_password
```

### 🌐 URLs y CORS
```bash
CLIENT_URL=http://localhost:3000
VERCEL_URL=https://ia-calls.vercel.app
ADDITIONAL_CORS_ORIGINS=https://gb334706-5000.use2.devtunnels.ms
```

### ⚙️ Servidor
```bash
PORT=5000
NODE_ENV=development
```

### 🔑 JWT
```bash
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

### ☁️ Google Cloud (opcional)
```bash
GOOGLE_APPLICATION_CREDENTIALS=./clave_gcp.json
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name
```

## 🚨 Solución al Error 502 Bad Gateway

### Problema Identificado
El error `502 Bad Gateway` para requests `OPTIONS` indica un problema en el proxy/gateway, no en tu aplicación.

### Soluciones Implementadas

1. **CORS Mejorado**: Se agregó manejo específico para requests `OPTIONS`
2. **Headers Expandidos**: Se incluyeron todos los headers necesarios
3. **Logging Detallado**: Se agregaron logs para debugging
4. **Manejo de Preflight**: Se implementó respuesta inmediata para OPTIONS

### Pasos para Resolver

1. **Crear archivo `.env`** con las variables de arriba
2. **Reiniciar el servidor** después de crear el `.env`
3. **Verificar logs** del servidor para ver requests OPTIONS
4. **Probar CORS** con el script de testing

### Testing de CORS

```bash
npm run test:cors
```

### Verificación Manual

1. **Frontend**: Hacer request desde `https://ia-calls.vercel.app/`
2. **Backend**: Verificar logs en consola
3. **Network**: Revisar headers en DevTools

## 🔍 Debugging

### Logs a Verificar
- `🔍 OPTIONS request detectado para: /api/auth/login`
- `📋 Headers de la request: {...}`
- `✅ CORS: Origin permitido: https://ia-calls.vercel.app`

### Headers Esperados
```
Access-Control-Allow-Origin: https://ia-calls.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

## 🚀 Comandos de Inicio

```bash
# Instalar dependencias
npm install

# Crear archivo .env
cp ENV_SETUP.md .env
# Editar .env con tus valores

# Iniciar servidor
npm start

# Testing
npm run test:cors
npm run test:expiration
```

## 📞 Soporte

Si el error 502 persiste:
1. Verificar que el servidor esté corriendo
2. Revisar logs del servidor
3. Verificar configuración del proxy/gateway
4. Probar con Postman o curl para aislar el problema
