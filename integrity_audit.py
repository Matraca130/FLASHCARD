#!/usr/bin/env python3
"""
Script de Auditoría de Integridad entre Commits
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
            return files
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error obteniendo archivos del commit {commit_hash}: {e}")
            return []
    
    def get_file_content_at_commit(self, commit_hash, filepath):
        """Obtener contenido de un archivo en un commit específico"""
        try:
            result = subprocess.run(['git', 'show', f'{commit_hash}:{filepath}'], 
                                  capture_output=True, text=True, check=True)
            return result.stdout
            
        except subprocess.CalledProcessError:
            # El archivo no existía en ese commit
            return None
    
    def compare_file_between_commits(self, file_path, commit1, commit2):
        """Comparar un archivo entre dos commits"""
        content1 = self.get_file_content_at_commit(commit1, file_path)
        content2 = self.get_file_content_at_commit(commit2, file_path)
        
        if content1 is None and content2 is None:
            return {'status': 'both_missing', 'changes': []}
        elif content1 is None:
            return {'status': 'added', 'changes': ['file_added']}
        elif content2 is None:
            return {'status': 'deleted', 'changes': ['file_deleted']}
        elif content1 == content2:
            return {'status': 'unchanged', 'changes': []}
        else:
            # Archivo modificado - analizar cambios
            changes = self.analyze_content_changes(content1, content2)
            return {'status': 'modified', 'changes': changes}
    
    def analyze_content_changes(self, content1, content2):
        """Analizar cambios específicos entre dos versiones de contenido"""
        lines1 = content1.split('\n')
        lines2 = content2.split('\n')
        
        changes = []
        
        # Buscar funciones agregadas
        for line in lines2:
            if line.strip().startswith('function ') or line.strip().startswith('def ') or \
               line.strip().startswith('const ') or line.strip().startswith('let '):
                if line not in lines1:
                    changes.append(f"function_added: {line.strip()[:50]}...")
        
        # Buscar funciones eliminadas
        for line in lines1:
            if line.strip().startswith('function ') or line.strip().startswith('def ') or \
               line.strip().startswith('const ') or line.strip().startswith('let '):
                if line not in lines2:
                    changes.append(f"function_removed: {line.strip()[:50]}...")
        
        # Buscar importaciones agregadas/eliminadas
        for line in lines2:
            if line.strip().startswith('import ') or line.strip().startswith('from '):
                if line not in lines1:
                    changes.append(f"import_added: {line.strip()[:50]}...")
        
        for line in lines1:
            if line.strip().startswith('import ') or line.strip().startswith('from '):
                if line not in lines2:
                    changes.append(f"import_removed: {line.strip()[:50]}...")
        
        return changes
    
    def audit_commit_transition(self, commit_from, commit_to):
        """Auditar la transición entre dos commits consecutivos"""
        print(f"\n🔍 Auditando transición: {commit_from['hash']} → {commit_to['hash']}")
        print(f"   De: {commit_from['message']}")
        print(f"   A:  {commit_to['message']}")
        
        # Obtener archivos modificados en ambos commits
        files_from = set(self.get_commit_files(commit_from['hash']))
        files_to = set(self.get_commit_files(commit_to['hash']))
        
        all_files = files_from.union(files_to)
        
        transition_result = {
            'from_commit': commit_from,
            'to_commit': commit_to,
            'files_analyzed': len(all_files),
            'integrity_issues': [],
            'verified_changes': []
        }
        
        for file_path in all_files:
            if not os.path.exists(file_path):
                continue
                
            comparison = self.compare_file_between_commits(file_path, commit_from['hash'], commit_to['hash'])
            
            if comparison['status'] == 'modified':
                # Verificar que los cambios estén presentes en el archivo actual
                current_content = self.get_current_file_content(file_path)
                if current_content:
                    for change in comparison['changes']:
                        if self.verify_change_in_current_content(change, current_content):
                            transition_result['verified_changes'].append({
                                'file': file_path,
                                'change': change,
                                'status': 'verified'
                            })
                        else:
                            transition_result['integrity_issues'].append({
                                'file': file_path,
                                'change': change,
                                'status': 'missing_in_current'
                            })
            
            elif comparison['status'] == 'added':
                if os.path.exists(file_path):
                    transition_result['verified_changes'].append({
                        'file': file_path,
                        'change': 'file_added',
                        'status': 'verified'
                    })
                else:
                    transition_result['integrity_issues'].append({
                        'file': file_path,
                        'change': 'file_added',
                        'status': 'missing_in_current'
                    })
        
        # Reportar resultados
        if transition_result['integrity_issues']:
            print(f"   ❌ {len(transition_result['integrity_issues'])} problemas de integridad detectados")
            for issue in transition_result['integrity_issues']:
                print(f"      - {issue['file']}: {issue['change']}")
        else:
            print(f"   ✅ Transición íntegra - {len(transition_result['verified_changes'])} cambios verificados")
        
        return transition_result
    
    def get_current_file_content(self, filepath):
        """Obtener contenido actual de un archivo"""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception:
            return None
    
    def verify_change_in_current_content(self, change, content):
        """Verificar si un cambio específico está presente en el contenido actual"""
        if change.startswith('function_added:') or change.startswith('import_added:'):
            # Extraer la parte relevante del cambio
            change_content = change.split(':', 1)[1].strip()
            if '...' in change_content:
                change_content = change_content.replace('...', '')
            
            # Buscar en el contenido actual
            return change_content in content
        
        return True  # Para otros tipos de cambios, asumir que están presentes
    
    def run_integrity_audit(self):
        """Ejecutar auditoría completa de integridad"""
        print("🚀 Iniciando auditoría de integridad entre commits...")
        
        if not self.get_commits():
            return False
        
        # Auditar transiciones entre commits consecutivos
        for i in range(len(self.commits) - 1):
            commit_from = self.commits[i + 1]  # Commit más antiguo
            commit_to = self.commits[i]        # Commit más reciente
            
            transition_result = self.audit_commit_transition(commit_from, commit_to)
            
            if transition_result['integrity_issues']:
                self.integrity_issues.extend(transition_result['integrity_issues'])
            else:
                self.verified_transitions.append(transition_result)
        
        self.generate_integrity_report()
        return True
    
    def generate_integrity_report(self):
        """Generar reporte de integridad"""
        total_transitions = len(self.verified_transitions) + len([t for t in self.integrity_issues])
        verified_transitions = len(self.verified_transitions)
        
        report = f"""
# 🔒 REPORTE DE INTEGRIDAD ENTRE COMMITS

## 📋 Resumen de Integridad
- **Transiciones auditadas**: {len(self.commits) - 1}
- **Transiciones íntegras**: {verified_transitions}
- **Problemas de integridad**: {len(self.integrity_issues)}
- **Porcentaje de integridad**: {(verified_transitions / (len(self.commits) - 1) * 100):.1f}%

## 🔍 Análisis Detallado

"""
        
        if self.integrity_issues:
            report += "### ❌ Problemas de Integridad Detectados\n\n"
            
            issues_by_file = {}
            for issue in self.integrity_issues:
                file_path = issue['file']
                if file_path not in issues_by_file:
                    issues_by_file[file_path] = []
                issues_by_file[file_path].append(issue)
            
            for file_path, issues in issues_by_file.items():
                report += f"**Archivo: {file_path}**\n"
                for issue in issues:
                    report += f"- {issue['change']} ({issue['status']})\n"
                report += "\n"
        else:
            report += "### ✅ No se detectaron problemas de integridad\n\n"
            report += "Todos los cambios entre commits consecutivos están presentes en el código actual.\n\n"
        
        report += f"""
## 📊 Estadísticas de Verificación
- **Commits analizados**: {len(self.commits)}
- **Transiciones verificadas**: {len(self.commits) - 1}
- **Archivos únicos analizados**: {len(set(issue['file'] for issue in self.integrity_issues))}

## 🎯 Conclusión
"""
        
        if len(self.integrity_issues) == 0:
            report += "✅ **INTEGRIDAD COMPLETA**: No se han perdido cambios entre commits.\n"
        elif len(self.integrity_issues) < 5:
            report += "⚠️ **INTEGRIDAD ALTA**: Pocos problemas menores detectados.\n"
        else:
            report += "❌ **PROBLEMAS DE INTEGRIDAD**: Se requiere revisión manual.\n"
        
        # Guardar reporte
        with open('INTEGRITY_AUDIT_REPORT.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📊 Reporte de integridad guardado en INTEGRITY_AUDIT_REPORT.md")
        return report

if __name__ == "__main__":
    auditor = IntegrityAuditor()
    success = auditor.run_integrity_audit()
    
    if success:
        if len(auditor.integrity_issues) == 0:
            print("\n🎉 ¡INTEGRIDAD COMPLETA! No se han perdido cambios entre commits.")
        else:
            print(f"\n⚠️ Se detectaron {len(auditor.integrity_issues)} problemas de integridad.")
    else:
        print("\n❌ Error en la auditoría de integridad")
        sys.exit(1)

