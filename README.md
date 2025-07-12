# 🎓 StudyingFlash - Aplicación de Flashcards Inteligente

[![Enterprise Testing Suite](https://github.com/Matraca130/FLASHCARD/workflows/Enterprise%20Testing%20Suite/badge.svg)](https://github.com/Matraca130/FLASHCARD/actions/workflows/enterprise-testing.yml)
[![GitHub Pages](https://github.com/Matraca130/FLASHCARD/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/Matraca130/FLASHCARD/actions/workflows/deploy-pages.yml)

## ✨ Características Principales

- 📚 **Gestión de Mazos**: Crea y organiza tus flashcards por temas
- 🧠 **Algoritmos de Repetición**: SM-2, Ultra SM-2, Anki y FSRS para optimizar el aprendizaje
- 🖼️ **Soporte Multimedia**: Flashcards con imágenes, audio y video
- 📊 **Estadísticas Avanzadas**: Seguimiento detallado de tu progreso
- 🎮 **Gamificación**: Sistema de puntos y logros
- 📱 **PWA**: Funciona offline y se puede instalar como app
- 🌙 **Tema Oscuro**: Interfaz adaptable para cualquier momento del día
- 🔄 **Nomenclatura Unificada**: Consistencia total entre frontend y backend

## 🚀 Estado del Proyecto

✅ **Nomenclatura Unificada**: Frontend y backend con estructura `front_content/back_content`  
✅ **Soporte Multimedia**: Imágenes, audio y video implementados  
✅ **CI/CD Pipeline**: Workflows automatizados funcionando  
✅ **GitHub Pages**: Deploy automático configurado  
✅ **Testing**: Suite de pruebas implementada  
✅ **Code Quality**: ESLint y Prettier configurados  

## 📁 Estructura del Proyecto

### **Archivos Principales**
```
📦 FLASHCARD/
├── 📄 index.html                    # Página principal
├── 📄 flashcard-app-final.js        # Aplicación principal
├── 📄 flashcards.service.js         # Servicio de flashcards (UNIFICADO)
├── 📄 apiClient.js                  # Cliente API
├── 📄 store.js                      # Gestión de estado
├── 📄 bindings.js                   # Event bindings
├── 📄 charts.js                     # Gráficas y estadísticas
└── 📄 main.js                       # Punto de entrada
```

### **Backend (Python/Flask)**
```
📂 backend_app/
├── 📂 api/
│   ├── 📄 flashcards.py             # API flashcards (UNIFICADO)
│   ├── 📄 decks.py                  # API mazos
│   ├── 📄 auth.py                   # Autenticación
│   └── 📄 study.py                  # Sesiones de estudio
├── 📂 models/
│   ├── 📄 models.py                 # Modelos BD (UNIFICADO)
│   └── 📄 refresh_token.py          # Tokens de refresh
└── 📂 utils/
    └── 📄 algorithms.py             # Algoritmos de repetición
```

### **Frontend Modular**
```
📂 services/
└── 📄 NavigationService.js          # Navegación

📂 utils/
├── 📄 apiHelpers.js                 # Helpers para API
├── 📄 formValidation.js             # Validación de formularios
├── 📄 helpers.js                    # Utilidades generales
├── 📄 loading.js                    # Estados de carga
├── 📄 notifications.js              # Sistema de notificaciones
└── 📄 lazy-loader.js                # Carga lazy de componentes
```

### **Archivos de Configuración**
```
📄 package.json                      # Dependencias y scripts
📄 vite.config.js                    # Configuración Vite
📄 eslint.config.js                  # Configuración ESLint
📄 .prettierrc                       # Configuración Prettier
📄 vitest.config.js                  # Configuración tests
```

## 📚 Documentación y Guías

### **Documentación Principal**
- 📖 **[Nomenclatura Unificada](./DOCUMENTACION_NOMENCLATURA_UNIFICADA.md)** - Guía completa de la estructura unificada
- 📋 **[Plan de Nomenclatura](./NOMENCLATURA_UNIFICADA_PLAN.md)** - Diseño y justificación de la unificación
- 🔍 **[Diagnóstico de Integración](./DIAGNOSTICO_INTEGRACION_FLASHCARDS.md)** - Análisis de la integración entre componentes

### **Sistema de 5 Agentes para Unificación**
- 🤖 **[Manual Completo de 5 Agentes](./MANUAL_5_AGENTES_UNIFICADO.md)** - Sistema completo de coordinación de agentes
- 📋 **[Manual PDF](./MANUAL_5_AGENTES_UNIFICADO.pdf)** - Versión PDF del manual completo
- 👑 **[Instrucciones Agente Coordinador](./INSTRUCCIONES_AGENTE_1_COORDINADOR.md)** - Protocolo del agente coordinador maestro
- 📊 **[Plan de Trabajo 5 Agentes](./PLAN_TRABAJO_5_AGENTES.md)** - Distribución de tareas entre agentes
- 🌐 **[Plan Agentes HTML](./PLAN_AGENTES_HTML.md)** - Especialización para archivos HTML
- 🔧 **[Plan de Refactorización](./PLAN_REFACTORIZACION.md)** - Estrategia de refactorización
- 📈 **[Plan Final 5 Agentes](./PLAN_FINAL_5_AGENTES.md)** - Consolidación final del sistema

### **Archivos de Coordinación JSON**
- 🔄 **[Distribución de Agentes](./agent_distribution_plan.json)** - Plan detallado de distribución de trabajo
- 📊 **[Reporte de Coordinación Final](./final_coordination_report.json)** - Reporte consolidado final
- 🔍 **[Reporte de Coordinación Mejorado](./enhanced_coordination_report.json)** - Análisis detallado de coordinación
- ⚙️ **[Configuración de Coordinación](./unified_coordination_report.json)** - Configuración unificada
- 🎯 **[Configuración de Agentes](./.agent-coordination.json)** - Configuración activa de coordinación

### **Scripts de Migración**
- 🔧 **[Script de Migración](./migration_script.py)** - Migración automática de base de datos
- 📊 **[Todo de Diagnóstico](./diagnostico_todo.md)** - Lista de tareas de diagnóstico

### **Archivos de Backup**
```
📂 backup_original/
├── 📄 flashcards.py                 # API original (pre-unificación)
├── 📄 flashcards.service.js         # Servicio original (pre-unificación)
└── 📄 models.py                     # Modelo original (pre-unificación)
```

## 🎯 Nomenclatura Unificada

### **Estructura de Flashcard**
```javascript
// FORMATO UNIFICADO (Frontend y Backend)
{
  "front_content": {
    "text": "¿Cuál es la capital de Francia?",
    "image_url": "https://cdn.example.com/france.jpg",
    "audio_url": "https://cdn.example.com/audio/france.mp3",
    "video_url": null
  },
  "back_content": {
    "text": "París",
    "image_url": "https://cdn.example.com/paris.jpg",
    "audio_url": null,
    "video_url": null
  },
  "algorithm_data": {
    "algorithm_type": "fsrs",
    "ease_factor": 2.5,
    "interval": 7,
    "stability": 15.2,
    "next_review": "2024-01-15T10:00:00Z"
  }
}
```

### **Compatibilidad Legacy**
El sistema mantiene compatibilidad con el formato anterior:
```javascript
// FORMATO LEGACY (Aún soportado)
{
  "front": "¿Cuál es la capital de Francia?",
  "back": "París",
  "front_image_url": "https://cdn.example.com/france.jpg"
}
```

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Python 3.11, Flask, SQLAlchemy
- **Base de Datos**: SQLite (desarrollo), PostgreSQL (producción)
- **Build**: Vite
- **Testing**: Vitest, Cypress
- **CI/CD**: GitHub Actions
- **Deploy**: GitHub Pages

## 📦 Instalación y Desarrollo

### **Frontend**
```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Ejecutar tests
npm run test

# Linting y formateo
npm run lint
npm run format
```

### **Backend (Opcional)**
```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
python app.py

# Migrar base de datos
python migration_script.py --action migrate
```

## 🔧 Scripts Útiles

### **Migración de Nomenclatura**
```bash
# Migración completa
python migration_script.py --action migrate

# Modo simulación (sin cambios)
python migration_script.py --action migrate --dry-run

# Generar reporte
python migration_script.py --action report

# Validar migración
python migration_script.py --action validate
```

### **Análisis de Código**
```bash
# Análisis de duplicados JavaScript
python analyze_js_duplicates.py

# Análisis de duplicados HTML
python analyze_html_duplicates.py

# Auditoría de commits
python audit_commits.py
```

### **Sistema de 5 Agentes**
```bash
# Coordinación automática de agentes
node scripts/enhanced_agent1_coordinator_fixed.cjs

# Asignación automática según tarea:
# "Modificar HTML" → AGENT-2 + AGENT-4 + AGENT-1 + AGENT-5
# "Optimizar performance" → AGENT-3 + AGENT-2 + AGENT-1 + AGENT-5
# "Cambiar CSS" → AGENT-5 + AGENT-2 + AGENT-1 + AGENT-4
```

## 🤖 Instrucciones para Agentes

### **📋 Protocolo Obligatorio para Todos los Agentes**

**⚠️ CRÍTICO:** Antes de realizar cualquier modificación, TODOS los agentes DEBEN:

1. **Leer archivos base obligatorios:**
   - ✅ `AGENT_CODING_STANDARDS.md` - Estándares de codificación
   - ✅ `MANUAL_5_AGENTES_UNIFICADO.md` - Manual completo del sistema
   - ✅ `AGENT_WORK_PROTOCOL.md` - Protocolo de trabajo
   - ✅ `UNIFICATION_PROTOCOL.md` - Reglas anti-duplicación

2. **Seguir nomenclatura unificada:**
   - ✅ Usar estructura `front_content/back_content`
   - ✅ Mantener compatibilidad con formato legacy
   - ✅ Aplicar convenciones de nombres consistentes

3. **Verificar antes de commit:**
   - ✅ No crear nuevas duplicaciones
   - ✅ Mantener sintaxis unificada
   - ✅ Validar funcionalidad existente

### **🎯 Roles de Agentes Especializados**

- **AGENTE 1**: Coordinador Maestro - Supervisión general
- **AGENTE 2**: Frontend/HTML - Interfaces y componentes
- **AGENTE 3**: Backend/API - Servicios y lógica de negocio
- **AGENTE 4**: JavaScript/Logic - Funcionalidades y algoritmos
- **AGENTE 5**: CSS/Styling - Estilos y presentación

### **📊 Sistema de Coordinación**
- **Locks automáticos** con timeout de 5 minutos
- **Heartbeat** cada 30 segundos
- **Merge inteligente** con resolución de conflictos
- **Reportes de progreso** cada 15 minutos

## 🎮 Uso de la Aplicación

### **Crear Flashcard con Multimedia**
```javascript
import flashcardService from './flashcards.service.js';

// Crear flashcard con imagen
const flashcard = await flashcardService.createFlashcard({
  deck_id: 123,
  front_content: {
    text: "¿Cuál es la capital de Francia?",
    image_file: imageFile // File object
  },
  back_content: {
    text: "París"
  }
});
```

### **Procesar Revisión**
```javascript
// Procesar revisión con algoritmo FSRS
const result = await flashcardService.reviewFlashcard(flashcardId, {
  rating: 3,        // 1=Again, 2=Hard, 3=Good, 4=Easy
  responseTime: 1500,
  algorithmType: 'fsrs'
});
```

## 🌐 Demo y Deploy

- **Demo Live**: https://matraca130.github.io/FLASHCARD/
- **Deploy Automático**: Cada push a `main` despliega automáticamente
- **Entorno de Desarrollo**: `npm run dev` → http://localhost:5174

## 🧪 Testing

### **Ejecutar Tests**
```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:coverage

# Tests E2E
npm run test:e2e

# Tests específicos
npm run test -- flashcards.test.js
```

### **Estructura de Tests**
```
📂 tests/
├── 📂 unit/                         # Tests unitarios
├── 📂 integration/                  # Tests de integración
└── 📂 e2e/                          # Tests end-to-end
```

## 🔍 Debugging y Desarrollo

### **Logs y Debugging**
```javascript
// Activar logs detallados
localStorage.setItem('debug', 'true');

// Ver estadísticas de cache
const stats = flashcardService.getCacheStats();
console.log('Cache stats:', stats);
```

### **Variables de Entorno**
```bash
# Desarrollo
VITE_API_URL=http://localhost:5000
VITE_DEBUG=true

# Producción
VITE_API_URL=https://api.studyingflash.com
VITE_DEBUG=false
```

## 🤝 Contribución

### **Convenciones de Código**
- **Nomenclatura**: Usar estructura `front_content/back_content`
- **Formato**: Prettier para formateo automático
- **Linting**: ESLint para calidad de código
- **Commits**: Conventional Commits format

### **Workflow de Desarrollo**
1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Hacer cambios siguiendo las convenciones
4. Tests: `npm run test`
5. Commit: `git commit -m "feat: nueva funcionalidad"`
6. Push: `git push origin feature/nueva-funcionalidad`
7. Crear Pull Request

## 📈 Roadmap

### **Completado ✅**
- Nomenclatura unificada frontend/backend
- Soporte básico para multimedia
- Algoritmos de repetición espaciada
- CI/CD automatizado

### **En Desarrollo 🔄**
- Subida de archivos multimedia
- Compresión automática de imágenes
- Cache distribuido

### **Planificado 📋**
- Soporte para video
- Sincronización en la nube
- Aplicación móvil nativa
- Colaboración en tiempo real

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/Matraca130/FLASHCARD/issues)
- **Documentación**: Ver archivos en `/docs/`
- **Wiki**: [GitHub Wiki](https://github.com/Matraca130/FLASHCARD/wiki)

---

**Última actualización**: Nomenclatura unificada implementada con soporte multimedia completo  
**Versión**: 2.0.0 (Unificación Multimedia)  
**Fecha**: Enero 2024




## ⚠️ Nota Importante para Contribuidores

Antes de realizar cualquier `commit`, por favor, asegúrate de que tu versión local del repositorio esté completamente actualizada con los últimos cambios del repositorio remoto. Para ello, ejecuta `git pull origin main` (o la rama correspondiente) antes de empezar a trabajar y antes de hacer tu `commit` y `push`.

Esto ayuda a prevenir conflictos y asegura que todos los colaboradores estén trabajando con la versión más reciente del código.

