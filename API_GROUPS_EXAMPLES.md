# API de Grupos y Clientes - Documentación

## Descripción

Esta documentación describe las nuevas funcionalidades para manejar **grupos de clientes** en el sistema IA Calls Backend.

## Estructura de Datos

### Grupo
```json
{
  "id": 1,
  "name": "VIP Clientes",
  "description": "Clientes prioritarios con alta conversión",
  "color": "#10B981",
  "isActive": true,
  "createdBy": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "clientCount": 5
}
```

### Cliente
```json
{
  "id": 1,
  "externalId": "ext_123",
  "name": "Daniel Giraldo",
  "phone": "+573104819492",
  "email": "daniel@example.com",
  "address": "Guanatr",
  "category": "General",
  "review": "a",
  "status": "pending",
  "metadata": {...},
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Endpoints de Grupos

### 1. Obtener todos los grupos
```http
GET /api/groups
GET /api/groups?page=1&limit=10&include_clients=true
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "VIP Clientes",
      "description": "Clientes prioritarios",
      "color": "#10B981",
      "clientCount": 5,
      "recentClients": [...] // Solo si include_clients=true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3
  }
}
```

### 2. Obtener grupo por ID
```http
GET /api/groups/1
GET /api/groups/1?include_clients=true&client_page=1&client_limit=5
```

### 3. Crear nuevo grupo
```http
POST /api/groups
Content-Type: application/json

{
  "name": "Nuevos Prospectos",
  "description": "Clientes recién incorporados",
  "color": "#3B82F6"
}
```

### 4. Actualizar grupo
```http
PUT /api/groups/1
Content-Type: application/json

{
  "name": "VIP Clientes Premium",
  "description": "Clientes VIP con beneficios premium",
  "color": "#8B5CF6"
}
```

### 5. Eliminar grupo
```http
DELETE /api/groups/1
```

### 6. Agregar cliente al grupo
```http
POST /api/groups/1/clients
Content-Type: application/json

{
  "client_id": 5
}
```

### 7. Remover cliente del grupo
```http
DELETE /api/groups/1/clients/5
```

## Endpoints de Clientes

### 1. Obtener todos los clientes
```http
GET /api/clients
GET /api/clients?page=1&limit=10&status=pending&category=General&include_groups=true
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Daniel Giraldo",
      "phone": "+573104819492",
      "groups": [...] // Solo si include_groups=true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### 2. Obtener cliente por ID
```http
GET /api/clients/1?include_groups=true
```

### 3. Crear nuevo cliente
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Juan Pérez",
  "phone": "+573001234567",
  "email": "juan@example.com",
  "address": "Bogotá, Colombia",
  "category": "Premium",
  "review": "Cliente potencial de alto valor",
  "status": "pending"
}
```

### 4. Actualizar cliente
```http
PUT /api/clients/1
Content-Type: application/json

{
  "status": "contacted",
  "review": "Primera llamada realizada exitosamente"
}
```

### 5. Eliminar cliente
```http
DELETE /api/clients/1
```

### 6. Sincronizar clientes desde servicio externo
```http
POST /api/clients/sync?page=1&limit=50
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Sincronización completada: 10 exitosos, 0 errores",
  "data": {
    "totalProcessed": 10,
    "successful": 10,
    "errors": 0,
    "details": [...]
  }
}
```

### 7. Obtener estadísticas de clientes
```http
GET /api/clients/stats
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "pending": 25,
    "contacted": 15,
    "converted": 10
  }
}
```

## Endpoint Mejorado de Clientes Pendientes

El endpoint original `/clients/pending` ahora ha sido mejorado para usar la base de datos local cuando está disponible:

```http
GET /clients/pending?page=1&limit=5&include_groups=true
```

**Respuesta mejorada:**
```json
{
  "clients": [...],
  "page": 1,
  "size": 5,
  "total": 10,
  "message": "Datos locales",
  "source": "local"
}
```

## Flujo de Trabajo Recomendado

### 1. Configuración inicial
```bash
# Ejecutar migraciones
node scripts/migrate.js

# Verificar que las tablas se crearon correctamente
```

### 2. Sincronizar clientes existentes
```http
POST /api/clients/sync
```

### 3. Crear grupos para organización
```http
POST /api/groups
{
  "name": "Clientes VIP",
  "description": "Clientes de alta prioridad",
  "color": "#10B981"
}
```

### 4. Asignar clientes a grupos
```http
POST /api/groups/1/clients
{
  "client_id": 5
}
```

### 5. Consultar clientes por grupo
```http
GET /api/groups/1?include_clients=true
```

## Casos de Uso

### Segmentación de Clientes
- **VIP Clientes**: Clientes de alto valor que requieren atención prioritaria
- **Seguimiento Semanal**: Clientes que necesitan contacto regular
- **Nuevos Prospectos**: Clientes recién incorporados al sistema

### Gestión de Campañas
- Crear grupos específicos para campañas de marketing
- Asignar clientes basado en criterios específicos
- Hacer seguimiento del progreso por grupo

### Análisis y Reportes
- Obtener estadísticas por grupo
- Analizar tasas de conversión por segmento
- Generar reportes de rendimiento

## Consideraciones Técnicas

- Los grupos tienen una relación muchos-a-muchos con los clientes
- Un cliente puede pertenecer a múltiples grupos
- Los datos se almacenan localmente pero mantienen sincronización con el servicio externo
- Todas las operaciones incluyen soft deletes para mantener integridad histórica 