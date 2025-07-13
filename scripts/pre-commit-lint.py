#!/usr/bin/env python3
"""
Pre-commit hook para verificar linting Python
Previene commits con errores críticos de sintaxis e indentación
"""

import subprocess
import sys
import os
from pathlib import Path

def run_flake8():
    """Ejecutar flake8 en archivos Python del backend"""
    print("🔍 Ejecutando verificación de linting Python...")
    
    # Cambiar al directorio del proyecto
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Ejecutar flake8 específicamente en backend_app
    try:
        result = subprocess.run([
            'python', '-m', 'flake8', 
            'backend_app/',
            '--config=.flake8',
            '--exit-zero'  # No fallar, solo reportar
        ], capture_output=True, text=True, check=False)
        
        if result.stdout.strip():
            print("❌ ERRORES DE LINTING ENCONTRADOS:")
            print(result.stdout)
            
            # Verificar errores críticos
            critical_errors = []
            for line in result.stdout.split('\n'):
                if any(code in line for code in ['E999', 'W504', 'E111', 'E112', 'E113', 'E114', 'E115', 'E116']):
                    critical_errors.append(line)
            
            if critical_errors:
                print("\n🚨 ERRORES CRÍTICOS DETECTADOS:")
                for error in critical_errors:
                    print(f"  {error}")
                print("\n❌ COMMIT BLOQUEADO - Corrige los errores críticos antes de hacer commit")
                return False
            else:
                print("\n⚠️  Hay warnings de linting, pero no errores críticos")
                print("✅ Commit permitido, pero considera corregir los warnings")
                return True
        else:
            print("✅ No se encontraron errores de linting")
            return True
            
    except FileNotFoundError:
        print("⚠️  flake8 no encontrado, instalando...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'flake8'], check=True)
        return run_flake8()  # Reintentar
    except Exception as e:
        print(f"❌ Error ejecutando flake8: {e}")
        return False

def check_python_syntax():
    """Verificar sintaxis Python básica"""
    print("🔍 Verificando sintaxis Python básica...")
    
    python_files = []
    for root, dirs, files in os.walk('backend_app'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    syntax_errors = []
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                compile(f.read(), file_path, 'exec')
        except SyntaxError as e:
            syntax_errors.append(f"{file_path}:{e.lineno}: {e.msg}")
        except Exception as e:
            syntax_errors.append(f"{file_path}: {e}")
    
    if syntax_errors:
        print("❌ ERRORES DE SINTAXIS ENCONTRADOS:")
        for error in syntax_errors:
            print(f"  {error}")
        return False
    else:
        print("✅ Sintaxis Python correcta")
        return True

def main():
    """Función principal del pre-commit hook"""
    print("🛡️  PRE-COMMIT HOOK - Verificación de calidad de código")
    print("=" * 60)
    
    # Verificar sintaxis básica
    syntax_ok = check_python_syntax()
    
    # Verificar linting
    lint_ok = run_flake8()
    
    print("=" * 60)
    
    if syntax_ok and lint_ok:
        print("✅ VERIFICACIÓN COMPLETADA - Commit permitido")
        return 0
    else:
        print("❌ VERIFICACIÓN FALLIDA - Commit bloqueado")
        print("\n💡 Para corregir errores automáticamente:")
        print("   python scripts/fix-linting.py")
        print("\n💡 Para hacer commit ignorando warnings (solo si no hay errores críticos):")
        print("   git commit --no-verify")
        return 1

if __name__ == "__main__":
    sys.exit(main())

