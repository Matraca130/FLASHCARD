#!/usr/bin/env python3
"""
Security Scanner Inteligente para FLASHCARD
Escanea el código en busca de vulnerabilidades de seguridad usando configuración YAML
"""

import os
import re
import sys
import yaml
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any
import argparse


class SecurityScanner:
    def __init__(self, config_path: str = ".security-scan-config.yml"):
        """Inicializar el scanner con configuración"""
        self.config_path = config_path
        self.config = self._load_config()
        self.findings = []
        self.stats = {"critical": 0, "warning": 0, "info": 0}

    def _load_config(self) -> Dict[str, Any]:
        """Cargar configuración desde archivo YAML"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"❌ Archivo de configuración no encontrado: {self.config_path}")
            sys.exit(1)
        except yaml.YAMLError as e:
            print(f"❌ Error al parsear configuración YAML: {e}")
            sys.exit(1)

    def _should_exclude_file(self, file_path: str) -> bool:
        """Verificar si un archivo debe ser excluido del escaneo"""
        path = Path(file_path)
        
        # Excluir directorios
        for excluded_dir in self.config.get('exclusions', {}).get('directories', []):
            if excluded_dir in path.parts:
                return True
            # También verificar si el path completo contiene el directorio
            if excluded_dir in str(path):
                return True
        
        # Excluir archivos por patrón
        for pattern in self.config.get('exclusions', {}).get('files', []):
            if path.match(pattern):
                return True
        
        # Excluir archivos minificados y bundles específicamente
        if any(pattern in path.name for pattern in ['.min.', '-BMfhnFcW', 'bundle', 'chunk']):
            return True
        
        # Excluir archivos en directorio raíz que parecen bundles
        if path.parent == Path('.') and any(char in path.name for char in ['-', '_']) and path.suffix == '.js':
            if len(path.stem) > 10:  # Nombres largos típicos de bundles
                return True
        
        return False

    def _has_content_exception(self, content: str, line: str) -> bool:
        """Verificar si el contenido tiene excepciones legítimas"""
        exceptions = self.config.get('exclusions', {}).get('content_exceptions', [])
        
        for exception in exceptions:
            if exception.lower() in line.lower():
                return True
        
        return False

    def _scan_file_for_patterns(self, file_path: str, patterns: List[Dict], severity: str) -> List[Dict]:
        """Escanear un archivo en busca de patrones específicos"""
        findings = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
        except Exception as e:
            return findings

        for line_num, line in enumerate(lines, 1):
            for pattern_config in patterns:
                pattern = pattern_config['pattern']
                description = pattern_config['description']
                
                if re.search(pattern, line, re.IGNORECASE):
                    # Verificar excepciones de contenido
                    if self._has_content_exception(line, line):
                        continue
                    
                    # Obtener contexto
                    context = self._get_context(lines, line_num - 1)
                    
                    finding = {
                        'file': file_path,
                        'line': line_num,
                        'severity': severity,
                        'pattern': pattern,
                        'description': description,
                        'content': line.strip(),
                        'context': context
                    }
                    
                    findings.append(finding)
                    self.stats[severity] += 1
        
        return findings

    def _get_context(self, lines: List[str], line_index: int) -> List[str]:
        """Obtener contexto alrededor de una línea"""
        max_context = self.config.get('reporting', {}).get('max_context_lines', 3)
        start = max(0, line_index - max_context)
        end = min(len(lines), line_index + max_context + 1)
        
        context = []
        for i in range(start, end):
            prefix = ">>> " if i == line_index else "    "
            context.append(f"{prefix}{i+1}: {lines[i].rstrip()}")
        
        return context

    def _scan_directory(self, directory: str = ".") -> None:
        """Escanear directorio recursivamente"""
        for root, dirs, files in os.walk(directory):
            # Filtrar directorios excluidos
            dirs[:] = [d for d in dirs if not self._should_exclude_file(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                
                # Verificar si el archivo debe ser excluido
                if self._should_exclude_file(file_path):
                    continue
                
                # Solo escanear archivos de código
                if not any(file_path.endswith(ext) for ext in ['.js', '.html', '.css', '.json', '.py']):
                    continue
                
                # Escanear patrones críticos
                critical_patterns = self.config.get('hardcoded_patterns', {}).get('critical', [])
                self.findings.extend(
                    self._scan_file_for_patterns(file_path, critical_patterns, 'critical')
                )
                
                # Escanear patrones de advertencia
                warning_patterns = self.config.get('hardcoded_patterns', {}).get('warning', [])
                self.findings.extend(
                    self._scan_file_for_patterns(file_path, warning_patterns, 'warning')
                )
                
                # Escanear funciones peligrosas
                dangerous_critical = self.config.get('dangerous_functions', {}).get('critical', [])
                self.findings.extend(
                    self._scan_file_for_patterns(file_path, dangerous_critical, 'critical')
                )
                
                dangerous_warning = self.config.get('dangerous_functions', {}).get('warning', [])
                self.findings.extend(
                    self._scan_file_for_patterns(file_path, dangerous_warning, 'warning')
                )
                
                # Escanear patrones de URL
                url_patterns = self.config.get('url_patterns', {}).get('warning', [])
                self.findings.extend(
                    self._scan_file_for_patterns(file_path, url_patterns, 'warning')
                )

    def _generate_report(self, format_type: str = "detailed") -> str:
        """Generar reporte de resultados"""
        if format_type == "json":
            return json.dumps({
                'stats': self.stats,
                'findings': self.findings
            }, indent=2)
        
        report = []
        report.append("🔍 REPORTE DE SEGURIDAD - FLASHCARD")
        report.append("=" * 50)
        
        # Estadísticas
        report.append(f"\n📊 ESTADÍSTICAS:")
        report.append(f"   Critical: {self.stats['critical']}")
        report.append(f"   Warning:  {self.stats['warning']}")
        report.append(f"   Total:    {sum(self.stats.values())}")
        
        if not self.findings:
            report.append("\n✅ No se encontraron problemas de seguridad!")
            return "\n".join(report)
        
        # Agrupar por severidad si está configurado
        if self.config.get('reporting', {}).get('group_by_severity', True):
            for severity in ['critical', 'warning']:
                severity_findings = [f for f in self.findings if f['severity'] == severity]
                
                if severity_findings:
                    icon = "🚨" if severity == 'critical' else "⚠️"
                    report.append(f"\n{icon} {severity.upper()} ({len(severity_findings)} encontrados):")
                    report.append("-" * 40)
                    
                    for finding in severity_findings:
                        report.append(f"\n📁 {finding['file']}:{finding['line']}")
                        report.append(f"   {finding['description']}")
                        report.append(f"   Contenido: {finding['content']}")
                        
                        if self.config.get('reporting', {}).get('include_context', True):
                            report.append("   Contexto:")
                            for context_line in finding['context']:
                                report.append(f"   {context_line}")
        
        return "\n".join(report)

    def run(self, directory: str = ".", output_format: str = "detailed") -> int:
        """Ejecutar el escaneo completo"""
        print("🔍 Iniciando escaneo de seguridad...")
        
        self._scan_directory(directory)
        
        # Generar reporte
        report = self._generate_report(output_format)
        print(report)
        
        # Determinar código de salida
        behavior = self.config.get('behavior', {})
        
        if self.stats['critical'] > 0 and behavior.get('fail_on_critical', True):
            print(f"\n❌ Escaneo falló: {self.stats['critical']} problemas críticos encontrados")
            return 1
        
        if self.stats['warning'] > 0 and behavior.get('fail_on_warning', False):
            print(f"\n⚠️ Escaneo falló: {self.stats['warning']} advertencias encontradas")
            return 1
        
        if sum(self.stats.values()) > 0:
            print(f"\n⚠️ Se encontraron {sum(self.stats.values())} problemas, pero no son críticos")
        else:
            print("\n✅ Escaneo completado sin problemas críticos")
        
        return 0


def main():
    parser = argparse.ArgumentParser(description='Security Scanner para FLASHCARD')
    parser.add_argument('--config', default='.security-scan-config.yml',
                       help='Ruta al archivo de configuración')
    parser.add_argument('--directory', default='.',
                       help='Directorio a escanear')
    parser.add_argument('--format', choices=['detailed', 'simple', 'json'],
                       default='detailed', help='Formato del reporte')
    
    args = parser.parse_args()
    
    scanner = SecurityScanner(args.config)
    exit_code = scanner.run(args.directory, args.format)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

