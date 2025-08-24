# Agentes Conversacionales

Esta carpeta contiene los servicios y utilidades para integrar agentes conversacionales con el sistema IA-Calls.

## Estructura

```
src/agents/
├── README.md              # Este archivo
├── index.js              # Exportaciones principales
└── elevenlabsService.js   # Servicio de ElevenLabs
```

## Servicios Disponibles

### ElevenLabsService

Servicio para interactuar con la API de ElevenLabs y gestionar agentes conversacionales.

#### Métodos Principales

- `createAgent(options)` - Crear un nuevo agente
- `getAgent(agentId)` - Obtener información de un agente
- `updateAgent(agentId, data)` - Actualizar configuración de un agente
- `deleteAgent(agentId)` - Eliminar un agente
- `listAgents()` - Listar todos los agentes
- `testConnection()` - Verificar conectividad con la API

#### Uso

```javascript
const { elevenlabsService } = require('../agents');

// Crear un agente
const result = await elevenlabsService.createAgent({
  name: "Mi Agente",
  tags: ["ia-calls", "usuario"],
  conversation_config: {
    agent: {
      prompt: {
        prompt: "Eres un asistente útil"
      }
    }
  }
});

if (result.success) {
  console.log('Agente creado:', result.agent_id);
}
```

## Integración Automática

Los agentes se crean automáticamente cuando:

1. **Un usuario se registra** en el sistema
2. **Un administrador crea un usuario** manualmente

### Configuración Automática

- **Nombre**: "Agente [Nombre del usuario]"
- **Voz**: `SZfY4K69FwXus87eayHK` (eleven_turbo_v2)
- **Idioma**: Español
- **Prompt**: Personalizado según el nombre y rol del usuario
- **Tags**: ["ia-calls", "usuario", username, role]

## Variables de Entorno

```env
ELEVENLABS_API_KEY=your_api_key_here
```

## Endpoints API

### GET /api/agents/test
Probar conexión con ElevenLabs.

### GET /api/agents/list
Listar todos los agentes (solo admins).

### GET /api/agents/:agentId
Obtener información de un agente específico.

### PUT /api/agents/:agentId
Actualizar configuración de un agente.

### DELETE /api/agents/:agentId
Eliminar un agente (solo admins).

### POST /api/agents/create
Crear un agente manualmente (solo admins).

## Manejo de Errores

El sistema está diseñado para ser resiliente:

- Si ElevenLabs no está disponible, los usuarios se crean sin agente
- Los errores se registran en logs para debugging
- Las operaciones críticas continúan aunque falle la creación del agente

## Logs

El servicio registra información detallada:

- `🤖 Creando agente conversacional para usuario: [username]`
- `✅ Agente creado exitosamente con ID: [agent_id]`
- `⚠️ No se pudo crear el agente: [error]`
- `❌ Error creando agente conversacional: [error]`

## Futuras Extensiones

Esta estructura permite agregar fácilmente otros servicios de agentes:

```javascript
// src/agents/openaiService.js
// src/agents/anthropicService.js
// src/agents/customAgentService.js
```

Simplemente agrégalos al archivo `index.js` para exportarlos:

```javascript
module.exports = {
  elevenlabsService,
  openaiService,
  anthropicService
};
```
