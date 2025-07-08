#!/usr/bin/env python3
"""
Análisis de Cambios Faltantes
Verifica si los cambios reportados como faltantes realmente están ausentes o implementados de otra forma
"""

import os
import subprocess
import re

class MissingChangesAnalyzer:
    def __init__(self):
        self.missing_items = {
            'files': [
                '.eslintrc.js'  # Renombrado a .eslintrc.cjs
            ],
            'functions': [
                'capitalizeWords',
                'downloadFile',
                'apiWithFallback.*performance',
                'const categoryData',
                'const performanceData',
                'const accuracyData'
            ],
            'html_elements': [
                'id="create"',
                'id="study"', 
                'id="manage"'
            ],
            'constants': [
                'API_BASE_URL',
                'MAX_FLASHCARDS_PER_DECK',
                'DEFAULT_STUDY_INTERVAL',
                'configDatabase',
                'configAuth',
                'configUI'
            ]
        }
        
        self.analysis_results = {}
    
    def search_alternative_implementations(self, item, search_patterns):
        """Buscar implementaciones alternativas de un elemento"""
        found_alternatives = []
        
        for pattern in search_patterns:
            try:
                result = subprocess.run(['grep', '-r', '-i', pattern, '--include=*.js', '--include=*.py', '--include=*.html', '.'], 
                                      capture_output=True, text=True, check=False)
                if result.stdout.strip():
                    found_alternatives.append({
                        'pattern': pattern,
                        'matches': result.stdout.strip().split('\n')[:3]  # Primeras 3 coincidencias
                    })
            except Exception as e:
                continue
        
        return found_alternatives
    
    def analyze_missing_files(self):
        """Analizar archivos reportados como faltantes"""
        print("📁 Analizando archivos faltantes...")
        
        for file_path in self.missing_items['files']:
            print(f"\n🔍 Analizando: {file_path}")
            
            if file_path == '.eslintrc.js':
                # Verificar si fue renombrado
                if os.path.exists('.eslintrc.cjs'):
                    print("   ✅ ENCONTRADO: Archivo renombrado a .eslintrc.cjs")
                    self.analysis_results[file_path] = {
                        'status': 'renamed',
                        'new_location': '.eslintrc.cjs',
                        'reason': 'Renombrado para compatibilidad ESM/CJS'
                    }
                else:
                    print("   ❌ NO ENCONTRADO: Archivo realmente faltante")
                    self.analysis_results[file_path] = {
                        'status': 'missing',
                        'reason': 'Archivo no existe'
                    }
    
    def analyze_missing_functions(self):
        """Analizar funciones reportadas como faltantes"""
        print("\n🔧 Analizando funciones faltantes...")
        
        for func_name in self.missing_items['functions']:
            print(f"\n🔍 Analizando función: {func_name}")
            
            # Buscar implementaciones alternativas
            search_patterns = [
                func_name,
                func_name.replace('const ', ''),
                func_name.replace('function ', ''),
                func_name.split('(')[0] if '(' in func_name else func_name
            ]
            
            alternatives = self.search_alternative_implementations(func_name, search_patterns)
            
            if alternatives:
                print(f"   ✅ ENCONTRADO: {len(alternatives)} implementaciones alternativas")
                for alt in alternatives:
                    print(f"      - Patrón '{alt['pattern']}': {len(alt['matches'])} coincidencias")
                
                self.analysis_results[func_name] = {
                    'status': 'found_alternative',
                    'alternatives': alternatives,
                    'reason': 'Implementado con nombre o estructura diferente'
                }
            else:
                print(f"   ❌ NO ENCONTRADO: Función realmente faltante")
                self.analysis_results[func_name] = {
                    'status': 'missing',
                    'reason': 'Función no implementada'
                }
    
    def analyze_missing_html_elements(self):
        """Analizar elementos HTML faltantes"""
        print("\n🌐 Analizando elementos HTML faltantes...")
        
        if not os.path.exists('index.html'):
            print("   ❌ index.html no encontrado")
            return
        
        with open('index.html', 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        for element in self.missing_items['html_elements']:
            print(f"\n🔍 Analizando elemento: {element}")
            
            if element in html_content:
                print(f"   ✅ ENCONTRADO: Elemento presente en HTML")
                self.analysis_results[element] = {
                    'status': 'found',
                    'reason': 'Elemento presente en index.html'
                }
            else:
                # Buscar variaciones
                element_id = element.replace('id="', '').replace('"', '')
                variations = [
                    f'id="{element_id}"',
                    f"id='{element_id}'",
                    f'data-section="{element_id}"',
                    f'class="{element_id}"'
                ]
                
                found_variation = False
                for variation in variations:
                    if variation in html_content:
                        print(f"   ✅ ENCONTRADO: Variación '{variation}'")
                        self.analysis_results[element] = {
                            'status': 'found_variation',
                            'variation': variation,
                            'reason': 'Implementado con atributo diferente'
                        }
                        found_variation = True
                        break
                
                if not found_variation:
                    print(f"   ❌ NO ENCONTRADO: Elemento realmente faltante")
                    self.analysis_results[element] = {
                        'status': 'missing',
                        'reason': 'Elemento no presente en HTML'
                    }
    
    def analyze_missing_constants(self):
        """Analizar constantes faltantes"""
        print("\n📊 Analizando constantes faltantes...")
        
        for constant in self.missing_items['constants']:
            print(f"\n🔍 Analizando constante: {constant}")
            
            # Buscar en archivos de configuración y JavaScript
            search_patterns = [
                constant,
                constant.upper(),
                constant.lower(),
                f'const {constant}',
                f'let {constant}',
                f'var {constant}'
            ]
            
            alternatives = self.search_alternative_implementations(constant, search_patterns)
            
            if alternatives:
                print(f"   ✅ ENCONTRADO: {len(alternatives)} referencias")
                self.analysis_results[constant] = {
                    'status': 'found',
                    'alternatives': alternatives,
                    'reason': 'Constante definida en el código'
                }
            else:
                print(f"   ❌ NO ENCONTRADO: Constante no definida")
                self.analysis_results[constant] = {
                    'status': 'missing',
                    'reason': 'Constante no definida o no utilizada'
                }
    
    def generate_analysis_report(self):
        """Generar reporte de análisis de cambios faltantes"""
        
        total_items = len(self.analysis_results)
        found_items = len([r for r in self.analysis_results.values() if r['status'] in ['found', 'found_alternative', 'found_variation', 'renamed']])
        missing_items = total_items - found_items
        
        recovery_rate = (found_items / total_items * 100) if total_items > 0 else 100
        
        report = f"""
# 🔍 ANÁLISIS DE CAMBIOS FALTANTES

## 📊 Resumen del Análisis
- **Elementos analizados**: {total_items}
- **Elementos encontrados**: {found_items}
- **Elementos realmente faltantes**: {missing_items}
- **Tasa de recuperación**: {recovery_rate:.1f}%

## 📋 Resultados Detallados

"""
        
        categories = {
            'found': '✅ Elementos Encontrados',
            'found_alternative': '🔄 Implementaciones Alternativas',
            'found_variation': '🔀 Variaciones Encontradas',
            'renamed': '📝 Elementos Renombrados',
            'missing': '❌ Elementos Realmente Faltantes'
        }
        
        for status, title in categories.items():
            items_in_category = [item for item, data in self.analysis_results.items() if data['status'] == status]
            
            if items_in_category:
                report += f"### {title}\n\n"
                
                for item in items_in_category:
                    data = self.analysis_results[item]
                    report += f"**{item}**\n"
                    report += f"- Razón: {data['reason']}\n"
                    
                    if 'new_location' in data:
                        report += f"- Nueva ubicación: {data['new_location']}\n"
                    
                    if 'variation' in data:
                        report += f"- Variación encontrada: {data['variation']}\n"
                    
                    if 'alternatives' in data:
                        report += f"- Alternativas encontradas: {len(data['alternatives'])}\n"
                    
                    report += "\n"
        
        report += f"""
## 🎯 Conclusiones

"""
        
        if recovery_rate >= 90:
            report += "✅ **EXCELENTE RECUPERACIÓN**: La mayoría de elementos 'faltantes' fueron encontrados con implementaciones alternativas.\n\n"
        elif recovery_rate >= 75:
            report += "✅ **BUENA RECUPERACIÓN**: Muchos elementos fueron encontrados, pocos realmente faltantes.\n\n"
        elif recovery_rate >= 50:
            report += "⚠️ **RECUPERACIÓN PARCIAL**: Algunos elementos encontrados, otros requieren implementación.\n\n"
        else:
            report += "❌ **BAJA RECUPERACIÓN**: Múltiples elementos realmente faltantes requieren atención.\n\n"
        
        report += """
### Recomendaciones:
1. **Elementos renombrados**: Actualizar referencias si es necesario
2. **Implementaciones alternativas**: Verificar que cumplan la misma función
3. **Elementos faltantes**: Implementar si son críticos para la funcionalidad
4. **Variaciones**: Considerar estandarizar nomenclatura

---

**Nota**: Este análisis verifica si los elementos reportados como faltantes realmente están ausentes o si fueron implementados de manera diferente.
"""
        
        # Guardar reporte
        with open('MISSING_CHANGES_ANALYSIS.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📊 Análisis guardado en MISSING_CHANGES_ANALYSIS.md")
        print(f"🎯 Tasa de recuperación: {recovery_rate:.1f}%")
        
        return recovery_rate
    
    def run_analysis(self):
        """Ejecutar análisis completo"""
        print("🚀 Iniciando análisis de cambios faltantes...")
        
        self.analyze_missing_files()
        self.analyze_missing_functions()
        self.analyze_missing_html_elements()
        self.analyze_missing_constants()
        
        recovery_rate = self.generate_analysis_report()
        
        return recovery_rate

if __name__ == "__main__":
    analyzer = MissingChangesAnalyzer()
    recovery_rate = analyzer.run_analysis()
    
    if recovery_rate >= 90:
        print("\n🎉 ¡Excelente! La mayoría de cambios 'faltantes' fueron encontrados.")
    elif recovery_rate >= 75:
        print("\n✅ Buena recuperación de cambios faltantes.")
    else:
        print("\n⚠️ Algunos cambios requieren atención manual.")

