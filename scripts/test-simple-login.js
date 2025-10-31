#!/usr/bin/env node

const axios = require('axios');

async function testSimpleLogin() {
  console.log('🧪 Probando login simple...\n');

  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@iacalls.com',
      password: 'admin123'
    });

    console.log('✅ Login exitoso!');
    console.log('Status:', response.status);
    console.log('Data:', response.data);

  } catch (error) {
    console.error('❌ Error en login:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 El servidor no está corriendo en el puerto 5000');
    }
  }
}

testSimpleLogin();

