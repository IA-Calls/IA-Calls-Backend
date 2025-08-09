# API de Expiración de Usuarios

Esta documentación describe la funcionalidad de expiración automática de usuarios implementada en el sistema.

## Descripción General

El sistema ahora incluye un campo opcional `time` (deadline) para los usuarios, que permite establecer una fecha límite para la desactivación automática. Cuando llega esta fecha, el usuario se desactiva automáticamente.

## Campo `time`

- **Tipo**: `TIMESTAMP WITH TIME ZONE` (opcional)
- **Descripción**: Fecha límite para la desactivación automática del usuario
- **Formato**: ISO 8601 (ej: `"2024-12-31T23:59:59.000Z"`)
- **Validación**: Debe ser una fecha futura

## Nuevos Endpoints

### 1. Crear Usuario con Deadline

**POST** `/api/users`

```json
{
  "username": "usuario_temporal",
  "email": "temp@example.com",
  "password": "password123",
  "firstName": "Usuario",
  "lastName": "Temporal",
  "role": "user",
  "time": "2024-12-31T23:59:59.000Z"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": 123,
    "username": "usuario_temporal",
    "email": "temp@example.com",
    "firstName": "Usuario",
    "lastName": "Temporal",
    "role": "user",
    "isActive": true,
    "time": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### 2. Obtener Usuarios con Filtros de Expiración

**GET** `/api/users?includeExpired=true&expiringSoon=7`

**Parámetros de consulta:**
- `includeExpired`: `true` para incluir usuarios expirados
- `expiringSoon`: Número de días para filtrar usuarios próximos a expirar

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "message": "Usuarios obtenidos exitosamente",
  "data": {
    "users": [
      {
        "id": 123,
        "username": "usuario_temporal",
        "time": "2024-12-31T23:59:59.000Z",
        "isActive": true
      }
    ],
    "pagination": { ... },
    "filters": {
      "includeExpired": true,
      "expiringSoon": "7"
    }
  }
}
```

### 3. Desactivar Usuarios Expirados

**POST** `/api/users/deactivate-expired`

**Acceso**: Solo administradores

**Respuesta:**
```json
{
  "success": true,
  "message": "2 usuarios expirados han sido desactivados",
  "data": {
    "deactivatedCount": 2,
    "deactivatedUsers": [
      {
        "id": 123,
        "username": "usuario_expirado",
        "isActive": false
      }
    ]
  }
}
```

### 4. Obtener Usuarios Próximos a Expirar

**GET** `/api/users/expiring-soon?days=7`

**Parámetros:**
- `days`: Número de días (1-30, por defecto 7)

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuarios próximos a expirar obtenidos exitosamente",
  "data": {
    "users": [...],
    "daysThreshold": 7,
    "count": 3
  }
}
```

### 5. Estadísticas de Expiración

**GET** `/api/users/stats/expiration`

**Acceso**: Solo administradores

**Respuesta:**
```json
{
  "success": true,
  "message": "Estadísticas de usuarios obtenidas exitosamente",
  "data": {
    "total": 100,
    "active": 85,
    "inactive": 15,
    "withDeadline": 20,
    "expiringSoon": 5,
    "expired": 3,
    "withoutDeadline": 80
  }
}
```

## Funcionalidades del Modelo

### Métodos de Instancia

- `user.isExpired()`: Verifica si el usuario ha expirado
- `user.isActiveAndNotExpired()`: Verifica si está activo y no ha expirado

### Métodos Estáticos

- `User.deactivateExpiredUsers()`: Desactiva todos los usuarios expirados
- `User.getUsersExpiringSoon(days)`: Obtiene usuarios próximos a expirar
- `User.findAll({ includeExpired: false })`: Filtra usuarios por estado de expiración

## Migración de Base de Datos

Para aplicar los cambios a la base de datos existente:

```bash
npm run migrate:time
```

Este comando:
1. Agrega el campo `time` a la tabla `users`
2. Crea un índice para optimizar consultas
3. Crea una función para desactivación automática
4. Verifica que los cambios se aplicaron correctamente

## Automatización

### Función de Desactivación Automática

El sistema incluye una función SQL `deactivate_expired_users()` que puede ser ejecutada manualmente o programada.

### Job Programado (Opcional)

Si tienes `pg_cron` instalado, puedes programar la ejecución automática:

```sql
SELECT cron.schedule('deactivate-expired-users', '0 0 * * *', 'SELECT deactivate_expired_users();');
```

Esto ejecutará la función diariamente a medianoche.

## Casos de Uso

1. **Usuarios temporales**: Crear usuarios con fecha de expiración automática
2. **Acceso limitado**: Usuarios con acceso temporal al sistema
3. **Pruebas**: Usuarios de prueba que se desactivan automáticamente
4. **Auditoría**: Seguimiento de usuarios con deadlines específicos

## Notas Importantes

- El campo `time` es completamente opcional
- Los usuarios sin deadline nunca expiran automáticamente
- Solo los administradores pueden ver y gestionar la información de expiración
- La desactivación automática debe ejecutarse manualmente o programarse
- Los usuarios expirados mantienen su historial en el sistema
