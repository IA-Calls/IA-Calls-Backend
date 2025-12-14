// Usar Firestore en lugar de MongoDB
const { getFirestore } = require('../config/firestore');

// Almacenamiento en memoria como fallback temporal
const inMemoryStore = new Map();

/**
 * Modelo para conversaciones de WhatsApp en Firestore
 * Con fallback a almacenamiento en memoria si Firestore falla
 */
class ConversationWhatsApp {
  constructor(data) {
    this.phoneNumber = data.phoneNumber;
    this.clientName = data.clientName || 'Cliente';
    this.conversationSummary = data.conversationSummary || '';
    this.messages = data.messages || [];
    this.status = data.status || 'active';
    this.vonageMessageId = data.vonageMessageId;
    this.whatsappMessageId = data.whatsappMessageId;
    this.errorMessage = data.errorMessage;
    this.sentAt = data.sentAt;
    this.receivedAt = data.receivedAt;
    this.lastMessageAt = data.lastMessageAt || new Date();
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Obtener referencia a la colección de conversaciones
   */
  static getCollection() {
    const db = getFirestore();
    if (!db) {
      console.warn('⚠️ Firestore no disponible, usando almacenamiento en memoria');
      return null;
    }
    try {
      return db.collection('conversations_whatsapp');
    } catch (error) {
      console.warn('⚠️ Error accediendo a Firestore, usando almacenamiento en memoria');
      return null;
    }
  }

  /**
   * Verificar si Firestore está disponible
   */
  static isFirestoreAvailable() {
    return this.getCollection() !== null;
  }

  /**
   * Guardar la conversación
   */
  async save() {
    const collection = ConversationWhatsApp.getCollection();
    
    // Si Firestore no está disponible, usar almacenamiento en memoria
    if (!collection) {
      const conversationData = {
        phoneNumber: this.phoneNumber,
        clientName: this.clientName,
        conversationSummary: this.conversationSummary,
        messages: this.messages,
        status: this.status,
        vonageMessageId: this.vonageMessageId,
        whatsappMessageId: this.whatsappMessageId,
        errorMessage: this.errorMessage,
        sentAt: this.sentAt,
        receivedAt: this.receivedAt,
        lastMessageAt: this.lastMessageAt,
        metadata: this.metadata,
        createdAt: inMemoryStore.has(this.phoneNumber) ? inMemoryStore.get(this.phoneNumber).createdAt : new Date(),
        updatedAt: new Date()
      };
      inMemoryStore.set(this.phoneNumber, conversationData);
      console.log(`💾 Conversación guardada en memoria: ${this.phoneNumber}`);
      return this;
    }

    // Intentar guardar en Firestore
    try {
      const docRef = collection.doc(this.phoneNumber);
      
      const conversationData = {
        phoneNumber: this.phoneNumber,
        clientName: this.clientName,
        conversationSummary: this.conversationSummary,
        messages: this.messages,
        status: this.status,
        vonageMessageId: this.vonageMessageId,
        whatsappMessageId: this.whatsappMessageId,
        errorMessage: this.errorMessage,
        sentAt: this.sentAt,
        receivedAt: this.receivedAt,
        lastMessageAt: this.lastMessageAt,
        metadata: this.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await docRef.set(conversationData, { merge: true });
      return this;
    } catch (error) {
      // Si falla Firestore, usar almacenamiento en memoria
      console.warn('⚠️ Firestore falló, usando almacenamiento en memoria:', error.message);
      const conversationData = {
        phoneNumber: this.phoneNumber,
        clientName: this.clientName,
        conversationSummary: this.conversationSummary,
        messages: this.messages,
        status: this.status,
        vonageMessageId: this.vonageMessageId,
        whatsappMessageId: this.whatsappMessageId,
        errorMessage: this.errorMessage,
        sentAt: this.sentAt,
        receivedAt: this.receivedAt,
        lastMessageAt: this.lastMessageAt,
        metadata: this.metadata,
        createdAt: inMemoryStore.has(this.phoneNumber) ? inMemoryStore.get(this.phoneNumber).createdAt : new Date(),
        updatedAt: new Date()
      };
      inMemoryStore.set(this.phoneNumber, conversationData);
      return this;
    }
  }

  /**
   * Agregar mensaje a la conversación
   */
  async addMessage(type, content, messageId = null, metadata = {}) {
    this.messages.push({
      type,
      content,
      messageId,
      timestamp: new Date(),
      metadata
    });
    this.lastMessageAt = new Date();
    return this.save();
  }

  /**
   * Actualizar estado de la conversación
   */
  async updateStatus(newStatus, updateData = {}) {
    this.status = newStatus;
    
    if (updateData.vonageMessageId) this.vonageMessageId = updateData.vonageMessageId;
    if (updateData.whatsappMessageId) this.whatsappMessageId = updateData.whatsappMessageId;
    if (updateData.errorMessage) this.errorMessage = updateData.errorMessage;
    if (updateData.sentAt) this.sentAt = updateData.sentAt;
    if (updateData.receivedAt) this.receivedAt = updateData.receivedAt;
    if (updateData.metadata) {
      this.metadata = { ...this.metadata, ...updateData.metadata };
    }
    
    return this.save();
  }

  /**
   * Crear o actualizar una conversación
   */
  static async createOrUpdate(phoneNumber, data) {
    const collection = this.getCollection();
    
    const conversationData = {
      phoneNumber,
      clientName: data.clientName || 'Cliente',
      conversationSummary: data.conversationSummary || '',
      messages: data.messages || [],
      status: data.status || 'active',
      vonageMessageId: data.vonageMessageId,
      whatsappMessageId: data.whatsappMessageId,
      errorMessage: data.errorMessage,
      sentAt: data.sentAt ? (data.sentAt instanceof Date ? data.sentAt : new Date(data.sentAt)) : null,
      receivedAt: data.receivedAt ? (data.receivedAt instanceof Date ? data.receivedAt : new Date(data.receivedAt)) : null,
      lastMessageAt: data.lastMessageAt ? (data.lastMessageAt instanceof Date ? data.lastMessageAt : new Date(data.lastMessageAt)) : new Date(),
      metadata: data.metadata || {},
      updatedAt: new Date()
    };

    // Si Firestore no está disponible, usar almacenamiento en memoria
    if (!collection) {
      const existing = inMemoryStore.get(phoneNumber);
      if (!existing) {
        conversationData.createdAt = new Date();
      }
      inMemoryStore.set(phoneNumber, conversationData);
      return new ConversationWhatsApp({
        ...conversationData,
        id: phoneNumber
      });
    }

    try {
      const docRef = collection.doc(phoneNumber);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        conversationData.createdAt = new Date();
      }

      await docRef.set(conversationData, { merge: true });
      
      return new ConversationWhatsApp({
        ...conversationData,
        id: phoneNumber
      });
    } catch (error) {
      console.warn('⚠️ Firestore falló, usando almacenamiento en memoria:', error.message);
      const existing = inMemoryStore.get(phoneNumber);
      if (!existing) {
        conversationData.createdAt = new Date();
      }
      inMemoryStore.set(phoneNumber, conversationData);
      return new ConversationWhatsApp({
        ...conversationData,
        id: phoneNumber
      });
    }
  }

  /**
   * Buscar una conversación por número de teléfono (equivalente a findOne)
   * Devuelve un solo objeto o null
   * Soporta encadenamiento .sort() para compatibilidad con código antiguo
   */
  static async findOne(query) {
    try {
      const phoneNumber = query?.phoneNumber;
      if (!phoneNumber) {
        return null;
      }

      const collection = this.getCollection();
      
      // Si Firestore no está disponible, usar almacenamiento en memoria
      if (!collection) {
        const data = inMemoryStore.get(phoneNumber);
        if (!data) {
          return null;
        }
        const conversation = new ConversationWhatsApp({
          ...data,
          id: phoneNumber
        });
        conversation.sort = () => conversation;
        return conversation;
      }

      const docRef = collection.doc(phoneNumber);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }

      const conversation = new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      });

      // Agregar método .sort() para compatibilidad (no hace nada, ya está ordenado)
      conversation.sort = () => conversation;
      
      return conversation;
    } catch (error) {
      // Error 5 NOT_FOUND es normal cuando el documento no existe
      if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
        // Fallback a memoria
        const data = inMemoryStore.get(query?.phoneNumber);
        if (!data) {
          return null;
        }
        const conversation = new ConversationWhatsApp({
          ...data,
          id: query?.phoneNumber
        });
        conversation.sort = () => conversation;
        return conversation;
      }
      console.error('❌ Error obteniendo conversación de Firestore:', error);
      // Fallback a memoria en caso de error
      const data = inMemoryStore.get(query?.phoneNumber);
      if (data) {
        const conversation = new ConversationWhatsApp({
          ...data,
          id: query?.phoneNumber
        });
        conversation.sort = () => conversation;
        return conversation;
      }
      return null;
    }
  }

  /**
   * Obtener todas las conversaciones (equivalente a find({}))
   */
  static async find(query = {}) {
    const collection = this.getCollection();
    
    // Si Firestore no está disponible, usar almacenamiento en memoria
    if (!collection) {
      return Array.from(inMemoryStore.values()).map(data => 
        new ConversationWhatsApp({ ...data, id: data.phoneNumber })
      );
    }

    try {
      const snapshot = await collection
        .orderBy('lastMessageAt', 'desc')
        .get();
      
      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map(doc => new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.warn('⚠️ Firestore falló, usando almacenamiento en memoria:', error.message);
      return Array.from(inMemoryStore.values()).map(data => 
        new ConversationWhatsApp({ ...data, id: data.phoneNumber })
      );
    }
  }

  /**
   * Obtener conversación por número de teléfono
   */
  static async findByPhoneNumber(phoneNumber, limit = 10) {
    const collection = this.getCollection();
    
    // Si Firestore no está disponible, usar almacenamiento en memoria
    if (!collection) {
      const data = inMemoryStore.get(phoneNumber);
      return data ? [new ConversationWhatsApp({ ...data, id: phoneNumber })] : [];
    }

    try {
      const snapshot = await collection
        .where('phoneNumber', '==', phoneNumber)
        .orderBy('lastMessageAt', 'desc')
        .limit(limit)
        .get();
      
      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map(doc => new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.warn('⚠️ Firestore falló, usando almacenamiento en memoria:', error.message);
      const data = inMemoryStore.get(phoneNumber);
      return data ? [new ConversationWhatsApp({ ...data, id: phoneNumber })] : [];
    }
  }

  /**
   * Buscar conversaciones por estado
   */
  static async findByStatus(status, limit = 50, offset = 0) {
    try {
      const collection = this.getCollection();
      const snapshot = await collection
        .where('status', '==', status)
        .orderBy('lastMessageAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error('❌ Error buscando conversaciones por estado en Firestore:', error);
      throw error;
    }
  }

  /**
   * Contar conversaciones por estado
   */
  static async countByStatus(status = null) {
    try {
      const collection = this.getCollection();
      let query = collection;
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error('❌ Error contando conversaciones en Firestore:', error);
      throw error;
    }
  }

  /**
   * Convertir a JSON
   */
  toJSON() {
    return {
      id: this.phoneNumber,
      phoneNumber: this.phoneNumber,
      clientName: this.clientName,
      conversationSummary: this.conversationSummary,
      messages: this.messages,
      status: this.status,
      vonageMessageId: this.vonageMessageId,
      whatsappMessageId: this.whatsappMessageId,
      errorMessage: this.errorMessage,
      sentAt: this.sentAt,
      receivedAt: this.receivedAt,
      lastMessageAt: this.lastMessageAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Mantener compatibilidad con el código existente
// Los métodos estáticos antiguos de mongoose ahora son métodos de clase

module.exports = ConversationWhatsApp;


