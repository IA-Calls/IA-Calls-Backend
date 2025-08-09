# 🚨 Solución al Error 502 Bad Gateway

## 📋 Descripción del Problema

**Error**: `502 Bad Gateway` para requests `OPTIONS` a `https://gb334706-5000.use2.devtunnels.ms/api/auth/login`

**Síntoma**: El navegador no puede completar la solicitud CORS preflight, causando fallos en el frontend.

## 🔍 Análisis del Problema

### ¿Qué es un Error 502?
Un error `502 Bad Gateway` indica que el servidor proxy/gateway recibió una respuesta inválida del servidor backend. Esto sugiere que el problema está en la capa de proxy, no en tu aplicación.

### ¿Por qué OPTIONS Falla?
Los requests `OPTIONS` son parte del mecanismo CORS preflight que:
1. El navegador envía antes de la request real
2. Verifica si el servidor permite el origen
3. Si falla, bloquea la request principal

## 🛠️ Soluciones Implementadas

### 1. CORS Mejorado en `src/app.js`
```javascript
// Middleware específico para manejar OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`🔍 OPTIONS request detectado para: ${req.path}`);
    
    // Configurar headers de CORS para OPTIONS
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 horas
    
    // Responder inmediatamente a OPTIONS
    return res.status(200).end();
  }
  next();
});
```

### 2. Configuración CORS Expandida
```javascript
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'https://ia-calls.vercel.app',
      'https://gb334706-5000.use2.devtunnels.ms',
      ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(',') : [])
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
```

## 🚀 Pasos para Resolver

### Paso 1: Crear Archivo `.env`
```bash
# Crear archivo .env en la raíz del proyecto
CLIENT_URL=http://localhost:3000
VERCEL_URL=https://ia-calls.vercel.app
ADDITIONAL_CORS_ORIGINS=https://gb334706-5000.use2.devtunnels.ms
PORT=5000
NODE_ENV=development
```

### Paso 2: Reiniciar el Servidor
```bash
# Detener el servidor actual (Ctrl+C)
# Luego reiniciar
npm start
```

### Paso 3: Verificar Logs
Busca estos logs en la consola:
```
🔍 OPTIONS request detectado para: /api/auth/login
📋 Headers de la request: {...}
✅ CORS: Origin permitido: https://ia-calls.vercel.app
```

### Paso 4: Probar CORS
```bash
npm run test:cors-fix
```

## 🔧 Testing y Verificación

### Script de Testing Automático
```bash
npm run test:cors-fix
```

Este script prueba:
- ✅ OPTIONS requests (CORS preflight)
- ✅ GET requests simples
- ✅ POST requests con CORS
- ✅ Verificación de headers CORS

### Testing Manual con cURL
```bash
# Test OPTIONS request
curl -X OPTIONS \
  -H "Origin: https://ia-calls.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v https://gb334706-5000.use2.devtunnels.ms/api/auth/login

# Test POST request
curl -X POST \
  -H "Origin: https://ia-calls.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v https://gb334706-5000.use2.devtunnels.ms/api/auth/login
```

## 🚨 Si el Error 502 Persiste

### 1. Verificar Estado del Servidor
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:5000/api/status

# Verificar logs del servidor
# Buscar errores o warnings
```

### 2. Verificar Configuración del Proxy
El error 502 puede ser causado por:
- **Azure DevTunnels**: Configuración incorrecta del túnel
- **Firewall**: Bloqueo de puertos o IPs
- **Load Balancer**: Configuración incorrecta
- **SSL/TLS**: Problemas de certificados

### 3. Verificar Variables de Entorno
```bash
# Verificar que las variables estén cargadas
node -e "console.log('CLIENT_URL:', process.env.CLIENT_URL)"
node -e "console.log('VERCEL_URL:', process.env.VERCEL_URL)"
```

### 4. Testing Local vs Deployed
```bash
# Test local
curl -X OPTIONS http://localhost:5000/api/auth/login

# Test deployed
curl -X OPTIONS https://gb334706-5000.use2.devtunnels.ms/api/auth/login
```

## 📊 Diagnóstico del Problema

### Síntomas y Causas

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| 502 en OPTIONS | Proxy/gateway | Verificar configuración del túnel |
| CORS bloqueado | Headers incorrectos | Verificar middleware CORS |
| Timeout | Servidor no responde | Verificar estado del servidor |
| SSL errors | Certificados | Verificar configuración HTTPS |

### Logs a Monitorear
```
🔍 OPTIONS request detectado para: /api/auth/login
📋 Headers de la request: {...}
✅ CORS: Origin permitido: https://ia-calls.vercel.app
🚫 CORS bloqueado para origin: [origin]
❌ Error en OPTIONS request: [error]
```

## 🎯 Resumen de la Solución

1. **CORS Configurado**: Se implementó manejo específico para OPTIONS
2. **Headers Expandidos**: Se incluyeron todos los headers necesarios
3. **Logging Detallado**: Se agregaron logs para debugging
4. **Testing Automatizado**: Se creó script de testing completo
5. **Documentación**: Se proporcionó guía paso a paso

## 📞 Próximos Pasos

1. **Crear archivo `.env`** con las variables necesarias
2. **Reiniciar el servidor** para aplicar cambios
3. **Ejecutar tests** con `npm run test:cors-fix`
4. **Verificar logs** del servidor
5. **Probar desde el frontend** en `https://ia-calls.vercel.app/`

Si el error 502 persiste después de estos pasos, el problema está en la configuración del proxy/gateway (Azure DevTunnels) y no en tu aplicación.
