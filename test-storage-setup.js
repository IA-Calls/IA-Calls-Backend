const storageService = require('./src/services/storage');

async function testStorageSetup() {
  console.log('🧪 Probando configuración de almacenamiento...\n');

  try {
    // 1. Probar conexión al bucket
    console.log('1️⃣ Probando conexión al bucket...');
    const connectionTest = await storageService.testConnection();
    console.log('✅ Conexión exitosa:', connectionTest);
    console.log('');

    // 2. Probar listado de archivos
    console.log('2️⃣ Probando listado de archivos...');
    const filesList = await storageService.listFiles('excel-uploads', 5);
    console.log('✅ Listado exitoso:', {
      total: filesList.total,
      files: filesList.files.length
    });
    console.log('');

    // 3. Probar generación de nombre único
    console.log('3️⃣ Probando generación de nombres únicos...');
    const uniqueName1 = storageService.generateUniqueFileName('test1.xlsx');
    const uniqueName2 = storageService.generateUniqueFileName('test2.xlsx');
    console.log('✅ Nombres generados:');
    console.log('   - Archivo 1:', uniqueName1);
    console.log('   - Archivo 2:', uniqueName2);
    console.log('');

    // 4. Probar determinación de tipo de contenido
    console.log('4️⃣ Probando determinación de tipos de contenido...');
    const contentType1 = storageService.getContentType('archivo.xlsx');
    const contentType2 = storageService.getContentType('archivo.xls');
    const contentType3 = storageService.getContentType('archivo.csv');
    console.log('✅ Tipos de contenido:');
    console.log('   - .xlsx:', contentType1);
    console.log('   - .xls:', contentType2);
    console.log('   - .csv:', contentType3);
    console.log('');

    console.log('🎉 Todas las pruebas pasaron exitosamente!');
    console.log('📁 El servicio de almacenamiento está configurado correctamente.');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('1. Verifica que las variables de entorno estén configuradas:');
    console.log('   - GOOGLE_APPLICATION_CREDENTIALS');
    console.log('   - GOOGLE_CLOUD_PROJECT_ID');
    console.log('   - GOOGLE_CLOUD_BUCKET_NAME');
    console.log('');
    console.log('2. Asegúrate de que el archivo de credenciales existe y es válido');
    console.log('3. Verifica que el bucket existe y tienes permisos de acceso');
    console.log('4. Confirma que el proyecto ID es correcto');
  }
}

// Ejecutar pruebas
testStorageSetup().catch(console.error); 