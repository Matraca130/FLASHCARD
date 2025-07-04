# FlashCards Advanced - Aplicación Modularizada

Una aplicación web moderna de flashcards con repetición espaciada, construida con arquitectura modular y herramientas de desarrollo profesionales.

## 🚀 Características

- **Arquitectura Modular**: Código organizado en módulos ES6 con separación clara de responsabilidades
- **TypeScript**: Tipado estático para mayor robustez del código
- **Vite**: Build tool ultra-rápido con Hot Module Replacement (HMR)
- **PWA**: Progressive Web App con capacidades offline
- **Testing**: Tests End-to-End con Cypress
- **CI/CD**: Pipeline de integración continua con GitHub Actions
- **Performance**: Auditorías automáticas con Lighthouse CI

## 📁 Estructura del Proyecto

```
├── public/                 # Archivos estáticos
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos CSS
│   ├── manifest.json      # Manifest de PWA
│   └── sw.js              # Service Worker
├── src/                   # Código fuente
│   ├── services/          # Lógica de negocio
│   ├── store/             # Gestión de estado
│   ├── utils/             # Funciones de utilidad
│   ├── events/            # Manejo de eventos DOM
│   ├── router.js          # Enrutamiento hash-based
│   ├── navigation.js      # Lógica de navegación
│   └── main.js            # Punto de entrada
├── cypress/               # Tests E2E
├── .github/workflows/     # CI/CD con GitHub Actions
└── package.json           # Dependencias y scripts
```

## 🛠️ Instalación y Uso

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Desarrollo:**
   ```bash
   npm run dev
   ```

3. **Build para producción:**
   ```bash
   npm run build
   ```

4. **Ejecutar tests:**
   ```bash
   npx cypress open
   ```

5. **Linting y formateo:**
   ```bash
   npm run lint
   npm run format
   ```

## 🏗️ Arquitectura

### Módulos Principales

- **Services**: Lógica de negocio (auth, dashboard, study, create, manage)
- **Store**: Gestión de estado centralizada con patrón pub-sub
- **Utils**: Funciones de utilidad reutilizables
- **Events**: Manejo de eventos del DOM con event delegation
- **Router**: Navegación hash-based con historial del navegador

### Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+, TypeScript
- **Build Tool**: Vite
- **Testing**: Cypress
- **CI/CD**: GitHub Actions
- **Performance**: Lighthouse CI
- **Code Quality**: ESLint, Prettier

## 📱 PWA Features

- Instalable en dispositivos móviles y desktop
- Funcionalidad offline con Service Worker
- Manifest para metadatos de la aplicación
- Optimizada para rendimiento y accesibilidad

## 🧪 Testing

Tests End-to-End automatizados con Cypress que verifican:
- Navegación entre secciones
- Funcionalidad de login
- Creación y gestión de decks
- Sesiones de estudio

## 🚀 Deployment

El proyecto incluye configuración para deployment automático:
- GitHub Actions para CI/CD
- Build optimizado para producción
- Auditorías de performance automáticas

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

