-- ============================================
-- TABLA: batch_calls
-- Registros de llamadas en lote (batch) de ElevenLabs
-- ============================================

CREATE TABLE IF NOT EXISTS batch_calls (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL UNIQUE,  -- ID del batch call de ElevenLabs
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  agent_id VARCHAR(255),  -- ID del agente de ElevenLabs
  call_name VARCHAR(255),  -- Nombre del batch call
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',  -- Metadatos del batch call
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para batch_calls
CREATE INDEX IF NOT EXISTS idx_batch_calls_batch_id ON batch_calls(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_calls_group_id ON batch_calls(group_id);
CREATE INDEX IF NOT EXISTS idx_batch_calls_user_id ON batch_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_calls_status ON batch_calls(status);
CREATE INDEX IF NOT EXISTS idx_batch_calls_agent_id ON batch_calls(agent_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_batch_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_batch_calls_updated_at ON batch_calls;
CREATE TRIGGER update_batch_calls_updated_at BEFORE UPDATE ON batch_calls
  FOR EACH ROW EXECUTE FUNCTION update_batch_calls_updated_at();

-- Comentarios
COMMENT ON TABLE batch_calls IS 'Llamadas en lote realizadas con ElevenLabs';
