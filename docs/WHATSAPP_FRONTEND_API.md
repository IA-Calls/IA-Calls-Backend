# 📱 Documentación API WhatsApp - Frontend

Documentación completa para integrar WhatsApp en el frontend con actualizaciones en tiempo real.

## 📋 Tabla de Contenidos

1. [Endpoints Disponibles](#endpoints-disponibles)
2. [Server-Sent Events (SSE)](#server-sent-events-sse)
3. [Flujo Completo de Uso](#flujo-completo-de-uso)
4. [Ejemplos de Código](#ejemplos-de-código)
5. [Manejo de Errores](#manejo-de-errores)

---

## 🔌 Endpoints Disponibles

### Base URL
```
http://localhost:5050/api/whatsapp
```

### 1. Listar Conversaciones (Contactos)

**GET** `/api/whatsapp/conversations/list`

Obtiene todas las conversaciones con información del cliente.

**Query Parameters:**
- `limit` (opcional, default: 50) - Número de conversaciones a retornar
- `offset` (opcional, default: 0) - Offset para paginación
- `search` (opcional) - Buscar por nombre, teléfono o mensaje

**Ejemplo de Request:**
```javascript
const response = await fetch('http://localhost:5050/api/whatsapp/conversations/list?limit=20&offset=0');
const data = await response.json();
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "phoneNumber": "573138539155",
      "clientName": "Juan Pérez",
      "clientEmail": "juan@example.com",
      "lastMessage": "Hola, este es el último mensaje",
      "hasStarted": true,
      "messageCount": 15,
      "lastMessageAt": "2025-12-01T10:30:00Z",
      "createdAt": "2025-12-01T09:00:00Z",
      "updatedAt": "2025-12-01T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 2. Obtener Conversación Específica con Mensajes

**GET** `/api/whatsapp/conversations/:phoneNumber`

Obtiene una conversación específica con todos sus mensajes.

**Ejemplo de Request:**
```javascript
const phoneNumber = '573138539155';
const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/${phoneNumber}`);
const data = await response.json();
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "phoneNumber": "573138539155",
    "clientName": "Juan Pérez",
    "clientEmail": "juan@example.com",
    "hasStarted": true,
    "lastMessage": "Último mensaje",
    "messages": [
      {
        "id": "msg_123",
        "type": "sent",
        "content": "Hola, ¿cómo estás?",
        "timestamp": "2025-12-01T10:00:00Z",
        "metadata": {}
      },
      {
        "id": "msg_124",
        "type": "received",
        "content": "Bien, gracias",
        "timestamp": "2025-12-01T10:05:00Z",
        "metadata": {}
      }
    ],
    "messageCount": 2,
    "createdAt": "2025-12-01T09:00:00Z",
    "updatedAt": "2025-12-01T10:30:00Z",
    "lastMessageAt": "2025-12-01T10:30:00Z"
  }
}
```

---

### 3. Buscar Conversaciones

**GET** `/api/whatsapp/conversations/search?q=termino`

Busca conversaciones por nombre, teléfono o contenido del mensaje.

**Ejemplo de Request:**
```javascript
const searchTerm = 'Juan';
const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/search?q=${encodeURIComponent(searchTerm)}`);
const data = await response.json();
```

---

### 4. Enviar Mensaje

**POST** `/api/whatsapp/send`

Envía un mensaje de WhatsApp (template o mensaje normal).

**Headers:**
```
Content-Type: application/json
```

**Body para Template (Primer Mensaje):**
```json
{
  "to": "573138539155",
  "templateId": "hello_world"
}
```

**Body para Template con Parámetros:**
```json
{
  "to": "573138539155",
  "templateId": "aviso_bienvenida_1",
  "templateParams": ["Juan", "25%"]
}
```

**Body para Mensaje Normal:**
```json
{
  "to": "573138539155",
  "body": "Hola, este es un mensaje normal"
}
```

**Ejemplo de Request:**
```javascript
const response = await fetch('http://localhost:5050/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '573138539155',
    body: 'Hola, este es un mensaje de prueba'
  })
});

const data = await response.json();
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "data": {
    "conversationId": "uuid-123",
    "phoneNumber": "573138539155",
    "hasStarted": true,
    "metaResponse": {
      "messaging_product": "whatsapp",
      "contacts": [...],
      "messages": [...]
    }
  }
}
```

---

### 5. Estadísticas de Conversaciones

**GET** `/api/whatsapp/conversations/stats`

Obtiene estadísticas generales de las conversaciones.

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "totalConversations": 150,
    "startedConversations": 120,
    "notStartedConversations": 30,
    "totalMessages": 2500
  }
}
```

---

## 📡 Server-Sent Events (SSE)

### Conectar al Stream de Eventos

**GET** `/api/whatsapp/events`

Este endpoint mantiene una conexión abierta y envía eventos en tiempo real cuando hay cambios.

**Ejemplo de Conexión:**
```javascript
const eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');
```

### Eventos Disponibles

#### 1. Evento: `connected`
Se emite cuando se establece la conexión SSE.

```javascript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'connected') {
    console.log('✅ Conectado al stream de eventos');
  }
});
```

#### 2. Evento: `new_message`
Se emite cuando llega o se envía un nuevo mensaje.

```json
{
  "type": "new_message",
  "phoneNumber": "573138539155",
  "content": "Hola, este es un mensaje",
  "type": "sent" | "received",
  "messageId": "msg_123",
  "timestamp": "2025-12-01T10:00:00Z"
}
```

**Ejemplo de Uso:**
```javascript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_message') {
    // Actualizar UI con el nuevo mensaje
    addMessageToChat(data);
    
    // Si es un mensaje recibido, mostrar notificación
    if (data.type === 'received') {
      showNotification(`Nuevo mensaje de ${data.phoneNumber}`, data.content);
    }
  }
});
```

#### 3. Evento: `conversation_update`
Se emite cuando se actualiza una conversación.

```json
{
  "type": "conversation_update",
  "phoneNumber": "573138539155",
  "lastMessage": "Último mensaje",
  "messageCount": 15,
  "timestamp": "2025-12-01T10:00:00Z"
}
```

**Ejemplo de Uso:**
```javascript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'conversation_update') {
    // Actualizar la lista de conversaciones
    updateConversationInList(data);
  }
});
```

#### 4. Evento: `new_conversation`
Se emite cuando se crea una nueva conversación.

```json
{
  "type": "new_conversation",
  "phoneNumber": "573138539155",
  "clientName": "Juan Pérez",
  "timestamp": "2025-12-01T10:00:00Z"
}
```

**Ejemplo de Uso:**
```javascript
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_conversation') {
    // Agregar nueva conversación a la lista
    addNewConversationToUI(data);
  }
});
```

### Manejo de Errores SSE

```javascript
eventSource.onerror = (error) => {
  console.error('❌ Error en conexión SSE:', error);
  
  // Intentar reconectar después de 5 segundos
  setTimeout(() => {
    eventSource.close();
    // Recrear la conexión
    eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');
  }, 5000);
};
```

### Cerrar Conexión SSE

```javascript
// Al salir de la página o componente
window.addEventListener('beforeunload', () => {
  eventSource.close();
});
```

---

## 🔄 Flujo Completo de Uso

### 1. Inicializar la Aplicación

```javascript
// 1. Cargar lista de conversaciones
async function loadConversations() {
  try {
    const response = await fetch('http://localhost:5050/api/whatsapp/conversations/list?limit=50');
    const data = await response.json();
    
    if (data.success) {
      // Renderizar lista de conversaciones
      renderConversationsList(data.data);
    }
  } catch (error) {
    console.error('Error cargando conversaciones:', error);
  }
}

// 2. Conectar al stream SSE
function connectToSSE() {
  const eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');
  
  eventSource.addEventListener('message', handleSSEEvent);
  eventSource.onerror = handleSSEError;
  
  return eventSource;
}

// 3. Cargar conversaciones al iniciar
loadConversations();
const sseConnection = connectToSSE();
```

### 2. Abrir un Chat

```javascript
async function openChat(phoneNumber) {
  try {
    // 1. Cargar mensajes de la conversación
    const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/${phoneNumber}`);
    const data = await response.json();
    
    if (data.success) {
      // 2. Renderizar mensajes
      renderMessages(data.data.messages);
      
      // 3. Mostrar información del contacto
      showContactInfo({
        name: data.data.clientName,
        phone: data.data.phoneNumber,
        email: data.data.clientEmail
      });
      
      // 4. Guardar phoneNumber actual para enviar mensajes
      currentChatPhoneNumber = phoneNumber;
    }
  } catch (error) {
    console.error('Error abriendo chat:', error);
  }
}
```

### 3. Enviar un Mensaje

```javascript
async function sendMessage(phoneNumber, messageText) {
  try {
    const response = await fetch('http://localhost:5050/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        body: messageText
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // El mensaje se agregará automáticamente vía SSE
      // Pero puedes agregarlo optimistamente a la UI
      addMessageToUI({
        type: 'sent',
        content: messageText,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Error enviando mensaje:', data.error);
      showError('No se pudo enviar el mensaje');
    }
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    showError('Error de conexión');
  }
}
```

### 4. Enviar Template (Primer Mensaje)

```javascript
async function sendTemplate(phoneNumber, templateId, templateParams = []) {
  try {
    const body = {
      to: phoneNumber,
      templateId: templateId
    };
    
    // Si hay parámetros, agregarlos
    if (templateParams.length > 0) {
      body.templateParams = templateParams;
    }
    
    const response = await fetch('http://localhost:5050/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Template enviado exitosamente');
    }
  } catch (error) {
    console.error('Error enviando template:', error);
  }
}
```

### 5. Actualizar UI con Eventos SSE

```javascript
function handleSSEEvent(event) {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'new_message':
      // Si el mensaje es del chat abierto, agregarlo
      if (data.phoneNumber === currentChatPhoneNumber) {
        addMessageToUI({
          type: data.type, // 'sent' o 'received'
          content: data.content,
          timestamp: data.timestamp
        });
      }
      
      // Actualizar última conversación en la lista
      updateConversationInList({
        phoneNumber: data.phoneNumber,
        lastMessage: data.content,
        lastMessageAt: data.timestamp
      });
      break;
      
    case 'conversation_update':
      // Actualizar conversación en la lista
      updateConversationInList(data);
      break;
      
    case 'new_conversation':
      // Agregar nueva conversación a la lista
      addNewConversationToUI(data);
      break;
  }
}
```

---

## 💻 Ejemplos de Código Completos

### Ejemplo React Hook

```javascript
import { useState, useEffect, useRef } from 'react';

function useWhatsAppChat() {
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);

  // Cargar conversaciones
  useEffect(() => {
    loadConversations();
    connectSSE();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch('http://localhost:5050/api/whatsapp/conversations/list');
      const data = await response.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    }
  };

  const connectSSE = () => {
    const eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        setIsConnected(true);
      } else if (data.type === 'new_message') {
        // Si es del chat actual, agregar mensaje
        if (currentChat?.phoneNumber === data.phoneNumber) {
          setMessages(prev => [...prev, {
            id: data.messageId,
            type: data.type,
            content: data.content,
            timestamp: data.timestamp
          }]);
        }
        
        // Actualizar conversación en la lista
        setConversations(prev => prev.map(conv => 
          conv.phoneNumber === data.phoneNumber
            ? { ...conv, lastMessage: data.content, lastMessageAt: data.timestamp }
            : conv
        ));
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };
  };

  const openChat = async (phoneNumber) => {
    try {
      const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/${phoneNumber}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentChat(data.data);
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Error abriendo chat:', error);
    }
  };

  const sendMessage = async (phoneNumber, messageText) => {
    try {
      const response = await fetch('http://localhost:5050/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          body: messageText
        })
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return false;
    }
  };

  return {
    conversations,
    currentChat,
    messages,
    isConnected,
    openChat,
    sendMessage,
    loadConversations
  };
}
```

### Ejemplo Componente React Completo

```javascript
import React, { useState } from 'react';
import { useWhatsAppChat } from './useWhatsAppChat';

function WhatsAppChat() {
  const {
    conversations,
    currentChat,
    messages,
    isConnected,
    openChat,
    sendMessage
  } = useWhatsAppChat();

  const [messageText, setMessageText] = useState('');

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentChat) return;
    
    const success = await sendMessage(currentChat.phoneNumber, messageText);
    if (success) {
      setMessageText('');
    }
  };

  return (
    <div className="whatsapp-chat">
      {/* Lista de conversaciones */}
      <div className="conversations-list">
        <div className="status">
          Estado: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
        
        {conversations.map(conv => (
          <div
            key={conv.id}
            className="conversation-item"
            onClick={() => openChat(conv.phoneNumber)}
          >
            <div className="contact-name">{conv.clientName}</div>
            <div className="last-message">{conv.lastMessage}</div>
            <div className="last-time">
              {new Date(conv.lastMessageAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Área de chat */}
      {currentChat && (
        <div className="chat-area">
          <div className="chat-header">
            <h3>{currentChat.clientName}</h3>
            <p>{currentChat.phoneNumber}</p>
          </div>

          <div className="messages-container">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.type}`}>
                <div className="message-content">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          <div className="message-input">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribe un mensaje..."
            />
            <button onClick={handleSendMessage}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppChat;
```

---

## ⚠️ Manejo de Errores

### Errores Comunes

#### 1. Error de Conexión
```javascript
try {
  const response = await fetch('http://localhost:5050/api/whatsapp/conversations/list');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Error de conexión:', error);
  // Mostrar mensaje al usuario
  showError('No se pudo conectar al servidor');
}
```

#### 2. Error al Enviar Mensaje
```javascript
const response = await fetch('http://localhost:5050/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: phoneNumber, body: messageText })
});

const data = await response.json();

if (!data.success) {
  console.error('Error:', data.error);
  // Mostrar error específico
  showError(data.error || 'No se pudo enviar el mensaje');
}
```

#### 3. Reconexión SSE
```javascript
let eventSource = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectSSE() {
  eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');
  
  eventSource.onerror = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(() => {
        eventSource.close();
        connectSSE();
      }, 5000);
    } else {
      console.error('No se pudo reconectar después de varios intentos');
      showError('Conexión perdida. Por favor recarga la página.');
    }
  };
  
  eventSource.addEventListener('message', (event) => {
    reconnectAttempts = 0; // Resetear contador en mensaje exitoso
    handleSSEEvent(event);
  });
}
```

---

## 📝 Notas Importantes

1. **Formato de Teléfono**: Los números deben estar en formato internacional sin el signo `+` (ej: `573138539155`)

2. **Templates**: Solo se pueden enviar templates si la conversación no ha iniciado (`hasStarted: false`). Una vez iniciada, solo se pueden enviar mensajes normales.

3. **SSE**: La conexión SSE se mantiene abierta. Asegúrate de cerrarla cuando el componente se desmonte o el usuario salga de la página.

4. **Actualizaciones en Tiempo Real**: Los mensajes se actualizan automáticamente vía SSE. No necesitas hacer polling.

5. **Orden de Mensajes**: Los mensajes vienen ordenados por timestamp. Asegúrate de ordenarlos en el frontend si es necesario.

---

## 🚀 Quick Start

```javascript
// 1. Cargar conversaciones
const conversations = await fetch('/api/whatsapp/conversations/list').then(r => r.json());

// 2. Conectar SSE
const eventSource = new EventSource('/api/whatsapp/events');

// 3. Abrir chat
const chat = await fetch(`/api/whatsapp/conversations/${phoneNumber}`).then(r => r.json());

// 4. Enviar mensaje
await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: phoneNumber, body: 'Hola!' })
});
```

---

¿Necesitas ayuda? Revisa los ejemplos en `examples/whatsapp-sse-frontend-example.js`

