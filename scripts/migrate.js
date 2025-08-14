const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    
    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, 'add_language_and_variables_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Ejecutando migración...');
    
    // Ejecutar la migración
    await query(migrationSQL);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📋 Campos agregados:');
    console.log('   - idioma (VARCHAR(10), default: "es")');
    console.log('   - variables (JSONB, default: "{}")');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  }
}

// Ejecutar la migración
runMigration();
