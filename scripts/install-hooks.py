#!/usr/bin/env python3
"""
Script para instalar hooks de pre-commit automáticamente
Configura el entorno de desarrollo para prevenir errores de linting
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

def install_pre_commit_hook():
    """Instalar el hook de pre-commit"""
    project_root = Path(__file__).parent.parent
    git_hooks_dir = project_root / '.git' / 'hooks'
    
    if not git_hooks_dir.exists():
        print("❌ No se encontró el directorio .git/hooks")
        print("   Asegúrate de estar en un repositorio Git")
        return False
    
    # Crear el hook de pre-commit
    pre_commit_hook = git_hooks_dir / 'pre-commit'
    hook_content = f"""#!/bin/bash
# Pre-commit hook para verificación de linting Python
# Instalado automáticamente por scripts/install-hooks.py

echo "🛡️  Ejecutando verificación de pre-commit..."

# Ejecutar el script de verificación Python
python "{project_root}/scripts/pre-commit-lint.py"
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "💡 SUGERENCIAS PARA CORREGIR ERRORES:"
    echo "   1. Ejecutar auto-corrección: python scripts/fix-linting.py"
    echo "   2. Revisar errores manualmente"
    echo "   3. Hacer commit con --no-verify (solo si es necesario)"
    echo ""
fi

exit $exit_code
"""
    
    with open(pre_commit_hook, 'w') as f:
        f.write(hook_content)
    
    # Hacer ejecutable
    os.chmod(pre_commit_hook, 0o755)
    
    print(f"✅ Hook de pre-commit instalado en {pre_commit_hook}")
    return True

def install_tools():
    """Instalar herramientas de linting necesarias"""
    tools = ['flake8', 'autopep8', 'black', 'isort']
    
    print("📦 Instalando herramientas de linting...")
    
    for tool in tools:
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'show', tool], 
                         check=True, capture_output=True)
            print(f"  ✅ {tool} ya está instalado")
        except subprocess.CalledProcessError:
            print(f"  📦 Instalando {tool}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', tool], check=True)
            print(f"  ✅ {tool} instalado")

def create_vscode_settings():
    """Crear configuración de VSCode para linting"""
    project_root = Path(__file__).parent.parent
    vscode_dir = project_root / '.vscode'
    vscode_dir.mkdir(exist_ok=True)
    
    settings_file = vscode_dir / 'settings.json'
    settings = {
        "python.linting.enabled": True,
        "python.linting.flake8Enabled": True,
        "python.linting.flake8Args": ["--config=.flake8"],
        "python.linting.pylintEnabled": False,
        "python.formatting.provider": "autopep8",
        "python.formatting.autopep8Args": ["--aggressive", "--aggressive"],
        "editor.formatOnSave": True,
        "editor.codeActionsOnSave": {
            "source.organizeImports": True
        },
        "files.trimTrailingWhitespace": True,
        "files.insertFinalNewline": True,
        "python.linting.flake8CategorySeverity.E": "Error",
        "python.linting.flake8CategorySeverity.W": "Warning",
        "python.linting.flake8CategorySeverity.F": "Error"
    }
    
    import json
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)
    
    print(f"✅ Configuración de VSCode creada en {settings_file}")

def test_setup():
    """Probar que la configuración funciona"""
    print("🧪 Probando configuración...")
    
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Probar flake8
    try:
        result = subprocess.run([
            'python', '-m', 'flake8', 
            'backend_app/',
            '--config=.flake8',
            '--count'
        ], capture_output=True, text=True, check=False)
        
        print(f"✅ Flake8 ejecutado correctamente")
        if result.stdout.strip():
            print(f"   Errores encontrados: {result.stdout.strip()}")
        else:
            print("   No se encontraron errores")
            
    except Exception as e:
        print(f"❌ Error probando flake8: {e}")
        return False
    
    return True

def main():
    """Función principal"""
    print("🔧 INSTALADOR DE HOOKS DE LINTING")
    print("=" * 40)
    
    # Verificar que estamos en el directorio correcto
    project_root = Path(__file__).parent.parent
    if not (project_root / 'backend_app').exists():
        print("❌ No se encontró el directorio backend_app")
        print("   Ejecuta este script desde la raíz del proyecto")
        return 1
    
    try:
        # Instalar herramientas
        install_tools()
        
        # Instalar hook de pre-commit
        if install_pre_commit_hook():
            print("✅ Hook de pre-commit instalado")
        
        # Crear configuración de VSCode
        create_vscode_settings()
        
        # Probar configuración
        if test_setup():
            print("✅ Configuración probada exitosamente")
        
        print("=" * 40)
        print("✅ INSTALACIÓN COMPLETADA")
        print("")
        print("🎯 PRÓXIMOS PASOS:")
        print("   1. Los commits ahora verificarán automáticamente el linting")
        print("   2. Usa 'python scripts/fix-linting.py' para auto-corregir errores")
        print("   3. Configura tu editor para usar flake8 con .flake8")
        print("")
        print("💡 COMANDOS ÚTILES:")
        print("   - Verificar linting: python -m flake8 backend_app/ --config=.flake8")
        print("   - Auto-corregir: python scripts/fix-linting.py")
        print("   - Commit sin verificar: git commit --no-verify")
        
        return 0
        
    except Exception as e:
        print(f"❌ Error durante la instalación: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

