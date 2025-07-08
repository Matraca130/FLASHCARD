from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager

# Inicializar extensiones
db = SQLAlchemy()
cors = CORS()
bcrypt = Bcrypt()
jwt = JWTManager()

# Rate limiter simplificado
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[
        "1000 per hour",
        "100 per minute"])
