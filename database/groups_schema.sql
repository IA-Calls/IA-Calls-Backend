-- Schema para grupos y clientes
-- IA Calls Backend - Extensión para grupos

-- Tabla de grupos
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT, -- Campo para prompts personalizados
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color hex para UI
    favorite BOOLEAN DEFAULT false, -- Campo para marcar grupos como favoritos
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clientes (sincronizada o migrada del servicio externo)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255), -- ID del servicio externo (si aplica)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    category VARCHAR(100),
    review TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, converted, etc.
    metadata JSONB, -- Datos adicionales del servicio externo
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación muchos a muchos entre clientes y grupos
CREATE TABLE IF NOT EXISTS client_groups (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, group_id) -- Un cliente no puede estar duplicado en el mismo grupo
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_category ON clients(category);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

CREATE INDEX IF NOT EXISTS idx_client_groups_client_id ON client_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_client_groups_group_id ON client_groups(group_id);

-- Triggers para updated_at
CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON groups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo
INSERT INTO groups (name, description, color, created_by) 
VALUES 
    ('VIP Clientes', 'Clientes prioritarios con alta conversión', '#10B981', 1),
    ('Seguimiento Semanal', 'Clientes que requieren seguimiento regular', '#F59E0B', 1),
    ('Nuevos Prospectos', 'Clientes recién incorporados al sistema', '#3B82F6', 1)
ON CONFLICT DO NOTHING;

-- Comentarios
COMMENT ON TABLE groups IS 'Grupos para organizar y categorizar clientes';
COMMENT ON TABLE clients IS 'Tabla local de clientes sincronizada con servicio externo';
COMMENT ON TABLE client_groups IS 'Relación muchos a muchos entre clientes y grupos';

COMMENT ON COLUMN groups.color IS 'Color en formato hex para la UI (#RRGGBB)';
COMMENT ON COLUMN clients.external_id IS 'ID del cliente en el servicio externo para sincronización';
COMMENT ON COLUMN clients.metadata IS 'Datos adicionales del servicio externo en formato JSON'; 