const { getFirestore } = require('../config/firestore');

/**
 * Modelo para conversaciones de WhatsApp en Firestore
 * Reemplaza el modelo de MongoDB
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

      // Si el documento no existe, agregar createdAt
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
  static async findByPhoneNumber(phoneNumber) {
    try {
      const collection = this.getCollection();
      const doc = await collection.doc(phoneNumber).get();
      
      if (!doc.exists) {
        return null;
      }

      return new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      });
    } catch (error) {
      console.error('❌ Error obteniendo conversación de Firestore:', error);
      throw error;
    }
  }

  /**
   * Agregar mensaje a una conversación
   */
  static async addMessage(phoneNumber, message) {
    try {
      const collection = this.getCollection();
      const docRef = collection.doc(phoneNumber);
      
      const doc = await docRef.get();
      const currentData = doc.exists ? doc.data() : {};
      const messages = currentData.messages || [];
      
      messages.push({
        ...message,
        timestamp: message.timestamp || new Date()
      });

      await docRef.set({
        messages,
        lastMessageAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('❌ Error agregando mensaje en Firestore:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de una conversación
   */
  static async updateStatus(phoneNumber, status, errorMessage = null) {
    try {
      const collection = this.getCollection();
      const docRef = collection.doc(phoneNumber);
      
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await docRef.set(updateData, { merge: true });

      return true;
    } catch (error) {
      console.error('❌ Error actualizando estado en Firestore:', error);
      throw error;
    }
  }

  /**
   * Listar todas las conversaciones
   */
  static async findAll(limit = 100) {
    try {
      const collection = this.getCollection();
      const snapshot = await collection
        .orderBy('lastMessageAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error('❌ Error listando conversaciones de Firestore:', error);
      throw error;
    }
  }

  /**
   * Buscar conversaciones
   */
  static async search(query, limit = 50) {
    try {
      const collection = this.getCollection();
      let queryRef = collection;

      // Si hay un query de búsqueda, filtrar
      if (query.phoneNumber) {
        queryRef = queryRef.where('phoneNumber', '==', query.phoneNumber);
      }

      if (query.status) {
        queryRef = queryRef.where('status', '==', query.status);
      }

      const snapshot = await queryRef
        .orderBy('lastMessageAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => new ConversationWhatsApp({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error('❌ Error buscando conversaciones en Firestore:', error);
      throw error;
    }
  }

  /**
   * Eliminar conversación
   */
  static async delete(phoneNumber) {
    try {
      const collection = this.getCollection();
      await collection.doc(phoneNumber).delete();
      return true;
    } catch (error) {
      console.error('❌ Error eliminando conversación de Firestore:', error);
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

module.exports = ConversationWhatsApp;





