const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function migrateTimeField() {
  try {
    console.log('🚀 Iniciando migración para agregar campo time a la tabla users...');
    
    // Leer el script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'add_time_field.sql'), 
      'utf8'
    );
    
    // Ejecutar el script SQL
    console.log('📝 Ejecutando script SQL...');
    await query(sqlScript);
    
    console.log('✅ Campo time agregado exitosamente a la tabla users');
    console.log('✅ Índice creado para optimizar consultas por fecha límite');
    console.log('✅ Función deactivar usuarios expirados creada');
    
    // Verificar que el campo se agregó correctamente
    const checkResult = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'time'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('🔍 Verificación exitosa:');
      console.log(`   - Campo: ${checkResult.rows[0].column_name}`);
      console.log(`   - Tipo: ${checkResult.rows[0].data_type}`);
      console.log(`   - Nullable: ${checkResult.rows[0].is_nullable}`);
    }
    
    console.log('\n🎉 Migración completada exitosamente!');
    console.log('\n📋 Funcionalidades agregadas:');
    console.log('   - Campo time (deadline) opcional para usuarios');
    console.log('   - Desactivación automática cuando llegue la fecha límite');
    console.log('   - Métodos para verificar expiración de usuarios');
    console.log('   - Filtrado de usuarios por estado de expiración');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  }
}

// Ejecutar la migración si se llama directamente
if (require.main === module) {
  migrateTimeField()
    .then(() => {
      console.log('\n✨ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateTimeField };
