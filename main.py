#!/usr/bin/env python3
"""
Punto de entrada para Gunicorn en Render
Integra el backend completo modularizado
"""

import os
import sys

# Agregar el directorio actual al path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar la factory function del backend completo
from backend_app import create_app

# Crear la aplicación Flask con todas las funcionalidades
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

