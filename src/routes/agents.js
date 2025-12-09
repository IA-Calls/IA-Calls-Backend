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

// Middleware para autenticación en rutas de agentes (requerido para multiusuario)
router.use(authenticate);

// GET /api/agents - Listar todos los agentes del usuario autenticado
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

// GET /api/agents/:agentId - Obtener información de un agente específico (requiere autenticación)
router.get('/:agentId', agentsController.getAgentById);

// PATCH /api/agents/:agentId - Actualizar configuración de un agente (requiere autenticación)
router.patch('/:agentId', agentsController.updateAgentById);

// PUT /api/agents/:agentId - Actualizar configuración de un agente (alternativa, mantiene compatibilidad)
router.put('/:agentId', agentsController.updateAgentById);

// DELETE /api/agents/:agentId - Eliminar un agente (requiere autenticación y ownership)
router.delete('/:agentId', agentsController.deleteAgentById);

// POST /api/agents/create-agent - Crear agente fusionando con JSON base (requiere autenticación)
router.post('/create-agent', agentsController.createAgent);

// POST /api/agents/create-with-prompt - Crear agente usando Vertex AI para generar configuración desde un prompt (requiere autenticación)
router.post('/create-with-prompt', agentsController.createAgentWithPrompt);

// POST /api/agents/test-call - Prueba rápida de llamada (requiere autenticación)
router.post('/test-call', agentsController.testCall);

// POST /api/agents/create - Crear un agente manualmente (solo admins, requiere autenticación)
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

module.exports = router;
