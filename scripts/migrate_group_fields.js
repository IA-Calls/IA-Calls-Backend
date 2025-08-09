#!/usr/bin/env node

const { connectDB, query, closeDB } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

const main = async () => {
  console.log('🚀 Iniciando migración de campos de grupos...');
  
  try {
    // Conectar a la base de datos
    const connected = await connectDB();
    if (!connected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // Leer y ejecutar el script de migración de campos
    const migrationPath = path.join(__dirname, 'add_group_fields.sql');
    if (fs.existsSync(migrationPath)) {
      console.log('📊 Ejecutando migración de campos prompt y favorite...');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await query(migrationSQL);
      console.log('✅ Migración de campos completada');
    } else {
      console.log('⚠️ Archivo de migración no encontrado');
    }

    // Verificar que los campos se agregaron correctamente
    const columnsResult = await query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'groups' 
      AND column_name IN ('prompt', 'favorite')
      ORDER BY column_name;
    `);

    if (columnsResult.rows.length > 0) {
      console.log('✅ Campos agregados exitosamente:');
      columnsResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('⚠️ No se encontraron los campos esperados');
    }

    // Mostrar estructura actual de la tabla
    const tableStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'groups'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Estructura actual de la tabla groups:');
    tableStructure.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('🎉 Migración de campos de grupos completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('🔍 Detalles:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión
    await closeDB();
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = main; 