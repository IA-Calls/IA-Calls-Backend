# ☁️ Configuración de MongoDB en la Nube

## 📋 Variables de Entorno

Para conectar a MongoDB en la nube, configura una de estas variables de entorno:

### Opción 1: MONGODB_URI (Recomendado)
```env
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/nextvoice?retryWrites=true&w=majority
```

### Opción 2: MONGODB_CLOUD_URI
```env
MONGODB_CLOUD_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/nextvoice?retryWrites=true&w=majority
```

### Opción 3: MongoDB Atlas (Recomendado para producción)
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/nextvoice?retryWrites=true&w=majority
```

## 🔍 Verificar Conexión

El sistema mostrará en los logs:
- ✅ MongoDB conectado exitosamente
- 📍 Base de datos: nextvoice
- 🌐 Host: [host de MongoDB]

## 📊 Base de Datos y Colecciones

- **Base de datos**: `nextvoice`
- **Colección principal**: `conversations_whatsapp`

## 🔐 Seguridad

Asegúrate de:
1. Usar credenciales seguras
2. Configurar IP whitelist en MongoDB Atlas
3. Usar variables de entorno, nunca hardcodear credenciales






