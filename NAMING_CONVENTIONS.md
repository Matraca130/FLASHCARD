# 🗣️ Convenciones de Nombres - FLASHCARD

## 📋 **Reglas del "Lenguaje Común"**

### **Principio Fundamental:**
> **"Si existe una función `createDeck()`, debe estar en un archivo llamado `create-deck.service.js` o similar"**

---

## 📁 **Estructura de Archivos**

### **Servicios (Lógica de Negocio)**
```
[accion]-[entidad].service.js
```

**Ejemplos:**
- `create-deck.service.js` → funciones: `createDeck()`, `validateDeckData()`
- `study-flashcard.service.js` → funciones: `startStudySession()`, `calculateNextReview()`
- `manage-user.service.js` → funciones: `getUserProfile()`, `updateUserSettings()`

### **Utilidades (Helpers)**
```
[categoria].utils.js
```

**Ejemplos:**
- `date.utils.js` → funciones: `formatDate()`, `calculateDaysDiff()`
- `validation.utils.js` → funciones: `validateEmail()`, `sanitizeInput()`
- `storage.utils.js` → funciones: `saveToLocal()`, `getFromLocal()`

### **Componentes UI**
```
[nombre-componente].component.js
```

**Ejemplos:**
- `deck-card.component.js` → clase: `DeckCard`
- `study-modal.component.js` → clase: `StudyModal`

---

## 🔧 **Convenciones de Funciones**

### **Acciones CRUD**
```javascript
// Crear
createDeck()
addFlashcard()
generateReport()

// Leer
getDeck()
fetchUserData()
loadStudySession()

// Actualizar
updateDeck()
modifyFlashcard()
saveProgress()

// Eliminar
deleteDeck()
removeFlashcard()
clearData()
```

### **Validaciones**
```javascript
// Siempre empezar con "validate" o "is"
validateDeckData()
validateEmail()
isValidUser()
isSessionActive()
```

### **Utilidades**
```javascript
// Formato: [verbo][Sustantivo]
formatDate()
parseJSON()
calculateScore()
generateId()
```

---

## 📦 **Convenciones de Exports/Imports**

### **Exports Nombrados (Preferido)**
```javascript
// ✅ CORRECTO
export function createDeck() { }
export function validateDeck() { }

// Import
import { createDeck, validateDeck } from './create-deck.service.js';
```

### **Export Default (Solo para clases principales)**
```javascript
// ✅ CORRECTO para clases
export default class DeckManager { }

// Import
import DeckManager from './deck-manager.service.js';
```

---

## 🎯 **Mapeo Función → Archivo**

### **Funciones de Creación**
| Función | Archivo | Ubicación |
|---------|---------|-----------|
| `createDeck()` | `create-deck.service.js` | `/services/` |
| `createFlashcard()` | `create-flashcard.service.js` | `/services/` |
| `createUser()` | `create-user.service.js` | `/services/` |

### **Funciones de Estudio**
| Función | Archivo | Ubicación |
|---------|---------|-----------|
| `startStudySession()` | `study-session.service.js` | `/services/` |
| `calculateNextReview()` | `study-algorithm.service.js` | `/services/` |
| `trackProgress()` | `study-progress.service.js` | `/services/` |

### **Funciones de Gestión**
| Función | Archivo | Ubicación |
|---------|---------|-----------|
| `manageDeck()` | `manage-deck.service.js` | `/services/` |
| `editFlashcard()` | `edit-flashcard.service.js` | `/services/` |
| `deleteContent()` | `delete-content.service.js` | `/services/` |

---

## 🔍 **Convenciones de Variables**

### **Constantes**
```javascript
// SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_FLASHCARDS_PER_DECK = 100;
const DEFAULT_STUDY_INTERVAL = 24; // horas
```

### **Variables de Configuración**
```javascript
// camelCase con prefijo config
const configDatabase = { };
const configAuth = { };
const configUI = { };
```

### **Variables de Estado**
```javascript
// camelCase descriptivo
const isStudySessionActive = false;
const currentDeckId = null;
const userProgressData = { };
```

---

## 📂 **Estructura de Directorios**

```
/src
  /services          # Lógica de negocio
    /deck            # Todo relacionado con decks
    /flashcard       # Todo relacionado con flashcards
    /user            # Todo relacionado con usuarios
    /study           # Todo relacionado con estudio
  /utils             # Utilidades generales
  /components        # Componentes UI
  /config            # Configuraciones
  /types             # Definiciones de tipos (si usas TypeScript)
```

---

## ✅ **Checklist de Convenciones**

### **Antes de crear un archivo:**
- [ ] ¿El nombre del archivo refleja su función principal?
- [ ] ¿Está en el directorio correcto?
- [ ] ¿Sigue la convención de nomenclatura?

### **Antes de crear una función:**
- [ ] ¿El nombre es descriptivo y claro?
- [ ] ¿Sigue las convenciones de verbos (create, get, update, delete)?
- [ ] ¿Está en el archivo correcto según su propósito?

### **Antes de hacer import/export:**
- [ ] ¿El import coincide con el export?
- [ ] ¿La ruta del archivo es correcta?
- [ ] ¿Está usando exports nombrados cuando es apropiado?

---

## 🚨 **Errores Comunes a Evitar**

### **❌ INCORRECTO**
```javascript
// Archivo: helpers.js (muy genérico)
export function doSomething() { } // nombre poco descriptivo

// Import confuso
import { thing } from './stuff.js';
```

### **✅ CORRECTO**
```javascript
// Archivo: deck-validation.utils.js (específico)
export function validateDeckData() { } // nombre claro

// Import claro
import { validateDeckData } from './deck-validation.utils.js';
```

---

## 🎯 **Beneficios de Seguir Estas Convenciones**

1. **Predictibilidad**: Los programadores saben dónde buscar
2. **Mantenibilidad**: Fácil de modificar y extender
3. **Colaboración**: Todos hablan el mismo "idioma"
4. **Debugging**: Errores más fáciles de encontrar
5. **Onboarding**: Nuevos desarrolladores se adaptan rápido

---

## 🔧 **Herramientas de Validación**

Usa el script `naming-validator.js` para verificar que tu código sigue estas convenciones:

```bash
npm run validate:naming
```

---

**Recuerda: La consistencia es más importante que la perfección. Es mejor seguir una convención "buena" de manera consistente que tener múltiples convenciones "perfectas".**

