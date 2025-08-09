# Validaciones de Expiración en Login

## Descripción

Se han implementado validaciones automáticas en el sistema de autenticación para verificar la expiración de usuarios basada en el campo `time` y el estado `is_active`.

## Validaciones Implementadas

### 1. Validación en Login (`POST /api/auth/login`)

- **Verificación de estado activo**: Si `is_active` es `false`, se rechaza el login
- **Verificación de expiración por tiempo**: Si el campo `time` ha expirado:
  - Se cambia automáticamente `is_active` a `false`
  - Se rechaza el login con mensaje "Cuenta expirada por tiempo límite"
  - Se registra en consola la desactivación automática

### 2. Validación en Verificación de Token (`GET /api/auth/verify-token`)

- **Verificación de expiración por tiempo**: Si el usuario ha expirado:
  - Se cambia automáticamente `is_active` a `false`
  - Se rechaza la verificación con mensaje "Cuenta expirada por tiempo límite"
  - Se registra en consola la desactivación automática

### 3. Validación en Obtención de Perfil (`GET /api/auth/profile`)

- **Verificación de expiración por tiempo**: Si el usuario ha expirado:
  - Se cambia automáticamente `is_active` a `false`
  - Se rechaza la operación con mensaje "Cuenta expirada por tiempo límite"
  - Se registra en consola la desactivación automática

## Flujo de Validación

```
Usuario intenta login → Verificar is_active → Verificar expiración por time
                                    ↓                    ↓
                              Si es false         Si ha expirado
                                    ↓                    ↓
                              Rechazar login    Cambiar is_active a false
                              "Cuenta          Rechazar login
                              desactivada"     "Cuenta expirada"
```

## Código Implementado

### Función `login` en `src/controllers/auth.js`

```javascript
// Verificar si el usuario ha expirado por tiempo
if (user.time && user.isExpired()) {
  console.log(`⚠️ Usuario ${user.username} ha expirado por tiempo límite. Desactivando cuenta...`);
  
  // Cambiar is_active a false
  await user.update({ is_active: false });
  
  return sendError(res, 401, 'Cuenta expirada por tiempo límite');
}
```

### Función `verifyToken` en `src/controllers/auth.js`

```javascript
// Verificar si el usuario ha expirado por tiempo
if (user.time && user.isExpired()) {
  console.log(`⚠️ Usuario ${user.username} ha expirado por tiempo límite durante verificación de token. Desactivando cuenta...`);
  
  // Cambiar is_active a false
  await user.update({ is_active: false });
  
  return sendError(res, 401, 'Cuenta expirada por tiempo límite');
}
```

### Función `getProfile` en `src/controllers/auth.js`

```javascript
// Verificar si el usuario ha expirado por tiempo
if (user.time && user.isExpired()) {
  console.log(`⚠️ Usuario ${user.username} ha expirado por tiempo límite durante obtención de perfil. Desactivando cuenta...`);
  
  // Cambiar is_active a false
  await user.update({ is_active: false });
  
  return sendError(res, 401, 'Cuenta expirada por tiempo límite');
}
```

## Métodos del Modelo User Utilizados

- **`user.isExpired()`**: Verifica si la fecha/hora actual ha superado el campo `time`
- **`user.update(data)`**: Actualiza los campos del usuario en la base de datos

## Respuestas de Error

### Login Rechazado por Cuenta Desactivada
```json
{
  "success": false,
  "message": "Cuenta desactivada",
  "status": 401
}
```

### Login Rechazado por Cuenta Expirada
```json
{
  "success": false,
  "message": "Cuenta expirada por tiempo límite",
  "status": 401
}
```

## Logs de Consola

El sistema registra automáticamente cuando se desactiva una cuenta por expiración:

```
⚠️ Usuario username ha expirado por tiempo límite. Desactivando cuenta...
⚠️ Usuario username ha expirado por tiempo límite durante verificación de token. Desactivando cuenta...
⚠️ Usuario username ha expirado por tiempo límite durante obtención de perfil. Desactivando cuenta...
```

## Script de Prueba

Se ha creado un script de prueba para verificar las validaciones:

```bash
npm run test:login-expiration
```

Este script prueba:
1. Login con usuario normal (sin expiración)
2. Login con usuario expirado
3. Login con usuario inactivo
4. Verificación de token con usuario expirado
5. Obtención de perfil con usuario expirado

## Beneficios

1. **Seguridad automática**: Los usuarios expirados no pueden acceder al sistema
2. **Consistencia de datos**: El campo `is_active` se mantiene sincronizado automáticamente
3. **Auditoría**: Se registran todas las desactivaciones automáticas
4. **Validación en múltiples puntos**: Se verifica la expiración en login, verificación de token y obtención de perfil
5. **Respuesta inmediata**: Los usuarios reciben feedback claro sobre el estado de su cuenta

## Consideraciones

- Las validaciones se ejecutan en cada operación de autenticación
- La desactivación automática es irreversible (requiere intervención manual del administrador)
- Los logs se guardan en consola para facilitar el debugging
- El sistema mantiene la consistencia entre `time` e `is_active`
