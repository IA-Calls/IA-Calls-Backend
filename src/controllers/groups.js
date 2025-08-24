const Group = require('../models/Group');
const Client = require('../models/Client');
const FileProcessor = require('../services/fileProcessor');
const { elevenlabsService } = require('../agents');
const User = require('../models/User');

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
    const { name, description, prompt, color, favorite, idioma, variables, base64, document_name, clientId } = req.body;
    const { logActivity } = require('../utils/helpers');
    
    console.log('📋 Datos recibidos en createGroup:');
    console.log('   - clientId del body:', clientId);
    console.log('   - req.user?.id:', req.user?.id);
    console.log('   - document_name:', document_name);
    
    // Usar clientId del body o del usuario autenticado
    const createdBy = parseInt(clientId) || req.user?.id;
    
    console.log('   - createdBy final:', createdBy);
    
    if (!createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere clientId o usuario autenticado'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del grupo es requerido'
      });
    }

    const groupData = {
      name,
      description,
      prompt,
      color,
      favorite: favorite || false,
      idioma: idioma || 'es',
      variables: variables || {},
      createdBy,
      createdByClient: createdBy // Usar el mismo ID para ambos campos
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

            // Subir archivo original a GCP
            try {
              const { uploadDocumentToGCP } = require('../utils/helpers');
              const GCPDocument = require('../models/GCPDocument');
              
              gcpUploadResult = await uploadDocumentToGCP(base64, document_name, {
                groupId: groupId,
                groupName: name,
                totalClients: newClients.length,
                documentType: 'original_upload',
                source: 'group_creation',
                processedClients: newClients.length
              });
              
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
    if (createdBy) {
      await logActivity(createdBy, 'create_group_error', `Error creando grupo "${name}"`, req, {
        error: error.message,
        groupName: name
      });
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

// Descargar archivo procesado
const downloadProcessedFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del archivo es requerido'
      });
    }

    const path = require('path');
    const fs = require('fs');
    
    const filePath = path.join(__dirname, '../../uploads', fileName);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Enviar archivo
    res.sendFile(filePath);
    
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

    // Construir el prompt personalizado con información del grupo
    const customPrompt = buildGroupPrompt(group, user);

    console.log('📋 Prompt personalizado:', customPrompt);

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
        agent: {
          language: group.idioma || "es",
          prompt: {
            prompt: customPrompt,
            llm: "gpt-4o-mini", // LLM requerido
            temperature: 0.7,   // Temperatura por defecto
            max_tokens: 1000    // Tokens máximos por defecto
          }
        }
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
const enrichBatchCallData = async (batchData) => {
  try {
    console.log(`🔍 Enriqueciendo datos del batch call...`);
    
    const enrichedData = { ...batchData };
    
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
              
              // Obtener URL del audio
              const audioResult = await elevenlabsService.getConversationAudioUrl(recipient.conversation_id);
              if (audioResult.success) {
                enrichedRecipient.audio_url = audioResult.data.audio_url;
                console.log(`🎵 URL de audio generada para ${recipient.phone_number}`);
              } else {
                console.log(`⚠️ No se pudo generar URL de audio para ${recipient.phone_number}: ${audioResult.error}`);
              }
              
            } catch (error) {
              console.error(`❌ Error procesando conversación ${recipient.conversation_id}:`, error);
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

    if (!agentPhoneNumberId) {
      console.error('❌ Error: agentPhoneNumberId no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'ID del número telefónico del agente es requerido'
      });
    }

    // Obtener el grupo
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

    // Obtener el usuario para acceder a su agente
    console.log(`🔍 Buscando usuario con ID: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ Error: Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    if (!user.agentId) {
      console.error(`❌ Error: Usuario ${user.username} no tiene agente asignado`);
      return res.status(404).json({
        success: false,
        message: 'Usuario no tiene un agente asignado'
      });
    }
    console.log(`✅ Usuario encontrado: "${user.username}" con agente: ${user.agentId}`);

    console.log(`📞 Iniciando batch call para el grupo "${group.name}"`);
    console.log(`🤖 Agente: ${user.agentId}`);
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
        
        // Si no tiene código de país, agregar +57 (Colombia)
        if (!phoneNumber.startsWith('+')) {
          // Si empieza con 57, agregar solo el +
          if (phoneNumber.startsWith('57')) {
            phoneNumber = '+' + phoneNumber;
          } else {
            // Si no tiene código de país, agregar +57
            phoneNumber = '+57' + phoneNumber;
          }
        }
        
        console.log(`📱 Número formateado: ${client.phone} → ${phoneNumber}`);
        
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
      agentId: user.agentId,
      agentPhoneNumberId: agentPhoneNumberId,
      recipients: recipients,
      scheduledTimeUnix: scheduledTimeUnix
    };

    console.log(`🚀 Preparando batch call con datos:`);
    console.log(`   📞 Nombre: ${batchData.callName}`);
    console.log(`   🤖 Agente ID: ${batchData.agentId}`);
    console.log(`   📱 Phone Number ID: ${batchData.agentPhoneNumberId}`);
    console.log(`   👥 Destinatarios: ${batchData.recipients.length}`);
    console.log(`   ⏰ Programado: ${batchData.scheduledTimeUnix || 'Inmediato'}`);

    // Iniciar el batch call en ElevenLabs
    console.log(`🔄 Enviando batch call a ElevenLabs...`);
    const batchResult = await elevenlabsService.submitBatchCall(batchData);

    if (batchResult.success) {
      console.log(`✅ Batch call iniciado exitosamente para el grupo "${group.name}"`);
      
      res.json({
        success: true,
        message: `Llamadas iniciadas exitosamente para el grupo "${group.name}"`,
        data: {
          batchId: batchResult.data.batch_id || batchResult.data.id,
          groupId: group.id,
          groupName: group.name,
          agentId: user.agentId,
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

// Consultar estado de un batch call (versión tradicional)
const getBatchCallStatus = async (req, res) => {
  try {
    const { batchId } = req.params;

    console.log(`📊 Consultando estado del batch call: ${batchId}`);

    const statusResult = await elevenlabsService.getBatchCallStatus(batchId);

    if (statusResult.success) {
      console.log(`✅ Estado del batch call obtenido, enriqueciendo datos...`);
      
      // Enriquecer datos con transcripciones y audios
      const enrichedData = await enrichBatchCallData(statusResult.data);
      
      res.json({
        success: true,
        message: 'Estado del batch call obtenido exitosamente',
        data: enrichedData
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
  
  console.log(`📊 Iniciando SSE para batch call: ${batchId}`);

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
        const enrichedData = await enrichBatchCallData(statusResult.data);
        
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
  // Batch calling functions
  startBatchCall,
  getBatchCallStatus,
  getBatchCallStatusSSE,
  listBatchCalls,
  retryBatchCall,
  cancelBatchCall
}; 