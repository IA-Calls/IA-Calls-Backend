-- Script para agregar campos prompt y favorite a la tabla groups
-- Ejecutar este script si la tabla ya existe

-- Agregar campo prompt
ALTER TABLE "public"."groups" 
ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Agregar campo favorite
ALTER TABLE "public"."groups" 
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false;

-- Actualizar registros existentes para establecer valores por defecto
UPDATE "public"."groups" 
SET favorite = false 
WHERE favorite IS NULL;

-- Verificar que los campos se agregaron correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'groups' 
AND column_name IN ('prompt', 'favorite')
ORDER BY column_name; 