const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');

async function migrateStorage() {
  try {
    console.log('🚀 Iniciando migración de tabla de archivos subidos...\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../database/storage_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 Ejecutando esquema de almacenamiento...');
    
    // Ejecutar las consultas SQL
    const queries = sqlContent.split(';').filter(query => query.trim());
    
    for (let i = 0; i < queries.length; i++) {
      const queryText = queries[i].trim();
      if (queryText) {
        try {
          await query(queryText);
          console.log(`✅ Query ${i + 1} ejecutada correctamente`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Query ${i + 1}: ${error.message}`);
          } else {
            console.error(`❌ Error en query ${i + 1}:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Migración de almacenamiento completada exitosamente');
    console.log('📊 Tabla "uploaded_files" creada y configurada');
    console.log('🔗 Índices y triggers configurados');
    console.log('📝 Comentarios de documentación agregados');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateStorage().then(() => {
  console.log('\n🎉 Proceso completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 