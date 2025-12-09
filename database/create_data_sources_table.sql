-- ============================================
-- TABLA: data_sources
-- Almacena fuentes de información para agentes de WhatsApp
-- Permite multiusuario: cada usuario solo ve sus propias fuentes
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('database', 'excel', 'google_sheet', 'pdf')),
  
  -- Configuración de base de datos (si type = 'database')
  db_host VARCHAR(255),
  db_port INTEGER,
  db_name VARCHAR(255),
  db_user VARCHAR(255),
  db_password_encrypted TEXT, -- Contraseña encriptada
  db_type VARCHAR(50) CHECK (db_type IN ('mysql', 'postgresql', 'sqlserver', 'mariadb')),
  selected_database VARCHAR(255),
  selected_table VARCHAR(255),
  
  -- Configuración de archivos (si type = 'excel' o 'pdf')
  file_name VARCHAR(255),
  file_path TEXT, -- Ruta en Google Cloud Storage
  file_size BIGINT,
  file_mime_type VARCHAR(100),
  gcs_bucket VARCHAR(255),
  gcs_object_name VARCHAR(500),
  
  -- Configuración de Google Sheets (si type = 'google_sheet')
  google_sheet_url TEXT,
  sheet_id VARCHAR(255),
  sheet_name VARCHAR(255),
  
  -- Estado y procesamiento
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'synced')),
  processed_data JSONB DEFAULT '{}', -- Datos procesados y normalizados
  metadata JSONB DEFAULT '{}', -- Metadatos adicionales (columnas, esquemas, etc.)
  error_message TEXT,
  
  -- Vinculación con agentes
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  synced_at TIMESTAMP -- Última vez que se sincronizó con Agent Builder
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);
CREATE INDEX IF NOT EXISTS idx_data_sources_agent_id ON data_sources(agent_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id_type ON data_sources(user_id, type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_data_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_data_sources_updated_at();

-- Comentarios
COMMENT ON TABLE data_sources IS 'Almacena fuentes de información para agentes de WhatsApp';
COMMENT ON COLUMN data_sources.user_id IS 'ID del usuario propietario de la fuente';
COMMENT ON COLUMN data_sources.type IS 'Tipo de fuente: database, excel, google_sheet, pdf';
COMMENT ON COLUMN data_sources.processed_data IS 'Datos procesados y normalizados en formato JSON';
COMMENT ON COLUMN data_sources.metadata IS 'Metadatos adicionales (esquemas, columnas, etc.)';
COMMENT ON COLUMN data_sources.synced_at IS 'Última vez que se sincronizó con Vertex AI Agent Builder';

