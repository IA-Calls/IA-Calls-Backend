-- ============================================
-- TABLA: uploaded_files
-- Archivos subidos al sistema
-- ============================================

CREATE TABLE IF NOT EXISTS uploaded_files (
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
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_name ON uploaded_files(file_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_group_id ON uploaded_files(group_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_is_active ON uploaded_files(is_active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_uploaded_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON uploaded_files;
CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION update_uploaded_files_updated_at();

-- Comentarios
COMMENT ON TABLE uploaded_files IS 'Archivos subidos al sistema (Excel, CSV, etc)';
