# 🚀 WhatsApp Quick Start - Frontend

Guía rápida para implementar WhatsApp en el frontend.

## 📋 Flujo Básico

1. **Cargar contactos** → Lista de conversaciones
2. **Abrir chat** → Cargar mensajes de una conversación
3. **Conectar SSE** → Recibir mensajes en tiempo real
4. **Enviar mensaje** → Enviar mensaje a un contacto

---

## 1️⃣ Cargar Lista de Contactos (Conversaciones)

```javascript
async function loadContacts() {
  const response = await fetch('http://localhost:5050/api/whatsapp/conversations/list');
  const data = await response.json();
  
  if (data.success) {
    // data.data es un array de conversaciones
    data.data.forEach(contact => {
      console.log(contact.clientName);      // Nombre del cliente
      console.log(contact.phoneNumber);    // Teléfono
      console.log(contact.lastMessage);    // Último mensaje
      console.log(contact.messageCount);   // Cantidad de mensajes
    });
  }
}
```

**Estructura de cada contacto:**
```javascript
{
  id: "uuid",
  phoneNumber: "573138539155",
  clientName: "Juan Pérez",
  clientEmail: "juan@example.com",
  lastMessage: "Hola, este es el último mensaje",
  hasStarted: true,
  messageCount: 15,
  lastMessageAt: "2025-12-01T10:30:00Z"
}
```

---

## 2️⃣ Abrir Chat y Cargar Mensajes

```javascript
async function openChat(phoneNumber) {
  const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/${phoneNumber}`);
  const data = await response.json();
  
  if (data.success) {
    const chat = data.data;
    
    // Información del contacto
    console.log('Nombre:', chat.clientName);
    console.log('Teléfono:', chat.phoneNumber);
    
    // Mensajes
    chat.messages.forEach(msg => {
      console.log(msg.type);        // 'sent' o 'received'
      console.log(msg.content);    // Contenido del mensaje
      console.log(msg.timestamp);  // Fecha del mensaje
    });
  }
}
```

**Estructura de cada mensaje:**
```javascript
{
  id: "msg_123",
  type: "sent" | "received",
  content: "Hola, este es un mensaje",
  timestamp: "2025-12-01T10:00:00Z"
}
```

---

## 3️⃣ Conectar SSE (Tiempo Real)

```javascript
// Conectar al stream de eventos
const eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');

// Escuchar nuevos mensajes
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'new_message') {
    // Nuevo mensaje recibido o enviado
    console.log('Nuevo mensaje:', data.content);
    console.log('De:', data.phoneNumber);
    console.log('Tipo:', data.type); // 'sent' o 'received'
    
    // Si es del chat abierto, agregarlo a la UI
    if (data.phoneNumber === currentChatPhoneNumber) {
      addMessageToUI(data);
    }
  }
  
  if (data.type === 'conversation_update') {
    // Conversación actualizada
    console.log('Conversación actualizada:', data.phoneNumber);
    // Actualizar lista de conversaciones
    updateConversationInList(data);
  }
  
  if (data.type === 'new_conversation') {
    // Nueva conversación creada
    console.log('Nueva conversación:', data.phoneNumber);
    // Agregar a la lista de conversaciones
    addNewConversationToUI(data);
  }
});
```

---

## 4️⃣ Enviar Mensaje

```javascript
async function sendMessage(phoneNumber, messageText) {
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
    console.log('Mensaje enviado exitosamente');
    // El mensaje aparecerá automáticamente vía SSE
  } else {
    console.error('Error:', data.error);
  }
}
```

---

## 5️⃣ Enviar Template (Primer Mensaje)

```javascript
async function sendTemplate(phoneNumber, templateId) {
  const response = await fetch('http://localhost:5050/api/whatsapp/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: phoneNumber,
      templateId: templateId  // Ejemplo: 'hello_world'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Template enviado exitosamente');
  }
}
```

**Template con parámetros:**
```javascript
{
  to: phoneNumber,
  templateId: 'aviso_bienvenida_1',
  templateParams: ['Juan', '25%']  // Parámetros del template
}
```

---

## 📱 Ejemplo Completo (Vanilla JS)

```html
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp Chat</title>
</head>
<body>
  <div id="contacts-list"></div>
  <div id="chat-area" style="display: none;">
    <div id="chat-header"></div>
    <div id="messages-container"></div>
    <div id="message-input">
      <input type="text" id="message-text" placeholder="Escribe un mensaje...">
      <button onclick="sendCurrentMessage()">Enviar</button>
    </div>
  </div>

  <script>
    let currentChatPhoneNumber = null;
    let eventSource = null;

    // 1. Cargar contactos al iniciar
    async function loadContacts() {
      const response = await fetch('http://localhost:5050/api/whatsapp/conversations/list');
      const data = await response.json();
      
      if (data.success) {
        const list = document.getElementById('contacts-list');
        list.innerHTML = '';
        
        data.data.forEach(contact => {
          const item = document.createElement('div');
          item.innerHTML = `
            <div onclick="openChat('${contact.phoneNumber}')">
              <strong>${contact.clientName}</strong>
              <p>${contact.lastMessage || 'Sin mensajes'}</p>
            </div>
          `;
          list.appendChild(item);
        });
      }
    }

    // 2. Abrir chat
    async function openChat(phoneNumber) {
      currentChatPhoneNumber = phoneNumber;
      
      const response = await fetch(`http://localhost:5050/api/whatsapp/conversations/${phoneNumber}`);
      const data = await response.json();
      
      if (data.success) {
        const chat = data.data;
        
        // Mostrar header
        document.getElementById('chat-header').innerHTML = `
          <h3>${chat.clientName}</h3>
          <p>${chat.phoneNumber}</p>
        `;
        
        // Mostrar mensajes
        const container = document.getElementById('messages-container');
        container.innerHTML = '';
        
        chat.messages.forEach(msg => {
          const msgDiv = document.createElement('div');
          msgDiv.className = `message ${msg.type}`;
          msgDiv.innerHTML = `
            <div>${msg.content}</div>
            <small>${new Date(msg.timestamp).toLocaleTimeString()}</small>
          `;
          container.appendChild(msgDiv);
        });
        
        // Mostrar área de chat
        document.getElementById('chat-area').style.display = 'block';
      }
    }

    // 3. Enviar mensaje
    async function sendCurrentMessage() {
      const input = document.getElementById('message-text');
      const messageText = input.value.trim();
      
      if (!messageText || !currentChatPhoneNumber) return;
      
      const response = await fetch('http://localhost:5050/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentChatPhoneNumber,
          body: messageText
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        input.value = '';
        // El mensaje aparecerá automáticamente vía SSE
      }
    }

    // 4. Conectar SSE
    function connectSSE() {
      eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');
      
      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          // Si es del chat abierto, agregarlo
          if (data.phoneNumber === currentChatPhoneNumber) {
            const container = document.getElementById('messages-container');
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${data.type}`;
            msgDiv.innerHTML = `
              <div>${data.content}</div>
              <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
            `;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
          }
          
          // Actualizar lista de contactos
          loadContacts();
        }
      });
    }

    // Inicializar
    loadContacts();
    connectSSE();
    
    // Permitir enviar con Enter
    document.getElementById('message-text').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendCurrentMessage();
      }
    });
  </script>
</body>
</html>
```

---

## ✅ Checklist de Implementación

- [ ] Cargar lista de contactos al iniciar
- [ ] Mostrar lista de contactos en la UI
- [ ] Al hacer clic en un contacto, abrir chat y cargar mensajes
- [ ] Conectar al stream SSE para recibir mensajes en tiempo real
- [ ] Mostrar nuevos mensajes automáticamente cuando lleguen
- [ ] Implementar input para escribir mensajes
- [ ] Enviar mensajes al hacer clic en "Enviar" o presionar Enter
- [ ] Actualizar lista de contactos cuando lleguen nuevos mensajes

---

## 🔗 Endpoints Principales

- `GET /api/whatsapp/conversations/list` - Lista de contactos
- `GET /api/whatsapp/conversations/:phoneNumber` - Mensajes de un chat
- `GET /api/whatsapp/events` - Stream SSE (tiempo real)
- `POST /api/whatsapp/send` - Enviar mensaje

---

Para más detalles, ver `WHATSAPP_FRONTEND_API.md`

