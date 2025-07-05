"""
UserService - Servicio para gestión de usuarios
Refactorizado con inyección de dependencias y lógica mejorada
"""

from .base_service import BaseService
try:
    from ..models import User
except ImportError:
    try:
    from ..models import User

from flask_jwt_extended import create_access_token
from datetime import datetime


class UserService(BaseService):
    """Servicio para gestión de usuarios con autenticación y perfiles"""
    
    def register_user(self, user_data):
        """
        Registrar nuevo usuario
        
        Args:
            user_data: Diccionario con datos del usuario
            
        Returns:
            dict: Respuesta con usuario creado y token
        """
        try:
            # Verificar email único
            existing_email = self.db.session.query(User).filter_by(
                email=user_data['email']
            ).first()
            
            if existing_email:
                return self._error_response('El email ya está registrado', code=409)
            
            # Verificar username único
            existing_username = self.db.session.query(User).filter_by(
                username=user_data['username']
            ).first()
            
            if existing_username:
                return self._error_response('El nombre de usuario ya está en uso', code=409)
            
            # Crear usuario
            user = User(
                email=user_data['email'],
                username=user_data['username'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name']
            )
            user.set_password(user_data['password'])
            
            self.db.session.add(user)
            
            if not self._commit_or_rollback():
                return self._error_response('Error al guardar usuario', code=500)
            
            # Generar token
            token = create_access_token(identity=str(user.id))
            
            return self._success_response({
                'user': user.to_dict(),
                'token': token,
                'id': user.id,
                'email': user.email
            }, 'Usuario registrado exitosamente')
            
        except Exception as e:
            return self._handle_exception(e, "registro de usuario")
    
    def authenticate_user(self, email, password):
        """
        Autenticar usuario
        
        Args:
            email: Email del usuario
            password: Contraseña del usuario
            
        Returns:
            dict: Respuesta con usuario autenticado y token
        """
        try:
            user = self.db.session.query(User).filter_by(email=email).first()
            
            if not user or not user.check_password(password):
                return self._error_response('Credenciales inválidas', code=401)
            
            # Actualizar último login
            user.last_login = datetime.utcnow()
            self._update_timestamps(user)
            
            if not self._commit_or_rollback():
                self.logger.warning("Error actualizando último login")
            
            # Generar token
            token = create_access_token(identity=str(user.id))
            
            return self._success_response({
                'user': user.to_dict(),
                'token': token,
                'id': user.id,
                'email': user.email
            }, 'Autenticación exitosa')
            
        except Exception as e:
            return self._handle_exception(e, "autenticación de usuario")
    
    def get_user_profile(self, user_id):
        """
        Obtener perfil de usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            dict: Respuesta con datos del perfil
        """
        try:
            user = self.db.session.query(User).get(user_id)
            
            if not user:
                return self._error_response('Usuario no encontrado', code=404)
            
            return self._success_response(user.to_dict())
            
        except Exception as e:
            return self._handle_exception(e, "obtención de perfil")
    
    def update_user_profile(self, user_id, update_data):
        """
        Actualizar perfil de usuario
        
        Args:
            user_id: ID del usuario
            update_data: Datos a actualizar
            
        Returns:
            dict: Respuesta con perfil actualizado
        """
        try:
            user = self.db.session.query(User).get(user_id)
            
            if not user:
                return self._error_response('Usuario no encontrado', code=404)
            
            # Verificar username único si se está cambiando
            if 'username' in update_data and update_data['username'] != user.username:
                existing_username = self.db.session.query(User).filter_by(
                    username=update_data['username']
                ).first()
                
                if existing_username:
                    return self._error_response('El nombre de usuario ya está en uso', code=409)
            
            # Actualizar campos permitidos
            allowed_fields = ['first_name', 'last_name', 'username', 'bio', 'timezone', 'language', 'theme']
            
            for field in allowed_fields:
                if field in update_data:
                    setattr(user, field, update_data[field])
            
            self._update_timestamps(user)
            
            if not self._commit_or_rollback():
                return self._error_response('Error al actualizar perfil', code=500)
            
            return self._success_response(user.to_dict(), 'Perfil actualizado exitosamente')
            
        except Exception as e:
            return self._handle_exception(e, "actualización de perfil")
    
    def change_password(self, user_id, current_password, new_password):
        """
        Cambiar contraseña de usuario
        
        Args:
            user_id: ID del usuario
            current_password: Contraseña actual
            new_password: Nueva contraseña
            
        Returns:
            dict: Respuesta de confirmación
        """
        try:
            user = self.db.session.query(User).get(user_id)
            
            if not user:
                return self._error_response('Usuario no encontrado', code=404)
            
            if not user.check_password(current_password):
                return self._error_response('Contraseña actual incorrecta', code=401)
            
            user.set_password(new_password)
            self._update_timestamps(user)
            
            if not self._commit_or_rollback():
                return self._error_response('Error al cambiar contraseña', code=500)
            
            return self._success_response(
                {'message': 'Contraseña actualizada'}, 
                'Contraseña cambiada exitosamente'
            )
            
        except Exception as e:
            return self._handle_exception(e, "cambio de contraseña")
    
    def get_user_stats(self, user_id):
        """
        Obtener estadísticas básicas del usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            dict: Respuesta con estadísticas del usuario
        """
        try:
            user = self.db.session.query(User).get(user_id)
            
            if not user:
                return self._error_response('Usuario no encontrado', code=404)
            
            # Usar cache para estadísticas
            cache_key = f"user_stats:{user_id}"
            
            def fetch_stats():
                return {
                    'total_study_time': user.total_study_time or 0,
                    'current_streak': user.current_streak or 0,
                    'longest_streak': user.longest_streak or 0,
                    'total_cards_studied': user.total_cards_studied or 0,
                    'total_cards_correct': user.total_cards_correct or 0,
                    'accuracy_rate': user.accuracy_rate or 0.0,
                    'member_since': user.created_at.isoformat() if user.created_at else None,
                    'last_study': user.last_study.isoformat() if user.last_study else None
                }
            
            stats = self._get_or_set_cache(cache_key, fetch_stats, timeout=600)
            
            return self._success_response(stats)
            
        except Exception as e:
            return self._handle_exception(e, "obtención de estadísticas de usuario")
    
    def update_study_stats(self, user_id, cards_studied, cards_correct, study_time):
        """
        Actualizar estadísticas de estudio del usuario
        
        Args:
            user_id: ID del usuario
            cards_studied: Número de cartas estudiadas
            cards_correct: Número de cartas correctas
            study_time: Tiempo de estudio en minutos
            
        Returns:
            dict: Respuesta de confirmación
        """
        try:
            user = self.db.session.query(User).get(user_id)
            
            if not user:
                return self._error_response('Usuario no encontrado', code=404)
            
            # Actualizar estadísticas acumulativas
            user.total_cards_studied = (user.total_cards_studied or 0) + cards_studied
            user.total_cards_correct = (user.total_cards_correct or 0) + cards_correct
            user.total_study_time = (user.total_study_time or 0) + study_time
            user.last_study = datetime.utcnow()
            
            # Recalcular tasa de aciertos
            if user.total_cards_studied > 0:
                user.accuracy_rate = (user.total_cards_correct / user.total_cards_studied) * 100
            
            self._update_timestamps(user)
            
            if not self._commit_or_rollback():
                return self._error_response('Error al actualizar estadísticas', code=500)
            
            # Invalidar cache de estadísticas
            self._invalidate_cache_pattern(f"user_stats:{user_id}")
            
            return self._success_response(
                {'message': 'Estadísticas actualizadas'}, 
                'Estadísticas de estudio actualizadas'
            )
            
        except Exception as e:
            return self._handle_exception(e, "actualización de estadísticas de estudio")

