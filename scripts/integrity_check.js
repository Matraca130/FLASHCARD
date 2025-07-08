#!/usr/bin/env node
/**
 * VERIFICACIÓN DE INTEGRIDAD
 * Script para verificar la integridad del proyecto después de eliminación de duplicados
 */

const fs = require('fs');
const path = require('path');

class IntegrityChecker {
    constructor() {
        this.startTime = Date.now();
        this.errors = [];
        this.warnings = [];
        this.mainFile = './flashcard-app-final.js';
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [INTEGRITY] ${timestamp}: ${message}`);
    }

    checkMainFile() {
        this.log('Verificando archivo principal...');
        
        if (!fs.existsSync(this.mainFile)) {
            this.errors.push(`Archivo principal no encontrado: ${this.mainFile}`);
            return false;
        }
        
        try {
            const content = fs.readFileSync(this.mainFile, 'utf8');
            
            // Verificar sintaxis básica
            if (content.includes('<<<<<<< HEAD') || content.includes('>>>>>>> ')) {
                this.errors.push('Marcadores de merge conflict encontrados en archivo principal');
            }
            
            // Verificar que no esté vacío
            if (content.trim().length === 0) {
                this.errors.push('Archivo principal está vacío');
            }
            
            // Verificar estructura básica
            const hasBasicStructure = content.includes('function') || content.includes('=>') || content.includes('class');
            if (!hasBasicStructure) {
                this.warnings.push('Archivo principal no parece contener código JavaScript válido');
            }
            
            this.log(`Archivo principal verificado: ${content.length} bytes`);
            return true;
            
        } catch (error) {
            this.errors.push(`Error leyendo archivo principal: ${error.message}`);
            return false;
        }
    }

    checkBackupDirectory() {
        this.log('Verificando directorio backup...');
        
        const backupDir = './backup_js';
        
        if (!fs.existsSync(backupDir)) {
            this.warnings.push('Directorio backup_js no encontrado');
            return true;
        }
        
        try {
            const files = fs.readdirSync(backupDir);
            const jsFiles = files.filter(f => f.endsWith('.js'));
            
            this.log(`Archivos en backup: ${jsFiles.length}`);
            
            // Verificar archivos sospechosos
            jsFiles.forEach(file => {
                const filePath = path.join(backupDir, file);
                const stats = fs.statSync(filePath);
                
                // Archivos muy pequeños podrían ser problemáticos
                if (stats.size < 100) {
                    this.warnings.push(`Archivo muy pequeño en backup: ${file} (${stats.size} bytes)`);
                }
                
                // Verificar contenido básico
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('<<<<<<< HEAD') || content.includes('>>>>>>> ')) {
                        this.errors.push(`Marcadores de merge conflict en: ${file}`);
                    }
                } catch (error) {
                    this.errors.push(`Error leyendo archivo backup ${file}: ${error.message}`);
                }
            });
            
            return true;
            
        } catch (error) {
            this.errors.push(`Error verificando directorio backup: ${error.message}`);
            return false;
        }
    }

    checkServiceDirectories() {
        this.log('Verificando directorios de servicios...');
        
        const serviceDirs = ['./services', './utils', './store'];
        
        serviceDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                try {
                    const files = fs.readdirSync(dir);
                    const jsFiles = files.filter(f => f.endsWith('.js'));
                    
                    this.log(`${dir}: ${jsFiles.length} archivos JavaScript`);
                    
                    jsFiles.forEach(file => {
                        const filePath = path.join(dir, file);
                        try {
                            const content = fs.readFileSync(filePath, 'utf8');
                            if (content.includes('<<<<<<< HEAD') || content.includes('>>>>>>> ')) {
                                this.errors.push(`Marcadores de merge conflict en: ${filePath}`);
                            }
                        } catch (error) {
                            this.errors.push(`Error leyendo ${filePath}: ${error.message}`);
                        }
                    });
                    
                } catch (error) {
                    this.warnings.push(`Error accediendo a directorio ${dir}: ${error.message}`);
                }
            } else {
                this.log(`Directorio no encontrado: ${dir}`);
            }
        });
    }

    checkGitStatus() {
        this.log('Verificando estado de Git...');
        
        try {
            const { execSync } = require('child_process');
            
            // Verificar si hay cambios sin commit
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            
            if (status.trim()) {
                this.warnings.push('Hay cambios sin commit en el repositorio');
                this.log('Cambios detectados:');
                console.log(status);
            } else {
                this.log('Repositorio limpio - sin cambios pendientes');
            }
            
            // Verificar branch actual
            const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            this.log(`Branch actual: ${branch}`);
            
            return true;
            
        } catch (error) {
            this.warnings.push(`Error verificando Git: ${error.message}`);
            return false;
        }
    }

    checkLockFiles() {
        this.log('Verificando archivos de lock...');
        
        const lockDir = '.agent-locks';
        
        if (fs.existsSync(lockDir)) {
            const lockFiles = fs.readdirSync(lockDir);
            
            if (lockFiles.length > 0) {
                this.warnings.push(`Archivos de lock encontrados: ${lockFiles.join(', ')}`);
                
                // Verificar si están expirados
                lockFiles.forEach(lockFile => {
                    try {
                        const lockPath = path.join(lockDir, lockFile);
                        const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                        const lockAge = Date.now() - lockData.timestamp;
                        
                        if (lockAge > 300000) { // 5 minutos
                            this.warnings.push(`Lock expirado: ${lockFile} (${Math.round(lockAge / 1000)}s)`);
                        } else {
                            this.warnings.push(`Lock activo: ${lockFile} (${lockData.agentId})`);
                        }
                    } catch (error) {
                        this.errors.push(`Error leyendo lock ${lockFile}: ${error.message}`);
                    }
                });
            } else {
                this.log('No hay archivos de lock activos');
            }
        } else {
            this.log('Directorio de locks no existe');
        }
    }

    checkReportFiles() {
        this.log('Verificando archivos de reporte...');
        
        const reportFiles = [
            'js_duplicates_analysis.json',
            'agent_distribution_plan.json',
            'agent1_report.json',
            'agent2_report.json',
            'agent3_report.json',
            'agent4_report.json',
            'agent5_report.json',
            'final_coordination_report.json',
            'master_coordination_report.json'
        ];
        
        const existingReports = [];
        
        reportFiles.forEach(reportFile => {
            if (fs.existsSync(reportFile)) {
                existingReports.push(reportFile);
                
                try {
                    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
                    this.log(`Reporte válido: ${reportFile}`);
                } catch (error) {
                    this.errors.push(`Reporte corrupto: ${reportFile} - ${error.message}`);
                }
            }
        });
        
        this.log(`Reportes encontrados: ${existingReports.length}/${reportFiles.length}`);
    }

    generateIntegrityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - this.startTime,
            status: this.errors.length === 0 ? 'PASS' : 'FAIL',
            summary: {
                errors: this.errors.length,
                warnings: this.warnings.length,
                checks: [
                    'mainFile',
                    'backupDirectory',
                    'serviceDirectories',
                    'gitStatus',
                    'lockFiles',
                    'reportFiles'
                ]
            },
            errors: this.errors,
            warnings: this.warnings
        };
        
        fs.writeFileSync('integrity_check_report.json', JSON.stringify(report, null, 2));
        this.log(`Reporte de integridad guardado: integrity_check_report.json`);
        
        return report;
    }

    async execute() {
        try {
            this.log('=== INICIANDO VERIFICACIÓN DE INTEGRIDAD ===');
            
            // Ejecutar todas las verificaciones
            this.checkMainFile();
            this.checkBackupDirectory();
            this.checkServiceDirectories();
            this.checkGitStatus();
            this.checkLockFiles();
            this.checkReportFiles();
            
            // Generar reporte
            const report = this.generateIntegrityReport();
            
            // Mostrar resumen
            console.log('\n=== RESUMEN DE INTEGRIDAD ===');
            console.log(`Estado: ${report.status}`);
            console.log(`Errores: ${report.summary.errors}`);
            console.log(`Advertencias: ${report.summary.warnings}`);
            console.log(`Tiempo de verificación: ${Math.round(report.executionTime / 1000)} segundos`);
            
            if (this.errors.length > 0) {
                console.log('\n❌ ERRORES ENCONTRADOS:');
                this.errors.forEach(error => console.log(`  • ${error}`));
            }
            
            if (this.warnings.length > 0) {
                console.log('\n⚠️  ADVERTENCIAS:');
                this.warnings.forEach(warning => console.log(`  • ${warning}`));
            }
            
            if (this.errors.length === 0 && this.warnings.length === 0) {
                console.log('\n✅ INTEGRIDAD VERIFICADA - TODO CORRECTO');
            }
            
            this.log('Verificación de integridad completada');
            
            // Retornar código de salida apropiado
            process.exit(this.errors.length > 0 ? 1 : 0);
            
        } catch (error) {
            this.log(`Error en verificación: ${error.message}`, 'error');
            process.exit(1);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const checker = new IntegrityChecker();
    checker.execute();
}

module.exports = IntegrityChecker;

