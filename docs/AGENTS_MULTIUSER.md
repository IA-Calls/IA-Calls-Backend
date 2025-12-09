# 🔐 Sistema Multiusuario de Agentes de ElevenLabs

## 📋 Resumen

El sistema de agentes de ElevenLabs ahora soporta **multiusuario**, donde cada usuario solo puede ver y gestionar sus propios agentes. Esto previene que los usuarios vean agentes creados por otros usuarios, incluso si todos comparten la misma cuenta de ElevenLabs.

---

## 🏗️ Arquitectura

### Tabla `agents`

Se creó una nueva tabla en PostgreSQL que almacena la relación entre agentes de ElevenLabs y usuarios:

```sql
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL UNIQUE,  -- ID del agente en ElevenLabs
  user_id INTEGER NOT NULL REFERENCES users(id),  -- Usuario propietario
  name VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agent_id, user_id)  -- Previene duplicados
);
```

### Modelo `Agent`

El modelo `src/models/Agent.js` proporciona métodos para:
- Crear agentes con `user_id`
- Listar agentes filtrados por `user_id`
- Validar ownership antes de operaciones CRUD
- Actualizar y eliminar agentes con validación de ownership

---

## 🔒 Seguridad y Validaciones

### 1. **Creación de Agentes**

Cuando se crea un agente:
1. Se crea en ElevenLabs usando la API
2. Se guarda en la BD local con el `user_id` del usuario autenticado
3. El agente queda asociado al usuario que lo creó

**Endpoint:** `POST /api/agents/create-agent`

**Requisitos:**
- Usuario debe estar autenticado
- El `user_id` se toma automáticamente de `req.user.id`

**Ejemplo:**
```json
{
  "name": "Mi Agente",
  "prompt_text": "Eres un asistente útil...",
  "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w"
}
```

### 2. **Listado de Agentes**

Solo muestra agentes del usuario autenticado:

**Endpoint:** `GET /api/agents`

**Comportamiento:**
- Filtra automáticamente por `user_id`
- No muestra agentes de otros usuarios
- Si el usuario no tiene agentes, devuelve array vacío

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": 1,
        "agent_id": "abc123...",
        "name": "Mi Agente",
        "created_at": "2024-01-01T00:00:00Z",
        "elevenlabs_data": { ... }
      }
    ],
    "count": 1
  }
}
```

### 3. **Consulta de Agente Individual**

Valida ownership antes de devolver:

**Endpoint:** `GET /api/agents/:agentId`

**Validaciones:**
- Verifica que el agente pertenezca al usuario autenticado
- Si no pertenece, devuelve `403 Forbidden`

**Ejemplo de error:**
```json
{
  "success": false,
  "message": "Acceso denegado: El agente no pertenece al usuario autenticado"
}
```

### 4. **Actualización de Agente**

Valida ownership antes de actualizar:

**Endpoint:** `PATCH /api/agents/:agentId` o `PUT /api/agents/:agentId`

**Validaciones:**
- Verifica ownership antes de actualizar en ElevenLabs
- Actualiza también en BD local si hay cambios en `name` o `metadata`
- Si no pertenece al usuario, devuelve `403 Forbidden`

### 5. **Eliminación de Agente**

Valida ownership antes de eliminar:

**Endpoint:** `DELETE /api/agents/:agentId`

**Proceso:**
1. Valida ownership
2. Elimina de ElevenLabs
3. Elimina de BD local
4. Si falla alguno, devuelve advertencia pero no falla la operación

---

## 🚀 Instalación y Configuración

### Paso 1: Crear la Tabla

Ejecuta el script de migración:

```bash
npm run create:agents-table
```

O manualmente:

```bash
psql -U postgres -d ia-calls -f database/create_agents_table.sql
```

### Paso 2: Verificar la Tabla

```sql
SELECT * FROM agents;
```

Deberías ver una tabla vacía (si no hay agentes creados aún).

---

## 📊 Migración de Agentes Existentes

Si ya tienes agentes creados antes de esta implementación, necesitas migrarlos:

### Opción 1: Migración Manual

Para cada agente existente, ejecuta:

```sql
INSERT INTO agents (agent_id, user_id, name, metadata)
VALUES ('agent_id_de_elevenlabs', user_id_del_propietario, 'Nombre del Agente', '{}')
ON CONFLICT (agent_id) DO NOTHING;
```

### Opción 2: Script de Migración

Crea un script que:
1. Obtenga todos los agentes de ElevenLabs
2. Asigne cada agente al usuario que lo creó (si tienes esa información)
3. O asigne todos a un usuario administrador por defecto

---

## 🔍 Verificación

### Verificar que Funciona

1. **Crea un agente como Usuario A:**
   ```bash
   POST /api/agents/create-agent
   Authorization: Bearer <token_usuario_a>
   ```

2. **Lista agentes como Usuario A:**
   ```bash
   GET /api/agents
   Authorization: Bearer <token_usuario_a>
   ```
   ✅ Debe mostrar el agente creado

3. **Lista agentes como Usuario B:**
   ```bash
   GET /api/agents
   Authorization: Bearer <token_usuario_b>
   ```
   ✅ NO debe mostrar el agente del Usuario A

4. **Intenta acceder al agente del Usuario A como Usuario B:**
   ```bash
   GET /api/agents/<agent_id_del_usuario_a>
   Authorization: Bearer <token_usuario_b>
   ```
   ✅ Debe devolver `403 Forbidden`

---

## 📡 Ejemplos de cURL

### 1. Crear un Agente

**Endpoint:** `POST /api/agents/create-agent`

```bash
curl -X POST http://localhost:5050/api/agents/create-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "name": "Mi Agente de Soporte",
    "prompt_text": "Eres un asistente de soporte técnico. Responde preguntas sobre nuestros productos de manera amigable y profesional.",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w",
    "agent_language": "es",
    "agent_first_message": "Hola, ¿en qué puedo ayudarte hoy?",
    "tts_stability": 0.5,
    "tts_speed": 1.0,
    "tts_similarity_boost": 0.8
  }'
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Agente creado exitosamente en ElevenLabs y registrado en el sistema",
  "data": {
    "id": 1,
    "agent_id": "abc123def456...",
    "name": "Mi Agente de Soporte",
    "user_id": 5,
    "agent_data": { ... },
    "merged_config": { ... },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Respuesta sin autenticación (401):**
```json
{
  "success": false,
  "message": "Usuario no autenticado",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Listar Agentes del Usuario

**Endpoint:** `GET /api/agents`

```bash
curl -X GET http://localhost:5050/api/agents \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Agentes obtenidos exitosamente",
  "data": {
    "agents": [
      {
        "id": 1,
        "agent_id": "abc123def456...",
        "name": "Mi Agente de Soporte",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z",
        "elevenlabs_data": {
          "agent_id": "abc123def456...",
          "name": "Mi Agente de Soporte",
          "conversation_config": {
            "agent": {
              "language": "es"
            },
            "tts": {
              "voice_id": "WOSzFvlJRm2hkYb3KA5w"
            }
          }
        },
        "language": "es",
        "voice_id": "WOSzFvlJRm2hkYb3KA5w",
        "status": "active"
      }
    ],
    "count": 1,
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

**Respuesta sin agentes (200):**
```json
{
  "success": true,
  "message": "No hay agentes registrados para este usuario",
  "data": {
    "agents": [],
    "count": 0,
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

---

### 3. Obtener un Agente Específico

**Endpoint:** `GET /api/agents/:agentId`

```bash
curl -X GET http://localhost:5050/api/agents/abc123def456... \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Agente obtenido exitosamente",
  "data": {
    "agent_id": "abc123def456...",
    "name": "Mi Agente de Soporte",
    "conversation_config": { ... },
    "local_data": {
      "id": 1,
      "agent_id": "abc123def456...",
      "user_id": 5,
      "name": "Mi Agente de Soporte",
      "metadata": { ... },
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  },
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

**Respuesta de acceso denegado (403):**
```json
{
  "success": false,
  "message": "Acceso denegado: El agente no pertenece al usuario autenticado",
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

**Respuesta de agente no encontrado (404):**
```json
{
  "success": false,
  "message": "Agente no encontrado en ElevenLabs o error obteniendo información",
  "error": "Agent not found",
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

---

### 4. Actualizar un Agente

**Endpoint:** `PATCH /api/agents/:agentId` o `PUT /api/agents/:agentId`

```bash
curl -X PATCH http://localhost:5050/api/agents/abc123def456... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "name": "Mi Agente Actualizado",
    "prompt_text": "Eres un asistente actualizado con nuevas instrucciones."
  }'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Agente actualizado exitosamente",
  "data": {
    "agent_id": "abc123def456...",
    "name": "Mi Agente Actualizado",
    "conversation_config": { ... }
  },
  "timestamp": "2024-01-15T10:45:00.000Z"
}
```

**Respuesta de acceso denegado (403):**
```json
{
  "success": false,
  "message": "Acceso denegado: El agente no pertenece al usuario autenticado",
  "timestamp": "2024-01-15T10:45:00.000Z"
}
```

**Respuesta de body vacío (400):**
```json
{
  "success": false,
  "message": "Se requiere al menos un campo para actualizar",
  "timestamp": "2024-01-15T10:45:00.000Z"
}
```

---

### 5. Eliminar un Agente

**Endpoint:** `DELETE /api/agents/:agentId`

```bash
curl -X DELETE http://localhost:5050/api/agents/abc123def456... \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Agente eliminado exitosamente",
  "timestamp": "2024-01-15T10:50:00.000Z"
}
```

**Respuesta de acceso denegado (403):**
```json
{
  "success": false,
  "message": "Acceso denegado: El agente no pertenece al usuario autenticado",
  "timestamp": "2024-01-15T10:50:00.000Z"
}
```

---

### 6. Crear Agente con Prompt (Vertex AI)

**Endpoint:** `POST /api/agents/create-with-prompt`

```bash
curl -X POST http://localhost:5050/api/agents/create-with-prompt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "name": "Agente Generado con IA",
    "prompt": "Crea un agente que sea un experto en ventas de productos tecnológicos",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w"
  }'
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Agente creado exitosamente en ElevenLabs y registrado en el sistema",
  "data": {
    "id": 2,
    "agent_id": "xyz789ghi012...",
    "name": "Agente Generado con IA",
    "user_id": 5,
    "agent_data": { ... }
  }
}
```

---

## 🔑 Obtener Token JWT

Para obtener un token JWT, primero debes autenticarte:

```bash
# Login
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tu_usuario",
    "password": "tu_contraseña"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "username": "tu_usuario",
    "email": "usuario@example.com"
  }
}
```

Usa el `token` en el header `Authorization: Bearer <token>` para todas las peticiones de agentes.

---

## 📝 Variables de Entorno para Ejemplos

Si tu servidor está en otro host/puerto, ajusta la URL base:

```bash
# Desarrollo local
BASE_URL="http://localhost:5050"

# Producción
BASE_URL="https://api.tudominio.com"

# Ejemplo
curl -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

---

## 🧪 Script de Prueba Completo

Crea un archivo `test-agents.sh`:

```bash
#!/bin/bash

# Configuración
BASE_URL="http://localhost:5050"
TOKEN="TU_TOKEN_JWT_AQUI"

echo "=== 1. Crear Agente ==="
curl -X POST ${BASE_URL}/api/agents/create-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Agente de Prueba",
    "prompt_text": "Eres un agente de prueba",
    "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w"
  }' | jq '.'

echo -e "\n=== 2. Listar Agentes ==="
curl -X GET ${BASE_URL}/api/agents \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo -e "\n=== 3. Obtener Agente (reemplaza AGENT_ID) ==="
AGENT_ID="abc123def456..."
curl -X GET ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo -e "\n=== 4. Actualizar Agente ==="
curl -X PATCH ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Agente Actualizado"
  }' | jq '.'

echo -e "\n=== 5. Eliminar Agente ==="
curl -X DELETE ${BASE_URL}/api/agents/${AGENT_ID} \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
```

Ejecuta con:
```bash
chmod +x test-agents.sh
./test-agents.sh
```

---

## 🐛 Troubleshooting

### Error: "Tabla agents no existe"

**Solución:** Ejecuta `npm run create:agents-table`

### Error: "Usuario no autenticado"

**Solución:** Asegúrate de enviar el token JWT en el header `Authorization: Bearer <token>`

### Los agentes no se guardan en BD

**Verifica:**
1. Que la tabla `agents` existe
2. Que el `user_id` es válido
3. Revisa los logs del servidor para ver errores de BD

### Un usuario ve agentes de otro usuario

**Verifica:**
1. Que el filtro por `user_id` está funcionando en `listAgents`
2. Que la validación de ownership está activa en `getAgentById`, `updateAgentById`, `deleteAgentById`

---

## 📝 Notas Importantes

1. **Autenticación Requerida:** Todas las rutas de agentes ahora requieren autenticación
2. **Backward Compatibility:** Los agentes creados antes de esta implementación no aparecerán hasta que se migren
3. **Performance:** El filtrado por `user_id` usa índices para optimizar las consultas
4. **Seguridad:** La validación de ownership previene acceso no autorizado incluso si alguien conoce el `agent_id`

---

## 🔄 Cambios en las Rutas

### Antes (Públicas):
- `GET /api/agents` - Mostraba todos los agentes
- `GET /api/agents/:agentId` - Acceso sin validación
- `POST /api/agents/create-agent` - Sin guardar `user_id`

### Ahora (Con Autenticación):
- `GET /api/agents` - Solo muestra agentes del usuario autenticado
- `GET /api/agents/:agentId` - Valida ownership antes de devolver
- `POST /api/agents/create-agent` - Guarda `user_id` automáticamente
- `PATCH /api/agents/:agentId` - Valida ownership antes de actualizar
- `DELETE /api/agents/:agentId` - Valida ownership antes de eliminar

---

## ✅ Checklist de Implementación

- [x] Tabla `agents` creada en PostgreSQL
- [x] Modelo `Agent` implementado
- [x] Controlador actualizado con validaciones de ownership
- [x] Rutas actualizadas para requerir autenticación
- [x] Script de migración creado
- [x] Documentación completa

---

## 📞 Soporte

Si encuentras problemas, revisa:
1. Los logs del servidor
2. Los logs de la base de datos
3. La estructura de la tabla `agents`
4. Los tokens JWT de autenticación

