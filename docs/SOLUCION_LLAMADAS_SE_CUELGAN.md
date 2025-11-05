# 🔧 Solución: Llamadas se Cuelgan Inmediatamente al Contestar

## 🐛 Problema

Cuando se realizan batch calls desde el backend (no desde ElevenLabs directamente), las llamadas se cuelgan inmediatamente después de que el usuario contesta.

## 🔍 Causas Posibles

### 1. **`turn_timeout` muy corto** ⚠️ (MÁS COMÚN)
- El `turn_timeout` es el tiempo máximo que el agente espera para que el usuario responda después de hablar
- Si es muy corto (ej: 7 segundos), la llamada se cuelga si el usuario tarda en responder
- **Solución**: Aumentar `turn_timeout` a al menos 15-20 segundos

### 2. **Falta de `first_message`** ⚠️
- Si el agente no tiene un `first_message` configurado, puede no saber qué decir al iniciar la llamada
- Esto puede causar que la llamada termine inmediatamente
- **Solución**: Configurar un `first_message` apropiado

### 3. **Configuración incorrecta del agente**
- El agente puede tener configuraciones que causan que termine la llamada prematuramente
- **Solución**: Verificar y actualizar la configuración del agente

---

## ✅ Soluciones Implementadas

### 1. **Aumentado `turn_timeout` por defecto**
- Cambiado de `7` a `20` segundos en el `baseAgentConfig`
- Esto afecta a los **nuevos agentes** que se creen

### 2. **Validación automática antes de iniciar llamadas**
- El sistema ahora verifica la configuración del agente antes de iniciar batch calls
- Muestra advertencias si:
  - `turn_timeout` es menor a 15 segundos
  - Falta `first_message`

---

## 🔧 Cómo Corregir Agentes Existentes

### Opción 1: Actualizar el Agente vía API (Recomendado)

Usa el endpoint `PATCH /api/agents/:agentId` para actualizar la configuración:

```bash
curl -X PATCH http://localhost:5000/api/agents/AGENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "conversation_config": {
      "turn": {
        "turn_timeout": 20,
        "silence_end_call_timeout": -1,
        "mode": "turn",
        "turn_eagerness": "normal"
      },
      "agent": {
        "first_message": "Hola, ¿cómo estás? ¿En qué puedo ayudarte hoy?"
      }
    }
  }'
```

### Opción 2: Actualizar vía JavaScript/Fetch

```javascript
const updateAgent = async (agentId) => {
  const response = await fetch(`/api/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      conversation_config: {
        turn: {
          turn_timeout: 20,  // Aumentar a 20 segundos
          silence_end_call_timeout: -1,
          mode: 'turn',
          turn_eagerness: 'normal'
        },
        agent: {
          first_message: 'Hola, ¿cómo estás? ¿En qué puedo ayudarte hoy?'
        }
      }
    })
  });

  const data = await response.json();
  return data;
};

// Usar
updateAgent('agent_1601k8xw7yc5ex893rd7qj9ybppn');
```

### Opción 3: Verificar y Actualizar desde ElevenLabs Dashboard

1. Ve a [ElevenLabs Dashboard](https://elevenlabs.io/app/convai/agents)
2. Busca tu agente
3. Edita la configuración:
   - **Turn Timeout**: Cambia a 20 segundos (o más)
   - **First Message**: Asegúrate de tener un mensaje inicial configurado

---

## 📋 Configuración Recomendada

### Configuración Mínima para Batch Calls

```json
{
  "conversation_config": {
    "turn": {
      "turn_timeout": 20,
      "silence_end_call_timeout": -1,
      "mode": "turn",
      "turn_eagerness": "normal"
    },
    "agent": {
      "first_message": "Hola, ¿cómo estás? ¿En qué puedo ayudarte hoy?",
      "language": "es"
    }
  }
}
```

### Valores Recomendados

| Parámetro | Valor Recomendado | Descripción |
|-----------|-------------------|-------------|
| `turn_timeout` | **20-30 segundos** | Tiempo máximo de espera para respuesta del usuario |
| `silence_end_call_timeout` | **-1** (deshabilitado) | No terminar llamada por silencio |
| `first_message` | **Siempre configurado** | Mensaje inicial del agente |
| `max_duration_seconds` | **600** (10 minutos) | Duración máxima de la llamada |

---

## 🔍 Cómo Verificar la Configuración Actual

### Verificar vía API

```bash
curl -X GET http://localhost:5000/api/agents/AGENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verificar en los Logs

Cuando inicies un batch call, el sistema ahora muestra:

```
🔍 Verificando configuración del agente agent_xxx...
📋 Configuración del agente:
   - turn_timeout: 7
   - first_message: ✅ Configurado
⚠️ ADVERTENCIA: turn_timeout es muy corto (7s). Se recomienda al menos 15 segundos...
```

---

## 🎯 Pasos para Resolver el Problema

### Paso 1: Identificar el Agente Problemático
```bash
# Obtener información del agente
GET /api/agents/:agentId
```

### Paso 2: Verificar Configuración
- Revisa `turn_timeout` (debe ser ≥ 15 segundos)
- Revisa `first_message` (debe estar configurado)

### Paso 3: Actualizar el Agente
```bash
# Actualizar turn_timeout
PATCH /api/agents/:agentId
{
  "conversation_config": {
    "turn": {
      "turn_timeout": 20
    }
  }
}
```

### Paso 4: Probar Nuevamente
- Inicia un nuevo batch call
- Verifica que las llamadas no se cuelguen inmediatamente

---

## 📝 Notas Importantes

1. **Los cambios solo afectan nuevos agentes**: Si ya creaste un agente con `turn_timeout: 7`, necesitas actualizarlo manualmente

2. **Validación automática**: El sistema ahora valida la configuración antes de iniciar llamadas y muestra advertencias

3. **No afecta llamadas en curso**: Si ya iniciaste un batch call, los cambios no afectarán las llamadas que ya están en progreso

4. **Recomendación**: Actualiza todos tus agentes existentes con `turn_timeout: 20` o más

---

## 🔗 Referencias

- Documentación de actualización de agentes: `docs/ENDPOINT_GET_UPDATE_AGENT.md`
- Endpoint de batch calls: `docs/ENDPOINT_START_CALLS.md`
- Documentación de ElevenLabs: [ElevenLabs API Docs](https://elevenlabs.io/docs/api-reference/convai)

---

## ❓ Preguntas Frecuentes

### ¿Por qué 20 segundos y no más?
- 20 segundos es un balance entre dar tiempo suficiente al usuario y no mantener llamadas innecesariamente
- Puedes aumentarlo a 30 segundos si tus usuarios necesitan más tiempo

### ¿Qué pasa si no configuro `first_message`?
- El agente puede no saber qué decir al iniciar la llamada
- Esto puede causar que la llamada termine inmediatamente
- **Siempre configura un `first_message`**

### ¿Los cambios son permanentes?
- Sí, los cambios se guardan en ElevenLabs
- Afectan todas las llamadas futuras con ese agente

---

## ✅ Checklist de Verificación

Antes de iniciar batch calls, verifica:

- [ ] El agente tiene `turn_timeout` ≥ 15 segundos
- [ ] El agente tiene `first_message` configurado
- [ ] El agente tiene `language` configurado correctamente
- [ ] El agente tiene `voice_id` y `model_id` configurados
- [ ] El grupo tiene un `agentId` asignado
- [ ] El grupo tiene clientes asignados

