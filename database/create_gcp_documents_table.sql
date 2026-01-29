-- ============================================
-- TABLA: gcp_documents
-- Documentos almacenados en Google Cloud Platform
-- ============================================

CREATE TABLE IF NOT EXISTS gcp_documents (
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
CREATE INDEX IF NOT EXISTS idx_gcp_documents_file_name ON gcp_documents(file_name);
CREATE INDEX IF NOT EXISTS idx_gcp_documents_group_id ON gcp_documents(group_id);
CREATE INDEX IF NOT EXISTS idx_gcp_documents_uploaded_by ON gcp_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_gcp_documents_document_type ON gcp_documents(document_type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_gcp_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_gcp_documents_updated_at ON gcp_documents;
CREATE TRIGGER update_gcp_documents_updated_at BEFORE UPDATE ON gcp_documents
  FOR EACH ROW EXECUTE FUNCTION update_gcp_documents_updated_at();

-- Comentarios
COMMENT ON TABLE gcp_documents IS 'Documentos almacenados en Google Cloud Platform';
