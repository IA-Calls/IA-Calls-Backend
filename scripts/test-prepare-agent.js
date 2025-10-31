#!/usr/bin/env node

const axios = require('axios');

async function testPrepareAgent() {
  console.log('🧪 Probando prepareAgent para grupo...\n');

  try {
    // Primero hacer login para obtener el token
    console.log('1. 🔐 Haciendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login exitoso, token obtenido');

    // Preparar agente para el grupo ID 10
    console.log('\n2. 🤖 Preparando agente para grupo ID 10...');
    const prepareResponse = await axios.post('http://localhost:5000/api/groups/10/prepare-agent', {
      userId: 5
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Agente preparado exitosamente!');
    console.log('📊 Respuesta:', JSON.stringify(prepareResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error preparando agente:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPrepareAgent();
