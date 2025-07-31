#!/usr/bin/env node

const { connectDB, query, closeDB } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

const main = async () => {
  console.log('🚀 Iniciando migración de base de datos...');
  
  try {
    // Conectar a la base de datos
    const connected = await connectDB();
    if (!connected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // Leer y ejecutar el script de grupos
    const groupsSchemaPath = path.join(__dirname, '../database/groups_schema.sql');
    if (fs.existsSync(groupsSchemaPath)) {
      console.log('📊 Ejecutando migración de grupos y clientes...');
      const groupsSchema = fs.readFileSync(groupsSchemaPath, 'utf8');
      await query(groupsSchema);
      console.log('✅ Migración de grupos y clientes completada');
    } else {
      console.log('⚠️ Archivo de esquema de grupos no encontrado');
    }

    // Verificar tablas creadas
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('groups', 'clients', 'client_groups')
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length > 0) {
      console.log('✅ Tablas creadas exitosamente:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️ No se encontraron las tablas esperadas');
    }

    // Mostrar grupos de ejemplo
    const groupsResult = await query('SELECT id, name, description FROM groups ORDER BY id');
    if (groupsResult.rows.length > 0) {
      console.log('📋 Grupos de ejemplo creados:');
      groupsResult.rows.forEach(group => {
        console.log(`   - ${group.id}: ${group.name} - ${group.description}`);
      });
    }

    console.log('🎉 Migración completada exitosamente!');
    
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