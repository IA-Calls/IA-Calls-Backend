/**
 * Ejemplo de uso de la integración con ElevenLabs
 * 
 * Este archivo muestra cómo usar el servicio de ElevenLabs
 * para crear y gestionar agentes conversacionales.
 */

const { elevenlabsService } = require('../src/agents');

async function ejemploIntegracionElevenLabs() {
  console.log('🚀 Ejemplo de integración con ElevenLabs\n');

  try {
    // 1. Probar conexión
    console.log('1. Probando conexión con ElevenLabs...');
    const connectionTest = await elevenlabsService.testConnection();
    console.log('   Resultado:', connectionTest.success ? '✅ Conectado' : '❌ Error');
    if (!connectionTest.success) {
      console.log('   Error:', connectionTest.error);
      return;
    }
    console.log('');

    // 2. Crear un agente de ejemplo
    console.log('2. Creando agente de ejemplo...');
    const agentConfig = {
      name: "Agente Ejemplo IA-Calls",
      tags: ["ia-calls", "ejemplo", "demo"],
      conversation_config: {
        tts: {
          voice_id: "SZfY4K69FwXus87eayHK",
          model_id: "eleven_turbo_v2"
        },
        conversation: {
          text_only: false
        },
        agent: {
          language: "es",
          prompt: {
            prompt: "Eres un agente de demostración para IA-Calls. Responde preguntas sobre el software de manera amigable y profesional. Mantén las respuestas concisas y útiles."
          }
        }
      }
    };

    const createResult = await elevenlabsService.createAgent(agentConfig);
    if (createResult.success) {
      console.log('   ✅ Agente creado exitosamente');
      console.log('   📋 Agent ID:', createResult.agent_id);
      
      const agentId = createResult.agent_id;

      // 3. Obtener información del agente creado
      console.log('\n3. Obteniendo información del agente...');
      const agentInfo = await elevenlabsService.getAgent(agentId);
      if (agentInfo.success) {
        console.log('   ✅ Información obtenida');
        console.log('   📋 Nombre:', agentInfo.data.name);
        console.log('   📋 Idioma:', agentInfo.data.conversation_config?.agent?.language);
      }

      // 4. Actualizar el agente
      console.log('\n4. Actualizando configuración del agente...');
      const updateData = {
        name: "Agente Ejemplo IA-Calls (Actualizado)",
        tags: ["ia-calls", "ejemplo", "demo", "actualizado"]
      };
      
      const updateResult = await elevenlabsService.updateAgent(agentId, updateData);
      if (updateResult.success) {
        console.log('   ✅ Agente actualizado exitosamente');
      }

      // 5. Listar agentes
      console.log('\n5. Listando todos los agentes...');
      const listResult = await elevenlabsService.listAgents();
      if (listResult.success) {
        console.log('   ✅ Lista obtenida');
        console.log('   📋 Total de agentes:', listResult.data?.length || 0);
      }

      // 6. Eliminar el agente de ejemplo
      console.log('\n6. Eliminando agente de ejemplo...');
      const deleteResult = await elevenlabsService.deleteAgent(agentId);
      if (deleteResult.success) {
        console.log('   ✅ Agente eliminado exitosamente');
      }

    } else {
      console.log('   ❌ Error creando agente:', createResult.error);
    }

  } catch (error) {
    console.error('❌ Error en el ejemplo:', error.message);
  }

  console.log('\n🏁 Ejemplo completado');
}

// Función para simular el registro de un usuario
async function ejemploRegistroUsuario() {
  console.log('\n🔄 Simulando registro de usuario con creación de agente...\n');

  const userData = {
    username: 'usuario_ejemplo',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@example.com',
    role: 'user'
  };

  try {
    // Simular la creación del agente como se hace en el registro
    console.log(`🤖 Creando agente conversacional para usuario: ${userData.username}`);
    
    const agentResult = await elevenlabsService.createAgent({
      name: `Agente ${userData.firstName || userData.username}`,
      tags: ["ia-calls", "usuario", userData.username, userData.role],
      conversation_config: {
        agent: {
          prompt: {
            prompt: `Eres el asistente personal de ${userData.firstName || userData.username} en IA-Calls. Responde preguntas sobre el software IA-Calls y ayuda con tareas relacionadas. El usuario tiene rol de ${userData.role}. Mantén un tono profesional y amigable.`
          }
        }
      }
    });

    if (agentResult.success) {
      console.log(`✅ Agente creado exitosamente con ID: ${agentResult.agent_id}`);
      
      // Simular la respuesta que recibiría el frontend
      const responseData = {
        user: {
          ...userData,
          id: 123,
          agentId: agentResult.agent_id
        },
        agent: {
          created: agentResult.success,
          agent_id: agentResult.agent_id,
          message: agentResult.message
        }
      };

      console.log('\n📤 Respuesta simulada para el frontend:');
      console.log(JSON.stringify(responseData, null, 2));

      // Limpiar - eliminar el agente de ejemplo
      await elevenlabsService.deleteAgent(agentResult.agent_id);
      console.log('\n🧹 Agente de ejemplo eliminado');

    } else {
      console.log(`⚠️ No se pudo crear el agente: ${agentResult.error}`);
    }

  } catch (error) {
    console.error('❌ Error en simulación de registro:', error.message);
  }
}

// Ejecutar ejemplos si el archivo se ejecuta directamente
if (require.main === module) {
  (async () => {
    await ejemploIntegracionElevenLabs();
    await ejemploRegistroUsuario();
  })();
}

module.exports = {
  ejemploIntegracionElevenLabs,
  ejemploRegistroUsuario
};
