# Plan de Unificación de Nomenclatura - Flashcards con Soporte Multimedia

## Análisis de Requerimientos Futuros

### Estructura Multimedia Propuesta
Cada flashcard tendrá:
- **Lado Frontal (Front)**: Texto + Imagen opcional
- **Lado Posterior (Back)**: Texto + Imagen opcional
- **Metadatos**: Información de algoritmos de repetición espaciada

### Consideraciones de Base de Datos
- Soporte para URLs de imágenes almacenadas
- Escalabilidad para diferentes tipos de media (futuro: audio, video)
- Optimización para consultas frecuentes
- Compatibilidad con CDN para imágenes

## Nomenclatura Unificada Propuesta

### 1. Campos de Contenido (Content Fields)

#### Estructura Actual vs Propuesta
```
ACTUAL (Backend):          PROPUESTA UNIFICADA:
front_text                 → front_content.text
back_text                  → back_content.text
front_image_url            → front_content.image_url
back_image_url             → back_content.image_url
front_audio_url            → front_content.audio_url (futuro)
back_audio_url             → back_content.audio_url (futuro)

ACTUAL (Frontend):         PROPUESTA UNIFICADA:
front                      → front_content
back                       → back_content
```

#### Justificación
- **Escalabilidad**: Estructura preparada para múltiples tipos de media
- **Consistencia**: Misma nomenclatura en frontend y backend
- **Claridad**: Separación clara entre contenido y metadatos

### 2. Campos de Algoritmo (Algorithm Fields)

#### Estructura Unificada
```
ACTUAL (Backend):          PROPUESTA UNIFICADA:
ease_factor                → algorithm_data.ease_factor
interval_days              → algorithm_data.interval
repetitions                → algorithm_data.repetitions
stability                  → algorithm_data.stability
difficulty_fsrs            → algorithm_data.difficulty
next_review                → algorithm_data.next_review
last_reviewed              → algorithm_data.last_review
```

#### Justificación
- **Agrupación lógica**: Todos los datos de algoritmo en un objeto
- **Flexibilidad**: Fácil extensión para nuevos algoritmos
- **Mantenimiento**: Cambios de algoritmo no afectan estructura principal

### 3. Estructura JSON Propuesta

#### Modelo de Datos Unificado
```json
{
  "id": 123,
  "deck_id": 456,
  "front_content": {
    "text": "¿Cuál es la capital de Francia?",
    "image_url": "https://cdn.example.com/images/france-map.jpg",
    "audio_url": null,
    "video_url": null
  },
  "back_content": {
    "text": "París",
    "image_url": "https://cdn.example.com/images/paris-tower.jpg", 
    "audio_url": null,
    "video_url": null
  },
  "algorithm_data": {
    "ease_factor": 2.5,
    "interval": 7,
    "repetitions": 3,
    "stability": 15.2,
    "difficulty": 4.8,
    "next_review": "2024-01-15T10:00:00Z",
    "last_review": "2024-01-08T14:30:00Z",
    "algorithm_type": "fsrs"
  },
  "metadata": {
    "difficulty": "medium",
    "tags": ["geography", "capitals"],
    "notes": "Incluye imagen del mapa para contexto",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-08T14:30:00Z"
  }
}
```

## Implementación por Fases

### Fase 1: Preparación de Base de Datos
- Agregar nuevos campos manteniendo compatibilidad
- Crear índices optimizados
- Implementar constraints de validación

### Fase 2: Backend API
- Actualizar modelos SQLAlchemy
- Modificar serialización/deserialización
- Mantener endpoints legacy temporalmente

### Fase 3: Frontend
- Actualizar servicios para nueva estructura
- Modificar componentes de UI
- Implementar migración de datos locales

### Fase 4: Migración y Limpieza
- Migrar datos existentes
- Eliminar campos legacy
- Actualizar documentación

## Beneficios de la Nueva Estructura

### 1. Escalabilidad Multimedia
- Soporte nativo para imágenes
- Preparado para audio/video futuro
- Estructura consistente para todos los tipos de media

### 2. Mejor Rendimiento
- Consultas optimizadas con índices apropiados
- Carga lazy de contenido multimedia
- Cache eficiente por tipo de contenido

### 3. Mantenibilidad
- Código más limpio y predecible
- Fácil extensión para nuevas funcionalidades
- Debugging simplificado

### 4. Experiencia de Usuario
- Carga más rápida de contenido
- Soporte robusto para multimedia
- Interfaz consistente

