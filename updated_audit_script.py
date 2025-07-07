#!/usr/bin/env python3
"""
Script de Auditoría Actualizada de Commits
Verifica los nuevos commits implementados desde la última auditoría
"""

import subprocess
import json
import os
import sys
from datetime import datetime

class UpdatedCommitAuditor:
    def __init__(self):
        self.commits = []
        self.previous_audit_commits = 30  # Commits de la auditoría anterior
        self.new_commits = []
        self.all_commits = []
        self.audit_results = {}
        
    def get_updated_commits(self):
        """Obtener lista actualizada de commits"""
        try:
            with open('/tmp/updated_commits.txt', 'r') as f:
                commits_text = f.read().strip().split('\n')
            
            for line in commits_text:
                if line.strip():
                    parts = line.split(' ', 1)
                    if len(parts) >= 2:
                        commit_hash = parts[0]
                        commit_message = parts[1]
                        self.all_commits.append({
                            'hash': commit_hash,
                            'message': commit_message
                        })
            
            # Identificar nuevos commits (los primeros 5 que no estaban en la auditoría anterior)
            self.new_commits = self.all_commits[:5]  # Los 5 commits más recientes
            
            print(f"✅ Total de commits: {len(self.all_commits)}")
            print(f"🆕 Nuevos commits desde última auditoría: {len(self.new_commits)}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error obteniendo commits: {e}")
            return False
    
    def get_commit_details(self, commit_hash):
        """Obtener detalles de un commit específico"""
        try:
            # Obtener archivos modificados
            files_result = subprocess.run(['git', 'show', '--name-only', '--pretty=format:', commit_hash], 
                                        capture_output=True, text=True, check=True)
            files = [f.strip() for f in files_result.stdout.strip().split('\n') if f.strip()]
            
            # Obtener estadísticas del commit
            stats_result = subprocess.run(['git', 'show', '--stat', '--pretty=format:', commit_hash], 
                                        capture_output=True, text=True, check=True)
            
            # Obtener diff del commit
            diff_result = subprocess.run(['git', 'show', '--pretty=format:', commit_hash], 
                                       capture_output=True, text=True, check=True, errors='ignore')
            
            return {
                'files': files,
                'stats': stats_result.stdout,
                'diff': diff_result.stdout
            }
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error obteniendo detalles del commit {commit_hash}: {e}")
            return None
    
    def analyze_commit_changes(self, commit, details):
        """Analizar los cambios de un commit"""
        print(f"\n🔍 Analizando commit {commit['hash']}: {commit['message']}")
        
        if not details:
            return {'status': 'error', 'files': 0, 'changes': 0}
        
        files = details['files']
        diff = details['diff']
        
        # Contar líneas agregadas y eliminadas
        added_lines = len([line for line in diff.split('\n') if line.startswith('+')])
        removed_lines = len([line for line in diff.split('\n') if line.startswith('-')])
        
        # Identificar tipos de cambios
        changes_types = {
            'functions_added': 0,
            'functions_modified': 0,
            'imports_added': 0,
            'configs_modified': 0,
            'files_added': 0,
            'files_modified': len(files)
        }
        
        # Analizar diff para tipos de cambios
        diff_lines = diff.split('\n')
        for line in diff_lines:
            if line.startswith('+') and not line.startswith('+++'):
                clean_line = line[1:].strip()
                if any(keyword in clean_line for keyword in ['function ', 'def ', 'const ', 'let ', 'export function']):
                    changes_types['functions_added'] += 1
                elif clean_line.startswith('import ') or clean_line.startswith('from '):
                    changes_types['imports_added'] += 1
        
        # Verificar si los archivos existen actualmente
        existing_files = []
        missing_files = []
        
        for file_path in files:
            if os.path.exists(file_path):
                existing_files.append(file_path)
                print(f"   ✅ Archivo presente: {file_path}")
            else:
                missing_files.append(file_path)
                print(f"   ❌ Archivo faltante: {file_path}")
        
        integrity_score = len(existing_files) / len(files) if files else 1.0
        
        result = {
            'status': 'analyzed',
            'files_total': len(files),
            'files_existing': len(existing_files),
            'files_missing': len(missing_files),
            'integrity_score': integrity_score,
            'added_lines': added_lines,
            'removed_lines': removed_lines,
            'changes_types': changes_types,
            'missing_files': missing_files
        }
        
        print(f"   📊 Integridad: {integrity_score:.1%} ({len(existing_files)}/{len(files)} archivos)")
        print(f"   📈 Cambios: +{added_lines} -{removed_lines} líneas")
        
        return result
    
    def verify_new_functionality(self):
        """Verificar que las nuevas funcionalidades estén implementadas"""
        print("\n🔧 Verificando nuevas funcionalidades implementadas...")
        
        # Funciones clave que deberían estar presentes después de los nuevos commits
        key_functions = [
            'dashboard-init.js',
            'dashboard-test.js', 
            'dashboard-fixes.js',
            'ci-fix.js',
            'vite.config.js',
            '.eslintrc.cjs'
        ]
        
        verified_functions = 0
        
        for func in key_functions:
            if os.path.exists(func):
                verified_functions += 1
                print(f"   ✅ Archivo presente: {func}")
            else:
                print(f"   ❌ Archivo faltante: {func}")
        
        functionality_score = verified_functions / len(key_functions)
        print(f"   📊 Funcionalidades nuevas: {functionality_score:.1%} ({verified_functions}/{len(key_functions)})")
        
        return functionality_score
    
    def run_updated_audit(self):
        """Ejecutar auditoría actualizada completa"""
        print("🚀 Iniciando auditoría actualizada de commits...")
        
        if not self.get_updated_commits():
            return False
        
        # Auditar nuevos commits
        total_integrity = 0
        successful_audits = 0
        
        for commit in self.new_commits:
            details = self.get_commit_details(commit['hash'])
            result = self.analyze_commit_changes(commit, details)
            
            if result['status'] == 'analyzed':
                total_integrity += result['integrity_score']
                successful_audits += 1
                
            self.audit_results[commit['hash']] = result
        
        # Verificar funcionalidades nuevas
        functionality_score = self.verify_new_functionality()
        
        # Calcular métricas generales
        avg_integrity = total_integrity / successful_audits if successful_audits > 0 else 0
        
        # Generar reporte
        self.generate_updated_report(avg_integrity, functionality_score)
        
        return True
    
    def generate_updated_report(self, avg_integrity, functionality_score):
        """Generar reporte de auditoría actualizada"""
        
        total_files = sum(r.get('files_total', 0) for r in self.audit_results.values())
        total_existing = sum(r.get('files_existing', 0) for r in self.audit_results.values())
        total_missing = sum(r.get('files_missing', 0) for r in self.audit_results.values())
        
        overall_score = (avg_integrity * 0.6 + functionality_score * 0.4)
        
        report = f"""
# 🔄 REPORTE DE AUDITORÍA ACTUALIZADA

## 📋 Resumen de Nuevos Commits
- **Commits nuevos analizados**: {len(self.new_commits)}
- **Commits totales en historial**: {len(self.all_commits)}
- **Integridad promedio**: {avg_integrity:.1%}
- **Funcionalidades nuevas**: {functionality_score:.1%}
- **Puntuación general**: {overall_score:.1%}

## 📊 Estadísticas de Archivos
- **Archivos totales modificados**: {total_files}
- **Archivos presentes**: {total_existing}
- **Archivos faltantes**: {total_missing}
- **Integridad de archivos**: {(total_existing/total_files*100):.1f}% si total_files > 0 else 100.0

## 🆕 Análisis de Nuevos Commits

"""
        
        for commit in self.new_commits:
            commit_hash = commit['hash']
            result = self.audit_results.get(commit_hash, {})
            
            status_icon = "✅" if result.get('integrity_score', 0) >= 0.9 else "⚠️" if result.get('integrity_score', 0) >= 0.7 else "❌"
            
            report += f"""
### {status_icon} Commit {commit_hash}: {commit['message']}
- **Archivos modificados**: {result.get('files_total', 0)}
- **Archivos presentes**: {result.get('files_existing', 0)}
- **Archivos faltantes**: {result.get('files_missing', 0)}
- **Integridad**: {result.get('integrity_score', 0):.1%}
- **Líneas agregadas**: {result.get('added_lines', 0)}
- **Líneas eliminadas**: {result.get('removed_lines', 0)}

"""
            
            if result.get('missing_files'):
                report += "**❌ Archivos faltantes:**\n"
                for missing_file in result['missing_files']:
                    report += f"- {missing_file}\n"
                report += "\n"
        
        report += f"""
## 🎯 Evaluación General

"""
        
        if overall_score >= 0.9:
            report += "✅ **EXCELENTE**: Todos los nuevos commits están correctamente implementados.\n"
        elif overall_score >= 0.8:
            report += "✅ **BUENA**: La mayoría de cambios nuevos están presentes.\n"
        elif overall_score >= 0.7:
            report += "⚠️ **ACEPTABLE**: Algunos cambios nuevos necesitan verificación.\n"
        else:
            report += "❌ **CRÍTICO**: Múltiples cambios nuevos están faltantes.\n"
        
        report += f"""

## 📈 Comparación con Auditoría Anterior

### Métricas Anteriores (30 commits):
- Integridad de archivos: 98.6%
- Integridad de funciones: 81.1%
- Funcionalidades críticas: 95.0%

### Métricas Actuales (35 commits):
- Integridad de archivos: {(total_existing/total_files*100):.1f}%
- Funcionalidades nuevas: {functionality_score:.1%}
- Puntuación general: {overall_score:.1%}

## 🔍 Recomendaciones

### Prioridad Alta:
- Verificar archivos faltantes identificados
- Validar funcionalidades nuevas implementadas

### Prioridad Media:
- Revisar cambios con integridad < 90%
- Documentar nuevas funcionalidades

---

**Fecha de auditoría actualizada**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        # Guardar reporte
        with open('UPDATED_AUDIT_REPORT.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📊 Reporte actualizado guardado en UPDATED_AUDIT_REPORT.md")
        print(f"🎯 Puntuación general: {overall_score:.1%}")
        
        return report

if __name__ == "__main__":
    auditor = UpdatedCommitAuditor()
    success = auditor.run_updated_audit()
    
    if success:
        print("\n🎉 ¡Auditoría actualizada completada!")
    else:
        print("\n❌ Error en la auditoría actualizada")
        sys.exit(1)

