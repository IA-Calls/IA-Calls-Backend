/**
 * Configuración de todas las tablas del sistema
 * Cuando se agregue una nueva tabla, agregarla aquí
 */

const path = require('path');

/**
 * Lista de todas las tablas del sistema con sus scripts SQL
 * Formato: { name: 'nombre_tabla', sqlFile: 'ruta_al_archivo.sql', dependencies: ['tabla1', 'tabla2'] }
 * 
 * IMPORTANTE: 
 * 1. Las tablas se crean en el orden especificado aquí (ordenadas automáticamente por dependencias)
 * 2. Si una tabla tiene dependencias (foreign keys), esas tablas deben aparecer ANTES
 * 3. Cuando agregues una nueva tabla:
 *    - Crea el archivo SQL en database/create_[nombre_tabla]_table.sql
 *    - Agrega la entrada aquí con el nombre, ruta y dependencias
 * 
 * ORDEN DE CREACIÓN (respetando dependencias):
 * 1. users (sin dependencias - tabla base)
 * 2. clients (sin dependencias)
 * 3. groups (depende de users)
 * 4. client_groups (depende de clients y groups)
 * 5. uploaded_files (depende de users y groups)
 * 6. gcp_documents (depende de users y groups)
 * 7. batch_calls (depende de users y groups)
 * 8. call_records (depende de batch_calls y clients)
 * 9. whatsapp_conversations (sin dependencias)
 * 10. whatsapp_agents (depende de users)
 * 11. agents (depende de users)
 * 12. conversations (depende de whatsapp_agents)
 * 13. data_sources (depende de users y whatsapp_agents)
 * 14. knowledge_items (depende de users y whatsapp_agents)
 * 15. facebook_page_tokens (depende de users)
 */
const DATABASE_TABLES = [
  // Tablas principales del sistema
  {
    name: 'users',
    sqlFile: path.join(__dirname, '../../database/create_users_table.sql'),
    description: 'Tabla de usuarios del sistema',
    dependencies: [] // Sin dependencias - tabla base
  },
  {
    name: 'clients',
    sqlFile: path.join(__dirname, '../../database/create_clients_table.sql'),
    description: 'Tabla de clientes del sistema',
    dependencies: [] // Sin dependencias
  },
  {
    name: 'groups',
    sqlFile: path.join(__dirname, '../../database/create_groups_table.sql'),
    description: 'Tabla de grupos de clientes',
    dependencies: ['users'] // Depende de users
  },
  {
    name: 'client_groups',
    sqlFile: path.join(__dirname, '../../database/create_client_groups_table.sql'),
    description: 'Relación muchos a muchos entre clientes y grupos',
    dependencies: ['clients', 'groups'] // Depende de clients y groups
  },
  {
    name: 'uploaded_files',
    sqlFile: path.join(__dirname, '../../database/create_uploaded_files_table.sql'),
    description: 'Tabla de archivos subidos al sistema',
    dependencies: ['users', 'groups'] // Depende de users y groups
  },
  {
    name: 'gcp_documents',
    sqlFile: path.join(__dirname, '../../database/create_gcp_documents_table.sql'),
    description: 'Tabla de documentos almacenados en GCP',
    dependencies: ['users', 'groups'] // Depende de users y groups
  },
  {
    name: 'batch_calls',
    sqlFile: path.join(__dirname, '../../database/create_batch_calls_table.sql'),
    description: 'Tabla de llamadas en lote de ElevenLabs',
    dependencies: ['users', 'groups'] // Depende de users y groups
  },
  {
    name: 'call_records',
    sqlFile: path.join(__dirname, '../../database/create_call_records_table.sql'),
    description: 'Tabla de registros individuales de llamadas',
    dependencies: ['batch_calls', 'clients'] // Depende de batch_calls y clients
  },
  {
    name: 'whatsapp_conversations',
    sqlFile: path.join(__dirname, '../../database/create_whatsapp_conversations_table.sql'),
    description: 'Tabla de conversaciones de WhatsApp',
    dependencies: [] // Sin dependencias
  },
  // Tablas de agentes y configuración
  {
    name: 'whatsapp_agents',
    sqlFile: path.join(__dirname, '../../database/create_whatsapp_agents_table.sql'),
    description: 'Tabla de agentes de WhatsApp',
    dependencies: ['users'] // Depende de users
  },
  {
    name: 'agents',
    sqlFile: path.join(__dirname, '../../database/create_agents_table.sql'),
    description: 'Tabla de agentes de ElevenLabs',
    dependencies: ['users'] // Depende de users
  },
  {
    name: 'conversations',
    sqlFile: path.join(__dirname, '../../database/create_conversations_table.sql'),
    description: 'Tabla de conversaciones de WhatsApp',
    dependencies: ['whatsapp_agents'] // Depende de whatsapp_agents
  },
  {
    name: 'data_sources',
    sqlFile: path.join(__dirname, '../../database/create_data_sources_table.sql'),
    description: 'Tabla de fuentes de información para agentes',
    dependencies: ['users', 'whatsapp_agents'] // Depende de users y whatsapp_agents
  },
  {
    name: 'knowledge_items',
    sqlFile: path.join(__dirname, '../../database/create_knowledge_items_table.sql'),
    description: 'Tabla de elementos de conocimiento para agentes',
    dependencies: ['users', 'whatsapp_agents'] // Depende de users y whatsapp_agents
  },
  {
    name: 'facebook_page_tokens',
    sqlFile: path.join(__dirname, '../../database/create_facebook_page_tokens_table.sql'),
    description: 'Tabla de tokens de páginas de Facebook/Meta',
    dependencies: ['users'] // Depende de users
  }
];

/**
 * Obtener todas las tablas configuradas
 */
function getAllTables() {
  return DATABASE_TABLES;
}

/**
 * Obtener una tabla por nombre
 */
function getTableByName(tableName) {
  return DATABASE_TABLES.find(table => table.name === tableName);
}

/**
 * Agregar una nueva tabla a la configuración
 * Útil para extensibilidad
 */
function addTable(tableConfig) {
  if (!tableConfig.name || !tableConfig.sqlFile) {
    throw new Error('La configuración de tabla debe incluir "name" y "sqlFile"');
  }
  
  DATABASE_TABLES.push({
    name: tableConfig.name,
    sqlFile: tableConfig.sqlFile,
    description: tableConfig.description || `Tabla ${tableConfig.name}`
  });
}

module.exports = {
  getAllTables,
  getTableByName,
  addTable,
  DATABASE_TABLES
};

