/**
 * Ejemplo de uso de SSE para WhatsApp en el frontend
 * 
 * Este ejemplo muestra cómo conectarse al stream de eventos SSE
 * para recibir actualizaciones en tiempo real de mensajes de WhatsApp
 */

// URL del endpoint SSE
const SSE_URL = 'http://localhost:5050/api/whatsapp/events';

// Crear conexión EventSource
const eventSource = new EventSource(SSE_URL);

// Estado de la conexión
let isConnected = false;

// ============================================
// MANEJADORES DE EVENTOS
// ============================================

// Evento: Conexión establecida
eventSource.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);
    
    if (data.type === 'connected') {
      isConnected = true;
      console.log('✅ Conectado al stream de eventos WhatsApp');
      console.log('   Mensaje:', data.message);
      updateConnectionStatus(true);
    }
  } catch (error) {
    console.error('Error parseando mensaje:', error);
  }
});

// Evento: Nuevo mensaje recibido o enviado
eventSource.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);
    
    if (data.type === 'new_message') {
      console.log('📱 Nuevo mensaje:', {
        phoneNumber: data.phoneNumber,
        content: data.content,
        type: data.type, // 'sent' o 'received'
        timestamp: data.timestamp
      });
      
      // Actualizar UI con el nuevo mensaje
      addMessageToUI(data);
      
      // Si es un mensaje recibido, mostrar notificación
      if (data.type === 'received') {
        showNotification(`Nuevo mensaje de ${data.phoneNumber}`, data.content);
      }
    }
  } catch (error) {
    console.error('Error procesando mensaje:', error);
  }
});

// Evento: Conversación actualizada
eventSource.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);
    
    if (data.type === 'conversation_update') {
      console.log('🔄 Conversación actualizada:', {
        phoneNumber: data.phoneNumber,
        lastMessage: data.lastMessage,
        messageCount: data.messageCount
      });
      
      // Actualizar la lista de conversaciones
      updateConversationList(data);
    }
  } catch (error) {
    console.error('Error procesando actualización:', error);
  }
});

// Evento: Nueva conversación creada
eventSource.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);
    
    if (data.type === 'new_conversation') {
      console.log('✨ Nueva conversación:', {
        phoneNumber: data.phoneNumber,
        clientName: data.clientName
      });
      
      // Agregar a la lista de conversaciones
      addNewConversationToUI(data);
      showNotification(`Nueva conversación con ${data.clientName || data.phoneNumber}`);
    }
  } catch (error) {
    console.error('Error procesando nueva conversación:', error);
  }
});

// Evento: Error en la conexión
eventSource.onerror = (error) => {
  console.error('❌ Error en conexión SSE:', error);
  isConnected = false;
  updateConnectionStatus(false);
  
  // Intentar reconectar después de 5 segundos
  setTimeout(() => {
    console.log('🔄 Intentando reconectar...');
    eventSource.close();
    // Recrear la conexión
    // eventSource = new EventSource(SSE_URL);
  }, 5000);
};

// ============================================
// FUNCIONES DE UI (ejemplos)
// ============================================

function updateConnectionStatus(connected) {
  const statusElement = document.getElementById('connection-status');
  if (statusElement) {
    statusElement.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
    statusElement.className = connected ? 'status-connected' : 'status-disconnected';
  }
}

function addMessageToUI(messageData) {
  // Ejemplo: Agregar mensaje al chat
  const chatContainer = document.getElementById('chat-messages');
  if (chatContainer) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageData.type}`;
    messageElement.innerHTML = `
      <div class="message-content">${messageData.content}</div>
      <div class="message-time">${new Date(messageData.timestamp).toLocaleTimeString()}</div>
    `;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function updateConversationList(conversationData) {
  // Ejemplo: Actualizar lista de conversaciones
  const conversationElement = document.querySelector(`[data-phone="${conversationData.phoneNumber}"]`);
  if (conversationElement) {
    const lastMessageElement = conversationElement.querySelector('.last-message');
    if (lastMessageElement) {
      lastMessageElement.textContent = conversationData.lastMessage;
    }
    const timeElement = conversationElement.querySelector('.last-time');
    if (timeElement) {
      timeElement.textContent = new Date(conversationData.timestamp).toLocaleTimeString();
    }
  }
}

function addNewConversationToUI(conversationData) {
  // Ejemplo: Agregar nueva conversación a la lista
  const conversationsList = document.getElementById('conversations-list');
  if (conversationsList) {
    const conversationElement = document.createElement('div');
    conversationElement.className = 'conversation-item';
    conversationElement.setAttribute('data-phone', conversationData.phoneNumber);
    conversationElement.innerHTML = `
      <div class="conversation-name">${conversationData.clientName || conversationData.phoneNumber}</div>
      <div class="last-message"></div>
      <div class="last-time"></div>
    `;
    conversationsList.insertBefore(conversationElement, conversationsList.firstChild);
  }
}

function showNotification(title, body) {
  // Ejemplo: Mostrar notificación del navegador
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: body,
      icon: '/icon.png'
    });
  }
}

// ============================================
// SOLICITAR PERMISOS DE NOTIFICACIÓN
// ============================================

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('✅ Permisos de notificación concedidos');
    }
  });
}

// ============================================
// CERRAR CONEXIÓN AL SALIR
// ============================================

window.addEventListener('beforeunload', () => {
  eventSource.close();
  console.log('🔌 Conexión SSE cerrada');
});

// ============================================
// EJEMPLO CON REACT
// ============================================

/*
import { useEffect, useState } from 'react';

function WhatsAppSSEComponent() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5050/api/whatsapp/events');

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        setIsConnected(true);
      } else if (data.type === 'new_message') {
        setMessages(prev => [...prev, data]);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <div>Estado: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}</div>
      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>{msg.content}</div>
        ))}
      </div>
    </div>
  );
}
*/

