-- Tabla para almacenar Page Access Tokens de Facebook/Meta
-- Cada usuario puede tener múltiples páginas de Facebook conectadas

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS facebook_page_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Información de la página de Facebook
  page_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(500),
  page_category VARCHAR(255),
  page_access_token TEXT NOT NULL, -- Token de acceso de larga duración
  
  -- Información del usuario de Facebook
  facebook_user_id VARCHAR(255),
  user_access_token TEXT, -- Token de usuario de larga duración (opcional)
  
  -- Metadata y control
  token_expires_at TIMESTAMP, -- Fecha de expiración del token (si aplica)
  scopes TEXT[], -- Permisos otorgados
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP, -- Última vez que se validó el token
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, page_id) -- Un usuario no puede tener la misma página duplicada
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_facebook_page_tokens_user_id ON facebook_page_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_page_tokens_page_id ON facebook_page_tokens(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_page_tokens_is_active ON facebook_page_tokens(is_active);

-- Trigger para actualizar updated_at automáticamente
-- Nota: Esta función puede ya existir de otras tablas, se ignora el error si existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_facebook_page_tokens_updated_at'
  ) THEN
    CREATE FUNCTION update_facebook_page_tokens_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Crear trigger (se ignora si ya existe)
DROP TRIGGER IF EXISTS trigger_update_facebook_page_tokens_updated_at ON facebook_page_tokens;
CREATE TRIGGER trigger_update_facebook_page_tokens_updated_at
BEFORE UPDATE ON facebook_page_tokens
FOR EACH ROW
EXECUTE FUNCTION update_facebook_page_tokens_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE facebook_page_tokens IS 'Almacena tokens de acceso de páginas de Facebook para integración con Meta API';
COMMENT ON COLUMN facebook_page_tokens.page_access_token IS 'Token de acceso de larga duración (60 días o permanente)';
COMMENT ON COLUMN facebook_page_tokens.scopes IS 'Array de permisos otorgados durante el OAuth';

