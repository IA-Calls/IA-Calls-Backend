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
 * 1. Las tablas se crean en el orden especificado aquí
 * 2. Si una tabla tiene dependencias (foreign keys), esas tablas deben aparecer ANTES
 * 3. Cuando agregues una nueva tabla:
 *    - Crea el archivo SQL en database/create_[nombre_tabla]_table.sql
 *    - Agrega la entrada aquí con el nombre, ruta y dependencias
 * 
 * ORDEN DE CREACIÓN (respetando dependencias):
 * 1. users (si existe, se crea primero)
 * 2. whatsapp_agents (depende de users)
 * 3. agents (depende de users)
 * 4. conversations (depende de whatsapp_agents)
 * 5. data_sources (depende de users y whatsapp_agents)
 * 6. knowledge_items (depende de users y whatsapp_agents)
 */
const DATABASE_TABLES = [
  {
    name: 'whatsapp_agents',
    sqlFile: path.join(__dirname, '../../database/create_whatsapp_agents_table.sql'),
    description: 'Tabla de agentes de WhatsApp',
    dependencies: ['users'] // Depende de users (si existe)
  },
  {
    name: 'agents',
    sqlFile: path.join(__dirname, '../../database/create_agents_table.sql'),
    description: 'Tabla de agentes de ElevenLabs',
    dependencies: ['users'] // Depende de users (si existe)
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

