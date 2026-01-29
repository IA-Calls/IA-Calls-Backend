-- ============================================
-- TABLA: whatsapp_conversations
-- Conversaciones de WhatsApp
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(255),
  conversation_summary TEXT,  -- Resumen de la conversación anterior
  message_sent JSONB,  -- Mensaje enviado
  message_received JSONB,  -- Mensaje recibido
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'replied')),
  vonage_message_id VARCHAR(255),  -- ID del mensaje en Vonage (deprecado - ahora se usa Twilio)
  twilio_message_id VARCHAR(255),  -- ID del mensaje en Twilio
  error_message TEXT,  -- Mensaje de error si falló
  sent_at TIMESTAMP,
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para whatsapp_conversations
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone_number ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_vonage_message_id ON whatsapp_conversations(vonage_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_twilio_message_id ON whatsapp_conversations(twilio_message_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON whatsapp_conversations;
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- Comentarios
COMMENT ON TABLE whatsapp_conversations IS 'Conversaciones de WhatsApp post-llamada';
COMMENT ON COLUMN whatsapp_conversations.conversation_summary IS 'Resumen de la llamada anterior para contexto';
