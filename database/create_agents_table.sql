-- ============================================
-- TABLA: agents
-- Almacena la relación entre agentes de ElevenLabs y usuarios
-- Permite multiusuario: cada usuario solo ve sus propios agentes
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL UNIQUE, -- ID del agente en ElevenLabs
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Usuario propietario
  name VARCHAR(255) NOT NULL, -- Nombre del agente
  metadata JSONB DEFAULT '{}', -- Configuración adicional del agente
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint: un usuario no puede tener el mismo agent_id duplicado
  UNIQUE(agent_id, user_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id_agent_id ON agents(user_id, agent_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agents_updated_at();

-- Comentarios
COMMENT ON TABLE agents IS 'Almacena la relación entre agentes de ElevenLabs y usuarios del sistema';
COMMENT ON COLUMN agents.agent_id IS 'ID único del agente en ElevenLabs';
COMMENT ON COLUMN agents.user_id IS 'ID del usuario propietario del agente';
COMMENT ON COLUMN agents.name IS 'Nombre del agente';
COMMENT ON COLUMN agents.metadata IS 'Configuración adicional del agente en formato JSON';

