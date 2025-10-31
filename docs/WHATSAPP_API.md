# WhatsApp API - Ejemplos de Uso

## Configuración de Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Vonage/Nexmo WhatsApp API
VENDOR_API_KEY=1a44ecfa
VENDOR_API_SECRET=OUHU8GfT3LpkwIJF
NUMBER_API=14157386102
```

## Endpoints Disponibles

### 1. Enviar Mensaje WhatsApp con Contexto de Conversación

**POST** `/api/whatsapp/send`

```bash
curl -X POST http://localhost:5000/api/whatsapp/send \
-H "Content-Type: application/json" \
-d '{
  "phoneNumber": "573138539155",
  "clientName": "Juan Pérez",
  "conversationSummary": "El cliente está interesado en nuestros servicios de IA para automatizar llamadas telefónicas. Mencionó que tiene una empresa de 50 empleados y necesita reducir costos operativos. Le gustaría una demostración la próxima semana."
}'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "data": {
    "conversationId": 1,
    "messageId": "12345678-1234-1234-1234-123456789abc",
    "phoneNumber": "573138539155",
    "status": "sent",
    "sentAt": "2025-10-25T23:59:59.000Z"
  }
}
```

### 2. Obtener Conversaciones por Número de Teléfono

**GET** `/api/whatsapp/conversations/:phoneNumber`

```bash
curl -X GET http://localhost:5000/api/whatsapp/conversations/573138539155?limit=10
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "phoneNumber": "573138539155",
      "clientName": "Juan Pérez",
      "conversationSummary": "El cliente está interesado en nuestros servicios...",
      "status": "sent",
      "messageId": "12345678-1234-1234-1234-123456789abc",
      "sentAt": "2025-10-25T23:59:59.000Z",
      "createdAt": "2025-10-25T23:59:59.000Z"
    }
  ],
  "count": 1
}
```

### 3. Obtener Todas las Conversaciones

**GET** `/api/whatsapp/conversations`

```bash
curl -X GET http://localhost:5000/api/whatsapp/conversations?limit=50&offset=0&status=sent
```

### 4. Obtener Estadísticas

**GET** `/api/whatsapp/stats`

```bash
curl -X GET http://localhost:5000/api/whatsapp/stats
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "sent": 20,
    "failed": 3,
    "pending": 2,
    "successRate": 80
  }
}
```

### 5. Verificar Estado de la API

**GET** `/api/whatsapp/status`

```bash
curl -X GET http://localhost:5000/api/whatsapp/status
```

### 6. Health Check

**GET** `/api/whatsapp/health`

```bash
curl -X GET http://localhost:5000/api/whatsapp/health
```

## Formato del Mensaje Enviado

El mensaje que se envía a WhatsApp tiene el siguiente formato:

```
Hola Juan Pérez! 👋

Basándome en nuestra conversación anterior, aquí tienes un resumen:

El cliente está interesado en nuestros servicios de IA para automatizar llamadas telefónicas. Mencionó que tiene una empresa de 50 empleados y necesita reducir costos operativos. Le gustaría una demostración la próxima semana.

¿Hay algo más en lo que pueda ayudarte? Estoy aquí para asistirte. 😊

---
*Mensaje enviado por IA Calls*
```

## Validaciones

- **Número de teléfono**: Debe contener solo dígitos, mínimo 10 caracteres, máximo 15
- **Resumen de conversación**: Campo requerido, no puede estar vacío
- **Nombre del cliente**: Campo opcional, si no se proporciona se usa "Cliente"

## Estados de Conversación

- `pending`: Mensaje creado pero no enviado
- `sent`: Mensaje enviado exitosamente
- `delivered`: Mensaje entregado al destinatario
- `read`: Mensaje leído por el destinatario
- `failed`: Error al enviar el mensaje

## Manejo de Errores

### Error de número inválido:
```json
{
  "success": false,
  "error": "Número de teléfono inválido: El número debe contener solo dígitos"
}
```

### Error de datos faltantes:
```json
{
  "success": false,
  "error": "El resumen de conversación es requerido"
}
```

### Error de API de Vonage:
```json
{
  "success": false,
  "error": "Error enviando mensaje",
  "details": {
    "type": "invalid_request",
    "title": "Bad Request",
    "detail": "Invalid phone number format"
  },
  "conversationId": 1
}
```

## Webhook (Opcional)

Si configuras un webhook en Vonage, puedes recibir actualizaciones de estado:

**POST** `/api/whatsapp/webhook`

```json
{
  "message_uuid": "12345678-1234-1234-1234-123456789abc",
  "status": "delivered",
  "timestamp": "2025-10-25T23:59:59.000Z"
}
```

## Ejemplo Completo con JavaScript

```javascript
const sendWhatsAppMessage = async (phoneNumber, clientName, conversationSummary) => {
  try {
    const response = await fetch('http://localhost:5000/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        clientName,
        conversationSummary
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Mensaje enviado:', result.data);
      return result.data;
    } else {
      console.error('Error:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    throw error;
  }
};

// Uso
sendWhatsAppMessage(
  '573138539155',
  'María García',
  'Cliente interesado en implementar IA para atención al cliente. Necesita solución para 200 usuarios simultáneos.'
);
```

## Notas Importantes

1. **Números de teléfono**: Se formatean automáticamente. Si no incluye código de país, se agrega +57 (Colombia)
2. **Cache**: Todas las conversaciones se guardan en la base de datos para seguimiento
3. **Rate limiting**: Vonage tiene límites de velocidad, considera implementar throttling
4. **Webhooks**: Configura el webhook en Vonage para recibir actualizaciones de estado
5. **Logs**: Todos los eventos se registran en la consola para debugging

