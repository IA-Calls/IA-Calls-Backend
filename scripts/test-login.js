#!/usr/bin/env node

const axios = require('axios');

async function testLogin() {
  console.log('🧪 Probando login con credenciales correctas...\n');

  try {
    const loginData = {
      email: 'admin@iacalls.com',
      password: 'admin123'
    };

    console.log('📤 Enviando datos de login:', JSON.stringify(loginData, null, 2));

    const response = await axios.post('http://localhost:5000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login exitoso!');
    console.log('Status:', response.status);
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.data.token) {
      console.log('\n🎉 Token JWT obtenido:');
      console.log(response.data.data.token.substring(0, 50) + '...');
      
      // Probar el token obtenido
      console.log('\n🔍 Probando token obtenido...');
      const tokenResponse = await axios.post('http://localhost:5000/api/auth/verify-token', {}, {
        headers: {
          'Authorization': `Bearer ${response.data.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token verificado exitosamente!');
      console.log('Usuario:', tokenResponse.data.data.user.username);
    }

  } catch (error) {
    console.error('❌ Error en login:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLogin();

