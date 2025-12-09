-- Migración: Agregar columna metadata a la tabla conversations
-- Fecha: 2025-12-04
-- Descripción: Agrega columna JSONB para almacenar información adicional como elevenlabs_conversation_id

-- Agregar columna metadata si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE conversations 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Columna metadata agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna metadata ya existe';
  END IF;
END $$;

-- Crear índice para búsquedas en metadata
CREATE INDEX IF NOT EXISTS idx_conversations_metadata 
ON conversations USING gin(metadata);

-- Comentario de la columna
COMMENT ON COLUMN conversations.metadata IS 'Almacena información adicional como elevenlabs_conversation_id, preferencias del usuario, etc.';

