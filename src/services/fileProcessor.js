const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class FileProcessor {
  /**
   * Procesa un archivo en base64 y extrae información de clientes
   * @param {string} base64Data - Archivo en formato base64
   * @param {string} documentName - Nombre del documento original
   * @returns {Object} - Objeto con datos extraídos y archivo generado
   */
  static async processFile(base64Data, documentName) {
    try {
      console.log(`📁 Iniciando procesamiento de archivo: ${documentName}`);
      
      // Decodificar base64
      const buffer = Buffer.from(base64Data, 'base64');
      const fileSizeMB = buffer.length / 1024 / 1024;
      console.log(`📊 Tamaño del archivo: ${fileSizeMB.toFixed(2)} MB`);
      
      // Validar tamaño del archivo (máximo 50MB)
      if (fileSizeMB > 50) {
        throw new Error(`El archivo es demasiado grande (${fileSizeMB.toFixed(2)} MB). El tamaño máximo permitido es 50 MB.`);
      }
      
      // Validar que el archivo no esté vacío
      if (buffer.length === 0) {
        throw new Error('El archivo está vacío o corrupto.');
      }
      
      // Leer el archivo Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log(`📋 Total de filas en el archivo: ${jsonData.length}`);
      
      // Validar que el archivo tenga datos
      if (jsonData.length < 2) {
        throw new Error('El archivo Excel debe tener al menos una fila de encabezados y una fila de datos.');
      }
      
      // Validar número máximo de filas (máximo 100,000 filas)
      if (jsonData.length > 100000) {
        throw new Error(`El archivo tiene demasiadas filas (${jsonData.length}). El máximo permitido es 100,000 filas.`);
      }
      
      // Extraer encabezados (primera fila)
      const headers = jsonData[0] || [];
      
      // Encontrar índices de columnas importantes
      const nameIndex = this.findColumnIndex(headers, ['nombre', 'name', 'nombres', 'cliente']);
      const phoneIndex = this.findColumnIndex(headers, ['telefono', 'phone', 'celular', 'movil', 'tel']);
      const emailIndex = this.findColumnIndex(headers, ['email', 'correo', 'e-mail']);
      const addressIndex = this.findColumnIndex(headers, ['direccion', 'address', 'domicilio']);
      
      if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error('No se encontraron las columnas requeridas: nombre y teléfono');
      }
      
      // Procesar datos (excluyendo la fila de encabezados)
      const clientsData = [];
      const totalRows = jsonData.length - 1; // Excluir encabezados
      let processedRows = 0;
      let validClients = 0;
      
      console.log(`🔄 Procesando ${totalRows} filas de datos...`);
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        processedRows++;
        
        // Log de progreso cada 100 filas
        if (processedRows % 100 === 0) {
          console.log(`📈 Progreso: ${processedRows}/${totalRows} filas procesadas (${validClients} clientes válidos)`);
        }
        
        if (row && row.length > 0) {
          const clientData = {
            name: this.cleanValue(row[nameIndex]),
            phone: this.cleanPhone(row[phoneIndex]),
            email: emailIndex !== -1 ? this.cleanValue(row[emailIndex]) : null,
            address: addressIndex !== -1 ? this.cleanValue(row[addressIndex]) : null,
            category: 'imported',
            status: 'pending',
            metadata: {
              source: documentName,
              importDate: new Date().toISOString(),
              originalRow: row
            }
          };
          
          // Solo agregar si tiene nombre y teléfono válidos
          if (clientData.name && clientData.phone) {
            clientsData.push(clientData);
            validClients++;
          }
        }
      }
      
      console.log(`✅ Procesamiento completado: ${validClients} clientes válidos de ${totalRows} filas`);
      
      // Generar archivo Excel con los datos procesados
      console.log(`📄 Generando archivo Excel procesado...`);
      const processedWorkbook = XLSX.utils.book_new();
      const processedWorksheet = XLSX.utils.json_to_sheet(clientsData);
      XLSX.utils.book_append_sheet(processedWorkbook, processedWorksheet, 'Clientes Procesados');
      
      // Generar nombre único para el archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `clientes_procesados_${timestamp}.xlsx`;
      
      // Generar buffer del archivo Excel
      const excelBuffer = XLSX.write(processedWorkbook, { type: 'buffer', bookType: 'xlsx' });
      console.log(`📊 Archivo Excel generado: ${(excelBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Convertir a base64 para subir a GCP
      const processedBase64Data = excelBuffer.toString('base64');
      
      // Subir a GCP usando la función de helpers
      console.log(`☁️ Subiendo archivo a Google Cloud Storage...`);
      const { uploadDocumentToGCP } = require('../utils/helpers');
      const uploadResult = await uploadDocumentToGCP(processedBase64Data, fileName, {
        documentType: 'processed_excel',
        source: 'file_processor',
        totalClients: clientsData.length,
        originalDocument: documentName
      });
      
      console.log(`✅ Archivo subido exitosamente a GCP: ${uploadResult.fileName}`);
      
      return {
        success: true,
        clientsData,
        processedFile: {
          fileName: uploadResult.fileName,
          gcsUrl: uploadResult.publicUrl,
          downloadUrl: uploadResult.downloadUrl,
          totalClients: clientsData.length,
          uploadedAt: uploadResult.uploadedAt
        }
      };
      
    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
      
      // Manejo específico de errores para archivos grandes
      if (error.message.includes('Cannot access') || error.message.includes('before initialization')) {
        console.error('🔧 Error de inicialización de variables detectado');
        throw new Error('Error interno del procesador de archivos. Por favor, intente nuevamente.');
      }
      
      if (error.message.includes('memory') || error.message.includes('heap')) {
        console.error('💾 Error de memoria detectado - archivo muy grande');
        throw new Error('El archivo es demasiado grande para procesar. Intente con un archivo más pequeño o divida el archivo en partes.');
      }
      
      if (error.message.includes('timeout')) {
        console.error('⏰ Error de timeout detectado');
        throw new Error('El procesamiento del archivo tardó demasiado tiempo. Intente con un archivo más pequeño.');
      }
      
      throw new Error(`Error procesando archivo: ${error.message}`);
    }
  }
  
  /**
   * Encuentra el índice de una columna basado en posibles nombres
   * @param {Array} headers - Array de encabezados
   * @param {Array} possibleNames - Posibles nombres de la columna
   * @returns {number} - Índice de la columna o -1 si no se encuentra
   */
  static findColumnIndex(headers, possibleNames) {
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).toLowerCase().trim();
      if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  }
  
  /**
   * Limpia y valida un valor
   * @param {*} value - Valor a limpiar
   * @returns {string|null} - Valor limpio o null si está vacío
   */
  static cleanValue(value) {
    if (!value) return null;
    const cleaned = String(value).trim();
    return cleaned.length > 0 ? cleaned : null;
  }
  
  /**
   * Limpia y formatea un número de teléfono
   * @param {*} phone - Número de teléfono a limpiar
   * @returns {string|null} - Teléfono limpio o null si no es válido
   */
  static cleanPhone(phone) {
    if (!phone) return null;
    
    let cleaned = String(phone).replace(/\D/g, ''); // Solo números
    
    // Si empieza con 0, removerlo
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Si empieza con 57 (código de Colombia), removerlo
    if (cleaned.startsWith('57')) {
      cleaned = cleaned.substring(2);
    }
    
    // Validar que tenga al menos 7 dígitos
    if (cleaned.length < 7) {
      return null;
    }
    
    return cleaned;
  }
}

module.exports = FileProcessor;
