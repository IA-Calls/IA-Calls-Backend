const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Función para crear un archivo Excel de prueba
function createTestExcel() {
  const testData = [
    ['nombre', 'telefono', 'email', 'direccion'],
    ['Juan Pérez', '3001234567', 'juan@email.com', 'Calle 123 #45-67'],
    ['María García', '3109876543', 'maria@email.com', 'Carrera 78 #90-12'],
    ['Carlos López', '3155551234', 'carlos@email.com', 'Avenida 5 #23-45'],
    ['Ana Rodríguez', '3201112222', 'ana@email.com', 'Calle 10 #15-20'],
    ['Luis Martínez', '3009998888', 'luis@email.com', 'Carrera 15 #30-40']
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(testData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Data');

  const testFilePath = path.join(__dirname, '../test-data.xlsx');
  XLSX.writeFile(workbook, testFilePath);
  
  console.log('Archivo de prueba creado:', testFilePath);
  return testFilePath;
}

// Función para convertir archivo a base64
function fileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// Función para probar el procesamiento
async function testFileProcessing() {
  try {
    console.log('=== Iniciando prueba de procesamiento de archivos ===\n');
    
    // 1. Crear archivo Excel de prueba
    console.log('1. Creando archivo Excel de prueba...');
    const testFilePath = createTestExcel();
    
    // 2. Convertir a base64
    console.log('2. Convirtiendo archivo a base64...');
    const base64Data = fileToBase64(testFilePath);
    console.log('Base64 generado (primeros 100 caracteres):', base64Data.substring(0, 100) + '...');
    
    // 3. Simular datos del request
    const requestData = {
      name: 'Grupo de Prueba',
      description: 'Grupo creado para probar procesamiento de archivos',
      color: '#3B82F6',
      favorite: false,
      base64: base64Data,
      document_name: 'test-data.xlsx'
    };
    
    console.log('\n3. Datos del request:');
    console.log(JSON.stringify(requestData, null, 2));
    
    // 4. Simular respuesta esperada
    console.log('\n4. Respuesta esperada:');
    const expectedResponse = {
      success: true,
      message: 'Grupo creado exitosamente',
      data: {
        id: 1,
        name: 'Grupo de Prueba',
        description: 'Grupo creado para probar procesamiento de archivos',
        color: '#3B82F6',
        favorite: false,
        fileProcessing: {
          processed: true,
          totalClientsFound: 5,
          clientsCreated: 5,
          processedFile: {
            fileName: 'clientes_procesados_[timestamp].xlsx',
            filePath: '/path/to/file.xlsx',
            totalClients: 5
          }
        },
        createdClients: [
          {
            id: 1,
            name: 'Juan Pérez',
            phone: '3001234567',
            email: 'juan@email.com',
            status: 'pending'
          },
          {
            id: 2,
            name: 'María García',
            phone: '3109876543',
            email: 'maria@email.com',
            status: 'pending'
          }
        ]
      }
    };
    
    console.log(JSON.stringify(expectedResponse, null, 2));
    
    console.log('\n=== Prueba completada ===');
    console.log('Para probar con el servidor real:');
    console.log('1. Inicia el servidor: npm start');
    console.log('2. Envía un POST a /api/groups con los datos del request');
    console.log('3. Verifica la respuesta y los archivos generados en /uploads/');
    
  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

// Ejecutar la prueba si se llama directamente
if (require.main === module) {
  testFileProcessing();
}

module.exports = {
  createTestExcel,
  fileToBase64,
  testFileProcessing
};
