#!/usr/bin/env python3
"""
Script de Verificación de Funcionalidades Críticas
Verifica que todas las funcionalidades principales del proyecto estén implementadas
"""

import os
import subprocess
import json
import re

class CriticalFunctionsAuditor:
    def __init__(self):
        self.critical_functions = {
            'dashboard': [
                'loadDashboardData',
                'updateDashboardStats',
                'generateActivityHeatmap',
                'initializeCharts',
                'initializeDashboard'
            ],
            'navigation': [
                'showSection',
                'initializeNavigation',
                'setupMutationObserver',
                'discoverSections'
            ],
            'flashcards': [
                'createDeck',
                'createFlashcard',
                'studyFlashcard',
                'deleteFlashcard',
                'editFlashcard'
            ],
            'study': [
                'startStudySession',
                'reviewCard',
                'calculateNextReview',
                'updateProgress'
            ],
            'auth': [
                'login',
                'logout',
                'register',
                'updateAuthUI'
            ],
            'api': [
                'ApiClient',
                'apiWithFallback',
                'handleApiError'
            ],
            'storage': [
                'saveToStorage',
                'loadFromStorage',
                'clearStorage'
            ],
            'algorithms': [
                'spaced_repetition',
                'calculate_ease_factor',
                'get_next_interval'
            ]
        }
        
        self.critical_files = [
            'index.html',
            'main.js',
            'core-navigation.js',
            'dashboard.service.js',
            'auth.service.js',
            'flashcards.service.js',
            'study.service.js',
            'apiClient.js',
            'storage.service.js',
            'algorithms.service.js'
        ]
        
        self.results = {}
    
    def check_file_exists(self, filepath):
        """Verificar si un archivo existe"""
        exists = os.path.exists(filepath)
        print(f"   {'✅' if exists else '❌'} Archivo: {filepath}")
        return exists
    
    def check_function_in_files(self, function_name, file_patterns=['*.js', '*.py']):
        """Buscar una función en archivos del proyecto"""
        try:
            cmd = ['grep', '-r', function_name]
            for pattern in file_patterns:
                cmd.extend(['--include', pattern])
            cmd.append('.')
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            found = function_name in result.stdout
            
            if found:
                # Contar ocurrencias
                occurrences = result.stdout.count(function_name)
                print(f"   ✅ Función: {function_name} ({occurrences} ocurrencias)")
            else:
                print(f"   ❌ Función: {function_name} (no encontrada)")
            
            return found
            
        except Exception as e:
            print(f"   ⚠️ Error buscando {function_name}: {e}")
            return False
    
    def check_import_statements(self):
        """Verificar declaraciones de importación críticas"""
        critical_imports = [
            "import './core-navigation.js'",
            "import { showSection }",
            "import { ApiClient }",
            "import { loadDashboardData }",
            "import { initializeCharts }"
        ]
        
        print("\n🔍 Verificando importaciones críticas...")
        verified_imports = 0
        
        for import_stmt in critical_imports:
            if self.check_function_in_files(import_stmt, ['*.js']):
                verified_imports += 1
        
        print(f"   📊 Importaciones verificadas: {verified_imports}/{len(critical_imports)}")
        return verified_imports / len(critical_imports)
    
    def check_html_elements(self):
        """Verificar elementos HTML críticos"""
        critical_elements = [
            'id="dashboard"',
            'id="dashboard-stats"',
            'id="create"',
            'id="study"',
            'id="manage"',
            'class="nav-item"'
        ]
        
        print("\n🔍 Verificando elementos HTML críticos...")
        verified_elements = 0
        
        if os.path.exists('index.html'):
            with open('index.html', 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            for element in critical_elements:
                if element in html_content:
                    verified_elements += 1
                    print(f"   ✅ Elemento: {element}")
                else:
                    print(f"   ❌ Elemento: {element}")
        
        print(f"   📊 Elementos HTML verificados: {verified_elements}/{len(critical_elements)}")
        return verified_elements / len(critical_elements)
    
    def check_api_endpoints(self):
        """Verificar endpoints de API críticos"""
        critical_endpoints = [
            '/api/dashboard/stats',
            '/api/decks',
            '/api/flashcards',
            '/api/study',
            '/api/auth'
        ]
        
        print("\n🔍 Verificando referencias a endpoints de API...")
        verified_endpoints = 0
        
        for endpoint in critical_endpoints:
            if self.check_function_in_files(endpoint, ['*.js', '*.py']):
                verified_endpoints += 1
        
        print(f"   📊 Endpoints verificados: {verified_endpoints}/{len(critical_endpoints)}")
        return verified_endpoints / len(critical_endpoints)
    
    def check_configuration_files(self):
        """Verificar archivos de configuración"""
        config_files = [
            '.eslintrc.cjs',
            'package.json',
            'vite.config.js',
            'manifest.webmanifest'
        ]
        
        print("\n🔍 Verificando archivos de configuración...")
        verified_configs = 0
        
        for config_file in config_files:
            if self.check_file_exists(config_file):
                verified_configs += 1
        
        print(f"   📊 Configuraciones verificadas: {verified_configs}/{len(config_files)}")
        return verified_configs / len(config_files)
    
    def run_critical_audit(self):
        """Ejecutar auditoría completa de funcionalidades críticas"""
        print("🚀 Iniciando auditoría de funcionalidades críticas...")
        
        # Verificar archivos críticos
        print("\n📁 Verificando archivos críticos...")
        verified_files = 0
        for filepath in self.critical_files:
            if self.check_file_exists(filepath):
                verified_files += 1
        
        file_integrity = verified_files / len(self.critical_files)
        print(f"   📊 Archivos críticos: {file_integrity:.1%} ({verified_files}/{len(self.critical_files)})")
        
        # Verificar funciones por categoría
        total_functions = 0
        verified_functions = 0
        
        for category, functions in self.critical_functions.items():
            print(f"\n🔧 Verificando funciones de {category}...")
            category_verified = 0
            
            for function_name in functions:
                if self.check_function_in_files(function_name):
                    category_verified += 1
                    verified_functions += 1
                total_functions += 1
            
            category_integrity = category_verified / len(functions)
            print(f"   📊 {category}: {category_integrity:.1%} ({category_verified}/{len(functions)})")
            
            self.results[category] = {
                'verified': category_verified,
                'total': len(functions),
                'integrity': category_integrity
            }
        
        function_integrity = verified_functions / total_functions
        
        # Verificaciones adicionales
        import_integrity = self.check_import_statements()
        html_integrity = self.check_html_elements()
        api_integrity = self.check_api_endpoints()
        config_integrity = self.check_configuration_files()
        
        # Calcular integridad general
        overall_integrity = (
            file_integrity * 0.25 +
            function_integrity * 0.35 +
            import_integrity * 0.15 +
            html_integrity * 0.10 +
            api_integrity * 0.10 +
            config_integrity * 0.05
        )
        
        # Generar reporte
        self.generate_critical_report(
            file_integrity, function_integrity, import_integrity,
            html_integrity, api_integrity, config_integrity, overall_integrity
        )
        
        return overall_integrity
    
    def generate_critical_report(self, file_int, func_int, import_int, html_int, api_int, config_int, overall_int):
        """Generar reporte de funcionalidades críticas"""
        
        report = f"""
# 🎯 REPORTE DE FUNCIONALIDADES CRÍTICAS

## 📊 Resumen General
- **Integridad General**: {overall_int:.1%}
- **Archivos Críticos**: {file_int:.1%}
- **Funciones Críticas**: {func_int:.1%}
- **Importaciones**: {import_int:.1%}
- **Elementos HTML**: {html_int:.1%}
- **Endpoints API**: {api_int:.1%}
- **Configuraciones**: {config_int:.1%}

## 🔧 Análisis por Categoría

"""
        
        for category, data in self.results.items():
            status = "✅" if data['integrity'] >= 0.8 else "⚠️" if data['integrity'] >= 0.6 else "❌"
            report += f"### {status} {category.title()}\n"
            report += f"- **Integridad**: {data['integrity']:.1%} ({data['verified']}/{data['total']})\n\n"
        
        report += f"""
## 🎯 Evaluación de Integridad

"""
        
        if overall_int >= 0.9:
            report += "✅ **EXCELENTE**: Todas las funcionalidades críticas están implementadas correctamente.\n"
        elif overall_int >= 0.8:
            report += "✅ **BUENA**: La mayoría de funcionalidades críticas están presentes.\n"
        elif overall_int >= 0.7:
            report += "⚠️ **ACEPTABLE**: Algunas funcionalidades críticas necesitan atención.\n"
        else:
            report += "❌ **CRÍTICO**: Múltiples funcionalidades críticas están faltantes.\n"
        
        report += f"""
## 📈 Recomendaciones

### Prioridad Alta
- Verificar funciones con integridad < 70%
- Revisar archivos críticos faltantes
- Validar importaciones y dependencias

### Prioridad Media
- Optimizar elementos HTML faltantes
- Verificar endpoints de API
- Actualizar configuraciones

### Prioridad Baja
- Documentar funciones implementadas
- Agregar tests para funciones críticas
- Optimizar rendimiento

---

**Fecha de auditoría**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        # Guardar reporte
        with open('CRITICAL_FUNCTIONS_REPORT.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📊 Reporte de funcionalidades críticas guardado en CRITICAL_FUNCTIONS_REPORT.md")
        print(f"🎯 Integridad general: {overall_int:.1%}")
        
        return report

if __name__ == "__main__":
    auditor = CriticalFunctionsAuditor()
    integrity = auditor.run_critical_audit()
    
    if integrity >= 0.8:
        print("\n🎉 ¡Funcionalidades críticas en buen estado!")
    elif integrity >= 0.6:
        print("\n⚠️ Algunas funcionalidades críticas necesitan atención.")
    else:
        print("\n❌ Múltiples funcionalidades críticas requieren revisión.")

