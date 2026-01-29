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
 * Maneja dependencias faltantes de forma más inteligente
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
    
    // Limpiar el SQL: remover comentarios de bloque y líneas vacías
    let cleanSQL = sql
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque /* */
      .split('\n')
      .map(line => {
        // Remover comentarios de línea que no están dentro de strings
        const commentIndex = line.indexOf('--');
        if (commentIndex !== -1) {
          const beforeComment = line.substring(0, commentIndex);
          // Verificar si hay un número impar de comillas antes del comentario
          const singleQuotes = (beforeComment.match(/'/g) || []).length;
          const doubleQuotes = (beforeComment.match(/"/g) || []).length;
          if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
            return beforeComment.trim();
          }
        }
        return line.trim();
      })
      .filter(line => line.length > 0 && !line.startsWith('--'))
      .join('\n');
    
    // Dividir por punto y coma, pero respetar strings y funciones
    const statements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let parenDepth = 0;
    
    for (let i = 0; i < cleanSQL.length; i++) {
      const char = cleanSQL[i];
      const nextChar = cleanSQL[i + 1];
      
      // Manejar strings
      if ((char === "'" || char === '"') && (i === 0 || cleanSQL[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      // Contar paréntesis (para funciones y expresiones)
      if (!inString) {
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
      }
      
      currentStatement += char;
      
      // Si encontramos un punto y coma fuera de string y sin paréntesis abiertos
      if (!inString && parenDepth === 0 && char === ';') {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    // Agregar el último statement si no terminó con ;
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // Ejecutar cada statement individualmente
    let lastError = null;
    let successCount = 0;
    let tableCreated = false;
    const errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      try {
        await query(statement);
        successCount++;
        
        // Verificar si se creó la tabla principal
        if (statement.toUpperCase().includes('CREATE TABLE') || 
            statement.toUpperCase().includes('CREATE TABLE IF NOT EXISTS')) {
          tableCreated = true;
        }
      } catch (stmtError) {
        const errorMsg = stmtError.message || stmtError.toString();
        
        // Si es un error de "ya existe", no es crítico
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('duplicate') ||
            errorMsg.includes('already defined')) {
          // Verificar si es la tabla principal
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            tableCreated = true;
          }
          continue; // Continuar sin error
        }
        
        // Si es un error de dependencia faltante, puede ser normal si las dependencias se crearán después
        if (errorMsg.includes('does not exist')) {
          const dependencyName = extractDependencyName(stmtError);
          if (dependencyName && dependencyName !== tableName) {
            // Verificar si la dependencia existe
            const depExists = await tableExists(dependencyName);
            if (!depExists) {
              console.warn(`   ⚠️ Statement ${i + 1}/${statements.length} requiere "${dependencyName}" (se creará después)`);
              errors.push({
                statement: i + 1,
                error: `Dependencia faltante: ${dependencyName}`,
                canRetry: true
              });
              continue;
            }
          }
        }
        
        // Si la tabla ya fue creada, los errores en statements secundarios son menos críticos
        if (tableCreated) {
          // Errores en índices, triggers, etc. no son críticos si la tabla existe
          if (errorMsg.includes('index') || 
              errorMsg.includes('trigger') || 
              errorMsg.includes('function') ||
              errorMsg.includes('constraint')) {
            console.warn(`   ⚠️ Error en statement secundario ${i + 1}/${statements.length}: ${errorMsg.substring(0, 100)}`);
            continue;
          }
        }
        
        // Otros errores
        console.error(`   ❌ Error en statement ${i + 1}/${statements.length}: ${errorMsg.substring(0, 150)}`);
        errors.push({
          statement: i + 1,
          error: errorMsg,
          canRetry: false
        });
        lastError = stmtError;
      }
    }
    
    // Verificar si la tabla fue creada exitosamente
    const tableExistsNow = await tableExists(tableName);
    
    if (tableExistsNow || tableCreated) {
      if (errors.length > 0) {
        console.log(`✅ Tabla "${tableName}" creada con ${errors.length} advertencias`);
      } else {
        console.log(`✅ Tabla "${tableName}" creada exitosamente`);
      }
      return {
        success: true,
        message: `Tabla "${tableName}" creada exitosamente`,
        warnings: errors.length > 0 ? errors.map(e => e.error) : []
      };
    }
    
    // Si no se creó, intentar ejecutar el SQL completo como último recurso
    if (!tableExistsNow) {
      try {
        await query(sql);
        const finalCheck = await tableExists(tableName);
        if (finalCheck) {
          console.log(`✅ Tabla "${tableName}" creada exitosamente (método completo)`);
          return {
            success: true,
            message: `Tabla "${tableName}" creada exitosamente`
          };
        }
      } catch (queryError) {
        const errorMsg = queryError.message || queryError.toString();
        
        // Si es un error de "ya existe", verificar
        if (errorMsg.includes('already exists')) {
          const exists = await tableExists(tableName);
          if (exists) {
            return {
              success: true,
              message: `Tabla "${tableName}" ya existe`,
              alreadyExists: true
            };
          }
        }
        
        throw queryError;
      }
    }
    
    // Si llegamos aquí, no se pudo crear
    throw new Error(`No se pudo crear la tabla "${tableName}" después de todos los intentos`);
    
  } catch (error) {
    // Si la tabla ya existe, no es un error crítico
    const exists = await tableExists(tableName);
    if (exists) {
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
 * Extraer el nombre de la dependencia del mensaje de error
 */
function extractDependencyName(errorMessage) {
  const message = typeof errorMessage === 'string' ? errorMessage : (errorMessage?.message || '');
  const match = message.match(/relation "([^"]+)" does not exist/);
  return match ? match[1] : null;
}

/**
 * Ordenar tablas según sus dependencias
 * Usa ordenamiento topológico para respetar las dependencias
 */
function sortTablesByDependencies(tables) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(table) {
    if (visiting.has(table.name)) {
      // Dependencia circular detectada, pero continuamos
      console.warn(`⚠️ Dependencia circular detectada para "${table.name}"`);
      return;
    }
    
    if (visited.has(table.name)) {
      return;
    }

    visiting.add(table.name);

    // Visitar dependencias primero
    if (table.dependencies && table.dependencies.length > 0) {
      for (const depName of table.dependencies) {
        const depTable = tables.find(t => t.name === depName);
        if (depTable && !visited.has(depName)) {
          visit(depTable);
        }
      }
    }

    visiting.delete(table.name);
    visited.add(table.name);
    sorted.push(table);
  }

  for (const table of tables) {
    if (!visited.has(table.name)) {
      visit(table);
    }
  }

  return sorted;
}

/**
 * Verificar y crear todas las tablas necesarias
 */
async function verifyAndCreateAllTables() {
  console.log('🔍 Verificando tablas de la base de datos...');
  console.log('');
  
  let tables = databaseTables.getAllTables();
  
  // Ordenar tablas según dependencias
  tables = sortTablesByDependencies(tables);
  
  console.log('📋 Orden de creación de tablas (respetando dependencias):');
  tables.forEach((table, index) => {
    const deps = table.dependencies && table.dependencies.length > 0 
      ? ` (depende de: ${table.dependencies.join(', ')})` 
      : '';
    console.log(`   ${index + 1}. ${table.name}${deps}`);
  });
  console.log('');
  
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
        
        // Verificar que las dependencias existan
        const missingDeps = [];
        if (table.dependencies && table.dependencies.length > 0) {
          for (const dep of table.dependencies) {
            const depExists = await tableExists(dep);
            if (!depExists) {
              missingDeps.push(dep);
            }
          }
        }
        
        if (missingDeps.length > 0) {
          console.warn(`   ⚠️ Dependencias faltantes: ${missingDeps.join(', ')}`);
          console.warn(`   Intentando crear de todas formas (las dependencias pueden crearse después)...`);
        }
        
        const createResult = await createTableFromSQL(table.name, table.sqlFile);
        
        if (createResult.success) {
          if (!createResult.alreadyExists) {
            results.created++;
            // Mostrar advertencias si las hay
            if (createResult.warnings && createResult.warnings.length > 0) {
              createResult.warnings.forEach(warning => {
                console.warn(`   ⚠️ Advertencia: ${warning}`);
              });
            }
          } else {
            results.existing++;
          }
        } else {
          results.errors.push({
            table: table.name,
            error: createResult.error
          });
          console.error(`❌ No se pudo crear la tabla "${table.name}": ${createResult.error}`);
        }
      }
    } catch (error) {
      results.errors.push({
        table: table.name,
        error: error.message
      });
      console.error(`❌ Error verificando tabla "${table.name}":`, error.message);
    }
    
    // Pequeña pausa para evitar sobrecargar la base de datos
    await new Promise(resolve => setTimeout(resolve, 50));
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
  
  // Considerar éxito si al menos se crearon algunas tablas o todas ya existían
  // Solo fallar si hay errores críticos y ninguna tabla fue creada
  const hasSuccess = results.created > 0 || results.existing > 0;
  const success = results.errors.length === 0 || (hasSuccess && results.errors.length < results.checked);
  
  return {
    success,
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

