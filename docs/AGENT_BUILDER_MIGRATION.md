# 🚀 Migración a Vertex AI Agent Builder (Generative AI)

## 📋 Resumen de la Migración

Se ha migrado completamente de **Dialogflow CX** a **Agent Builder (Generative AI)** usando el modelo Gemini.

### ❌ Eliminado (Dialogflow CX)
- Intents y Training Phrases
- Flows y Pages
- Entrenamiento del modelo NLU
- Errores de "NLU model does not exist"
- `flows/00000000-0000-0000-0000-000000000000`
- `detectIntent` con sessionPath
- `trainAgent()` obligatorio

### ✅ Nuevo (Agent Builder)
- **Modelo Generativo (Gemini)**: Respuestas naturales sin entrenar
- **System Instructions**: El `instructor` se usa como prompt del sistema
- **Chat con Historial**: Mantiene contexto de conversación
- **Sin Entrenamiento**: Funciona inmediatamente al crear el agente
- **Respuestas Inteligentes**: Basadas en el instructor que definas

---

## 🔧 Configuración

### 1. Obtener API Key de Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Haz clic en "Create API Key"
3. Copia la API Key generada

### 2. Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# API Key de Gemini (REQUERIDO)
GOOGLE_API_KEY=tu-api-key-de-gemini
# o
GEMINI_API_KEY=tu-api-key-de-gemini

# Modelo a usar (opcional, default: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash

# Proyecto de Google Cloud (para logging/billing)
GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
```

### 3. Modelos Disponibles

| Modelo | Descripción | Uso Recomendado |
|--------|-------------|-----------------|
| `gemini-1.5-flash` | Rápido y económico | WhatsApp, chat general |
| `gemini-1.5-pro` | Más potente | Conversaciones complejas |
| `gemini-2.0-flash-exp` | Experimental, muy rápido | Testing |

---

## 📡 Uso de la API

### Crear un Agente

**Endpoint**: `POST /api/whatsapp/agents`

**Body**:
```json
{
  "name": "Asistente de Soporte",
  "instructor": "Eres un asistente virtual amable que ayuda con preguntas sobre productos. Responde siempre en español de forma concisa.",
  "language": "es",
  "initial_message": "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Agente creado exitosamente con Agent Builder (Generative AI)",
  "data": {
    "id": "uuid-del-agente",
    "name": "Asistente de Soporte",
    "agent_id": "agent_1733...",
    "instructor": "Eres un asistente...",
    "platform": "agent-builder",
    "model": "gemini-1.5-flash"
  },
  "info": {
    "note": "Agent Builder no requiere entrenamiento. El agente está listo para usar inmediatamente."
  }
}
```

### Asignar Agente a Conversación

**Endpoint**: `PUT /api/whatsapp/conversations/:phoneNumber/agent`

**Body**:
```json
{
  "agent_id": "uuid-del-agente"
}
```

---

## 🔄 Flujo de Conversación

```
Usuario envía mensaje WhatsApp
        ↓
Webhook recibe mensaje
        ↓
Sistema detecta agente asignado
        ↓
Obtiene historial de conversación (MongoDB)
        ↓
Envía mensaje a Gemini con:
  - System Instruction (instructor)
  - Historial de chat
  - Mensaje actual
        ↓
Gemini genera respuesta natural
        ↓
Envía respuesta por WhatsApp
```

---

## 📝 Escribir Buenos Instructors

El `instructor` es clave para que el agente responda correctamente. Ejemplos:

### Agente de Soporte Técnico
```
Eres un experto en soporte técnico de software. Tu nombre es Alex.
- Responde siempre en español
- Sé amable pero conciso
- Si no sabes algo, sugiere contactar a un humano
- Nunca inventes información técnica
- Formato de respuesta: máximo 3 oraciones
```

### Agente de Ventas
```
Eres un asistente de ventas de la tienda "MiTienda".
- Ayuda a los clientes con información de productos
- Siempre menciona los precios cuando hables de productos
- Invita a visitar la tienda o sitio web
- Sé entusiasta pero no agresivo
- Si preguntan por algo que no vendes, sugiérelo amablemente
```

### Agente de Reservaciones
```
Eres el asistente de reservaciones del restaurante "El Sabor".
- Horarios: Lunes a Sábado, 12:00 - 22:00
- Para reservar necesitas: nombre, fecha, hora y número de personas
- Confirma siempre los datos antes de finalizar
- Si el horario no está disponible, sugiere alternativas
```

---

## 🔍 Diferencias Clave

| Aspecto | Dialogflow CX | Agent Builder |
|---------|---------------|---------------|
| Configuración | Intents + Training | Solo Instructor |
| Tiempo de setup | Minutos/horas | Inmediato |
| Entrenamiento | Requerido | No necesario |
| Errores NLU | Frecuentes | No existen |
| Respuestas | Basadas en intents | Naturales/generativas |
| Contexto | Limitado a sesión | Historial completo |
| Costo | Por request CX | Por tokens Gemini |

---

## ⚠️ Notas Importantes

1. **El historial de conversación se pasa a cada llamada** para mantener contexto
2. **Los últimos 10 mensajes** se usan como historial (configurable)
3. **El instructor es persistente** durante toda la conversación
4. **Si hay errores**, la sesión de chat se reinicia automáticamente
5. **No hay límite de tiempo** como en WebSocket

---

## 🆘 Troubleshooting

### Error: "Generative AI no está inicializado"
- Verifica que `GOOGLE_API_KEY` o `GEMINI_API_KEY` esté en `.env`
- Reinicia el servidor después de agregar la variable

### Error: "API key not valid"
- Verifica que el API key sea correcto
- Genera un nuevo API key en [Google AI Studio](https://aistudio.google.com/app/apikey)

### El agente no responde como espero
- Mejora el `instructor` con más detalles
- Sé más específico sobre el tono y formato de respuesta
- Agrega ejemplos de lo que debe y no debe hacer

---

## 📚 Referencias

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Vertex AI Agent Builder](https://cloud.google.com/vertex-ai/docs/generative-ai/agent-builder)



