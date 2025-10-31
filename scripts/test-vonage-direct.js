#!/usr/bin/env node

const axios = require('axios');

// Simular exactamente lo que hace nuestro servicio
async function testVonageDirectly() {
  console.log('🧪 Probando conexión directa con Vonage...\n');

  const apiKey = process.env.VENDOR_API_KEY || '1a44ecfa';
  const apiSecret = process.env.VENDOR_API_SECRET || 'OUHU8GfT3LpkwIJF';
  const fromNumber = process.env.NUMBER_API || '14157386102';
  const baseUrl = 'https://messages-sandbox.nexmo.com/v1/messages';

  console.log('🔑 Configuración:');
  console.log(`   API Key: ${apiKey}`);
  console.log(`   API Secret: ${apiSecret}`);
  console.log(`   From Number: ${fromNumber}`);
  console.log(`   Base URL: ${baseUrl}`);

  const payload = {
    from: fromNumber,
    to: '573138539155',
    message_type: 'text',
    text: 'Prueba directa con Vonage API',
    channel: 'whatsapp'
  };

  console.log('\n📤 Payload que se enviará:');
  console.log(JSON.stringify(payload, null, 2));

  const requestConfig = {
    auth: {
      username: apiKey,
      password: apiSecret
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000
  };

  console.log('\n🔐 Configuración de autenticación:');
  console.log(`   Username: ${apiKey}`);
  console.log(`   Password: ${apiSecret}`);

  try {
    console.log('\n📡 Enviando petición a Vonage...');
    const response = await axios.post(baseUrl, payload, requestConfig);
    
    console.log('✅ Respuesta exitosa:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error en la petición:');
    console.error('Status Code:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Full Error:', error.message);
  }
}

testVonageDirectly();

