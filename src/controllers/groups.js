const Group = require('../models/Group');
const Client = require('../models/Client');
const FileProcessor = require('../services/fileProcessor');
const { elevenlabsService } = require('../agents');
const User = require('../models/User');
const BatchCall = require('../models/BatchCall');
const CallRecord = require('../models/CallRecord');

// Obtener todos los grupos
const getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, include_clients = false, clientId } = req.query;
    const offset = (page - 1) * limit;

    // Obtener todos los grupos
    const allGroups = await Group.findAll({ 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });

    // Filtrar por clientId si se proporciona
    let filteredGroups = allGroups;
    if (clientId) {
      filteredGroups = allGroups.filter(group => group.createdByClient === clientId);
    }

    // Si se solicita incluir clientes, obtenerlos para cada grupo
    const groupsWithDetails = await Promise.all(
      filteredGroups.map(async (group) => {
        const clientCount = await group.countClients();
        const groupData = {
          ...group.toJSON(),
          clientCount
        };

        if (include_clients === 'true') {
          const clients = await group.getClients({ limit: 5 });
          groupData.recentClients = clients;
        }

        return groupData;
      })
    );

    res.json({
      success: true,
      data: groupsWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredGroups.length,
        totalAllGroups: allGroups.length
      },
      filters: {
        clientId: clientId || null,
        applied: !!clientId
      }
    });
  } catch (error) {
    console.error('Error obteniendo grupos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo grupos',
      error: error.message
    });
  }
};

// Obtener grupo por ID
const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_clients = false, client_page = 1, client_limit = 10 } = req.query;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const groupData = group.toJSON();
    groupData.clientCount = await group.countClients();

    if (include_clients === 'true') {
      const clientOffset = (client_page - 1) * client_limit;
      const clients = await group.getClients({ 
        limit: parseInt(client_limit), 
        offset: parseInt(clientOffset) 
      });
      groupData.clients = clients;
      groupData.clientPagination = {
        page: parseInt(client_page),
        limit: parseInt(client_limit)
      };
    }

    res.json({
      success: true,
      data: groupData
    });
  } catch (error) {
    console.error('Error obteniendo grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo grupo',
      error: error.message
    });
  }
};

// Crear nuevo grupo
const createGroup = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      prompt, 
      color, 
      favorite, 
      idioma, 
      variables, 
      base64, 
      document_name, 
      clientId,
      prefix,
      selectedCountryCode,
      firstMessage,
      phoneNumberId,
      agentId  // NUEVO: ID del agente de ElevenLabs a asignar
    } = req.body;
    const { logActivity } = require('../utils/helpers');
    
    console.log('📋 Datos recibidos en createGroup:');
    console.log('   - clientId del body:', clientId);
    console.log('   - req.user?.id:', req.user?.id);
    console.log('   - document_name:', document_name);
    console.log('   - prefix:', prefix);
    console.log('   - selectedCountryCode:', selectedCountryCode);
    console.log('   - phoneNumberId:', phoneNumberId);
    console.log('   - agentId:', agentId);
    
    // Usar clientId del body o del usuario autenticado
    const createdBy = parseInt(clientId) || req.user?.id;
    
    console.log('   - createdBy final:', createdBy);
    
    if (!createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere clientId o usuario autenticado'
      });
    }

    // Verificar si el ID existe en la tabla de usuarios
    const User = require('../models/User');
    const userExists = await User.findById(createdBy);
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: 'El usuario especificado no existe'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del grupo es requerido'
      });
    }

    // Validar que el agente existe si se proporciona
    if (agentId) {
      console.log(`🔍 Validando existencia del agente ${agentId}...`);
      const agentResult = await elevenlabsService.getAgent(agentId);
      
      if (!agentResult.success) {
        return res.status(400).json({
          success: false,
          message: 'El agente especificado no existe o no es accesible',
          error: agentResult.error
        });
      }
      
      console.log(`✅ Agente ${agentId} validado exitosamente`);
    } else {
      console.log('⚠️ No se proporcionó agentId - el grupo se creará sin agente asignado');
    }

    const groupData = {
      name,
      description,
      prompt,
      color,
      favorite: favorite || false,
      idioma: idioma || 'es',
      variables: variables || {},
      createdBy, // ID del usuario que crea el grupo
      createdByClient: null, // No hay cliente asociado inicialmente
      prefix: prefix || '+57',
      selectedCountryCode: selectedCountryCode || 'CO',
      firstMessage,
      phoneNumberId,
      agentId // NUEVO: Asignar agente directamente al grupo
    };

    // Crear el grupo
    const group = await Group.create(groupData);
    const groupId = group.id;

    let processingResult = null;
    let createdClients = [];
    let gcpUploadResult = null;

    // Procesar archivo si se proporciona base64 y document_name
    if (base64 && document_name) {
      try {
        console.log('Procesando archivo adjunto...');
        
        // Procesar el archivo y extraer datos
        processingResult = await FileProcessor.processFile(base64, document_name);
        
        if (processingResult.success && processingResult.clientsData.length > 0) {
          console.log(`Procesados ${processingResult.clientsData.length} clientes del archivo`);
          
          // Crear todos los clientes en carga masiva (sin verificar duplicados)
          const newClients = await Client.createBatch(processingResult.clientsData, 100);
          
          if (newClients.length > 0) {
            // Extraer IDs de los clientes creados
            const clientIds = newClients.map(client => client.id);
            
            // Asignar todos los clientes al grupo en carga masiva
            const assignedCount = await group.addClientsBatch(clientIds, createdBy, 100);
            
            console.log(`Asignados ${assignedCount} clientes al grupo ${groupId}`);
            
            // Agregar clientes creados a la respuesta
            createdClients = newClients.map(client => client.toJSON());

            // Subir archivo original según el entorno
            try {
              const { uploadDocumentToGCP, saveDocumentLocally } = require('../utils/helpers');
              const GCPDocument = require('../models/GCPDocument');
              
              if (process.env.NODE_ENV === 'production') {
                console.log('☁️ Subiendo archivo original a GCP...');
                gcpUploadResult = await uploadDocumentToGCP(base64, document_name, {
                  groupId: groupId,
                  groupName: name,
                  totalClients: newClients.length,
                  documentType: 'original_upload',
                  source: 'group_creation',
                  processedClients: newClients.length
                });
              } else {
                console.log('📁 Guardando archivo original localmente...');
                gcpUploadResult = await saveDocumentLocally(base64, document_name, {
                  groupId: groupId,
                  groupName: name,
                  totalClients: newClients.length,
                  documentType: 'original_upload',
                  source: 'group_creation',
                  processedClients: newClients.length
                });
              }
              
              console.log('💾 Guardando documento original en BD con uploadedBy:', createdBy);
              
              // Guardar en base de datos
              const savedDocument = await GCPDocument.create({
                fileName: gcpUploadResult.fileName,
                originalName: gcpUploadResult.originalName,
                bucketUrl: gcpUploadResult.bucketUrl,
                publicUrl: gcpUploadResult.publicUrl,
                downloadUrl: gcpUploadResult.downloadUrl,
                fileSize: gcpUploadResult.size,
                contentType: gcpUploadResult.contentType,
                documentType: 'original_upload',
                groupId: groupId,
                uploadedBy: createdBy, // Usar el clientId real
                metadata: {
                  groupName: name,
                  totalClients: newClients.length,
                  source: 'group_creation',
                  processedClients: newClients.length,
                  clientId: createdBy // Agregar clientId al metadata
                }
              });
              
              console.log('Archivo original subido a GCP y guardado en BD exitosamente');
            } catch (gcpError) {
              console.error('Error subiendo archivo original a GCP:', gcpError);
              // Continuar sin fallar si hay error en GCP
            }


          }
        }
        
      } catch (fileError) {
        console.error('Error procesando archivo:', fileError);
        // Continuar con la creación del grupo aunque falle el procesamiento del archivo
      }
    }

    // Preparar respuesta
    const response = {
      success: true,
      message: 'Grupo creado exitosamente',
      data: {
        ...group.toJSON(),
        fileProcessing: processingResult ? {
          processed: true,
          totalClientsFound: processingResult.clientsData.length,
          clientsCreated: createdClients.length,
          processedFile: processingResult.processedFile
        } : {
          processed: false
        },
        gcpStorage: gcpUploadResult ? {
          uploaded: true,
          originalFile: gcpUploadResult
        } : {
          uploaded: false
        }
      }
    };

    // Agregar información de clientes creados si hay alguno
    if (createdClients.length > 0) {
      response.data.createdClients = createdClients;
    }

    // Registrar log de actividad
    await logActivity(createdBy, 'create_group', `Grupo "${name}" creado exitosamente`, req, {
      groupId: group.id,
      groupName: name,
      hasFile: !!base64,
      clientsCreated: createdClients.length,
      variables: variables
    });

    res.status(201).json(response);
    
  } catch (error) {
    console.error('Error creando grupo:', error);
    
    // Registrar log de error
    const errorCreatedBy = parseInt(req.body.clientId) || req.user?.id;
    if (errorCreatedBy) {
      try {
        await logActivity(errorCreatedBy, 'create_group_error', `Error creando grupo "${req.body.name || 'sin nombre'}"`, req, {
          error: error.message,
          groupName: req.body.name
        });
      } catch (logError) {
        console.error('Error registrando log de actividad:', logError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creando grupo',
      error: error.message
    });
  }
};

// Actualizar grupo
const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, prompt, color, favorite } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    await group.update({ name, description, prompt, color, favorite });

    res.json({
      success: true,
      message: 'Grupo actualizado exitosamente',
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error actualizando grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando grupo',
      error: error.message
    });
  }
};

// Eliminar grupo
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    await group.delete();

    res.json({
      success: true,
      message: 'Grupo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando grupo',
      error: error.message
    });
  }
};

// Agregar cliente al grupo
const addClientToGroup = async (req, res) => {
  try {
    const { id } = req.params; // ID del grupo
    const { client_id } = req.body;
    const assignedBy = req.user?.id || 1;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: 'ID del cliente es requerido'
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const client = await Client.findById(client_id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const result = await group.addClient(client_id, assignedBy);

    res.json({
      success: true,
      message: result ? 'Cliente agregado al grupo exitosamente' : 'Cliente ya está en el grupo',
      data: result
    });
  } catch (error) {
    console.error('Error agregando cliente al grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando cliente al grupo',
      error: error.message
    });
  }
};

// Remover cliente del grupo
const removeClientFromGroup = async (req, res) => {
  try {
    const { id, client_id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const result = await group.removeClient(client_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no está en el grupo'
      });
    }

    res.json({
      success: true,
      message: 'Cliente removido del grupo exitosamente'
    });
  } catch (error) {
    console.error('Error removiendo cliente del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error removiendo cliente del grupo',
      error: error.message
    });
  }
};

// Actualizar cliente en el grupo
const updateClientInGroup = async (req, res) => {
  try {
    const { id, client_id } = req.params;
    const updateData = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Verificar que el cliente esté en el grupo
    const clientInGroup = await group.getClients({ limit: 1000 });
    const clientExists = clientInGroup.find(client => client.id === parseInt(client_id));
    
    if (!clientExists) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no está en el grupo'
      });
    }

    // Actualizar el cliente
    const client = await Client.findById(client_id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await client.update(updateData);

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: client.toJSON()
    });
  } catch (error) {
    console.error('Error actualizando cliente en el grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando cliente en el grupo',
      error: error.message
    });
  }
};

// Obtener cliente específico del grupo
const getClientInGroup = async (req, res) => {
  try {
    const { id, client_id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Obtener todos los clientes del grupo
    const clients = await group.getClients({ limit: 1000 });
    const client = clients.find(c => c.id === parseInt(client_id));
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no está en el grupo'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error obteniendo cliente del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo cliente del grupo',
      error: error.message
    });
  }
};

// Descargar archivo procesado desde GCP
const downloadProcessedFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del archivo es requerido'
      });
    }

    // Usar el servicio de storage para generar URL de descarga desde GCP
    const storageService = require('../services/storage');
    
    try {
      // Generar URL de descarga válida por 1 hora
      const urlResult = await storageService.generateDownloadUrl(fileName, 1);
      
      if (urlResult.success) {
        // Redirigir al usuario a la URL de descarga de GCP
        res.redirect(urlResult.downloadUrl);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado en GCP'
        });
      }
      
    } catch (storageError) {
      console.error('Error accediendo a GCP:', storageError);
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado o error accediendo al almacenamiento'
      });
    }
    
  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error descargando archivo',
      error: error.message
    });
  }
};

// Preparar agente con información del grupo
const prepareAgent = async (req, res) => {
  try {
    const { id } = req.params; // ID del grupo
    const { userId } = req.body; // ID del usuario desde el body

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido en el body de la petición'
      });
    }

    // Obtener el grupo
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Obtener el usuario para acceder a su agente
    const user = await User.findById(userId);
    if (!user || !user.agentId) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o no tiene un agente asignado'
      });
    }

    console.log(`🤖 Preparando agente ${user.agentId} para el grupo "${group.name}"`);
    console.log(`📝 First Message del grupo: ${group.firstMessage || 'No configurado'}`);

    // Construir el prompt personalizado con información del grupo
    const customPrompt = buildGroupPrompt(group, user);

    console.log('📋 Prompt personalizado:', customPrompt);

    // Preparar configuración del agente
    const agentConfig = {
      language: group.idioma || "es",
      prompt: {
        prompt: customPrompt,
        llm: "gpt-4o-mini", // LLM requerido
        temperature: 0.7,   // Temperatura por defecto
        max_tokens: 1000    // Tokens máximos por defecto
      }
    };

    // Agregar first_message si está configurado en el grupo
    if (group.firstMessage && group.firstMessage.trim() !== '') {
      agentConfig.first_message = group.firstMessage.trim();
      console.log(`✅ Agregando first_message: "${group.firstMessage}"`);
    } else {
      console.log(`ℹ️ No se configuró first_message en el grupo`);
    }

    // Actualizar el agente en ElevenLabs con payload correcto
    const updateData = {
      conversation_config: {
        tts: {
          voice_id: "pNInz6obpgDQGcFmaJgB", // Adam - voz que sabemos que funciona
          model_id: "eleven_turbo_v2_5" // Requerido para agentes no-inglés
        },
        conversation: {
          text_only: false
        },
        agent: agentConfig
      },
      name: `Agente ${user.firstName || user.username} - ${group.name}`,
      tags: [
        "ia-calls", 
        "grupo", 
        group.name.toLowerCase().replace(/\s+/g, '-'),
        user.username,
        "preparado"
      ]
    };

    const updateResult = await elevenlabsService.updateAgent(user.agentId, updateData);

    if (updateResult.success) {
      console.log(`✅ Agente ${user.agentId} preparado exitosamente para el grupo "${group.name}"`);
      
      res.json({
        success: true,
        message: `Agente preparado exitosamente para el grupo "${group.name}"`,
        data: {
          agentId: user.agentId,
          groupId: group.id,
          groupName: group.name,
          customPrompt: customPrompt,
          firstMessage: group.firstMessage || null,
          hasFirstMessage: !!(group.firstMessage && group.firstMessage.trim() !== ''),
          updatedAgent: updateResult.data
        }
      });
    } else {
      console.error(`❌ Error preparando agente: ${updateResult.error}`);
      
      res.status(400).json({
        success: false,
        message: 'Error preparando el agente',
        error: updateResult.error
      });
    }

  } catch (error) {
    console.error('Error preparando agente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Función auxiliar para construir el prompt personalizado
function buildGroupPrompt(group, user) {
  const userName = user.firstName || user.username;
  const groupName = group.name;
  const groupDescription = group.description || 'Sin descripción específica';
  const groupPrompt = group.prompt || '';
  const groupVariables = group.variables || {};

  // Prompt base
  let customPrompt = `Eres el asistente personal de ${userName} en IA-Calls, especializado en el grupo "${groupName}".

INFORMACIÓN DEL GRUPO:
- Nombre: ${groupName}
- Descripción: ${groupDescription}`;

  // Agregar prompt específico del grupo si existe
  if (groupPrompt) {
    customPrompt += `
- Instrucciones específicas: ${groupPrompt}`;
  }

  // Agregar variables del grupo si existen
  if (Object.keys(groupVariables).length > 0) {
    customPrompt += `
- Variables del grupo:`;
    for (const [key, value] of Object.entries(groupVariables)) {
      customPrompt += `
  * ${key}: ${value}`;
    }
  }

  // Instrucciones generales
  customPrompt += `

INSTRUCCIONES:
1. Actúa como un experto en el contexto de este grupo específico
2. Usa la información y descripción del grupo para personalizar tus respuestas
3. Mantén un tono profesional y amigable
4. Si hay instrucciones específicas del grupo, síguelas prioritariamente
5. Ayuda con tareas relacionadas con IA-Calls y este grupo en particular
6. Si no tienes información específica, pregunta por más detalles

Responde siempre en español y mantén el contexto del grupo "${groupName}" en todas tus interacciones.`;

  return customPrompt;
}

// ===== BATCH CALLING FUNCTIONS =====

// Función auxiliar para enriquecer datos del batch call con transcripciones y audios
const enrichBatchCallData = async (batchData, userId = null) => {
  try {
    console.log(`🔍 Enriqueciendo datos del batch call...`);
    
    const enrichedData = { ...batchData };
    
    // 🔄 TRACKING: Buscar o crear registro del batch call
    let batchCallRecord = null;
    try {
      batchCallRecord = await BatchCall.findByBatchId(batchData.id);
      if (batchCallRecord) {
        console.log(`📝 Batch call record encontrado: ${batchCallRecord.id}`);
        
        // Actualizar estado del batch
        await batchCallRecord.updateStatus({
          status: batchData.status,
          completed_calls: batchData.recipients?.filter(r => r.status === 'completed').length || 0,
          failed_calls: batchData.recipients?.filter(r => r.status === 'failed').length || 0,
          completed_at: batchData.status === 'completed' ? new Date() : null
        });
      } else {
        console.log(`⚠️ No se encontró registro del batch call: ${batchData.id}`);
      }
    } catch (trackingError) {
      console.error('⚠️ Error actualizando batch tracking:', trackingError);
    }
    
    if (batchData.recipients && batchData.recipients.length > 0) {
      console.log(`📝 Procesando ${batchData.recipients.length} destinatarios para transcripciones...`);
      
      // Procesar cada recipient para obtener transcripciones y audios
      enrichedData.recipients = await Promise.all(
        batchData.recipients.map(async (recipient) => {
          const enrichedRecipient = { ...recipient };
          
          // Solo procesar si tiene conversation_id y está completado
          if (recipient.conversation_id && recipient.status === 'completed') {
            console.log(`📝 Obteniendo detalles para conversación: ${recipient.conversation_id}`);
            
            try {
              // Obtener detalles de la conversación (transcripción, análisis, metadata)
              const conversationResult = await elevenlabsService.getConversationDetails(recipient.conversation_id);
              
              if (conversationResult.success) {
                const conversationData = conversationResult.data;
                
                // Extraer datos relevantes según la especificación
                enrichedRecipient.summary = conversationData.analysis?.transcript_summary || null;
                enrichedRecipient.duration_secs = conversationData.metadata?.call_duration_secs || null;
                
                // Extraer transcript simplificado (solo role y message)
                if (conversationData.transcript && Array.isArray(conversationData.transcript)) {
                  enrichedRecipient.transcript = conversationData.transcript.map(entry => ({
                    role: entry.role,
                    message: entry.message
                  }));
                }
                
                console.log(`✅ Detalles obtenidos para ${recipient.phone_number}`);
              } else {
                console.log(`⚠️ No se pudieron obtener detalles para ${recipient.phone_number}: ${conversationResult.error}`);
              }
              
              // Descargar audio y subirlo a GCS
              // Usar el userId pasado como parámetro o extraer de metadatos
              const userIdForAudio = userId || batchData.user_id || 'unknown';
              
              const audioResult = await elevenlabsService.downloadAndUploadConversationAudio(
                recipient.conversation_id, 
                userIdForAudio
              );
              
              if (audioResult.success) {
                enrichedRecipient.audio_url = audioResult.data.gcs_url;
                enrichedRecipient.audio_file_name = audioResult.data.gcs_file_name;
                enrichedRecipient.audio_size = audioResult.data.size;
                enrichedRecipient.audio_content_type = audioResult.data.content_type;
                enrichedRecipient.uploaded_at = audioResult.data.uploaded_at;
                console.log(`🎵 Audio descargado y subido a GCS para ${recipient.phone_number} (${audioResult.data.size} bytes)`);
              } else {
                console.log(`⚠️ No se pudo descargar/subir audio para ${recipient.phone_number}: ${audioResult.error}`);
              }
              
            } catch (error) {
              console.error(`❌ Error procesando conversación ${recipient.conversation_id}:`, error);
            }
          }
          
          // 🔄 TRACKING: Actualizar registro individual de la llamada
          if (batchCallRecord) {
            try {
              await CallRecord.updateByPhoneAndBatch(batchCallRecord.id, recipient.phone_number, {
                recipient_id: recipient.id,
                conversation_id: recipient.conversation_id,
                status: recipient.status,
                call_duration_secs: enrichedRecipient.duration_secs,
                transcript_summary: enrichedRecipient.summary,
                full_transcript: enrichedRecipient.transcript,
                audio_url: enrichedRecipient.audio_url,
                audio_file_name: enrichedRecipient.audio_file_name,
                audio_size: enrichedRecipient.audio_size,
                audio_content_type: enrichedRecipient.audio_content_type,
                audio_uploaded_at: enrichedRecipient.uploaded_at,
                call_ended_at: recipient.status === 'completed' ? new Date() : null
              });
            } catch (trackingError) {
              console.error(`⚠️ Error actualizando call record para ${recipient.phone_number}:`, trackingError);
            }
          }
          
          return enrichedRecipient;
        })
      );
      
      console.log(`✅ Procesamiento de transcripciones completado`);
    }
    
    return enrichedData;
    
  } catch (error) {
    console.error('❌ Error enriqueciendo datos del batch call:', error);
    // En caso de error, retornar los datos originales
    return batchData;
  }
};

// Iniciar llamadas en masa para un grupo
const startBatchCall = async (req, res) => {
  try {
    const { id } = req.params; // ID del grupo
    const { userId, agentPhoneNumberId, scheduledTimeUnix = null } = req.body;

    console.log(`🔍 === INICIO DEBUG BATCH CALL ===`);
    console.log(`📋 Request params:`, req.params);
    console.log(`📋 Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`📋 Grupo ID: ${id}`);
    console.log(`📋 User ID: ${userId}`);
    console.log(`📋 Agent Phone Number ID: ${agentPhoneNumberId}`);
    console.log(`📋 Scheduled Time: ${scheduledTimeUnix}`);

    if (!userId) {
      console.error('❌ Error: userId no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'ID de usuario es requerido en el body de la petición'
      });
    }

    // Obtener el grupo primero para verificar si tiene phoneNumberId configurado
    console.log(`🔍 Buscando grupo con ID: ${id}`);
    const group = await Group.findById(id);
    if (!group) {
      console.error(`❌ Error: Grupo con ID ${id} no encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }
    console.log(`✅ Grupo encontrado: "${group.name}"`);
    console.log(`📱 Phone Number ID del grupo: ${group.phoneNumberId || 'No configurado'}`);
    console.log(`📱 Phone Number ID del body: ${agentPhoneNumberId || 'No proporcionado'}`);

    // Usar el phone_number_id del grupo si está disponible, sino el del body
    let finalPhoneNumberId = group.phoneNumberId || agentPhoneNumberId;
    
    // Si hay un phone_number_id, loggearlo para debugging
    if (finalPhoneNumberId) {
      console.log(`📱 Phone Number ID final a usar: ${finalPhoneNumberId}`);
    }
    
    // Si no hay phoneNumberId, obtener uno disponible de ElevenLabs
    if (!finalPhoneNumberId) {
      console.log('⚠️ No se proporcionó phoneNumberId, obteniendo uno disponible de ElevenLabs...');
      try {
        const phoneResult = await elevenlabsService.getPhoneNumbers();
        if (phoneResult.success && phoneResult.phoneNumbers && phoneResult.phoneNumbers.length > 0) {
          // Obtener el phone_number_id usando el campo normalizado
          const selectedPhone = phoneResult.phoneNumbers[0];
          finalPhoneNumberId = selectedPhone.phone_number_id || selectedPhone.id;
          
          console.log(`📋 Estructura del número seleccionado:`, JSON.stringify(selectedPhone, null, 2));
          console.log(`✅ Usando número disponible con ID: ${finalPhoneNumberId}`);
          
          // Actualizar el grupo con el phoneNumberId obtenido
          await group.update({ phoneNumberId: finalPhoneNumberId });
          console.log(`💾 Grupo actualizado con phoneNumberId: ${finalPhoneNumberId}`);
        } else {
          throw new Error('No hay números de teléfono disponibles en ElevenLabs');
        }
      } catch (phoneError) {
        console.error('❌ Error obteniendo números de ElevenLabs:', phoneError);
        return res.status(400).json({
          success: false,
          message: 'No hay números de teléfono disponibles. Por favor, configura un phoneNumberId.',
          error: phoneError.message
        });
      }
    }

    // El grupo ya fue obtenido anteriormente, no necesitamos buscarlo de nuevo
    console.log(`✅ Usando grupo ya obtenido: "${group.name}"`);

    // Verificar que el grupo tiene un agente asignado
    if (!group.agentId) {
      console.error(`❌ Error: El grupo "${group.name}" no tiene un agente asignado`);
      return res.status(400).json({
        success: false,
        message: 'El grupo no tiene un agente asignado. Por favor, asigna un agente al crear el grupo.'
      });
    }
    console.log(`✅ Grupo tiene agente asignado: ${group.agentId}`);

    // ⚠️ VALIDACIÓN CRÍTICA: Verificar configuración del agente antes de iniciar llamadas
    console.log(`🔍 Verificando configuración del agente ${group.agentId}...`);
    try {
      const agentInfo = await elevenlabsService.getAgent(group.agentId);
      
      if (!agentInfo.success || !agentInfo.data) {
        console.error(`❌ Error: No se pudo obtener información del agente ${group.agentId}`);
        return res.status(400).json({
          success: false,
          message: 'No se pudo verificar la configuración del agente. Por favor, verifica que el agente existe y está configurado correctamente.'
        });
      }

      const agentConfig = agentInfo.data.conversation_config;
      const turnTimeout = agentConfig?.turn?.turn_timeout;
      const firstMessage = agentConfig?.agent?.first_message;
      
      console.log(`📋 Configuración del agente:`);
      console.log(`   - turn_timeout: ${turnTimeout || 'NO CONFIGURADO'}`);
      console.log(`   - first_message: ${firstMessage ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
      
      // Advertir si el turn_timeout es muy corto
      if (turnTimeout && turnTimeout < 15) {
        console.warn(`⚠️ ADVERTENCIA: turn_timeout es muy corto (${turnTimeout}s). Se recomienda al menos 15 segundos para evitar que las llamadas se cuelguen.`);
        console.warn(`   💡 Considera actualizar el agente con un turn_timeout mayor (15-30 segundos).`);
      }
      
      // Advertir si no hay first_message
      if (!firstMessage || firstMessage.trim() === '') {
        console.warn(`⚠️ ADVERTENCIA: El agente no tiene un first_message configurado.`);
        console.warn(`   💡 Esto puede causar que las llamadas se cuelguen inmediatamente.`);
      }
      
    } catch (agentCheckError) {
      console.error(`❌ Error verificando configuración del agente:`, agentCheckError.message);
      // No fallar la llamada, solo advertir
      console.warn(`⚠️ Continuando con la llamada, pero puede haber problemas si el agente no está bien configurado.`);
    }

    // Verificar que el usuario existe (para tracking)
    console.log(`🔍 Buscando usuario con ID: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ Error: Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    console.log(`✅ Usuario encontrado: "${user.username}"`);

    console.log(`📞 Iniciando batch call para el grupo "${group.name}"`);
    console.log(`🤖 Agente del grupo: ${group.agentId}`);
    console.log(`👤 Usuario: ${user.username}`);

    // Obtener los clientes del grupo
    console.log(`🔍 Obteniendo clientes del grupo...`);
    const clients = await group.getClients();
    console.log(`📊 Clientes obtenidos:`, clients ? clients.length : 0);
    
    if (!clients || clients.length === 0) {
      console.error(`❌ Error: El grupo "${group.name}" no tiene clientes asignados`);
      return res.status(400).json({
        success: false,
        message: 'El grupo no tiene clientes asignados para llamar'
      });
    }

    console.log('👥 Clientes encontrados:');
    console.log(JSON.stringify(clients.slice(0, 3), null, 2));


    // Preparar los destinatarios para ElevenLabs
    const recipients = clients
      .filter(client => client.phone) // Solo clientes con teléfono
      .map(client => {
        // Limpiar y formatear número telefónico
        let phoneNumber = client.phone.toString().trim();
        
        // Remover caracteres no numéricos excepto el +
        phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
        
        // Usar el prefijo del grupo en lugar del +57 quemado
        const groupPrefix = group.prefix || '+57';
        const countryCode = group.selectedCountryCode || 'CO';
        
        console.log(`🌍 Usando prefijo del grupo: ${groupPrefix} (${countryCode})`);
        
        // Si no tiene código de país, agregar el prefijo del grupo
        if (!phoneNumber.startsWith('+')) {
          // Si empieza con el código de país sin +, agregar solo el +
          const prefixWithoutPlus = groupPrefix.replace('+', '');
          if (phoneNumber.startsWith(prefixWithoutPlus)) {
            phoneNumber = '+' + phoneNumber;
          } else {
            // Si no tiene código de país, agregar el prefijo del grupo
            phoneNumber = groupPrefix + phoneNumber;
          }
        }
        
        console.log(`📱 Número formateado: ${client.phone} → ${phoneNumber} (prefijo: ${groupPrefix})`);
        
        return {
          phone_number: phoneNumber,
          variables: {
            name: client.name || 'Cliente',
            email: client.email || '',
            company: client.company || '',
            position: client.position || '',
            // Agregar variables del grupo si existen
            ...group.variables || {}
          }
        };
      });

    if (recipients.length === 0) {
      console.error(`❌ Error: No hay destinatarios válidos con teléfonos`);
      return res.status(400).json({
        success: false,
        message: 'No se encontraron clientes con números telefónicos válidos en el grupo'
      });
    }

    console.log(`📱 Destinatarios válidos: ${recipients.length}`);
    console.log(`📋 Primeros 2 destinatarios:`, recipients.slice(0, 2));

    // Preparar datos del batch call
    const batchData = {
      callName: `Llamada ${group.name} - ${new Date().toLocaleDateString('es-ES')}`,
      agentId: group.agentId, // NUEVO: Usar el agentId del grupo en lugar del del usuario
      agentPhoneNumberId: finalPhoneNumberId,
      recipients: recipients,
      scheduledTimeUnix: scheduledTimeUnix
    };

    console.log(`🚀 Preparando batch call con datos:`);
    console.log(`   📞 Nombre: ${batchData.callName}`);
    console.log(`   🤖 Agente ID: ${batchData.agentId}`);
    console.log(`   📱 Phone Number ID: ${batchData.agentPhoneNumberId} (${group.phoneNumberId ? 'del grupo' : 'del body'})`);
    console.log(`   👥 Destinatarios: ${batchData.recipients.length}`);
    console.log(`   ⏰ Programado: ${batchData.scheduledTimeUnix || 'Inmediato'}`);

    // Iniciar el batch call en ElevenLabs
    console.log(`🔄 Enviando batch call a ElevenLabs...`);
    const batchResult = await elevenlabsService.submitBatchCall(batchData);

    if (batchResult.success) {
      console.log(`✅ Batch call iniciado exitosamente para el grupo "${group.name}"`);
      
      const batchId = batchResult.data.batch_id || batchResult.data.id;
      
      try {
        console.log(`📝 === GUARDANDO TRACKING OPTIMIZADO ===`);
        
        // FLUJO OPTIMIZADO: Guardar directamente en la tabla groups
        await group.startBatchCall(batchId, recipients.length, {
          agent_phone_number_id: finalPhoneNumberId,
          scheduled_time_unix: scheduledTimeUnix,
          elevenlabs_response: batchResult.data,
          call_name: batchData.callName,
          agent_id: group.agentId, // NUEVO: Usar el agentId del grupo
          user_id: user.id
        });
        
        console.log(`✅ Tracking optimizado guardado en grupo ${group.id}`);
        
      } catch (trackingError) {
        console.error('⚠️ Error guardando tracking (no crítico):', trackingError);
        // No fallar la respuesta por errores de tracking
      }
      
      res.json({
        success: true,
        message: `Llamadas iniciadas exitosamente para el grupo "${group.name}"`,
        data: {
          batchId: batchId,
          groupId: group.id,
          groupName: group.name,
          agentId: group.agentId, // NUEVO: Usar el agentId del grupo
          recipientsCount: recipients.length,
          callName: batchData.callName,
          batchData: batchResult.data
        }
      });
    } else {
      console.error(`❌ Error iniciando batch call: ${batchResult.error}`);
      
      res.status(400).json({
        success: false,
        message: 'Error iniciando las llamadas',
        error: batchResult.error
      });
    }

  } catch (error) {
    console.error('❌ === ERROR EN BATCH CALL ===');
    console.error('❌ Error completo:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Mensaje:', error.message);
    console.error('❌ === FIN ERROR ===');
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Consultar estado de un batch call (FLUJO OPTIMIZADO)
const getBatchCallStatus = async (req, res) => {
  try {
    const { batchId, id } = req.params; // id es opcional (para rutas con grupo)
    const { userId } = req.query; // Permitir pasar userId como query parameter

    console.log(`📊 Consultando estado del batch call: ${batchId}`);
    if (id) {
      console.log(`📋 Grupo especificado: ${id}`);
    }
    if (userId) {
      console.log(`👤 Usuario especificado para audios: ${userId}`);
    }

    // Si se especifica un grupo, verificar que existe
    let group = null;
    if (id) {
      group = await Group.findById(id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grupo no encontrado'
        });
      }
    }

    const statusResult = await elevenlabsService.getBatchCallStatus(batchId);

    if (statusResult.success) {
      console.log(`✅ Estado del batch call obtenido, sincronizando con grupo...`);
      
      // FLUJO OPTIMIZADO: Sincronizar automáticamente con la tabla groups
      try {
        const groupToSync = group || await Group.findByBatchId(batchId);
        if (groupToSync) {
          console.log(`📝 Sincronizando estado con grupo ${groupToSync.id}`);
          await groupToSync.updateBatchStatus(statusResult.data);
        }
      } catch (syncError) {
        console.error('⚠️ Error sincronizando con grupo (no crítico):', syncError);
      }
      
      // Preparar datos de respuesta
      const responseData = {
        ...statusResult.data,
        environment: statusResult.environment || 'production',
        timestamp: new Date().toISOString()
      };
      
      // Si se especificó un grupo, incluir información adicional
      if (group) {
        responseData.groupId = id;
        responseData.groupName = group.name;
      }
      
      res.json({
        success: true,
        message: 'Estado del batch call obtenido exitosamente',
        data: responseData
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error consultando el estado del batch call',
        error: statusResult.error
      });
    }

  } catch (error) {
    console.error('Error consultando estado del batch call:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Consultar estado de un batch call con Server-Sent Events (SSE)
const getBatchCallStatusSSE = async (req, res) => {
  const { batchId } = req.params;
  const { userId } = req.query; // Permitir pasar userId como query parameter
  
  console.log(`📊 Iniciando SSE para batch call: ${batchId}`);
  if (userId) {
    console.log(`👤 Usuario especificado para audios: ${userId}`);
  }

  // Configurar headers para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Función para enviar datos al cliente
  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Enviar evento inicial de conexión
  sendEvent('connected', {
    message: 'Conexión SSE establecida',
    batchId: batchId,
    timestamp: new Date().toISOString()
  });

  let intervalId;
  let lastStatus = null;

  // Función para consultar el estado
  const checkBatchStatus = async () => {
    try {
      console.log(`🔄 Consultando estado SSE para batch: ${batchId}`);
      
      const statusResult = await elevenlabsService.getBatchCallStatus(batchId);

      if (statusResult.success) {
        console.log(`✅ Estado SSE obtenido, enriqueciendo datos...`);
        
        // Enriquecer datos con transcripciones y audios
        const enrichedData = await enrichBatchCallData(statusResult.data, userId);
        
        // Solo enviar si hay cambios o es la primera consulta
        if (!lastStatus || JSON.stringify(enrichedData) !== JSON.stringify(lastStatus)) {
          console.log(`📡 Enviando actualización SSE enriquecida para batch: ${batchId}`);
          
          sendEvent('status-update', {
            success: true,
            data: enrichedData,
            timestamp: new Date().toISOString()
          });

          lastStatus = enrichedData;

          // Si el batch está completado, cancelado o falló, detener el monitoreo
          if (['completed', 'cancelled', 'failed'].includes(enrichedData.status)) {
            console.log(`✅ Batch ${batchId} finalizado con estado: ${enrichedData.status}`);
            
            sendEvent('batch-completed', {
              message: `Batch call ${enrichedData.status}`,
              finalStatus: enrichedData.status,
              data: enrichedData,
              timestamp: new Date().toISOString()
            });

            // Detener el intervalo después de un breve delay
            setTimeout(() => {
              clearInterval(intervalId);
              res.end();
            }, 2000);
          }
        }
      } else {
        console.error(`❌ Error consultando estado SSE: ${statusResult.error}`);
        
        sendEvent('error', {
          success: false,
          message: 'Error consultando el estado del batch call',
          error: statusResult.error,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error en SSE:', error);
      
      sendEvent('error', {
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Realizar primera consulta inmediatamente
  await checkBatchStatus();

  // Configurar intervalo para consultas periódicas (cada 3 segundos)
  intervalId = setInterval(checkBatchStatus, 3000);

  // Manejar desconexión del cliente
  req.on('close', () => {
    console.log(`🔌 Cliente desconectado de SSE para batch: ${batchId}`);
    clearInterval(intervalId);
    res.end();
  });

  req.on('aborted', () => {
    console.log(`❌ Conexión SSE abortada para batch: ${batchId}`);
    clearInterval(intervalId);
    res.end();
  });

  // Timeout de seguridad (30 minutos máximo)
  setTimeout(() => {
    console.log(`⏰ Timeout SSE para batch: ${batchId}`);
    sendEvent('timeout', {
      message: 'Conexión SSE cerrada por timeout',
      timestamp: new Date().toISOString()
    });
    clearInterval(intervalId);
    res.end();
  }, 30 * 60 * 1000); // 30 minutos
};

// Listar todos los batch calls
const listBatchCalls = async (req, res) => {
  try {
    console.log('📋 Listando batch calls...');

    const listResult = await elevenlabsService.listBatchCalls();

    if (listResult.success) {
      res.json({
        success: true,
        message: 'Lista de batch calls obtenida exitosamente',
        data: listResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error listando batch calls',
        error: listResult.error
      });
    }

  } catch (error) {
    console.error('Error listando batch calls:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Reintentar batch call
const retryBatchCall = async (req, res) => {
  try {
    const { batchId } = req.params;

    console.log(`🔄 Reintentando batch call: ${batchId}`);

    const retryResult = await elevenlabsService.retryBatchCall(batchId);

    if (retryResult.success) {
      res.json({
        success: true,
        message: 'Batch call reintentado exitosamente',
        data: retryResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error reintentando batch call',
        error: retryResult.error
      });
    }

  } catch (error) {
    console.error('Error reintentando batch call:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Cancelar batch call
const cancelBatchCall = async (req, res) => {
  try {
    const { batchId } = req.params;

    console.log(`❌ Cancelando batch call: ${batchId}`);

    const cancelResult = await elevenlabsService.cancelBatchCall(batchId);

    if (cancelResult.success) {
      res.json({
        success: true,
        message: 'Batch call cancelado exitosamente',
        data: cancelResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error cancelando batch call',
        error: cancelResult.error
      });
    }

  } catch (error) {
    console.error('Error cancelando batch call:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Listar audios de conversaciones de un usuario
const listUserConversationAudios = async (req, res) => {
  try {
    const { userId } = req.params;
    const { maxResults = 50 } = req.query;

    console.log(`🎵 Listando audios de conversaciones para usuario: ${userId}`);

    const storageService = require('../services/storage');
    const audioList = await storageService.listConversationAudios(userId, parseInt(maxResults));

    if (audioList.success) {
      console.log(`✅ Se encontraron ${audioList.total} audios para el usuario ${userId}`);
      
      res.json({
        success: true,
        message: `Audios de conversaciones obtenidos exitosamente`,
        data: {
          userId: userId,
          audios: audioList.audios,
          total: audioList.total
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error listando audios de conversaciones',
        error: audioList.error
      });
    }

  } catch (error) {
    console.error(`❌ Error listando audios para usuario ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Generar URL de descarga para un audio específico
const generateAudioDownloadUrl = async (req, res) => {
  try {
    const { fileName } = req.params;
    const { expiresInHours = 24 } = req.query;

    console.log(`🔗 Generando URL de descarga para audio: ${fileName}`);

    const storageService = require('../services/storage');
    const urlResult = await storageService.generateAudioDownloadUrl(fileName, parseInt(expiresInHours));

    if (urlResult.success) {
      console.log(`✅ URL de descarga generada exitosamente para ${fileName}`);
      
      res.json({
        success: true,
        message: 'URL de descarga generada exitosamente',
        data: {
          fileName: urlResult.fileName,
          downloadUrl: urlResult.downloadUrl,
          expiresAt: urlResult.expiresAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error generando URL de descarga',
        error: urlResult.error
      });
    }

  } catch (error) {
    console.error(`❌ Error generando URL para ${req.params.fileName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// ===== TRACKING ENDPOINTS =====

// Obtener historial de llamadas de un grupo
const getGroupCallHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    console.log(`📋 Obteniendo historial de llamadas para grupo: ${id}`);

    // Verificar que el grupo existe
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Obtener batch calls del grupo
    const batchCalls = await BatchCall.findByGroupId(id, parseInt(limit));
    
    // Para cada batch call, obtener sus call records
    const batchCallsWithDetails = await Promise.all(
      batchCalls.map(async (batchCall) => {
        const callRecords = await CallRecord.findByBatchCallId(batchCall.id);
        const stats = await batchCall.getStats();
        
        return {
          ...batchCall.toJSON(),
          callRecords: callRecords.map(record => record.toJSON()),
          stats: stats
        };
      })
    );

    console.log(`✅ Historial obtenido: ${batchCalls.length} batch calls`);

    res.json({
      success: true,
      message: 'Historial de llamadas obtenido exitosamente',
      data: {
        group: group.toJSON(),
        batchCalls: batchCallsWithDetails,
        total: batchCalls.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial de grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial de llamadas',
      error: error.message
    });
  }
};

// Obtener historial de llamadas de un cliente específico
const getClientCallHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 10 } = req.query;

    console.log(`📋 Obteniendo historial de llamadas para cliente: ${clientId}`);

    // Verificar que el cliente existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Obtener historial de llamadas del cliente
    const callRecords = await CallRecord.findByClientId(clientId, parseInt(limit));

    console.log(`✅ Historial obtenido: ${callRecords.length} llamadas`);

    res.json({
      success: true,
      message: 'Historial de cliente obtenido exitosamente',
      data: {
        client: client.toJSON(),
        callHistory: callRecords.map(record => record.toJSON()),
        total: callRecords.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial de cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial del cliente',
      error: error.message
    });
  }
};

// Verificar si un cliente ya fue llamado
const checkClientCallStatus = async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log(`🔍 Verificando estado de llamadas para cliente: ${clientId}`);

    // Verificar que el cliente existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si ya fue llamado exitosamente
    const lastSuccessfulCall = await CallRecord.hasClientBeenCalled(clientId);

    res.json({
      success: true,
      message: 'Estado de llamadas verificado',
      data: {
        client: client.toJSON(),
        hasBeenCalled: !!lastSuccessfulCall,
        lastSuccessfulCall: lastSuccessfulCall ? lastSuccessfulCall.toJSON() : null
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de llamadas',
      error: error.message
    });
  }
};

// Obtener estadísticas de llamadas de un grupo
const getGroupCallStats = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📊 Obteniendo estadísticas de llamadas para grupo: ${id}`);

    // Verificar que el grupo existe
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Obtener todos los batch calls del grupo
    const batchCalls = await BatchCall.findByGroupId(id, 1000); // Límite alto para estadísticas

    // Calcular estadísticas generales
    const totalBatchCalls = batchCalls.length;
    const totalRecipients = batchCalls.reduce((sum, batch) => sum + batch.totalRecipients, 0);
    const totalCompletedCalls = batchCalls.reduce((sum, batch) => sum + batch.completedCalls, 0);
    const totalFailedCalls = batchCalls.reduce((sum, batch) => sum + batch.failedCalls, 0);

    const successRate = totalRecipients > 0 ? (totalCompletedCalls / totalRecipients * 100).toFixed(2) : 0;

    // Obtener estadísticas detalladas por estado
    const statusBreakdown = {};
    for (const batchCall of batchCalls) {
      const stats = await batchCall.getStats();
      for (const stat of stats) {
        statusBreakdown[stat.status] = (statusBreakdown[stat.status] || 0) + parseInt(stat.count);
      }
    }

    console.log(`✅ Estadísticas calculadas para ${totalBatchCalls} batch calls`);

    res.json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: {
        group: group.toJSON(),
        summary: {
          totalBatchCalls,
          totalRecipients,
          totalCompletedCalls,
          totalFailedCalls,
          successRate: parseFloat(successRate)
        },
        statusBreakdown,
        recentBatchCalls: batchCalls.slice(0, 5).map(batch => batch.toJSON())
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
};

// ===== ENDPOINTS OPTIMIZADOS PARA EL FLUJO NUEVO =====

// Consultar estado de batch call por grupo (FLUJO OPTIMIZADO)
const getGroupBatchStatus = async (req, res) => {
  try {
    const { id } = req.params; // ID del grupo
    const { userId } = req.query;

    console.log(`📊 Consultando estado de batch call para grupo: ${id}`);

    // 1. Buscar el grupo
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // 2. Verificar si el grupo tiene un batch call
    if (!group.batchId) {
      return res.json({
        success: true,
        message: 'Este grupo no ha sido llamado aún',
        data: {
          group: group.toJSON(),
          batchCall: null,
          hasBeenCalled: false
        }
      });
    }

    // 3. Obtener estado actualizado desde ElevenLabs usando el batch_id almacenado
    console.log(`🔍 Consultando ElevenLabs con batch_id: ${group.batchId}`);
    const statusResult = await elevenlabsService.getBatchCallStatus(group.batchId);

    if (statusResult.success) {
      console.log(`✅ Estado obtenido de ElevenLabs, actualizando DB...`);
      
      // 4. Actualizar solo si hay cambios (comparar status actual)
      const currentStatus = group.batchStatus;
      const newStatus = statusResult.data.status;
      
      if (currentStatus !== newStatus) {
        console.log(`📝 Status cambió de "${currentStatus}" a "${newStatus}", actualizando DB...`);
        await group.updateBatchStatus(statusResult.data);
      } else {
        console.log(`✅ Status sin cambios (${newStatus}), usando datos de DB`);
      }
      
      // 5. Enriquecer datos si se especifica userId
      let enrichedData = statusResult.data;
      if (userId) {
        enrichedData = await enrichBatchCallData(statusResult.data, userId);
      }

      // 6. Obtener grupo actualizado para estadísticas
      const updatedGroup = await Group.findById(id);

      res.json({
        success: true,
        message: 'Estado del batch call obtenido exitosamente',
        data: {
          group: updatedGroup.toJSON(),
          batchCall: enrichedData,
          hasBeenCalled: true,
          lastSync: new Date().toISOString()
        }
      });
    } else {
      // Si hay error con ElevenLabs, devolver datos de la DB
      console.log(`⚠️ Error con ElevenLabs: ${statusResult.error}, devolviendo datos de DB`);
      
      res.json({
        success: true,
        message: 'Estado del batch call (datos de DB)',
        data: {
          group: group.toJSON(),
          batchCall: null,
          hasBeenCalled: true,
          lastSync: group.updatedAt,
          warning: 'Datos de ElevenLabs no disponibles'
        }
      });
    }

  } catch (error) {
    console.error('Error consultando estado del grupo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener clientes de un grupo que NO han sido llamados
const getUncalledClients = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    console.log(`📋 Obteniendo clientes no llamados para grupo: ${id}`);

    // Verificar que el grupo existe
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    // Obtener todos los clientes del grupo
    const allClients = await group.getClients();

    // Obtener IDs de clientes que ya fueron llamados exitosamente
    const calledClientIds = new Set();
    
    for (const client of allClients) {
      const lastCall = await CallRecord.hasClientBeenCalled(client.id);
      if (lastCall) {
        calledClientIds.add(client.id);
      }
    }

    // Filtrar clientes no llamados
    const uncalledClients = allClients
      .filter(client => !calledClientIds.has(client.id))
      .slice(0, parseInt(limit));

    console.log(`✅ Encontrados ${uncalledClients.length} clientes no llamados de ${allClients.length} totales`);

    res.json({
      success: true,
      message: 'Clientes no llamados obtenidos exitosamente',
      data: {
        group: group.toJSON(),
        uncalledClients: uncalledClients.map(client => client.toJSON()),
        total: uncalledClients.length,
        totalGroupClients: allClients.length,
        calledClients: calledClientIds.size
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo clientes no llamados:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes no llamados',
      error: error.message
    });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  addClientToGroup,
  removeClientFromGroup,
  updateClientInGroup,
  getClientInGroup,
  downloadProcessedFile,
  prepareAgent,
  startBatchCall,
  getGroupCallHistory,
  getClientCallHistory,
  checkClientCallStatus,
  getGroupCallStats,
  getGroupBatchStatus,
  getBatchCallStatus,
  getBatchCallStatusSSE,
  getUncalledClients,
  listBatchCalls,
  retryBatchCall,
  cancelBatchCall,
  listUserConversationAudios,
  generateAudioDownloadUrl
}; 