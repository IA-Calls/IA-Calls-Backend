# Integración con ElevenLabs

Este documento describe la integración del sistema IA-Calls con la API de ElevenLabs para crear agentes conversacionales automáticamente cuando se registran nuevos usuarios.

## Configuración

### Variables de Entorno

Agrega la siguiente variable de entorno a tu archivo `.env`:

```env
# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### Obtener la API Key de ElevenLabs

1. Ve a [ElevenLabs](https://elevenlabs.io)
2. Inicia sesión en tu cuenta
3. Ve a la sección de configuración/perfil
4. Genera o copia tu API key
5. Agrega la key a tu archivo `.env`

## Funcionalidad

### Creación Automática de Agentes

Cuando se crea un nuevo usuario en el sistema (ya sea por registro o por un administrador), automáticamente se:

1. **Crea un agente conversacional** en ElevenLabs con:
   - Nombre personalizado: "Agente [Nombre del usuario]"
   - Configuración de voz por defecto: `SZfY4K69FwXus87eayHK` (modelo `eleven_turbo_v2`)
   - Idioma: Español
   - Prompt personalizado basado en el nombre y rol del usuario
   - Tags: ["ia-calls", "usuario", username, role]

2. **Almacena el agent_id** en la base de datos del usuario para futuras referencias

3. **Incluye información del agente** en la respuesta de registro/creación

### Configuración del Agente

Los agentes se crean con la siguiente configuración predeterminada:

```json
{
  "conversation_config": {
    "tts": {
      "voice_id": "SZfY4K69FwXus87eayHK",
      "model_id": "eleven_turbo_v2"
    },
    "conversation": {
      "text_only": false
    },
    "agent": {
      "language": "es",
      "prompt": {
        "prompt": "Eres el asistente personal de [Nombre] en IA-Calls. Responde preguntas sobre el software IA-Calls y ayuda con tareas relacionadas. Mantén un tono profesional y amigable."
      }
    }
  },
  "name": "Agente [Nombre]",
  "tags": ["ia-calls", "usuario", "username", "role"]
}
```

## Migración de Base de Datos

Para agregar el campo `agent_id` a usuarios existentes, ejecuta el script de migración:

```bash
psql -d your_database -f scripts/add_agent_id_field.sql
```

O ejecuta manualmente:

```sql
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);

COMMENT ON COLUMN "public"."users".agent_id IS 'ID del agente conversacional de ElevenLabs asociado al usuario';

CREATE INDEX IF NOT EXISTS idx_users_agent_id ON "public"."users"(agent_id);
```

## API del Servicio

### ElevenLabsService

El servicio `elevenlabsService` proporciona los siguientes métodos:

#### `createAgent(options)`
Crea un nuevo agente conversacional.

```javascript
const result = await elevenlabsService.createAgent({
  name: "Mi Agente",
  tags: ["tag1", "tag2"],
  conversation_config: {
    agent: {
      prompt: {
        prompt: "Prompt personalizado"
      }
    }
  }
});
```

#### `getAgent(agentId)`
Obtiene información de un agente existente.

#### `updateAgent(agentId, updateData)`
Actualiza la configuración de un agente.

#### `deleteAgent(agentId)`
Elimina un agente.

#### `listAgents()`
Lista todos los agentes de la cuenta.

#### `testConnection()`
Verifica la conectividad con la API de ElevenLabs.

## Manejo de Errores

El sistema está diseñado para ser resiliente:

- Si la API de ElevenLabs no está disponible, el usuario se crea sin agente
- Si no hay API key configurada, se muestra una advertencia pero el sistema continúa
- Los errores se registran en los logs para debugging

## Respuesta de Registro

Cuando se registra un usuario exitosamente, la respuesta incluye información del agente:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "usuario",
      "email": "usuario@example.com",
      "agentId": "agent_123456789"
    },
    "token": "jwt_token_here",
    "agent": {
      "created": true,
      "agent_id": "agent_123456789",
      "message": "Agente conversacional creado exitosamente"
    }
  },
  "message": "Usuario registrado exitosamente"
}
```

## Logs

El sistema registra información detallada sobre la creación de agentes:

- `🤖 Creando agente conversacional para usuario: [username]`
- `✅ Agente creado exitosamente con ID: [agent_id]`
- `⚠️ No se pudo crear el agente: [error]`
- `❌ Error creando agente conversacional: [error]`

## Consideraciones de Seguridad

- La API key de ElevenLabs debe mantenerse segura y no exponerse en el código
- Los agent_id se almacenan en la base de datos para futuras referencias
- Solo usuarios autenticados pueden crear agentes a través del sistema
