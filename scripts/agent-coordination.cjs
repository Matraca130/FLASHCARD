#!/usr/bin/env node

/**
 * Sistema de Coordinación entre Agentes de Manus
 * Previene conflictos cuando múltiples agentes trabajan simultáneamente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class AgentCoordinator {
    constructor() {
        this.lockDir = '.agent-locks';
        this.agentId = this.generateAgentId();
        this.lockTimeout = 300000; // 5 minutos
        this.heartbeatInterval = 30000; // 30 segundos
        this.maxRetries = 3;
        
        this.ensureLockDirectory();
        this.setupHeartbeat();
    }

    /**
     * Genera un ID único para el agente actual
     */
    generateAgentId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `agent-${timestamp}-${random}`;
    }

    /**
     * Asegura que el directorio de locks existe
     */
    ensureLockDirectory() {
        if (!fs.existsSync(this.lockDir)) {
            fs.mkdirSync(this.lockDir, { recursive: true });
        }
    }

    /**
     * Intenta adquirir un lock para trabajar en el repositorio
     */
    async acquireLock(operation = 'general') {
        const lockFile = path.join(this.lockDir, `${operation}.lock`);
        const lockData = {
            agentId: this.agentId,
            timestamp: Date.now(),
            operation: operation,
            pid: process.pid
        };

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                // Verificar si existe un lock válido
                if (fs.existsSync(lockFile)) {
                    const existingLock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
                    
                    // Verificar si el lock ha expirado
                    if (Date.now() - existingLock.timestamp < this.lockTimeout) {
                        console.log(`🔒 Lock ocupado por ${existingLock.agentId}. Esperando... (Intento ${attempt}/${this.maxRetries})`);
                        await this.sleep(5000 * attempt); // Backoff exponencial
                        continue;
                    } else {
                        console.log(`⏰ Lock expirado. Limpiando lock de ${existingLock.agentId}`);
                        fs.unlinkSync(lockFile);
                    }
                }

                // Crear el lock
                fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2));
                console.log(`✅ Lock adquirido: ${this.agentId} para operación '${operation}'`);
                return true;

            } catch (error) {
                console.error(`❌ Error adquiriendo lock (intento ${attempt}):`, error.message);
                if (attempt === this.maxRetries) {
                    throw new Error(`No se pudo adquirir lock después de ${this.maxRetries} intentos`);
                }
                await this.sleep(2000 * attempt);
            }
        }
        return false;
    }

    /**
     * Libera el lock actual
     */
    releaseLock(operation = 'general') {
        const lockFile = path.join(this.lockDir, `${operation}.lock`);
        
        try {
            if (fs.existsSync(lockFile)) {
                const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
                
                if (lockData.agentId === this.agentId) {
                    fs.unlinkSync(lockFile);
                    console.log(`🔓 Lock liberado: ${this.agentId} para operación '${operation}'`);
                } else {
                    console.warn(`⚠️ Intento de liberar lock de otro agente: ${lockData.agentId}`);
                }
            }
        } catch (error) {
            console.error('❌ Error liberando lock:', error.message);
        }
    }

    /**
     * Detecta si hay otros agentes trabajando actualmente
     */
    detectConcurrentAgents() {
        const activeAgents = [];
        
        try {
            const lockFiles = fs.readdirSync(this.lockDir).filter(f => f.endsWith('.lock'));
            
            for (const lockFile of lockFiles) {
                const lockPath = path.join(this.lockDir, lockFile);
                const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                
                // Verificar si el lock está activo
                if (Date.now() - lockData.timestamp < this.lockTimeout) {
                    activeAgents.push(lockData);
                }
            }
        } catch (error) {
            console.error('❌ Error detectando agentes concurrentes:', error.message);
        }

        return activeAgents;
    }

    /**
     * Crea una branch única para el agente actual
     */
    createAgentBranch() {
        const branchName = `agent-work/${this.agentId}`;
        
        try {
            // Verificar si ya existe la branch
            try {
                execSync(`git rev-parse --verify ${branchName}`, { stdio: 'ignore' });
                console.log(`🌿 Branch existente: ${branchName}`);
                execSync(`git checkout ${branchName}`);
            } catch {
                // La branch no existe, crearla
                execSync(`git checkout -b ${branchName}`);
                console.log(`🌿 Nueva branch creada: ${branchName}`);
            }
            
            return branchName;
        } catch (error) {
            console.error('❌ Error creando branch del agente:', error.message);
            throw error;
        }
    }

    /**
     * Realiza merge inteligente con main
     */
    async intelligentMerge() {
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        
        try {
            console.log('🔄 Iniciando merge inteligente...');
            
            // Actualizar main
            execSync('git fetch origin main');
            
            // Intentar merge automático
            execSync('git checkout main');
            execSync('git pull origin main');
            
            try {
                execSync(`git merge ${currentBranch} --no-ff -m "feat: Merge agent work from ${this.agentId}"`);
                console.log('✅ Merge exitoso sin conflictos');
                
                // Limpiar branch del agente
                execSync(`git branch -d ${currentBranch}`);
                
            } catch (mergeError) {
                console.log('⚠️ Conflictos detectados, resolviendo automáticamente...');
                
                // Intentar resolución automática
                await this.autoResolveConflicts();
                
                // Completar merge
                execSync(`git commit -m "fix: Auto-resolve conflicts from agent ${this.agentId}"`);
                console.log('✅ Conflictos resueltos automáticamente');
            }
            
        } catch (error) {
            console.error('❌ Error en merge inteligente:', error.message);
            
            // Rollback en caso de error crítico
            try {
                execSync('git merge --abort');
                execSync(`git checkout ${currentBranch}`);
            } catch (rollbackError) {
                console.error('❌ Error en rollback:', rollbackError.message);
            }
            
            throw error;
        }
    }

    /**
     * Resuelve conflictos automáticamente usando estrategias inteligentes
     */
    async autoResolveConflicts() {
        try {
            // Obtener archivos con conflictos
            const conflictFiles = execSync('git diff --name-only --diff-filter=U', { encoding: 'utf8' })
                .trim().split('\n').filter(f => f);

            console.log(`🔧 Resolviendo ${conflictFiles.length} archivos con conflictos...`);

            for (const file of conflictFiles) {
                await this.resolveFileConflict(file);
            }

            // Agregar archivos resueltos
            execSync('git add .');
            
        } catch (error) {
            console.error('❌ Error en resolución automática:', error.message);
            throw error;
        }
    }

    /**
     * Resuelve conflictos en un archivo específico
     */
    async resolveFileConflict(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Estrategias de resolución por tipo de archivo
            let resolvedContent;
            
            if (filePath.endsWith('.json')) {
                resolvedContent = this.resolveJsonConflict(content);
            } else if (filePath.endsWith('.js')) {
                resolvedContent = this.resolveJsConflict(content);
            } else if (filePath.endsWith('.css')) {
                resolvedContent = this.resolveCssConflict(content);
            } else {
                resolvedContent = this.resolveGenericConflict(content);
            }
            
            fs.writeFileSync(filePath, resolvedContent);
            console.log(`✅ Conflicto resuelto en: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ Error resolviendo conflicto en ${filePath}:`, error.message);
            throw error;
        }
    }

    /**
     * Resuelve conflictos en archivos JSON
     */
    resolveJsonConflict(content) {
        // Para JSON, preferir la versión más reciente (incoming)
        return content.replace(/<<<<<<< HEAD\n[\s\S]*?\n=======\n([\s\S]*?)\n>>>>>>> .*/g, '$1');
    }

    /**
     * Resuelve conflictos en archivos JavaScript
     */
    resolveJsConflict(content) {
        // Para JS, intentar combinar funciones y mantener imports
        let resolved = content;
        
        // Remover marcadores de conflicto manteniendo ambas versiones cuando sea posible
        resolved = resolved.replace(/<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*/g, (match, head, incoming) => {
            // Si son imports, combinar
            if (head.includes('import') && incoming.includes('import')) {
                const headImports = head.match(/import.*?;/g) || [];
                const incomingImports = incoming.match(/import.*?;/g) || [];
                const allImports = [...new Set([...headImports, ...incomingImports])];
                return allImports.join('\n');
            }
            
            // Para otros casos, preferir incoming
            return incoming;
        });
        
        return resolved;
    }

    /**
     * Resuelve conflictos en archivos CSS
     */
    resolveCssConflict(content) {
        // Para CSS, combinar reglas cuando sea posible
        return content.replace(/<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> .*/g, (match, head, incoming) => {
            // Combinar reglas CSS
            return head + '\n' + incoming;
        });
    }

    /**
     * Resuelve conflictos genéricos
     */
    resolveGenericConflict(content) {
        // Para archivos genéricos, preferir la versión incoming
        return content.replace(/<<<<<<< HEAD\n[\s\S]*?\n=======\n([\s\S]*?)\n>>>>>>> .*/g, '$1');
    }

    /**
     * Configura heartbeat para mantener el lock activo
     */
    setupHeartbeat() {
        setInterval(() => {
            this.updateHeartbeat();
        }, this.heartbeatInterval);
    }

    /**
     * Actualiza el heartbeat del agente
     */
    updateHeartbeat() {
        try {
            const lockFiles = fs.readdirSync(this.lockDir).filter(f => f.endsWith('.lock'));
            
            for (const lockFile of lockFiles) {
                const lockPath = path.join(this.lockDir, lockFile);
                const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                
                if (lockData.agentId === this.agentId) {
                    lockData.timestamp = Date.now();
                    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
                }
            }
        } catch (error) {
            // Silenciar errores de heartbeat para no interrumpir el trabajo
        }
    }

    /**
     * Limpia locks expirados
     */
    cleanupExpiredLocks() {
        try {
            const lockFiles = fs.readdirSync(this.lockDir).filter(f => f.endsWith('.lock'));
            
            for (const lockFile of lockFiles) {
                const lockPath = path.join(this.lockDir, lockFile);
                const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                
                if (Date.now() - lockData.timestamp > this.lockTimeout) {
                    fs.unlinkSync(lockPath);
                    console.log(`🧹 Lock expirado limpiado: ${lockData.agentId}`);
                }
            }
        } catch (error) {
            console.error('❌ Error limpiando locks expirados:', error.message);
        }
    }

    /**
     * Utilidad para sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Manejo de cierre graceful
     */
    setupGracefulShutdown() {
        const cleanup = () => {
            console.log('\n🛑 Cerrando agente, liberando locks...');
            this.cleanupAllLocks();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('exit', cleanup);
    }

    /**
     * Libera todos los locks del agente actual
     */
    cleanupAllLocks() {
        try {
            const lockFiles = fs.readdirSync(this.lockDir).filter(f => f.endsWith('.lock'));
            
            for (const lockFile of lockFiles) {
                const lockPath = path.join(this.lockDir, lockFile);
                const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                
                if (lockData.agentId === this.agentId) {
                    fs.unlinkSync(lockPath);
                    console.log(`🧹 Lock limpiado: ${lockFile}`);
                }
            }
        } catch (error) {
            console.error('❌ Error limpiando locks:', error.message);
        }
    }
}

// Exportar para uso como módulo
module.exports = AgentCoordinator;

// Ejecutar si se llama directamente
if (require.main === module) {
    const coordinator = new AgentCoordinator();
    coordinator.setupGracefulShutdown();
    
    console.log(`🤖 Coordinador de agentes iniciado: ${coordinator.agentId}`);
    console.log('🔍 Detectando agentes concurrentes...');
    
    const activeAgents = coordinator.detectConcurrentAgents();
    if (activeAgents.length > 0) {
        console.log(`⚠️ ${activeAgents.length} agentes activos detectados:`);
        activeAgents.forEach(agent => {
            console.log(`  - ${agent.agentId} (${agent.operation})`);
        });
    } else {
        console.log('✅ No hay otros agentes activos');
    }
}

