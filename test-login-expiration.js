const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Función para hacer login
async function testLogin(email, password) {
  try {
    console.log(`\n🔐 Probando login para: ${email}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('✅ Login exitoso');
    console.log('📋 Respuesta:', {
      status: response.status,
      message: response.data.message,
      user: {
        id: response.data.data.user.id,
        username: response.data.data.user.username,
        is_active: response.data.data.user.is_active,
        time: response.data.data.user.time
      }
    });
    
    return response.data.data.token;
  } catch (error) {
    if (error.response) {
      console.log('❌ Login falló');
      console.log('📋 Error:', {
        status: error.response.status,
        message: error.response.data.message
      });
    } else {
      console.log('❌ Error de conexión:', error.message);
    }
    return null;
  }
}

// Función para verificar token
async function testVerifyToken(token) {
  try {
    console.log('\n🔍 Verificando token...');
    
    const response = await axios.get(`${API_URL}/auth/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token válido');
    console.log('📋 Respuesta:', {
      status: response.status,
      message: response.data.message,
      user: {
        id: response.data.data.user.id,
        username: response.data.data.user.username,
        is_active: response.data.data.user.is_active,
        time: response.data.data.user.time
      }
    });
    
    return true;
  } catch (error) {
    if (error.response) {
      console.log('❌ Token inválido');
      console.log('📋 Error:', {
        status: error.response.status,
        message: error.response.data.message
      });
    } else {
      console.log('❌ Error de conexión:', error.message);
    }
    return false;
  }
}

// Función para obtener perfil
async function testGetProfile(token) {
  try {
    console.log('\n👤 Obteniendo perfil...');
    
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Perfil obtenido');
    console.log('📋 Respuesta:', {
      status: response.status,
      message: response.data.message,
      user: {
        id: response.data.data.id,
        username: response.data.data.username,
        is_active: response.data.data.is_active,
        time: response.data.data.time
      }
    });
    
    return true;
  } catch (error) {
    if (error.response) {
      console.log('❌ Error obteniendo perfil');
      console.log('📋 Error:', {
        status: error.response.status,
        message: error.response.data.message
      });
    } else {
      console.log('❌ Error de conexión:', error.message);
    }
    return false;
  }
}

// Función principal de pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de validación de expiración en login...\n');
  
  // Test 1: Login con usuario normal (sin expiración)
  console.log('📝 TEST 1: Login con usuario normal');
  const token1 = await testLogin('admin@example.com', 'password123');
  
  if (token1) {
    await testVerifyToken(token1);
    await testGetProfile(token1);
  }
  
  // Test 2: Login con usuario expirado
  console.log('\n📝 TEST 2: Login con usuario expirado');
  const token2 = await testLogin('expired@example.com', 'password123');
  
  if (token2) {
    await testVerifyToken(token2);
    await testGetProfile(token2);
  }
  
  // Test 3: Login con usuario inactivo
  console.log('\n📝 TEST 3: Login con usuario inactivo');
  const token3 = await testLogin('inactive@example.com', 'password123');
  
  if (token3) {
    await testVerifyToken(token3);
    await testGetProfile(token3);
  }
  
  console.log('\n✨ Pruebas completadas');
}

// Ejecutar pruebas
runTests().catch(console.error);
