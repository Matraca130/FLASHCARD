#!/usr/bin/env python3
"""
Script para corregir errores de sintaxis en apiClient.js
"""

import re

def fix_syntax_errors(file_path):
    """Corregir errores de sintaxis comunes"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Patrón 1: if (condition){ ) { -> if (condition) {
    pattern1 = r'if\s*\([^)]+\)\{\s*\)\s*\{'
    content = re.sub(pattern1, lambda m: m.group(0).replace('){ ) {', ') {'), content)
    
    # Patrón 2: condition){ ) { -> condition) {
    pattern2 = r'([^{]+)\{\s*\)\s*\{'
    content = re.sub(pattern2, r'\1) {', content)
    
    # Patrón 3: statement; } -> statement;
    pattern3 = r'([^;]+);\s*\}\s*$'
    content = re.sub(pattern3, r'\1;', content, flags=re.MULTILINE)
    
    # Correcciones específicas más precisas
    corrections = [
        # Patrón: if (condition){ ) {
        (r'if\s*\(([^)]+)\)\{\s*\)\s*\{', r'if (\1) {'),
        
        # Patrón: } else if (condition){ ) {
        (r'\}\s*else\s+if\s*\(([^)]+)\)\{\s*\)\s*\{', r'} else if (\1) {'),
        
        # Patrón: while (condition){ ) {
        (r'while\s*\(([^)]+)\)\{\s*\)\s*\{', r'while (\1) {'),
        
        # Patrón: for (condition){ ) {
        (r'for\s*\(([^)]+)\)\{\s*\)\s*\{', r'for (\1) {'),
        
        # Patrón: statement; }
        (r'([^{};]+);\s*\}(?=\s*$)', r'\1;'),
        
        # Patrón: return value; }
        (r'return\s+([^;]+);\s*\}(?=\s*$)', r'return \1;'),
        
        # Patrón específico: condition){ ) {
        (r'([^{]+)\)\{\s*\)\s*\{', r'\1) {'),
    ]
    
    for pattern, replacement in corrections:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    # Escribir el archivo corregido
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Errores de sintaxis corregidos en {file_path}")

if __name__ == "__main__":
    fix_syntax_errors('/home/ubuntu/FLASHCARD/apiClient.js')

