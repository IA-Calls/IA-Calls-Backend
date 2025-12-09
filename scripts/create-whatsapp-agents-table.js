#!/usr/bin/env node

/**
 * Script para crear la tabla de agentes de WhatsApp
 */

require('dotenv').config();
const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function createTable() {
  try {
    console.log('📋 Creando tabla whatsapp_agents...');

    const sqlFile = path.join(__dirname, '../database/create_whatsapp_agents_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Ejecutar el SQL
    await query(sql);

    console.log('✅ Tabla whatsapp_agents creada exitosamente');
    console.log('✅ Columna agent_id agregada a la tabla conversations');

  } catch (error) {
    console.error('❌ Error creando tabla:', error.message);
    process.exit(1);
  }
}

createTable()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

