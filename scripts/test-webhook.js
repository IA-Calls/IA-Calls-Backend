#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testWebhook() {
  console.log('🧪 Probando webhook de ElevenLabs...\n');

  // Simular el payload que enviaría ElevenLabs
  const mockPayload = {
    conversation_id: 'conv_test123',
    agent_id: 'agent_4701k8fcsvhaes5s1h6tw894g98s',
    phone_number: '+573138539155',
    status: 'completed'
  };

  try {
    console.log('📤 Enviando webhook a /api/webhook/elevenlabs/conversation-complete');
    console.log('📊 Payload:', JSON.stringify(mockPayload, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/webhook/elevenlabs/conversation-complete`,
      mockPayload
    );

    console.log('\n✅ Webhook procesado exitosamente!');
    console.log('📊 Respuesta:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error en webhook:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testWebhookPing() {
  console.log('\n🏓 Probando webhook ping...\n');

  try {
    const response = await axios.get(`${API_BASE_URL}/webhook/ping`);
    console.log('✅ Ping exitoso!');
    console.log('📊 Respuesta:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error en ping:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  await testWebhookPing();
  await testWebhook();
}

runTests();

