# 🤖 METODOLOGÍA ESTÁNDAR DE 5 AGENTES

## 📋 PRINCIPIOS FUNDAMENTALES

**TODOS LOS CAMBIOS** en cualquier proyecto se realizarán exclusivamente a través del sistema de 5 agentes especializados. Esta es la metodología estándar para:
- Eliminación de duplicados
- Refactorización de código
- Nuevas funcionalidades
- Corrección de bugs
- Optimizaciones
- Cualquier modificación al código

## 🎯 ESPECIALIZACIÓN DE AGENTES

### 🔴 AGENTE 1 - COORDINADOR MAESTRO
**Responsabilidades:**
- **Coordinación general** de todos los agentes
- **Verificación de calidad** profunda del trabajo
- **Detección de duplicados restantes** después del trabajo
- **Comparación antes/después** de cambios
- **Validación de funcionalidad** del código
- **Reporte final consolidado** con métricas
- **Control de conflictos** entre agentes

**Funciones específicas:**
- Analizar archivo principal antes y después
- Verificar que no queden duplicados
- Validar que la funcionalidad se preserve
- Coordinar el orden de ejecución
- Generar métricas de impacto

### 🟠 AGENTE 2 - SERVICIOS CORE
**Responsabilidades:**
- **API Services** (ApiService, ApiClient)
- **Autenticación** (AuthService, login, logout)
- **Servicios principales** del sistema
- **Configuración base** (CONFIG, settings)
- **Comunicación con backend**

**Archivos asignados:**
- `backup_js/auth.service.js`
- `backup_js/apiClient.js`
- `services/` (servicios principales)
- Funciones de API en archivo principal

### 🟡 AGENTE 3 - GESTIÓN DE DATOS
**Responsabilidades:**
- **Almacenamiento** (store, localStorage)
- **CRUD operations** (create, read, update, delete)
- **Gestión de estado** (state management)
- **Persistencia de datos**
- **Servicios de datos**

**Archivos asignados:**
- `backup_js/store.js`
- `backup_js/storage.service.js`
- `backup_js/manage.service.js`
- `store/` directory
- Funciones de datos en archivo principal

### 🟢 AGENTE 4 - UI Y DASHBOARD
**Responsabilidades:**
- **Interfaz de usuario** (UI components)
- **Dashboard** y métricas visuales
- **Navegación** (routing, sections)
- **Formularios** y validaciones
- **Experiencia de usuario**

**Archivos asignados:**
- `backup_js/dashboard.service.js`
- `backup_js/create.service.js`
- `services/NavigationService.js`
- Funciones de UI en archivo principal

### 🔵 AGENTE 5 - UTILIDADES Y TESTING
**Responsabilidades:**
- **Helpers** y utilidades
- **Testing** y validaciones
- **Configuración** (eslint, vite, etc.)
- **Algoritmos** y cálculos
- **Herramientas de desarrollo**

**Archivos asignados:**
- `backup_js/helpers.js`
- `utils/` directory
- `backup_js/algorithms.service.js`
- Archivos de configuración
- Scripts de testing

## 🔄 FLUJO DE TRABAJO ESTÁNDAR

### Fase 1: Inicialización
```bash
# Usuario ejecuta comando maestro
npm run agents:coordinate-5
```

### Fase 2: Ejecución por Prioridades
1. **AGENTE 1** - Análisis inicial y coordinación
2. **AGENTES 2 y 3** - Trabajo en paralelo (servicios core y datos)
3. **AGENTES 4 y 5** - Trabajo en paralelo (UI y utilidades)
4. **AGENTE 1** - Verificación final y consolidación

### Fase 3: Verificación de Calidad
- **Comparación antes/después**
- **Detección de duplicados restantes**
- **Validación de funcionalidad**
- **Métricas de impacto**

### Fase 4: Commit y Documentación
- **Commits individuales** por agente
- **Reporte consolidado** del Agente 1
- **Documentación** de cambios

## 📊 MÉTRICAS ESTÁNDAR

Cada agente debe reportar:
- **Archivos modificados/eliminados**
- **Líneas de código reducidas**
- **Duplicados eliminados**
- **Funcionalidad preservada**
- **Tiempo de ejecución**

## 🛡️ CONTROL DE CALIDAD

### Verificaciones del Agente 1:
1. **¿Se completó el trabajo asignado?**
2. **¿Quedan duplicados en el área asignada?**
3. **¿Se preservó la funcionalidad?**
4. **¿Hay conflictos con otros agentes?**
5. **¿El código es funcional?**

### Criterios de Aprobación:
- ✅ 0 duplicados en área asignada
- ✅ Funcionalidad 100% preservada
- ✅ Sin conflictos de merge
- ✅ Código sintácticamente correcto
- ✅ Commits realizados correctamente

## 🚀 COMANDOS ESTÁNDAR

```bash
# Ejecutar sistema completo
npm run agents:coordinate-5

# Ejecutar agente individual
npm run agent1:run  # Coordinador
npm run agent2:run  # Servicios Core
npm run agent3:run  # Gestión de Datos
npm run agent4:run  # UI y Dashboard
npm run agent5:run  # Utilidades y Testing

# Verificaciones
npm run agents:status        # Estado de agentes
npm run integrity:check      # Verificación de integridad
npm run duplicates:analyze   # Análisis de duplicados
```

## 📋 PLANTILLA DE REPORTE ESTÁNDAR

Cada agente debe generar:
```json
{
  "agent": "AGENT-X",
  "timestamp": "ISO-8601",
  "executionTime": "milliseconds",
  "scope": {
    "assignedFiles": ["..."],
    "analyzedFiles": 0
  },
  "results": {
    "duplicatesEliminated": 0,
    "bytesReduced": 0,
    "functionalityPreserved": true,
    "conflictsDetected": 0
  },
  "commits": ["hash1", "hash2"],
  "status": "COMPLETED|FAILED|PARTIAL"
}
```

## 🎯 OBJETIVOS DE LA METODOLOGÍA

1. **Especialización**: Cada agente es experto en su área
2. **Coordinación**: El Agente 1 garantiza calidad y coherencia
3. **Escalabilidad**: Sistema aplicable a cualquier proyecto
4. **Trazabilidad**: Cada cambio documentado y verificado
5. **Calidad**: Verificación automática de duplicados y funcionalidad

---

**Esta metodología se aplicará a TODOS los cambios futuros en cualquier proyecto.**

