const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userPhone: {
    type: String,
    required: true,
    index: true
  },
  lastMessage: {
    type: String,
    default: null
  },
  hasStarted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'conversations_whatsapp'
});

conversationSchema.statics.findByPhone = async function(phone) {
  return this.findOne({ userPhone: phone });
};

conversationSchema.statics.createOrUpdate = async function(phone, data = {}) {
  const existing = await this.findOne({ userPhone: phone });
  if (existing) {
    Object.assign(existing, data);
    return existing.save();
  }
  return this.create({ userPhone: phone, ...data });
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

