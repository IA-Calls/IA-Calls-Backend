const WhatsAppBusinessService = require('../services/whatsappBusinessService');

class WhatsAppTemplatesController {
  /**
   * Crear una nueva template de mensaje
   * POST /api/whatsapp/templates
   * 
   * Body esperado:
   * {
   *   name: string,
   *   language: string,
   *   category: string (opcional, default: 'marketing'),
   *   parameterFormat: string (opcional),
   *   components: Array,
   *   wabaId: string (opcional, para producción),
   *   accessToken: string (opcional, para producción)
   * }
   */
  async createTemplate(req, res) {
    try {
      const { 
        name, 
        language, 
        category, 
        parameterFormat, 
        components,
        wabaId
        // NOTA: accessToken se toma SIEMPRE del .env, no del frontend
        // El frontend puede enviar un JWT de autenticación, pero ese NO es el token de Facebook
      } = req.body;

      // Validar datos requeridos
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de la template es requerido'
        });
      }

      if (!language) {
        return res.status(400).json({
          success: false,
          error: 'El idioma de la template es requerido'
        });
      }

      if (!components || !Array.isArray(components) || components.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Los componentes de la template son requeridos y deben ser un array'
        });
      }

      // Crear instancia del servicio
      // El wabaId viene del frontend, pero el accessToken SIEMPRE se toma del .env
      // Ignoramos cualquier accessToken que venga del frontend (puede ser un JWT de autenticación)
      const whatsappService = new WhatsAppBusinessService(wabaId, null);

      // Crear la template
      const result = await whatsappService.createTemplate({
        name,
        language,
        category: category || 'marketing',
        parameterFormat,
        components
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Template creada exitosamente',
          data: {
            templateId: result.templateId,
            status: result.status,
            template: result.data
          }
        });
      } else {
        // Determinar el código de estado HTTP apropiado
        const httpStatus = result.httpStatus || 400;
        
        res.status(httpStatus).json({
          success: false,
          error: result.error || 'Error al crear la template',
          errorCode: result.errorCode,
          errorType: result.errorType,
          httpStatus: result.httpStatus,
          details: result.details,
          troubleshooting: result.troubleshooting
        });
      }

    } catch (error) {
      console.error('❌ Error en createTemplate:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  /**
   * Obtener todas las templates de mensaje
   * GET /api/whatsapp/templates
   * 
   * Query params:
   * - name: string (opcional) - Filtrar por nombre
   * - status: string (opcional) - Filtrar por estado
   * - language: string (opcional) - Filtrar por idioma
   * - wabaId: string (opcional) - Para producción
   * - accessToken: string (opcional) - Para producción
   */
  async getTemplates(req, res) {
    try {
      const { name, status, language, wabaId, accessToken } = req.query;

      // Log para debugging
      console.log('📥 GET /api/whatsapp/templates');
      console.log('🔍 Query params recibidos:', { 
        name, 
        status, 
        language, 
        hasWabaId: !!wabaId, 
        hasAccessToken: !!accessToken 
      });

      // Crear instancia del servicio
      // El frontend puede enviar solo wabaId (el accessToken se tomará del .env)
      // O puede enviar ambos, o ninguno (se usarán ambos del .env)
      const whatsappService = new WhatsAppBusinessService(
        wabaId || undefined, 
        accessToken || undefined
      );

      // Obtener templates
      const result = await whatsappService.getTemplates({
        name,
        status,
        language
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Templates obtenidas exitosamente',
          data: result.data,
          paging: result.paging,
          total: result.total
        });
      } else {
        // Determinar el código de estado HTTP apropiado
        const httpStatus = result.httpStatus || (result.error?.includes('requerido') ? 400 : 400);
        
        res.status(httpStatus).json({
          success: false,
          error: result.error || 'Error al obtener las templates',
          errorCode: result.errorCode,
          errorType: result.errorType,
          httpStatus: result.httpStatus,
          details: result.details,
          troubleshooting: result.troubleshooting,
          hint: !wabaId 
            ? 'Por favor, envía wabaId como query param: ?wabaId=XXX (el accessToken se tomará del .env)'
            : !accessToken && !process.env.WHATSAPP_ACCESS_TOKEN
            ? 'Por favor, envía accessToken como query param: ?accessToken=YYY o configura WHATSAPP_ACCESS_TOKEN en el .env'
            : undefined
        });
      }

    } catch (error) {
      console.error('❌ Error en getTemplates:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  /**
   * Obtener una template específica por ID
   * GET /api/whatsapp/templates/:templateId
   * 
   * Query params:
   * - wabaId: string (opcional) - Para producción
   * - accessToken: string (opcional) - Para producción
   */
  async getTemplateById(req, res) {
    try {
      const { templateId } = req.params;
      const { wabaId, accessToken } = req.query;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          error: 'El ID de la template es requerido'
        });
      }

      // Crear instancia del servicio
      const whatsappService = new WhatsAppBusinessService(
        wabaId || undefined, 
        accessToken || undefined
      );

      // Obtener template
      const result = await whatsappService.getTemplateById(templateId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Template obtenida exitosamente',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Template no encontrada',
          errorCode: result.errorCode,
          errorType: result.errorType,
          details: result.details
        });
      }

    } catch (error) {
      console.error('❌ Error en getTemplateById:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }

  /**
   * Eliminar una template
   * DELETE /api/whatsapp/templates/:templateId
   * 
   * Query params:
   * - wabaId: string (opcional) - Para producción
   * - accessToken: string (opcional) - Para producción
   */
  async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { wabaId, accessToken } = req.query;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          error: 'El ID de la template es requerido'
        });
      }

      // Crear instancia del servicio
      const whatsappService = new WhatsAppBusinessService(
        wabaId || undefined, 
        accessToken || undefined
      );

      // Eliminar template
      const result = await whatsappService.deleteTemplate(templateId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Template eliminada exitosamente',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Error al eliminar la template',
          errorCode: result.errorCode,
          errorType: result.errorType,
          details: result.details
        });
      }

    } catch (error) {
      console.error('❌ Error en deleteTemplate:', error.message);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  }
}

module.exports = WhatsAppTemplatesController;

