# Endpoints GET y PATCH /api/agents/:agentId

## Descripción
Estos endpoints permiten obtener y actualizar información de un agente específico en ElevenLabs mediante su ID.

---

## 1. GET /api/agents/:agentId

### Descripción
Obtiene la información completa de un agente específico desde ElevenLabs.

### Método
```
GET
```

### URL
```
GET /api/agents/:agentId
```

### Parámetros
- `agentId` (path parameter): ID del agente (ej: `agent_1601k8xw7yc5ex893rd7qj9ybppn`)

### Headers
No requiere headers especiales. El endpoint usa la API key configurada en las variables de entorno (`ELEVENLABS_API_KEY`).

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Agente obtenido exitosamente",
  "data": {
    "agent_id": "agent_1601k8xw7yc5ex893rd7qj9ybppn",
    "name": "Celion",
    "conversation_config": {
      "asr": {
        "quality": "high",
        "provider": "elevenlabs",
        "user_input_audio_format": "pcm_16000",
        "keywords": []
      },
      "turn": {
        "turn_timeout": 7,
        "silence_end_call_timeout": -1,
        "mode": "turn",
        "turn_eagerness": "normal"
      },
      "tts": {
        "model_id": "eleven_turbo_v2_5",
        "voice_id": "WOSzFvlJRm2hkYb3KA5w",
        "agent_output_audio_format": "pcm_48000",
        "optimize_streaming_latency": 3,
        "stability": 0.5,
        "speed": 1.04,
        "similarity_boost": 0.8
      },
      "conversation": {
        "text_only": false,
        "max_duration_seconds": 600,
        "client_events": [
          "audio",
          "interruption",
          "user_transcript",
          "agent_response",
          "agent_response_correction"
        ]
      },
      "agent": {
        "first_message": "Hola muy buenas noches, hablo con el {{name}} en el área de {{category}}?",
        "language": "es",
        "prompt": {
          "prompt": "Eres Edwin...",
          "llm": "gemini-2.0-flash",
          "temperature": 0.45,
          "max_tokens": -1,
          "knowledge_base": [...],
          "tools": [...]
        }
      }
    },
    "platform_settings": {...},
    "phone_numbers": [...],
    "tags": [],
    "metadata": {...}
  },
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

### Respuesta de Error (404)

```json
{
  "success": false,
  "message": "Agente no encontrado o error obteniendo información",
  "error": "Error 404: Agent not found",
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

### Ejemplo con cURL

```bash
curl -X GET http://localhost:5000/api/agents/agent_1601k8xw7yc5ex893rd7qj9ybppn
```

### Ejemplo con JavaScript (fetch)

```javascript
const agentId = 'agent_1601k8xw7yc5ex893rd7qj9ybppn';
const response = await fetch(`http://localhost:5000/api/agents/${agentId}`);
const data = await response.json();

if (data.success) {
  console.log('Agente:', data.data.name);
  console.log('Configuración:', data.data.conversation_config);
}
```

---

## 2. PATCH /api/agents/:agentId

### Descripción
Actualiza la configuración de un agente específico en ElevenLabs. Puedes actualizar cualquier campo del agente enviando solo los campos que deseas modificar.

### Método
```
PATCH
```

### URL Alternativa
```
PUT /api/agents/:agentId
```

Ambas rutas (PATCH y PUT) son funcionalmente idénticas.

### Parámetros
- `agentId` (path parameter): ID del agente a actualizar

### Headers
```
Content-Type: application/json
```

### Body
Puedes enviar cualquier campo del agente que desees actualizar. Ejemplos:

#### Ejemplo 1: Actualizar solo el nombre
```json
{
  "name": "Nuevo Nombre del Agente"
}
```

#### Ejemplo 2: Actualizar configuración TTS
```json
{
  "conversation_config": {
    "tts": {
      "voice_id": "WOSzFvlJRm2hkYb3KA5w",
      "stability": 0.6,
      "speed": 1.1,
      "similarity_boost": 0.85
    }
  }
}
```

#### Ejemplo 3: Actualizar prompt del agente
```json
{
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "Eres un nuevo asistente virtual...",
        "temperature": 0.5
      }
    }
  }
}
```

#### Ejemplo 4: Actualizar mensaje inicial
```json
{
  "conversation_config": {
    "agent": {
      "first_message": "Hola, ¿cómo puedo ayudarte hoy?"
    }
  }
}
```

#### Ejemplo 5: Actualizar variables dinámicas
```json
{
  "conversation_config": {
    "agent": {
      "dynamic_variables": {
        "dynamic_variable_placeholders": {
          "name": "Juan",
          "category": "Medicina"
        }
      }
    }
  }
}
```

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Agente actualizado exitosamente",
  "data": {
    "agent_id": "agent_1601k8xw7yc5ex893rd7qj9ybppn",
    "name": "Nuevo Nombre del Agente",
    "conversation_config": {
      ...
    }
  },
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

### Respuesta de Error (400)

```json
{
  "success": false,
  "message": "Error al actualizar agente en ElevenLabs",
  "error": "Error 400: Invalid configuration",
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

### Respuesta de Error - Body Vacío (400)

```json
{
  "success": false,
  "message": "Se requiere al menos un campo para actualizar",
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

### Ejemplo con cURL

```bash
curl -X PATCH http://localhost:5000/api/agents/agent_1601k8xw7yc5ex893rd7qj9ybppn \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agente Actualizado"
  }'
```

### Ejemplo con JavaScript (fetch)

```javascript
const agentId = 'agent_1601k8xw7yc5ex893rd7qj9ybppn';
const response = await fetch(`http://localhost:5000/api/agents/${agentId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Agente Actualizado',
    conversation_config: {
      agent: {
        prompt: {
          prompt: 'Eres un asistente actualizado...',
          temperature: 0.5
        }
      }
    }
  })
});

const data = await response.json();
console.log('Actualizado:', data.success);
```

### Ejemplo con Axios

```javascript
const axios = require('axios');

async function updateAgent() {
  try {
    const agentId = 'agent_1601k8xw7yc5ex893rd7qj9ybppn';
    const response = await axios.patch(
      `http://localhost:5000/api/agents/${agentId}`,
      {
        name: 'Agente Actualizado',
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'Eres un asistente actualizado...'
            }
          }
        }
      }
    );
    
    console.log('Agente actualizado:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

updateAgent();
```

---

## Campos Actualizables

Puedes actualizar cualquier campo del agente, incluyendo:

- `name`: Nombre del agente
- `conversation_config.asr.*`: Configuración de ASR (reconocimiento de voz)
- `conversation_config.tts.*`: Configuración de TTS (síntesis de voz)
- `conversation_config.agent.first_message`: Mensaje inicial
- `conversation_config.agent.language`: Idioma
- `conversation_config.agent.prompt.*`: Configuración del prompt y LLM
- `conversation_config.agent.dynamic_variables.*`: Variables dinámicas
- `platform_settings.*`: Configuración de plataforma
- `tags`: Tags del agente

## Notas Importantes

1. **Público**: Estos endpoints NO requieren autenticación (son públicos).

2. **API Key**: La API key de ElevenLabs debe estar configurada en la variable de entorno `ELEVENLABS_API_KEY`.

3. **Actualización Parcial**: Solo necesitas enviar los campos que deseas actualizar. Los demás campos mantendrán sus valores actuales.

4. **Deep Merge**: Los objetos anidados se fusionan correctamente. Por ejemplo, si actualizas solo `conversation_config.tts.voice_id`, los demás campos de `tts` se mantienen.

5. **Validación**: El endpoint valida que el body no esté vacío antes de hacer la petición a ElevenLabs.

6. **Rutas**: Tanto `PATCH` como `PUT` funcionan de la misma manera. Usa el que prefieras.

## API de ElevenLabs

Estos endpoints llaman internamente a:

**GET:**
```
GET https://api.elevenlabs.io/v1/convai/agents/{agent_id}
Headers:
  xi-api-key: [ELEVENLABS_API_KEY]
```

**PATCH:**
```
PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}
Headers:
  xi-api-key: [ELEVENLABS_API_KEY]
  Content-Type: application/json
Body: { campos a actualizar }
```

## Posibles Errores

- **400 Bad Request**: Body vacío o configuración inválida
- **404 Not Found**: El agente con ese ID no existe
- **401 Unauthorized**: La API key de ElevenLabs no es válida
- **500 Internal Server Error**: Error en el servidor o en la comunicación con ElevenLabs

