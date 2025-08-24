const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando migración para agregar campo agent_id...');

// Función para verificar si una columna existe en PostgreSQL
async function columnExists(tableName, columnName) {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      );
    `, [tableName, columnName]);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error verificando columna:', error);
    return false;
  }
}

// Función para obtener información de columnas de una tabla
async function getTableInfo(tableName) {
  try {
    const result = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo información de tabla:', error);
    return [];
  }
}

// Función para obtener índices de una tabla
async function getTableIndexes(tableName) {
  try {
    const result = await query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = $1;
    `, [tableName]);
    
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo índices:', error);
    return [];
  }
}

async function executeMigration() {
  try {
    // 1. Verificar si la tabla users existe
    console.log('\n1. Verificando estructura de la tabla users...');
    const tableInfo = await getTableInfo('users');
    
    if (tableInfo.length === 0) {
      console.log('❌ La tabla users no existe');
      process.exit(1);
    }
    
    console.log('✅ Tabla users encontrada');
    console.log('📋 Columnas actuales:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // 2. Verificar si la columna agent_id ya existe
    const agentIdExists = await columnExists('users', 'agent_id');
    
    if (agentIdExists) {
      console.log('\n⚠️ La columna agent_id ya existe en la tabla users');
      console.log('✅ No es necesario ejecutar la migración');
      return;
    }

    // 3. Agregar la columna agent_id
    console.log('\n2. Agregando columna agent_id...');
    await query('ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255)');
    console.log('✅ Columna agent_id agregada exitosamente');

    // 4. Agregar comentario para documentar el campo
    console.log('\n3. Agregando comentario a la columna...');
    await query('COMMENT ON COLUMN "public"."users".agent_id IS \'ID del agente conversacional de ElevenLabs asociado al usuario\'');
    console.log('✅ Comentario agregado exitosamente');

    // 5. Crear índice para la columna agent_id
    console.log('\n4. Creando índice para agent_id...');
    await query('CREATE INDEX IF NOT EXISTS idx_users_agent_id ON "public"."users"(agent_id)');
    console.log('✅ Índice creado exitosamente');

    // 6. Verificar la migración
    console.log('\n5. Verificando migración...');
    const agentIdExistsAfter = await columnExists('users', 'agent_id');
    
    if (agentIdExistsAfter) {
      console.log('✅ Migración completada exitosamente');
      console.log('📋 Nueva columna: agent_id (VARCHAR(255)) 🆕');
    } else {
      console.log('❌ Error: La columna agent_id no se agregó correctamente');
      process.exit(1);
    }

    // 7. Mostrar estructura final
    console.log('\n📊 Estructura final de la tabla users:');
    const updatedTableInfo = await getTableInfo('users');
    updatedTableInfo.forEach(col => {
      const isNew = col.column_name === 'agent_id' ? ' 🆕' : '';
      console.log(`   - ${col.column_name} (${col.data_type})${isNew}`);
    });

    // 8. Mostrar índices
    console.log('\n📊 Índices de la tabla users:');
    const indexes = await getTableIndexes('users');
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('🔍 Detalles del error:', error);
    process.exit(1);
  }
}

// Ejecutar migración
async function runMigration() {
  try {
    await executeMigration();
    console.log('\n🎉 Migración completada exitosamente');
    console.log('📋 Resumen de cambios:');
    console.log('   ✅ Columna agent_id agregada a la tabla users');
    console.log('   ✅ Índice idx_users_agent_id creado');
    console.log('   ✅ Comentario de documentación agregado');
    console.log('\n💡 Ahora puedes usar el campo agent_id para almacenar IDs de agentes de ElevenLabs');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
runMigration();
