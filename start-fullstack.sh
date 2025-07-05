#!/bin/bash

# Script para iniciar StudyingFlash Fullstack
# Frontend (GitHub Pages) + Backend (Local/Servidor)

echo "🚀 Iniciando StudyingFlash Fullstack..."

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado"
    exit 1
fi

# Verificar pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 no está instalado"
    exit 1
fi

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
echo "🔧 Activando entorno virtual..."
source venv/bin/activate

# Instalar dependencias
echo "📚 Instalando dependencias..."
pip install -r requirements.txt

# Verificar si existe la base de datos
if [ ! -f "flashcards.db" ]; then
    echo "🗄️ Inicializando base de datos..."
    python3 -c "
from app import create_app
from app.extensions import db

app = create_app()
with app.app_context():
    db.create_all()
    print('Base de datos creada exitosamente')
"
fi

# Configurar variables de entorno
export FLASK_APP=run.py
export FLASK_ENV=development
export FLASK_DEBUG=True

echo "✅ Configuración completada"
echo ""
echo "🌐 Frontend: https://matraca130.github.io/FLASHCARD/"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "🚀 Iniciando servidor backend..."
echo "   Presiona Ctrl+C para detener"
echo ""

# Iniciar servidor Flask
python3 run.py

