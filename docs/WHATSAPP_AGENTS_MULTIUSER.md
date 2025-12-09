# 🔐 Sistema Multiusuario de Agentes de WhatsApp

## 📋 Resumen

Los agentes de WhatsApp ahora soportan **multiusuario**, donde cada usuario solo puede ver y gestionar sus propios agentes. Esto previene que los usuarios vean agentes creados por otros usuarios.

---

## 🏗️ Arquitectura

### Tabla `whatsapp_agents`

La tabla ya existía con el campo `created_by` que referencia a `users(id)`:

```sql
CREATE TABLE whatsapp_agents (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL UNIQUE,
  instructor TEXT NOT NULL,
  text_only BOOLEAN DEFAULT FALSE,
  voice_id VARCHAR(255),
  language VARCHAR(10) DEFAULT 'es',
  initial_message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Campo de ownership
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modelo `WhatsAppAgent`

El modelo `src/models/WhatsAppAgent.js` ahora incluye métodos para:
- Filtrar agentes por `user_id`
- Validar ownership antes de operaciones CRUD
- Listar solo agentes del usuario autenticado

---

## 🔒 Seguridad y Validaciones

### 1. **Creación de Agentes**

Cuando se crea un agente:
1. Se valida que el usuario esté autenticado
2. Se guarda en la BD con el `user_id` del usuario autenticado
3. El agente queda asociado al usuario que lo creó

**Endpoint:** `POST /api/whatsapp/agents`

**Requisitos:**
- Usuario debe estar autenticado (middleware `authenticate`)
- El `user_id` se toma automáticamente de `req.user.id`

**Ejemplo:**
```json
{
  "name": "Mi Agente WhatsApp",
  "instructor": "Eres un asistente de WhatsApp amable y profesional.",
  "language": "es",
  "initial_message": "Hola, ¿en qué puedo ayudarte?"
}
```

### 2. **Listado de Agentes**

Solo muestra agentes del usuario autenticado:

**Endpoint:** `GET /api/whatsapp/agents`

**Comportamiento:**
- Filtra automáticamente por `created_by = user_id`
- No muestra agentes de otros usuarios
- Si el usuario no tiene agentes, devuelve array vacío

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-del-agente",
      "name": "Mi Agente WhatsApp",
      "agent_id": "agent_123...",
      "instructor": "...",
      "created_by": 5,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

### 3. **Consulta de Agente Individual**

Valida ownership antes de devolver:

**Endpoint:** `GET /api/whatsapp/agents/:id`

**Validaciones:**
- Verifica que el agente pertenezca al usuario autenticado
- Si no pertenece, devuelve `403 Forbidden`

**Ejemplo de error:**
```json
{
  "success": false,
  "error": "Acceso denegado: El agente no pertenece al usuario autenticado"
}
```

### 4. **Actualización de Agente**

Valida ownership antes de actualizar:

**Endpoint:** `PUT /api/whatsapp/agents/:id`

**Validaciones:**
- Verifica ownership antes de actualizar
- Si no pertenece al usuario, devuelve `403 Forbidden`

### 5. **Eliminación de Agente**

Valida ownership antes de eliminar:

**Endpoint:** `DELETE /api/whatsapp/agents/:id`

**Proceso:**
1. Valida ownership
2. Desactiva el agente (`is_active = false`)
3. Si no pertenece al usuario, devuelve `403 Forbidden`

---

## 🚀 Cambios Implementados

### Modelo WhatsAppAgent

**Nuevos métodos:**
- `findByUserId(userId, activeOnly)` - Listar agentes de un usuario
- `belongsToUser(agentId, userId)` - Validar ownership

**Métodos actualizados:**
- `findAll(activeOnly, userId)` - Ahora acepta `userId` para filtrar
- `update(id, updates, userId)` - Valida ownership antes de actualizar
- `delete(id, userId)` - Valida ownership antes de eliminar

### Controlador WhatsAppAgentsController

**Cambios:**
- `createAgent()` - Valida autenticación y guarda `user_id`
- `listAgents()` - Filtra por `user_id` del usuario autenticado
- `getAgent()` - Valida ownership antes de devolver
- `updateAgent()` - Valida ownership antes de actualizar
- `deleteAgent()` - Valida ownership antes de eliminar

### Rutas

**Cambios:**
- Todas las rutas de `/api/whatsapp/agents/*` ahora requieren autenticación
- Middleware `authenticate` aplicado a todas las rutas de agentes

---

## 📡 Ejemplos de cURL

### 1. Crear un Agente

```bash
curl -X POST http://localhost:5050/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "name": "Mi Agente WhatsApp",
    "instructor": "Eres un asistente de WhatsApp amable y profesional.",
    "language": "es",
    "initial_message": "Hola, ¿en qué puedo ayudarte?"
  }'
```

### 2. Listar Agentes del Usuario

```bash
curl -X GET http://localhost:5050/api/whatsapp/agents \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

### 3. Obtener un Agente Específico

```bash
AGENT_ID="uuid-del-agente"
curl -X GET http://localhost:5050/api/whatsapp/agents/${AGENT_ID} \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

### 4. Actualizar un Agente

```bash
AGENT_ID="uuid-del-agente"
curl -X PUT http://localhost:5050/api/whatsapp/agents/${AGENT_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{
    "name": "Nombre Actualizado",
    "instructor": "Nuevas instrucciones..."
  }'
```

### 5. Eliminar (Desactivar) un Agente

```bash
AGENT_ID="uuid-del-agente"
curl -X DELETE http://localhost:5050/api/whatsapp/agents/${AGENT_ID} \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

---

## 🔍 Verificación

### Test 1: Usuario A crea agente, Usuario B no lo ve

```bash
# Usuario A crea agente
TOKEN_A="token_del_usuario_a"
curl -X POST http://localhost:5050/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN_A}" \
  -d '{"name": "Agente Usuario A", "instructor": "..."}'

# Usuario B lista agentes (no debe ver el de A)
TOKEN_B="token_del_usuario_b"
curl -X GET http://localhost:5050/api/whatsapp/agents \
  -H "Authorization: Bearer ${TOKEN_B}"
```

### Test 2: Usuario B intenta acceder al agente de Usuario A

```bash
AGENT_ID_A="uuid_del_agente_del_usuario_a"
TOKEN_B="token_del_usuario_b"

curl -X GET http://localhost:5050/api/whatsapp/agents/${AGENT_ID_A} \
  -H "Authorization: Bearer ${TOKEN_B}"
```

**Debería devolver 403 Forbidden:**
```json
{
  "success": false,
  "error": "Acceso denegado: El agente no pertenece al usuario autenticado"
}
```

---

## 🐛 Troubleshooting

### Error: "Usuario no autenticado"

**Solución:** Asegúrate de enviar el token JWT en el header `Authorization: Bearer <token>`

### Los agentes no se filtran por usuario

**Verifica:**
1. Que el middleware `authenticate` está aplicado a las rutas
2. Que `req.user.id` está disponible en el controlador
3. Revisa los logs del servidor para ver errores

### Un usuario ve agentes de otro usuario

**Verifica:**
1. Que el filtro por `created_by` está funcionando en `listAgents`
2. Que la validación de ownership está activa en `getAgent`, `updateAgent`, `deleteAgent`

---

## 📝 Notas Importantes

1. **Autenticación Requerida:** Todas las rutas de agentes ahora requieren autenticación
2. **Backward Compatibility:** Los agentes creados antes de esta implementación seguirán funcionando, pero solo serán visibles para el usuario que los creó
3. **Performance:** El filtrado por `created_by` usa índices para optimizar las consultas
4. **Seguridad:** La validación de ownership previene acceso no autorizado incluso si alguien conoce el `id` del agente

---

## ✅ Checklist de Implementación

- [x] Modelo WhatsAppAgent actualizado con filtrado por user_id
- [x] Controlador actualizado con validaciones de ownership
- [x] Rutas actualizadas para requerir autenticación
- [x] Validación de ownership en todas las operaciones CRUD
- [x] Logs de intentos de acceso no autorizado
- [x] Documentación completa

---

## 🔄 Comparación con Agentes de ElevenLabs

| Característica | Agentes ElevenLabs | Agentes WhatsApp |
|----------------|-------------------|------------------|
| Tabla | `agents` | `whatsapp_agents` |
| Campo de ownership | `user_id` | `created_by` |
| Filtrado por usuario | ✅ Sí | ✅ Sí |
| Validación de ownership | ✅ Sí | ✅ Sí |
| Autenticación requerida | ✅ Sí | ✅ Sí |
| Logs de acceso no autorizado | ✅ Sí | ✅ Sí |

---

## 📞 Soporte

Si encuentras problemas, revisa:
1. Los logs del servidor
2. Los logs de la base de datos
3. La estructura de la tabla `whatsapp_agents`
4. Los tokens JWT de autenticación

