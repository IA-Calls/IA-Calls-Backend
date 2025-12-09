/**
 * Verificación y creación automática de tablas al iniciar el backend
 * Verifica que todas las tablas necesarias existan y las crea si no existen
 */

const { query } = require('../config/database');
const fs = require('fs');
const databaseTables = require('./databaseTables');

/**
 * Verificar si una tabla existe en PostgreSQL
 */
async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    
    return result.rows[0].exists;
  } catch (error) {
    console.error(`❌ Error verificando existencia de tabla ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Crear una tabla desde un archivo SQL
 */
async function createTableFromSQL(tableName, sqlFilePath) {
  try {
    if (!fs.existsSync(sqlFilePath)) {
      console.warn(`⚠️ Archivo SQL no encontrado: ${sqlFilePath}`);
      return {
        success: false,
        error: `Archivo SQL no encontrado: ${sqlFilePath}`
      };
    }

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Ejecutar el SQL
    await query(sql);
    
    console.log(`✅ Tabla "${tableName}" creada exitosamente`);
    
    return {
      success: true,
      message: `Tabla "${tableName}" creada exitosamente`
    };
  } catch (error) {
    // Si la tabla ya existe, no es un error crítico
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`ℹ️ Tabla "${tableName}" ya existe`);
      return {
        success: true,
        message: `Tabla "${tableName}" ya existe`,
        alreadyExists: true
      };
    }
    
    console.error(`❌ Error creando tabla "${tableName}":`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verificar y crear todas las tablas necesarias
 */
async function verifyAndCreateAllTables() {
  console.log('🔍 Verificando tablas de la base de datos...');
  console.log('');
  
  const tables = databaseTables.getAllTables();
  const results = {
    checked: 0,
    created: 0,
    existing: 0,
    errors: []
  };

  for (const table of tables) {
    results.checked++;
    
    try {
      const exists = await tableExists(table.name);
      
      if (exists) {
        console.log(`✅ Tabla "${table.name}" existe`);
        results.existing++;
      } else {
        console.log(`⚠️ Tabla "${table.name}" no existe. Creando...`);
        
        const createResult = await createTableFromSQL(table.name, table.sqlFile);
        
        if (createResult.success) {
          if (!createResult.alreadyExists) {
            results.created++;
          } else {
            results.existing++;
          }
        } else {
          results.errors.push({
            table: table.name,
            error: createResult.error
          });
          console.error(`❌ No se pudo crear la tabla "${table.name}"`);
        }
      }
    } catch (error) {
      results.errors.push({
        table: table.name,
        error: error.message
      });
      console.error(`❌ Error verificando tabla "${table.name}":`, error.message);
    }
  }

  console.log('');
  console.log('📊 Resumen de verificación:');
  console.log(`   - Tablas verificadas: ${results.checked}`);
  console.log(`   - Tablas existentes: ${results.existing}`);
  console.log(`   - Tablas creadas: ${results.created}`);
  
  if (results.errors.length > 0) {
    console.log(`   - Errores: ${results.errors.length}`);
    console.log('');
    console.log('⚠️ Errores encontrados:');
    results.errors.forEach(err => {
      console.log(`   - ${err.table}: ${err.error}`);
    });
  } else {
    console.log(`   - Errores: 0`);
  }
  
  console.log('');
  
  return {
    success: results.errors.length === 0,
    results
  };
}

/**
 * Verificar conexión a la base de datos
 */
async function verifyDatabaseConnection() {
  try {
    await query('SELECT 1');
    return {
      success: true,
      message: 'Conexión a la base de datos exitosa'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Health check completo de la base de datos
 */
async function databaseHealthCheck() {
  console.log('🏥 Iniciando verificación de salud de la base de datos...');
  console.log('');
  
  // 1. Verificar conexión
  console.log('1️⃣ Verificando conexión a la base de datos...');
  const connectionCheck = await verifyDatabaseConnection();
  
  if (!connectionCheck.success) {
    console.error('❌ Error de conexión:', connectionCheck.error);
    return {
      success: false,
      error: 'No se pudo conectar a la base de datos',
      details: connectionCheck.error
    };
  }
  
  console.log('✅ Conexión exitosa');
  console.log('');
  
  // 2. Verificar y crear tablas
  console.log('2️⃣ Verificando tablas...');
  const tablesCheck = await verifyAndCreateAllTables();
  
  if (!tablesCheck.success) {
    console.error('⚠️ Algunas tablas no pudieron ser verificadas o creadas');
    return {
      success: false,
      error: 'Error verificando/creando tablas',
      details: tablesCheck.results
    };
  }
  
  console.log('');
  console.log('✅ Verificación de base de datos completada exitosamente');
  console.log('');
  
  return {
    success: true,
    message: 'Base de datos verificada y lista',
    results: tablesCheck.results
  };
}

module.exports = {
  verifyAndCreateAllTables,
  verifyDatabaseConnection,
  databaseHealthCheck,
  tableExists,
  createTableFromSQL
};

