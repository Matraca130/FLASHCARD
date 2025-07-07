#!/usr/bin/env python3
"""
Script de Auditoría de Commits
Verifica que todos los cambios de los últimos 30 commits estén implementados
"""

import subprocess
import json
import os
import sys
from datetime import datetime

class CommitAuditor:
    def __init__(self):
        self.commits = []
        self.audit_results = []
        self.missing_changes = []
        self.verified_changes = []
        
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
    
    def get_commit_changes(self, commit_hash):
        """Obtener cambios específicos de un commit"""
        try:
            # Obtener archivos modificados
            result = subprocess.run(['git', 'show', '--name-only', '--pretty=format:', commit_hash], 
                                  capture_output=True, text=True, check=True)
            files = [f.strip() for f in result.stdout.strip().split('\n') if f.strip()]
            
            # Obtener diff detallado
            result = subprocess.run(['git', 'show', commit_hash], 
                                  capture_output=True, text=True, check=True)
            diff = result.stdout
            
            return {
                'files': files,
                'diff': diff
            }
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error obteniendo cambios del commit {commit_hash}: {e}")
            return None
    
    def verify_file_exists(self, filepath):
        """Verificar si un archivo existe"""
        return os.path.exists(filepath)
    
    def verify_content_in_file(self, filepath, content_patterns):
        """Verificar si cierto contenido está en un archivo"""
        if not os.path.exists(filepath):
            return False
            
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                file_content = f.read()
                
            for pattern in content_patterns:
                if pattern in file_content:
                    return True
            return False
            
        except Exception as e:
            print(f"⚠️ Error leyendo archivo {filepath}: {e}")
            return False
    
    def extract_key_changes(self, diff, commit_message):
        """Extraer cambios clave del diff"""
        key_changes = []
        
        # Buscar funciones agregadas
        lines = diff.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('+') and not line.startswith('+++'):
                # Función o método agregado
                if 'function ' in line or 'def ' in line or 'const ' in line or 'let ' in line:
                    key_changes.append({
                        'type': 'function_added',
                        'content': line.strip()[1:].strip()
                    })
                
                # Importación agregada
                elif 'import ' in line or 'from ' in line:
                    key_changes.append({
                        'type': 'import_added',
                        'content': line.strip()[1:].strip()
                    })
                
                # Configuración agregada
                elif any(keyword in line.lower() for keyword in ['config', 'setting', 'option']):
                    key_changes.append({
                        'type': 'config_added',
                        'content': line.strip()[1:].strip()
                    })
        
        # Buscar archivos nuevos
        if '+++ b/' in diff:
            new_files = []
            for line in lines:
                if line.startswith('+++ b/'):
                    filepath = line.replace('+++ b/', '').strip()
                    if filepath != '/dev/null':
                        new_files.append(filepath)
            
            for filepath in new_files:
                key_changes.append({
                    'type': 'file_added',
                    'content': filepath
                })
        
        return key_changes
    
    def audit_commit(self, commit):
        """Auditar un commit específico"""
        print(f"\n🔍 Auditando commit {commit['hash']}: {commit['message']}")
        
        changes = self.get_commit_changes(commit['hash'])
        if not changes:
            return False
        
        audit_result = {
            'commit': commit,
            'files_modified': changes['files'],
            'verified_files': [],
            'missing_files': [],
            'key_changes': [],
            'verified_changes': [],
            'missing_changes': []
        }
        
        # Verificar archivos modificados
        for filepath in changes['files']:
            if self.verify_file_exists(filepath):
                audit_result['verified_files'].append(filepath)
                print(f"  ✅ Archivo presente: {filepath}")
            else:
                audit_result['missing_files'].append(filepath)
                print(f"  ❌ Archivo faltante: {filepath}")
        
        # Extraer y verificar cambios clave
        key_changes = self.extract_key_changes(changes['diff'], commit['message'])
        audit_result['key_changes'] = key_changes
        
        for change in key_changes:
            if change['type'] == 'file_added':
                if self.verify_file_exists(change['content']):
                    audit_result['verified_changes'].append(change)
                    print(f"  ✅ Archivo nuevo presente: {change['content']}")
                else:
                    audit_result['missing_changes'].append(change)
                    print(f"  ❌ Archivo nuevo faltante: {change['content']}")
            
            elif change['type'] in ['function_added', 'import_added', 'config_added']:
                # Buscar el contenido en archivos relevantes
                found = False
                for filepath in changes['files']:
                    if self.verify_content_in_file(filepath, [change['content']]):
                        audit_result['verified_changes'].append(change)
                        print(f"  ✅ Cambio presente: {change['type']} - {change['content'][:50]}...")
                        found = True
                        break
                
                if not found:
                    audit_result['missing_changes'].append(change)
                    print(f"  ❌ Cambio faltante: {change['type']} - {change['content'][:50]}...")
        
        self.audit_results.append(audit_result)
        return True
    
    def generate_report(self):
        """Generar reporte de auditoría"""
        total_commits = len(self.audit_results)
        total_files = sum(len(r['files_modified']) for r in self.audit_results)
        verified_files = sum(len(r['verified_files']) for r in self.audit_results)
        missing_files = sum(len(r['missing_files']) for r in self.audit_results)
        
        total_changes = sum(len(r['key_changes']) for r in self.audit_results)
        verified_changes = sum(len(r['verified_changes']) for r in self.audit_results)
        missing_changes = sum(len(r['missing_changes']) for r in self.audit_results)
        
        report = f"""
# 📊 REPORTE DE AUDITORÍA DE COMMITS

## 📋 Resumen General
- **Commits auditados**: {total_commits}
- **Archivos analizados**: {total_files}
- **Archivos verificados**: {verified_files}
- **Archivos faltantes**: {missing_files}
- **Cambios analizados**: {total_changes}
- **Cambios verificados**: {verified_changes}
- **Cambios faltantes**: {missing_changes}

## 📈 Estadísticas
- **Integridad de archivos**: {(verified_files/total_files*100):.1f}% ({verified_files}/{total_files})
- **Integridad de cambios**: {(verified_changes/total_changes*100):.1f}% ({verified_changes}/{total_changes}) if total_changes > 0 else 100.0

## 🔍 Detalles por Commit

"""
        
        for result in self.audit_results:
            commit = result['commit']
            report += f"""
### Commit {commit['hash']}: {commit['message']}
- **Archivos modificados**: {len(result['files_modified'])}
- **Archivos verificados**: {len(result['verified_files'])}
- **Archivos faltantes**: {len(result['missing_files'])}
- **Cambios verificados**: {len(result['verified_changes'])}
- **Cambios faltantes**: {len(result['missing_changes'])}

"""
            
            if result['missing_files']:
                report += "**❌ Archivos faltantes:**\n"
                for file in result['missing_files']:
                    report += f"- {file}\n"
                report += "\n"
            
            if result['missing_changes']:
                report += "**❌ Cambios faltantes:**\n"
                for change in result['missing_changes']:
                    report += f"- {change['type']}: {change['content'][:100]}...\n"
                report += "\n"
        
        # Guardar reporte
        with open('AUDIT_REPORT.md', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n📊 Reporte guardado en AUDIT_REPORT.md")
        return report
    
    def run_audit(self):
        """Ejecutar auditoría completa"""
        print("🚀 Iniciando auditoría de commits...")
        
        if not self.get_commits():
            return False
        
        success_count = 0
        for commit in self.commits:
            if self.audit_commit(commit):
                success_count += 1
        
        print(f"\n✅ Auditoría completada: {success_count}/{len(self.commits)} commits procesados")
        
        report = self.generate_report()
        return True

if __name__ == "__main__":
    auditor = CommitAuditor()
    success = auditor.run_audit()
    
    if success:
        print("\n🎉 Auditoría completada exitosamente!")
    else:
        print("\n❌ Error en la auditoría")
        sys.exit(1)

