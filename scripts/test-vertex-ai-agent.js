/**
 * Script de prueba para Vertex AI Agent Builder
 * Ejecutar: node scripts/test-vertex-ai-agent.js
 */

require('dotenv').config();

async function testVertexAI() {
  console.log('🧪 ════════════════════════════════════════════');
  console.log('🧪 Prueba de Vertex AI Agent Builder');
  console.log('🧪 ════════════════════════════════════════════\n');

  // Verificar variables de entorno
  console.log('📋 Verificando configuración...\n');
  
  const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_PRIVATE_KEY',
    'GOOGLE_CLOUD_CLIENT_EMAIL'
  ];

  let missingVars = [];
  for (const varName of requiredEnvVars) {
    if (process.env[varName]) {
      console.log(`   ✓ ${varName}: ${varName.includes('KEY') ? '***configurado***' : process.env[varName]}`);
    } else {
      console.log(`   ✗ ${varName}: NO CONFIGURADO`);
      missingVars.push(varName);
    }
  }

  console.log(`\n   Ubicación: ${process.env.VERTEX_AI_LOCATION || 'us-central1'}`);
  console.log(`   Modelo: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);

  if (missingVars.length > 0) {
    console.error('\n❌ Faltan variables de entorno requeridas');
    process.exit(1);
  }

  console.log('\n✅ Configuración correcta\n');

  // Cargar el servicio
  console.log('🔌 Cargando servicio de Vertex AI...\n');
  const vertexAIService = require('../src/services/vertexAIDialogflowService');

  // Esperar un momento para la inicialización
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Prueba 1: Crear agente
  console.log('\n📝 Prueba 1: Crear agente');
  console.log('─────────────────────────');
  
  const agentResult = await vertexAIService.createAgent({
    displayName: 'Agente de Prueba',
    instructor: 'Eres un asistente virtual de prueba. Responde de forma breve y amable en español.',
    defaultLanguageCode: 'es'
  });

  if (agentResult.success) {
    console.log(`   ✅ Agente creado: ${agentResult.agent_id}`);
  } else {
    console.log(`   ❌ Error: ${agentResult.error}`);
    process.exit(1);
  }

  // Prueba 2: Enviar mensaje
  console.log('\n💬 Prueba 2: Enviar mensaje al agente');
  console.log('─────────────────────────────────────');
  
  const testMessages = [
    '¡Hola! ¿Quién eres?',
    '¿Qué puedes hacer?',
    'Gracias por tu ayuda'
  ];

  const sessionId = 'test_session_' + Date.now();
  const instructor = 'Eres un asistente virtual de prueba. Responde de forma breve y amable en español. Tu nombre es TestBot.';

  for (const message of testMessages) {
    console.log(`\n   📤 Usuario: "${message}"`);
    
    const response = await vertexAIService.sendMessage(
      agentResult.agent_id,
      sessionId,
      message,
      instructor,
      [] // Sin historial previo para esta prueba simple
    );

    if (response.success) {
      console.log(`   📥 Agente: "${response.response}"`);
    } else {
      console.log(`   ❌ Error: ${response.error}`);
    }

    // Pequeña pausa entre mensajes
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Prueba 3: Verificar sesión
  console.log('\n🔍 Prueba 3: Verificar info del agente');
  console.log('──────────────────────────────────────');
  
  const agentInfo = await vertexAIService.getAgent(agentResult.agent_id);
  console.log(`   Tipo: ${agentInfo.data.type}`);
  console.log(`   Modelo: ${agentInfo.data.model}`);
  console.log(`   Ubicación: ${agentInfo.data.location}`);

  // Limpiar sesión
  console.log('\n🧹 Limpiando sesión de prueba...');
  vertexAIService.clearSession(agentResult.agent_id, sessionId);

  console.log('\n🧪 ════════════════════════════════════════════');
  console.log('🧪 ✅ TODAS LAS PRUEBAS PASARON');
  console.log('🧪 ════════════════════════════════════════════\n');
  
  process.exit(0);
}

// Ejecutar prueba
testVertexAI().catch(error => {
  console.error('\n❌ Error en prueba:', error.message);
  process.exit(1);
});

