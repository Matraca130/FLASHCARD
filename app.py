#!/usr/bin/env python3
"""
Punto de entrada compatible con Render
Importa la aplicación desde run.py para compatibilidad con 'gunicorn app:app'
"""

from run import app

if __name__ == '__main__':
    app.run()

