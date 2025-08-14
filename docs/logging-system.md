# Sistema de Logging - IA Calls Backend

## Descripción

El sistema de logging permite registrar todas las actividades de los usuarios en la aplicación, incluyendo información detallada como el nombre del usuario, IP, User-Agent, y metadatos específicos de cada acción.

## Funciones Disponibles

### 1. `logActivity(userId, action, description, req, metadata)`

Registra una actividad en la tabla `activity_logs` con información completa del usuario.

#### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `userId` | number | ✅ | ID del usuario que realiza la acción |
| `action` | string | ✅ | Tipo de acción (ej: 'create_group', 'login') |
| `description` | string | ✅ | Descripción detallada de la acción |
| `req` | object | ✅ | Objeto request de Express |
| `metadata` | object | ❌ | Metadatos adicionales en formato JSON |

#### Ejemplo de Uso

```javascript
const { logActivity } = require('../utils/helpers');

// Registrar creación de grupo
await logActivity(req.user.id, 'create_group', 'Grupo "Clientes VIP" creado', req, {
  groupId: 123,
  groupName: 'Clientes VIP',
  hasFile: true,
  clientsCreated: 50
});

// Registrar error
await logActivity(req.user.id, 'create_group_error', 'Error creando grupo', req, {
  error: error.message,
  groupName: 'Clientes VIP'
});
```

### 2. `getUserActivityLogs(userId, options)`

Obtiene los logs de actividad de un usuario específico con paginación y filtros.

#### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `userId` | number | ✅ | ID del usuario |
| `options` | object | ❌ | Opciones de consulta |

#### Opciones Disponibles

```javascript
const options = {
  page: 1,           // Página actual (default: 1)
  limit: 20,         // Elementos por página (default: 20, max: 50)
  action: 'login'    // Filtrar por tipo de acción (opcional)
};
```

#### Ejemplo de Uso

```javascript
const { getUserActivityLogs } = require('../utils/helpers');

const logs = await getUserActivityLogs(userId, {
  page: 1,
  limit: 20,
  action: 'create_group'
});

console.log(logs);
// {
//   activities: [...],
//   pagination: {
//     page: 1,
//     limit: 20,
//     total: 150,
//     totalPages: 8,
//     hasNext: true,
//     hasPrev: false
//   }
// }
```

### 3. `cleanOldActivityLogs(daysToKeep)`

Elimina logs antiguos para mantener la base de datos optimizada.

#### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `daysToKeep` | number | ❌ | Días a mantener (default: 90) |

#### Ejemplo de Uso

```javascript
const { cleanOldActivityLogs } = require('../utils/helpers');

// Mantener solo logs de los últimos 90 días
const deletedCount = await cleanOldActivityLogs(90);
console.log(`Se eliminaron ${deletedCount} logs antiguos`);
```

## Estructura de la Tabla `activity_logs`

```sql
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Campos Registrados

- **user_id**: ID del usuario (puede ser NULL si el usuario se elimina)
- **action**: Tipo de acción realizada
- **description**: Descripción detallada de la acción
- **ip_address**: Dirección IP del usuario
- **user_agent**: Navegador/dispositivo del usuario
- **metadata**: Información adicional en formato JSON
- **created_at**: Fecha y hora de la acción

### Metadatos Automáticos

Cada log incluye automáticamente estos metadatos:

```json
{
  "method": "POST",
  "url": "/api/groups",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "userName": "Juan Pérez",
  "userEmail": "juan@example.com",
  "userRole": "admin",
  "customField": "valor personalizado"
}
```

## Tipos de Acciones Recomendadas

### Autenticación
- `login` - Inicio de sesión exitoso
- `logout` - Cierre de sesión
- `password_change` - Cambio de contraseña
- `login_failed` - Intento fallido de login

### Grupos
- `create_group` - Creación de grupo
- `update_group` - Actualización de grupo
- `delete_group` - Eliminación de grupo
- `add_clients_to_group` - Agregar clientes a grupo
- `remove_clients_from_group` - Remover clientes de grupo

### Clientes
- `create_client` - Creación de cliente
- `update_client` - Actualización de cliente
- `delete_client` - Eliminación de cliente
- `import_clients` - Importación masiva de clientes

### Archivos
- `upload_file` - Subida de archivo
- `download_file` - Descarga de archivo
- `delete_file` - Eliminación de archivo
- `process_file` - Procesamiento de archivo

### Usuarios
- `create_user` - Creación de usuario
- `update_user` - Actualización de usuario
- `delete_user` - Eliminación de usuario
- `deactivate_user` - Desactivación de usuario

### Errores
- `{action}_error` - Error en cualquier acción (ej: `create_group_error`)

## Implementación en Controladores

### Ejemplo: Controlador de Grupos

```javascript
const createGroup = async (req, res) => {
  try {
    const { logActivity } = require('../utils/helpers');
    
    // ... lógica de creación del grupo ...
    
    // Log de éxito
    await logActivity(req.user.id, 'create_group', `Grupo "${name}" creado`, req, {
      groupId: group.id,
      groupName: name,
      hasFile: !!base64,
      clientsCreated: createdClients.length
    });
    
    res.status(201).json(response);
    
  } catch (error) {
    // Log de error
    await logActivity(req.user.id, 'create_group_error', `Error creando grupo "${name}"`, req, {
      error: error.message,
      groupName: name
    });
    
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};
```

## Consultas Útiles

### Obtener Actividad Reciente

```sql
SELECT 
    al.action,
    al.description,
    al.created_at,
    u.username,
    u.first_name,
    u.last_name,
    al.metadata
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 50;
```

### Actividad por Usuario

```sql
SELECT 
    action,
    COUNT(*) as count,
    MAX(created_at) as last_activity
FROM activity_logs
WHERE user_id = $1
GROUP BY action
ORDER BY count DESC;
```

### Actividad por Período

```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_actions,
    COUNT(DISTINCT user_id) as unique_users
FROM activity_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Mantenimiento

### Limpieza Automática

Recomendamos configurar una tarea programada para limpiar logs antiguos:

```javascript
// Ejecutar diariamente a las 2:00 AM
const cron = require('node-cron');
const { cleanOldActivityLogs } = require('./utils/helpers');

cron.schedule('0 2 * * *', async () => {
  try {
    await cleanOldActivityLogs(90); // Mantener 90 días
  } catch (error) {
    console.error('Error en limpieza automática de logs:', error);
  }
});
```

### Monitoreo

- Revisar regularmente el tamaño de la tabla `activity_logs`
- Monitorear el rendimiento de las consultas
- Configurar alertas para errores de logging

## Consideraciones de Seguridad

1. **Datos Sensibles**: No registrar contraseñas, tokens, o información personal sensible
2. **IP Addresses**: Considerar el cumplimiento de GDPR al registrar IPs
3. **Retención**: Definir políticas claras de retención de logs
4. **Acceso**: Limitar el acceso a los logs solo a usuarios autorizados

## Troubleshooting

### Problema: Logs no se registran

1. Verificar que la tabla `activity_logs` existe
2. Revisar permisos de la base de datos
3. Verificar que el `userId` es válido
4. Revisar logs de error en la consola

### Problema: Rendimiento lento

1. Verificar índices en la tabla
2. Implementar paginación en consultas
3. Considerar particionamiento por fecha
4. Optimizar consultas frecuentes
