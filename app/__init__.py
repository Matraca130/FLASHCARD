"""
StudyingFlash Backend Application Factory
Aplicación Flask modularizada para sistema de flashcards con repetición espaciada
"""

from flask import Flask
from flask_cors import CORS
from app.extensions import db, jwt, bcrypt, limiter
from app.config import get_config
import logging
import os

def create_app(config_class=None):
    """
    Factory function para crear la aplicación Flask
    """
    app = Flask(__name__)
    
    # Usar configuración dinámica si no se especifica una
    if config_class is None:
        config_class = get_config()
    
    app.config.from_object(config_class)
    
    # Configurar CORS para permitir conexiones desde frontend
    CORS(app, origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "https://matraca130.github.io",  # GitHub Pages
        "https://*.github.io"  # Cualquier subdominio de GitHub Pages
    ], supports_credentials=True)
    
    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)
    
    # Configurar logging
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = logging.FileHandler('logs/flashcards.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('StudyingFlash backend startup')
    
    # Registrar blueprints
    from app.api.routes import api_bp
    from app.api.auth import auth_bp
    from app.api.study import study_bp
    from app.api.dashboard import dashboard_bp
    from app.api.decks import decks_bp
    from app.api.flashcards import flashcards_bp
    from app.api.stats import stats_bp
    
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(study_bp, url_prefix='/api/study')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(decks_bp, url_prefix='/api/decks')
    app.register_blueprint(flashcards_bp, url_prefix='/api/flashcards')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    
    # Crear tablas de base de datos
    with app.app_context():
        db.create_all()
    
    # Ruta de salud para verificar que el backend funciona
    @app.route('/health')
    def health_check():
        return {
            'status': 'healthy',
            'message': 'StudyingFlash Backend is running',
            'version': '1.0.0'
        }
    
    # Ruta raíz con información de la API
    @app.route('/')
    def index():
        return {
            'message': 'StudyingFlash API',
            'version': '1.0.0',
            'endpoints': {
                'health': '/health',
                'auth': '/api/auth',
                'study': '/api/study',
                'dashboard': '/api/dashboard',
                'decks': '/api/decks',
                'flashcards': '/api/flashcards',
                'stats': '/api/stats'
            }
        }
    
    return app

