const { elevenlabsService } = require('../agents');

/**
 * Obtener números de teléfono disponibles en ElevenLabs
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPhoneNumbers = async (req, res) => {
  try {
    console.log('📞 === SOLICITUD DE NÚMEROS DE TELÉFONO ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getPhoneNumbers();

    if (result.success) {
      console.log(`✅ Números obtenidos exitosamente: ${result.count} números disponibles`);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          phoneNumbers: result.phoneNumbers,
          count: result.count,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo números:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getPhoneNumbers:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener números de teléfono',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Obtener información de un agente específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAgentInfo = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'ID del agente es requerido',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🤖 === SOLICITUD DE INFORMACIÓN DE AGENTE ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🆔 Agent ID:', agentId);
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getAgentInfo(agentId);

    if (result.success) {
      console.log('✅ Información del agente obtenida exitosamente');
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          agent: result.agent,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo información del agente:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getAgentInfo:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener información del agente',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Listar todos los agentes del usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const listAgents = async (req, res) => {
  try {
    console.log('🤖 === SOLICITUD DE LISTA DE AGENTES ===');
    console.log('👤 Usuario:', req.user?.username || 'No autenticado');
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.listAgents();

    if (result.success) {
      console.log(`✅ Agentes obtenidos exitosamente: ${result.count} agentes encontrados`);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          agents: result.agents,
          count: result.count,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo agentes:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en listAgents:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al listar agentes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getPhoneNumbers,
  getAgentInfo,
  listAgents
};

