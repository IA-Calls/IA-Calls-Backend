-- ============================================
-- SQL SCHEMA - IA-Calls Backend Database
-- PostgreSQL Database Structure
-- ============================================

-- Eliminar tablas existentes (en orden inverso por dependencias)
DROP TABLE IF EXISTS whatsapp_conversations CASCADE;
DROP TABLE IF EXISTS call_records CASCADE;
DROP TABLE IF EXISTS batch_calls CASCADE;
DROP TABLE IF EXISTS gcp_documents CASCADE;
DROP TABLE IF EXISTS uploaded_files CASCADE;
DROP TABLE IF EXISTS client_groups CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLA: users
-- Usuarios del sistema
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'agent')),
  is_active BOOLEAN DEFAULT TRUE,
  time TIMESTAMP,  -- Fecha de expiración del usuario
  agent_id VARCHAR(255),  -- ID del agente conversacional de ElevenLabs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_agent_id ON users(agent_id);

-- ============================================
-- TABLA: clients
-- Clientes del sistema
-- ============================================
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255),  -- ID externo del cliente
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  category VARCHAR(100),
  review TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  metadata JSONB,  -- Metadatos adicionales del cliente
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para clients
CREATE INDEX idx_clients_external_id ON clients(external_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_clients_category ON clients(category);

-- ============================================
-- TABLA: groups
-- Grupos de clientes
-- ============================================
CREATE TABLE groups (
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
CREATE INDEX idx_groups_name ON groups(name);
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_is_active ON groups(is_active);
CREATE INDEX idx_groups_batch_id ON groups(batch_id);
CREATE INDEX idx_groups_batch_status ON groups(batch_status);
CREATE INDEX idx_groups_favorite ON groups(favorite);

-- ============================================
-- TABLA: client_groups
-- Relación muchos a muchos entre clients y groups
-- ============================================
CREATE TABLE client_groups (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, group_id)  -- Un cliente no puede estar en el mismo grupo más de una vez
);

-- Índices para client_groups
CREATE INDEX idx_client_groups_client_id ON client_groups(client_id);
CREATE INDEX idx_client_groups_group_id ON client_groups(group_id);
CREATE INDEX idx_client_groups_assigned_by ON client_groups(assigned_by);

-- ============================================
-- TABLA: uploaded_files
-- Archivos subidos al sistema
-- ============================================
CREATE TABLE uploaded_files (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(500) NOT NULL,
  file_name VARCHAR(500) NOT NULL UNIQUE,
  bucket_url TEXT,  -- URL del archivo en el bucket
  public_url TEXT,  -- URL pública del archivo
  download_url TEXT,  -- URL de descarga del archivo
  file_size BIGINT,  -- Tamaño del archivo en bytes
  content_type VARCHAR(100),  -- Tipo MIME del archivo
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',  -- Metadatos del archivo
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para uploaded_files
CREATE INDEX idx_uploaded_files_file_name ON uploaded_files(file_name);
CREATE INDEX idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
CREATE INDEX idx_uploaded_files_group_id ON uploaded_files(group_id);
CREATE INDEX idx_uploaded_files_is_active ON uploaded_files(is_active);

-- ============================================
-- TABLA: gcp_documents
-- Documentos almacenados en Google Cloud Platform
-- ============================================
CREATE TABLE gcp_documents (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  bucket_url TEXT NOT NULL,  -- URL del archivo en GCP
  public_url TEXT,  -- URL pública del archivo
  download_url TEXT,  -- URL de descarga del archivo
  file_size BIGINT,  -- Tamaño del archivo en bytes
  content_type VARCHAR(100),  -- Tipo MIME del archivo
  document_type VARCHAR(100) DEFAULT 'general',  -- Tipo de documento
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',  -- Metadatos del documento
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para gcp_documents
CREATE INDEX idx_gcp_documents_file_name ON gcp_documents(file_name);
CREATE INDEX idx_gcp_documents_group_id ON gcp_documents(group_id);
CREATE INDEX idx_gcp_documents_uploaded_by ON gcp_documents(uploaded_by);
CREATE INDEX idx_gcp_documents_document_type ON gcp_documents(document_type);

-- ============================================
-- TABLA: batch_calls
-- Registros de llamadas en lote (batch) de ElevenLabs
-- ============================================
CREATE TABLE batch_calls (
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
CREATE INDEX idx_batch_calls_batch_id ON batch_calls(batch_id);
CREATE INDEX idx_batch_calls_group_id ON batch_calls(group_id);
CREATE INDEX idx_batch_calls_user_id ON batch_calls(user_id);
CREATE INDEX idx_batch_calls_status ON batch_calls(status);
CREATE INDEX idx_batch_calls_agent_id ON batch_calls(agent_id);

-- ============================================
-- TABLA: call_records
-- Registros individuales de llamadas
-- ============================================
CREATE TABLE call_records (
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
CREATE INDEX idx_call_records_batch_call_id ON call_records(batch_call_id);
CREATE INDEX idx_call_records_client_id ON call_records(client_id);
CREATE INDEX idx_call_records_phone_number ON call_records(phone_number);
CREATE INDEX idx_call_records_recipient_id ON call_records(recipient_id);
CREATE INDEX idx_call_records_conversation_id ON call_records(conversation_id);
CREATE INDEX idx_call_records_status ON call_records(status);

-- ============================================
-- TABLA: whatsapp_conversations
-- Conversaciones de WhatsApp
-- ============================================
CREATE TABLE whatsapp_conversations (
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
CREATE INDEX idx_whatsapp_conversations_phone_number ON whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_vonage_message_id ON whatsapp_conversations(vonage_message_id);
CREATE INDEX idx_whatsapp_conversations_twilio_message_id ON whatsapp_conversations(twilio_message_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gcp_documents_updated_at BEFORE UPDATE ON gcp_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_calls_updated_at BEFORE UPDATE ON batch_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_records_updated_at BEFORE UPDATE ON call_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (SEEDS)
-- ============================================

-- Insertar usuario admin por defecto (contraseña: admin123)
-- Hash bcrypt de 'admin123' con 12 rounds
INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES (
  'admin',
  'admin@iacalls.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lDOKk7C8zQgS',  -- admin123
  'Admin',
  'Sistema',
  'admin',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Estadísticas de grupos
CREATE OR REPLACE VIEW group_statistics AS
SELECT 
  g.id,
  g.name,
  g.batch_status,
  COUNT(DISTINCT cg.client_id) AS total_clients,
  g.batch_total_recipients,
  g.batch_completed_calls,
  g.batch_failed_calls,
  CASE 
    WHEN g.batch_total_recipients > 0 
    THEN ROUND((g.batch_completed_calls::DECIMAL / g.batch_total_recipients) * 100, 2)
    ELSE 0
  END AS success_rate,
  g.created_at,
  g.batch_started_at,
  g.batch_completed_at
FROM groups g
LEFT JOIN client_groups cg ON g.id = cg.group_id
WHERE g.is_active = TRUE
GROUP BY g.id, g.name, g.batch_status, g.batch_total_recipients, 
         g.batch_completed_calls, g.batch_failed_calls, g.created_at,
         g.batch_started_at, g.batch_completed_at;

-- Vista: Historial de llamadas por cliente
CREATE OR REPLACE VIEW client_call_history AS
SELECT 
  c.id AS client_id,
  c.name AS client_name,
  c.phone AS client_phone,
  cr.id AS call_record_id,
  cr.status AS call_status,
  cr.call_duration_secs,
  cr.transcript_summary,
  cr.call_started_at,
  cr.call_ended_at,
  bc.batch_id,
  bc.call_name AS batch_name,
  g.name AS group_name
FROM clients c
LEFT JOIN call_records cr ON c.id = cr.client_id
LEFT JOIN batch_calls bc ON cr.batch_call_id = bc.id
LEFT JOIN groups g ON bc.group_id = g.id
WHERE c.is_active = TRUE
ORDER BY cr.call_started_at DESC;

-- Vista: Estadísticas de batch calls
CREATE OR REPLACE VIEW batch_call_statistics AS
SELECT 
  bc.id,
  bc.batch_id,
  bc.call_name,
  bc.status,
  bc.total_recipients,
  bc.completed_calls,
  bc.failed_calls,
  CASE 
    WHEN bc.total_recipients > 0 
    THEN ROUND((bc.completed_calls::DECIMAL / bc.total_recipients) * 100, 2)
    ELSE 0
  END AS completion_rate,
  bc.started_at,
  bc.completed_at,
  EXTRACT(EPOCH FROM (bc.completed_at - bc.started_at)) / 60 AS duration_minutes,
  g.name AS group_name,
  u.username AS user_name
FROM batch_calls bc
LEFT JOIN groups g ON bc.group_id = g.id
LEFT JOIN users u ON bc.user_id = u.id
ORDER BY bc.started_at DESC;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE users IS 'Usuarios del sistema con roles y permisos';
COMMENT ON TABLE clients IS 'Clientes del sistema que recibirán las llamadas';
COMMENT ON TABLE groups IS 'Grupos de clientes con configuración de campaña';
COMMENT ON TABLE client_groups IS 'Relación muchos a muchos entre clientes y grupos';
COMMENT ON TABLE uploaded_files IS 'Archivos subidos al sistema (Excel, CSV, etc)';
COMMENT ON TABLE gcp_documents IS 'Documentos almacenados en Google Cloud Platform';
COMMENT ON TABLE batch_calls IS 'Llamadas en lote realizadas con ElevenLabs';
COMMENT ON TABLE call_records IS 'Registro individual de cada llamada realizada';
COMMENT ON TABLE whatsapp_conversations IS 'Conversaciones de WhatsApp post-llamada';

COMMENT ON COLUMN users.agent_id IS 'ID del agente conversacional de ElevenLabs asignado al usuario';
COMMENT ON COLUMN groups.batch_id IS 'ID del batch call activo de ElevenLabs';
COMMENT ON COLUMN groups.phone_number_id IS 'ID del número de teléfono de ElevenLabs para las llamadas';
COMMENT ON COLUMN call_records.conversation_id IS 'ID de la conversación en ElevenLabs (usado para continuar en WhatsApp)';
COMMENT ON COLUMN whatsapp_conversations.conversation_summary IS 'Resumen de la llamada anterior para contexto';

-- ============================================
-- PERMISOS (OPCIONAL)
-- ============================================

-- Crear role de solo lectura (opcional)
-- CREATE ROLE readonly;
-- GRANT CONNECT ON DATABASE your_database TO readonly;
-- GRANT USAGE ON SCHEMA public TO readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Crear role de lectura/escritura (opcional)
-- CREATE ROLE readwrite;
-- GRANT CONNECT ON DATABASE your_database TO readwrite;
-- GRANT USAGE ON SCHEMA public TO readwrite;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO readwrite;

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- Verificar estructura
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

