# 🤖 PROTOCOLO DE TRABAJO PARA AGENTES - MODELO ESTÁNDAR

## 📋 OBJETIVO
Establecer un sistema de trabajo donde cada agente pueda operar independientemente sin generar duplicaciones, manteniendo sintaxis correcta y comunicación entre archivos.

---

## 🔧 ÁREA DE INSTRUCCIONES CENTRALIZADAS

### 📍 **UBICACIÓN DE INSTRUCCIONES:**
- **Archivo principal:** `AGENT_WORK_PROTOCOL.md` (este archivo)
- **Configuración:** `agent_config.json`
- **Mapeo de archivos:** `file_mapping.json`
- **Sintaxis y nombres:** `syntax_rules.json`

### 📖 **LECTURA OBLIGATORIA:**
**TODOS los agentes DEBEN leer estas instrucciones ANTES de cualquier modificación:**

1. ✅ Leer `AGENT_WORK_PROTOCOL.md` completo
2. ✅ Verificar `file_mapping.json` para ubicaciones
3. ✅ Consultar `syntax_rules.json` para nombres y sintaxis
4. ✅ Revisar `agent_config.json` para configuración específica

---

## 🎯 PRINCIPIOS FUNDAMENTALES

### 🚫 **PROHIBICIONES ABSOLUTAS:**
1. **NO crear archivos duplicados** con nombres similares
2. **NO modificar** archivos sin verificar dependencias
3. **NO usar** nombres de variables/funciones ya existentes
4. **NO eliminar** imports/exports sin verificar uso
5. **NO trabajar** en paralelo en el mismo archivo

### ✅ **OBLIGACIONES:**
1. **SÍ verificar** mapeo de archivos antes de modificar
2. **SÍ usar** nombres únicos según convenciones
3. **SÍ actualizar** mapeo después de cambios
4. **SÍ validar** sintaxis antes de commit
5. **SÍ comunicar** cambios a otros agentes

---

## 📁 MAPEO DE ARCHIVOS Y RESPONSABILIDADES

### 🗂️ **ESTRUCTURA AUTORIZADA:**
```
proyecto/
├── index.html                    [AGENTE-2: Principal]
├── flashcard-app-final.js        [AGENTE-2: Lógica principal]
├── styles.css                    [AGENTE-5: Estilos]
├── services/
│   └── NavigationService.js      [AGENTE-4: Navegación]
├── utils/
│   ├── helpers.js                [AGENTE-5: Utilidades]
│   └── formValidation.js         [AGENTE-5: Validación]
└── tests/                        [AGENTE-5: Testing]
```

### 🎯 **RESPONSABILIDADES POR AGENTE:**

#### **AGENTE 1 - COORDINADOR**
- **Archivos:** NINGUNO (solo supervisión)
- **Función:** Verificar, coordinar, validar
- **Prohibido:** Modificar código directamente

#### **AGENTE 2 - APLICACIÓN PRINCIPAL**
- **Archivos:** `index.html`, `flashcard-app-final.js`
- **Función:** Lógica principal, estructura HTML
- **Prohibido:** Tocar CSS, servicios externos, utilidades

#### **AGENTE 3 - GESTIÓN DE DATOS**
- **Archivos:** Funciones de datos dentro de `flashcard-app-final.js`
- **Función:** CRUD, almacenamiento, APIs
- **Prohibido:** Modificar UI, estilos, navegación

#### **AGENTE 4 - UI Y NAVEGACIÓN**
- **Archivos:** `services/NavigationService.js`, UI en `index.html`
- **Función:** Navegación, interfaz de usuario
- **Prohibido:** Modificar lógica de datos, estilos CSS

#### **AGENTE 5 - UTILIDADES Y TESTING**
- **Archivos:** `utils/`, `tests/`, `styles.css`
- **Función:** Helpers, validación, estilos, tests
- **Prohibido:** Modificar lógica principal, navegación

---

## 🔗 SINTAXIS Y COMUNICACIÓN ENTRE ARCHIVOS

### 📝 **CONVENCIONES DE NOMBRES:**

#### **Variables Globales:**
```javascript
// FORMATO: [AGENTE]_[FUNCIÓN]_[DESCRIPCIÓN]
const AGENT2_APP_CONFIG = {};
const AGENT3_DATA_STORE = {};
const AGENT4_NAV_STATE = {};
const AGENT5_UTILS_CACHE = {};
```

#### **Funciones:**
```javascript
// FORMATO: [agente][Función][Acción]
function agent2AppInitialize() {}
function agent3DataLoad() {}
function agent4NavNavigate() {}
function agent5UtilsValidate() {}
```

#### **Clases:**
```javascript
// FORMATO: [Agente][Función]Service
class Agent2AppService {}
class Agent3DataService {}
class Agent4NavigationService {}
class Agent5UtilsService {}
```

### 🔌 **COMUNICACIÓN ENTRE AGENTES:**

#### **Sistema de Eventos:**
```javascript
// Emisor (cualquier agente)
window.dispatchEvent(new CustomEvent('agent-communication', {
  detail: {
    from: 'AGENT-2',
    to: 'AGENT-3',
    action: 'data-updated',
    data: { ... }
  }
}));

// Receptor (agente específico)
window.addEventListener('agent-communication', (event) => {
  if (event.detail.to === 'AGENT-3') {
    // Procesar mensaje
  }
});
```

#### **API Interna:**
```javascript
// Registro global de funciones
window.AGENT_API = {
  'AGENT-2': {
    initialize: agent2AppInitialize,
    getState: agent2AppGetState
  },
  'AGENT-3': {
    loadData: agent3DataLoad,
    saveData: agent3DataSave
  },
  // ...
};
```

---

## 📋 PROCESO DE TRABAJO PASO A PASO

### 🔍 **ANTES DE MODIFICAR (OBLIGATORIO):**

#### **Paso 1: Verificación de Archivos**
```bash
# Leer mapeo actual
cat file_mapping.json

# Verificar responsabilidad
grep "AGENTE-X" file_mapping.json
```

#### **Paso 2: Verificación de Sintaxis**
```bash
# Consultar reglas de nombres
cat syntax_rules.json

# Verificar nombres existentes
grep -r "function\|class\|const\|let" . --include="*.js"
```

#### **Paso 3: Verificación de Dependencias**
```bash
# Buscar imports/exports del archivo
grep -n "import\|export\|require" archivo.js

# Buscar referencias al archivo
grep -r "archivo.js" . --include="*.html" --include="*.js"
```

### ✏️ **DURANTE LA MODIFICACIÓN:**

#### **Paso 1: Usar Nombres Únicos**
```javascript
// ❌ INCORRECTO (genérico)
function loadData() {}
const config = {};

// ✅ CORRECTO (específico del agente)
function agent3DataLoad() {}
const AGENT3_DATA_CONFIG = {};
```

#### **Paso 2: Mantener Comunicación**
```javascript
// ✅ Notificar cambios a otros agentes
function agent3DataSave(data) {
  // Guardar datos
  localStorage.setItem('data', JSON.stringify(data));
  
  // Notificar a otros agentes
  window.dispatchEvent(new CustomEvent('agent-communication', {
    detail: {
      from: 'AGENT-3',
      to: 'ALL',
      action: 'data-saved',
      data: { timestamp: Date.now() }
    }
  }));
}
```

#### **Paso 3: Validar Sintaxis**
```bash
# Validar JavaScript
node -c archivo.js

# Validar HTML
npx html-validate archivo.html

# Validar CSS
npx stylelint archivo.css
```

### 📝 **DESPUÉS DE MODIFICAR (OBLIGATORIO):**

#### **Paso 1: Actualizar Mapeo**
```json
// Actualizar file_mapping.json
{
  "archivo_modificado.js": {
    "agent": "AGENT-3",
    "last_modified": "2025-07-08T15:00:00Z",
    "functions_added": ["agent3DataLoad", "agent3DataSave"],
    "dependencies": ["localStorage", "CustomEvent"]
  }
}
```

#### **Paso 2: Ejecutar Verificaciones**
```bash
# Verificar que no hay duplicados
python3 verify_no_duplicates.py

# Verificar sintaxis global
npm run lint

# Verificar funcionalidad
npm run test
```

#### **Paso 3: Commit Estructurado**
```bash
git add .
git commit -m "[AGENT-X] Descripción específica - Sin duplicados - Sintaxis validada"
```

---

## 🛡️ SISTEMA DE PREVENCIÓN DE ERRORES

### 🔍 **VERIFICACIONES AUTOMÁTICAS:**

#### **Script de Verificación Pre-Commit:**
```bash
#!/bin/bash
# pre-commit-check.sh

echo "🔍 Verificando duplicados..."
python3 verify_no_duplicates.py || exit 1

echo "🔍 Verificando sintaxis..."
npm run lint || exit 1

echo "🔍 Verificando nombres únicos..."
python3 verify_unique_names.py || exit 1

echo "✅ Verificaciones completadas"
```

#### **Validación de Nombres:**
```python
# verify_unique_names.py
import re
import json

def verify_unique_names():
    # Verificar que no hay nombres duplicados
    # Verificar convenciones de nombres
    # Verificar comunicación entre archivos
    pass
```

### 🚨 **SISTEMA DE ALERTAS:**

#### **Alertas por Agente:**
```javascript
// Sistema de alertas en tiempo real
function validateAgentAction(agent, action, file) {
  const rules = AGENT_RULES[agent];
  
  if (!rules.allowed_files.includes(file)) {
    throw new Error(`❌ AGENTE ${agent}: No autorizado para modificar ${file}`);
  }
  
  if (rules.forbidden_actions.includes(action)) {
    throw new Error(`❌ AGENTE ${agent}: Acción ${action} prohibida`);
  }
  
  return true;
}
```

---

## 📊 MONITOREO Y MÉTRICAS

### 📈 **Métricas por Agente:**
- Archivos modificados
- Duplicados generados (debe ser 0)
- Errores de sintaxis
- Conflictos con otros agentes
- Tiempo de ejecución

### 📋 **Reporte de Calidad:**
```json
{
  "agent": "AGENT-3",
  "session": "2025-07-08-session-1",
  "files_modified": ["flashcard-app-final.js"],
  "duplicates_created": 0,
  "syntax_errors": 0,
  "naming_violations": 0,
  "communication_events": 3,
  "quality_score": 100
}
```

---

## 🎯 MODELO DE TRABAJO ESTÁNDAR

### 🔄 **Flujo de Trabajo:**
1. **Lectura de instrucciones** (obligatorio)
2. **Verificación de permisos** y responsabilidades
3. **Análisis de dependencias** y comunicación
4. **Modificación con nombres únicos** y sintaxis correcta
5. **Validación automática** y manual
6. **Actualización de mapeo** y documentación
7. **Commit estructurado** y comunicación a otros agentes

### ✅ **Criterios de Éxito:**
- 0 duplicados generados
- 0 errores de sintaxis
- 100% comunicación entre archivos funcional
- Nombres únicos y convenciones respetadas
- Independencia total entre agentes

---

**🎉 ESTE ES TU MODELO DE TRABAJO ESTÁNDAR PARA TODOS LOS PROYECTOS FUTUROS**

