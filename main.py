#!/usr/bin/env python3
"""
Punto de entrada SIMPLE para Gunicorn en Render
Compatible con 'gunicorn app:app'
"""

from flask import Flask

# Crear aplicación Flask simple
app = Flask(__name__)

# Configuración básica
app.config['SECRET_KEY'] = 'dev-secret-key'

@app.route('/')
def home():
    return {
        "message": "StudyingFlash Backend funcionando!",
        "status": "success",
        "version": "1.0.0"
    }

@app.route('/health')
def health():
    return {"status": "healthy"}

@app.route('/api/')
def api_info():
    return {
        "api": "StudyingFlash Backend",
        "version": "1.0.0",
        "endpoints": [
            "/",
            "/health", 
            "/api/"
        ]
    }

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

