-- ============================================
-- TABLA: knowledge_items
-- Almacena elementos de conocimiento para agentes (links y documentos)
-- Permite multiusuario: cada usuario solo ve sus propios elementos
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('link', 'document')),
  
  -- Configuración de enlaces (si type = 'link')
  url TEXT,
  link_type VARCHAR(50) CHECK (link_type IN ('calendar', 'form', 'payment', 'website', 'other')),
  link_title VARCHAR(255),
  link_description TEXT,
  link_metadata JSONB DEFAULT '{}', -- Metadata extraída de la URL (og:tags, etc.)
  
  -- Configuración de documentos (si type = 'document')
  file_name VARCHAR(255),
  file_path TEXT,
  file_size BIGINT,
  file_mime_type VARCHAR(100),
  gcs_bucket VARCHAR(255),
  gcs_object_name VARCHAR(500),
  document_type VARCHAR(50) CHECK (document_type IN ('pdf', 'word', 'excel', 'image', 'other')),
  
  -- Contenido procesado
  processed_content TEXT, -- Contenido extraído del documento/enlace
  processed_data JSONB DEFAULT '{}', -- Datos estructurados procesados
  extraction_status VARCHAR(50) DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Parámetros de uso y disparadores
  triggers JSONB DEFAULT '[]', -- Array de palabras clave que disparan este elemento
  conversation_types JSONB DEFAULT '[]', -- Tipos de conversación donde se usa (ej: ['sales', 'support'])
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- Prioridad 1-10
  usage_context TEXT, -- Contexto de uso descriptivo
  usage_instructions TEXT, -- Instrucciones específicas para el agente sobre cuándo usar este elemento
  
  -- Vinculación con agentes
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE SET NULL,
  
  -- Estado y metadatos
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}', -- Metadatos adicionales
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  synced_at TIMESTAMP -- Última vez que se sincronizó con Agent Builder
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_id ON knowledge_items(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON knowledge_items(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_agent_id ON knowledge_items(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_is_active ON knowledge_items(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_id_type ON knowledge_items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_extraction_status ON knowledge_items(extraction_status);

-- Índice GIN para búsqueda en triggers (palabras clave)
CREATE INDEX IF NOT EXISTS idx_knowledge_items_triggers_gin ON knowledge_items USING GIN (triggers);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_knowledge_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_items_updated_at
  BEFORE UPDATE ON knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_items_updated_at();

-- Comentarios
COMMENT ON TABLE knowledge_items IS 'Almacena elementos de conocimiento (links y documentos) para agentes de WhatsApp';
COMMENT ON COLUMN knowledge_items.user_id IS 'ID del usuario propietario del elemento';
COMMENT ON COLUMN knowledge_items.type IS 'Tipo de elemento: link o document';
COMMENT ON COLUMN knowledge_items.triggers IS 'Array de palabras clave que disparan este elemento';
COMMENT ON COLUMN knowledge_items.priority IS 'Prioridad del elemento (1-10, donde 10 es más importante)';
COMMENT ON COLUMN knowledge_items.processed_content IS 'Contenido extraído y procesado del elemento';
COMMENT ON COLUMN knowledge_items.synced_at IS 'Última vez que se sincronizó con Vertex AI Agent Builder';

