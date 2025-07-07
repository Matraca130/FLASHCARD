#!/usr/bin/env python3
"""
Script para auto-corregir errores comunes de linting Python
Corrige automáticamente W504 y algunos errores de formato
"""

import re
import os
import subprocess
import sys
from pathlib import Path

def fix_w504_errors(file_path):
    """Corregir errores W504 (line break after binary operator)"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Patrones para corregir W504
    # Operadores binarios al final de línea
    patterns = [
        # Operador + al final
        (r'(\s+)([^=\s]+)\s*\+\s*\n(\s+)', r'\1\2\n\3+ '),
        # Operador - al final
        (r'(\s+)([^=\s]+)\s*-\s*\n(\s+)', r'\1\2\n\3- '),
        # Operador * al final
        (r'(\s+)([^=\s]+)\s*\*\s*\n(\s+)', r'\1\2\n\3* '),
        # Operador / al final
        (r'(\s+)([^=\s]+)\s*/\s*\n(\s+)', r'\1\2\n\3/ '),
        # Operador and al final
        (r'(\s+)([^=\s]+)\s*and\s*\n(\s+)', r'\1\2\n\3and '),
        # Operador or al final
        (r'(\s+)([^=\s]+)\s*or\s*\n(\s+)', r'\1\2\n\3or '),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def fix_indentation_errors(file_path):
    """Intentar corregir errores básicos de indentación"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed_lines = []
    indent_stack = [0]  # Stack para rastrear niveles de indentación
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Líneas vacías o comentarios
        if not stripped or stripped.startswith('#'):
            fixed_lines.append(line)
            continue
        
        # Calcular indentación esperada
        current_indent = len(line) - len(line.lstrip())
        
        # Detectar bloques que requieren indentación
        prev_line = lines[i-1].strip() if i > 0 else ""
        if prev_line.endswith(':'):
            # Después de :, debe haber indentación
            expected_indent = indent_stack[-1] + 4
            if current_indent <= indent_stack[-1]:
                # Corregir indentación
                line = ' ' * expected_indent + stripped + '\n'
                indent_stack.append(expected_indent)
        
        fixed_lines.append(line)
    
    # Escribir archivo corregido
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)

def run_autopep8(file_path):
    """Ejecutar autopep8 para correcciones automáticas"""
    try:
        subprocess.run([
            'python', '-m', 'autopep8', 
            '--in-place',
            '--aggressive',
            '--aggressive',
            file_path
        ], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_tools():
    """Instalar herramientas necesarias"""
    tools = ['flake8', 'autopep8']
    for tool in tools:
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'show', tool], 
                         check=True, capture_output=True)
        except subprocess.CalledProcessError:
            print(f"📦 Instalando {tool}...")
            subprocess.run([sys.executable, '-m', 'pip', 'install', tool], check=True)

def main():
    """Función principal"""
    print("🔧 AUTO-CORRECTOR DE LINTING PYTHON")
    print("=" * 50)
    
    # Instalar herramientas si es necesario
    install_tools()
    
    # Cambiar al directorio del proyecto
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Encontrar archivos Python en backend_app
    python_files = []
    for root, dirs, files in os.walk('backend_app'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    print(f"🔍 Encontrados {len(python_files)} archivos Python")
    
    fixed_files = []
    
    for file_path in python_files:
        print(f"🔧 Procesando {file_path}...")
        
        # Intentar autopep8 primero
        if run_autopep8(file_path):
            print(f"  ✅ autopep8 aplicado")
        
        # Corregir errores W504 específicos
        if fix_w504_errors(file_path):
            print(f"  ✅ Errores W504 corregidos")
            fixed_files.append(file_path)
    
    print("=" * 50)
    
    if fixed_files:
        print(f"✅ {len(fixed_files)} archivos corregidos:")
        for file_path in fixed_files:
            print(f"  - {file_path}")
        
        print("\n🔍 Ejecutando verificación final...")
        result = subprocess.run([
            'python', '-m', 'flake8', 
            'backend_app/',
            '--config=.flake8'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ ¡Todos los errores críticos corregidos!")
        else:
            print("⚠️  Algunos errores requieren corrección manual:")
            print(result.stdout)
    else:
        print("✅ No se encontraron errores para corregir automáticamente")

if __name__ == "__main__":
    main()

