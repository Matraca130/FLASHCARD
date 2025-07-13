#!/usr/bin/env node
/**
 * AGENTE 2 - SERVICIOS CORE
 * Script para análisis de servicios principales y autenticación
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Agent2CoreServices {
    constructor() {
        this.agentId = 'AGENT-2';
        this.lockFile = '.agent-locks/core-services.lock';
        this.reportFile = 'agent2_report.json';
        this.startTime = Date.now();
        
        this.assignedFiles = [
            './backup_js/auth.service.js',
            './backup_js/apiClient.js'
        ];
        
        this.assignedDirs = [
            './services/'
        ];
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${this.agentId}] ${timestamp}: ${message}`);
    }

    async acquireLock() {
        this.log('Adquiriendo lock para servicios core...');
        
        try {
            if (!fs.existsSync('.agent-locks')) {
                fs.mkdirSync('.agent-locks');
            }

            if (fs.existsSync(this.lockFile)) {
                const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
                const lockAge = Date.now() - lockData.timestamp;
                
                if (lockAge < 300000) {
                    throw new Error('Lock de servicios core ya existe y está activo');
                }
                
                fs.unlinkSync(this.lockFile);
            }

            const lockData = {
                agentId: this.agentId,
                timestamp: Date.now(),
                operation: 'core-services-analysis',
                pid: process.pid
            };

            fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
            this.log('Lock adquirido exitosamente');
            
            return true;
        } catch (error) {
            this.log(`Error adquiriendo lock: ${error.message}`);
            return false;
        }
    }

    calculateFileHash(filepath) {
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            this.log(`Error calculando hash para ${filepath}: ${error.message}`);
            return null;
        }
    }

    extractFunctions(content) {
        const functions = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Funciones exportadas
            if (trimmed.startsWith('export function ') || trimmed.startsWith('export async function ')) {
                const match = trimmed.match(/export\s+(?:async\s+)?function\s+(\w+)/);
                if (match) {
                    functions.push({
                        name: match[1],
                        line: index + 1,
                        type: 'export',
                        async: trimmed.includes('async'),
                        content: trimmed
                    });
                }
            }
            
            // Funciones regulares
            if (trimmed.startsWith('function ') || trimmed.startsWith('async function ')) {
                const match = trimmed.match(/(?:async\s+)?function\s+(\w+)/);
                if (match) {
                    functions.push({
                        name: match[1],
                        line: index + 1,
                        type: 'regular',
                        async: trimmed.includes('async'),
                        content: trimmed
                    });
                }
            }
            
            // Arrow functions
            if (trimmed.includes('=>') && (trimmed.includes('const ') || trimmed.includes('let '))) {
                const match = trimmed.match(/(?:const|let)\s+(\w+)\s*=/);
                if (match) {
                    functions.push({
                        name: match[1],
                        line: index + 1,
                        type: 'arrow',
                        async: trimmed.includes('async'),
                        content: trimmed
                    });
                }
            }
        });
        
        return functions;
    }

    extractImports(content) {
        const imports = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('import ')) {
                imports.push({
                    line: index + 1,
                    content: trimmed,
                    from: trimmed.includes('from') ? trimmed.split('from')[1].trim() : null
                });
            }
        });
        
        return imports;
    }

    async analyzeFile(filepath) {
        this.log(`Analizando archivo: ${filepath}`);
        
        if (!fs.existsSync(filepath)) {
            this.log(`Archivo no encontrado: ${filepath}`);
            return null;
        }
        
        const content = fs.readFileSync(filepath, 'utf8');
        const stats = fs.statSync(filepath);
        
        const analysis = {
            path: filepath,
            size: content.length,
            lines: content.split('\n').length,
            hash: this.calculateFileHash(filepath),
            lastModified: stats.mtime,
            functions: this.extractFunctions(content),
            imports: this.extractImports(content),
            exports: content.match(/export\s+/g)?.length || 0
        };
        
        this.log(`Análisis completado: ${analysis.functions.length} funciones, ${analysis.imports.length} imports`);
        
        return analysis;
    }

    async analyzeDirectory(dirPath) {
        this.log(`Analizando directorio: ${dirPath}`);
        
        const files = [];
        
        if (!fs.existsSync(dirPath)) {
            this.log(`Directorio no encontrado: ${dirPath}`);
            return files;
        }
        
        const entries = fs.readdirSync(dirPath);
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile() && entry.endsWith('.js')) {
                const analysis = await this.analyzeFile(fullPath);
                if (analysis) {
                    files.push(analysis);
                }
            }
        }
        
        this.log(`Directorio analizado: ${files.length} archivos JavaScript`);
        
        return files;
    }

    findDuplicateFunctions(fileAnalyses) {
        this.log('Buscando funciones duplicadas...');
        
        const functionMap = new Map();
        const duplicates = [];
        
        // Mapear todas las funciones por nombre
        fileAnalyses.forEach(file => {
            file.functions.forEach(func => {
                if (!functionMap.has(func.name)) {
                    functionMap.set(func.name, []);
                }
                
                functionMap.get(func.name).push({
                    file: file.path,
                    function: func
                });
            });
        });
        
        // Identificar duplicados
        functionMap.forEach((occurrences, funcName) => {
            if (occurrences.length > 1) {
                duplicates.push({
                    functionName: funcName,
                    occurrences: occurrences,
                    count: occurrences.length
                });
            }
        });
        
        this.log(`Funciones duplicadas encontradas: ${duplicates.length}`);
        
        return duplicates;
    }

    compareWithMainFile(fileAnalyses) {
        this.log('Comparando con archivo principal...');
        
        const mainFile = './flashcard-app-final.js';
        const comparisons = [];
        
        if (!fs.existsSync(mainFile)) {
            this.log('Archivo principal no encontrado para comparación');
            return comparisons;
        }
        
        const mainContent = fs.readFileSync(mainFile, 'utf8');
        const mainFunctions = this.extractFunctions(mainContent);
        
        fileAnalyses.forEach(file => {
            const similarities = [];
            
            file.functions.forEach(func => {
                const mainFunc = mainFunctions.find(mf => mf.name === func.name);
                if (mainFunc) {
                    similarities.push({
                        functionName: func.name,
                        backupFile: file.path,
                        backupLine: func.line,
                        mainLine: mainFunc.line,
                        similarity: 'exact_name'
                    });
                }
            });
            
            if (similarities.length > 0) {
                comparisons.push({
                    file: file.path,
                    similarities: similarities,
                    similarityCount: similarities.length
                });
            }
        });
        
        this.log(`Comparaciones con archivo principal: ${comparisons.length} archivos con similitudes`);
        
        return comparisons;
    }

    generateRecommendations(duplicates, comparisons, fileAnalyses) {
        this.log('Generando recomendaciones...');
        
        const recommendations = [];
        
        // Recomendaciones basadas en duplicados
        duplicates.forEach(duplicate => {
            const backupOccurrences = duplicate.occurrences.filter(occ => 
                occ.file.includes('backup_js')
            );
            
            const mainOccurrences = duplicate.occurrences.filter(occ => 
                !occ.file.includes('backup_js')
            );
            
            if (backupOccurrences.length > 0 && mainOccurrences.length > 0) {
                recommendations.push({
                    type: 'ELIMINATE_BACKUP',
                    priority: 'HIGH',
                    functionName: duplicate.functionName,
                    action: 'Eliminar función duplicada en backup',
                    files: backupOccurrences.map(occ => occ.file),
                    reason: 'Función existe en archivo principal y backup'
                });
            } else if (backupOccurrences.length > 1) {
                recommendations.push({
                    type: 'CONSOLIDATE_BACKUP',
                    priority: 'MEDIUM',
                    functionName: duplicate.functionName,
                    action: 'Consolidar funciones duplicadas en backup',
                    files: backupOccurrences.map(occ => occ.file),
                    reason: 'Múltiples versiones en archivos de backup'
                });
            }
        });
        
        // Recomendaciones basadas en comparaciones con archivo principal
        comparisons.forEach(comparison => {
            if (comparison.file.includes('backup_js') && comparison.similarityCount > 3) {
                recommendations.push({
                    type: 'EVALUATE_BACKUP_FILE',
                    priority: 'HIGH',
                    action: 'Evaluar eliminación completa del archivo',
                    files: [comparison.file],
                    reason: `${comparison.similarityCount} funciones ya existen en archivo principal`,
                    details: comparison.similarities
                });
            }
        });
        
        // Recomendaciones para archivos pequeños en backup
        fileAnalyses.forEach(file => {
            if (file.path.includes('backup_js') && file.functions.length < 3 && file.size < 2000) {
                recommendations.push({
                    type: 'ELIMINATE_SMALL_BACKUP',
                    priority: 'LOW',
                    action: 'Considerar eliminación de archivo pequeño',
                    files: [file.path],
                    reason: 'Archivo pequeño con pocas funciones en backup',
                    details: {
                        functions: file.functions.length,
                        size: file.size
                    }
                });
            }
        });
        
        this.log(`Recomendaciones generadas: ${recommendations.length}`);
        
        return recommendations;
    }

    async generateReport(fileAnalyses, duplicates, comparisons, recommendations) {
        const report = {
            agent: this.agentId,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - this.startTime,
            scope: {
                assignedFiles: this.assignedFiles,
                assignedDirectories: this.assignedDirs,
                analyzedFiles: fileAnalyses.length
            },
            analysis: {
                files: fileAnalyses,
                duplicates: duplicates,
                comparisons: comparisons
            },
            recommendations: recommendations,
            summary: {
                totalFiles: fileAnalyses.length,
                totalFunctions: fileAnalyses.reduce((sum, file) => sum + file.functions.length, 0),
                duplicateFunctions: duplicates.length,
                highPriorityRecommendations: recommendations.filter(r => r.priority === 'HIGH').length,
                mediumPriorityRecommendations: recommendations.filter(r => r.priority === 'MEDIUM').length,
                lowPriorityRecommendations: recommendations.filter(r => r.priority === 'LOW').length
            }
        };
        
        fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
        this.log(`Reporte guardado: ${this.reportFile}`);
        
        return report;
    }

    async releaseLock() {
        try {
            if (fs.existsSync(this.lockFile)) {
                fs.unlinkSync(this.lockFile);
                this.log('Lock liberado');
            }
        } catch (error) {
            this.log(`Error liberando lock: ${error.message}`);
        }
    }

    async execute() {
        try {
            this.log('Iniciando análisis de servicios core...');
            
            // 1. Adquirir lock
            if (!await this.acquireLock()) {
                throw new Error('No se pudo adquirir el lock');
            }
            
            // 2. Analizar archivos asignados
            const fileAnalyses = [];
            
            for (const file of this.assignedFiles) {
                const analysis = await this.analyzeFile(file);
                if (analysis) {
                    fileAnalyses.push(analysis);
                }
            }
            
            // 3. Analizar directorios asignados
            for (const dir of this.assignedDirs) {
                const dirFiles = await this.analyzeDirectory(dir);
                fileAnalyses.push(...dirFiles);
            }
            
            // 4. Buscar duplicados
            const duplicates = this.findDuplicateFunctions(fileAnalyses);
            
            // 5. Comparar con archivo principal
            const comparisons = this.compareWithMainFile(fileAnalyses);
            
            // 6. Generar recomendaciones
            const recommendations = this.generateRecommendations(duplicates, comparisons, fileAnalyses);
            
            // 7. Generar reporte
            const report = await this.generateReport(fileAnalyses, duplicates, comparisons, recommendations);
            
            // 8. Mostrar resumen
            console.log('\n=== RESUMEN AGENTE 2 - SERVICIOS CORE ===');
            console.log(`Archivos analizados: ${report.summary.totalFiles}`);
            console.log(`Funciones totales: ${report.summary.totalFunctions}`);
            console.log(`Funciones duplicadas: ${report.summary.duplicateFunctions}`);
            console.log(`Recomendaciones ALTA: ${report.summary.highPriorityRecommendations}`);
            console.log(`Recomendaciones MEDIA: ${report.summary.mediumPriorityRecommendations}`);
            console.log(`Recomendaciones BAJA: ${report.summary.lowPriorityRecommendations}`);
            
            this.log('Análisis completado exitosamente');
            
        } catch (error) {
            this.log(`Error en análisis: ${error.message}`);
            throw error;
        } finally {
            await this.releaseLock();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const agent = new Agent2CoreServices();
    agent.execute().catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

module.exports = Agent2CoreServices;

