/**
 * Servicio para procesar elementos de conocimiento (links y documentos)
 * Extrae y estructura información para agentes de IA
 */

const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class KnowledgeProcessor {
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
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ia-calls-knowledge';
  }

  /**
   * Procesar enlace (URL)
   * Extrae metadata, valida la URL y genera contenido estructurado
   */
  async processLink(url, linkType = null) {
    try {
      console.log(`🔗 Procesando enlace: ${url}`);

      // Validar URL
      try {
        new URL(url);
      } catch (error) {
        throw new Error('URL inválida');
      }

      // Extraer metadata de la página (og:tags, title, description)
      let metadata = {
        url: url,
        link_type: linkType || this.detectLinkType(url),
        fetched_at: new Date().toISOString()
      };

      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; IA-Calls-Backend/1.0)'
          },
          maxRedirects: 5
        });

        const html = response.data;
        
        // Extraer título
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        }

        // Extraer og:tags
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
        if (ogTitleMatch) {
          metadata.og_title = ogTitleMatch[1].trim();
        }

        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        if (ogDescMatch) {
          metadata.og_description = ogDescMatch[1].trim();
        }

        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        if (ogImageMatch) {
          metadata.og_image = ogImageMatch[1].trim();
        }

        // Extraer meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch) {
          metadata.description = descMatch[1].trim();
        }

        // Extraer texto visible (simplificado)
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 2000); // Limitar a 2000 caracteres

        metadata.text_preview = textContent;

      } catch (fetchError) {
        console.warn(`⚠️ No se pudo obtener metadata de ${url}:`, fetchError.message);
        metadata.fetch_error = fetchError.message;
      }

      // Generar contenido estructurado para el agente
      const processedContent = this.generateLinkContent(metadata);

      return {
        success: true,
        data: {
          type: 'link',
          url: url,
          metadata: metadata,
          processed_content: processedContent,
          extracted_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error procesando enlace:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detectar tipo de enlace basado en la URL
   */
  detectLinkType(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('calendly.com') || urlLower.includes('cal.com') || urlLower.includes('calendar')) {
      return 'calendar';
    }
    if (urlLower.includes('stripe.com') || urlLower.includes('paypal.com') || urlLower.includes('payment') || urlLower.includes('checkout')) {
      return 'payment';
    }
    if (urlLower.includes('forms.gle') || urlLower.includes('typeform.com') || urlLower.includes('form')) {
      return 'form';
    }
    
    return 'website';
  }

  /**
   * Generar contenido estructurado para enlaces
   */
  generateLinkContent(metadata) {
    let content = `Enlace: ${metadata.url}\n`;
    content += `Tipo: ${metadata.link_type}\n`;
    
    if (metadata.title || metadata.og_title) {
      content += `Título: ${metadata.title || metadata.og_title}\n`;
    }
    
    if (metadata.description || metadata.og_description) {
      content += `Descripción: ${metadata.description || metadata.og_description}\n`;
    }
    
    if (metadata.text_preview) {
      content += `\nVista previa:\n${metadata.text_preview}\n`;
    }

    return content;
  }

  /**
   * Procesar documento PDF
   */
  async processPDF(filePath, gcsObjectName) {
    try {
      console.log(`📄 Procesando PDF: ${filePath}`);

      let localPath = filePath;
      if (gcsObjectName) {
        localPath = await this.downloadFromGCS(gcsObjectName);
      }

      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(localPath);
      const pdfData = await pdfParse(dataBuffer);

      const processedContent = pdfData.text;

      // Limpiar archivo temporal
      if (gcsObjectName && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      return {
        success: true,
        data: {
          type: 'document',
          document_type: 'pdf',
          text: processedContent,
          pages: pdfData.numpages,
          metadata: {
            info: pdfData.info,
            metadata: pdfData.metadata
          },
          extracted_at: new Date().toISOString()
        }
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
   * Procesar documento Word (.docx)
   */
  async processWord(filePath, gcsObjectName) {
    try {
      console.log(`📝 Procesando Word: ${filePath}`);

      let localPath = filePath;
      if (gcsObjectName) {
        localPath = await this.downloadFromGCS(gcsObjectName);
      }

      // Usar mammoth para extraer texto de .docx
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: localPath });

      const processedContent = result.value;

      // Limpiar archivo temporal
      if (gcsObjectName && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      return {
        success: true,
        data: {
          type: 'document',
          document_type: 'word',
          text: processedContent,
          extracted_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error procesando Word:', error);
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

      let localPath = filePath;
      if (gcsObjectName) {
        localPath = await this.downloadFromGCS(gcsObjectName);
      }

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

      // Convertir a texto estructurado
      let processedContent = `Archivo Excel con ${workbook.SheetNames.length} hoja(s):\n\n`;
      sheets.forEach(sheet => {
        processedContent += `=== ${sheet.name} ===\n`;
        processedContent += `Columnas: ${sheet.columns.join(', ')}\n`;
        processedContent += `Filas: ${sheet.rows}\n\n`;
        
        // Incluir primeras filas como ejemplo
        const sampleRows = sheet.data.slice(0, 5);
        sampleRows.forEach((row, index) => {
          processedContent += `Fila ${index + 1}: ${JSON.stringify(row)}\n`;
        });
        
        if (sheet.data.length > 5) {
          processedContent += `... (${sheet.data.length - 5} filas más)\n`;
        }
        processedContent += '\n';
      });

      // Limpiar archivo temporal
      if (gcsObjectName && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      return {
        success: true,
        data: {
          type: 'document',
          document_type: 'excel',
          sheets: sheets,
          text: processedContent,
          total_sheets: workbook.SheetNames.length,
          extracted_at: new Date().toISOString()
        }
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
   * Procesar imagen (extraer texto con OCR si es posible)
   */
  async processImage(filePath, gcsObjectName) {
    try {
      console.log(`🖼️ Procesando imagen: ${filePath}`);

      // Por ahora, solo almacenamos la referencia
      // En el futuro se puede agregar OCR con Google Vision API
      const processedContent = `Imagen almacenada: ${gcsObjectName || filePath}\n` +
        `Nota: Para extraer texto de imágenes, se requiere OCR (Google Vision API)`;

      return {
        success: true,
        data: {
          type: 'document',
          document_type: 'image',
          text: processedContent,
          note: 'OCR no implementado aún. La imagen está almacenada pero no se extrajo texto.',
          extracted_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Normalizar contenido para Agent Builder
   * Genera formato estructurado que el agente puede usar
   */
  normalizeForAgentBuilder(knowledgeItem, processedData) {
    try {
      let normalized = {
        item_id: knowledgeItem.id,
        item_name: knowledgeItem.name,
        item_type: knowledgeItem.type,
        priority: knowledgeItem.priority,
        triggers: knowledgeItem.triggers || [],
        conversation_types: knowledgeItem.conversationTypes || [],
        content: '',
        usage_instructions: knowledgeItem.usageInstructions || '',
        extracted_at: processedData.extracted_at || new Date().toISOString()
      };

      if (knowledgeItem.type === 'link') {
        normalized.content = processedData.processed_content || processedData.text || '';
        normalized.url = processedData.url || knowledgeItem.url;
        normalized.link_type = processedData.metadata?.link_type || knowledgeItem.linkType;
        normalized.metadata = processedData.metadata || {};
      } else if (knowledgeItem.type === 'document') {
        normalized.content = processedData.text || processedData.processed_content || '';
        normalized.document_type = processedData.document_type || knowledgeItem.documentType;
        normalized.metadata = processedData.metadata || {};
      }

      // Agregar contexto de uso
      if (knowledgeItem.usageContext) {
        normalized.usage_context = knowledgeItem.usageContext;
      }

      return {
        success: true,
        normalized: normalized
      };
    } catch (error) {
      console.error('❌ Error normalizando conocimiento:', error);
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
      const file = bucket.file(`knowledge/${userId}/${destinationName}`);
      
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

module.exports = new KnowledgeProcessor();

