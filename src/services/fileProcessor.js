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
      // Decodificar base64
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Leer el archivo Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
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
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
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
          }
        }
      }
      
      // Generar archivo Excel con los datos procesados
      const processedWorkbook = XLSX.utils.book_new();
      const processedWorksheet = XLSX.utils.json_to_sheet(clientsData);
      XLSX.utils.book_append_sheet(processedWorkbook, processedWorksheet, 'Clientes Procesados');
      
      // Generar nombre único para el archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `clientes_procesados_${timestamp}.xlsx`;
      
      // Crear directorio si no existe
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      
      // Guardar archivo
      XLSX.writeFile(processedWorkbook, filePath);
      
      return {
        success: true,
        clientsData,
        processedFile: {
          fileName,
          filePath,
          totalClients: clientsData.length
        }
      };
      
    } catch (error) {
      console.error('Error procesando archivo:', error);
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
