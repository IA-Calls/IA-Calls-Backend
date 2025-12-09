# 🚀 Configuración de Vertex AI Dialogflow CX para Agentes de WhatsApp

## 📋 Prerrequisitos

1. **Cuenta de Google Cloud** con facturación habilitada
2. **Proyecto de Google Cloud** creado
3. **APIs habilitadas**:
   - Dialogflow API
   -    

## 🔧 Configuración Paso a Paso

### 1. Crear Proyecto en Google Cloud

```bash
# Crear proyecto
gcloud projects create TU-PROYECTO-ID --name="IA Calls WhatsApp"

# Establecer como proyecto activo
gcloud config set project TU-PROYECTO-ID

# Habilitar facturación (requerido)
# Ir a: https://console.cloud.google.com/billing
```

### 2. Habilitar APIs Necesarias

```bash
# Habilitar Dialogflow API
gcloud services enable dialogflow.googleapis.com

# Habilitar Cloud Resource Manager API
gcloud services enable cloudresourcemanager.googleapis.com
```

### 3. Crear Service Account

```bash
# Crear service account
gcloud iam service-accounts create ia-calls-whatsapp \
    --display-name="IA Calls WhatsApp Service Account"

# Asignar roles necesarios
gcloud projects add-iam-policy-binding TU-PROYECTO-ID \
    --member="serviceAccount:ia-calls-whatsapp@TU-PROYECTO-ID.iam.gserviceaccount.com" \
    --role="roles/dialogflow.admin"

# Crear y descargar key
gcloud iam service-accounts keys create ./vertex-ai-key.json \
    --iam-account=ia-calls-whatsapp@TU-PROYECTO-ID.iam.gserviceaccount.com
```

### 4. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
DIALOGFLOW_LOCATION=us-central1
```

**Regiones disponibles** para `DIALOGFLOW_LOCATION`:
- `us-central1` (Iowa, USA)
- `us-east1` (Carolina del Sur, USA)
- `us-west1` (Oregón, USA)
- `europe-west1` (Bélgica)
- `asia-northeast1` (Tokio, Japón)

## 📡 Uso de la API

### Crear un Agente

**Endpoint**: `POST /api/whatsapp/agents`

**Body**:
```json
{
  "name": "Agente de Soporte",
  "instructor": "Eres un asistente virtual amable que ayuda con preguntas frecuentes sobre productos y servicios.",
  "language": "es",
  "initial_message": "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Agente creado exitosamente en Vertex AI",
  "data": {
    "id": "uuid-del-agente",
    "name": "Agente de Soporte",
    "agent_id": "vertex-ai-agent-id",
    "instructor": "Eres un asistente...",
    "language": "es",
    "platform": "vertex-ai",
    "created_at": "2025-12-04T08:00:00.000Z"
  }
}
```

### Asignar Agente a una Conversación

**Endpoint**: `PUT /api/whatsapp/conversations/:phoneNumber/agent`

**Body**:
```json
{
  "agent_id": "uuid-del-agente"
}
```

### Flujo Automático

Una vez asignado un agente:

1. ✅ Usuario envía mensaje por WhatsApp
2. ✅ Webhook recibe el mensaje
3. ✅ Sistema detecta agente asignado
4. ✅ Envía mensaje a Vertex AI Dialogflow CX
5. ✅ Recibe respuesta del agente
6. ✅ Envía respuesta automática por WhatsApp

## 🔍 Características de Vertex AI Dialogflow CX

### Ventajas sobre ElevenLabs

1. **Contexto de Sesión**: Mantiene el contexto de la conversación por usuario (usando el número de teléfono como session_id)
2. **Intenciones Avanzadas**: Detecta intenciones con confianza (confidence score)
3. **Flujos Complejos**: Soporta flujos de conversación complejos con estados
4. **Multiidioma**: Soporta múltiples idiomas nativamente
5. **Integración GCP**: Se integra con otros servicios de Google Cloud
6. **Sin Límites de Tiempo**: No tiene timeouts de 30 segundos como WebSocket

### Manejo de Sesiones

Cada usuario (número de teléfono) tiene su propia sesión:

```
Session ID: 573138539155 (número de teléfono sin +)
Session Path: projects/TU-PROYECTO/locations/us-central1/agents/AGENT-ID/sessions/573138539155
```

Esto permite que Vertex AI:
- Mantenga el contexto de la conversación
- Recuerde información previa del usuario
- Maneje flujos de conversación multi-turn

## 🧪 Testing

### Listar Agentes

```bash
curl http://localhost:5000/api/whatsapp/agents
```

### Crear Agente de Prueba

```bash
curl -X POST http://localhost:5000/api/whatsapp/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agente de Prueba",
    "instructor": "Eres un asistente amigable que responde preguntas básicas.",
    "language": "es"
  }'
```

### Asignar a Conversación

```bash
curl -X PUT http://localhost:5000/api/whatsapp/conversations/573138539155/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "uuid-del-agente"
  }'
```

## 📊 Monitoreo

Ver logs en tiempo real:

```bash
# En tu terminal del servidor
# Verás logs como:
🤖 Procesando mensaje para 573138539155 con agente Soporte (vertex-agent-id)
📤 Enviando mensaje a Vertex AI: "Hola"
📥 Respuesta recibida del agente: "¡Hola! ¿En qué puedo ayudarte?"
🎯 Confianza: 98.50%
```

## 🛠️ Solución de Problemas

### Error: "GOOGLE_CLOUD_PROJECT_ID no configurado"

```bash
# Verificar que las variables estén en .env
grep GOOGLE_CLOUD_PROJECT_ID .env

# Verificar que el archivo se carga
node -e "require('dotenv').config(); console.log(process.env.GOOGLE_CLOUD_PROJECT_ID)"
```

### Error: "Error de autenticación con Google Cloud"

```bash
# Verificar que el archivo de credenciales existe
ls -la vertex-ai-key.json

# Verificar que GOOGLE_APPLICATION_CREDENTIALS apunta al archivo correcto
grep GOOGLE_APPLICATION_CREDENTIALS .env

# Probar autenticación manualmente
gcloud auth application-default login
```

### Error: "Agent not found"

Verificar que el agente existe en Dialogflow CX:
1. Ir a: https://dialogflow.cloud.google.com/cx/
2. Seleccionar tu proyecto
3. Ver lista de agentes creados

## 🔗 Recursos

- [Documentación Dialogflow CX](https://cloud.google.com/dialogflow/cx/docs)
- [API Reference](https://cloud.google.com/dialogflow/cx/docs/reference/rest)
- [Pricing](https://cloud.google.com/dialogflow/pricing)
- [Limits & Quotas](https://cloud.google.com/dialogflow/quotas)

## 💰 Costos Estimados

Vertex AI Dialogflow CX usa un modelo de precios por solicitud:

- **Text requests**: $0.007 USD por solicitud (primeras 3M gratis/mes)
- **Session storage**: $0.0001 USD por sesión por día

**Ejemplo para 10,000 mensajes/mes**:
- Costo: ~$70 USD/mes (después del free tier)

Comparado con ElevenLabs que cobra por minuto de audio, Dialogflow CX es más económico para chat de texto.

