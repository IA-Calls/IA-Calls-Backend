# Ejemplos cURL - Sistema de Autenticación Facebook/Meta

Este documento contiene ejemplos prácticos de todas las operaciones disponibles en el sistema de autenticación con Facebook/Meta.

## 🔧 Configuración Inicial

```bash
# Variables de entorno (configúralas primero)
export API_URL="https://tudominio.com"
export JWT_TOKEN="tu_token_jwt_aqui"
```

## 1️⃣ Iniciar Flujo OAuth

### Generar URL de Autorización
```bash
curl -X GET "${API_URL}/api/auth/facebook/start" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "redirectUrl": "https://www.facebook.com/v19.0/dialog/oauth?client_id=123456789&redirect_uri=https%3A%2F%2Ftudominio.com%2Fapi%2Fauth%2Ffacebook%2Fcallback&response_type=code&scope=pages_show_list%2Cpages_read_engagement%2Cpages_manage_posts%2Cpages_manage_metadata%2Cpages_messaging",
  "message": "Redirige al usuario a esta URL para autorizar"
}
```

### Uso desde navegador:
```javascript
// En tu aplicación frontend
const response = await fetch('https://tudominio.com/api/auth/facebook/start', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Redirigir al usuario
window.location.href = data.redirectUrl;
```

---

## 2️⃣ Callback (Automático desde Facebook)

Este endpoint es llamado automáticamente por Facebook después de que el usuario autoriza la aplicación. No necesitas llamarlo manualmente.

**URL de callback configurada en Meta:**
```
https://tudominio.com/api/auth/facebook/callback
```

**Ejemplo de URL que recibe el backend:**
```
https://tudominio.com/api/auth/facebook/callback?code=AQBa3xY...&state=optional_state
```

**Facebook redirige al usuario a:**
```
https://tufrontend.com/auth/facebook/selection?session=eyJ1c2VySWQiOi...&pages=%5B%7B%22id%22...
```

---

## 3️⃣ Obtener Datos de Sesión

Después de que el usuario es redirigido desde Facebook al frontend, usa el `sessionToken` para obtener los datos completos:

```bash
# Reemplaza SESSION_TOKEN con el valor recibido en la URL
export SESSION_TOKEN="eyJ1c2VySWQiOiIxMjM0..."

curl -X GET "${API_URL}/api/auth/facebook/session/${SESSION_TOKEN}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "user": {
      "facebook_user_id": "1234567890",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "pages": [
      {
        "page_id": "111222333444555",
        "page_name": "Mi Tienda Online",
        "page_category": "E-commerce",
        "page_access_token": "EAAa1b2c3d4e5f6g7h8i9j0k...",
        "tasks": ["MANAGE", "CREATE_CONTENT", "MODERATE", "MESSAGING"]
      },
      {
        "page_id": "666777888999000",
        "page_name": "Blog Personal",
        "page_category": "Personal Blog",
        "page_access_token": "EAAz9y8x7w6v5u4t3s2r1q...",
        "tasks": ["MANAGE", "CREATE_CONTENT", "MESSAGING"]
      }
    ],
    "token_expires_at": "2025-02-13T10:30:00.000Z"
  }
}
```

---

## 4️⃣ Almacenar Token de Página Seleccionada

Después de que el usuario selecciona una página en el frontend:

```bash
curl -X POST "${API_URL}/api/auth/facebook/storePageToken" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "'"${SESSION_TOKEN}"'",
    "pageId": "111222333444555"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Token de página almacenado exitosamente",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
    "page_id": "111222333444555",
    "page_name": "Mi Tienda Online",
    "page_category": "E-commerce",
    "created_at": "2025-12-15T10:30:00.000Z"
  }
}
```

---

## 5️⃣ Gestión de Páginas Conectadas

### Listar todas las páginas conectadas

```bash
curl -X GET "${API_URL}/api/auth/facebook/pages" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
      "page_id": "111222333444555",
      "page_name": "Mi Tienda Online",
      "page_category": "E-commerce",
      "is_active": true,
      "last_sync": "2025-12-15T09:00:00.000Z",
      "created_at": "2025-12-10T10:30:00.000Z"
    },
    {
      "id": "z9y8x7w6-v5u4-3210-t9s8-r7q6p5o4n3m2",
      "page_id": "666777888999000",
      "page_name": "Blog Personal",
      "page_category": "Personal Blog",
      "is_active": true,
      "last_sync": "2025-12-14T15:20:00.000Z",
      "created_at": "2025-12-05T08:15:00.000Z"
    }
  ]
}
```

### Validar token de una página específica

```bash
export PAGE_ID="a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"

curl -X GET "${API_URL}/api/auth/facebook/pages/${PAGE_ID}/validate" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Respuesta esperada (token válido):**
```json
{
  "success": true,
  "data": {
    "page_id": "111222333444555",
    "page_name": "Mi Tienda Online",
    "is_valid": true,
    "expires_at": 0,
    "scopes": [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_metadata",
      "pages_messaging"
    ]
  }
}
```

**Respuesta esperada (token inválido):**
```json
{
  "success": true,
  "data": {
    "page_id": "111222333444555",
    "page_name": "Mi Tienda Online",
    "is_valid": false,
    "expires_at": null,
    "scopes": []
  }
}
```

### Desconectar una página

```bash
curl -X DELETE "${API_URL}/api/auth/facebook/pages/${PAGE_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Página desconectada exitosamente"
}
```

---

## 🔄 Flujo Completo de Ejemplo

```bash
#!/bin/bash

# Configuración
export API_URL="https://tudominio.com"
export JWT_TOKEN="tu_token_jwt_aqui"

echo "1️⃣ Iniciando flujo OAuth..."
START_RESPONSE=$(curl -s -X GET "${API_URL}/api/auth/facebook/start" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

REDIRECT_URL=$(echo $START_RESPONSE | jq -r '.redirectUrl')
echo "   URL de autorización: ${REDIRECT_URL}"
echo "   👉 Abre esta URL en tu navegador para autorizar"
echo ""

# El usuario autoriza en el navegador...
# Facebook redirige a: https://tufrontend.com/auth/facebook/selection?session=ABC123&pages=[...]

echo "2️⃣ Después de autorizar, obtendrás un sessionToken en la URL del frontend"
read -p "   Ingresa el sessionToken: " SESSION_TOKEN
echo ""

echo "3️⃣ Obteniendo datos de sesión..."
SESSION_DATA=$(curl -s -X GET "${API_URL}/api/auth/facebook/session/${SESSION_TOKEN}" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

echo "$SESSION_DATA" | jq '.'
echo ""

echo "4️⃣ Páginas disponibles:"
echo "$SESSION_DATA" | jq -r '.data.pages[] | "   - [\(.page_id)] \(.page_name) (\(.page_category))"'
echo ""

read -p "   Ingresa el page_id que quieres conectar: " SELECTED_PAGE_ID
echo ""

echo "5️⃣ Almacenando token de página..."
STORE_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/facebook/storePageToken" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionToken\": \"${SESSION_TOKEN}\",
    \"pageId\": \"${SELECTED_PAGE_ID}\"
  }")

echo "$STORE_RESPONSE" | jq '.'
echo ""

echo "6️⃣ Listando páginas conectadas..."
LIST_RESPONSE=$(curl -s -X GET "${API_URL}/api/auth/facebook/pages" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

echo "$LIST_RESPONSE" | jq '.'
echo ""

echo "✅ Flujo completado exitosamente!"
```

---

## 🧪 Testing en Desarrollo

### Configuración local

```bash
# Variables para desarrollo local
export API_URL="http://localhost:5001"
export JWT_TOKEN="tu_token_de_desarrollo"

# Asegúrate de que tu .env tenga:
# FACEBOOK_APP_ID=tu_app_id
# FACEBOOK_APP_SECRET=tu_app_secret
# REDIRECT_URI=http://localhost:5001/api/auth/facebook/callback
# FRONTEND_URL=http://localhost:3000
```

### Probar endpoints protegidos

```bash
# Verificar que el JWT sea válido
curl -X GET "${API_URL}/api/me" \
  -H "Authorization: Bearer ${JWT_TOKEN}"
```

---

## ⚠️ Manejo de Errores

### Error: Usuario no autenticado
```json
{
  "success": false,
  "message": "Usuario no autenticado"
}
```
**Solución:** Verifica que el token JWT sea válido y esté incluido en el header.

### Error: Sesión no encontrada o expirada
```json
{
  "success": false,
  "message": "Sesión no encontrada o expirada"
}
```
**Solución:** Las sesiones expiran en 10 minutos. Reinicia el flujo desde `/start`.

### Error: Página no encontrada
```json
{
  "success": false,
  "message": "Página no encontrada o no pertenece al usuario"
}
```
**Solución:** Verifica que el `page_id` o `id` sea correcto y pertenezca al usuario autenticado.

### Error: Token inválido de Facebook
```json
{
  "success": false,
  "message": "Error al intercambiar código de autorización"
}
```
**Solución:** 
- Verifica que `FACEBOOK_APP_ID` y `FACEBOOK_APP_SECRET` sean correctos
- Asegúrate de que el `code` no haya expirado (válido por ~10 minutos)
- Verifica que `REDIRECT_URI` coincida con la configuración en Meta

---

## 📚 Notas Adicionales

1. **Tokens JWT:** Todos los endpoints (excepto `/callback`) requieren un token JWT válido del usuario autenticado en tu sistema.

2. **Session Token:** Es temporal (10 minutos) y se usa únicamente para vincular el flujo OAuth con el almacenamiento del token de página.

3. **Page Access Tokens:** Son de larga duración (no expiran) pero pueden invalidarse si el usuario revoca permisos.

4. **Rate Limits:** Meta impone límites de tasa. En producción, considera implementar caché y reintentos.

5. **Testing:** Usa [Graph API Explorer](https://developers.facebook.com/tools/explorer/) para probar manualmente los tokens.

