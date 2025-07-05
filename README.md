# 📚 StudyingFlash - Sistema de Flashcards con Repetición Espaciada

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-85%25-yellow.svg)

**StudyingFlash** es una aplicación web moderna de flashcards que implementa algoritmos de repetición espaciada (FSRS y SM-2) para optimizar el aprendizaje y la retención de memoria.

## 🌟 Características Principales

### 🧠 **Algoritmos de Aprendizaje Avanzados**
- **FSRS (Free Spaced Repetition Scheduler)** - Algoritmo de última generación
- **SM-2 (SuperMemo 2)** - Algoritmo clásico probado
- **Cálculo automático de intervalos** basado en rendimiento del usuario
- **Predicción de retención** para optimizar el tiempo de estudio

### 📱 **Experiencia de Usuario Moderna**
- **Progressive Web App (PWA)** - Funciona offline y se puede instalar
- **Diseño responsive** - Optimizado para móvil, tablet y escritorio
- **Interfaz intuitiva** - Navegación fluida y accesible
- **Tema oscuro/claro** - Adaptable a preferencias del usuario

### 🔐 **Autenticación Robusta**
- **JWT con refresh tokens** - Sesiones seguras de larga duración
- **Gestión de sesiones múltiples** - Control de dispositivos conectados
- **Logout automático** por seguridad
- **Validación de tokens** en tiempo real

### 📊 **Analytics y Progreso**
- **Dashboard completo** con métricas de aprendizaje
- **Estadísticas detalladas** de rendimiento por deck
- **Sistema de logros** para motivar el estudio
- **Tracking de rachas** de estudio diario

### 🛠️ **Arquitectura Empresarial**
- **Testing automatizado** con pytest (cobertura 85%+)
- **Monitoreo con Sentry** - Detección proactiva de errores
- **CI/CD con GitHub Actions** - Deploy automático
- **Logging estructurado** - Trazabilidad completa

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** 18+ y npm
- **Python** 3.9+ y pip
- **Git** para clonar el repositorio

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/Matraca130/FLASHCARD.git
cd FLASHCARD
```

2. **Configurar el backend**
```bash
# Instalar dependencias Python
pip install -r requirements.txt
pip install -r requirements-test.txt
pip install -r requirements-monitoring.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

3. **Configurar el frontend**
```bash
# Instalar dependencias Node.js
npm install

# Configurar para desarrollo
npm run dev
```

4. **Inicializar la base de datos**
```bash
# Ejecutar migraciones
python -c "from backend_app import create_app; from backend_app.models.models import db; app = create_app(); app.app_context().push(); db.create_all()"
```

### Desarrollo

```bash
# Terminal 1: Backend (Flask)
python main.py

# Terminal 2: Frontend (Vite)
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 📁 Estructura del Proyecto

```
FLASHCARD/
├── 📂 backend_app/           # Backend Flask
│   ├── 📂 api/              # Endpoints REST
│   │   ├── auth.py          # Autenticación básica
│   │   ├── auth_refresh.py  # Refresh tokens
│   │   ├── decks.py         # Gestión de decks
│   │   ├── flashcards.py    # CRUD flashcards
│   │   ├── study.py         # Algoritmos de estudio
│   │   ├── dashboard.py     # Métricas y analytics
│   │   ├── stats.py         # Estadísticas avanzadas
│   │   ├── health.py        # Health checks
│   │   └── error_handlers.py # Manejo de errores
│   ├── 📂 models/           # Modelos de datos
│   │   ├── models.py        # Modelos principales
│   │   └── refresh_token.py # Modelo de tokens
│   ├── 📂 utils/            # Utilidades
│   │   ├── algorithms.py    # FSRS y SM-2
│   │   ├── monitoring.py    # Sentry y logging
│   │   └── auth_helpers.py  # Helpers de auth
│   └── 📂 services_new/     # Servicios de negocio
├── 📂 utils/                # Frontend utilities
│   ├── helpers.js           # Funciones auxiliares
│   ├── validation.js        # Validaciones
│   ├── loading.js           # Estados de carga
│   └── lazy-loader.js       # Lazy loading
├── 📂 tests/                # Suite de testing
│   ├── 📂 unit/            # Tests unitarios
│   ├── 📂 integration/     # Tests de integración
│   └── conftest.py         # Configuración pytest
├── 📂 .github/workflows/    # CI/CD GitHub Actions
│   ├── test.yml            # Testing automático
│   ├── deploy.yml          # Deploy automático
│   └── code-quality.yml    # Calidad de código
├── 📄 index.html           # SPA principal
├── 📄 styles.css           # Estilos base
├── 📄 responsive.css       # Estilos responsive
├── 📄 core-navigation.js   # Navegación SPA
├── 📄 apiClient.js         # Cliente API
├── 📄 pwa-installer.js     # PWA functionality
├── 📄 sw.js               # Service Worker
├── 📄 manifest.webmanifest # PWA Manifest
├── 📄 vite.config.js       # Configuración Vite
└── 📄 main.py             # Punto de entrada Flask
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios
pytest tests/unit/ -v

# Tests de integración
pytest tests/integration/ -v

# Tests con cobertura
pytest --cov=backend_app --cov-report=html

# Tests de rendimiento
pytest tests/ -k "performance" --benchmark-only
```

### Tipos de Tests

- **Unitarios**: Servicios, modelos, algoritmos
- **Integración**: APIs, base de datos
- **Rendimiento**: Algoritmos FSRS/SM-2
- **E2E**: Flujos completos de usuario

## 📊 Monitoreo y Observabilidad

### Sentry Integration

```python
# Configurar en .env
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
```

### Health Checks

- **Basic**: `/health`
- **Detailed**: `/health/detailed`
- **Readiness**: `/health/ready`
- **Liveness**: `/health/live`
- **Metrics**: `/health/metrics`

### Logging

```python
# Logs estructurados en logs/app.log
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

## 🚀 Deployment

### Desarrollo Local

```bash
# Build de producción
npm run build

# Preview del build
npm run preview
```

### Staging/Producción

El proyecto incluye **GitHub Actions** para deploy automático:

1. **Push a `main`** → Trigger de deploy
2. **Tests automáticos** → Verificación de calidad
3. **Deploy frontend** → GitHub Pages
4. **Deploy backend** → Railway/Render
5. **Health checks** → Verificación post-deploy

### Variables de Entorno

```bash
# Producción
FLASK_ENV=production
DATABASE_URL=postgresql://...
SENTRY_DSN=https://...
JWT_SECRET_KEY=your-secret-key
```

## 📈 Escalabilidad

### Arquitectura para 6,000+ Usuarios

**Etapa 1 (0-1K usuarios)**:
- GitHub Pages (frontend)
- Render Free (backend)
- SQLite/PostgreSQL

**Etapa 2 (1K-6K usuarios)**:
- Vercel Pro (frontend)
- Railway Hobby (backend)
- PostgreSQL dedicado

**Etapa 3 (6K+ usuarios)**:
- CDN global
- Auto-scaling backend
- Redis cache
- Monitoreo avanzado

### Optimizaciones Implementadas

- **Lazy loading** de módulos y recursos
- **Service Worker** para cache offline
- **Bundle splitting** para carga optimizada
- **Database indexing** para consultas rápidas
- **API rate limiting** para protección

## 🔧 API Reference

### Autenticación

```http
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/sessions
```

### Decks

```http
GET    /api/decks/
POST   /api/decks/
GET    /api/decks/{id}
PUT    /api/decks/{id}
DELETE /api/decks/{id}
```

### Estudio

```http
GET  /api/study/session/{deck_id}
POST /api/study/answer
GET  /api/study/progress/{deck_id}
```

### Dashboard

```http
GET /api/dashboard/stats
GET /api/dashboard/achievements
GET /api/dashboard/recent-activity
```

## 🤝 Contribución

### Proceso de Desarrollo

1. **Fork** el repositorio
2. **Crear branch** para feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. **Push** al branch (`git push origin feature/nueva-funcionalidad`)
5. **Crear Pull Request**

### Estándares de Código

- **Python**: PEP 8, type hints, docstrings
- **JavaScript**: ES6+, JSDoc, consistent naming
- **Testing**: Cobertura mínima 80%
- **Commits**: Conventional commits format

### Code Review

- **Automated checks**: Linting, testing, security
- **Manual review**: Architecture, performance, UX
- **Documentation**: README, API docs, comments

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- **FSRS Algorithm** - Algoritmo de repetición espaciada de última generación
- **Flask Community** - Framework web robusto y flexible
- **Vite** - Build tool moderno y rápido
- **GitHub Actions** - CI/CD integrado

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/Matraca130/FLASHCARD/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Matraca130/FLASHCARD/discussions)
- **Email**: soporte@studyingflash.com

---

**¡Hecho con ❤️ para optimizar tu aprendizaje!**

*StudyingFlash v1.0.0 - Sistema de Flashcards con Repetición Espaciada*

