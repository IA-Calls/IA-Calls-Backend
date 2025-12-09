# 🚀 Quick Start - Agentes de WhatsApp

## ⚡ Integración Rápida en 5 Minutos

### Paso 1: Crear un Agente

```javascript
const response = await fetch('http://localhost:5000/api/whatsapp/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Mi Primer Agente',
    instructor: 'Eres un asistente amable que ayuda con preguntas frecuentes.',
    language: 'es'
  })
});

const { data } = await response.json();
console.log('Agente creado:', data.id);
```

### Paso 2: Asignar a una Conversación

```javascript
const phoneNumber = '573138539155'; // Número de WhatsApp
const agentId = data.id; // ID del agente creado

await fetch(`http://localhost:5000/api/whatsapp/conversations/${phoneNumber}/agent`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agent_id: agentId })
});
```

### Paso 3: ¡Listo! 🎉

El agente responderá **automáticamente** a todos los mensajes de esa conversación.

---

## 📝 Ejemplo Mínimo (React)

```jsx
import { useState } from 'react';

const QuickAgentSetup = () => {
  const [agentId, setAgentId] = useState(null);

  const createAndAssign = async (phoneNumber) => {
    // 1. Crear agente
    const createRes = await fetch('/api/whatsapp/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Agente Rápido',
        instructor: 'Eres un asistente virtual amable.',
        language: 'es'
      })
    });
    const { data: agent } = await createRes.json();

    // 2. Asignar a conversación
    await fetch(`/api/whatsapp/conversations/${phoneNumber}/agent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agent.id })
    });

    setAgentId(agent.id);
    alert('✅ Agente creado y asignado exitosamente');
  };

  return (
    <button onClick={() => createAndAssign('573138539155')}>
      Crear y Asignar Agente
    </button>
  );
};
```

---

## 🎯 Casos de Uso Comunes

### Soporte Técnico

```javascript
{
  name: 'Soporte Técnico',
  instructor: `Eres un asistente de soporte técnico profesional.
  
  Tu función es:
  - Ayudar con problemas técnicos comunes
  - Proporcionar soluciones paso a paso
  - Escalar casos complejos a un agente humano
  
  Sé paciente, claro y profesional.`,
  language: 'es'
}
```

### Ventas

```javascript
{
  name: 'Agente de Ventas',
  instructor: `Eres un agente de ventas entusiasta y persuasivo.
  
  Tu objetivo es:
  - Presentar productos de manera atractiva
  - Responder preguntas sobre precios y características
  - Cerrar ventas cuando sea apropiado
  
  Sé amigable pero profesional.`,
  language: 'es'
}
```

### Atención al Cliente

```javascript
{
  name: 'Atención al Cliente',
  instructor: `Eres un agente de atención al cliente empático y servicial.
  
  Tu misión es:
  - Escuchar activamente las preocupaciones del cliente
  - Ofrecer soluciones rápidas y efectivas
  - Mantener un tono positivo y profesional
  
  Siempre prioriza la satisfacción del cliente.`,
  language: 'es'
}
```

---

## 🔍 Verificar que Funciona

### 1. Ver Agentes Creados

```bash
curl http://localhost:5000/api/whatsapp/agents
```

### 2. Ver Conversación con Agente

```bash
curl http://localhost:5000/api/whatsapp/conversations/573138539155
```

Deberías ver `agent_id` en la respuesta.

### 3. Enviar Mensaje de Prueba

Envía un mensaje desde WhatsApp al número configurado. El agente debería responder automáticamente.

---

## ❓ Preguntas Frecuentes

### ¿Puedo tener múltiples agentes?

✅ Sí, puedes crear tantos agentes como necesites.

### ¿Puedo cambiar el agente de una conversación?

✅ Sí, simplemente asigna otro agente usando el mismo endpoint.

### ¿El agente mantiene el contexto?

✅ Sí, Vertex AI mantiene el contexto de la conversación automáticamente.

### ¿Puedo desactivar el agente?

✅ Sí, puedes desasignar el agente o desactivarlo desde la lista de agentes.

---

## 📚 Documentación Completa

Para más detalles, consulta:
- [Documentación Completa](./WHATSAPP_AGENTS_FRONTEND.md)
- [API de Conversaciones](./WHATSAPP_FRONTEND_API.md)
- [Configuración Backend](./VERTEX_AI_SETUP.md)

