# MongoDB - Conversaciones WhatsApp

## Configuración

Agrega la siguiente variable a tu archivo `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/nextvoice
```

## Uso del Modelo

### Importar el modelo

```javascript
const ConversationWhatsApp = require('../models/ConversationWhatsApp');
```

### Crear una nueva conversación

```javascript
const conversation = new ConversationWhatsApp({
  phoneNumber: '573138539155',
  clientName: 'Juan Pérez',
  conversationSummary: 'Cliente interesado en servicios de IA',
  status: 'pending'
});

await conversation.save();
```

### Agregar un mensaje a la conversación

```javascript
await conversation.addMessage('sent', 'Hola, ¿cómo estás?', 'msg_123', {
  template: 'welcome_template'
});
```

### Actualizar el estado de la conversación

```javascript
await conversation.updateStatus('sent', {
  sentAt: new Date(),
  whatsappMessageId: 'wamid.xxx'
});
```

### Buscar conversaciones por número de teléfono

```javascript
const conversations = await ConversationWhatsApp.findByPhoneNumber('573138539155', 10);
```

### Buscar conversaciones por estado

```javascript
const pendingConversations = await ConversationWhatsApp.findByStatus('pending', 50, 0);
```

### Contar conversaciones por estado

```javascript
const totalPending = await ConversationWhatsApp.countByStatus('pending');
const totalAll = await ConversationWhatsApp.countByStatus(); // Sin parámetro cuenta todas
```

### Consultas personalizadas

```javascript
// Buscar conversaciones activas
const activeConversations = await ConversationWhatsApp.find({
  status: 'active'
}).sort({ lastMessageAt: -1 });

// Buscar conversaciones de los últimos 7 días
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);

const recentConversations = await ConversationWhatsApp.find({
  createdAt: { $gte: weekAgo }
}).sort({ createdAt: -1 });
```

## Estructura del Documento

```javascript
{
  phoneNumber: String,           // Número de teléfono (requerido, indexado)
  clientName: String,            // Nombre del cliente
  conversationSummary: String,   // Resumen de la conversación (requerido)
  messages: [                     // Array de mensajes
    {
      type: 'sent' | 'received',
      content: String,
      messageId: String,
      timestamp: Date,
      metadata: Object
    }
  ],
  status: String,                // pending, sent, delivered, read, failed, active, closed
  vonageMessageId: String,
  whatsappMessageId: String,
  errorMessage: String,
  sentAt: Date,
  receivedAt: Date,
  lastMessageAt: Date,          // Último mensaje (indexado)
  metadata: Object,              // Metadata adicional
  createdAt: Date,               // Creado automáticamente
  updatedAt: Date                // Actualizado automáticamente
}
```

## Índices

El modelo tiene los siguientes índices para mejorar el rendimiento:

- `phoneNumber` - Para búsquedas por número
- `status` - Para búsquedas por estado
- `phoneNumber + lastMessageAt` - Para búsquedas ordenadas por número
- `status + lastMessageAt` - Para búsquedas ordenadas por estado
- `createdAt` - Para búsquedas por fecha de creación
- `lastMessageAt` - Para ordenar por último mensaje


