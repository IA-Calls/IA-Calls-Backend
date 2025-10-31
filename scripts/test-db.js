#!/usr/bin/env node

const { connectDB, query } = require('../src/config/database');

// Configurar contraseña para comandos de PostgreSQL
process.env.PGPASSWORD = 'moon@1014198153';

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...\n');
  
  try {
    // Probar conexión básica
    const connected = await connectDB();
    
    if (!connected) {
      console.log('❌ No se pudo conectar a la base de datos');
      process.exit(1);
    }
    
    console.log('\n📊 Probando consultas básicas...');
    
    // Verificar tablas existentes
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Verificar usuarios
    const usersResult = await query('SELECT COUNT(*) as count FROM "public"."users"');
    console.log(`\n👥 Usuarios en la base de datos: ${usersResult.rows[0].count}`);
    
    // Verificar clientes
    const clientsResult = await query('SELECT COUNT(*) as count FROM "public"."clients"');
    console.log(`👤 Clientes en la base de datos: ${clientsResult.rows[0].count}`);
    
    // Verificar grupos
    const groupsResult = await query('SELECT COUNT(*) as count FROM "public"."groups"');
    console.log(`👥 Grupos en la base de datos: ${groupsResult.rows[0].count}`);
    
    console.log('\n✅ ¡Todas las pruebas pasaron exitosamente!');
    console.log('🚀 La base de datos está lista para usar');
    
  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    console.error('\n💡 Posibles soluciones:');
    console.error('   1. Verifica que PostgreSQL esté ejecutándose');
    console.error('   2. Ejecuta: npm run setup');
    console.error('   3. Verifica las credenciales en .env');
    process.exit(1);
  }
}

// Ejecutar pruebas
testConnection();
