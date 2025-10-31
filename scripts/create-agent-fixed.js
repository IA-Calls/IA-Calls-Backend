#!/usr/bin/env node

const dotenv = require('dotenv');
dotenv.config();

const { elevenlabsService } = require('../src/agents');
const User = require('../src/models/User');

async function createAgentForUserFixed() {
  console.log('🤖 Creando agente para usuario existente (configuración corregida)...\n');

  try {
    // Buscar el usuario
    const userId = 5; // adminiacalls
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ Usuario no encontrado');
      return;
    }

    console.log(`👤 Usuario encontrado: ${user.username} (${user.email})`);
    console.log(`🆔 Agent ID actual: ${user.agentId || 'No asignado'}`);

    if (user.agentId) {
      console.log('⚠️ El usuario ya tiene un agente asignado');
      return;
    }

    // Crear agente en ElevenLabs con configuración corregida
    console.log('\n🤖 Creando agente en ElevenLabs...');
    const agentData = {
      name: `Agente ${user.firstName || user.username}`,
      tags: ["ia-calls", "usuario", user.username],
      conversation_config: {
        tts: {
          voice_id: "pNInz6obpgDQGcFmaJgB", // Adam - voz por defecto
          model_id: "eleven_turbo_v2_5" // Para español
        },
        conversation: {
          text_only: false // Usar audio
        },
        agent: {
          language: "es", // IMPORTANTE: Español, no inglés
          prompt: {
            prompt: `Eres el asistente personal de ${user.firstName || user.username} en IA-Calls. Responde preguntas sobre el software IA-Calls y ayuda con tareas relacionadas. Mantén un tono profesional y amigable.`
          }
        }
      }
    };

    console.log('📤 Datos del agente:', JSON.stringify(agentData, null, 2));

    const agentResult = await elevenlabsService.createAgent(agentData);

    if (agentResult.success) {
      console.log(`✅ Agente creado exitosamente con ID: ${agentResult.agent_id}`);
      
      // Actualizar usuario con el agent_id
      console.log('\n💾 Actualizando usuario en la base de datos...');
      await user.update({ agentId: agentResult.agent_id });
      
      console.log('✅ Usuario actualizado exitosamente');
      
      // Verificar la actualización
      const updatedUser = await User.findById(userId);
      console.log(`\n🎯 Usuario actualizado:`);
      console.log(`   - Username: ${updatedUser.username}`);
      console.log(`   - Agent ID: ${updatedUser.agentId}`);
      
    } else {
      console.error('❌ Error creando agente:', agentResult.error);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

createAgentForUserFixed();

