# 🚀 IA Calls Backend

Backend para IA Calls - API REST construida con Node.js y Express.

## 📋 Características

- ✅ Servidor Express con configuración completa
- ✅ Middleware de seguridad (Helmet, CORS)
- ✅ Logging con Morgan
- ✅ Manejo de errores centralizado
- ✅ Estructura modular y escalable
- ✅ Archivos estáticos
- ✅ Validación de datos
- ✅ Autenticación básica
- ✅ Variables de entorno

## 🛠️ Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Helmet** - Seguridad HTTP
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - Logging HTTP
- **dotenv** - Variables de entorno

## 📁 Estructura del proyecto

```
IA-Calls-Backend/
├── src/
│   ├── controllers/        # Controladores de rutas
│   │   └── index.js       # Controladores principales
│   ├── middleware/        # Middleware personalizado
│   │   └── auth.js        # Autenticación y autorización
│   ├── models/            # Modelos de datos
│   ├── routes/            # Definición de rutas
│   │   └── index.js       # Rutas principales
│   ├── config/            # Configuraciones
│   │   └── database.js    # Configuración de BD
│   └── utils/             # Funciones de utilidad
│       └── helpers.js     # Funciones helper
├── public/                # Archivos estáticos
├── tests/                 # Pruebas
├── .env                   # Variables de entorno
├── .gitignore            # Archivos ignorados por Git
├── package.json          # Dependencias y scripts
├── server.js             # Servidor principal
└── README.md             # Documentación
```

## 🚀 Instalación

1. **Clonar el repositorio:**
```bash
git clone <url-del-repositorio>
cd IA-Calls-Backend
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# Crear archivo .env
cp .env.example .env

# Editar las variables según tu configuración
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ia_calls_db
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
JWT_SECRET=tu_clave_secreta
```

## 📱 Uso

### Iniciar servidor:
```bash
# Ambos comandos hacen lo mismo
npm run dev
# o
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 🔗 Endpoints

### Rutas principales:

- **GET** `/` - Información de la API
- **GET** `/api/status` - Estado del servidor
- **GET** `/api/health` - Health check
- **POST** `/api/example` - Ejemplo de ruta POST

### Ejemplos de uso:

```bash
# Obtener estado del servidor
curl http://localhost:3000/api/status

# Health check
curl http://localhost:3000/api/health

# Ejemplo POST
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "Hola mundo"}'
```

## 🔐 Autenticación

Para rutas protegidas, incluir el token en el header:

```bash
curl -H "Authorization: Bearer tu_token" http://localhost:3000/api/protected
```

## 📊 Base de datos

La configuración de base de datos está en `src/config/database.js`. 
Actualmente soporta:
- PostgreSQL (configurado por defecto)
- MySQL
- SQLite
- MongoDB

## 🧪 Testing

```bash
npm test
```

## 📝 Scripts disponibles

- `npm start` - Iniciar servidor
- `npm run dev` - Iniciar servidor (igual que start)
- `npm test` - Ejecutar pruebas

## 🔧 Configuración adicional

### Middleware personalizado:
- **Autenticación**: `src/middleware/auth.js`
- **Validación**: En desarrollo
- **Rate limiting**: En desarrollo

### Utilidades:
- **Helpers**: `src/utils/helpers.js`
- **Validaciones**: Funciones de validación incluidas
- **Respuestas**: Formateo estándar de respuestas

## 🌟 Próximas características

- [ ] Integración con JWT
- [ ] Rate limiting
- [ ] Validación de esquemas
- [ ] Paginación
- [ ] Filtros y búsqueda
- [ ] Documentación API con Swagger
- [ ] Pruebas unitarias
- [ ] CI/CD Pipeline

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -m 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.

## 📞 Contacto

Para preguntas o soporte, contactar a: [tu-email@ejemplo.com]

---

⭐ **¡No olvides dar una estrella si este proyecto te ayuda!** 