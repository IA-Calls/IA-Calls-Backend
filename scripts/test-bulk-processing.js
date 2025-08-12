const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Función para crear un archivo Excel grande de prueba
function createLargeTestExcel() {
  const testData = [
    ['nombre', 'telefono', 'email', 'direccion']
  ];

  // Generar 500 registros de prueba
  for (let i = 1; i <= 500; i++) {
    testData.push([
      `Cliente ${i}`,
      `300${String(i).padStart(7, '0')}`,
      `cliente${i}@email.com`,
      `Dirección ${i}, Ciudad`
    ]);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(testData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Data');

  const testFilePath = path.join(__dirname, '../test-bulk-data.xlsx');
  XLSX.writeFile(workbook, testFilePath);
  
  console.log('Archivo de prueba grande creado:', testFilePath);
  console.log(`Total de registros: ${testData.length - 1}`);
  return testFilePath;
}

// Función para convertir archivo a base64
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// Función para probar el procesamiento masivo
async function testBulkProcessing() {
  try {
    console.log('=== Iniciando prueba de procesamiento masivo ===\n');
    
    // 1. Crear archivo Excel grande de prueba
    console.log('1. Creando archivo Excel grande de prueba...');
    const testFilePath = createLargeTestExcel();
    
    // 2. Convertir a base64
    console.log('2. Convirtiendo archivo a base64...');
    const base64Data = fileToBase64(testFilePath);
    console.log('Base64 generado (primeros 100 caracteres):', base64Data.substring(0, 100) + '...');
    
    // 3. Simular datos del request
    const requestData = {
      name: 'Grupo de Prueba Masiva',
      description: 'Grupo creado para probar procesamiento masivo de archivos',
      color: '#3B82F6',
      favorite: false,
      base64: base64Data,
      document_name: 'test-bulk-data.xlsx'
    };
    
    console.log('\n3. Datos del request:');
    console.log(JSON.stringify({
      ...requestData,
      base64: requestData.base64.substring(0, 100) + '...'
    }, null, 2));
    
    // 4. Simular respuesta esperada
    console.log('\n4. Respuesta esperada:');
    const expectedResponse = {
      success: true,
      message: 'Grupo creado exitosamente',
      data: {
        id: 1,
        name: 'Grupo de Prueba Masiva',
        description: 'Grupo creado para probar procesamiento masivo de archivos',
        color: '#3B82F6',
        favorite: false,
        fileProcessing: {
          processed: true,
          totalClientsFound: 500,
          clientsCreated: 500,
          processedFile: {
            fileName: 'clientes_procesados_[timestamp].xlsx',
            filePath: '/path/to/file.xlsx',
            totalClients: 500
          }
        },
        createdClients: [
          {
            id: 1,
            name: 'Cliente 1',
            phone: '3000000001',
            email: 'cliente1@email.com',
            status: 'pending'
          },
          {
            id: 2,
            name: 'Cliente 2',
            phone: '3000000002',
            email: 'cliente2@email.com',
            status: 'pending'
          }
        ]
      }
    };
    
    console.log(JSON.stringify(expectedResponse, null, 2));
    
    console.log('\n=== Prueba completada ===');
    console.log('Características de la nueva implementación:');
    console.log('✅ Carga masiva en lotes de 100 clientes');
    console.log('✅ Sin verificación de duplicados');
    console.log('✅ Teléfonos duplicados permitidos en diferentes grupos');
    console.log('✅ Procesamiento más eficiente');
    console.log('✅ Nuevos endpoints para gestión de clientes');
    console.log('\nPara probar con el servidor real:');
    console.log('1. Inicia el servidor: npm start');
    console.log('2. Envía un POST a /api/groups con los datos del request');
    console.log('3. Verifica la respuesta y los archivos generados en /uploads/');
    console.log('4. Usa los nuevos endpoints para gestionar clientes:');
    console.log('   - GET /api/groups/:id/clients/:client_id');
    console.log('   - PUT /api/groups/:id/clients/:client_id');
    console.log('   - DELETE /api/groups/:id/clients/:client_id');
    
  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

// Ejecutar la prueba si se llama directamente
if (require.main === module) {
  testBulkProcessing();
}

module.exports = {
  createLargeTestExcel,
  fileToBase64,
  testBulkProcessing
};
