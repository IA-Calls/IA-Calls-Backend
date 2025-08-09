# 🚀 Instrucciones de Build - IA-Calls Backend

## ✅ **Comandos de Build que FUNCIONAN:**

### 🔨 **Build Principal (Recomendado)**
```bash
npm run build
```
- ✅ **FUNCIONA PERFECTAMENTE**
- Ejecuta el script de build completo
- Incluye limpieza automática y creación de build de producción
- Genera archivos en el directorio `dist/`
- **Este es el comando principal que debes usar**

### 🚀 **Build Simple (Alternativa)**
```bash
npm run build:simple
```
- ✅ **FUNCIONA PERFECTAMENTE**
- Build más rápido y directo
- Sin validaciones complejas
- Ideal para builds rápidos durante desarrollo

### 🧹 **Limpieza Manual**
```bash
npm run clean
```
- ✅ **FUNCIONA PERFECTAMENTE**
- Elimina directorios `dist/` y `build/`
- Útil antes de hacer un nuevo build

## 📁 **Estructura del Build Generado:**

Después de ejecutar `npm run build`, se creará:

```
dist/
├── server.js          # Servidor principal
├── start.js           # Script de inicio optimizado
├── package.json       # Dependencias optimizadas para producción
├── src/               # Código fuente completo
└── .env               # Variables de entorno (si existe)
```

## 🚀 **Cómo Usar (Paso a Paso):**

### **1. Generar Build:**
```bash
npm run build
```

### **2. Verificar que se creó el directorio dist:**
```bash
dir dist
```

### **3. Navegar al directorio de build:**
```bash
cd dist
```

### **4. Instalar dependencias de producción:**
```bash
npm install --production
```

### **5. Iniciar servidor:**
```bash
npm start
```

## 🔧 **Comandos Adicionales Disponibles:**

### **Desarrollo:**
```bash
npm run dev          # Inicia servidor con nodemon
```

### **Validación de Código:**
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

## 🚨 **Solución de Problemas:**

### **Si el build falla:**
1. **Limpiar y reintentar:**
   ```bash
   npm run clean
   npm run build
   ```

2. **Usar build simple como alternativa:**
   ```bash
   npm run build:simple
   ```

### **Si hay problemas con dependencias:**
```bash
npm install
npm run build
```

## 📝 **Notas Importantes:**

- ✅ **`npm run build`** es el comando principal y funciona perfectamente
- ✅ **`npm run build:simple`** es una alternativa rápida y confiable
- ✅ **`npm run clean`** limpia directorios antes del build
- 🎯 **El directorio `dist/` contiene todo lo necesario para producción**
- 🚀 **Los archivos están optimizados y listos para despliegue**

## 🔄 **Flujo de Trabajo Recomendado:**

1. **Desarrollo**: `npm run dev`
2. **Build**: `npm run build`
3. **Verificación**: `dir dist`
4. **Despliegue**: Copiar directorio `dist/` al servidor

## 🎉 **¡Tu sistema de build está funcionando perfectamente!**

Usa `npm run build` como tu comando principal de build.
