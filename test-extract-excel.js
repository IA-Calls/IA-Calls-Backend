const http = require('http');

// Función para hacer petición HTTP
const makeRequest = (path, method, data) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
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

    if (data) {
      req.write(postData);
    }
    
    req.end();
  });
};

// Función para obtener grupos disponibles
const getGroups = async () => {
  try {
    const response = await makeRequest('/api/groups', 'GET');
    console.log('📋 Grupos disponibles:');
    response.data.data.forEach(group => {
      console.log(`   ID: ${group.id} - ${group.name} (${group.description})`);
    });
    return response.data.data;
  } catch (error) {
    console.error('Error obteniendo grupos:', error.message);
    return [];
  }
};

// Función para probar extracción sin grupo
const testExtractWithoutGroup = async () => {
  console.log('\n🔍 Probando extracción SIN asignar a grupo...');
  
  try {
    const response = await makeRequest('/clients/extract-excel', 'POST', {
      file: "base64_encoded_excel_content",
      filename: "clientes_test.xlsx"
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en extracción sin grupo:', error.message);
  }
};

// Función para probar extracción con grupo
const testExtractWithGroup = async (groupId) => {
  console.log(`\n🔍 Probando extracción ASIGNANDO al grupo ${groupId}...`);
  
  try {
    const response = await makeRequest('/clients/extract-excel', 'POST', {
      groupId: groupId,
      file: "base64_encoded_excel_content",
      filename: "clientes_con_grupo.xlsx"
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en extracción con grupo:', error.message);
  }
};

// Función para probar con grupo inexistente
const testExtractWithInvalidGroup = async () => {
  console.log('\n🔍 Probando extracción con grupo inexistente...');
  
  try {
    const response = await makeRequest('/clients/extract-excel', 'POST', {
      groupId: 999,
      file: "base64_encoded_excel_content",
      filename: "clientes_grupo_invalido.xlsx"
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en extracción con grupo inválido:', error.message);
  }
};

// Función para probar sin archivo
const testExtractWithoutFile = async () => {
  console.log('\n🔍 Probando extracción SIN archivo...');
  
  try {
    const response = await makeRequest('/clients/extract-excel', 'POST', {
      groupId: 1
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Respuesta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error en extracción sin archivo:', error.message);
  }
};

// Función principal
const runTests = async () => {
  console.log('🚀 Iniciando pruebas del endpoint de extracción de Excel...\n');
  
  // 1. Obtener grupos disponibles
  const groups = await getGroups();
  
  if (groups.length === 0) {
    console.log('❌ No hay grupos disponibles para las pruebas');
    return;
  }
  
  // 2. Probar extracción sin grupo
  await testExtractWithoutGroup();
  
  // 3. Probar extracción con el primer grupo disponible
  await testExtractWithGroup(groups[0].id);
  
  // 4. Probar extracción con grupo inexistente
  await testExtractWithInvalidGroup();
  
  // 5. Probar extracción sin archivo
  await testExtractWithoutFile();
  
  console.log('\n✅ Pruebas completadas');
};

// Ejecutar las pruebas
runTests().catch(console.error); 