#!/usr/bin/env python3
"""
Script de Auditoría de Integridad entre Commits (Versión Corregida)
Verifica que no se hayan perdido cambios entre commits consecutivos
"""

import subprocess
import json
import os
import sys
from datetime import datetime

class IntegrityAuditor:
    def __init__(self):
        self.commits = []
        self.integrity_issues = []
        self.verified_transitions = []
        
    def get_commits(self):
        """Obtener lista de commits"""
        try:
            result = subprocess.run(['git', 'log', '--oneline', '-30'], 
                                  capture_output=True, text=True, check=True)
            commits_text = result.stdout.strip().split('\n')
            
            for line in commits_text:
                if line.strip():
                    parts = line.split(' ', 1)
                    if len(parts) >= 2:
                        commit_hash = parts[0]
                        commit_message = parts[1]
                        self.commits.append({
                            'hash': commit_hash,
                            'message': commit_message
                        })
            
            print(f"✅ Obtenidos {len(self.commits)} commits para auditar")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error obteniendo commits: {e}")
            return False
    
    def get_commit_files(self, commit_hash):
        """Obtener archivos modificados en un commit"""
        try:
            result = subprocess.run(['git', 'show', '--name-only', '--pretty=format:', commit_hash], 
                                  capture_output=True, text=True, check=True)
            files = [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
            # Filtrar solo archivos de texto
            text_files = []
            for f in files:
                if f.endswith(('.js', '.py', '.md', '.txt', '.json', '.css', '.html', '.yml', '.yaml')):
                    text_files.append(f)
            return text_files
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error obteniendo archivos del commit {commit_hash}: {e}")
            return []
    
    def is_text_file(self, filepath):
        """Verificar si un archivo es de texto"""
        text_extensions = {'.js', '.py', '.md', '.txt', '.json', '.css', '.html', '.yml', '.yaml', '.xml'}
        return any(filepath.endswith(ext) for ext in text_extensions)
    
    def get_file_content_at_commit(self, commit_hash, filepath):
        """Obtener contenido de un archivo en un commit específico"""
        if not self.is_text_file(filepath):
            return None
            
        try:
            result = subprocess.run(['git', 'show', f'{commit_hash}:{filepath}'], 
                                  capture_output=True, text=True, check=True, errors='ignore')
            return result.stdout
            
        except subprocess.CalledProcessError:
            # El archivo no existía en ese commit
            return None
    
    def get_commit_diff(self, commit_hash):
        """Obtener diff de un commit"""
        try:
            result = subprocess.run(['git', 'show', '--pretty=format:', commit_hash], 
                                  capture_output=True, text=True, check=True, errors='ignore')
            return result.stdout
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error obteniendo diff del commit {commit_hash}: {e}")
            return ""
    
    def extract_added_functions(self, diff):
        """Extraer funciones agregadas del diff"""
        added_functions = []
        lines = diff.split('\n')
        
        for line in lines:
            if line.startswith('+') and not line.startswith('+++'):
                clean_line = line[1:].strip()
                if any(keyword in clean_line for keyword in ['function ', 'def ', 'const ', 'let ', 'export function']):
                    added_functions.append(clean_line)
        
        return added_functions
    
    def verify_function_exists(self, function_signature):
        """Verificar si una función existe en el código actual"""
        # Extraer nombre de función
        function_name = ""
        if 'function ' in function_signature:
            parts = function_signature.split('function ')
            if len(parts) > 1:
                function_name = parts[1].split('(')[0].strip()
        elif 'def ' in function_signature:
            parts = function_signature.split('def ')
            if len(parts) > 1:
                function_name = parts[1].split('(')[0].strip()
        elif 'const ' in function_signature:
            parts = function_signature.split('const ')
            if len(parts) > 1:
                function_name = parts[1].split('=')[0].strip()
        
        if not function_name:
            return False
        
        # Buscar en archivos JavaScript y Python
        try:
            result = subprocess.run(['grep', '-r', function_name, '--include=*.js', '--include=*.py', '.'], 
                                  capture_output=True, text=True, check=False)
            return function_name in result.stdout
        except:
            return False
    
    def audit_commit_integrity(self, commit):
        """Auditar integridad de un commit específico"""
        print(f"\n🔍 Auditando integridad del commit {commit['hash']}: {commit['message']}")
        
        diff = self.get_commit_diff(commit['hash'])
        added_functions = self.extract_added_functions(diff)
        
        verified_functions = []
        missing_functions = []
        
        for func in added_functions:
            if self.verify_function_exists(func):
                verified_functions.append(func)
                print(f"   ✅ Función presente: {func[:60]}...")
            else:
                missing_functions.append(func)
                print(f"   ❌ Función faltante: {func[:60]}...")
        
        # Verificar archivos modificados
        files = self.get_commit_files(commit['hash'])
        verified_files = []
        missing_files = []
        
        for file_path in files:
            if os.path.exists(file_path):
                verified_files.append(file_path)
            else:
                missing_files.append(file_path)
                print(f"   ❌ Archivo faltante: {file_path}")
        
        return {
            'commit': commit,
            'verified_functions': verified_functions,
            'missing_functions': missing_functions,
            'verified_files': verified_files,
            'missing_files': missing_files
        }
    
    def run_integrity_audit(self):
        """Ejecutar auditoría completa de integridad"""
        print("🚀 Iniciando auditoría de integridad de commits...")
        
        if not self.get_commits():
            return False
        
        all_results = []
        total_missing_functions = 0
        total_missing_files = 0
        
        # Auditar cada commit individualmente
        for commit in self.commits:
            result = self.audit_commit_integrity(commit)
            all_results.append(result)
            
            total_missing_functions += len(result['missing_functions'])
            total_missing_files += len(result['missing_files'])
        
        self.generate_integrity_report(all_results, total_missing_functions, total_missing_files)
        return True
    
    def generate_integrity_report(self, results, total_missing_functions, total_missing_files):
        """Generar reporte de integridad"""
        total_commits = len(results)
        total_functions = sum(len(r['verified_functions']) + len(r['missing_functions']) for r in results)
        total_files = sum(len(r['verified_files']) + len(r['missing_files']) for r in results)
        
        verified_functions = total_functions - total_missing_functions
        verified_files = total_files - total_missing_files
        
        function_integrity = (verified_functions / total_functions * 100) if total_functions > 0 else 100
        file_integrity = (verified_files / total_files * 100) if total_files > 0 else 100
        
        report = f"""
# 🔒 REPORTE DE INTEGRIDAD DE COMMITS

## 📋 Resumen General
- **Commits auditados**: {total_commits}
- **Funciones analizadas**: {total_functions}
- **Funciones verificadas**: {verified_functions}
- **Funciones faltantes**: {total_missing_functions}
- **Archivos analizados**: {total_files}
- **Archivos verificados**: {verified_files}
- **Archivos faltantes**: {total_missing_files}

## 📈 Estadísticas de Integridad
- **Integridad de funciones**: {function_integrity:.1f}% ({verified_functions}/{total_functions})
- **Integridad de archivos**: {file_integrity:.1f}% ({verified_files}/{total_files})

## 🔍 Análisis por Commit

"""
        
        for result in results:
            commit = result['commit']
            report += f"""
### Commit {commit['hash']}: {commit['message']}
- **Funciones verificadas**: {len(result['verified_functions'])}
- **Funciones faltantes**: {len(result['missing_functions'])}
- **Archivos verificados**: {len(result['verified_files'])}
- **Archivos faltantes**: {len(result['missing_files'])}

"""
            
            if result['missing_functions']:
                report += "**❌ Funciones faltantes:**\n"
                for func in result['missing_functions']:
                    report += f"- {func[:80]}...\n"
                report += "\n"
            
            if result['missing_files']:
                report += "**❌ Archivos faltantes:**\n"
                for file in result['missing_files']:
                    report += f"- {file}\n"
                report += "\n"
        
        # Conclusión
        report += f"""
## 🎯 Conclusión

"""
        
        if total_missing_functions == 0 and total_missing_files == 0:
            report += "✅ **INTEGRIDAD COMPLETA**: Todos los cambios de los commits están presentes en el código actual.\n"
        elif total_missing_functions < 5 and total_missing_files < 3:
            report += "⚠️ **INTEGRIDAD ALTA**: Pocos elementos faltantes, posiblemente debido a refactoring o renombrado.\n"
        else:
            report += "❌ **PROBLEMAS DE INTEGRIDAD**: Se requiere revisión manual para verificar cambios faltantes.\n"
        
        # Guardar reporte
        with open('INTEGRITY_FINAL_REPORT.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📊 Reporte final de integridad guardado en INTEGRITY_FINAL_REPORT.md")
        
        # Mostrar resumen en consola
        print(f"\n📈 RESUMEN DE INTEGRIDAD:")
        print(f"   Funciones: {function_integrity:.1f}% ({verified_functions}/{total_functions})")
        print(f"   Archivos: {file_integrity:.1f}% ({verified_files}/{total_files})")
        
        return report

if __name__ == "__main__":
    auditor = IntegrityAuditor()
    success = auditor.run_integrity_audit()
    
    if success:
        print("\n🎉 Auditoría de integridad completada!")
    else:
        print("\n❌ Error en la auditoría de integridad")
        sys.exit(1)

