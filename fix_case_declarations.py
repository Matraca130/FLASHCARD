#!/usr/bin/env python3
"""
Script para corregir errores de case declarations
"""

import os
import re

def fix_case_declarations(file_path):
    """Corregir errores de case declarations"""
    
    if not os.path.exists(file_path):
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Buscar y corregir declaraciones lexicales en case blocks
    # Patrón: case 'value': const variable = ...
    # Corrección: case 'value': { const variable = ... }
    
    lines = content.split('\n')
    modified = False
    
    for i, line in enumerate(lines):
        # Buscar case statements seguidos de declaraciones lexicales
        if re.match(r'\s*case\s+[^:]+:', line):
            # Verificar si la siguiente línea tiene una declaración lexical
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if re.match(r'\s*(const|let|var)\s+', next_line.strip()):
                    # Agregar llaves alrededor del case
                    lines[i] = line + ' {'
                    
                    # Buscar el final del case (break, return, o siguiente case)
                    j = i + 1
                    while j < len(lines):
                        if re.match(r'\s*(break|return)', lines[j].strip()):
                            lines[j] = lines[j] + '\n      }'
                            modified = True
                            break
                        elif re.match(r'\s*(case|default)', lines[j].strip()):
                            lines[j - 1] = lines[j - 1] + '\n      }'
                            modified = True
                            break
                        j += 1
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"✅ Errores de case declarations corregidos en {file_path}")
        return True
    
    return False

def find_and_fix_all_files():
    """Buscar y corregir todos los archivos JavaScript"""
    
    js_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.js'):
                js_files.append(os.path.join(root, file))
    
    fixed_count = 0
    for file_path in js_files:
        if fix_case_declarations(file_path):
            fixed_count += 1
    
    print(f"✅ Total de archivos corregidos: {fixed_count}")

if __name__ == "__main__":
    find_and_fix_all_files()

