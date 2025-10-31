/**
 * Verificación Rápida del Sistema
 * Identifica problemas comunes
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 ===== VERIFICACIÓN DEL SISTEMA =====\n');

async function verificar() {
  let errores = [];
  
  // 1. Variables de entorno
  console.log('📋 1. Variables de entorno...');
  
  const vars = {
    'ELEVENLABS_API_KEY': process.env.ELEVENLABS_API_KEY,
    'TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID,
    'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN,
    'TWILIO_WHATSAPP_FROM': process.env.TWILIO_WHATSAPP_FROM,
    'DATABASE_URL': process.env.DATABASE_URL
  };
  
  Object.entries(vars).forEach(([key, value]) => {
    if (value) {
      console.log(`   ✅ ${key}`);
    } else {
      console.log(`   ❌ ${key} - FALTA`);
      errores.push(`Falta variable: ${key}`);
    }
  });
  console.log('');
  
  // 2. Base de datos
  console.log('📋 2. Conexión a base de datos...');
  
  try {
    const { query } = require('../src/config/database');
    await query('SELECT 1');
    console.log('   ✅ Conexión exitosa\n');
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}\n`);
    errores.push('Error de conexión a BD');
  }
  
  // 3. Tablas necesarias
  console.log('📋 3. Tablas de conversaciones...');
  
  try {
    const { query } = require('../src/config/database');
    
    const tables = ['conversation_state', 'conversation_messages'];
    
    for (const table of tables) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - NO EXISTE`);
        errores.push(`Falta tabla: ${table}`);
      }
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error verificando tablas: ${error.message}\n`);
  }
  
  // 4. Servicios
  console.log('📋 4. Servicios cargados...');
  
  try {
    const ConversationService = require('../src/services/conversationService');
    console.log('   ✅ ConversationService');
    
    const TwilioWhatsAppService = require('../src/services/twilioWhatsAppService');
    console.log('   ✅ TwilioWhatsAppService');
    
    const elevenlabsService = require('../src/agents/elevenlabsService');
    console.log('   ✅ ElevenLabsService');
    
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error cargando servicios: ${error.message}\n`);
    errores.push('Error cargando servicios');
  }
  
  // 5. Últimas llamadas
  console.log('📋 5. Últimas llamadas completadas...');
  
  try {
    const { query } = require('../src/config/database');
    
    // Verificar si existe la tabla call_records
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'call_records'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      const result = await query(`
        SELECT phone_number, status, conversation_id, call_ended_at
        FROM call_records
        WHERE status IN ('completed', 'finished', 'ended')
        ORDER BY call_ended_at DESC NULLS LAST
        LIMIT 5
      `);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${result.rows.length} llamadas encontradas:`);
        result.rows.forEach((row, i) => {
          console.log(`      ${i + 1}. ${row.phone_number} - ${row.status}`);
          console.log(`         Conv ID: ${row.conversation_id || 'N/A'}`);
          console.log(`         Terminó: ${row.call_ended_at || 'N/A'}`);
        });
      } else {
        console.log('   ⚠️  No hay llamadas completadas recientes');
      }
    } else {
      console.log('   ⚠️  Tabla call_records no existe');
    }
    console.log('');
  } catch (error) {
    console.log(`   ⚠️  Error consultando llamadas: ${error.message}\n`);
  }
  
  // 6. Conversaciones de WhatsApp
  console.log('📋 6. Conversaciones de WhatsApp...');
  
  try {
    const { query } = require('../src/config/database');
    
    const result = await query(`
      SELECT phone_number, client_name, status, started_at, message_count
      FROM conversation_state
      ORDER BY started_at DESC
      LIMIT 5
    `);
    
    if (result.rows.length > 0) {
      console.log(`   ✅ ${result.rows.length} conversaciones encontradas:`);
      result.rows.forEach((row, i) => {
        console.log(`      ${i + 1}. ${row.phone_number} - ${row.client_name || 'Sin nombre'}`);
        console.log(`         Estado: ${row.status}`);
        console.log(`         Mensajes: ${row.message_count || 0}`);
        console.log(`         Iniciada: ${row.started_at}`);
      });
    } else {
      console.log('   ⚠️  No hay conversaciones de WhatsApp');
      console.log('   Esto es normal si no se ha enviado ningún mensaje aún');
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error consultando conversaciones: ${error.message}\n`);
    errores.push('Error en tabla conversation_state');
  }
  
  // RESUMEN
  console.log('='.repeat(50));
  console.log('📊 RESUMEN');
  console.log('='.repeat(50));
  
  if (errores.length === 0) {
    console.log('✅ SISTEMA OPERATIVO - Todo configurado correctamente\n');
    console.log('🚀 Próximo paso: Ejecutar test de llamada');
    console.log('   node scripts/test-llamada-completa.js\n');
  } else {
    console.log(`❌ ${errores.length} ERRORES ENCONTRADOS:\n`);
    errores.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
    console.log('');
    
    if (errores.some(e => e.includes('conversation_state'))) {
      console.log('🔧 SOLUCIÓN: Crear tablas de conversaciones');
      console.log('   psql -U postgres -d iacalls_db -f database/add_conversation_tables.sql\n');
    }
  }
}

verificar().catch(error => {
  console.error('\n❌ Error crítico:', error);
  process.exit(1);
});

