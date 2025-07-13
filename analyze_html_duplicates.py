#!/usr/bin/env python3
"""
Script para analizar duplicaciones en archivos HTML
Detecta elementos, estilos, scripts y estructuras duplicadas
"""

import os
import json
import hashlib
from pathlib import Path
from bs4 import BeautifulSoup
import re
from datetime import datetime

def calculate_file_hash(filepath):
    """Calcula hash MD5 del archivo"""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return None

def extract_html_components(filepath):
    """Extrae componentes del archivo HTML"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # Extraer diferentes componentes
        components = {
            'title': soup.title.string if soup.title else '',
            'meta_tags': [str(tag) for tag in soup.find_all('meta')],
            'css_links': [tag.get('href', '') for tag in soup.find_all('link', rel='stylesheet')],
            'script_tags': [tag.get('src', '') or tag.string or '' for tag in soup.find_all('script')],
            'inline_styles': [tag.string or '' for tag in soup.find_all('style')],
            'body_classes': soup.body.get('class', []) if soup.body else [],
            'sections': [tag.get('id', '') for tag in soup.find_all(['section', 'div'], id=True)],
            'forms': [tag.get('id', '') for tag in soup.find_all('form')],
            'buttons': [tag.get('data-action', '') for tag in soup.find_all('button', attrs={'data-action': True})],
            'navigation': [tag.get('href', '') for tag in soup.find_all('a', href=True)],
            'images': [tag.get('src', '') for tag in soup.find_all('img')],
            'total_elements': len(soup.find_all()),
            'file_size': os.path.getsize(filepath),
            'line_count': len(content.splitlines())
        }
        
        return components
    except Exception as e:
        print(f"Error procesando {filepath}: {e}")
        return None

def find_html_duplicates(html_files):
    """Encuentra duplicaciones entre archivos HTML"""
    duplicates = []
    file_data = {}
    
    # Analizar cada archivo
    for filepath in html_files:
        components = extract_html_components(filepath)
        if components:
            file_data[filepath] = components
    
    # Comparar archivos entre sí
    files = list(file_data.keys())
    for i, file1 in enumerate(files):
        for file2 in files[i+1:]:
            similarity_score = calculate_similarity(file_data[file1], file_data[file2])
            
            if similarity_score > 0.3:  # Umbral de similitud
                priority = "CRITICAL" if similarity_score > 0.8 else "HIGH" if similarity_score > 0.6 else "MEDIUM"
                
                duplicates.append({
                    'file1': file1,
                    'file2': file2,
                    'similarity': similarity_score,
                    'priority': priority,
                    'common_elements': find_common_elements(file_data[file1], file_data[file2])
                })
    
    return duplicates, file_data

def calculate_similarity(comp1, comp2):
    """Calcula similitud entre dos conjuntos de componentes"""
    score = 0
    total_checks = 0
    
    # Comparar diferentes aspectos
    checks = [
        ('meta_tags', 0.2),
        ('css_links', 0.15),
        ('script_tags', 0.15),
        ('inline_styles', 0.1),
        ('sections', 0.15),
        ('forms', 0.1),
        ('buttons', 0.1),
        ('navigation', 0.05)
    ]
    
    for key, weight in checks:
        if key in comp1 and key in comp2:
            set1 = set(comp1[key]) if isinstance(comp1[key], list) else {comp1[key]}
            set2 = set(comp2[key]) if isinstance(comp2[key], list) else {comp2[key]}
            
            if set1 or set2:  # Evitar división por cero
                intersection = len(set1.intersection(set2))
                union = len(set1.union(set2))
                similarity = intersection / union if union > 0 else 0
                score += similarity * weight
        
        total_checks += weight
    
    return score / total_checks if total_checks > 0 else 0

def find_common_elements(comp1, comp2):
    """Encuentra elementos comunes entre dos componentes"""
    common = {}
    
    for key in ['meta_tags', 'css_links', 'script_tags', 'sections', 'forms', 'buttons']:
        if key in comp1 and key in comp2:
            set1 = set(comp1[key]) if isinstance(comp1[key], list) else {comp1[key]}
            set2 = set(comp2[key]) if isinstance(comp2[key], list) else {comp2[key]}
            intersection = list(set1.intersection(set2))
            if intersection:
                common[key] = intersection
    
    return common

def generate_agent_distribution(duplicates, file_data):
    """Genera distribución de trabajo para agentes"""
    
    # Clasificar archivos por tipo/función
    file_classification = {}
    for filepath, data in file_data.items():
        if 'index' in filepath:
            file_classification[filepath] = 'main_app'
        elif 'app' in filepath:
            file_classification[filepath] = 'secondary_app'
        elif 'tool' in filepath:
            file_classification[filepath] = 'utility'
        else:
            file_classification[filepath] = 'other'
    
    # Distribución de agentes
    agent_distribution = {
        'agent_1': {
            'role': 'Coordinador HTML',
            'responsibility': 'Verificación y coordinación general',
            'files': list(file_data.keys()),
            'tasks': ['Verificar duplicados', 'Coordinar otros agentes', 'Validar resultado final']
        },
        'agent_2': {
            'role': 'Aplicación Principal',
            'responsibility': 'index.html y estructura principal',
            'files': [f for f, t in file_classification.items() if t == 'main_app'],
            'tasks': ['Consolidar estructura principal', 'Eliminar elementos duplicados']
        },
        'agent_3': {
            'role': 'Aplicaciones Secundarias',
            'responsibility': 'app.html y archivos secundarios',
            'files': [f for f, t in file_classification.items() if t == 'secondary_app'],
            'tasks': ['Analizar necesidad de app.html', 'Consolidar o eliminar']
        },
        'agent_4': {
            'role': 'Herramientas y Utilidades',
            'responsibility': 'tools/ y archivos de utilidad',
            'files': [f for f, t in file_classification.items() if t == 'utility'],
            'tasks': ['Revisar herramientas', 'Eliminar duplicados de utilidades']
        },
        'agent_5': {
            'role': 'Limpieza y Validación',
            'responsibility': 'CSS, JS inline y validación final',
            'files': list(file_data.keys()),
            'tasks': ['Limpiar CSS duplicado', 'Consolidar JS inline', 'Validar HTML']
        }
    }
    
    return agent_distribution

def main():
    print("🔍 Analizando duplicados HTML...")
    
    # Buscar archivos HTML
    html_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    
    print(f"📄 Archivos HTML encontrados: {len(html_files)}")
    for file in html_files:
        print(f"  - {file}")
    
    # Analizar duplicados
    duplicates, file_data = find_html_duplicates(html_files)
    
    # Generar distribución de agentes
    agent_distribution = generate_agent_distribution(duplicates, file_data)
    
    # Crear reporte
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_html_files': len(html_files),
        'files_analyzed': list(file_data.keys()),
        'duplicates_found': len(duplicates),
        'duplicates': duplicates,
        'file_details': file_data,
        'agent_distribution': agent_distribution,
        'summary': {
            'critical_duplicates': len([d for d in duplicates if d['priority'] == 'CRITICAL']),
            'high_duplicates': len([d for d in duplicates if d['priority'] == 'HIGH']),
            'medium_duplicates': len([d for d in duplicates if d['priority'] == 'MEDIUM']),
            'total_file_size': sum(data['file_size'] for data in file_data.values()),
            'total_elements': sum(data['total_elements'] for data in file_data.values())
        }
    }
    
    # Guardar reporte
    with open('html_duplicates_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Mostrar resumen
    print(f"\n📊 RESUMEN DE ANÁLISIS HTML:")
    print(f"  • Archivos analizados: {len(html_files)}")
    print(f"  • Duplicados encontrados: {len(duplicates)}")
    print(f"  • Críticos: {report['summary']['critical_duplicates']}")
    print(f"  • Altos: {report['summary']['high_duplicates']}")
    print(f"  • Medios: {report['summary']['medium_duplicates']}")
    print(f"  • Tamaño total: {report['summary']['total_file_size']} bytes")
    print(f"  • Elementos totales: {report['summary']['total_elements']}")
    
    print(f"\n📋 DUPLICADOS DETECTADOS:")
    for dup in duplicates:
        print(f"  • {dup['file1']} vs {dup['file2']} ({dup['priority']}) - Similitud: {dup['similarity']:.2f}")
    
    print(f"\n🤖 DISTRIBUCIÓN DE AGENTES:")
    for agent_id, agent_info in agent_distribution.items():
        print(f"  • {agent_id.upper()}: {agent_info['role']}")
        print(f"    - Archivos: {len(agent_info['files'])}")
        print(f"    - Tareas: {len(agent_info['tasks'])}")
    
    print(f"\n✅ Reporte guardado en: html_duplicates_analysis.json")

if __name__ == "__main__":
    main()

