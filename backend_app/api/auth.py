"""
Rutas de autenticación para StudyingFlash
Compatible con frontend existente
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from backend_app.models import User
from backend_app.services import UserService
from backend_app.extensions import db
import logging

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)
user_service = UserService()

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Autenticación de usuario - Compatible con frontend
    POST /api/auth/login
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email y password son requeridos'}), 400
        
        # Usar servicio para autenticar
        result = user_service.authenticate_user(email, password)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 401
        
        user_data = result['data']
        
        return jsonify({
            'success': True,
            'token': user_data['token'],
            'user': {
                'id': user_data['id'],
                'email': user_data['email'],
                'username': user_data['user'].username,
                'first_name': user_data['user'].first_name,
                'last_name': user_data['user'].last_name
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error en login: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Registro de usuario - Compatible con frontend
    POST /api/auth/register
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        required_fields = ['email', 'password', 'username', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} es requerido'}), 400
        
        # Usar servicio para registrar
        result = user_service.register_user(data)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        user_data = result['data']
        
        return jsonify({
            'success': True,
            'token': user_data['token'],
            'user': {
                'id': user_data['id'],
                'email': user_data['email'],
                'username': user_data['user'].username,
                'first_name': user_data['user'].first_name,
                'last_name': user_data['user'].last_name
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error en registro: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Obtener perfil del usuario autenticado
    GET /api/auth/profile
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'bio': user.bio,
                'avatar_url': user.avatar_url,
                'daily_goal': user.daily_goal,
                'current_streak': user.current_streak,
                'total_study_time': user.total_study_time,
                'total_cards_studied': user.total_cards_studied,
                'member_since': user.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo perfil: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Actualizar perfil del usuario
    PUT /api/auth/profile
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400
        
        # Actualizar campos permitidos
        updatable_fields = ['first_name', 'last_name', 'bio', 'daily_goal', 'timezone', 'language']
        for field in updatable_fields:
            if field in data:
                setattr(user, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Perfil actualizado correctamente',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'bio': user.bio,
                'daily_goal': user.daily_goal
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error actualizando perfil: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@auth_bp.route('/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """
    Verificar si el token es válido
    GET /api/auth/verify-token
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Token inválido'}), 401
        
        return jsonify({
            'success': True,
            'valid': True,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error verificando token: {str(e)}")
        return jsonify({'error': 'Token inválido'}), 401

