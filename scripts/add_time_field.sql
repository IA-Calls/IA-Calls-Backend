-- Script para agregar el campo time (deadline) a la tabla users
-- Este campo será opcional y permitirá establecer una fecha límite para la desactivación automática del usuario

-- Agregar el campo time a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS time TIMESTAMP WITH TIME ZONE;

-- Crear índice para optimizar consultas por fecha límite
CREATE INDEX IF NOT EXISTS idx_users_time ON users(time);

-- Crear función para desactivar usuarios automáticamente cuando llegue su deadline
CREATE OR REPLACE FUNCTION deactivate_expired_users()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET is_active = false, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE time IS NOT NULL 
      AND time <= CURRENT_TIMESTAMP 
      AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Crear un job programado (si tienes pg_cron instalado)
-- SELECT cron.schedule('deactivate-expired-users', '0 0 * * *', 'SELECT deactivate_expired_users();');

-- Comentario sobre el campo time
COMMENT ON COLUMN users.time IS 'Fecha límite opcional para la desactivación automática del usuario. Si se establece, el usuario será desactivado automáticamente cuando llegue esta fecha.';
