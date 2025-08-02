const http = require('http');
const fs = require('fs');
const FormData = require('form-data');

// Función para hacer petición HTTP con FormData
const makeFormDataRequest = (path, formData) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: formData.getHeaders()
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Error parsing response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    formData.pipe(req);
  });
};

// Función para obtener grupos disponibles
const getGroups = async () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/groups',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData.data);
        } catch (error) {
          reject(new Error(`Error parsing response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

// Función para probar carga sin grupo
const testUploadWithoutGroup = async () => {
  console.log('\n🔍 Probando carga SIN asignar a grupo...');
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('clientes_ejemplo.xlsx'));
    
    const response = await makeFormDataRequest('/clients/extract-excel', formData);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en carga sin grupo:', error.message);
  }
};

// Función para probar carga con grupo
const testUploadWithGroup = async (groupId) => {
  console.log(`\n🔍 Probando carga ASIGNANDO al grupo ${groupId}...`);
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('clientes_ejemplo.xlsx'));
    formData.append('groupId', groupId);
    
    const response = await makeFormDataRequest('/clients/extract-excel', formData);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en carga con grupo:', error.message);
  }
};

// Función para probar con grupo inexistente
const testUploadWithInvalidGroup = async () => {
  console.log('\n🔍 Probando carga con grupo inexistente...');
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('clientes_ejemplo.xlsx'));
    formData.append('groupId', '999');
    
    const response = await makeFormDataRequest('/clients/extract-excel', formData);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en carga con grupo inválido:', error.message);
  }
};

// Función principal
const runTests = async () => {
  console.log('🚀 Iniciando pruebas del endpoint de extracción de Excel...\n');
  
  // Verificar que el archivo Excel existe
  if (!fs.existsSync('clientes_ejemplo.xlsx')) {
    console.log('❌ Archivo clientes_ejemplo.xlsx no encontrado');
    console.log('Ejecuta primero: node create-sample-excel.js');
    return;
  }
  
  // 1. Obtener grupos disponibles
  try {
    const groups = await getGroups();
    console.log('📋 Grupos disponibles:');
    groups.forEach(group => {
      console.log(`   ID: ${group.id} - ${group.name} (${group.description})`);
    });
    
    // 2. Probar carga sin grupo
    await testUploadWithoutGroup();
    
    // 3. Probar carga con el primer grupo disponible
    if (groups.length > 0) {
      await testUploadWithGroup(groups[0].id);
    }
    
    // 4. Probar carga con grupo inexistente
    await testUploadWithInvalidGroup();
    
  } catch (error) {
    console.error('Error obteniendo grupos:', error.message);
  }
  
  console.log('\n✅ Pruebas completadas');
};

// Ejecutar las pruebas
runTests().catch(console.error); 