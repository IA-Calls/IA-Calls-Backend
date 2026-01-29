-- ============================================
-- TABLA: client_groups
-- Relación muchos a muchos entre clients y groups
-- ============================================

CREATE TABLE IF NOT EXISTS client_groups (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, group_id)  -- Un cliente no puede estar en el mismo grupo más de una vez
);

-- Índices para client_groups
CREATE INDEX IF NOT EXISTS idx_client_groups_client_id ON client_groups(client_id);
CREATE INDEX IF NOT EXISTS idx_client_groups_group_id ON client_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_client_groups_assigned_by ON client_groups(assigned_by);

-- Comentarios
COMMENT ON TABLE client_groups IS 'Relación muchos a muchos entre clientes y grupos';
