from flask_jwt_extended import get_jwt_identity

def get_current_user_id():
    """
    Obtener el ID del usuario actual desde el JWT token
    Convierte el string identity a integer
    """
    try:
        identity = get_jwt_identity()
        return int(identity) if identity else None
    except (ValueError, TypeError):
        return None

