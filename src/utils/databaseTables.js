/**
 * Configuración de todas las tablas del sistema
 * Cuando se agregue una nueva tabla, agregarla aquí
 */

const path = require('path');

/**
 * Lista de todas las tablas del sistema con sus scripts SQL
 * Formato: { name: 'nombre_tabla', sqlFile: 'ruta_al_archivo.sql' }
 * 
 * IMPORTANTE: Cuando agregues una nueva tabla:
 * 1. Crea el archivo SQL en database/create_[nombre_tabla]_table.sql
 * 2. Agrega la entrada aquí con el nombre de la tabla y la ruta al archivo SQL
 */
const DATABASE_TABLES = [
  {
    name: 'whatsapp_agents',
    sqlFile: path.join(__dirname, '../../database/create_whatsapp_agents_table.sql'),
    description: 'Tabla de agentes de WhatsApp'
  },
  {
    name: 'agents',
    sqlFile: path.join(__dirname, '../../database/create_agents_table.sql'),
    description: 'Tabla de agentes de ElevenLabs'
  },
  {
    name: 'conversations',
    sqlFile: path.join(__dirname, '../../database/create_conversations_table.sql'),
    description: 'Tabla de conversaciones de WhatsApp'
  },
  {
    name: 'data_sources',
    sqlFile: path.join(__dirname, '../../database/create_data_sources_table.sql'),
    description: 'Tabla de fuentes de información para agentes'
  },
  {
    name: 'knowledge_items',
    sqlFile: path.join(__dirname, '../../database/create_knowledge_items_table.sql'),
    description: 'Tabla de elementos de conocimiento para agentes'
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

