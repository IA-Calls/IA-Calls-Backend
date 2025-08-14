-- Script para agregar campos idioma y variables a la tabla groups
-- Ejecutar este script si la tabla ya existe

-- Agregar campo idioma (VARCHAR para código de idioma como 'es', 'en', 'fr', etc.)
ALTER TABLE "public"."groups" 
ADD COLUMN IF NOT EXISTS idioma VARCHAR(10) DEFAULT 'es';

-- Agregar campo variables (JSONB para almacenar variables dinámicas)
ALTER TABLE "public"."groups" 
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';

-- Actualizar registros existentes para establecer valores por defecto
UPDATE "public"."groups" 
SET idioma = 'es' 
WHERE idioma IS NULL;

UPDATE "public"."groups" 
SET variables = '{}' 
WHERE variables IS NULL;

-- Verificar que los campos se agregaron correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'groups' 
AND column_name IN ('idioma', 'variables')
ORDER BY column_name;

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN "public"."groups".idioma IS 'Código de idioma para el grupo (es, en, fr, etc.)';
COMMENT ON COLUMN "public"."groups".variables IS 'Variables dinámicas del grupo en formato JSON';
