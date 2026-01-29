/**
 * Script para configurar la base de datos local
 * Ejecuta el health check y crea todas las tablas necesarias
 */

require('dotenv').config();
const { connectDB, closeDB } = require('../src/config/database');
const { databaseHealthCheck } = require('../src/utils/databaseHealthCheck');

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de base de datos...');
  console.log('');
  
  try {
    // Conectar a la base de datos
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ No se pudo conectar a la base de datos');
      console.error('💡 Verifica que PostgreSQL esté corriendo y que DATABASE_LOCAL_URL esté configurado en .env');
      process.exit(1);
    }
    
    console.log('');
    
    // Ejecutar health check
    const result = await databaseHealthCheck();
    
    console.log('');
    
    if (result.success) {
      console.log('✅ Configuración de base de datos completada exitosamente');
      console.log('');
      console.log('📊 Resumen:');
      console.log(`   - Tablas verificadas: ${result.results?.checked || 0}`);
      console.log(`   - Tablas existentes: ${result.results?.existing || 0}`);
      console.log(`   - Tablas creadas: ${result.results?.created || 0}`);
      console.log(`   - Errores: ${result.results?.errors?.length || 0}`);
      
      if (result.results?.errors && result.results.errors.length > 0) {
        console.log('');
        console.log('⚠️ Errores encontrados:');
        result.results.errors.forEach(err => {
          console.log(`   - ${err.table}: ${err.error}`);
        });
      }
      
      process.exit(0);
    } else {
      console.error('❌ Error en la configuración de la base de datos');
      console.error(`   ${result.error || 'Error desconocido'}`);
      
      if (result.details) {
        console.error('');
        console.error('Detalles:', JSON.stringify(result.details, null, 2));
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await closeDB();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
