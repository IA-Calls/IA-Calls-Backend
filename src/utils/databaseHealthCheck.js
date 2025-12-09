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
    
    // Dividir el SQL en statements individuales para mejor manejo de errores
    // Usar un método más robusto para dividir statements SQL
    const statements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      
      // Manejar comentarios
      if (!inString && char === '-' && nextChar === '-') {
        inComment = true;
        currentStatement += char;
        continue;
      }
      
      if (inComment) {
        currentStatement += char;
        if (char === '\n') {
          inComment = false;
        }
        continue;
      }
      
      // Manejar strings
      if ((char === "'" || char === '"') && !inString) {
        inString = true;
        stringChar = char;
        currentStatement += char;
        continue;
      }
      
      if (inString && char === stringChar) {
        inString = false;
        currentStatement += char;
        continue;
      }
      
      currentStatement += char;
      
      // Si encontramos un punto y coma fuera de string/comentario, es el fin de un statement
      if (!inString && !inComment && char === ';') {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('--')) {
          statements.push(trimmed);
        }
        currentStatement = '';
      }
    }
    
    // Agregar el último statement si no terminó con ;
    if (currentStatement.trim().length > 0 && !currentStatement.trim().startsWith('--')) {
      statements.push(currentStatement.trim());
    }
    
    // Ejecutar cada statement individualmente
    let lastError = null;
    let successCount = 0;
    let tableCreated = false;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      try {
        await query(statement);
        successCount++;
        
        // Verificar si se creó la tabla principal
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          tableCreated = true;
        }
      } catch (stmtError) {
        const errorMsg = stmtError.message || stmtError.toString();
        
        // Si es un error de dependencia faltante, continuar con el siguiente statement
        if (errorMsg.includes('does not exist') && !errorMsg.includes(tableName)) {
          const dependencyName = extractDependencyName(stmtError);
          if (dependencyName) {
            const depExists = await tableExists(dependencyName);
            if (!depExists) {
              console.warn(`   ⚠️ Saltando statement ${i + 1}/${statements.length} que requiere "${dependencyName}" (se ejecutará después)`);
              lastError = stmtError;
              continue; // Continuar con el siguiente statement
            }
          }
        }
        
        // Si es un error de "ya existe", no es crítico
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          console.log(`   ℹ️ Statement ${i + 1}/${statements.length} ya ejecutado (ya existe)`);
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            tableCreated = true;
          }
          continue;
        }
        
        // Si es un error de sintaxis y la tabla ya fue creada, puede ser un statement secundario
        if (tableCreated && errorMsg.includes('syntax error')) {
          console.warn(`   ⚠️ Error de sintaxis en statement secundario ${i + 1}/${statements.length}, continuando...`);
          lastError = stmtError;
          continue;
        }
        
        // Para otros errores, guardar pero continuar si la tabla ya fue creada
        if (tableCreated) {
          console.warn(`   ⚠️ Error en statement secundario ${i + 1}/${statements.length}: ${errorMsg.substring(0, 80)}`);
          lastError = stmtError;
          continue;
        }
        
        // Si la tabla no fue creada aún, este es un error crítico
        console.error(`   ❌ Error crítico en statement ${i + 1}/${statements.length}: ${errorMsg}`);
        lastError = stmtError;
      }
    }
    
    // Si se creó la tabla principal, considerar éxito
    if (tableCreated || successCount > 0) {
      console.log(`✅ Tabla "${tableName}" creada exitosamente (${successCount}/${statements.length} statements ejecutados)`);
      return {
        success: true,
        message: `Tabla "${tableName}" creada exitosamente`,
        warnings: lastError ? [lastError.message] : []
      };
    }
    
    // Si ningún statement tuvo éxito, intentar ejecutar el SQL completo como fallback
    try {
      await query(sql);
      console.log(`✅ Tabla "${tableName}" creada exitosamente (método fallback)`);
      
      return {
        success: true,
        message: `Tabla "${tableName}" creada exitosamente`
      };
    } catch (queryError) {
      // Si es un error de dependencia, intentar crear sin la foreign key primero
      const errorMsg = queryError.message || queryError.toString();
      if (errorMsg.includes('does not exist') && !errorMsg.includes(tableName)) {
        // Es una dependencia faltante
        const dependencyName = extractDependencyName(queryError);
        
        if (dependencyName) {
          console.warn(`⚠️ Dependencia "${dependencyName}" no existe para "${tableName}"`);
          
          // Verificar si la dependencia existe ahora
          const depExists = await tableExists(dependencyName);
          
          if (!depExists) {
            console.warn(`   La dependencia "${dependencyName}" no está en la lista de tablas a crear.`);
            console.warn(`   Creando "${tableName}" sin la foreign key (se puede agregar después).`);
            
            // Crear la tabla sin la foreign key problemática
            let modifiedSQL = sql;
            
            // Comentar las líneas con REFERENCES a la dependencia faltante
            // Patrón más robusto para encontrar y comentar foreign keys
            const refPatterns = [
              new RegExp(`(\\s+[^,\\n]+\\s+REFERENCES\\s+${dependencyName}\\s*\\([^)]+\\)[^;\\n]*)`, 'gi'),
              new RegExp(`(REFERENCES\\s+${dependencyName}\\s*\\([^)]+\\)[^;\\n]*)`, 'gi')
            ];
            
            for (const pattern of refPatterns) {
              modifiedSQL = modifiedSQL.replace(pattern, '-- $1 -- (FK comentada: tabla no existe)');
            }
            
            try {
              await query(modifiedSQL);
              console.log(`✅ Tabla "${tableName}" creada sin foreign key a "${dependencyName}"`);
              
              return {
                success: true,
                message: `Tabla "${tableName}" creada (sin foreign key a "${dependencyName}")`,
                missingDependency: dependencyName,
                warning: `Foreign key a "${dependencyName}" debe agregarse después`
              };
            } catch (retryError) {
              // Si aún falla, devolver el error original
              console.error(`❌ Error incluso sin foreign key:`, retryError.message);
              throw queryError;
            }
          } else {
            // La dependencia existe ahora, reintentar
            try {
              await query(sql);
              console.log(`✅ Tabla "${tableName}" creada exitosamente (reintento)`);
              return {
                success: true,
                message: `Tabla "${tableName}" creada exitosamente`
              };
            } catch (retryError) {
              throw queryError;
            }
          }
        } else {
          throw queryError;
        }
      } else {
        throw queryError;
      }
    }
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
        
        // Verificar que las dependencias existan (si no, intentar crear de todas formas)
        if (table.dependencies && table.dependencies.length > 0) {
          for (const dep of table.dependencies) {
            const depExists = await tableExists(dep);
            if (!depExists) {
              console.warn(`⚠️ Dependencia "${dep}" no existe para "${table.name}". Intentando crear de todas formas...`);
            }
          }
        }
        
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

