#!/usr/bin/env python3
"""
Punto de entrada para StudyingFlash Backend
Configurado para desarrollo local y producción en Render
"""

import os
from app import create_app
from app.extensions import db

# Cargar variables de entorno desde .env (solo en desarrollo)
if os.path.exists('.env'):
    from dotenv import load_dotenv
    load_dotenv()

# Crear aplicación con configuración automática
app = create_app()

# Crear tablas si no existen (importante para primer despliegue)
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # Configuración para desarrollo local
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

