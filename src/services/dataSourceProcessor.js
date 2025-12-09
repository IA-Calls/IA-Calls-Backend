/**
 * Servicio para procesar diferentes tipos de fuentes de información
 * Convierte datos en formato consumible por Vertex AI Agent Builder
 */

const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class DataSourceProcessor {
  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
      credentials: process.env.GOOGLE_CLOUD_PRIVATE_KEY ? {
        type: 'service_account',
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
        auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI,
        token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL
      } : null
    });
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ia-calls-data-sources';
  }

  /**
   * Procesar archivo PDF
   */
  async processPDF(filePath, gcsObjectName) {
    try {
      console.log(`📄 Procesando PDF: ${filePath}`);

      // Descargar archivo de GCS si es necesario
      let localPath = filePath;
      if (gcsObjectName) {
        localPath = await this.downloadFromGCS(gcsObjectName);
      }

      // Usar biblioteca para extraer texto de PDF
      // Nota: Necesitarás instalar pdf-parse o similar
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(localPath);
      const pdfData = await pdfParse(dataBuffer);

      const processedData = {
        type: 'pdf',
        text: pdfData.text,
        pages: pdfData.numpages,
        metadata: {
          info: pdfData.info,
          metadata: pdfData.metadata
        },
        extracted_at: new Date().toISOString()
      };

      // Limpiar archivo temporal si se descargó
      if (gcsObjectName && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      return {
        success: true,
        data: processedData
      };
    } catch (error) {
      console.error('❌ Error procesando PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar archivo Excel
   */
  async processExcel(filePath, gcsObjectName) {
    try {
      console.log(`📊 Procesando Excel: ${filePath}`);

      // Descargar archivo de GCS si es necesario
      let localPath = filePath;
      if (gcsObjectName) {
        localPath = await this.downloadFromGCS(gcsObjectName);
      }

      // Leer archivo Excel
      const workbook = XLSX.readFile(localPath);
      const sheets = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        sheets.push({
          name: sheetName,
          rows: jsonData.length,
          columns: Object.keys(jsonData[0] || {}),
          data: jsonData
        });
      });

      const processedData = {
        type: 'excel',
        sheets: sheets,
        total_sheets: workbook.SheetNames.length,
        extracted_at: new Date().toISOString()
      };

      // Limpiar archivo temporal si se descargó
      if (gcsObjectName && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      return {
        success: true,
        data: processedData
      };
    } catch (error) {
      console.error('❌ Error procesando Excel:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar Google Sheet
   */
  async processGoogleSheet(sheetUrl) {
    try {
      console.log(`📊 Procesando Google Sheet: ${sheetUrl}`);

      // Extraer ID del sheet de la URL
      const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('URL de Google Sheet inválida');
      }

      const sheetId = sheetIdMatch[1];
      
      // Convertir a formato de exportación CSV
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      
      const response = await axios.get(exportUrl, {
        responseType: 'text'
      });

      // Convertir CSV a JSON
      const csv = response.data;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || null;
          });
          data.push(row);
        }
      }

      const processedData = {
        type: 'google_sheet',
        sheet_id: sheetId,
        columns: headers,
        rows: data.length,
        data: data,
        extracted_at: new Date().toISOString()
      };

      return {
        success: true,
        data: processedData
      };
    } catch (error) {
      console.error('❌ Error procesando Google Sheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar base de datos externa
   */
  async processDatabase(dataSource) {
    try {
      console.log(`🗄️ Procesando base de datos: ${dataSource.dbHost}/${dataSource.dbName}`);

      const password = dataSource.getDecryptedPassword();
      
      // Conectar según el tipo de BD
      let connection;
      let queryResult;

      switch (dataSource.dbType) {
        case 'mysql':
        case 'mariadb':
          const mysql = require('mysql2/promise');
          connection = await mysql.createConnection({
            host: dataSource.dbHost,
            port: dataSource.dbPort || 3306,
            user: dataSource.dbUser,
            password: password,
            database: dataSource.selectedDatabase || dataSource.dbName
          });
          
          if (dataSource.selectedTable) {
            queryResult = await connection.query(`SELECT * FROM ${dataSource.selectedTable} LIMIT 1000`);
          } else {
            // Listar tablas
            queryResult = await connection.query('SHOW TABLES');
          }
          await connection.end();
          break;

        case 'postgresql':
          const { Pool } = require('pg');
          const pool = new Pool({
            host: dataSource.dbHost,
            port: dataSource.dbPort || 5432,
            user: dataSource.dbUser,
            password: password,
            database: dataSource.selectedDatabase || dataSource.dbName
          });
          
          if (dataSource.selectedTable) {
            queryResult = await pool.query(`SELECT * FROM ${dataSource.selectedTable} LIMIT 1000`);
          } else {
            // Listar tablas
            queryResult = await pool.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public'
            `);
          }
          await pool.end();
          break;

        case 'sqlserver':
          const sql = require('mssql');
          const config = {
            server: dataSource.dbHost,
            port: dataSource.dbPort || 1433,
            user: dataSource.dbUser,
            password: password,
            database: dataSource.selectedDatabase || dataSource.dbName,
            options: {
              encrypt: true,
              trustServerCertificate: true
            }
          };
          
          connection = await sql.connect(config);
          
          if (dataSource.selectedTable) {
            queryResult = await connection.request().query(`SELECT TOP 1000 * FROM ${dataSource.selectedTable}`);
          } else {
            queryResult = await connection.request().query(`
              SELECT TABLE_NAME 
              FROM INFORMATION_SCHEMA.TABLES 
              WHERE TABLE_TYPE = 'BASE TABLE'
            `);
          }
          await sql.close();
          break;

        default:
          throw new Error(`Tipo de base de datos no soportado: ${dataSource.dbType}`);
      }

      // Normalizar resultados
      let processedData;
      if (dataSource.selectedTable) {
        // Datos de la tabla
        const rows = queryResult.rows || queryResult.recordset || [];
        processedData = {
          type: 'database',
          db_type: dataSource.dbType,
          database: dataSource.selectedDatabase || dataSource.dbName,
          table: dataSource.selectedTable,
          columns: rows.length > 0 ? Object.keys(rows[0]) : [],
          rows: rows.length,
          data: rows,
          extracted_at: new Date().toISOString()
        };
      } else {
        // Lista de tablas
        const tables = queryResult.rows || queryResult.recordset || [];
        processedData = {
          type: 'database',
          db_type: dataSource.dbType,
          database: dataSource.selectedDatabase || dataSource.dbName,
          tables: tables.map(t => t.table_name || t.TABLE_NAME || Object.values(t)[0]),
          extracted_at: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: processedData
      };
    } catch (error) {
      console.error('❌ Error procesando base de datos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalizar datos para Agent Builder
   * Convierte los datos procesados en formato JSON/texto para el agente
   */
  normalizeForAgentBuilder(processedData) {
    try {
      let normalized = {
        source_type: processedData.type,
        extracted_at: processedData.extracted_at,
        content: ''
      };

      switch (processedData.type) {
        case 'pdf':
          normalized.content = processedData.text;
          normalized.metadata = {
            pages: processedData.pages,
            info: processedData.metadata
          };
          break;

        case 'excel':
        case 'google_sheet':
          // Convertir datos tabulares a texto estructurado
          const sheets = processedData.sheets || [processedData];
          let content = '';
          
          sheets.forEach((sheet, index) => {
            content += `\n=== ${sheet.name || `Sheet ${index + 1}`} ===\n`;
            content += `Columnas: ${sheet.columns?.join(', ') || 'N/A'}\n`;
            content += `Filas: ${sheet.rows || sheet.data?.length || 0}\n\n`;
            
            if (sheet.data && sheet.data.length > 0) {
              // Convertir primeras filas a texto
              const sampleRows = sheet.data.slice(0, 10);
              sampleRows.forEach((row, rowIndex) => {
                content += `Fila ${rowIndex + 1}: ${JSON.stringify(row)}\n`;
              });
              
              if (sheet.data.length > 10) {
                content += `... (${sheet.data.length - 10} filas más)\n`;
              }
            }
          });
          
          normalized.content = content;
          normalized.metadata = {
            total_rows: sheets.reduce((sum, s) => sum + (s.rows || s.data?.length || 0), 0),
            columns: sheets[0]?.columns || []
          };
          break;

        case 'database':
          if (processedData.data) {
            // Datos de tabla
            let content = `Base de datos: ${processedData.database}\n`;
            content += `Tabla: ${processedData.table}\n`;
            content += `Columnas: ${processedData.columns.join(', ')}\n`;
            content += `Total de filas: ${processedData.rows}\n\n`;
            
            processedData.data.forEach((row, index) => {
              content += `Registro ${index + 1}: ${JSON.stringify(row)}\n`;
            });
            
            normalized.content = content;
            normalized.metadata = {
              database: processedData.database,
              table: processedData.table,
              columns: processedData.columns,
              total_rows: processedData.rows
            };
          } else if (processedData.tables) {
            // Lista de tablas
            normalized.content = `Bases de datos disponibles:\n${processedData.tables.join('\n')}`;
            normalized.metadata = {
              database: processedData.database,
              tables: processedData.tables
            };
          }
          break;

        default:
          normalized.content = JSON.stringify(processedData);
      }

      return {
        success: true,
        normalized: normalized
      };
    } catch (error) {
      console.error('❌ Error normalizando datos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Descargar archivo de Google Cloud Storage
   */
  async downloadFromGCS(objectName) {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectName);
    const tempPath = path.join('/tmp', `temp_${Date.now()}_${path.basename(objectName)}`);
    
    await file.download({ destination: tempPath });
    return tempPath;
  }

  /**
   * Subir archivo a Google Cloud Storage
   */
  async uploadToGCS(filePath, destinationName, userId) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(`data-sources/${userId}/${destinationName}`);
      
      await bucket.upload(filePath, {
        destination: file.name,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });

      return {
        success: true,
        bucket: this.bucketName,
        objectName: file.name,
        publicUrl: `gs://${this.bucketName}/${file.name}`
      };
    } catch (error) {
      console.error('❌ Error subiendo archivo a GCS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DataSourceProcessor();

