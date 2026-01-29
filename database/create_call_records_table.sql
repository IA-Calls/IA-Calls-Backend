-- ============================================
-- TABLA: call_records
-- Registros individuales de llamadas
-- ============================================

CREATE TABLE IF NOT EXISTS call_records (
  id SERIAL PRIMARY KEY,
  batch_call_id INTEGER REFERENCES batch_calls(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  phone_number VARCHAR(50) NOT NULL,
  recipient_id VARCHAR(255),  -- ID del recipient en ElevenLabs
  conversation_id VARCHAR(255),  -- ID de la conversación en ElevenLabs
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'initiated', 'ringing', 'in_progress', 'completed', 'finished', 'ended', 'failed', 'busy', 'no_answer', 'cancelled')),
  
  -- Datos de la conversación
  call_duration_secs INTEGER,  -- Duración de la llamada en segundos
  transcript_summary TEXT,  -- Resumen de la transcripción
  full_transcript JSONB,  -- Transcripción completa
  
  -- Datos del audio
  audio_url TEXT,  -- URL del audio de la llamada
  audio_file_name VARCHAR(500),  -- Nombre del archivo de audio
  audio_size BIGINT,  -- Tamaño del audio en bytes
  audio_content_type VARCHAR(100),  -- Tipo MIME del audio
  audio_uploaded_at TIMESTAMP,  -- Fecha de subida del audio
  
  -- Timestamps
  call_started_at TIMESTAMP,
  call_ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para call_records
CREATE INDEX IF NOT EXISTS idx_call_records_batch_call_id ON call_records(batch_call_id);
CREATE INDEX IF NOT EXISTS idx_call_records_client_id ON call_records(client_id);
CREATE INDEX IF NOT EXISTS idx_call_records_phone_number ON call_records(phone_number);
CREATE INDEX IF NOT EXISTS idx_call_records_recipient_id ON call_records(recipient_id);
CREATE INDEX IF NOT EXISTS idx_call_records_conversation_id ON call_records(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON call_records(status);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_call_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_call_records_updated_at ON call_records;
CREATE TRIGGER update_call_records_updated_at BEFORE UPDATE ON call_records
  FOR EACH ROW EXECUTE FUNCTION update_call_records_updated_at();

-- Comentarios
COMMENT ON TABLE call_records IS 'Registro individual de cada llamada realizada';
COMMENT ON COLUMN call_records.conversation_id IS 'ID de la conversación en ElevenLabs (usado para continuar en WhatsApp)';
