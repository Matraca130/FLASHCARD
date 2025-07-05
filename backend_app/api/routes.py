"""
Blueprint principal de rutas para StudyingFlash API
Centraliza todas las rutas principales
"""

from flask import Blueprint, jsonify

# Blueprint principal para rutas generales
api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/', methods=['GET'])
def api_info():
    """
    Información general de la API
    GET /api/
    """
    return jsonify({
        'message': 'StudyingFlash API v1.0',
        'status': 'active',
        'endpoints': {
            'authentication': '/api/auth',
            'study': '/api/study',
            'dashboard': '/api/dashboard',
            'decks': '/api/decks',
            'flashcards': '/api/flashcards',
            'statistics': '/api/stats'
        },
        'documentation': 'https://github.com/matraca130/FLASHCARD/docs',
        'version': '1.0.0'
    }), 200

@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    GET /api/health
    """
    return jsonify({
        'status': 'healthy',
        'message': 'StudyingFlash API is running',
        'timestamp': '2024-01-01T00:00:00Z'
    }), 200

@api_bp.errorhandler(404)
def not_found(error):
    """
    Manejo de errores 404
    """
    return jsonify({
        'error': 'Endpoint no encontrado',
        'message': 'La ruta solicitada no existe',
        'available_endpoints': [
            '/api/auth',
            '/api/study', 
            '/api/dashboard',
            '/api/decks',
            '/api/flashcards',
            '/api/stats'
        ]
    }), 404

@api_bp.errorhandler(500)
def internal_error(error):
    """
    Manejo de errores 500
    """
    return jsonify({
        'error': 'Error interno del servidor',
        'message': 'Ha ocurrido un error inesperado'
    }), 500

