/**
 * Script para crear la tabla facebook_page_tokens
 * Ejecutar: node scripts/create-facebook-page-tokens-table.js
 */

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function createFacebookPageTokensTable() {
  try {
    console.log('🔄 Iniciando creación de tabla facebook_page_tokens...');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../database/create_facebook_page_tokens_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Ejecutar el SQL
    await pool.query(sql);
    
    console.log('✅ Tabla facebook_page_tokens creada exitosamente');
    
    // Verificar que la tabla existe
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'facebook_page_tokens'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Verificación exitosa: tabla facebook_page_tokens existe');
      
      // Mostrar estructura de la tabla
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'facebook_page_tokens'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📊 Estructura de la tabla:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    } else {
      console.log('❌ Error: la tabla no se creó correctamente');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando tabla facebook_page_tokens:', error.message);
    
    // Si la tabla ya existe, no es un error crítico
    if (error.message.includes('already exists')) {
      console.log('ℹ️  La tabla facebook_page_tokens ya existe');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// Ejecutar
createFacebookPageTokensTable();

