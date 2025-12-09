const mongoose = require('mongoose');

/**
 * Schema para conversaciones de WhatsApp en MongoDB
 */
const conversationWhatsAppSchema = new mongoose.Schema({
  // Información del contacto
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String,
    default: 'Cliente'
  },
  
  // Información de la conversación
  conversationSummary: {
    type: String,
    required: true
  },
  
  // Mensajes
  messages: [{
    type: {
      type: String,
      enum: ['sent', 'received'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    messageId: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Estado de la conversación
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'active', 'closed'],
    default: 'pending',
    index: true
  },
  
  // IDs externos
  vonageMessageId: String,
  whatsappMessageId: String,
  
  // Errores
  errorMessage: String,
  
  // Timestamps
  sentAt: Date,
  receivedAt: Date,
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Metadata adicional
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Crea createdAt y updatedAt automáticamente
  collection: 'conversations_whatsapp' // Nombre de la colección
});

// Índices para mejorar el rendimiento de las consultas
conversationWhatsAppSchema.index({ phoneNumber: 1, lastMessageAt: -1 });
conversationWhatsAppSchema.index({ status: 1, lastMessageAt: -1 });
conversationWhatsAppSchema.index({ createdAt: -1 });

// Métodos del modelo
conversationWhatsAppSchema.methods.addMessage = function(type, content, messageId = null, metadata = {}) {
  this.messages.push({
    type,
    content,
    messageId,
    timestamp: new Date(),
    metadata
  });
  this.lastMessageAt = new Date();
  return this.save();
};

conversationWhatsAppSchema.methods.updateStatus = function(newStatus, updateData = {}) {
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
};

// Métodos estáticos
conversationWhatsAppSchema.statics.findByPhoneNumber = async function(phoneNumber, limit = 10) {
  return this.find({ phoneNumber })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .exec();
};

conversationWhatsAppSchema.statics.findByStatus = async function(status, limit = 50, offset = 0) {
  return this.find({ status })
    .sort({ lastMessageAt: -1 })
    .skip(offset)
    .limit(limit)
    .exec();
};

conversationWhatsAppSchema.statics.countByStatus = async function(status = null) {
  if (status) {
    return this.countDocuments({ status });
  }
  return this.countDocuments();
};

// Crear el modelo
const ConversationWhatsApp = mongoose.model('ConversationWhatsApp', conversationWhatsAppSchema);

module.exports = ConversationWhatsApp;


