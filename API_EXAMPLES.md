# 🎯 Ejemplos de Uso de la API

## 📋 Endpoints Disponibles

### 🔓 **Endpoints Públicos** (No requieren autenticación)

#### 1. **Información del API**
```bash
curl -X GET http://localhost:3000/
```

#### 2. **Estado del Servidor**
```bash
curl -X GET http://localhost:3000/api/status
```

#### 3. **Health Check**
```bash
curl -X GET http://localhost:3000/api/health
```

#### 4. **Registro de Usuario**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### 5. **Login de Usuario**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 6. **Verificar Token**
```bash
curl -X POST http://localhost:3000/api/auth/verify-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 🔐 **Endpoints Protegidos** (Requieren autenticación)

> **Nota**: Para todos los endpoints protegidos, incluye el header: `Authorization: Bearer TU_TOKEN_AQUI`

#### 7. **Obtener Perfil**
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### 8. **Actualizar Perfil**
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "email": "john.updated@example.com"
  }'
```

#### 9. **Cambiar Contraseña**
```bash
curl -X PUT http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }'
```

#### 10. **Ruta Protegida de Ejemplo**
```bash
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### 11. **Información del Usuario Actual**
```bash
curl -X GET http://localhost:3000/api/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### 12. **Logout**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🧪 Usuarios de Prueba

Puedes usar estos usuarios para probar inmediatamente:

### Usuario Admin:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@iacalls.com",
    "password": "admin123"
  }'
```

### Usuario Normal:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@iacalls.com",
    "password": "test123"
  }'
```

## 📱 Ejemplos con JavaScript/Fetch

### Login y Obtener Token:
```javascript
// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@iacalls.com',
    password: 'admin123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Usar token para obtener perfil
const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const profileData = await profileResponse.json();
console.log(profileData);
```

### Registro de Usuario:
```javascript
const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'newuser',
    email: 'new@example.com',
    password: 'password123',
    firstName: 'Nuevo',
    lastName: 'Usuario'
  })
});

const registerData = await registerResponse.json();
console.log(registerData);
```

## 🐛 Respuestas de Error Comunes

### Token Inválido o Expirado:
```json
{
  "success": false,
  "error": "Token inválido",
  "message": "El token proporcionado no es válido"
}
```

### Credenciales Incorrectas:
```json
{
  "success": false,
  "error": "Credenciales inválidas",
  "message": "Email o contraseña incorrectos"
}
```

### Usuario ya Existe:
```json
{
  "success": false,
  "error": "Ya existe un usuario con este email",
  "message": "El email ya está registrado"
}
```

### Campos Requeridos:
```json
{
  "success": false,
  "error": "Campos requeridos faltantes",
  "message": "Username, email y password son requeridos"
}
```

## 🔧 Herramientas Recomendadas

### 1. **Postman**
- Importar colección con todos los endpoints
- Configurar variables de entorno para el token
- Pruebas automatizadas

### 2. **Thunder Client** (VS Code)
- Extensión para VS Code
- Interfaz simple y limpia
- Guarda automáticamente las peticiones

### 3. **curl**
- Línea de comandos
- Perfecto para scripts automatizados
- Ejemplos incluidos arriba

### 4. **HTTPie**
```bash
# Instalar HTTPie
pip install httpie

# Ejemplo de uso
http POST localhost:3000/api/auth/login email=admin@iacalls.com password=admin123
```

## 🎯 Flujo de Trabajo Típico

1. **Registro o Login** → Obtener token
2. **Guardar token** → Para peticiones futuras
3. **Usar token** → En header Authorization
4. **Verificar token** → Antes de operaciones importantes
5. **Renovar token** → Cuando expire (24h)

## 📊 Monitoreo y Logs

El sistema registra automáticamente:
- Logins exitosos
- Registros de usuarios
- Cambios de contraseña
- Actualizaciones de perfil
- Accesos a rutas protegidas

Puedes ver los logs en la tabla `activity_logs` de la base de datos.

## 🚀 Próximos Pasos

1. ✅ Probar endpoints básicos
2. ✅ Implementar autenticación en frontend
3. 🔄 Agregar refresh tokens
4. 🔄 Implementar roles y permisos
5. 🔄 Agregar validación de esquemas
6. 🔄 Implementar rate limiting 