# StudyingFlash Backend

Backend modularizado para la aplicación StudyingFlash - Sistema de flashcards con repetición espaciada.

## 🚀 Características

- **API RESTful completa** - Endpoints para todas las funcionalidades
- **Autenticación JWT** - Seguridad robusta
- **Algoritmos de repetición espaciada** - FSRS y SM-2
- **Base de datos optimizada** - SQLite con índices eficientes
- **Cache inteligente** - Para mejor rendimiento
- **Testing comprehensivo** - Tests unitarios e integración
- **Docker ready** - Configuración completa para contenedores

## 📁 Estructura del Proyecto

```
backend/
├── app/
│   ├── __init__.py          # Factory function de Flask
│   ├── config.py            # Configuración de la aplicación
│   ├── extensions.py        # Extensiones de Flask
│   ├── models/              # Modelos de base de datos
│   │   ├── __init__.py
│   │   └── models.py
│   ├── api/                 # Rutas y endpoints
│   │   ├── __init__.py
│   │   ├── routes.py        # Blueprint principal
│   │   ├── auth.py          # Autenticación
│   │   ├── study.py         # Sesiones de estudio
│   │   ├── dashboard.py     # Dashboard y estadísticas
│   │   ├── decks.py         # Gestión de decks
│   │   ├── flashcards.py    # CRUD de flashcards
│   │   └── stats.py         # Estadísticas avanzadas
│   ├── services/            # Lógica de negocio
│   │   ├── __init__.py
│   │   └── services.py
│   ├── utils/               # Utilidades y algoritmos
│   │   ├── __init__.py
│   │   ├── algorithms.py    # Algoritmos de repetición
│   │   ├── utils.py         # Utilidades generales
│   │   └── cache.py         # Sistema de cache
│   └── middleware/          # Middleware y seguridad
│       ├── __init__.py
│       ├── security.py      # Funciones de seguridad
│       └── middleware.py    # Middleware personalizado
├── tests/                   # Tests unitarios e integración
├── docker/                  # Configuración Docker
├── docs/                    # Documentación
├── scripts/                 # Scripts de utilidad
├── run.py                   # Punto de entrada
├── requirements.txt         # Dependencias
├── .env                     # Variables de entorno
└── README.md               # Este archivo
```

## 🛠️ Instalación

### Requisitos Previos

- Python 3.8+
- pip
- virtualenv (recomendado)

### Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/matraca130/FLASHCARD.git
   cd FLASHCARD/backend
   ```

2. **Crear entorno virtual**
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   ```

3. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones
   ```

5. **Inicializar base de datos**
   ```bash
   python scripts/init_db.py
   ```

6. **Ejecutar la aplicación**
   ```bash
   python run.py
   ```

La aplicación estará disponible en `http://localhost:5000`

## 🐳 Docker

### Desarrollo con Docker

```bash
docker-compose -f docker/docker-compose.dev.yml up
```

### Producción con Docker

```bash
docker-compose -f docker/docker-compose.yml up -d
```

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### Estudio
- `POST /api/study/session` - Iniciar sesión de estudio
- `POST /api/study/card/answer` - Responder carta (CRÍTICO)
- `POST /api/study/session/<id>/end` - Finalizar sesión
- `GET /api/study/cards/due` - Cartas pendientes

### Dashboard
- `GET /api/dashboard/` - Datos del dashboard
- `GET /api/dashboard/stats/weekly` - Estadísticas semanales
- `GET /api/dashboard/stats/heatmap` - Heatmap de actividad

### Decks
- `GET /api/decks/` - Listar decks
- `POST /api/decks/` - Crear deck
- `GET /api/decks/<id>` - Obtener deck
- `PUT /api/decks/<id>` - Actualizar deck
- `DELETE /api/decks/<id>` - Eliminar deck
- `GET /api/decks/<id>/export` - Exportar deck
- `POST /api/decks/import` - Importar deck

### Flashcards
- `POST /api/flashcards/` - Crear flashcard
- `GET /api/flashcards/<id>` - Obtener flashcard
- `PUT /api/flashcards/<id>` - Actualizar flashcard
- `DELETE /api/flashcards/<id>` - Eliminar flashcard
- `GET /api/flashcards/deck/<deck_id>` - Flashcards de un deck
- `POST /api/flashcards/bulk` - Crear múltiples flashcards

### Estadísticas
- `GET /api/stats/` - Estadísticas generales
- `GET /api/stats/charts` - Datos para gráficos
- `GET /api/stats/progress` - Progreso del usuario

## 🧪 Testing

### Ejecutar todos los tests
```bash
pytest
```

### Tests con cobertura
```bash
pytest --cov=app tests/
```

### Tests específicos
```bash
pytest tests/test_auth.py
pytest tests/test_study.py
```

## 🔧 Configuración

### Variables de Entorno Principales

- `FLASK_ENV` - Entorno (development/production)
- `DATABASE_URL` - URL de la base de datos
- `JWT_SECRET_KEY` - Clave secreta para JWT
- `SECRET_KEY` - Clave secreta de Flask
- `CORS_ORIGINS` - Orígenes permitidos para CORS

### Configuración de Base de Datos

Por defecto usa SQLite para desarrollo. Para producción se recomienda PostgreSQL:

```bash
DATABASE_URL=postgresql://user:password@localhost/flashcards
```

## 📈 Monitoreo

### Logs
Los logs se guardan en `logs/flashcards.log`

### Health Check
```bash
curl http://localhost:5000/health
```

### Métricas
Endpoint de métricas disponible en `/api/stats/`

## 🚀 Despliegue

### Heroku
```bash
git push heroku main
```

### AWS/DigitalOcean
Usar Docker Compose para despliegue en servidores

### GitHub Actions
CI/CD configurado para testing automático

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Tu Nombre** - *Desarrollo inicial* - [matraca130](https://github.com/matraca130)

## 🙏 Agradecimientos

- Algoritmo FSRS por su eficiencia en repetición espaciada
- Comunidad Flask por las excelentes herramientas
- Contribuidores del proyecto

