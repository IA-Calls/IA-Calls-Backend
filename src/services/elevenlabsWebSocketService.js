/**
 * Servicio WebSocket para Conversaciones de ElevenLabs
 * Maneja conexiones persistentes con agentes de ElevenLabs
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class ElevenLabsWebSocketService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';
    
    // Mapa de conversaciones activas: phone_number -> { ws, conversationId, agentId, ... }
    this.activeConnections = new Map();
    
    console.log('🔌 ElevenLabsWebSocketService inicializado');
  }

  /**
   * Iniciar conversación por WebSocket
   * @param {string} agentId - ID del agente de ElevenLabs
   * @param {string} phoneNumber - Número de teléfono del usuario
   * @param {string} userName - Nombre del usuario
   * @returns {Promise<Object>} - Resultado con conversationId
   */
  async startConversation(agentId, phoneNumber, userName = 'Cliente') {
    return new Promise((resolve, reject) => {
      try {
        // Cerrar conexión previa si existe
        this.closeConnection(phoneNumber);

        const conversationId = `conv_${uuidv4().replace(/-/g, '')}`;
        const wsUrl = `${this.baseUrl}?agent_id=${agentId}`;

        console.log(`🔌 Conectando WebSocket para ${phoneNumber.substring(0, 15)}...`);

        const ws = new WebSocket(wsUrl, {
          headers: {
            'xi-api-key': this.apiKey
          }
        });

        let isInitialized = false;
        let messageBuffer = [];

        // Guardar conexión
        this.activeConnections.set(phoneNumber, {
          ws,
          conversationId,
          agentId,
          phoneNumber,
          userName,
          isReady: false,
          lastActivity: Date.now(),
          pendingResponses: [], // Buffer para respuestas pendientes
          audioChunks: [] // Buffer para chunks de audio
        });

        ws.on('open', () => {
          console.log(`✅ WebSocket conectado → ${phoneNumber.substring(0, 15)}...`);

          // Enviar mensaje de iniciación en modo texto (para WhatsApp)
          const initMessage = {
            type: 'conversation_initiation',
            conversation_config_override: {
              agent: {
                language: 'es'
              },
              conversation: {
                text_only: true // Modo texto para WhatsApp
              }
            }
          };

          ws.send(JSON.stringify(initMessage));
          console.log(`📤 Iniciación enviada en modo texto: ${conversationId}`);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Actualizar última actividad
            const connection = this.activeConnections.get(phoneNumber);
            if (connection) {
              connection.lastActivity = Date.now();
            }

            console.log(`📥 Mensaje recibido (${message.type})`);

            // Manejar diferentes tipos de mensajes
            switch (message.type) {
              case 'conversation_initiation_metadata':
                console.log(`✅ Conversación iniciada: ${conversationId}`);
                isInitialized = true;
                
                // Marcar como listo
                if (connection) {
                  connection.isReady = true;
                }
                
                resolve({
                  success: true,
                  conversationId,
                  agentId,
                  phoneNumber
                });
                break;

              case 'audio':
                // Acumular audio chunks en el buffer de la conexión
                if (connection) {
                  connection.audioChunks.push(message);
                }
                break;

              case 'agent_response':
              case 'agent_message':
              case 'agent_text_response':
              case 'message':
                // Extraer respuesta del agente en diferentes formatos
                let responseText = '';
                
                console.log(`📨 Mensaje del agente recibido:`, JSON.stringify(message, null, 2).substring(0, 300));
                
                // Formato 1: message con role=agent (común en modo texto)
                if (message.role === 'agent' && message.message) {
                  responseText = message.message;
                }
                
                // Formato 2: agent_response_event
                if (!responseText && message.agent_response_event) {
                  const event = message.agent_response_event;
                  responseText = event.agent_response || event.text || '';
                }
                
                // Formato 3: agent_text_response (para modo texto)
                if (!responseText && message.agent_text_response) {
                  responseText = message.agent_text_response;
                }
                
                // Formato 4: directamente en el mensaje
                if (!responseText) {
                  responseText = message.text || message.content || message.response || message.message || '';
                }
                
                // Si está vacío, extraer de audioChunks acumulados (modo audio)
                if ((!responseText || responseText === '...') && connection && connection.audioChunks.length > 0) {
                  const transcripts = connection.audioChunks
                    .map(chunk => {
                      const evt = chunk.audio_event || {};
                      return evt.transcript || evt.text || '';
                    })
                    .filter(t => t && t !== '...' && t.trim())
                    .join(' ');
                  
                  if (transcripts) {
                    responseText = transcripts;
                  }
                }
                
                console.log(`🤖 Agente respondió: "${(responseText || '...').substring(0, 100)}..."`);
                
                // Guardar en buffer de respuestas pendientes
                if (connection && responseText && responseText !== '...') {
                  connection.pendingResponses.push({
                    type: 'agent',
                    content: responseText,
                    timestamp: Date.now()
                  });
                  
                  // Limpiar audioChunks después de procesar
                  connection.audioChunks = [];
                }
                break;

              case 'conversation_update':
                // Actualización de estado
                console.log(`📊 Estado: ${JSON.stringify(message.status || message.state || 'update')}`);
                break;

              case 'error':
                console.error(`❌ Error WS: ${message.message || JSON.stringify(message)}`);
                break;

              case 'ping':
                // Silencioso - no loggear pings
                break;

              default:
                // Loggear todos los mensajes desconocidos para debug
                console.log(`📨 Mensaje desconocido (${message.type}):`, JSON.stringify(message, null, 2).substring(0, 500));
            }
          } catch (error) {
            console.error('❌ Error procesando mensaje WS:', error.message);
          }
        });

        ws.on('error', (error) => {
          console.error(`❌ Error WebSocket:`, error.message);
          this.activeConnections.delete(phoneNumber);
          
          if (!isInitialized) {
            reject(new Error(`WebSocket error: ${error.message}`));
          }
        });

        ws.on('close', (code, reason) => {
          console.log(`🔌 WebSocket cerrado → ${phoneNumber.substring(0, 15)}... (${code})`);
          this.activeConnections.delete(phoneNumber);
        });

        // Timeout de 10 segundos para inicialización
        setTimeout(() => {
          if (!isInitialized) {
            ws.close();
            this.activeConnections.delete(phoneNumber);
            reject(new Error('Timeout iniciando conversación'));
          }
        }, 10000);

      } catch (error) {
        console.error('❌ Error en startConversation:', error);
        reject(error);
      }
    });
  }

  /**
   * Enviar mensaje del usuario al agente
   * @param {string} phoneNumber - Número de teléfono
   * @param {string} message - Mensaje del usuario
   * @returns {Promise<Object>} - Respuesta del agente
   */
  async sendMessage(phoneNumber, message) {
    return new Promise((resolve, reject) => {
      try {
        const connection = this.activeConnections.get(phoneNumber);

        if (!connection) {
          return reject(new Error('No hay conexión activa para este número'));
        }

        if (!connection.isReady) {
          return reject(new Error('Conexión no está lista'));
        }

        if (connection.ws.readyState !== WebSocket.OPEN) {
          return reject(new Error('WebSocket no está abierto'));
        }

        console.log(`📤 Enviando mensaje → ${phoneNumber.substring(0, 15)}...`);

        // Limpiar buffers antes de enviar nuevo mensaje
        connection.pendingResponses = [];
        connection.audioChunks = [];

        // Enviar mensaje del usuario en modo texto
        // Según la documentación de WebSocket de ElevenLabs para modo texto
        const userMessage = {
          type: 'message',
          role: 'user',
          message: message
        };

        console.log(`📤 Payload enviado:`, JSON.stringify(userMessage, null, 2));
        connection.ws.send(JSON.stringify(userMessage));

        // Polling del buffer de respuestas
        const startTime = Date.now();
        const timeout = 30000; // 30 segundos
        const checkInterval = 500; // Revisar cada 500ms

        const checkForResponse = () => {
          const elapsed = Date.now() - startTime;

          if (elapsed > timeout) {
            return reject(new Error('Timeout esperando respuesta del agente'));
          }

          // Verificar si hay respuesta en el buffer
          if (connection.pendingResponses.length > 0) {
            const response = connection.pendingResponses.shift(); // Tomar la primera respuesta
            
            console.log(`✅ Respuesta capturada del buffer: "${response.content.substring(0, 100)}..."`);
            
            return resolve({
              success: true,
              response: response.content,
              conversationId: connection.conversationId
            });
          }

          // Seguir revisando
          setTimeout(checkForResponse, checkInterval);
        };

        // Iniciar polling
        setTimeout(checkForResponse, checkInterval);

      } catch (error) {
        console.error('❌ Error en sendMessage:', error);
        reject(error);
      }
    });
  }

  /**
   * Cerrar conexión
   * @param {string} phoneNumber - Número de teléfono
   */
  closeConnection(phoneNumber) {
    const connection = this.activeConnections.get(phoneNumber);
    
    if (connection && connection.ws) {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close();
        }
        console.log(`🔌 Conexión cerrada → ${phoneNumber.substring(0, 15)}...`);
      } catch (error) {
        console.error('Error cerrando conexión:', error);
      }
    }

    this.activeConnections.delete(phoneNumber);
  }

  /**
   * Verificar si hay conexión activa
   * @param {string} phoneNumber - Número de teléfono
   * @returns {boolean}
   */
  hasActiveConnection(phoneNumber) {
    const connection = this.activeConnections.get(phoneNumber);
    return connection && 
           connection.ws && 
           connection.ws.readyState === WebSocket.OPEN &&
           connection.isReady;
  }

  /**
   * Obtener información de conexión
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Object|null}
   */
  getConnectionInfo(phoneNumber) {
    const connection = this.activeConnections.get(phoneNumber);
    
    if (!connection) return null;

    return {
      conversationId: connection.conversationId,
      agentId: connection.agentId,
      userName: connection.userName,
      isReady: connection.isReady,
      lastActivity: connection.lastActivity
    };
  }

  /**
   * Limpiar conexiones inactivas (más de 30 minutos)
   */
  cleanupInactiveConnections() {
    const thirtyMinutes = 30 * 60 * 1000;
    const now = Date.now();

    for (const [phoneNumber, connection] of this.activeConnections.entries()) {
      if (now - connection.lastActivity > thirtyMinutes) {
        console.log(`🧹 Limpiando conexión inactiva: ${phoneNumber.substring(0, 15)}...`);
        this.closeConnection(phoneNumber);
      }
    }
  }
}

// Singleton
const elevenlabsWebSocketService = new ElevenLabsWebSocketService();

// Limpieza periódica cada 5 minutos
setInterval(() => {
  elevenlabsWebSocketService.cleanupInactiveConnections();
}, 5 * 60 * 1000);

module.exports = elevenlabsWebSocketService;

