#!/usr/bin/env python3
"""
Script para identificar archivos JavaScript duplicados
Analiza contenido, nombres similares y funcionalidades
"""

import os
import hashlib
import json
from pathlib import Path
from collections import defaultdict
import difflib

def calculate_file_hash(filepath):
    """Calcula hash MD5 del contenido del archivo"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            return hashlib.md5(content.encode()).hexdigest()
    except Exception as e:
        print(f"Error leyendo {filepath}: {e}")
        return None

def get_file_info(filepath):
    """Obtiene información detallada del archivo"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        return {
            'path': filepath,
            'size': len(content),
            'lines': len(content.splitlines()),
            'hash': calculate_file_hash(filepath),
            'functions': extract_functions(content),
            'imports': extract_imports(content),
            'exports': extract_exports(content)
        }
    except Exception as e:
        print(f"Error analizando {filepath}: {e}")
        return None

def extract_functions(content):
    """Extrae nombres de funciones del código JavaScript"""
    functions = []
    lines = content.splitlines()
    
    for line in lines:
        line = line.strip()
        # Funciones declaradas
        if line.startswith('function '):
            func_name = line.split('(')[0].replace('function ', '').strip()
            functions.append(func_name)
        # Funciones arrow
        elif ' => ' in line and ('const ' in line or 'let ' in line or 'var ' in line):
            func_name = line.split('=')[0].replace('const ', '').replace('let ', '').replace('var ', '').strip()
            functions.append(func_name)
        # Métodos de clase
        elif line.endswith('{') and '(' in line and not line.startswith('if') and not line.startswith('for'):
            func_name = line.split('(')[0].strip()
            if func_name and not func_name.startswith('//'):
                functions.append(func_name)
    
    return functions

def extract_imports(content):
    """Extrae imports del código JavaScript"""
    imports = []
    lines = content.splitlines()
    
    for line in lines:
        line = line.strip()
        if line.startswith('import '):
            imports.append(line)
        elif 'require(' in line:
            imports.append(line)
    
    return imports

def extract_exports(content):
    """Extrae exports del código JavaScript"""
    exports = []
    lines = content.splitlines()
    
    for line in lines:
        line = line.strip()
        if line.startswith('export '):
            exports.append(line)
        elif 'module.exports' in line:
            exports.append(line)
    
    return exports

def find_similar_names(files):
    """Encuentra archivos con nombres similares"""
    similar_groups = []
    processed = set()
    
    for i, file1 in enumerate(files):
        if file1['path'] in processed:
            continue
            
        name1 = Path(file1['path']).stem.lower()
        similar = [file1]
        
        for j, file2 in enumerate(files[i+1:], i+1):
            if file2['path'] in processed:
                continue
                
            name2 = Path(file2['path']).stem.lower()
            
            # Calcular similitud de nombres
            similarity = difflib.SequenceMatcher(None, name1, name2).ratio()
            
            if similarity > 0.7:  # 70% de similitud
                similar.append(file2)
                processed.add(file2['path'])
        
        if len(similar) > 1:
            similar_groups.append(similar)
            for f in similar:
                processed.add(f['path'])
    
    return similar_groups

def find_content_duplicates(files):
    """Encuentra archivos con contenido idéntico o muy similar"""
    hash_groups = defaultdict(list)
    
    # Agrupar por hash (contenido idéntico)
    for file_info in files:
        if file_info and file_info['hash']:
            hash_groups[file_info['hash']].append(file_info)
    
    # Filtrar grupos con más de un archivo
    duplicates = {h: files for h, files in hash_groups.items() if len(files) > 1}
    
    return duplicates

def find_functional_duplicates(files):
    """Encuentra archivos con funcionalidades similares"""
    functional_groups = []
    processed = set()
    
    for i, file1 in enumerate(files):
        if file1['path'] in processed or not file1:
            continue
            
        similar = [file1]
        
        for j, file2 in enumerate(files[i+1:], i+1):
            if file2['path'] in processed or not file2:
                continue
            
            # Comparar funciones
            common_functions = set(file1['functions']) & set(file2['functions'])
            total_functions = set(file1['functions']) | set(file2['functions'])
            
            if total_functions and len(common_functions) / len(total_functions) > 0.5:
                similar.append(file2)
                processed.add(file2['path'])
        
        if len(similar) > 1:
            functional_groups.append(similar)
            for f in similar:
                processed.add(f['path'])
    
    return functional_groups

def analyze_duplicates():
    """Función principal de análisis"""
    print("🔍 Analizando archivos JavaScript para duplicados...")
    
    # Buscar todos los archivos JS
    js_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                js_files.append(filepath)
    
    print(f"📁 Encontrados {len(js_files)} archivos JavaScript")
    
    # Analizar cada archivo
    file_infos = []
    for filepath in js_files:
        info = get_file_info(filepath)
        if info:
            file_infos.append(info)
    
    print(f"✅ Analizados {len(file_infos)} archivos exitosamente")
    
    # Encontrar diferentes tipos de duplicados
    content_duplicates = find_content_duplicates(file_infos)
    similar_names = find_similar_names(file_infos)
    functional_duplicates = find_functional_duplicates(file_infos)
    
    # Generar reporte
    report = {
        'total_files': len(file_infos),
        'content_duplicates': {
            'count': len(content_duplicates),
            'groups': content_duplicates
        },
        'similar_names': {
            'count': len(similar_names),
            'groups': similar_names
        },
        'functional_duplicates': {
            'count': len(functional_duplicates),
            'groups': functional_duplicates
        },
        'all_files': file_infos
    }
    
    # Guardar reporte
    with open('js_duplicates_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Mostrar resumen
    print("\n📊 RESUMEN DE ANÁLISIS:")
    print(f"📁 Total de archivos: {len(file_infos)}")
    print(f"🔄 Duplicados exactos: {len(content_duplicates)} grupos")
    print(f"📝 Nombres similares: {len(similar_names)} grupos")
    print(f"⚙️ Funcionalidad similar: {len(functional_duplicates)} grupos")
    
    return report

if __name__ == "__main__":
    analyze_duplicates()

