# Endpoint POST /api/create-agent

## Descripción
Este endpoint permite crear agentes conversacionales en ElevenLabs fusionando un payload JSON del usuario con un JSON base (plantilla) predefinido.

## URL
```
POST /api/create-agent
```

## Headers
```
Content-Type: application/json
```

## Campos de Entrada (Opcionales)

Todos los campos son opcionales. Si no se proporcionan, se usarán los valores por defecto del JSON base.

| Campo | Tipo | Ruta en JSON Base | Descripción |
|-------|------|-------------------|-------------|
| `name` | string | `name` | Nombre del agente |
| `asr_quality` | string | `conversation_config.asr.quality` | Calidad ASR (ej: "high") |
| `tts_optimize_streaming_latency` | number | `conversation_config.tts.optimize_streaming_latency` | Optimización de latencia |
| `tts_stability` | number | `conversation_config.tts.stability` | Estabilidad TTS (0-1) |
| `tts_speed` | number | `conversation_config.tts.speed` | Velocidad de habla |
| `tts_similarity_boost` | number | `conversation_config.tts.similarity_boost` | Boost de similitud (0-1) |
| `tts_voice_id` | string | `conversation_config.tts.voice_id` | ID de la voz |
| `agent_first_message` | string | `conversation_config.agent.first_message` | Mensaje inicial del agente |
| `agent_language` | string | `conversation_config.agent.language` | Idioma del agente (ej: "es") |
| `dynamic_variable_placeholders` | object | `conversation_config.agent.dynamic_variables.dynamic_variable_placeholders` | Variables dinámicas |
| `prompt_text` | string | `conversation_config.agent.prompt.prompt` | Texto del prompt |
| `prompt_temperature` | number | `conversation_config.agent.prompt.temperature` | Temperatura del LLM (0-1) |
| `prompt_knowledge_base` | array | `conversation_config.agent.prompt.knowledge_base` | Base de conocimiento |
| `prompt_ignore_default_personality` | boolean | `conversation_config.agent.prompt.ignore_default_personality` | Ignorar personalidad por defecto |

## Ejemplo de Request Mínimo

```json
{
  "name": "Mi Agente Personalizado"
}
```

## Ejemplo de Request Completo

```json
{
  "name": "Agente de Ventas",
  "asr_quality": "high",
  "tts_optimize_streaming_latency": 3,
  "tts_stability": 0.6,
  "tts_speed": 1.1,
  "tts_similarity_boost": 0.85,
  "tts_voice_id": "WOSzFvlJRm2hkYb3KA5w",
  "agent_first_message": "Hola, ¿cómo puedo ayudarte hoy?",
  "agent_language": "es",
  "dynamic_variable_placeholders": {
    "name": "Cliente",
    "category": "Servicios"
  },
 "prompt_knowledge_base": [
    {
      "type": "file",
      "name": "Guía de Nutrición",
      "id": "b338JDWWVIHIsmgu28D5",
      "usage_mode": "auto"
    }
    ],
  "prompt_text": "Eres un agente de ventas profesional. Ayuda a los clientes con información sobre productos y servicios.",
  "prompt_temperature": 0.5,
  "prompt_ignore_default_personality": false
}
```

## Ejemplo de Request con Knowledge Base

```json
{
  "name": "Agente Especializado",
  "prompt_text": "Eres un experto en nutrición que ayuda a las personas con sus consultas.",
  "prompt_knowledge_base": [
    {
      "type": "file",
      "name": "Guía de Nutrición",
      "id": "b338JDWWVIHIsmgu28D5",
      "usage_mode": "auto"
    }
  ]
}
```

## Respuesta Exitosa (201)

```json
{
  "success": true,
  "message": "Agente creado exitosamente en ElevenLabs",
  "data": {
    "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
    "agent_data": {
      "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
      "name": "Agente de Ventas",
      ...
    },
    "merged_config": {
      "name": "Agente de Ventas",
      "conversation_config": {
        ...
      }
    },
    "timestamp": "2025-11-02T10:00:00.000Z"
  }
}
```

## Respuesta de Error (500)

```json
{
  "success": false,
  "message": "Error al crear agente en ElevenLabs",
  "error": "Error 400: Invalid configuration...",
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

## Notas Importantes

1. **Deep Merge**: El endpoint utiliza deep merge para fusionar el payload del usuario con el JSON base. Solo los campos proporcionados sobrescribirán los valores por defecto.

2. **JSON Base**: Si no se proporciona un campo, se utilizará el valor predeterminado del JSON base (plantilla completa del agente "Clon de Celion").

3. **Arrays**: Los arrays (como `prompt_knowledge_base`) se reemplazan completamente si se proporcionan.

4. **Variables de Entorno**: Asegúrate de tener configurada `ELEVENLABS_API_KEY` en las variables de entorno.

## Ejemplo con cURL

```bash
curl -X POST http://localhost:5000/api/create-agent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Agente",
    "prompt_text": "Eres un asistente útil y amigable.",
    "agent_language": "es"
  }'
```

## Ejemplo con JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:5000/api/create-agent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Mi Agente',
    prompt_text: 'Eres un asistente útil y amigable.',
    agent_language: 'es'
  })
});

const data = await response.json();
console.log('Agent ID:', data.data.agent_id);
```

