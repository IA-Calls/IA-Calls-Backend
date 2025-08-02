# API de Extracción de Clientes desde Excel

## Endpoint: `/clients/extract-excel`

Este endpoint permite cargar un archivo Excel y extraer automáticamente los datos de clientes, con la opción de asignarlos a un grupo específico.

### Método
```
POST /clients/extract-excel
```

### Parámetros

#### FormData (multipart/form-data)
- `file`: Archivo Excel (.xlsx, .xls) - **Requerido**
- `groupId`: ID del grupo al que asignar los clientes - **Opcional**

### Formato del Archivo Excel

El archivo Excel debe tener las siguientes columnas (en la primera fila como encabezados):

| Columna | Descripción | Requerido | Ejemplos de nombres |
|---------|-------------|-----------|-------------------|
| Nombre | Nombre completo del cliente | ✅ | `Nombre`, `Name`, `Cliente` |
| Teléfono | Número de teléfono | ✅ | `Teléfono`, `Phone`, `Telefono` |
| Email | Correo electrónico | ❌ | `Email`, `Correo`, `E-mail` |
| Dirección | Dirección física | ❌ | `Dirección`, `Address`, `Direccion` |
| Categoría | Categoría del cliente | ❌ | `Categoría`, `Category`, `Categoria` |
| Comentario | Notas o comentarios | ❌ | `Comentario`, `Review`, `Nota` |

### Ejemplo de Archivo Excel

| Nombre | Teléfono | Email | Dirección | Categoría | Comentario |
|--------|----------|-------|-----------|-----------|------------|
| Juan Pérez | +573001234567 | juan@example.com | Calle 123 #45-67 | General | Cliente potencial |
| María García | +573007654321 | maria@example.com | Avenida 89 #12-34 | VIP | Cliente de alto valor |

### Ejemplos de Uso

#### 1. Carga sin asignar a grupo
```bash
curl -X POST http://localhost:5000/clients/extract-excel \
  -F "file=@clientes.xlsx"
```

#### 2. Carga asignando a un grupo específico
```bash
curl -X POST http://localhost:5000/clients/extract-excel \
  -F "file=@clientes.xlsx" \
  -F "groupId=1"
```

#### 3. Usando JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('groupId', '1'); // Opcional

fetch('/clients/extract-excel', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### Respuestas

#### Respuesta Exitosa (sin grupo)
```json
{
  "success": true,
  "message": "Extracción completada: 5 clientes procesados",
  "data": {
    "filename": "clientes.xlsx",
    "totalRows": 5,
    "totalExtracted": 5,
    "successfullyProcessed": 5,
    "processingErrors": 0,
    "parsingErrors": 0,
    "clients": [
      {
        "id": 2,
        "name": "Juan Pérez",
        "phone": "+573001234567",
        "email": "juan@example.com",
        "address": "Calle 123 #45-67",
        "category": "General",
        "review": "Cliente potencial",
        "status": "pending",
        "action": "created"
      }
    ],
    "errors": [],
    "groupAssignment": null
  }
}
```

#### Respuesta Exitosa (con grupo)
```json
{
  "success": true,
  "message": "Extracción completada: 5 clientes procesados, 5 asignados al grupo \"VIP Clientes\"",
  "data": {
    "filename": "clientes.xlsx",
    "totalRows": 5,
    "totalExtracted": 5,
    "successfullyProcessed": 5,
    "processingErrors": 0,
    "parsingErrors": 0,
    "clients": [...],
    "errors": [],
    "groupAssignment": {
      "groupId": 1,
      "groupName": "VIP Clientes",
      "totalClients": 5,
      "successfullyAssigned": 5,
      "assignmentErrors": 0,
      "assignmentDetails": [
        {
          "success": true,
          "clientId": 2,
          "clientName": "Juan Pérez",
          "action": "assigned_to_group"
        }
      ]
    }
  }
}
```

#### Respuesta de Error (Archivo requerido)
```json
{
  "success": false,
  "message": "Archivo Excel requerido"
}
```

#### Respuesta de Error (Grupo no encontrado)
```json
{
  "success": false,
  "message": "Grupo no encontrado"
}
```

#### Respuesta de Error (Formato inválido)
```json
{
  "success": false,
  "message": "El archivo Excel debe tener al menos una fila de encabezados y una fila de datos"
}
```

### Flujo de Proceso

1. **Validación de archivo**: Se verifica que se haya subido un archivo Excel válido
2. **Validación de grupo**: Si se especifica `groupId`, se verifica que el grupo existe
3. **Lectura del Excel**: Se lee la primera hoja del archivo Excel
4. **Mapeo de columnas**: Se identifican automáticamente las columnas por nombre
5. **Procesamiento de datos**: Se procesan cada fila y se validan los datos mínimos
6. **Creación/Actualización**: Se crean nuevos clientes o se actualizan existentes
7. **Asignación a grupo**: Si se especificó un grupo, se asignan los clientes
8. **Reporte**: Se devuelve un reporte detallado del proceso

### Características

- **Detección automática de columnas**: Reconoce columnas por nombres similares
- **Validación de datos**: Verifica que nombre y teléfono estén presentes
- **Manejo de duplicados**: Actualiza clientes existentes por teléfono
- **Asignación automática**: Asigna clientes a grupos automáticamente
- **Reporte detallado**: Proporciona información completa del proceso
- **Manejo de errores**: Identifica y reporta errores específicos por fila
- **Metadatos**: Guarda información sobre el origen de los datos

### Límites

- **Tamaño de archivo**: Máximo 10MB
- **Formatos soportados**: .xlsx, .xls
- **Columnas requeridas**: Nombre, Teléfono
- **Columnas opcionales**: Email, Dirección, Categoría, Comentario

### Notas Importantes

- Los clientes se crean con status "pending" por defecto
- Si un cliente ya existe (por teléfono), se actualiza con los nuevos datos
- Los metadatos incluyen información sobre el archivo de origen y la fila
- El endpoint es idempotente: puede ejecutarse múltiples veces sin duplicar datos
- Se mantiene un registro completo de errores y éxitos por fila 