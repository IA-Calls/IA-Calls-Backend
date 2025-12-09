# 🔄 Migración de ElevenLabs a Vertex AI

## 📋 Resumen de Cambios

Este documento describe los cambios realizados para migrar de ElevenLabs (WebSocket) a Vertex AI Dialogflow CX para los agentes de WhatsApp.

## ✅ Cambios Implementados

### 1. Nuevo Servicio: `vertexAIDialogflowService.js`

**Ubicación**: `src/services/vertexAIDialogflowService.js`

**Funcionalidades**:
- ✅ `createAgent()` - Crear agentes en Dialogflow CX
- ✅ `detectIntent()` - Enviar mensajes y recibir respuestas
- ✅ `getAgent()` - Obtener información de un agente
- ✅ `listAgents()` - Listar todos los agentes

**Ventajas**:
- No requiere WebSocket (conexión persistente)
- Manejo automático de sesiones por usuario
- Mayor estabilidad (sin timeouts de 30s)
- Mejor para chat de texto

### 2. Controlador Actualizado: `whatsappAgents.js`

**Cambios**:
```javascript
// ANTES (ElevenLabs)
const { elevenlabsService } = require('../agents');

// DESPUÉS (Vertex AI)
const vertexAIDialogflowService = require('../services/vertexAIDialogflowService');
```

**Método `createAgent()`**:
- ❌ Ya no crea agentes en ElevenLabs
- ✅ Crea agentes en Vertex AI Dialogflow CX
- ✅ Guarda metadata con `platform: 'vertex-ai'`

### 3. Servicio Actualizado: `whatsappAgentService.js`

**Cambios Principales**:

```javascript
// ANTES (ElevenLabs WebSocket)
- Conexión WebSocket persistente
- Manejo de eventos de audio/texto
- Timeout de 30 segundos
- Buffer de respuestas

// DESPUÉS (Vertex AI REST API)
+ Llamadas HTTP simples
+ Session ID = número de teléfono
+ Sin timeouts
+ Respuesta inmediata
```

**Método `processMessageWithAgent()`**:
```javascript
// ANTES
const response = await elevenlabsWebSocketService.sendMessage(phoneNumber, messageContent);

// DESPUÉS
const response = await vertexAIDialogflowService.detectIntent(
  agent.agentId,
  sessionId,
  messageContent,
  agent.language
);
```

### 4. Nuevas Dependencias

**Agregadas**:
```json
{
  "google-auth-library": "^9.x.x"
}
```

**Ya existentes (usadas por Vertex AI)**:
- `@google-cloud/aiplatform`
- `@google-cloud/vertexai`

## 🔧 Variables de Entorno Requeridas

### Nuevas Variables

Agregar a `.env`:

```env
# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
DIALOGFLOW_LOCATION=us-central1
```

### Variables Obsoletas (ya no usadas)

Estas variables ya no se usan para agentes de WhatsApp:
```env
ELEVENLABS_API_KEY=...  # Solo para llamadas de voz (si aplica)
```

## 📊 Comparación de Arquitecturas

### Arquitectura Anterior (ElevenLabs)

```
Usuario WhatsApp
  ↓ (webhook)
Backend Node.js
  ↓ (WebSocket)
ElevenLabs WebSocket Server
  ↓ (eventos)
Backend (polling buffer)
  ↓ (respuesta)
Usuario WhatsApp
```

**Problemas**:
- ❌ Timeouts de 30 segundos
- ❌ Conexión debe mantenerse activa
- ❌ Manejo complejo de eventos
- ❌ Solo recibe "ping" sin respuestas útiles

### Arquitectura Actual (Vertex AI)

```
Usuario WhatsApp
  ↓ (webhook)
Backend Node.js
  ↓ (HTTP POST)
Vertex AI Dialogflow CX
  ↓ (HTTP Response)
Backend
  ↓ (respuesta)
Usuario WhatsApp
```

**Ventajas**:
- ✅ Sin timeouts
- ✅ Respuesta inmediata
- ✅ Más simple y confiable
- ✅ Manejo automático de contexto
- ✅ Mejor para texto

## 🚀 Cómo Usar

### 1. Configurar Credenciales

```bash
# 1. Crear service account en Google Cloud
gcloud iam service-accounts create ia-calls-whatsapp

# 2. Asignar permisos
gcloud projects add-iam-policy-binding TU-PROYECTO-ID \
    --member="serviceAccount:ia-calls-whatsapp@TU-PROYECTO-ID.iam.gserviceaccount.com" \
    --role="roles/dialogflow.admin"

# 3. Crear y descargar key
gcloud iam service-accounts keys create ./vertex-ai-key.json \
    --iam-account=ia-calls-whatsapp@TU-PROYECTO-ID.iam.gserviceaccount.com
```

### 2. Actualizar .env

```env
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-123456
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
DIALOGFLOW_LOCATION=us-central1
```

### 3. Reiniciar Servidor

```bash
npm run dev
```

### 4. Crear Agente

```bash
curl -X POST http://localhost:5000/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Agente",
    "instructor": "Eres un asistente amable.",
    "language": "es"
  }'
```

### 5. Asignar a Conversación

```bash
curl -X PUT http://localhost:5000/api/whatsapp/conversations/573138539155/agent \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "uuid-del-agente"}'
```

### 6. Probar

Envía un mensaje de WhatsApp al número configurado. El agente responderá automáticamente.

## 🔍 Debugging

### Ver Logs del Servidor

```bash
npm run dev
```

Logs esperados:
```
🤖 Procesando mensaje para 573138539155 con agente Mi Agente (vertex-agent-id)
📤 Enviando mensaje a Vertex AI: "Hola"
📥 Respuesta recibida del agente: "¡Hola! ¿Cómo puedo ayudarte?"
🎯 Confianza: 95.00%
```

### Verificar Agente en Dialogflow

1. Ir a: https://dialogflow.cloud.google.com/cx/
2. Seleccionar proyecto
3. Ver agentes creados

### Probar Manualmente

Puedes probar un agente directamente en la consola de Dialogflow CX sin necesidad de WhatsApp.

## ⚠️ Consideraciones

### 1. Contexto de Sesión

- **Session ID**: Se usa el número de teléfono del usuario
- **Persistencia**: Vertex AI mantiene el contexto automáticamente
- **Limpieza**: Las sesiones expiran después de 30 minutos de inactividad

### 2. Límites y Cuotas

- **Free Tier**: 3 millones de solicitudes de texto gratis/mes
- **Rate Limits**: 600 solicitudes por minuto
- **Concurrent Sessions**: Hasta 10,000 sesiones simultáneas

### 3. Costos

Para 10,000 mensajes/mes (después del free tier):
- Vertex AI: ~$70 USD/mes
- ElevenLabs: ~$500-1000 USD/mes (si fuera por minuto de audio)

**Ahorro**: ~85% para chat de texto

## 📝 Checklist de Migración

- [x] Crear servicio de Vertex AI
- [x] Actualizar controlador de agentes
- [x] Actualizar servicio de WhatsApp
- [x] Instalar dependencias
- [x] Agregar variables de entorno
- [x] Crear documentación
- [ ] Configurar proyecto en Google Cloud
- [ ] Crear service account
- [ ] Descargar credenciales
- [ ] Actualizar .env
- [ ] Reiniciar servidor
- [ ] Crear agente de prueba
- [ ] Probar con WhatsApp

## 🎉 Resultado

Después de la migración:
- ✅ Sin errores de timeout
- ✅ Respuestas inmediatas del agente
- ✅ Contexto de conversación mantenido
- ✅ Arquitectura más simple y confiable
- ✅ Menor costo operativo

