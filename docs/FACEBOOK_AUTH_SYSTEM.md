# Sistema de Autenticación con Facebook/Meta OAuth 2.0

## 📋 Descripción General

Sistema completo de autenticación con Facebook/Meta API usando OAuth 2.0. Permite a los usuarios conectar sus páginas de Facebook para integrar funcionalidades como mensajería, publicación de contenido, y gestión de páginas.

## 🏗️ Arquitectura del Sistema

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │ ───> │   Backend    │ ───> │  Meta API   │
│  (Next.js)  │ <─── │  (Node.js)   │ <─── │  (OAuth 2)  │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  PostgreSQL  │
                     │  (Tokens)    │
                     └──────────────┘
```

## 🔑 Flujo OAuth 2.0 Completo

### 1. Iniciar Autorización
**Endpoint:** `GET /api/auth/facebook/start`

```bash
curl -X GET https://tudominio.com/api/auth/facebook/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "redirectUrl": "https://www.facebook.com/v19.0/dialog/oauth?client_id=...&redirect_uri=...&response_type=code&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,pages_messaging",
  "message": "Redirige al usuario a esta URL para autorizar"
}
```

### 2. Callback de Facebook
**Endpoint:** `GET /api/auth/facebook/callback?code=xxx`

Este endpoint es llamado automáticamente por Facebook después de que el usuario autorice la aplicación.

**Proceso interno:**
1. Recibe el `code` de autorización
2. Intercambia `code` por Short-Lived User Access Token
3. Intercambia Short-Lived por Long-Lived User Access Token (60 días)
4. Obtiene información del usuario de Facebook
5. Obtiene lista de páginas con sus Page Access Tokens
6. Crea sesión temporal con los datos
7. Redirige al frontend con los datos

**Redirección al frontend:**
```
https://tufrontend.com/auth/facebook/selection?session=BASE64_SESSION_TOKEN&pages=[{...}]
```

### 3. Obtener Datos de Sesión
**Endpoint:** `GET /api/auth/facebook/session/:sessionToken`

```bash
curl -X GET https://tudominio.com/api/auth/facebook/session/ABCD1234... \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "facebook_user_id": "1234567890",
      "name": "Juan Pérez",
      "email": "juan@example.com"
    },
    "pages": [
      {
        "page_id": "111222333444555",
        "page_name": "Mi Página de Negocio",
        "page_category": "Local Business",
        "page_access_token": "EAAa...",
        "tasks": ["MANAGE", "CREATE_CONTENT", "MODERATE", "MESSAGING"]
      }
    ],
    "token_expires_at": "2025-02-13T10:30:00.000Z"
  }
}
```

### 4. Almacenar Token de Página
**Endpoint:** `POST /api/auth/facebook/storePageToken`

```bash
curl -X POST https://tudominio.com/api/auth/facebook/storePageToken \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "ABCD1234...",
    "pageId": "111222333444555"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Token de página almacenado exitosamente",
  "data": {
    "id": "uuid-here",
    "page_id": "111222333444555",
    "page_name": "Mi Página de Negocio",
    "page_category": "Local Business",
    "created_at": "2025-12-15T10:30:00.000Z"
  }
}
```

## 📊 Gestión de Páginas Conectadas

### Listar Páginas
**Endpoint:** `GET /api/auth/facebook/pages`

```bash
curl -X GET https://tudominio.com/api/auth/facebook/pages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "uuid-1",
      "page_id": "111222333444555",
      "page_name": "Mi Página de Negocio",
      "page_category": "Local Business",
      "is_active": true,
      "last_sync": "2025-12-15T09:00:00.000Z",
      "created_at": "2025-12-10T10:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "page_id": "999888777666555",
      "page_name": "Otra Página",
      "page_category": "Brand",
      "is_active": true,
      "last_sync": "2025-12-14T15:20:00.000Z",
      "created_at": "2025-12-05T08:15:00.000Z"
    }
  ]
}
```

### Desconectar Página
**Endpoint:** `DELETE /api/auth/facebook/pages/:id`

```bash
curl -X DELETE https://tudominio.com/api/auth/facebook/pages/uuid-1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Página desconectada exitosamente"
}
```

### Validar Token de Página
**Endpoint:** `GET /api/auth/facebook/pages/:id/validate`

```bash
curl -X GET https://tudominio.com/api/auth/facebook/pages/uuid-1/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "page_id": "111222333444555",
    "page_name": "Mi Página de Negocio",
    "is_valid": true,
    "expires_at": 0,
    "scopes": [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_metadata",
      "pages_messaging"
    ]
  }
}
```

## 🔐 Variables de Entorno Requeridas

```env
# Facebook/Meta App Credentials
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
REDIRECT_URI=https://tudominio.com/api/auth/facebook/callback

# Frontend URL para redirecciones
FRONTEND_URL=https://tufrontend.com
```

## 🗄️ Estructura de Base de Datos

### Tabla: `facebook_page_tokens`

```sql
CREATE TABLE facebook_page_tokens (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  page_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(500),
  page_category VARCHAR(255),
  page_access_token TEXT NOT NULL,
  facebook_user_id VARCHAR(255),
  user_access_token TEXT,
  token_expires_at TIMESTAMP,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, page_id)
);
```

## 🔒 Seguridad

### Protección de Tokens
- Los Page Access Tokens son tokens de **larga duración** (no expiran).
- Los User Access Tokens expiran en **60 días**.
- Todos los tokens se almacenan en la base de datos **sin encriptar** (considera usar encriptación en producción).
- Los tokens **nunca se envían al frontend** directamente por URL.

### Autenticación y Autorización
- Todos los endpoints (excepto `/callback`) requieren autenticación JWT.
- Los usuarios solo pueden ver y gestionar sus propias páginas conectadas.
- La validación de propiedad se hace en cada operación CRUD.

### Sesiones Temporales
- Las sesiones OAuth temporales expiran en **10 minutos**.
- Se almacenan en memoria global (en producción usar Redis).
- Se eliminan automáticamente después de almacenar el token.

## 📝 Permisos (Scopes) de Facebook

Los siguientes permisos se solicitan por defecto:

| Permiso | Descripción |
|---------|-------------|
| `pages_show_list` | Ver lista de páginas |
| `pages_read_engagement` | Leer interacciones de la página |
| `pages_manage_posts` | Crear y gestionar publicaciones |
| `pages_manage_metadata` | Gestionar configuración de la página |
| `pages_messaging` | Enviar y recibir mensajes |

## 🚀 Integración con el Frontend

### Flujo Completo en Next.js

```javascript
// 1. Iniciar autorización
const startFacebookAuth = async () => {
  const response = await fetch('/api/auth/facebook/start', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  // Redirigir al usuario a Facebook
  window.location.href = data.redirectUrl;
};

// 2. En la página de selección (/auth/facebook/selection)
const SelectionPage = () => {
  const router = useRouter();
  const { session, pages } = router.query;
  
  const [sessionData, setSessionData] = useState(null);
  
  useEffect(() => {
    // Obtener datos completos de la sesión
    fetch(`/api/auth/facebook/session/${session}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSessionData(data.data));
  }, [session]);
  
  const handleSelectPage = async (pageId) => {
    const response = await fetch('/api/auth/facebook/storePageToken', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionToken: session, pageId })
    });
    
    if (response.ok) {
      router.push('/dashboard');
    }
  };
  
  return (
    <div>
      <h1>Selecciona una página</h1>
      {sessionData?.pages.map(page => (
        <button key={page.page_id} onClick={() => handleSelectPage(page.page_id)}>
          {page.page_name}
        </button>
      ))}
    </div>
  );
};
```

## 🛠️ Servicios Disponibles

### `metaApiService`

```javascript
const metaApiService = require('./services/metaApiService');

// Generar URL de autorización
const authUrl = metaApiService.generateAuthUrl(['pages_show_list', 'pages_messaging']);

// Flujo OAuth completo
const result = await metaApiService.completeOAuthFlow(code);

// Validar token
const validation = await metaApiService.validateToken(accessToken);

// Obtener información de página
const pageInfo = await metaApiService.getPageInfo(pageId, pageAccessToken);
```

## 🧪 Testing

### Probar el Flujo Completo

1. Asegúrate de tener las variables de entorno configuradas
2. Inicia el backend
3. Llama a `/api/auth/facebook/start` con un token JWT válido
4. Copia la `redirectUrl` y ábrela en el navegador
5. Autoriza la aplicación en Facebook
6. Facebook te redirigirá al callback
7. El callback te redirigirá al frontend con la sesión
8. En el frontend, selecciona una página y llama a `/storePageToken`

## 📚 Referencias

- [Meta OAuth Documentation](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Page Access Tokens](https://developers.facebook.com/docs/pages/access-tokens)

## ⚠️ Notas Importantes

1. **Configuración de App en Meta:**
   - Ve a [Meta for Developers](https://developers.facebook.com/)
   - Crea una app o usa una existente
   - Agrega "Facebook Login" al producto
   - Configura `redirect_uri` en "Valid OAuth Redirect URIs"
   - Solicita permisos avanzados si es necesario (requiere revisión de Meta)

2. **Producción:**
   - Usa Redis para sesiones temporales en lugar de memoria global
   - Considera encriptar los tokens en la base de datos
   - Implementa rotación automática de tokens próximos a expirar
   - Monitorea el estado de los tokens regularmente

3. **Limitaciones:**
   - Los tokens de página no expiran por defecto, pero pueden invalidarse si:
     - El usuario cambia la contraseña de Facebook
     - El usuario revoca permisos de la app
     - El administrador de la página revoca el acceso
   - Los tokens de usuario expiran en 60 días y deben renovarse

## 🐛 Solución de Problemas

### Error: "Redirect URI Mismatch"
- Verifica que `REDIRECT_URI` en `.env` coincida exactamente con la configurada en Meta
- Debe incluir `https://` y el puerto si aplica

### Error: "Invalid OAuth access token"
- El token ha expirado o sido revocado
- Ejecuta `/pages/:id/validate` para verificar el estado
- Re-autoriza la aplicación si es necesario

### Error: "Session not found or expired"
- La sesión temporal ha expirado (>10 minutos)
- Reinicia el flujo OAuth desde `/start`

