-- ============================================
-- TABLA: whatsapp_agents
-- Almacena agentes específicos para WhatsApp
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS whatsapp_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255) NOT NULL UNIQUE, -- ID del agente en ElevenLabs
  instructor TEXT NOT NULL, -- Sistema instructor (prompt)
  text_only BOOLEAN DEFAULT FALSE, -- true = solo texto, false = con audio
  voice_id VARCHAR(255), -- ID de la voz en ElevenLabs
  language VARCHAR(10) DEFAULT 'es', -- Idioma del agente
  initial_message TEXT, -- Mensaje inicial opcional
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}', -- Configuración adicional
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_agents_agent_id ON whatsapp_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_agents_is_active ON whatsapp_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_agents_created_by ON whatsapp_agents(created_by);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_agents_updated_at
  BEFORE UPDATE ON whatsapp_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_agents_updated_at();

-- NOTA: La columna agent_id en conversations se agregará después
-- cuando la tabla conversations exista (ver create_conversations_table.sql)

