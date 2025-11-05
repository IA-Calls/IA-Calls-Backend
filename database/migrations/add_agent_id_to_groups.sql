-- Migración: Agregar campo agent_id a la tabla groups
-- Fecha: 2025-11-02
-- Descripción: Permite asignar un agente existente directamente al crear un grupo

-- Agregar columna agent_id a la tabla groups
ALTER TABLE "public"."groups" 
ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);

-- Crear índice para búsquedas por agent_id
CREATE INDEX IF NOT EXISTS idx_groups_agent_id ON "public"."groups"(agent_id);

-- Comentario en la columna
COMMENT ON COLUMN "public"."groups"."agent_id" IS 'ID del agente de ElevenLabs asignado al grupo';


