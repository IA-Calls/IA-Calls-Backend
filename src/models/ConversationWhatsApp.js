// Usar Firestore en lugar de MongoDB
const { getFirestore } = require('../config/firestore');

/**
 * Modelo para conversaciones de WhatsApp en Firestore
 * Migrado de MongoDB a Firestore
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
      throw new Error('Firestore no está conectado');
    }
    return db.collection('conversations_whatsapp');
  }

  /**
   * Guardar la conversación
   */
  async save() {
    try {
      const collection = ConversationWhatsApp.getCollection();
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
        updatedAt: new Date()
      };

      const doc = await docRef.get();
      if (!doc.exists) {
        conversationData.createdAt = new Date();
      }

      await docRef.set(conversationData, { merge: true });
      return this;
    } catch (error) {
      console.error('❌ Error guardando conversación en Firestore:', error);
      throw error;
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
    try {
      const collection = this.getCollection();
      const docRef = collection.doc(phoneNumber);
      
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
      console.error('❌ Error creando/actualizando conversación en Firestore:', error);
      throw error;
    }
  }

  /**
   * Obtener conversación por número de teléfono
   */
  static async findByPhoneNumber(phoneNumber, limit = 10) {
    try {
      const collection = this.getCollection();
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
      console.error('❌ Error obteniendo conversación de Firestore:', error);
      throw error;
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


