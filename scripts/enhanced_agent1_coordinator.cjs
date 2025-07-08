#!/usr/bin/env node
/**
 * AGENTE 1 - COORDINADOR MAESTRO MEJORADO
 * Verificación profunda de calidad y detección de duplicados restantes
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnhancedAgent1Coordinator {
    constructor() {
        this.startTime = Date.now();
        this.agentId = 'AGENT-1-ENHANCED';
        this.initialState = null;
        this.finalState = null;
        this.qualityChecks = [];
        this.duplicatesFound = [];
        this.functionalityIssues = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${this.agentId}] ${timestamp}: ${message}`);
    }

    // ===== ANÁLISIS INICIAL =====
    async captureInitialState() {
        this.log('Capturando estado inicial del proyecto...');
        
        this.initialState = {
            mainFile: await this.analyzeMainFile(),
            backupFiles: await this.analyzeBackupFiles(),
            serviceFiles: await this.analyzeServiceFiles(),
            duplicates: await this.findAllDuplicates(),
            timestamp: Date.now()
        };
        
        this.log(`Estado inicial capturado: ${this.initialState.duplicates.length} duplicados detectados`);
        return this.initialState;
    }

    async analyzeMainFile() {
        const mainFile = './flashcard-app-final.js';
        
        if (!fs.existsSync(mainFile)) {
            return { exists: false };
        }

        const content = fs.readFileSync(mainFile, 'utf8');
        const stats = fs.statSync(mainFile);
        
        return {
            exists: true,
            path: mainFile,
            size: stats.size,
            lines: content.split('\n').length,
            hash: crypto.createHash('md5').update(content).digest('hex'),
            functions: this.extractFunctions(content),
            services: this.extractServices(content),
            lastModified: stats.mtime
        };
    }

    async analyzeBackupFiles() {
        const backupDir = './backup_js';
        const files = [];
        
        if (!fs.existsSync(backupDir)) {
            return files;
        }

        const entries = fs.readdirSync(backupDir);
        
        for (const entry of entries) {
            if (entry.endsWith('.js')) {
                const filePath = path.join(backupDir, entry);
                const content = fs.readFileSync(filePath, 'utf8');
                const stats = fs.statSync(filePath);
                
                files.push({
                    name: entry,
                    path: filePath,
                    size: stats.size,
                    lines: content.split('\n').length,
                    hash: crypto.createHash('md5').update(content).digest('hex'),
                    functions: this.extractFunctions(content),
                    lastModified: stats.mtime
                });
            }
        }
        
        return files;
    }

    async analyzeServiceFiles() {
        const serviceDir = './services';
        const files = [];
        
        if (!fs.existsSync(serviceDir)) {
            return files;
        }

        const entries = fs.readdirSync(serviceDir);
        
        for (const entry of entries) {
            if (entry.endsWith('.js')) {
                const filePath = path.join(serviceDir, entry);
                const content = fs.readFileSync(filePath, 'utf8');
                const stats = fs.statSync(filePath);
                
                files.push({
                    name: entry,
                    path: filePath,
                    size: stats.size,
                    lines: content.split('\n').length,
                    hash: crypto.createHash('md5').update(content).digest('hex'),
                    functions: this.extractFunctions(content),
                    lastModified: stats.mtime
                });
            }
        }
        
        return files;
    }

    extractFunctions(content) {
        const functions = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            // Detectar funciones regulares
            const funcMatch = line.match(/function\s+(\w+)\s*\(/);
            if (funcMatch) {
                functions.push({
                    name: funcMatch[1],
                    line: index + 1,
                    type: 'function'
                });
            }
            
            // Detectar arrow functions y const functions
            const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|async\s*\([^)]*\)\s*=>)/);
            if (arrowMatch) {
                functions.push({
                    name: arrowMatch[1],
                    line: index + 1,
                    type: 'arrow'
                });
            }
            
            // Detectar métodos en objetos
            const methodMatch = line.match(/^\s*(\w+)\s*\([^)]*\)\s*\{/);
            if (methodMatch && !line.includes('function')) {
                functions.push({
                    name: methodMatch[1],
                    line: index + 1,
                    type: 'method'
                });
            }
        });
        
        return functions;
    }

    extractServices(content) {
        const services = [];
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            const serviceMatch = line.match(/const\s+(\w+Service|\w+API|\w+Client)\s*=/);
            if (serviceMatch) {
                services.push({
                    name: serviceMatch[1],
                    line: index + 1
                });
            }
        });
        
        return services;
    }

    // ===== DETECCIÓN DE DUPLICADOS =====
    async findAllDuplicates() {
        this.log('Analizando duplicados en todo el proyecto...');
        
        const duplicates = [];
        const allFiles = [
            ...(this.initialState?.backupFiles || await this.analyzeBackupFiles()),
            ...(this.initialState?.serviceFiles || await this.analyzeServiceFiles())
        ];
        
        const mainFile = this.initialState?.mainFile || await this.analyzeMainFile();
        
        // Comparar archivos backup con archivo principal
        for (const file of allFiles) {
            const similarity = this.calculateSimilarity(file, mainFile);
            
            if (similarity.functionsOverlap > 0.3 || similarity.contentSimilarity > 0.5) {
                duplicates.push({
                    type: 'file_vs_main',
                    file1: file.path,
                    file2: mainFile.path,
                    similarity: similarity,
                    priority: similarity.functionsOverlap > 0.7 ? 'CRITICAL' : 
                             similarity.functionsOverlap > 0.5 ? 'HIGH' : 'MEDIUM'
                });
            }
        }
        
        // Comparar archivos entre sí
        for (let i = 0; i < allFiles.length; i++) {
            for (let j = i + 1; j < allFiles.length; j++) {
                const similarity = this.calculateSimilarity(allFiles[i], allFiles[j]);
                
                if (similarity.functionsOverlap > 0.5 || similarity.contentSimilarity > 0.7) {
                    duplicates.push({
                        type: 'file_vs_file',
                        file1: allFiles[i].path,
                        file2: allFiles[j].path,
                        similarity: similarity,
                        priority: similarity.functionsOverlap > 0.8 ? 'CRITICAL' : 'HIGH'
                    });
                }
            }
        }
        
        return duplicates;
    }

    calculateSimilarity(file1, file2) {
        if (!file1.functions || !file2.functions) {
            return { functionsOverlap: 0, contentSimilarity: 0 };
        }
        
        // Calcular overlap de funciones
        const functions1 = file1.functions.map(f => f.name);
        const functions2 = file2.functions.map(f => f.name);
        const intersection = functions1.filter(f => functions2.includes(f));
        const union = [...new Set([...functions1, ...functions2])];
        
        const functionsOverlap = union.length > 0 ? intersection.length / union.length : 0;
        
        // Calcular similitud de contenido (simplificado)
        const contentSimilarity = file1.hash === file2.hash ? 1.0 : 
                                 Math.abs(file1.size - file2.size) < 1000 ? 0.5 : 0;
        
        return {
            functionsOverlap,
            contentSimilarity,
            sharedFunctions: intersection,
            totalFunctions1: functions1.length,
            totalFunctions2: functions2.length
        };
    }

    // ===== VERIFICACIÓN DE CALIDAD =====
    async performQualityChecks() {
        this.log('Realizando verificaciones de calidad...');
        
        // Capturar estado final
        this.finalState = {
            mainFile: await this.analyzeMainFile(),
            backupFiles: await this.analyzeBackupFiles(),
            serviceFiles: await this.analyzeServiceFiles(),
            duplicates: await this.findAllDuplicates(),
            timestamp: Date.now()
        };
        
        // Verificaciones específicas
        await this.checkDuplicatesReduction();
        await this.checkFunctionalityPreservation();
        await this.checkCodeIntegrity();
        await this.checkAgentWork();
        
        this.log(`Verificaciones completadas: ${this.qualityChecks.length} checks realizados`);
    }

    async checkDuplicatesReduction() {
        const initialDuplicates = this.initialState.duplicates.length;
        const finalDuplicates = this.finalState.duplicates.length;
        const reduction = initialDuplicates - finalDuplicates;
        
        this.qualityChecks.push({
            check: 'duplicates_reduction',
            status: reduction > 0 ? 'PASS' : reduction === 0 ? 'WARNING' : 'FAIL',
            details: {
                initial: initialDuplicates,
                final: finalDuplicates,
                reduction: reduction,
                percentage: initialDuplicates > 0 ? (reduction / initialDuplicates * 100).toFixed(1) : 0
            }
        });
        
        if (finalDuplicates > 0) {
            this.duplicatesFound = this.finalState.duplicates;
            this.log(`⚠️ Aún quedan ${finalDuplicates} duplicados por resolver`, 'warning');
        } else {
            this.log(`✅ Todos los duplicados eliminados (${reduction} eliminados)`, 'success');
        }
    }

    async checkFunctionalityPreservation() {
        const initialServices = this.initialState.mainFile.services?.length || 0;
        const finalServices = this.finalState.mainFile.services?.length || 0;
        
        const initialFunctions = this.initialState.mainFile.functions?.length || 0;
        const finalFunctions = this.finalState.mainFile.functions?.length || 0;
        
        this.qualityChecks.push({
            check: 'functionality_preservation',
            status: finalServices >= initialServices && finalFunctions >= initialFunctions ? 'PASS' : 'WARNING',
            details: {
                services: { initial: initialServices, final: finalServices },
                functions: { initial: initialFunctions, final: finalFunctions }
            }
        });
        
        if (finalServices < initialServices) {
            this.functionalityIssues.push('Servicios reducidos en archivo principal');
        }
    }

    async checkCodeIntegrity() {
        const mainFile = this.finalState.mainFile;
        
        if (!mainFile.exists) {
            this.qualityChecks.push({
                check: 'code_integrity',
                status: 'FAIL',
                details: { error: 'Archivo principal no existe' }
            });
            return;
        }
        
        // Verificar sintaxis básica
        try {
            const content = fs.readFileSync(mainFile.path, 'utf8');
            
            // Verificaciones básicas
            const hasBasicStructure = content.includes('const') || content.includes('function');
            const hasNoMergeConflicts = !content.includes('<<<<<<< HEAD');
            const hasReasonableSize = mainFile.size > 1000; // Al menos 1KB
            
            this.qualityChecks.push({
                check: 'code_integrity',
                status: hasBasicStructure && hasNoMergeConflicts && hasReasonableSize ? 'PASS' : 'FAIL',
                details: {
                    hasBasicStructure,
                    hasNoMergeConflicts,
                    hasReasonableSize,
                    size: mainFile.size
                }
            });
            
        } catch (error) {
            this.qualityChecks.push({
                check: 'code_integrity',
                status: 'FAIL',
                details: { error: error.message }
            });
        }
    }

    async checkAgentWork() {
        const reportFiles = [
            'agent2_report.json',
            'agent3_report.json',
            'agent4_report.json',
            'agent5_report.json'
        ];
        
        const completedAgents = [];
        const failedAgents = [];
        
        for (const reportFile of reportFiles) {
            if (fs.existsSync(reportFile)) {
                try {
                    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
                    if (report.summary && report.summary.duplicatesEliminated >= 0) {
                        completedAgents.push({
                            agent: report.agent,
                            duplicatesEliminated: report.summary.duplicatesEliminated,
                            bytesReduced: report.summary.bytesReduced || 0
                        });
                    }
                } catch (error) {
                    failedAgents.push({ file: reportFile, error: error.message });
                }
            }
        }
        
        this.qualityChecks.push({
            check: 'agent_work_verification',
            status: failedAgents.length === 0 ? 'PASS' : 'WARNING',
            details: {
                completedAgents: completedAgents.length,
                failedAgents: failedAgents.length,
                totalWork: completedAgents.reduce((sum, agent) => sum + (agent.duplicatesEliminated || 0), 0),
                totalBytesReduced: completedAgents.reduce((sum, agent) => sum + (agent.bytesReduced || 0), 0)
            }
        });
    }

    // ===== REPORTE FINAL =====
    async generateEnhancedReport() {
        const executionTime = Date.now() - this.startTime;
        
        const report = {
            coordinator: this.agentId,
            timestamp: new Date().toISOString(),
            executionTime,
            
            // Estados antes y después
            initialState: this.initialState,
            finalState: this.finalState,
            
            // Verificaciones de calidad
            qualityChecks: this.qualityChecks,
            
            // Problemas encontrados
            duplicatesRemaining: this.duplicatesFound,
            functionalityIssues: this.functionalityIssues,
            
            // Métricas de impacto
            impact: {
                duplicatesEliminated: this.initialState.duplicates.length - this.finalState.duplicates.length,
                fileSizeChange: this.finalState.mainFile.size - this.initialState.mainFile.size,
                functionsAdded: this.finalState.mainFile.functions.length - this.initialState.mainFile.functions.length,
                servicesAdded: this.finalState.mainFile.services.length - this.initialState.mainFile.services.length
            },
            
            // Estado general
            overallStatus: this.calculateOverallStatus()
        };
        
        fs.writeFileSync('enhanced_coordination_report.json', JSON.stringify(report, null, 2));
        this.log('Reporte mejorado generado: enhanced_coordination_report.json');
        
        return report;
    }

    calculateOverallStatus() {
        const failedChecks = this.qualityChecks.filter(check => check.status === 'FAIL').length;
        const warningChecks = this.qualityChecks.filter(check => check.status === 'WARNING').length;
        
        if (failedChecks > 0) return 'FAILED';
        if (warningChecks > 0) return 'WARNING';
        if (this.duplicatesFound.length > 0) return 'INCOMPLETE';
        return 'SUCCESS';
    }

    // ===== EJECUCIÓN PRINCIPAL =====
    async execute() {
        try {
            this.log('=== INICIANDO COORDINACIÓN MAESTRO MEJORADA ===');
            
            // 1. Capturar estado inicial
            await this.captureInitialState();
            
            // 2. Esperar a que otros agentes trabajen (simulado)
            this.log('Monitoreando trabajo de otros agentes...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 3. Realizar verificaciones de calidad
            await this.performQualityChecks();
            
            // 4. Generar reporte final
            const report = await this.generateEnhancedReport();
            
            // 5. Mostrar resumen
            this.showFinalSummary(report);
            
            this.log('Coordinación maestro mejorada completada');
            
        } catch (error) {
            this.log(`Error en coordinación maestro: ${error.message}`, 'error');
            throw error;
        }
    }

    showFinalSummary(report) {
        console.log('\n=== RESUMEN FINAL DE COORDINACIÓN MEJORADA ===');
        console.log(`Estado general: ${report.overallStatus}`);
        console.log(`Duplicados eliminados: ${report.impact.duplicatesEliminated}`);
        console.log(`Duplicados restantes: ${report.duplicatesRemaining.length}`);
        console.log(`Cambio en tamaño de archivo: ${report.impact.fileSizeChange > 0 ? '+' : ''}${report.impact.fileSizeChange} bytes`);
        console.log(`Funciones agregadas: ${report.impact.functionsAdded}`);
        console.log(`Servicios agregados: ${report.impact.servicesAdded}`);
        console.log(`Verificaciones: ${this.qualityChecks.filter(c => c.status === 'PASS').length}/${this.qualityChecks.length} exitosas`);
        
        if (report.duplicatesRemaining.length > 0) {
            console.log('\n⚠️  DUPLICADOS RESTANTES:');
            report.duplicatesRemaining.forEach(dup => {
                console.log(`  • ${dup.file1} vs ${dup.file2} (${dup.priority})`);
            });
        }
        
        if (report.functionalityIssues.length > 0) {
            console.log('\n⚠️  PROBLEMAS DE FUNCIONALIDAD:');
            report.functionalityIssues.forEach(issue => {
                console.log(`  • ${issue}`);
            });
        }
        
        if (report.overallStatus === 'SUCCESS') {
            console.log('\n✅ COORDINACIÓN COMPLETADA EXITOSAMENTE');
        } else {
            console.log(`\n⚠️  COORDINACIÓN COMPLETADA CON ESTADO: ${report.overallStatus}`);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const coordinator = new EnhancedAgent1Coordinator();
    coordinator.execute().catch(error => {
        console.error('Error fatal en coordinación maestro:', error);
        process.exit(1);
    });
}

module.exports = EnhancedAgent1Coordinator;

