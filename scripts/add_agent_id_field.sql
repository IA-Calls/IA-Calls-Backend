-- Migración para agregar el campo agent_id a la tabla users
-- Este campo almacenará el ID del agente conversacional de ElevenLabs

-- Agregar la columna agent_id a la tabla users
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN "public"."users".agent_id IS 'ID del agente conversacional de ElevenLabs asociado al usuario';

-- Crear índice para mejorar las consultas por agent_id
CREATE INDEX IF NOT EXISTS idx_users_agent_id ON "public"."users"(agent_id);

-- Mostrar información de la tabla actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'users'
ORDER BY ordinal_position;
