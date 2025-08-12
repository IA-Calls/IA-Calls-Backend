# IA Calls Backend

Backend para IA Calls - API REST con Node.js y Express

## Características

- **Autenticación JWT** - Sistema de autenticación seguro
- **Gestión de Usuarios** - CRUD completo de usuarios
- **Gestión de Clientes** - Administración de clientes con categorización
- **Gestión de Grupos** - Organización de clientes en grupos
- **Procesamiento de Archivos Excel** - Importación automática de clientes desde archivos Excel
- **Almacenamiento en Google Cloud** - Integración con Google Cloud Storage
- **Base de Datos PostgreSQL** - Persistencia de datos robusta

## Nueva Funcionalidad: Procesamiento de Archivos Excel

### Descripción
Esta funcionalidad permite procesar archivos Excel en formato Base64 al crear grupos, extrayendo automáticamente información de clientes y creándolos en la base de datos.

### Formato del JSON para crear grupos

```json
{
  "name": "string",           // Requerido - Nombre del grupo
  "description": "string",    // Opcional - Descripción del grupo
  "prompt": "string",         // Opcional - Prompt para el grupo
  "color": "string",          // Opcional - Color en formato hex (#3B82F6)
  "favorite": true,           // Opcional - Si el grupo es favorito
  "base64": "string",         // Opcional - Archivo en base64
  "document_name": "string"   // Opcional - Nombre del documento original
}
```

### Columnas requeridas en el Excel

El archivo Excel debe contener al menos estas columnas (los nombres pueden variar):

#### Columnas esenciales:
- **Nombre**: `nombre`, `name`, `nombres`, `cliente`
- **Teléfono**: `telefono`, `phone`, `celular`, `movil`, `tel`

#### Columnas opcionales:
- **Email**: `email`, `correo`, `e-mail`
- **Dirección**: `direccion`, `address`, `domicilio`

### Ejemplo de uso

#### 1. Crear grupo sin archivo
```bash
POST /api/groups
Content-Type: application/json

{
  "name": "Mi Grupo",
  "description": "Descripción del grupo",
  "color": "#3B82F6",
  "favorite": false
}
```

#### 2. Crear grupo con archivo Excel
```bash
POST /api/groups
Content-Type: application/json

{
  "name": "Clientes Importados",
  "description": "Clientes importados desde Excel",
  "base64": "UEsDBBQAAAAIAA...", // Archivo en base64
  "document_name": "clientes.xlsx"
}
```

### Características del procesamiento

- **Limpieza de datos**: Nombres y teléfonos se limpian automáticamente
- **Validaciones**: Solo se crean clientes con datos válidos
- **Carga masiva**: Procesamiento en lotes de 100 clientes para mayor eficiencia
- **Sin verificación de duplicados**: Se crean todos los clientes del archivo
- **Teléfonos duplicados permitidos**: Se permiten clientes con el mismo teléfono en diferentes grupos
- **Archivo generado**: Se crea un archivo Excel con los datos procesados
- **Manejo de errores**: El grupo se crea aunque falle el procesamiento del archivo

## Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd IA-Calls-Backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Configurar base de datos**
```bash
# Ejecutar scripts de migración
npm run migrate
```

5. **Iniciar el servidor**
```bash
npm start
# o para desarrollo
npm run dev
```

## Estructura del Proyecto

```
IA-Calls-Backend/
├── src/
│   ├── controllers/     # Controladores de la API
│   ├── models/         # Modelos de datos
│   ├── routes/         # Rutas de la API
│   ├── middleware/     # Middlewares personalizados
│   ├── services/       # Servicios de negocio
│   ├── config/         # Configuraciones
│   └── utils/          # Utilidades
├── database/           # Scripts de base de datos
├── scripts/            # Scripts de utilidad
├── docs/              # Documentación
├── uploads/           # Archivos procesados
└── tests/             # Pruebas
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/refresh` - Renovar token

### Usuarios
- `GET /api/users` - Obtener usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Clientes
- `GET /api/clients` - Obtener clientes
- `GET /api/clients/:id` - Obtener cliente por ID
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente
- `DELETE /api/clients/:id` - Eliminar cliente

### Grupos
- `GET /api/groups` - Obtener grupos
- `GET /api/groups/:id` - Obtener grupo por ID
- `POST /api/groups` - Crear grupo (con procesamiento de archivos)
- `PUT /api/groups/:id` - Actualizar grupo
- `DELETE /api/groups/:id` - Eliminar grupo
- `GET /api/groups/download/:fileName` - Descargar archivo procesado

### Gestión de Clientes en Grupos
- `POST /api/groups/:id/clients` - Agregar cliente al grupo
- `GET /api/groups/:id/clients/:client_id` - Obtener cliente específico del grupo
- `PUT /api/groups/:id/clients/:client_id` - Actualizar cliente en el grupo
- `DELETE /api/groups/:id/clients/:client_id` - Eliminar cliente del grupo

### Almacenamiento
- `POST /api/storage/upload` - Subir archivo
- `GET /api/storage/:filename` - Descargar archivo
- `DELETE /api/storage/:filename` - Eliminar archivo

## Scripts Disponibles

### Procesamiento de Archivos
```bash
# Crear archivo de prueba y generar base64
node scripts/test-file-processing.js
```

### Base de Datos
```bash
# Migrar base de datos
npm run migrate

# Restaurar desarrollo
npm run restore-dev

# Construir
npm run build
```

## Configuración

### Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_KEY_FILE=path/to/key.json
```

## Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

## Documentación Adicional

- [Documentación de Procesamiento de Archivos](docs/file-processing.md)
- [Guía de API](docs/api-guide.md)
- [Configuración de Base de Datos](docs/database-setup.md)

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles. 