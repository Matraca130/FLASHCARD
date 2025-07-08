#!/usr/bin/env node
/**
 * COORDINADOR MAESTRO - EJECUCIÓN DE 5 AGENTES
 * Script principal para coordinar la ejecución simultánea de todos los agentes
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

class MasterCoordinator {
    constructor() {
        this.startTime = Date.now();
        this.agents = [
            {
                id: 'AGENT-1',
                name: 'Coordinador Principal',
                script: './scripts/agent1_coordinator.js',
                priority: 1,
                status: 'pending'
            },
            {
                id: 'AGENT-2',
                name: 'Servicios Core',
                script: './scripts/agent2_core_services.js',
                priority: 2,
                status: 'pending'
            },
            {
                id: 'AGENT-3',
                name: 'Gestión de Datos',
                script: './scripts/agent3_data_management.js',
                priority: 2,
                status: 'pending'
            },
            {
                id: 'AGENT-4',
                name: 'UI y Dashboard',
                script: './scripts/agent4_ui_dashboard.js',
                priority: 3,
                status: 'pending'
            },
            {
                id: 'AGENT-5',
                name: 'Utilidades y Testing',
                script: './scripts/agent5_utils_testing.js',
                priority: 3,
                status: 'pending'
            }
        ];
        
        this.processes = new Map();
        this.results = new Map();
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[MASTER] ${timestamp}: ${message}`);
    }

    async initializeEnvironment() {
        this.log('Inicializando entorno de coordinación...');
        
        // Crear directorio de locks
        if (!fs.existsSync('.agent-locks')) {
            fs.mkdirSync('.agent-locks');
            this.log('Directorio de locks creado');
        }
        
        // Limpiar locks existentes
        const lockFiles = fs.readdirSync('.agent-locks');
        for (const lockFile of lockFiles) {
            fs.unlinkSync(path.join('.agent-locks', lockFile));
        }
        this.log('Locks anteriores limpiados');
        
        // Crear directorio de scripts si no existe
        if (!fs.existsSync('scripts')) {
            fs.mkdirSync('scripts');
        }
        
        // Verificar que todos los scripts existen
        for (const agent of this.agents) {
            if (!fs.existsSync(agent.script)) {
                this.log(`ADVERTENCIA: Script no encontrado: ${agent.script}`);
                agent.status = 'missing';
            }
        }
        
        this.log('Entorno inicializado correctamente');
    }

    async startAgent(agent) {
        return new Promise((resolve, reject) => {
            this.log(`Iniciando ${agent.name} (${agent.id})...`);
            
            if (agent.status === 'missing') {
                this.log(`Saltando ${agent.id} - script no encontrado`);
                agent.status = 'skipped';
                resolve();
                return;
            }
            
            const process = spawn('node', [agent.script], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });
            
            this.processes.set(agent.id, process);
            agent.status = 'running';
            agent.startTime = Date.now();
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log(`[${agent.id}] ${output.trim()}`);
            });
            
            process.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error(`[${agent.id}] ERROR: ${output.trim()}`);
            });
            
            process.on('close', (code) => {
                agent.status = code === 0 ? 'completed' : 'failed';
                agent.endTime = Date.now();
                agent.executionTime = agent.endTime - agent.startTime;
                
                this.results.set(agent.id, {
                    code,
                    stdout,
                    stderr,
                    executionTime: agent.executionTime
                });
                
                this.log(`${agent.name} terminado con código: ${code} (${Math.round(agent.executionTime / 1000)}s)`);
                resolve();
            });
            
            process.on('error', (error) => {
                agent.status = 'error';
                this.log(`Error ejecutando ${agent.name}: ${error.message}`);
                reject(error);
            });
        });
    }

    async executeAgentsByPriority() {
        this.log('Ejecutando agentes por prioridad...');
        
        // Agrupar agentes por prioridad
        const priorityGroups = new Map();
        for (const agent of this.agents) {
            if (!priorityGroups.has(agent.priority)) {
                priorityGroups.set(agent.priority, []);
            }
            priorityGroups.get(agent.priority).push(agent);
        }
        
        // Ejecutar por grupos de prioridad
        const priorities = Array.from(priorityGroups.keys()).sort();
        
        for (const priority of priorities) {
            const agentsInPriority = priorityGroups.get(priority);
            this.log(`Ejecutando prioridad ${priority}: ${agentsInPriority.map(a => a.id).join(', ')}`);
            
            if (priority === 1) {
                // Prioridad 1: Ejecutar secuencialmente (solo Agente 1)
                for (const agent of agentsInPriority) {
                    await this.startAgent(agent);
                }
            } else {
                // Prioridades 2 y 3: Ejecutar en paralelo
                const promises = agentsInPriority.map(agent => this.startAgent(agent));
                await Promise.all(promises);
            }
            
            this.log(`Prioridad ${priority} completada`);
        }
    }

    async collectResults() {
        this.log('Recopilando resultados...');
        
        const reports = [];
        const reportFiles = [
            'agent1_report.json',
            'agent2_report.json',
            'agent3_report.json',
            'agent4_report.json',
            'agent5_report.json',
            'final_coordination_report.json'
        ];
        
        for (const reportFile of reportFiles) {
            if (fs.existsSync(reportFile)) {
                try {
                    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
                    reports.push({
                        file: reportFile,
                        data: report
                    });
                    this.log(`Reporte recopilado: ${reportFile}`);
                } catch (error) {
                    this.log(`Error leyendo ${reportFile}: ${error.message}`);
                }
            }
        }
        
        return reports;
    }

    async generateMasterReport() {
        this.log('Generando reporte maestro...');
        
        const reports = await this.collectResults();
        const totalExecutionTime = Date.now() - this.startTime;
        
        const masterReport = {
            coordinator: 'MASTER',
            timestamp: new Date().toISOString(),
            totalExecutionTime: totalExecutionTime,
            agents: this.agents.map(agent => ({
                id: agent.id,
                name: agent.name,
                status: agent.status,
                executionTime: agent.executionTime || 0,
                result: this.results.get(agent.id)
            })),
            reports: reports,
            summary: {
                totalAgents: this.agents.length,
                completed: this.agents.filter(a => a.status === 'completed').length,
                failed: this.agents.filter(a => a.status === 'failed').length,
                skipped: this.agents.filter(a => a.status === 'skipped').length,
                totalDuplicatesFound: this.calculateTotalDuplicates(reports),
                totalRecommendations: this.calculateTotalRecommendations(reports)
            }
        };
        
        fs.writeFileSync('master_coordination_report.json', JSON.stringify(masterReport, null, 2));
        this.log('Reporte maestro generado: master_coordination_report.json');
        
        return masterReport;
    }

    calculateTotalDuplicates(reports) {
        let total = 0;
        reports.forEach(report => {
            if (report.data.analysis && report.data.analysis.duplicates) {
                total += report.data.analysis.duplicates.length;
            }
        });
        return total;
    }

    calculateTotalRecommendations(reports) {
        let total = 0;
        reports.forEach(report => {
            if (report.data.recommendations) {
                total += report.data.recommendations.length;
            }
        });
        return total;
    }

    async cleanup() {
        this.log('Limpiando recursos...');
        
        // Terminar procesos que aún estén corriendo
        for (const [agentId, process] of this.processes) {
            if (!process.killed) {
                this.log(`Terminando proceso ${agentId}...`);
                process.kill('SIGTERM');
            }
        }
        
        // Limpiar locks
        if (fs.existsSync('.agent-locks')) {
            const lockFiles = fs.readdirSync('.agent-locks');
            for (const lockFile of lockFiles) {
                fs.unlinkSync(path.join('.agent-locks', lockFile));
            }
        }
        
        this.log('Limpieza completada');
    }

    async execute() {
        try {
            this.log('=== INICIANDO COORDINACIÓN MAESTRO DE 5 AGENTES ===');
            
            // 1. Inicializar entorno
            await this.initializeEnvironment();
            
            // 2. Ejecutar agentes por prioridad
            await this.executeAgentsByPriority();
            
            // 3. Generar reporte maestro
            const masterReport = await this.generateMasterReport();
            
            // 4. Mostrar resumen final
            console.log('\n=== RESUMEN FINAL DE COORDINACIÓN ===');
            console.log(`Tiempo total de ejecución: ${Math.round(masterReport.totalExecutionTime / 1000)} segundos`);
            console.log(`Agentes completados: ${masterReport.summary.completed}/${masterReport.summary.totalAgents}`);
            console.log(`Agentes fallidos: ${masterReport.summary.failed}`);
            console.log(`Agentes saltados: ${masterReport.summary.skipped}`);
            console.log(`Total de duplicados encontrados: ${masterReport.summary.totalDuplicatesFound}`);
            console.log(`Total de recomendaciones: ${masterReport.summary.totalRecommendations}`);
            
            if (masterReport.summary.failed > 0) {
                console.log('\n⚠️  ADVERTENCIA: Algunos agentes fallaron. Revisar logs para detalles.');
            } else {
                console.log('\n✅ COORDINACIÓN COMPLETADA EXITOSAMENTE');
            }
            
            this.log('Coordinación maestro completada');
            
        } catch (error) {
            this.log(`Error en coordinación maestro: ${error.message}`);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const master = new MasterCoordinator();
    master.execute().catch(error => {
        console.error('Error fatal en coordinación maestro:', error);
        process.exit(1);
    });
}

module.exports = MasterCoordinator;

