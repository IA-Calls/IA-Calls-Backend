-- Tabla para rastrear archivos subidos al bucket
CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    bucket_url VARCHAR(500) NOT NULL,
    public_url VARCHAR(500),
    download_url VARCHAR(500),
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_uploaded_files_original_name ON uploaded_files(original_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_name ON uploaded_files(file_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_group_id ON uploaded_files(group_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created_at ON uploaded_files(created_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_is_active ON uploaded_files(is_active);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_uploaded_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION update_uploaded_files_updated_at();

-- Comentarios para documentar la tabla
COMMENT ON TABLE uploaded_files IS 'Tabla para rastrear archivos subidos al bucket de Google Cloud Storage';
COMMENT ON COLUMN uploaded_files.original_name IS 'Nombre original del archivo subido por el usuario';
COMMENT ON COLUMN uploaded_files.file_name IS 'Nombre único del archivo en el bucket (incluye ruta)';
COMMENT ON COLUMN uploaded_files.bucket_url IS 'URL del archivo en el bucket (gs://bucket/path)';
COMMENT ON COLUMN uploaded_files.public_url IS 'URL pública del archivo (si está disponible)';
COMMENT ON COLUMN uploaded_files.download_url IS 'URL temporal de descarga (firmada)';
COMMENT ON COLUMN uploaded_files.file_size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN uploaded_files.content_type IS 'Tipo MIME del archivo';
COMMENT ON COLUMN uploaded_files.uploaded_by IS 'ID del usuario que subió el archivo';
COMMENT ON COLUMN uploaded_files.group_id IS 'ID del grupo asociado (si aplica)';
COMMENT ON COLUMN uploaded_files.metadata IS 'Metadatos adicionales del archivo (JSON)'; 