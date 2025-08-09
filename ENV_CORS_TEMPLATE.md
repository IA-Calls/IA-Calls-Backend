# 🔒 Template de Configuración CORS para IA Calls Backend

## 📋 Configuración CORS

Este template te ayuda a configurar CORS para permitir requests desde diferentes orígenes, incluyendo tu aplicación Vercel.

## 📄 Variables de Entorno para CORS

```env
# ================================
# CONFIGURACIÓN CORS
# ================================
# URL principal del cliente (desarrollo local)
CLIENT_URL=http://localhost:3000

# URL de tu aplicación Vercel
VERCEL_URL=https://ia-calls.vercel.app

# URLs adicionales separadas por comas (opcional)
# ADDITIONAL_CORS_ORIGINS=https://otro-dominio.com,https://app.miempresa.com

# ================================
# CONFIGURACIÓN DEL SERVIDOR
# ================================
PORT=3000
NODE_ENV=development

# ================================
# CONFIGURACIÓN DE BASE DE DATOS
# ================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# ================================
# CONFIGURACIÓN JWT
# ================================
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion
```

## 🌟 Ejemplo de Configuración Completa

```env
# CORS
CLIENT_URL=http://localhost:3000
VERCEL_URL=https://ia-calls.vercel.app
ADDITIONAL_CORS_ORIGINS=https://staging.ia-calls.com,https://admin.ia-calls.com

# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=postgres
DB_PASSWORD=mi_password_seguro

# JWT
JWT_SECRET=super_secret_jwt_key_change_in_production_minimum_32_chars
```

## 🔧 Cómo Usar

1. **Crear archivo `.env`** en la raíz del proyecto
2. **Copiar el contenido** de arriba
3. **Ajustar las URLs** según tu configuración
4. **Reiniciar el servidor** para aplicar los cambios

## 📱 URLs Configuradas por Defecto

El backend ya está configurado para permitir requests desde:

- ✅ `http://localhost:3000` (desarrollo local)
- ✅ `https://ia-calls.vercel.app` (tu app Vercel)
- ✅ URLs adicionales que agregues en `ADDITIONAL_CORS_ORIGINS`

## 🚀 Verificación

Para verificar que CORS funciona correctamente:

1. **Desde tu app Vercel**: Haz una request a tu backend
2. **Revisa los logs del servidor**: Deberías ver los orígenes permitidos
3. **Verifica en el navegador**: No deberías ver errores de CORS

## 🔍 Debugging

Si tienes problemas de CORS, revisa los logs del servidor:

```bash
# El servidor mostrará:
✅ Orígenes permitidos: http://localhost:3000, https://ia-calls.vercel.app
🚫 CORS bloqueado para origin: https://dominio-no-permitido.com
```

## 📝 Notas Importantes

- **Reinicia el servidor** después de cambiar las variables de entorno
- **Las URLs deben incluir el protocolo** (http:// o https://)
- **Para desarrollo**: `CLIENT_URL=http://localhost:3000`
- **Para producción**: `CLIENT_URL=https://tu-dominio.com`
- **Múltiples URLs**: Sepáralas con comas en `ADDITIONAL_CORS_ORIGINS`
