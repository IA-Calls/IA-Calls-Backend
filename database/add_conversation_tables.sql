-- ============================================
-- TABLAS ADICIONALES PARA CONVERSACIONES DE WHATSAPP
-- Ejecutar después de schema.sql
-- ============================================

-- Tabla para estado de conversaciones activas
CREATE TABLE IF NOT EXISTS conversation_state (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255),
  
  -- IDs de ElevenLabs
  elevenlabs_conversation_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  batch_id VARCHAR(255),
  recipient_id VARCHAR(255),
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'escalated')),
  
  -- Contexto de la llamada
  call_summary TEXT,
  call_duration_secs INTEGER,
  
  -- Tracking
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para mensajes individuales de conversaciones
CREATE TABLE IF NOT EXISTS conversation_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversation_state(id) ON DELETE CASCADE,
  
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  
  -- IDs externos
  twilio_message_id VARCHAR(255),
  elevenlabs_response JSONB,
  
  -- Timestamps
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Índices para conversation_state
CREATE INDEX IF NOT EXISTS idx_conversation_state_phone ON conversation_state(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversation_state_elevenlabs_conv_id ON conversation_state(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_status ON conversation_state(status);
CREATE INDEX IF NOT EXISTS idx_conversation_state_agent_id ON conversation_state(agent_id);

-- Índices para conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_direction ON conversation_messages(direction);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sent_at ON conversation_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_twilio_id ON conversation_messages(twilio_message_id);

-- Trigger para actualizar updated_at en conversation_state
DROP TRIGGER IF EXISTS update_conversation_state_updated_at ON conversation_state;
CREATE TRIGGER update_conversation_state_updated_at 
  BEFORE UPDATE ON conversation_state
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE conversation_state IS 'Estado actual de conversaciones de WhatsApp';
COMMENT ON TABLE conversation_messages IS 'Mensajes individuales de conversaciones';
COMMENT ON COLUMN conversation_state.elevenlabs_conversation_id IS 'ID de conversación de ElevenLabs (usado para continuar contexto)';
COMMENT ON COLUMN conversation_state.agent_id IS 'ID del agente de ElevenLabs';

-- Vista para conversaciones activas
CREATE OR REPLACE VIEW active_conversations AS
SELECT 
  cs.*,
  COUNT(cm.id) as actual_message_count,
  MAX(cm.sent_at) as last_message_timestamp
FROM conversation_state cs
LEFT JOIN conversation_messages cm ON cs.id = cm.conversation_id
WHERE cs.status = 'active'
GROUP BY cs.id
ORDER BY cs.last_message_at DESC;

-- Vista para estadísticas de conversaciones
CREATE OR REPLACE VIEW conversation_statistics AS
SELECT 
  DATE(started_at) as date,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated,
  SUM(message_count) as total_messages,
  ROUND(AVG(message_count), 2) as avg_messages_per_conversation
FROM conversation_state
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- Verificar creación
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('conversation_state', 'conversation_messages')
ORDER BY table_name;

-- Mostrar éxito
SELECT '✅ Tablas de conversaciones creadas exitosamente' AS message;

