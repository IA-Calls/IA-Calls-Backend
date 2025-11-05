# Endpoint GET /api/agents

## Descripción
Este endpoint permite listar todos los agentes conversacionales disponibles en ElevenLabs.

## URLs Disponibles
```
GET /api/agents
GET /api/agents/list
```

Ambas rutas son equivalentes y devuelven la misma información.

## Método
```
GET
```

## Headers
No requiere headers especiales. El endpoint usa la API key configurada en las variables de entorno (`ELEVENLABS_API_KEY`).

## Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Agentes obtenidos exitosamente",
  "data": {
    "agents": [
      {
        "agent_id": "agent_4701k8fcsvhaes5s1h6tw894g98s",
        "name": "Agente IA-Calls",
        "created_at": "2025-10-26T12:00:00Z",
        "updated_at": "2025-11-02T10:00:00Z",
        "status": "active",
        "language": "es",
        "voice_id": "WOSzFvlJRm2hkYb3KA5w"
      },
      {
        "agent_id": "agent_abc123xyz456",
        "name": "Agente de Ventas",
        "created_at": "2025-11-01T08:00:00Z",
        "updated_at": "2025-11-01T08:00:00Z",
        "status": "active",
        "language": "es",
        "voice_id": "pNInz6obpgDQGcFmaJgB"
      }
    ],
    "raw_data": {
      // Datos completos de la respuesta de ElevenLabs
    },
    "count": 2,
    "timestamp": "2025-11-02T10:00:00.000Z"
  }
}
```

## Respuesta de Error (500)

```json
{
  "success": false,
  "message": "Error obteniendo agentes de ElevenLabs",
  "error": "Error 401: Unauthorized",
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

## Estructura de Datos

### Campo `agents` (formateado)
Array de objetos con información resumida de cada agente:
- `agent_id`: ID único del agente
- `name`: Nombre del agente
- `created_at`: Fecha de creación
- `updated_at`: Fecha de última actualización
- `status`: Estado del agente
- `language`: Idioma configurado
- `voice_id`: ID de la voz TTS

### Campo `raw_data`
Contiene la respuesta completa de la API de ElevenLabs sin formatear, útil para acceder a todos los detalles del agente.

### Campo `count`
Número total de agentes encontrados.

## Ejemplo con cURL

```bash
curl -X GET http://localhost:5000/api/agents
```

```bash
curl -X GET http://localhost:5000/api/agents/list
```

## Ejemplo con JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:5000/api/agents');
const data = await response.json();

if (data.success) {
  console.log(`Total de agentes: ${data.data.count}`);
  data.data.agents.forEach(agent => {
    console.log(`- ${agent.name} (${agent.agent_id})`);
  });
}
```

## Ejemplo con Axios

```javascript
const axios = require('axios');

async function listAgents() {
  try {
    const response = await axios.get('http://localhost:5000/api/agents');
    
    if (response.data.success) {
      console.log(`Total de agentes: ${response.data.data.count}`);
      response.data.data.agents.forEach(agent => {
        console.log(`- ${agent.name} (${agent.agent_id})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

listAgents();
```

## Notas Importantes

1. **Público**: Este endpoint NO requiere autenticación (a diferencia de otros endpoints de agentes).

2. **API Key**: La API key de ElevenLabs debe estar configurada en la variable de entorno `ELEVENLABS_API_KEY`.

3. **Formato**: La respuesta incluye tanto un formato simplificado (`agents`) como los datos completos (`raw_data`) de la API de ElevenLabs.

4. **Rutas**: Ambas rutas (`/api/agents` y `/api/agents/list`) son funcionalmente idénticas. Usa la que prefieras.

## API de ElevenLabs

Este endpoint llama internamente a:
```
GET https://api.elevenlabs.io/v1/convai/agents
Headers:
  xi-api-key: [ELEVENLABS_API_KEY]
```

## Posibles Errores

- **401 Unauthorized**: La API key de ElevenLabs no es válida o no está configurada
- **500 Internal Server Error**: Error en el servidor o en la comunicación con ElevenLabs
- **Timeout**: La API de ElevenLabs no responde en el tiempo esperado



