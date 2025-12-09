# 🤖 Sistema de Agentes para WhatsApp

Documentación completa del sistema de agentes conversacionales para WhatsApp.

## 📋 Tabla de Contenidos

1. [Crear Agente](#crear-agente)
2. [Listar Agentes](#listar-agentes)
3. [Obtener Agente](#obtener-agente)
4. [Actualizar Agente](#actualizar-agente)
5. [Asignar Agente a Conversación](#asignar-agente-a-conversación)
6. [Eliminar Agente](#eliminar-agente)

---

## 🚀 Crear Agente

**POST** `/api/whatsapp/agents`

Crea un nuevo agente conversacional en ElevenLabs y lo almacena en la base de datos.

### Body

```json
{
  "name": "Agente de Soporte",
  "instructor": "Eres un asistente de soporte técnico. Responde preguntas sobre nuestros productos de manera amigable y profesional.",
  "text_only": false,
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "language": "es",
  "initial_message": "Hola, ¿en qué puedo ayudarte hoy?",
  "metadata": {}
}
```

### Parámetros

- `name` (requerido) - Nombre del agente
- `instructor` (requerido) - Sistema instructor (prompt) que define el comportamiento del agente
- `text_only` (opcional, default: `false`) - `true` para solo texto, `false` para incluir audio
- `voice_id` (opcional, default: `"pNInz6obpgDQGcFmaJgB"`) - ID de la voz en ElevenLabs
- `language` (opcional, default: `"es"`) - Idioma del agente
- `initial_message` (opcional) - Mensaje inicial del agente
- `metadata` (opcional) - Metadatos adicionales en formato JSON

### Ejemplo de Request

```javascript
const response = await fetch('http://localhost:5050/api/whatsapp/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN' // Si tienes autenticación
  },
  body: JSON.stringify({
    name: 'Agente de Soporte',
    instructor: 'Eres un asistente de soporte técnico. Responde preguntas sobre nuestros productos.',
    text_only: false,
    language: 'es'
  })
});

const data = await response.json();
```

### Ejemplo de Response

```json
{
  "success": true,
  "message": "Agente creado exitosamente",
  "data": {
    "id": "uuid-del-agente",
    "name": "Agente de Soporte",
    "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
    "instructor": "Eres un asistente de soporte técnico...",
    "text_only": false,
    "voice_id": "pNInz6obpgDQGcFmaJgB",
    "language": "es",
    "initial_message": null,
    "created_at": "2025-12-01T10:00:00Z"
  }
}
```

**Importante:** Guarda el `agent_id` (ID de ElevenLabs) y el `id` (ID interno) para usarlos en las siguientes peticiones.

---

## 📋 Listar Agentes

**GET** `/api/whatsapp/agents`

Obtiene todos los agentes activos.

### Query Parameters

- `active_only` (opcional, default: `true`) - Si es `true`, solo retorna agentes activos

### Ejemplo de Request

```javascript
const response = await fetch('http://localhost:5050/api/whatsapp/agents?active_only=true');
const data = await response.json();
```

### Ejemplo de Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Agente de Soporte",
      "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
      "instructor": "Eres un asistente...",
      "text_only": false,
      "voice_id": "pNInz6obpgDQGcFmaJgB",
      "language": "es",
      "is_active": true,
      "created_at": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

## 🔍 Obtener Agente

**GET** `/api/whatsapp/agents/:id`

Obtiene un agente específico por su ID.

### Ejemplo de Request

```javascript
const agentId = 'uuid-del-agente';
const response = await fetch(`http://localhost:5050/api/whatsapp/agents/${agentId}`);
const data = await response.json();
```

### Ejemplo de Response

```json
{
  "success": true,
  "data": {
    "id": "uuid-del-agente",
    "name": "Agente de Soporte",
    "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
    "instructor": "Eres un asistente de soporte técnico...",
    "text_only": false,
    "voice_id": "pNInz6obpgDQGcFmaJgB",
    "language": "es",
    "initial_message": null,
    "is_active": true,
    "metadata": {},
    "created_at": "2025-12-01T10:00:00Z",
    "updated_at": "2025-12-01T10:00:00Z"
  }
}
```

---

## ✏️ Actualizar Agente

**PUT** `/api/whatsapp/agents/:id`

Actualiza un agente existente.

### Body

```json
{
  "name": "Agente de Soporte Actualizado",
  "instructor": "Nuevo prompt del agente...",
  "text_only": true,
  "is_active": true
}
```

### Ejemplo de Request

```javascript
const agentId = 'uuid-del-agente';
const response = await fetch(`http://localhost:5050/api/whatsapp/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Agente Actualizado',
    instructor: 'Nuevo prompt...'
  })
});

const data = await response.json();
```

---

## 🔗 Asignar Agente a Conversación

**PUT** `/api/whatsapp/conversations/:phoneNumber/agent`

Asigna un agente a una conversación específica. El agente administrará todas las siguientes interacciones con ese número de teléfono.

### Body

```json
{
  "agent_id": "uuid-del-agente"
}
```

### Ejemplo de Request

```javascript
const phoneNumber = '573138539155';
const agentId = 'uuid-del-agente';

const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/${phoneNumber}/agent`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: agentId
  })
});

const data = await response.json();
```

### Ejemplo de Response

```json
{
  "success": true,
  "message": "Agente asignado exitosamente",
  "data": {
    "phoneNumber": "573138539155",
    "agent": {
      "id": "uuid-del-agente",
      "name": "Agente de Soporte",
      "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s"
    }
  }
}
```

---

## 🗑️ Eliminar Agente

**DELETE** `/api/whatsapp/agents/:id`

Desactiva un agente (soft delete).

### Ejemplo de Request

```javascript
const agentId = 'uuid-del-agente';
const response = await fetch(`http://localhost:5050/api/whatsapp/agents/${agentId}`, {
  method: 'DELETE'
});

const data = await response.json();
```

### Ejemplo de Response

```json
{
  "success": true,
  "message": "Agente desactivado exitosamente"
}
```

---

## 🔄 Flujo Completo

### 1. Crear Agente

```javascript
// Crear un nuevo agente
const createAgent = async () => {
  const response = await fetch('/api/whatsapp/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mi Agente',
      instructor: 'Eres un asistente amigable...',
      text_only: false,
      language: 'es'
    })
  });
  
  const data = await response.json();
  return data.data.id; // ID del agente creado
};
```

### 2. Asignar Agente a Conversación

```javascript
// Asignar agente a un número de teléfono
const assignAgent = async (phoneNumber, agentId) => {
  const response = await fetch(`/api/whatsapp/conversations/${phoneNumber}/agent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId })
  });
  
  return response.json();
};
```

### 3. Verificar Agente Asignado

```javascript
// Obtener conversación con información del agente
const getConversation = async (phoneNumber) => {
  const response = await fetch(`/api/whatsapp/conversations/${phoneNumber}`);
  const data = await response.json();
  
  if (data.data.agent) {
    console.log('Agente asignado:', data.data.agent.name);
    console.log('Agent ID (ElevenLabs):', data.data.agent.agent_id);
  }
  
  return data;
};
```

---

## 📝 Notas Importantes

1. **ID del Agente**: Hay dos IDs importantes:
   - `id`: ID interno en la base de datos (UUID)
   - `agent_id`: ID del agente en ElevenLabs (usado para las conversaciones)

2. **text_only**: 
   - `false`: El agente puede usar audio (requiere WebSocket)
   - `true`: El agente solo usa texto (más simple para WhatsApp)

3. **Instructor**: El prompt define el comportamiento del agente. Sé específico y claro.

4. **Asignación**: Una vez asignado un agente a una conversación, todas las siguientes interacciones usarán ese agente.

5. **ElevenLabs**: Los agentes se crean en ElevenLabs automáticamente. Asegúrate de tener configurado `ELEVENLABS_API_KEY` en tu `.env`.

---

## 🚀 Quick Start

```javascript
// 1. Crear agente
const agent = await fetch('/api/whatsapp/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Mi Agente',
    instructor: 'Eres un asistente...',
    text_only: false
  })
}).then(r => r.json());

// 2. Asignar a conversación
await fetch(`/api/whatsapp/conversations/573138539155/agent`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agent_id: agent.data.id })
});
```

---

¿Necesitas ayuda? Revisa los ejemplos en `examples/whatsapp-sse-frontend-example.js`

