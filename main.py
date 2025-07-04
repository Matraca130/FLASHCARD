#!/usr/bin/env python3
"""
Punto de entrada para Gunicorn en Render
Integra el backend completo modularizado
"""

import os
import sys

print("🚀 Backend StudyingFlash INICIADO!")
print("📁 Directorio actual:", os.getcwd())
print("🐍 Python path:", sys.path[:3])

# Agregar el directorio actual al path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar la factory function del backend completo
from backend_app import create_app

print("✅ Factory function importada exitosamente")

# Crear la aplicación Flask con todas las funcionalidades
app = create_app()

print("✅ App Flask creada exitosamente")
print("📋 Rutas registradas:")
for rule in app.url_map.iter_rules():
    print(f"  {rule.rule} -> {rule.endpoint}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print(f"🌐 Iniciando servidor en puerto {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)

