#!/usr/bin/env node

/**
 * Sistema de Workflow Automático para Agentes de Manus
 * Automatiza el proceso completo de trabajo colaborativo
 */

const AgentCoordinator = require('./agent-coordination.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoWorkflow {
    constructor() {
        this.coordinator = new AgentCoordinator();
        this.workflowSteps = [];
        this.currentStep = 0;
        this.rollbackPoints = [];
    }

    /**
     * Inicia el workflow automático completo
     */
    async start(operation = 'development') {
        console.log(`🚀 Iniciando workflow automático para: ${operation}`);
        
        try {
            // Paso 1: Limpiar locks expirados
            await this.step('cleanup', () => this.coordinator.cleanupExpiredLocks());
            
            // Paso 2: Detectar agentes concurrentes
            await this.step('detect', () => this.detectAndWaitForAgents());
            
            // Paso 3: Adquirir lock
            await this.step('lock', () => this.coordinator.acquireLock(operation));
            
            // Paso 4: Crear branch de trabajo
            await this.step('branch', () => this.coordinator.createAgentBranch());
            
            // Paso 5: Sincronizar con remoto
            await this.step('sync', () => this.syncWithRemote());
            
            // Paso 6: Preparar entorno de trabajo
            await this.step('prepare', () => this.prepareWorkEnvironment());
            
            console.log('✅ Workflow iniciado exitosamente');
            console.log(`🤖 Agente listo para trabajar: ${this.coordinator.agentId}`);
            
            return {
                agentId: this.coordinator.agentId,
                branch: execSync('git branch --show-current', { encoding: 'utf8' }).trim(),
                operation: operation
            };
            
        } catch (error) {
            console.error('❌ Error en workflow automático:', error.message);
            await this.rollback();
            throw error;
        }
    }

    /**
     * Finaliza el workflow y hace merge
     */
    async finish(commitMessage = null) {
        console.log('🏁 Finalizando workflow automático...');
        
        try {
            // Paso 1: Verificar cambios
            await this.step('verify', () => this.verifyChanges());
            
            // Paso 2: Commit cambios
            await this.step('commit', () => this.commitChanges(commitMessage));
            
            // Paso 3: Merge inteligente
            await this.step('merge', () => this.coordinator.intelligentMerge());
            
            // Paso 4: Push a remoto
            await this.step('push', () => this.pushToRemote());
            
            // Paso 5: Liberar lock
            await this.step('release', () => this.coordinator.releaseLock());
            
            // Paso 6: Limpiar
            await this.step('cleanup-final', () => this.finalCleanup());
            
            console.log('✅ Workflow finalizado exitosamente');
            
        } catch (error) {
            console.error('❌ Error finalizando workflow:', error.message);
            await this.rollback();
            throw error;
        }
    }

    /**
     * Ejecuta un paso del workflow con manejo de errores
     */
    async step(name, action) {
        console.log(`📋 Ejecutando paso: ${name}`);
        
        try {
            // Crear punto de rollback
            this.createRollbackPoint(name);
            
            // Ejecutar acción
            const result = await action();
            
            // Registrar paso exitoso
            this.workflowSteps.push({
                name,
                status: 'success',
                timestamp: Date.now(),
                result
            });
            
            console.log(`✅ Paso completado: ${name}`);
            return result;
            
        } catch (error) {
            // Registrar paso fallido
            this.workflowSteps.push({
                name,
                status: 'failed',
                timestamp: Date.now(),
                error: error.message
            });
            
            console.error(`❌ Paso fallido: ${name} - ${error.message}`);
            throw error;
        }
    }

    /**
     * Detecta agentes concurrentes y espera si es necesario
     */
    async detectAndWaitForAgents() {
        const activeAgents = this.coordinator.detectConcurrentAgents();
        
        if (activeAgents.length > 0) {
            console.log(`⏳ Esperando a ${activeAgents.length} agentes activos...`);
            
            // Esperar hasta que no haya agentes activos o timeout
            const maxWait = 300000; // 5 minutos
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWait) {
                const currentAgents = this.coordinator.detectConcurrentAgents();
                
                if (currentAgents.length === 0) {
                    console.log('✅ No hay agentes activos, continuando...');
                    break;
                }
                
                console.log(`⏳ Esperando... ${currentAgents.length} agentes aún activos`);
                await this.coordinator.sleep(10000); // Esperar 10 segundos
            }
            
            // Verificar timeout
            if (Date.now() - startTime >= maxWait) {
                throw new Error('Timeout esperando a otros agentes');
            }
        }
    }

    /**
     * Sincroniza con el repositorio remoto
     */
    async syncWithRemote() {
        try {
            console.log('🔄 Sincronizando con repositorio remoto...');
            
            // Fetch últimos cambios
            execSync('git fetch origin', { stdio: 'inherit' });
            
            // Verificar si main ha cambiado
            const localMain = execSync('git rev-parse main', { encoding: 'utf8' }).trim();
            const remoteMain = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
            
            if (localMain !== remoteMain) {
                console.log('📥 Actualizando main con cambios remotos...');
                execSync('git checkout main');
                execSync('git pull origin main');
                
                // Volver a la branch del agente
                const agentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
                if (!agentBranch.includes('agent-work')) {
                    const branchName = `agent-work/${this.coordinator.agentId}`;
                    execSync(`git checkout ${branchName}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error sincronizando con remoto:', error.message);
            throw error;
        }
    }

    /**
     * Prepara el entorno de trabajo
     */
    async prepareWorkEnvironment() {
        try {
            console.log('🛠️ Preparando entorno de trabajo...');
            
            // Verificar dependencias
            if (fs.existsSync('package.json')) {
                console.log('📦 Verificando dependencias npm...');
                try {
                    execSync('npm ci', { stdio: 'inherit' });
                } catch {
                    console.log('📦 Instalando dependencias...');
                    execSync('npm install', { stdio: 'inherit' });
                }
            }
            
            // Ejecutar linters y validaciones
            if (fs.existsSync('package.json')) {
                const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                
                if (packageJson.scripts && packageJson.scripts['validate:all-safety']) {
                    console.log('🔍 Ejecutando validaciones de seguridad...');
                    try {
                        execSync('npm run validate:all-safety', { stdio: 'inherit' });
                    } catch (error) {
                        console.warn('⚠️ Algunas validaciones fallaron, continuando...');
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error preparando entorno:', error.message);
            throw error;
        }
    }

    /**
     * Verifica que hay cambios para commitear
     */
    async verifyChanges() {
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            
            if (!status.trim()) {
                throw new Error('No hay cambios para commitear');
            }
            
            console.log(`📝 ${status.trim().split('\n').length} archivos modificados`);
            
        } catch (error) {
            if (error.message.includes('No hay cambios')) {
                throw error;
            }
            console.error('❌ Error verificando cambios:', error.message);
            throw error;
        }
    }

    /**
     * Hace commit de los cambios
     */
    async commitChanges(message = null) {
        try {
            // Agregar todos los cambios
            execSync('git add .');
            
            // Generar mensaje automático si no se proporciona
            if (!message) {
                const files = execSync('git diff --cached --name-only', { encoding: 'utf8' })
                    .trim().split('\n').filter(f => f);
                
                const fileTypes = [...new Set(files.map(f => path.extname(f)))];
                message = `feat: Agent ${this.coordinator.agentId} - Update ${fileTypes.join(', ')} files`;
            }
            
            // Commit
            execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
            console.log(`✅ Commit realizado: ${message}`);
            
        } catch (error) {
            console.error('❌ Error haciendo commit:', error.message);
            throw error;
        }
    }

    /**
     * Push cambios al repositorio remoto
     */
    async pushToRemote() {
        try {
            console.log('📤 Enviando cambios al repositorio remoto...');
            execSync('git push origin main', { stdio: 'inherit' });
            
        } catch (error) {
            console.error('❌ Error haciendo push:', error.message);
            throw error;
        }
    }

    /**
     * Limpieza final
     */
    async finalCleanup() {
        try {
            // Limpiar branches temporales
            const branches = execSync('git branch', { encoding: 'utf8' })
                .split('\n')
                .map(b => b.trim().replace('* ', ''))
                .filter(b => b.startsWith('agent-work/') && !b.includes(this.coordinator.agentId));
            
            for (const branch of branches) {
                try {
                    execSync(`git branch -D ${branch}`, { stdio: 'ignore' });
                    console.log(`🧹 Branch limpiada: ${branch}`);
                } catch {
                    // Ignorar errores de limpieza
                }
            }
            
            // Limpiar locks expirados
            this.coordinator.cleanupExpiredLocks();
            
        } catch (error) {
            console.warn('⚠️ Error en limpieza final:', error.message);
        }
    }

    /**
     * Crea un punto de rollback
     */
    createRollbackPoint(stepName) {
        try {
            const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
            
            this.rollbackPoints.push({
                step: stepName,
                branch: currentBranch,
                commit: currentCommit,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.warn('⚠️ No se pudo crear punto de rollback:', error.message);
        }
    }

    /**
     * Ejecuta rollback en caso de error
     */
    async rollback() {
        console.log('🔄 Ejecutando rollback...');
        
        try {
            // Liberar locks
            this.coordinator.cleanupAllLocks();
            
            // Volver al último punto estable
            if (this.rollbackPoints.length > 0) {
                const lastPoint = this.rollbackPoints[this.rollbackPoints.length - 1];
                
                try {
                    execSync(`git checkout ${lastPoint.branch}`);
                    execSync(`git reset --hard ${lastPoint.commit}`);
                    console.log(`✅ Rollback exitoso al paso: ${lastPoint.step}`);
                } catch (error) {
                    console.error('❌ Error en rollback:', error.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Error ejecutando rollback:', error.message);
        }
    }

    /**
     * Obtiene el estado actual del workflow
     */
    getStatus() {
        return {
            agentId: this.coordinator.agentId,
            currentStep: this.currentStep,
            totalSteps: this.workflowSteps.length,
            steps: this.workflowSteps,
            rollbackPoints: this.rollbackPoints.length
        };
    }
}

// Exportar para uso como módulo
module.exports = AutoWorkflow;

// Ejecutar si se llama directamente
if (require.main === module) {
    const workflow = new AutoWorkflow();
    
    // Manejar argumentos de línea de comandos
    const args = process.argv.slice(2);
    const command = args[0] || 'start';
    const operation = args[1] || 'development';
    
    async function main() {
        try {
            switch (command) {
                case 'start':
                    const result = await workflow.start(operation);
                    console.log('🎯 Resultado:', JSON.stringify(result, null, 2));
                    break;
                    
                case 'finish':
                    const message = args[1];
                    await workflow.finish(message);
                    break;
                    
                case 'status':
                    const status = workflow.getStatus();
                    console.log('📊 Estado:', JSON.stringify(status, null, 2));
                    break;
                    
                default:
                    console.log('❓ Comandos disponibles: start, finish, status');
            }
        } catch (error) {
            console.error('💥 Error:', error.message);
            process.exit(1);
        }
    }
    
    main();
}

