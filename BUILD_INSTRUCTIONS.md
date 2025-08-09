# 🚀 Instrucciones de Build - IA-Calls Backend

## ✅ **Comandos de Build Disponibles:**

### 🔨 **Build Principal (Con carpeta dist)**
```bash
npm run build
```
- ✅ **FUNCIONA PERFECTAMENTE**
- Crea carpeta `dist/` con archivos optimizados
- Ideal para despliegue en servidores

### 🏠 **Build Normal (Sin carpeta dist)**
```bash
npm run build:normal
```
- ✅ **NUEVO - OPTIMIZA EL DIRECTORIO ACTUAL**
- No crea carpeta `dist/`
- Optimiza archivos en el directorio actual
- Crea configuración de producción
- **Este es el comando que pediste**

### 🚀 **Build Simple (Alternativa rápida)**
```bash
npm run build:simple
```
- ✅ **FUNCIONA PERFECTAMENTE**
- Build rápido con carpeta `dist/`
- Sin validaciones complejas

### 🔄 **Restaurar Desarrollo**
```bash
npm run restore:dev
```
- ✅ **RESTAURA CONFIGURACIÓN DE DESARROLLO**
- Después de usar `build:normal`
- Restaura `package.json` original
- Elimina archivos de producción

### 🧹 **Limpieza Manual**
```bash
npm run clean
```
- ✅ **FUNCIONA PERFECTAMENTE**
- Elimina directorios `dist/` y `build/`

## 📁 **Qué hace cada build:**

### **`npm run build` (Con dist):**
```
dist/
├── server.js
├── start.js
├── package.json (optimizado)
├── src/
└── .env
```

### **`npm run build:normal` (Sin dist):**
```
📁 Directorio actual optimizado:
├── package.json (optimizado para producción)
├── start.js (script de inicio optimizado)
├── .env.production (configuración de producción)
├── ecosystem.config.js (configuración PM2)
├── DEPLOYMENT.md (instrucciones)
└── logs/ (directorio para logs)
```

## 🚀 **Flujo de Trabajo Recomendado:**

### **Para Desarrollo:**
```bash
npm run dev
```

### **Para Producción (Sin carpeta dist):**
```bash
npm run build:normal
npm start
```

### **Para Producción (Con carpeta dist):**
```bash
npm run build
cd dist
npm install --production
npm start
```

### **Para volver a Desarrollo:**
```bash
npm run restore:dev
npm run dev
```

## 🔧 **Comandos Adicionales:**

### **Desarrollo:**
```bash
npm run dev          # Inicia servidor con nodemon
```

### **Validación:**
```bash
npm run lint         # Valida código con ESLint
npm run lint:fix     # Corrige errores automáticamente
```

### **Tests:**
```bash
npm run test:unit    # Ejecuta tests con Jest
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con reporte de cobertura
```

## 🎯 **Build Normal - Características:**

### **Archivos que crea:**
- **`.env.production`** - Variables de entorno para producción
- **`start.js`** - Script de inicio optimizado
- **`ecosystem.config.js`** - Configuración para PM2
- **`DEPLOYMENT.md`** - Instrucciones de despliegue
- **`logs/`** - Directorio para logs
- **`package.json`** - Optimizado para producción

### **Opciones de ejecución:**
```bash
# Opción 1: Simple
npm start

# Opción 2: Con PM2 (Recomendado)
pm2 start ecosystem.config.js --env production

# Opción 3: Con variables de entorno
NODE_ENV=production npm start
```

## 🚨 **Solución de Problemas:**

### **Si el build falla:**
```bash
npm run clean
npm run build:normal
```

### **Para volver a desarrollo:**
```bash
npm run restore:dev
```

### **Si hay problemas con dependencias:**
```bash
npm install
npm run build:normal
```

## 📝 **Notas Importantes:**

- ✅ **`npm run build:normal`** optimiza el directorio actual (sin crear dist)
- ✅ **`npm run restore:dev`** restaura la configuración de desarrollo
- 🎯 **El build normal es ideal para despliegue directo**
- 🚀 **Los archivos están optimizados y listos para producción**

## 🎉 **¡Tu sistema de build está completo!**

- **Para desarrollo:** `npm run dev`
- **Para producción (sin dist):** `npm run build:normal`
- **Para producción (con dist):** `npm run build`
- **Para restaurar desarrollo:** `npm run restore:dev`
