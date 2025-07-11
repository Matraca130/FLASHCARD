#!/usr/bin/env python3
"""
Análisis detallado de duplicados JavaScript para crear plan de trabajo distribuido
"""

import json
import os
from pathlib import Path

def analyze_duplicate_groups():
    """Analiza los grupos de duplicados en detalle"""
    
    # Cargar el análisis previo
    with open('js_duplicates_analysis.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("🔍 ANÁLISIS DETALLADO DE DUPLICADOS JAVASCRIPT")
    print("=" * 60)
    
    # Analizar grupos de nombres similares
    similar_groups = data['similar_names']['groups']
    
    print(f"\n📝 GRUPOS DE NOMBRES SIMILARES: {len(similar_groups)}")
    print("-" * 40)
    
    priority_groups = []
    
    for i, group in enumerate(similar_groups, 1):
        print(f"\n🔸 GRUPO {i}:")
        
        # Identificar archivos en backup_js vs archivos principales
        backup_files = [f for f in group if 'backup_js' in f['path']]
        main_files = [f for f in group if 'backup_js' not in f['path']]
        
        print(f"  📁 Archivos en backup_js: {len(backup_files)}")
        print(f"  📁 Archivos principales: {len(main_files)}")
        
        # Mostrar detalles de cada archivo
        for file_info in group:
            path = file_info['path']
            size = file_info['size']
            lines = file_info['lines']
            functions_count = len(file_info['functions'])
            
            status = "🔄 BACKUP" if 'backup_js' in path else "⭐ PRINCIPAL"
            print(f"    {status} {path}")
            print(f"      📊 Tamaño: {size} bytes, Líneas: {lines}, Funciones: {functions_count}")
        
        # Determinar prioridad
        if backup_files and main_files:
            priority = "ALTA - Posibles duplicados entre backup y principal"
        elif len(backup_files) > 1:
            priority = "MEDIA - Múltiples archivos en backup"
        else:
            priority = "BAJA - Archivos relacionados pero no duplicados"
        
        print(f"  🎯 Prioridad: {priority}")
        
        priority_groups.append({
            'group_id': i,
            'priority': priority,
            'backup_files': backup_files,
            'main_files': main_files,
            'total_files': len(group)
        })
    
    # Analizar funcionalidades duplicadas
    functional_groups = data['functional_duplicates']['groups']
    
    print(f"\n⚙️ GRUPOS DE FUNCIONALIDAD SIMILAR: {len(functional_groups)}")
    print("-" * 40)
    
    for i, group in enumerate(functional_groups, 1):
        print(f"\n🔸 GRUPO FUNCIONAL {i}:")
        
        for file_info in group:
            path = file_info['path']
            functions = file_info['functions'][:5]  # Mostrar solo las primeras 5 funciones
            
            print(f"    📄 {path}")
            print(f"      🔧 Funciones: {', '.join(functions)}...")
    
    return priority_groups

def create_agent_distribution_plan(priority_groups):
    """Crea el plan de distribución para 5 agentes"""
    
    print(f"\n🤖 PLAN DE DISTRIBUCIÓN PARA 5 AGENTES")
    print("=" * 60)
    
    # Identificar archivos principales que necesitan análisis
    main_js_file = "./flashcard-app-final.js"
    backup_js_dir = "./backup_js/"
    
    # Verificar si existe el archivo principal
    if os.path.exists(main_js_file):
        with open(main_js_file, 'r', encoding='utf-8') as f:
            main_content = f.read()
            main_size = len(main_content)
            main_lines = len(main_content.splitlines())
    else:
        main_size = 0
        main_lines = 0
    
    print(f"\n📄 ARCHIVO PRINCIPAL: {main_js_file}")
    print(f"   📊 Tamaño: {main_size} bytes, Líneas: {main_lines}")
    
    # Contar archivos en backup_js
    backup_files = [f for f in os.listdir(backup_js_dir) if f.endswith('.js')]
    print(f"\n📁 DIRECTORIO BACKUP: {len(backup_files)} archivos JavaScript")
    
    # Plan de distribución
    agent_plan = {
        'agent_1': {
            'name': 'Agente Coordinador Principal',
            'responsibility': 'Coordinación general y archivo principal',
            'tasks': [
                f'Analizar {main_js_file} como archivo de referencia',
                'Coordinar con otros agentes usando sistema de locks',
                'Verificar integridad final del proyecto',
                'Ejecutar merge final de cambios'
            ],
            'files_to_analyze': [main_js_file],
            'priority': 'CRÍTICA'
        },
        'agent_2': {
            'name': 'Agente de Servicios Core',
            'responsibility': 'Servicios principales y autenticación',
            'tasks': [
                'Analizar servicios de autenticación duplicados',
                'Comparar auth.service.js con implementación principal',
                'Identificar funciones duplicadas en servicios core',
                'Proponer eliminación de duplicados'
            ],
            'files_to_analyze': [
                './backup_js/auth.service.js',
                './backup_js/apiClient.js',
                './services/'
            ],
            'priority': 'ALTA'
        },
        'agent_3': {
            'name': 'Agente de Gestión de Datos',
            'responsibility': 'Servicios de datos y almacenamiento',
            'tasks': [
                'Analizar storage.service.js y duplicados',
                'Comparar servicios de gestión de datos',
                'Identificar funciones de CRUD duplicadas',
                'Optimizar servicios de almacenamiento'
            ],
            'files_to_analyze': [
                './backup_js/storage.service.js',
                './backup_js/manage.service.js',
                './backup_js/create.service.js',
                './store/'
            ],
            'priority': 'ALTA'
        },
        'agent_4': {
            'name': 'Agente de UI y Dashboard',
            'responsibility': 'Interfaz de usuario y dashboard',
            'tasks': [
                'Analizar dashboard.service.js y similares',
                'Comparar servicios de interfaz de usuario',
                'Identificar componentes UI duplicados',
                'Optimizar servicios de presentación'
            ],
            'files_to_analyze': [
                './backup_js/dashboard.service.js',
                './backup_js/study.service.js',
                './backup_js/gamification.service.js',
                './utils/'
            ],
            'priority': 'MEDIA'
        },
        'agent_5': {
            'name': 'Agente de Utilidades y Testing',
            'responsibility': 'Utilidades, helpers y archivos de testing',
            'tasks': [
                'Analizar archivos de utilidades duplicados',
                'Comparar helpers y funciones auxiliares',
                'Revisar archivos de configuración duplicados',
                'Limpiar archivos de testing obsoletos'
            ],
            'files_to_analyze': [
                './backup_js/helpers.js',
                './backup_js/router.js',
                './backup_js/main.js',
                './tests/',
                './cypress/'
            ],
            'priority': 'BAJA'
        }
    }
    
    return agent_plan

def generate_coordination_protocol():
    """Genera el protocolo de coordinación entre agentes"""
    
    protocol = {
        'coordination_rules': [
            '🔒 Usar sistema de locks antes de modificar archivos',
            '📝 Documentar todos los cambios en commits descriptivos',
            '🔄 Sincronizar con repositorio remoto frecuentemente',
            '✅ Validar cambios antes de hacer push',
            '🤝 Comunicar conflictos potenciales inmediatamente'
        ],
        'workflow_sequence': [
            '1. Agente 1 inicia coordinación y adquiere lock general',
            '2. Agentes 2-5 trabajan en paralelo en sus áreas asignadas',
            '3. Cada agente adquiere lock específico para sus archivos',
            '4. Agente 1 coordina merge de cambios',
            '5. Verificación final y push coordinado'
        ],
        'conflict_prevention': [
            'Cada agente trabaja en archivos específicos sin solapamiento',
            'Uso obligatorio de branches temporales por agente',
            'Merge automático inteligente con resolución de conflictos',
            'Rollback automático en caso de errores'
        ],
        'communication_protocol': [
            'Usar commits con prefijos: [AGENT-X] descripción',
            'Reportar progreso cada 15 minutos',
            'Notificar inmediatamente cualquier conflicto',
            'Coordinar a través del Agente 1 para decisiones críticas'
        ]
    }
    
    return protocol

def main():
    """Función principal"""
    
    # Analizar grupos de duplicados
    priority_groups = analyze_duplicate_groups()
    
    # Crear plan de distribución
    agent_plan = create_agent_distribution_plan(priority_groups)
    
    # Generar protocolo de coordinación
    protocol = generate_coordination_protocol()
    
    # Mostrar plan de agentes
    print(f"\n🤖 DISTRIBUCIÓN DE AGENTES")
    print("=" * 60)
    
    for agent_id, agent_info in agent_plan.items():
        print(f"\n{agent_id.upper()}: {agent_info['name']}")
        print(f"🎯 Responsabilidad: {agent_info['responsibility']}")
        print(f"⚡ Prioridad: {agent_info['priority']}")
        print("📋 Tareas:")
        for task in agent_info['tasks']:
            print(f"   • {task}")
        print("📁 Archivos a analizar:")
        for file_path in agent_info['files_to_analyze']:
            print(f"   • {file_path}")
    
    # Guardar plan completo
    complete_plan = {
        'priority_groups': priority_groups,
        'agent_distribution': agent_plan,
        'coordination_protocol': protocol,
        'summary': {
            'total_js_files': 42,
            'similar_name_groups': len(priority_groups),
            'agents_assigned': 5,
            'coordination_method': 'Lock-based with automatic merge'
        }
    }
    
    with open('agent_distribution_plan.json', 'w', encoding='utf-8') as f:
        json.dump(complete_plan, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Plan completo guardado en: agent_distribution_plan.json")
    
    return complete_plan

if __name__ == "__main__":
    main()

