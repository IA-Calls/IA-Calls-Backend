#!/usr/bin/env node

const axios = require('axios');

async function testGetGroups() {
  console.log('🧪 Probando GET de grupos...\n');

  try {
    // Primero hacer login para obtener el token
    console.log('1. 🔐 Haciendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login exitoso, token obtenido');

    // Obtener grupos
    console.log('\n2. 📋 Obteniendo grupos...');
    const getResponse = await axios.get('http://localhost:5000/api/groups', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Grupos obtenidos exitosamente!');
    console.log('📊 Respuesta:', JSON.stringify(getResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error obteniendo grupos:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testGetGroups();

