#!/usr/bin/env node
/**
 * AGENTE 1 - COORDINADOR PRINCIPAL
 * Script de coordinación general y análisis del archivo principal
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Agent1Coordinator {
    constructor() {
        this.agentId = 'AGENT-1';
        this.lockFile = '.agent-locks/general.lock';
        this.mainFile = './flashcard-app-final.js';
        this.reportFile = 'agent1_report.json';
        this.startTime = Date.now();
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${this.agentId}] ${timestamp}: ${message}`);
    }

    async acquireLock() {
        this.log('Adquiriendo lock general...');
        
        try {
            // Crear directorio de locks si no existe
            if (!fs.existsSync('.agent-locks')) {
                fs.mkdirSync('.agent-locks');
            }

            // Verificar si ya existe un lock
            if (fs.existsSync(this.lockFile)) {
                const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
                const lockAge = Date.now() - lockData.timestamp;
                
                if (lockAge < 300000) { // 5 minutos
                    throw new Error('Lock general ya existe y está activo');
                }
                
                this.log('Lock expirado encontrado, limpiando...');
                fs.unlinkSync(this.lockFile);
            }

            // Crear nuevo lock
            const lockData = {
                agentId: this.agentId,
                timestamp: Date.now(),
                operation: 'coordination',
                pid: process.pid
            };

            fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
            this.log('Lock general adquirido exitosamente');
            
            return true;
        } catch (error) {
            this.log(`Error adquiriendo lock: ${error.message}`);
            return false;
        }
    }

    async analyzeMainFile() {
        this.log('Analizando archivo principal...');
        
        if (!fs.existsSync(this.mainFile)) {
            throw new Error(`Archivo principal no encontrado: ${this.mainFile}`);
        }

        const content = fs.readFileSync(this.mainFile, 'utf8');
        const lines = content.split('\n');
        
        // Extraer funciones
        const functions = [];
        const imports = [];
        const exports = [];
        const classes = [];
        const variables = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Funciones
            if (trimmed.startsWith('function ') || trimmed.includes(' function ')) {
                const funcName = trimmed.match(/function\s+(\w+)/);
                if (funcName) {
                    functions.push({
                        name: funcName[1],
                        line: index + 1,
                        content: trimmed
                    });
                }
            }
            
            // Arrow functions
            if (trimmed.includes('=>') && (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var '))) {
                const varName = trimmed.split('=')[0].replace(/const|let|var/, '').trim();
                functions.push({
                    name: varName,
                    line: index + 1,
                    type: 'arrow',
                    content: trimmed
                });
            }
            
            // Imports (aunque el archivo principal probablemente no los tenga)
            if (trimmed.startsWith('import ')) {
                imports.push({
                    line: index + 1,
                    content: trimmed
                });
            }
            
            // Classes
            if (trimmed.startsWith('class ')) {
                const className = trimmed.match(/class\s+(\w+)/);
                if (className) {
                    classes.push({
                        name: className[1],
                        line: index + 1,
                        content: trimmed
                    });
                }
            }
            
            // Variables globales
            if ((trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) && 
                !trimmed.includes('=>') && !trimmed.includes('function')) {
                const varName = trimmed.split('=')[0].replace(/const|let|var/, '').trim();
                variables.push({
                    name: varName,
                    line: index + 1,
                    content: trimmed
                });
            }
        });

        const analysis = {
            file: this.mainFile,
            size: content.length,
            lines: lines.length,
            functions: functions,
            imports: imports,
            exports: exports,
            classes: classes,
            variables: variables,
            timestamp: new Date().toISOString()
        };

        this.log(`Análisis completado: ${functions.length} funciones, ${classes.length} clases, ${variables.length} variables`);
        
        return analysis;
    }

    async monitorOtherAgents() {
        this.log('Monitoreando otros agentes...');
        
        const lockDir = '.agent-locks';
        const agents = [];
        
        if (fs.existsSync(lockDir)) {
            const lockFiles = fs.readdirSync(lockDir);
            
            for (const lockFile of lockFiles) {
                if (lockFile !== 'general.lock') {
                    try {
                        const lockPath = path.join(lockDir, lockFile);
                        const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                        const lockAge = Date.now() - lockData.timestamp;
                        
                        agents.push({
                            file: lockFile,
                            agentId: lockData.agentId,
                            operation: lockData.operation,
                            age: lockAge,
                            active: lockAge < 300000 // 5 minutos
                        });
                    } catch (error) {
                        this.log(`Error leyendo lock ${lockFile}: ${error.message}`);
                    }
                }
            }
        }
        
        this.log(`Agentes activos encontrados: ${agents.filter(a => a.active).length}`);
        return agents;
    }

    async waitForOtherAgents() {
        this.log('Esperando a que otros agentes completen su trabajo...');
        
        const maxWaitTime = 30 * 60 * 1000; // 30 minutos
        const startWait = Date.now();
        
        while (Date.now() - startWait < maxWaitTime) {
            const agents = await this.monitorOtherAgents();
            const activeAgents = agents.filter(a => a.active && a.agentId !== this.agentId);
            
            if (activeAgents.length === 0) {
                this.log('Todos los agentes han completado su trabajo');
                return true;
            }
            
            this.log(`Esperando a ${activeAgents.length} agentes: ${activeAgents.map(a => a.agentId).join(', ')}`);
            
            // Esperar 30 segundos antes de verificar de nuevo
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
        this.log('Timeout esperando a otros agentes');
        return false;
    }

    async collectAgentReports() {
        this.log('Recopilando reportes de otros agentes...');
        
        const reports = [];
        const reportFiles = [
            'agent2_report.json',
            'agent3_report.json',
            'agent4_report.json',
            'agent5_report.json'
        ];
        
        for (const reportFile of reportFiles) {
            if (fs.existsSync(reportFile)) {
                try {
                    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
                    reports.push(report);
                    this.log(`Reporte recopilado: ${reportFile}`);
                } catch (error) {
                    this.log(`Error leyendo reporte ${reportFile}: ${error.message}`);
                }
            } else {
                this.log(`Reporte no encontrado: ${reportFile}`);
            }
        }
        
        return reports;
    }

    async generateFinalReport(mainAnalysis, agentReports) {
        this.log('Generando reporte final...');
        
        const duplicatesFound = [];
        const eliminationPlan = [];
        
        // Consolidar hallazgos de todos los agentes
        agentReports.forEach(report => {
            if (report.duplicates) {
                duplicatesFound.push(...report.duplicates);
            }
            if (report.recommendations) {
                eliminationPlan.push(...report.recommendations);
            }
        });
        
        const finalReport = {
            coordinator: this.agentId,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - this.startTime,
            mainFileAnalysis: mainAnalysis,
            agentReports: agentReports,
            duplicatesFound: duplicatesFound,
            eliminationPlan: eliminationPlan,
            summary: {
                totalDuplicates: duplicatesFound.length,
                highPriority: eliminationPlan.filter(p => p.priority === 'HIGH').length,
                mediumPriority: eliminationPlan.filter(p => p.priority === 'MEDIUM').length,
                lowPriority: eliminationPlan.filter(p => p.priority === 'LOW').length
            }
        };
        
        fs.writeFileSync('final_coordination_report.json', JSON.stringify(finalReport, null, 2));
        this.log('Reporte final generado: final_coordination_report.json');
        
        return finalReport;
    }

    async releaseLock() {
        this.log('Liberando lock general...');
        
        try {
            if (fs.existsSync(this.lockFile)) {
                fs.unlinkSync(this.lockFile);
                this.log('Lock general liberado');
            }
        } catch (error) {
            this.log(`Error liberando lock: ${error.message}`);
        }
    }

    async execute() {
        try {
            this.log('Iniciando coordinación general...');
            
            // 1. Adquirir lock general
            if (!await this.acquireLock()) {
                throw new Error('No se pudo adquirir el lock general');
            }
            
            // 2. Analizar archivo principal
            const mainAnalysis = await this.analyzeMainFile();
            
            // 3. Guardar análisis inicial
            fs.writeFileSync(this.reportFile, JSON.stringify({
                agent: this.agentId,
                phase: 'analysis',
                mainFileAnalysis: mainAnalysis,
                timestamp: new Date().toISOString()
            }, null, 2));
            
            // 4. Esperar a otros agentes
            await this.waitForOtherAgents();
            
            // 5. Recopilar reportes
            const agentReports = await this.collectAgentReports();
            
            // 6. Generar reporte final
            const finalReport = await this.generateFinalReport(mainAnalysis, agentReports);
            
            // 7. Mostrar resumen
            console.log('\n=== RESUMEN DE COORDINACIÓN ===');
            console.log(`Duplicados encontrados: ${finalReport.summary.totalDuplicates}`);
            console.log(`Prioridad ALTA: ${finalReport.summary.highPriority}`);
            console.log(`Prioridad MEDIA: ${finalReport.summary.mediumPriority}`);
            console.log(`Prioridad BAJA: ${finalReport.summary.lowPriority}`);
            console.log(`Tiempo de ejecución: ${Math.round(finalReport.executionTime / 1000)} segundos`);
            
            this.log('Coordinación completada exitosamente');
            
        } catch (error) {
            this.log(`Error en coordinación: ${error.message}`);
            throw error;
        } finally {
            await this.releaseLock();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const coordinator = new Agent1Coordinator();
    coordinator.execute().catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

module.exports = Agent1Coordinator;

