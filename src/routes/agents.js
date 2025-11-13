const express = require('express');
const router = express.Router();
const { elevenlabsService } = require('../agents');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authorize');
const agentsController = require('../controllers/agents');

// GET /api/agents/phone-numbers - Obtener números de teléfono disponibles (SIN AUTENTICACIÓN)
router.get('/phone-numbers', async (req, res) => {
  try {
    console.log('📞 === SOLICITUD DE NÚMEROS DE TELÉFONO ===');
    console.log('👤 Usuario: Acceso público (sin autenticación)');
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
});

// GET /api/agents/voices - Obtener voces disponibles (SIN AUTENTICACIÓN)
router.get('/voices', async (req, res) => {
  try {
    console.log('🎤 === SOLICITUD DE VOCES ===');
    console.log('👤 Usuario: Acceso público (sin autenticación)');
    console.log('🕐 Timestamp:', new Date().toISOString());

    const result = await elevenlabsService.getVoices();

    if (result.success) {
      console.log(`✅ Voces obtenidas exitosamente: ${result.count} voces disponibles`);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          voices: result.voices,
          count: result.count,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Error obteniendo voces:', result.error);
      
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error inesperado en getVoices:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener voces',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/agents - Listar todos los agentes (público, sin autenticación)
// IMPORTANTE: Esta ruta debe ir ANTES del middleware de autenticación y antes de /:agentId
router.get('/', agentsController.listAgents);

// GET /api/agents/list - Listar agentes (alternativa, mantiene compatibilidad)
router.get('/list', agentsController.listAgents);

// GET /api/agents/phone-numbers - Obtener números de teléfono (ya está arriba)

// GET /api/agents/test - Probar conexión con ElevenLabs (antes de autenticación)
router.get('/test', async (req, res) => {
  try {
    const testResult = await elevenlabsService.testConnection();
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data || null,
      error: testResult.error || null
    });

  } catch (error) {
    console.error('Error probando conexión con ElevenLabs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/agents/:agentId - Obtener información de un agente específico (público)
// IMPORTANTE: Debe ir después de todas las rutas específicas pero antes del middleware de auth
router.get('/:agentId', agentsController.getAgentById);

// PATCH /api/agents/:agentId - Actualizar configuración de un agente (público)
router.patch('/:agentId', agentsController.updateAgentById);

// PUT /api/agents/:agentId - Actualizar configuración de un agente (alternativa, mantiene compatibilidad)
router.put('/:agentId', agentsController.updateAgentById);

// Middleware para autenticación en todas las demás rutas (después de rutas públicas)
router.use(authenticate);

// DELETE /api/agents/:agentId - Eliminar un agente (solo admins)
router.delete('/:agentId', requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await elevenlabsService.deleteAgent(agentId);
    
    res.json({
      success: result.success,
      error: result.error || null,
      message: result.success ? 'Agente eliminado exitosamente' : 'Error eliminando agente'
    });

  } catch (error) {
    console.error('Error eliminando agente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/agents/create - Crear un agente manualmente (solo admins)
router.post('/create', requireAdmin, async (req, res) => {
  try {
    const agentConfig = req.body;

    const result = await elevenlabsService.createAgent(agentConfig);
    
    res.status(result.success ? 201 : 400).json({
      success: result.success,
      data: result.success ? { agent_id: result.agent_id } : null,
      error: result.error || null,
      message: result.message
    });

  } catch (error) {
    console.error('Error creando agente manualmente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// POST /api/agents/create-agent - Crear agente fusionando con JSON base (público o autenticado según necesidad)
router.post('/create-agent', agentsController.createAgent);

module.exports = router;
