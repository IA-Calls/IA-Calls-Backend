# 🔄 Cambios en el Endpoint de Creación de Grupos

## 📋 Resumen

Se ha modificado la lógica de creación de grupos para simplificar el flujo. **Ahora el agente se asigna directamente al crear el grupo**, eliminando la necesidad de preparar o configurar el agente en un paso separado.

---

## 🎯 Cambios Principales

### 1. **Asignación Directa de Agente**
- **ANTES**: Se creaba el grupo y luego se llamaba a `/groups/:id/prepare-agent` para preparar el agente
- **AHORA**: El `agentId` se asigna directamente al crear el grupo

### 2. **Validación Automática**
- Al crear un grupo con `agentId`, el sistema valida automáticamente que el agente existe en ElevenLabs
- Si el agente no existe, se retorna un error antes de crear el grupo

### 3. **Uso del Agente del Grupo en Llamadas**
- `startBatchCall` ahora usa el `agentId` del grupo en lugar del `agentId` del usuario
- El usuario ya no necesita tener un `agentId` asignado para hacer llamadas

---

## 📝 Cambios en la API

### **POST /api/groups** - Crear Grupo

#### Body Request (NUEVO campo)

```json
{
  "name": "Nombre del Grupo",
  "description": "Descripción opcional",
  "prompt": "Prompt opcional",
  "color": "#3B82F6",
  "favorite": false,
  "idioma": "es",
  "variables": {},
  "base64": "datos_base64_del_archivo",
  "document_name": "archivo.xlsx",
  "clientId": 5,
  "prefix": "+57",
  "selectedCountryCode": "CO",
  "phoneNumberId": "phnum_123",
  "agentId": "agent_1601k8xw7yc5ex893rd7qj9ybppn"  // ⭐ NUEVO: Campo requerido
}
```

#### Cambios en Campos

| Campo | Estado | Descripción |
|-------|--------|-------------|
| `agentId` | **NUEVO** | ID del agente de ElevenLabs a asignar al grupo. Si se proporciona, se valida que existe antes de crear el grupo. |
| Otros campos | Sin cambios | Se mantienen igual que antes |

#### Response (NUEVO campo)

```json
{
  "success": true,
  "message": "Grupo creado exitosamente",
  "data": {
    "id": 123,
    "name": "Nombre del Grupo",
    "description": "Descripción opcional",
    "prompt": "Prompt opcional",
    "color": "#3B82F6",
    "favorite": false,
    "idioma": "es",
    "variables": {},
    "createdBy": 5,
    "createdAt": "2025-11-02T10:00:00.000Z",
    "updatedAt": "2025-11-02T10:00:00.000Z",
    "agentId": "agent_1601k8xw7yc5ex893rd7qj9ybppn",  // ⭐ NUEVO: Campo en la respuesta
    "prefix": "+57",
    "selectedCountryCode": "CO",
    "firstMessage": "Hola, ¿cómo estás?",
    "phoneNumberId": "phnum_123",
    "fileProcessing": {
      "processed": true,
      "totalClientsFound": 100,
      "clientsCreated": 100
    },
    "gcpStorage": {
      "uploaded": true
    },
    "createdClients": [...]
  }
}
```

#### Validación de Agente

Si se proporciona un `agentId` que no existe, la respuesta será:

```json
{
  "success": false,
  "message": "El agente especificado no existe o no es accesible",
  "error": "Error 404: Agent not found"
}
```

---

### **POST /api/groups/:id/call** - Iniciar Llamadas

#### Cambios en el Comportamiento

**ANTES:**
- Usaba `user.agentId` del usuario autenticado
- Requería que el usuario tuviera un `agentId` asignado

**AHORA:**
- Usa `group.agentId` del grupo directamente
- **Ya no requiere** que el usuario tenga un `agentId`
- Si el grupo no tiene `agentId`, retorna error:

```json
{
  "success": false,
  "message": "El grupo no tiene un agente asignado. Por favor, asigna un agente al crear el grupo."
}
```

#### Body Request (sin cambios)

```json
{
  "userId": 5,
  "agentPhoneNumberId": "phnum_123",
  "scheduledTimeUnix": null
}
```

#### Response (actualizado)

```json
{
  "success": true,
  "message": "Llamadas iniciadas exitosamente para el grupo \"Nombre del Grupo\"",
  "data": {
    "batchId": "batch_123",
    "groupId": 123,
    "groupName": "Nombre del Grupo",
    "agentId": "agent_1601k8xw7yc5ex893rd7qj9ybppn",  // ⭐ Ahora viene del grupo
    "recipientsCount": 100,
    "callName": "Llamada Nombre del Grupo - 02/11/2025",
    "batchData": {...}
  }
}
```

---

### **POST /api/groups/:id/prepare-agent** - DEPRECADO

⚠️ **Este endpoint está DEPRECADO** pero se mantiene por compatibilidad.

**Ya NO es necesario** llamar a este endpoint después de crear el grupo. El agente se asigna directamente al crear el grupo.

Si aún necesitas usar este endpoint, funciona igual que antes, pero se recomienda migrar al nuevo flujo.

---

## 🗄️ Cambios en la Base de Datos

### Nueva Columna en `groups`

```sql
ALTER TABLE "public"."groups" 
ADD COLUMN agent_id VARCHAR(255);

CREATE INDEX idx_groups_agent_id ON "public"."groups"(agent_id);
```

### Migración

Ejecutar el archivo de migración:
```bash
psql -U postgres -d iacalls_db -f database/migrations/add_agent_id_to_groups.sql
```

---

## 🔄 Flujo Anterior vs Nuevo Flujo

### **Flujo Anterior:**
```
1. POST /api/groups (crear grupo sin agente)
   ↓
2. POST /api/groups/:id/prepare-agent (preparar agente)
   ↓
3. POST /api/groups/:id/call (iniciar llamadas usando user.agentId)
```

### **Flujo Nuevo:**
```
1. POST /api/groups (crear grupo CON agentId)
   ↓
2. POST /api/groups/:id/call (iniciar llamadas usando group.agentId)
```

---

## 📋 Checklist para el Frontend

### ✅ Cambios Requeridos

- [ ] **Agregar campo `agentId` al formulario de creación de grupos**
  - Debe ser un selector de agentes disponibles (usar `GET /api/agents`)
  - El campo debe ser **requerido** para crear el grupo

- [ ] **Eliminar llamada a `prepare-agent`**
  - Ya no es necesario llamar a `/api/groups/:id/prepare-agent` después de crear el grupo
  - Remover cualquier lógica que llame a este endpoint

- [ ] **Actualizar visualización del grupo**
  - Mostrar el `agentId` asignado en la información del grupo
  - Incluir el nombre del agente si está disponible

- [ ] **Actualizar inicio de llamadas**
  - Ya no es necesario verificar `user.agentId` antes de iniciar llamadas
  - Verificar que el grupo tenga `agentId` asignado antes de permitir iniciar llamadas

### 🔍 Ejemplo de Implementación

#### Crear Grupo con Agente

```javascript
// Obtener lista de agentes disponibles
const agentsResponse = await fetch('/api/agents');
const agentsData = await agentsResponse.json();

// Crear grupo con agente seleccionado
const createGroupResponse = await fetch('/api/groups', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Mi Grupo',
    description: 'Descripción del grupo',
    agentId: 'agent_1601k8xw7yc5ex893rd7qj9ybppn', // ⭐ NUEVO
    base64: fileBase64,
    document_name: 'clientes.xlsx',
    clientId: 5,
    prefix: '+57',
    selectedCountryCode: 'CO'
  })
});

const groupData = await createGroupResponse.json();
// El grupo ya tiene el agente asignado, no es necesario llamar a prepare-agent
```

#### Iniciar Llamadas

```javascript
// Verificar que el grupo tiene agente antes de iniciar llamadas
if (!groupData.data.agentId) {
  alert('El grupo no tiene un agente asignado');
  return;
}

// Iniciar llamadas (ya no verifica user.agentId)
const startCallResponse = await fetch(`/api/groups/${groupId}/call`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    userId: currentUser.id,
    agentPhoneNumberId: phoneNumberId, // Opcional
    scheduledTimeUnix: null // Opcional
  })
});
```

---

## ⚠️ Breaking Changes

### 1. **`agentId` es requerido para crear grupos funcionales**
- Aunque técnicamente el campo no es obligatorio en la BD, es **recomendado** proporcionarlo
- Sin `agentId`, no se podrán iniciar llamadas para ese grupo

### 2. **El usuario ya no necesita `agentId`**
- Antes: El usuario debía tener `agentId` para iniciar llamadas
- Ahora: Solo el grupo necesita `agentId`

### 3. **`prepare-agent` está deprecado**
- El endpoint sigue funcionando pero no es necesario
- Se recomienda migrar al nuevo flujo

---

## 📚 Endpoints Relacionados

### Obtener Lista de Agentes
```
GET /api/agents
```

### Obtener Información de un Agente
```
GET /api/agents/:agentId
```

### Actualizar Agente
```
PATCH /api/agents/:agentId
```

---

## 🐛 Manejo de Errores

### Error: Agente no existe
```json
{
  "success": false,
  "message": "El agente especificado no existe o no es accesible",
  "error": "Error 404: Agent not found"
}
```

### Error: Grupo sin agente al iniciar llamadas
```json
{
  "success": false,
  "message": "El grupo no tiene un agente asignado. Por favor, asigna un agente al crear el grupo."
}
```

---

## 📝 Notas Adicionales

1. **Carga masiva de clientes**: Se mantiene igual que antes, funciona con archivos Excel/CSV
2. **Variables del grupo**: Se mantienen igual, se pueden pasar variables personalizadas
3. **Configuración de país**: Se mantiene igual, `prefix` y `selectedCountryCode`
4. **Tracking de llamadas**: Se mantiene igual, usa el `agentId` del grupo para tracking

---

## 🔗 Referencias

- Documentación de endpoints de agentes: `docs/ENDPOINT_LIST_AGENTS.md`
- Documentación de creación de agentes: `docs/ENDPOINT_CREATE_AGENT.md`
- Migración de base de datos: `database/migrations/add_agent_id_to_groups.sql`

