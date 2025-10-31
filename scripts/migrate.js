const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Configuración de base de datos local
let dbConfig;

if (process.env.DATABASE_LOCAL_URL) {
  // Usar URL de conexión directa si está disponible
  dbConfig = {
    connectionString: process.env.DATABASE_LOCAL_URL,
    ssl: false
  };
} else {
  // Configuración tradicional por variables individuales
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ia-calls',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'moon@1014198153',
    ssl: false
  };
}

const pool = new Pool(dbConfig);

// Scripts SQL para crear las tablas
const createTablesSQL = `
-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS "public"."users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    time TIMESTAMP,
    agent_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS "public"."clients" (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    category VARCHAR(50),
    review TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de grupos
CREATE TABLE IF NOT EXISTS "public"."groups" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prompt TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    favorite BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES "public"."users"(id),
    "created-by" INTEGER REFERENCES "public"."clients"(id),
    idioma VARCHAR(5) DEFAULT 'es',
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Campos de tracking de batch calls
    batch_id VARCHAR(100),
    batch_status VARCHAR(50) DEFAULT 'none',
    batch_started_at TIMESTAMP,
    batch_completed_at TIMESTAMP,
    batch_total_recipients INTEGER DEFAULT 0,
    batch_completed_calls INTEGER DEFAULT 0,
    batch_failed_calls INTEGER DEFAULT 0,
    batch_metadata JSONB DEFAULT '{}',
    
    -- Campos de configuración de país y prefijo
    prefix VARCHAR(10) DEFAULT '+57',
    selected_country_code VARCHAR(5) DEFAULT 'CO',
    first_message TEXT,
    phone_number_id VARCHAR(100)
);

-- Crear tabla de relación clientes-grupos
CREATE TABLE IF NOT EXISTS "public"."client_groups" (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES "public"."clients"(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES "public"."groups"(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES "public"."users"(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, group_id)
);

-- Crear tabla de batch calls
CREATE TABLE IF NOT EXISTS "public"."batch_calls" (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    group_id INTEGER REFERENCES "public"."groups"(id),
    user_id INTEGER REFERENCES "public"."users"(id),
    agent_id VARCHAR(100),
    call_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    total_recipients INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de registros de llamadas
CREATE TABLE IF NOT EXISTS "public"."call_records" (
    id SERIAL PRIMARY KEY,
    batch_call_id INTEGER REFERENCES "public"."batch_calls"(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES "public"."clients"(id),
    phone_number VARCHAR(20) NOT NULL,
    recipient_id VARCHAR(100),
    conversation_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Datos de la conversación
    call_duration_secs INTEGER,
    transcript_summary TEXT,
    full_transcript JSONB,
    
    -- Datos del audio
    audio_url TEXT,
    audio_file_name VARCHAR(255),
    audio_size INTEGER,
    audio_content_type VARCHAR(100),
    audio_uploaded_at TIMESTAMP,
    
    -- Timestamps
    call_started_at TIMESTAMP,
    call_ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de archivos subidos
CREATE TABLE IF NOT EXISTS "public"."uploaded_files" (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES "public"."users"(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'
);

-- Crear tabla de documentos GCP
CREATE TABLE IF NOT EXISTS "public"."gcp_documents" (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES "public"."users"(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'
);

-- Crear tabla de conversaciones WhatsApp
CREATE TABLE IF NOT EXISTS "public"."whatsapp_conversations" (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    client_name VARCHAR(100),
    conversation_summary TEXT NOT NULL,
    message_sent JSONB,
    message_received JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    vonage_message_id VARCHAR(100),
    error_message TEXT,
    sent_at TIMESTAMP,
    received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON "public"."users"(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON "public"."users"(username);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON "public"."clients"(phone);
CREATE INDEX IF NOT EXISTS idx_clients_external_id ON "public"."clients"(external_id);
CREATE INDEX IF NOT EXISTS idx_groups_batch_id ON "public"."groups"(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_calls_batch_id ON "public"."batch_calls"(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_calls_group_id ON "public"."batch_calls"(group_id);
CREATE INDEX IF NOT EXISTS idx_call_records_batch_call_id ON "public"."call_records"(batch_call_id);
CREATE INDEX IF NOT EXISTS idx_call_records_client_id ON "public"."call_records"(client_id);
CREATE INDEX IF NOT EXISTS idx_call_records_phone_number ON "public"."call_records"(phone_number);
CREATE INDEX IF NOT EXISTS idx_client_groups_client_id ON "public"."client_groups"(client_id);
CREATE INDEX IF NOT EXISTS idx_client_groups_group_id ON "public"."client_groups"(group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone_number ON "public"."whatsapp_conversations"(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON "public"."whatsapp_conversations"(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_vonage_message_id ON "public"."whatsapp_conversations"(vonage_message_id);

-- Insertar usuario administrador por defecto
INSERT INTO "public"."users" (username, email, password, first_name, last_name, role, is_active)
VALUES ('admin', 'admin@ia-calls.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J8Kz8Kz8K', 'Admin', 'User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insertar usuario de prueba
INSERT INTO "public"."users" (username, email, password, first_name, last_name, role, is_active)
VALUES ('test', 'test@ia-calls.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J8Kz8Kz8K', 'Test', 'User', 'user', true)
ON CONFLICT (email) DO NOTHING;
`;

async function migrate() {
  try {
    console.log('🚀 Iniciando migración de base de datos...');
    console.log(`📍 Conectando a: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    // Ejecutar el script de creación de tablas
    await pool.query(createTablesSQL);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📊 Tablas creadas:');
    console.log('   - users');
    console.log('   - clients');
    console.log('   - groups');
    console.log('   - client_groups');
    console.log('   - batch_calls');
    console.log('   - call_records');
    console.log('   - uploaded_files');
    console.log('   - gcp_documents');
    console.log('   - whatsapp_conversations');
    console.log('🔑 Usuarios por defecto creados:');
    console.log('   - admin@ia-calls.com (password: admin123)');
    console.log('   - test@ia-calls.com (password: admin123)');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrate();
}

module.exports = { migrate, createTablesSQL };
