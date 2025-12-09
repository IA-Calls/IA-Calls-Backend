# 🤖 Integración de Agentes de WhatsApp - Guía Frontend

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Endpoints Disponibles](#endpoints-disponibles)
3. [Crear un Agente](#crear-un-agente)
4. [Listar Agentes](#listar-agentes)
5. [Asignar Agente a Conversación](#asignar-agente-a-conversación)
6. [Flujo Automático](#flujo-automático)
7. [Ejemplos de Código](#ejemplos-de-código)
8. [Manejo de Errores](#manejo-de-errores)
9. [UI/UX Recomendaciones](#uiux-recomendaciones)

---

## 🎯 Introducción

Los **Agentes de WhatsApp** son asistentes virtuales inteligentes basados en **Vertex AI Dialogflow CX** que responden automáticamente a los mensajes de los usuarios en WhatsApp.

### Características Principales

- ✅ **Respuestas Automáticas**: El agente responde automáticamente a cada mensaje
- ✅ **Contexto Persistente**: Mantiene el contexto de la conversación por usuario
- ✅ **Multiidioma**: Soporta español, inglés y otros idiomas
- ✅ **Fácil Integración**: APIs REST simples y claras
- ✅ **Sin Configuración Compleja**: Solo necesitas crear el agente y asignarlo

### Flujo Básico

```
1. Crear Agente → 2. Asignar a Conversación → 3. ¡Listo! (Responde automáticamente)
```

---

## 📡 Endpoints Disponibles

### Base URL

```
http://localhost:5000/api/whatsapp
```

### Endpoints de Agentes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/agents` | Crear un nuevo agente |
| `GET` | `/agents` | Listar todos los agentes |
| `GET` | `/agents/:id` | Obtener un agente específico |
| `PUT` | `/agents/:id` | Actualizar un agente |
| `DELETE` | `/agents/:id` | Desactivar un agente |

### Endpoints de Conversaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `PUT` | `/conversations/:phoneNumber/agent` | Asignar agente a una conversación |
| `GET` | `/conversations/:phoneNumber` | Obtener información de una conversación |

---

## 🆕 Crear un Agente

### Endpoint

```
POST /api/whatsapp/agents
```

### Request Body

```typescript
interface CreateAgentRequest {
  name: string;                    // Nombre del agente (ej: "Agente de Soporte")
  instructor: string;              // Prompt/instrucciones del agente (REQUERIDO)
  language?: string;               // Código de idioma (default: "es")
  initial_message?: string;        // Mensaje inicial opcional
  metadata?: Record<string, any>;  // Metadata adicional opcional
}
```

### Ejemplo de Request

```javascript
const createAgent = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/whatsapp/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourAuthToken}` // Si usas autenticación
      },
      body: JSON.stringify({
        name: 'Agente de Soporte Técnico',
        instructor: `Eres un asistente virtual amable y profesional que ayuda con soporte técnico.
        
        Tu función es:
        - Responder preguntas sobre productos y servicios
        - Ayudar con problemas técnicos comunes
        - Proporcionar información útil y precisa
        - Ser cortés y profesional en todo momento
        
        Si no sabes la respuesta, ofrece contactar con un agente humano.`,
        language: 'es',
        initial_message: '¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Agente creado:', data.data);
      return data.data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('❌ Error creando agente:', error);
    throw error;
  }
};
```

### Response Success (201)

```json
{
  "success": true,
  "message": "Agente creado exitosamente en Vertex AI",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Agente de Soporte Técnico",
    "agent_id": "vertex-ai-agent-id-12345",
    "instructor": "Eres un asistente virtual...",
    "text_only": true,
    "language": "es",
    "initial_message": "¡Hola! Soy tu asistente...",
    "platform": "vertex-ai",
    "created_at": "2025-12-04T10:30:00.000Z"
  }
}
```

### Response Error (400/500)

```json
{
  "success": false,
  "error": "Los campos \"name\" e \"instructor\" son requeridos",
  "details": "..."
}
```

### Componente React Ejemplo

```jsx
import React, { useState } from 'react';

const CreateAgentForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    instructor: '',
    language: 'es',
    initial_message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/whatsapp/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({ name: '', instructor: '', language: 'es', initial_message: '' });
        // Redirigir o actualizar lista de agentes
      } else {
        setError(data.error || 'Error creando agente');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="agent-form">
      <h2>Crear Nuevo Agente</h2>
      
      <div className="form-group">
        <label>Nombre del Agente *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Ej: Agente de Soporte"
        />
      </div>

      <div className="form-group">
        <label>Instrucciones del Agente *</label>
        <textarea
          value={formData.instructor}
          onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
          required
          rows={8}
          placeholder="Describe cómo debe comportarse el agente..."
        />
        <small>Estas instrucciones definen la personalidad y comportamiento del agente</small>
      </div>

      <div className="form-group">
        <label>Idioma</label>
        <select
          value={formData.language}
          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="pt">Portugués</option>
        </select>
      </div>

      <div className="form-group">
        <label>Mensaje Inicial (Opcional)</label>
        <input
          type="text"
          value={formData.initial_message}
          onChange={(e) => setFormData({ ...formData, initial_message: e.target.value })}
          placeholder="Ej: ¡Hola! ¿En qué puedo ayudarte?"
        />
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">✅ Agente creado exitosamente</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear Agente'}
      </button>
    </form>
  );
};

export default CreateAgentForm;
```

---

## 📋 Listar Agentes

### Endpoint

```
GET /api/whatsapp/agents?active_only=true
```

### Query Parameters

- `active_only` (opcional): `true` o `false` - Solo mostrar agentes activos (default: `true`)

### Ejemplo de Request

```javascript
const listAgents = async (activeOnly = true) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/whatsapp/agents?active_only=${activeOnly}`,
      {
        headers: {
          'Authorization': `Bearer ${yourAuthToken}`
        }
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.total} agentes encontrados`);
      return data.data;
    }
  } catch (error) {
    console.error('❌ Error listando agentes:', error);
    throw error;
  }
};
```

### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Agente de Soporte",
      "agent_id": "vertex-ai-agent-id",
      "instructor": "Eres un asistente...",
      "text_only": true,
      "language": "es",
      "initial_message": "¡Hola!...",
      "is_active": true,
      "created_at": "2025-12-04T10:30:00.000Z",
      "updated_at": "2025-12-04T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

### Componente React Ejemplo

```jsx
import React, { useState, useEffect } from 'react';

const AgentsList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/agents?active_only=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setAgents(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error cargando agentes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando agentes...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="agents-list">
      <h2>Agentes Disponibles ({agents.length})</h2>
      
      {agents.length === 0 ? (
        <p>No hay agentes creados aún</p>
      ) : (
        <div className="agents-grid">
          {agents.map(agent => (
            <div key={agent.id} className="agent-card">
              <h3>{agent.name}</h3>
              <p className="agent-language">Idioma: {agent.language}</p>
              <p className="agent-status">
                {agent.is_active ? '✅ Activo' : '❌ Inactivo'}
              </p>
              <p className="agent-instructor">
                {agent.instructor.substring(0, 100)}...
              </p>
              <div className="agent-actions">
                <button onClick={() => editAgent(agent.id)}>Editar</button>
                <button onClick={() => deleteAgent(agent.id)}>Desactivar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentsList;
```

---

## 🔗 Asignar Agente a Conversación

### Endpoint

```
PUT /api/whatsapp/conversations/:phoneNumber/agent
```

### Request Body

```typescript
interface AssignAgentRequest {
  agent_id: string;  // UUID del agente (no el agent_id de Vertex AI)
}
```

### Ejemplo de Request

```javascript
const assignAgentToConversation = async (phoneNumber, agentId) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/whatsapp/conversations/${phoneNumber}/agent`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          agent_id: agentId  // UUID del agente en tu BD
        })
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Agente asignado exitosamente');
      return data.data;
    } else {
      console.error('❌ Error:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('❌ Error asignando agente:', error);
    throw error;
  }
};

// Uso
await assignAgentToConversation('573138539155', '550e8400-e29b-41d4-a716-446655440000');
```

### Response Success (200)

```json
{
  "success": true,
  "message": "Agente asignado exitosamente",
  "data": {
    "id": "conversation-uuid",
    "user_phone": "573138539155",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "has_started": true,
    "updated_at": "2025-12-04T10:35:00.000Z"
  }
}
```

### Response Error (404)

```json
{
  "success": false,
  "error": "Conversación o agente no encontrado"
}
```

### Componente React Ejemplo - Selector de Agente

```jsx
import React, { useState, useEffect } from 'react';

const AssignAgentDialog = ({ phoneNumber, onClose, onSuccess }) => {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/whatsapp/agents?active_only=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (err) {
      setError('Error cargando agentes');
    }
  };

  const handleAssign = async () => {
    if (!selectedAgentId) {
      setError('Selecciona un agente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/whatsapp/conversations/${phoneNumber}/agent`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ agent_id: selectedAgentId })
        }
      );

      const data = await response.json();

      if (data.success) {
        onSuccess && onSuccess(data.data);
        onClose();
      } else {
        setError(data.error || 'Error asignando agente');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Asignar Agente a Conversación</h2>
        <p>Número: {phoneNumber}</p>

        <div className="form-group">
          <label>Seleccionar Agente</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
          >
            <option value="">-- Selecciona un agente --</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.language})
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleAssign} disabled={loading || !selectedAgentId}>
            {loading ? 'Asignando...' : 'Asignar Agente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAgentDialog;
```

---

## ⚡ Flujo Automático

Una vez que asignas un agente a una conversación, **todo funciona automáticamente**:

### 1. Usuario Envía Mensaje por WhatsApp

```
Usuario → WhatsApp → Webhook → Backend
```

### 2. Backend Detecta Agente Asignado

El backend automáticamente:
- ✅ Detecta que hay un agente asignado
- ✅ Envía el mensaje a Vertex AI Dialogflow CX
- ✅ Recibe la respuesta del agente
- ✅ Envía la respuesta automáticamente por WhatsApp

### 3. Usuario Recibe Respuesta

```
Backend → WhatsApp → Usuario
```

### **No necesitas hacer nada más** 🎉

El agente responderá automáticamente a **todos los mensajes** de esa conversación hasta que:
- Se desasigne el agente
- Se desactive el agente
- Se cierre la conversación

---

## 💻 Ejemplos de Código Completos

### Hook Personalizado para Agentes (React)

```jsx
// hooks/useWhatsAppAgents.js
import { useState, useEffect } from 'react';

export const useWhatsAppAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/agents?active_only=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAgents(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error cargando agentes');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (agentData) => {
    try {
      const response = await fetch('/api/whatsapp/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(agentData)
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchAgents(); // Refrescar lista
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      throw err;
    }
  };

  const assignAgent = async (phoneNumber, agentId) => {
    try {
      const response = await fetch(
        `/api/whatsapp/conversations/${phoneNumber}/agent`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ agent_id: agentId })
        }
      );
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    createAgent,
    assignAgent,
    refreshAgents: fetchAgents
  };
};
```

### Uso del Hook

```jsx
import { useWhatsAppAgents } from './hooks/useWhatsAppAgents';

const AgentsPage = () => {
  const { agents, loading, createAgent, assignAgent } = useWhatsAppAgents();

  const handleCreateAgent = async () => {
    try {
      await createAgent({
        name: 'Mi Agente',
        instructor: 'Eres un asistente amable.',
        language: 'es'
      });
      alert('✅ Agente creado exitosamente');
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleAssign = async (phoneNumber, agentId) => {
    try {
      await assignAgent(phoneNumber, agentId);
      alert('✅ Agente asignado exitosamente');
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  // ... resto del componente
};
```

---

## 🚨 Manejo de Errores

### Errores Comunes

#### 1. Agente No Encontrado (404)

```javascript
try {
  await assignAgent(phoneNumber, agentId);
} catch (error) {
  if (error.message.includes('no encontrado')) {
    // Mostrar mensaje amigable
    showNotification('El agente seleccionado no existe', 'error');
  }
}
```

#### 2. Validación de Campos (400)

```javascript
try {
  await createAgent({ name: '', instructor: '' });
} catch (error) {
  if (error.message.includes('requeridos')) {
    // Mostrar errores de validación
    setFormErrors({
      name: 'El nombre es requerido',
      instructor: 'Las instrucciones son requeridas'
    });
  }
}
```

#### 3. Error de Conexión

```javascript
try {
  await fetchAgents();
} catch (error) {
  if (error.message === 'Failed to fetch') {
    showNotification('Error de conexión. Verifica tu internet.', 'error');
  }
}
```

### Componente de Manejo de Errores

```jsx
const ErrorBoundary = ({ error, onRetry }) => {
  return (
    <div className="error-boundary">
      <h3>❌ Error</h3>
      <p>{error.message || 'Ha ocurrido un error'}</p>
      {onRetry && (
        <button onClick={onRetry}>Reintentar</button>
      )}
    </div>
  );
};
```

---

## 🎨 UI/UX Recomendaciones

### 1. Indicadores Visuales

```jsx
// Mostrar cuando un agente está activo en una conversación
{conversation.agent_id && (
  <div className="agent-badge">
    <span className="badge-icon">🤖</span>
    <span>Agente Activo</span>
  </div>
)}
```

### 2. Confirmación de Asignación

```jsx
const handleAssignAgent = async () => {
  const confirmed = window.confirm(
    `¿Asignar el agente "${agent.name}" a esta conversación?\n\n` +
    `El agente responderá automáticamente a todos los mensajes.`
  );
  
  if (confirmed) {
    await assignAgent(phoneNumber, agent.id);
  }
};
```

### 3. Loading States

```jsx
{loading ? (
  <div className="loading-spinner">
    <Spinner /> Creando agente...
  </div>
) : (
  <button onClick={handleCreate}>Crear Agente</button>
)}
```

### 4. Notificaciones de Éxito

```jsx
import { toast } from 'react-toastify';

const handleSuccess = () => {
  toast.success('✅ Agente asignado exitosamente', {
    position: 'top-right',
    autoClose: 3000
  });
};
```

### 5. Lista de Agentes con Búsqueda

```jsx
const [searchTerm, setSearchTerm] = useState('');

const filteredAgents = agents.filter(agent =>
  agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  agent.instructor.toLowerCase().includes(searchTerm.toLowerCase())
);

return (
  <div>
    <input
      type="text"
      placeholder="Buscar agentes..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    {filteredAgents.map(agent => (
      <AgentCard key={agent.id} agent={agent} />
    ))}
  </div>
);
```

---

## 📊 Ejemplo Completo: Página de Gestión de Agentes

```jsx
import React, { useState } from 'react';
import { useWhatsAppAgents } from './hooks/useWhatsAppAgents';
import CreateAgentForm from './components/CreateAgentForm';
import AgentsList from './components/AgentsList';
import AssignAgentDialog from './components/AssignAgentDialog';

const AgentsManagementPage = () => {
  const { agents, loading, createAgent, assignAgent, refreshAgents } = useWhatsAppAgents();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assignDialog, setAssignDialog] = useState({ open: false, phoneNumber: null });

  return (
    <div className="agents-management-page">
      <header>
        <h1>🤖 Gestión de Agentes de WhatsApp</h1>
        <button onClick={() => setShowCreateForm(true)}>
          + Crear Nuevo Agente
        </button>
      </header>

      {showCreateForm && (
        <CreateAgentForm
          onSubmit={async (data) => {
            await createAgent(data);
            setShowCreateForm(false);
            await refreshAgents();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <AgentsList
        agents={agents}
        loading={loading}
        onAssign={(phoneNumber, agentId) => {
          setAssignDialog({ open: true, phoneNumber, agentId });
        }}
      />

      {assignDialog.open && (
        <AssignAgentDialog
          phoneNumber={assignDialog.phoneNumber}
          onClose={() => setAssignDialog({ open: false, phoneNumber: null })}
          onSuccess={async () => {
            await refreshAgents();
            // Mostrar notificación de éxito
          }}
        />
      )}
    </div>
  );
};

export default AgentsManagementPage;
```

---

## 🔗 Recursos Adicionales

- [Documentación Backend - Vertex AI Setup](./VERTEX_AI_SETUP.md)
- [API de Conversaciones de WhatsApp](./WHATSAPP_FRONTEND_API.md)
- [Documentación de SSE (Server-Sent Events)](./WHATSAPP_FRONTEND_API.md#server-sent-events-sse)

---

## ✅ Checklist de Integración

- [ ] Crear componente para listar agentes
- [ ] Crear formulario para crear agentes
- [ ] Implementar selector de agente en conversaciones
- [ ] Agregar indicadores visuales de agente activo
- [ ] Implementar manejo de errores
- [ ] Agregar notificaciones de éxito/error
- [ ] Probar flujo completo: crear → asignar → verificar respuestas automáticas

---

¡Listo para integrar! 🚀 Si tienes dudas, revisa los ejemplos de código o consulta la documentación del backend.

