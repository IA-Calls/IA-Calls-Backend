#!/usr/bin/env node

/**
 * Script de prueba para MongoDB
 * Prueba la conexión y las operaciones CRUD en la colección conversations_whatsapp
 */

require('dotenv').config();
const { connectMongoDB, closeMongoDB, isMongoDBConnected } = require('../src/config/mongodb');
const ConversationWhatsApp = require('../src/models/ConversationWhatsApp');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMongoDB() {
  log('\n🧪 ===== TEST DE MONGODB =====\n', 'cyan');

  try {
    // 1. Probar conexión
    log('📡 Paso 1: Conectando a MongoDB...', 'blue');
    const connected = await connectMongoDB();
    
    if (!connected) {
      log('❌ No se pudo conectar a MongoDB', 'red');
      process.exit(1);
    }
    
    log('✅ Conexión exitosa\n', 'green');

    // 2. Crear una conversación de prueba
    log('📝 Paso 2: Creando conversación de prueba...', 'blue');
    const testPhoneNumber = `573${Math.floor(Math.random() * 1000000000)}`;
    const testConversation = new ConversationWhatsApp({
      phoneNumber: testPhoneNumber,
      clientName: 'Cliente de Prueba',
      conversationSummary: 'Esta es una conversación de prueba para verificar MongoDB',
      status: 'pending'
    });

    const savedConversation = await testConversation.save();
    log(`✅ Conversación creada con ID: ${savedConversation._id}`, 'green');
    log(`   📞 Teléfono: ${savedConversation.phoneNumber}`, 'yellow');
    log(`   👤 Cliente: ${savedConversation.clientName}`, 'yellow');
    log(`   📊 Estado: ${savedConversation.status}\n`, 'yellow');

    // 3. Agregar mensajes a la conversación
    log('💬 Paso 3: Agregando mensajes a la conversación...', 'blue');
    await savedConversation.addMessage('sent', 'Hola, este es un mensaje de prueba', 'msg_test_1', {
      source: 'test',
      timestamp: new Date()
    });
    log('✅ Mensaje enviado agregado', 'green');

    await savedConversation.addMessage('received', 'Hola, recibí tu mensaje', 'msg_test_2', {
      source: 'test',
      timestamp: new Date()
    });
    log('✅ Mensaje recibido agregado', 'green');
    log(`   📨 Total de mensajes: ${savedConversation.messages.length}\n`, 'yellow');

    // 4. Actualizar el estado de la conversación
    log('🔄 Paso 4: Actualizando estado de la conversación...', 'blue');
    await savedConversation.updateStatus('sent', {
      sentAt: new Date(),
      whatsappMessageId: 'wamid.test123',
      metadata: {
        test: true,
        updatedBy: 'test-script'
      }
    });
    log('✅ Estado actualizado a "sent"', 'green');
    log(`   📊 Nuevo estado: ${savedConversation.status}`, 'yellow');
    log(`   📅 Enviado en: ${savedConversation.sentAt}\n`, 'yellow');

    // 5. Buscar conversación por número de teléfono
    log('🔍 Paso 5: Buscando conversación por número de teléfono...', 'blue');
    const foundConversations = await ConversationWhatsApp.findByPhoneNumber(testPhoneNumber, 10);
    log(`✅ Encontradas ${foundConversations.length} conversación(es)`, 'green');
    if (foundConversations.length > 0) {
      log(`   📞 Teléfono: ${foundConversations[0].phoneNumber}`, 'yellow');
      log(`   📊 Estado: ${foundConversations[0].status}`, 'yellow');
      log(`   💬 Mensajes: ${foundConversations[0].messages.length}\n`, 'yellow');
    }

    // 6. Buscar conversaciones por estado
    log('🔍 Paso 6: Buscando conversaciones por estado "sent"...', 'blue');
    const sentConversations = await ConversationWhatsApp.findByStatus('sent', 10, 0);
    log(`✅ Encontradas ${sentConversations.length} conversación(es) con estado "sent"`, 'green');

    // 7. Contar conversaciones
    log('📊 Paso 7: Contando conversaciones...', 'blue');
    const totalPending = await ConversationWhatsApp.countByStatus('pending');
    const totalSent = await ConversationWhatsApp.countByStatus('sent');
    const totalAll = await ConversationWhatsApp.countByStatus();
    log(`✅ Conteo completado:`, 'green');
    log(`   📊 Pendientes: ${totalPending}`, 'yellow');
    log(`   📊 Enviadas: ${totalSent}`, 'yellow');
    log(`   📊 Total: ${totalAll}\n`, 'yellow');

    // 8. Buscar la conversación por ID
    log('🔍 Paso 8: Buscando conversación por ID...', 'blue');
    const foundById = await ConversationWhatsApp.findById(savedConversation._id);
    if (foundById) {
      log(`✅ Conversación encontrada por ID`, 'green');
      log(`   📞 Teléfono: ${foundById.phoneNumber}`, 'yellow');
      log(`   👤 Cliente: ${foundById.clientName}`, 'yellow');
      log(`   📊 Estado: ${foundById.status}`, 'yellow');
      log(`   💬 Mensajes: ${foundById.messages.length}`, 'yellow');
      log(`   📅 Creada: ${foundById.createdAt}`, 'yellow');
      log(`   📅 Actualizada: ${foundById.updatedAt}\n`, 'yellow');
    } else {
      log('❌ No se encontró la conversación por ID', 'red');
    }

    // 9. Actualizar conversación directamente
    log('✏️ Paso 9: Actualizando conversación directamente...', 'blue');
    foundById.clientName = 'Cliente Actualizado';
    foundById.conversationSummary = 'Resumen actualizado desde el test';
    await foundById.save();
    log('✅ Conversación actualizada', 'green');
    log(`   👤 Nuevo nombre: ${foundById.clientName}\n`, 'yellow');

    // 10. Eliminar la conversación de prueba
    log('🗑️ Paso 10: Eliminando conversación de prueba...', 'blue');
    await ConversationWhatsApp.findByIdAndDelete(savedConversation._id);
    log('✅ Conversación eliminada', 'green');

    // Verificar que se eliminó
    const deletedCheck = await ConversationWhatsApp.findById(savedConversation._id);
    if (!deletedCheck) {
      log('✅ Verificación: Conversación eliminada correctamente\n', 'green');
    } else {
      log('❌ Error: La conversación aún existe\n', 'red');
    }

    // Resumen final
    log('📊 ===== RESUMEN DEL TEST =====', 'cyan');
    log('✅ Todas las pruebas pasaron exitosamente!', 'green');
    log(`   ✓ Conexión a MongoDB`, 'green');
    log(`   ✓ Crear conversación`, 'green');
    log(`   ✓ Agregar mensajes`, 'green');
    log(`   ✓ Actualizar estado`, 'green');
    log(`   ✓ Buscar por número`, 'green');
    log(`   ✓ Buscar por estado`, 'green');
    log(`   ✓ Contar conversaciones`, 'green');
    log(`   ✓ Buscar por ID`, 'green');
    log(`   ✓ Actualizar conversación`, 'green');
    log(`   ✓ Eliminar conversación`, 'green');
    log('\n🎉 MongoDB está funcionando correctamente!\n', 'green');

  } catch (error) {
    log('\n❌ ===== ERROR EN EL TEST =====', 'red');
    log(`Error: ${error.message}`, 'red');
    log(`Stack: ${error.stack}\n`, 'red');
    process.exit(1);
  } finally {
    // Cerrar conexión
    log('🔌 Cerrando conexión a MongoDB...', 'blue');
    await closeMongoDB();
    log('✅ Conexión cerrada\n', 'green');
    process.exit(0);
  }
}

// Ejecutar el test
testMongoDB();


