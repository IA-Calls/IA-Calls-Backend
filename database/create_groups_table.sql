-- ============================================
-- TABLA: groups
-- Grupos de clientes
-- ============================================

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  prompt TEXT,  -- Prompt personalizado para el agente IA
  color VARCHAR(20) DEFAULT '#3B82F6',
  favorite BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "created-by" VARCHAR(255),  -- ID del cliente que creó el grupo
  idioma VARCHAR(10) DEFAULT 'es',  -- Idioma del grupo
  variables JSONB DEFAULT '{}',  -- Variables del grupo
  
  -- Campos de tracking de batch calls
  batch_id VARCHAR(255),  -- ID del batch call de ElevenLabs
  batch_status VARCHAR(50) DEFAULT 'none' CHECK (batch_status IN ('none', 'pending', 'in_progress', 'completed', 'failed')),
  batch_started_at TIMESTAMP,
  batch_completed_at TIMESTAMP,
  batch_total_recipients INTEGER DEFAULT 0,
  batch_completed_calls INTEGER DEFAULT 0,
  batch_failed_calls INTEGER DEFAULT 0,
  batch_metadata JSONB DEFAULT '{}',
  
  -- Campos de configuración de país y prefijo
  prefix VARCHAR(10) DEFAULT '+57',
  selected_country_code VARCHAR(5) DEFAULT 'CO',
  first_message TEXT,  -- Primer mensaje del agente
  phone_number_id VARCHAR(255),  -- ID del número de teléfono de ElevenLabs
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para groups
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_batch_id ON groups(batch_id);
CREATE INDEX IF NOT EXISTS idx_groups_batch_status ON groups(batch_status);
CREATE INDEX IF NOT EXISTS idx_groups_favorite ON groups(favorite);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_groups_updated_at();

-- Comentarios
COMMENT ON TABLE groups IS 'Grupos de clientes con configuración de campaña';
COMMENT ON COLUMN groups.batch_id IS 'ID del batch call activo de ElevenLabs';
COMMENT ON COLUMN groups.phone_number_id IS 'ID del número de teléfono de ElevenLabs para las llamadas';
