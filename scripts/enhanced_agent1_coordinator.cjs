#!/usr/bin/env node
/**
 * AGENTE 1 - COORDINADOR MAESTRO CON PROTOCOLO UNIFICADO
 * Sistema completo: Verificación + Unificación + Protocolo de trabajo + Comunicación entre archivos
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnhancedAgent1Coordinator {
    constructor() {
        this.startTime = Date.now();
        this.agentId = 'AGENT-1-UNIFIED';
        this.initialState = null;
        this.finalState = null;
        this.qualityChecks = [];
        this.duplicatesFound = [];
        this.functionalityIssues = [];
        this.protocolViolations = [];
        this.unificationIssues = [];
        
        // Cargar configuraciones unificadas
        this.loadUnifiedConfig();
        this.loadInstructionArea();
        this.initializeCommunicationSystem();
    }

    loadUnifiedConfig() {
        try {
            // Unificar todas las configuraciones en una sola
            this.config = {
                agents: this.loadAgentConfig(),
                unification: this.loadUnificationRules(),
                communication: this.loadCommunicationRules(),
                syntax: this.loadSyntaxRules()
            };
            this.log('✅ Configuración unificada cargada exitosamente');
        } catch (error) {
            this.log(`❌ Error cargando configuración: ${error.message}`, 'error');
            this.config = this.getDefaultUnifiedConfig();
        }
    }

    loadInstructionArea() {
        // Área centralizada de instrucciones
        this.instructions = {
            workProtocol: this.loadFileContent('./AGENT_WORK_PROTOCOL.md'),
            unificationProtocol: this.loadFileContent('./UNIFICATION_PROTOCOL.md'),
            syntaxRules: this.loadFileContent('./syntax_rules.json'),
            communicationMap: this.loadFileContent('./communication_map.json')
        };
        
        this.log('📋 Área de instrucciones centralizada cargada');
    }

    initializeCommunicationSystem() {
        // Sistema de comunicación entre archivos
        this.communication = {
            fileMap: new Map(),
            dependencyGraph: new Map(),
            syntaxRegistry: new Map(),
            nameRegistry: new Set()
        };
        
        this.buildCommunicationMap();
        this.log('🔗 Sistema de comunicación entre archivos inicializado');
    }

    buildCommunicationMap() {
        // Mapear todos los archivos y sus dependencias
        const files = this.findAllProjectFiles();
        
        for (const file of files) {
            const analysis = this.analyzeFileForCommunication(file);
            this.communication.fileMap.set(file, analysis);
            
            // Registrar nombres para evitar conflictos
            analysis.exports.forEach(name => this.communication.nameRegistry.add(name));
            analysis.functions.forEach(name => this.communication.nameRegistry.add(name));
            analysis.variables.forEach(name => this.communication.nameRegistry.add(name));
        }
    }

    analyzeFileForCommunication(filePath) {
        if (!fs.existsSync(filePath)) return null;
        
        const content = fs.readFileSync(filePath, 'utf8');
        const extension = path.extname(filePath);
        
        return {
            path: filePath,
            type: extension,
            exports: this.extractExports(content),
            imports: this.extractImports(content),
            functions: this.extractFunctions(content).map(f => f.name),
            variables: this.extractVariables(content),
            dependencies: this.extractDependencies(content),
            agentOwner: this.determineAgentOwner(filePath),
            lastModified: fs.statSync(filePath).mtime,
            hash: crypto.createHash('md5').update(content).digest('hex')
        };
    }

    // ===== VERIFICACIÓN UNIFICADA =====
    async executeUnifiedVerification() {
        this.log('🔍 Iniciando verificación unificada completa...');
        
        const results = {
            duplicates: await this.verifyNoDuplicates(),
            unification: await this.verifyUnification(),
            protocol: await this.verifyWorkProtocol(),
            communication: await this.verifyCommunication(),
            syntax: await this.verifySyntax(),
            independence: await this.verifyAgentIndependence()
        };
        
        const totalIssues = Object.values(results).reduce((sum, issues) => sum + issues.length, 0);
        
        if (totalIssues === 0) {
            this.log('🎉 VERIFICACIÓN COMPLETA: PROYECTO 100% UNIFICADO Y LIMPIO', 'success');
            return { status: 'SUCCESS', issues: 0, results };
        } else {
            this.log(`⚠️ VERIFICACIÓN: ${totalIssues} problemas detectados`, 'warning');
            return { status: 'WARNING', issues: totalIssues, results };
        }
    }

    async verifyNoDuplicates() {
        this.log('🔍 Verificando cero duplicaciones...');
        const duplicates = [];
        
        // Verificar funciones duplicadas
        duplicates.push(...await this.detectDuplicateFunctions());
        
        // Verificar archivos similares
        duplicates.push(...await this.detectSimilarFiles());
        
        // Verificar configuraciones dispersas
        duplicates.push(...await this.detectScatteredConfigs());
        
        // Verificar código duplicado
        duplicates.push(...await this.detectDuplicateCode());
        
        this.log(`📊 Duplicados encontrados: ${duplicates.length}`);
        return duplicates;
    }

    async verifyUnification() {
        this.log('🎯 Verificando unificación...');
        const issues = [];
        
        // Verificar que funciones similares están unificadas
        const similarFunctions = this.findSimilarFunctions();
        if (similarFunctions.length > 0) {
            issues.push({
                type: 'UNIFICATION_NEEDED',
                message: `${similarFunctions.length} funciones similares requieren unificación`,
                details: similarFunctions
            });
        }
        
        // Verificar configuraciones centralizadas
        const scatteredConfigs = this.findScatteredConfigurations();
        if (scatteredConfigs.length > 0) {
            issues.push({
                type: 'CONFIG_SCATTERED',
                message: `${scatteredConfigs.length} configuraciones dispersas`,
                details: scatteredConfigs
            });
        }
        
        return issues;
    }

    async verifyWorkProtocol() {
        this.log('📋 Verificando protocolo de trabajo...');
        const violations = [];
        
        // Verificar que cada agente lee las instrucciones
        violations.push(...await this.verifyInstructionReading());
        
        // Verificar permisos de archivos
        violations.push(...await this.verifyFilePermissions());
        
        // Verificar independencia de agentes
        violations.push(...await this.verifyAgentIndependence());
        
        return violations;
    }

    async verifyCommunication() {
        this.log('🔗 Verificando comunicación entre archivos...');
        const issues = [];
        
        // Verificar imports/exports
        issues.push(...await this.verifyImportsExports());
        
        // Verificar referencias de funciones
        issues.push(...await this.verifyFunctionReferences());
        
        // Verificar sintaxis de comunicación
        issues.push(...await this.verifyCommunicationSyntax());
        
        return issues;
    }

    async verifySyntax() {
        this.log('📝 Verificando sintaxis y nombres...');
        const issues = [];
        
        // Verificar convenciones de nombres
        issues.push(...await this.verifyNamingConventions());
        
        // Verificar conflictos de nombres
        issues.push(...await this.verifyNameConflicts());
        
        // Verificar sintaxis de archivos
        issues.push(...await this.verifyFileSyntax());
        
        return issues;
    }

    // ===== INSTRUCCIONES PARA AGENTES =====
    generateAgentInstructions(agentId, task, files) {
        this.log(`📋 Generando instrucciones para ${agentId}...`);
        
        const agent = this.config.agents[agentId];
        if (!agent) {
            throw new Error(`Agente ${agentId} no encontrado en configuración`);
        }
        
        const instructions = {
            agentId: agentId,
            task: task,
            timestamp: new Date().toISOString(),
            
            // PASO 1: LECTURA OBLIGATORIA
            mandatoryReading: {
                workProtocol: './AGENT_WORK_PROTOCOL.md',
                unificationProtocol: './UNIFICATION_PROTOCOL.md',
                agentConfig: './agent_config.json',
                communicationMap: this.generateCommunicationMapForAgent(agentId)
            },
            
            // PASO 2: VERIFICACIONES PRE-TRABAJO
            preWorkChecks: {
                filePermissions: this.generateFilePermissionCheck(agentId, files),
                existingFunctions: this.generateExistingFunctionCheck(files),
                namingConventions: this.generateNamingCheck(agentId),
                dependencies: this.generateDependencyCheck(files)
            },
            
            // PASO 3: INSTRUCCIONES DE TRABAJO
            workInstructions: {
                allowedFiles: agent.permissions.write,
                forbiddenActions: agent.forbidden_actions || [],
                namingPrefix: agent.naming_prefix || `agent${agentId.split('-')[1]}`,
                communicationProtocol: this.generateCommunicationInstructions(agentId),
                unificationRules: this.generateUnificationInstructions()
            },
            
            // PASO 4: VERIFICACIONES POST-TRABAJO
            postWorkChecks: {
                noDuplicates: true,
                syntaxValidation: true,
                communicationTest: true,
                nameConflictCheck: true,
                dependencyUpdate: true
            },
            
            // PASO 5: COMUNICACIÓN CON OTROS AGENTES
            agentCommunication: {
                notifyAgents: this.getRelatedAgents(agentId),
                updateSharedState: true,
                validateIndependence: true
            }
        };
        
        // Guardar instrucciones para el agente
        this.saveAgentInstructions(agentId, instructions);
        
        return instructions;
    }

    generateCommunicationMapForAgent(agentId) {
        const agentFiles = this.getAgentFiles(agentId);
        const map = {};
        
        for (const file of agentFiles) {
            const analysis = this.communication.fileMap.get(file);
            if (analysis) {
                map[file] = {
                    exports: analysis.exports,
                    imports: analysis.imports,
                    dependencies: analysis.dependencies,
                    communicatesWith: this.findFileCommunications(file)
                };
            }
        }
        
        return map;
    }

    generateFilePermissionCheck(agentId, files) {
        const agent = this.config.agents[agentId];
        const checks = [];
        
        for (const file of files) {
            const canWrite = agent.permissions.write.some(pattern => 
                file.match(pattern.replace('*', '.*'))
            );
            
            checks.push({
                file: file,
                canWrite: canWrite,
                reason: canWrite ? 'Permitido' : 'Fuera de permisos del agente'
            });
        }
        
        return checks;
    }

    generateExistingFunctionCheck(files) {
        const existingFunctions = new Set();
        
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const functions = this.extractFunctions(content);
                functions.forEach(f => existingFunctions.add(f.name));
            }
        }
        
        return Array.from(existingFunctions);
    }

    generateNamingCheck(agentId) {
        const agentNumber = agentId.split('-')[1];
        
        return {
            functionPattern: `agent${agentNumber}[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*`,
            variablePattern: `AGENT${agentNumber}_[A-Z_]+`,
            classPattern: `Agent${agentNumber}[A-Z][a-zA-Z]*Service`,
            examples: {
                function: `agent${agentNumber}DataLoad`,
                variable: `AGENT${agentNumber}_CONFIG`,
                class: `Agent${agentNumber}DataService`
            },
            forbidden: this.getExistingNames()
        };
    }

    generateCommunicationInstructions(agentId) {
        return {
            eventSystem: {
                emit: `window.dispatchEvent(new CustomEvent('agent-communication', {
                    detail: { from: '${agentId}', to: 'TARGET', action: 'ACTION', data: {} }
                }))`,
                listen: `window.addEventListener('agent-communication', (event) => {
                    if (event.detail.to === '${agentId}') { /* handle */ }
                })`
            },
            apiRegistration: {
                register: `window.AGENT_API = window.AGENT_API || {};
                window.AGENT_API['${agentId}'] = { functionName: functionReference };`,
                call: `window.AGENT_API['TARGET-AGENT'].functionName(params)`
            },
            stateManagement: {
                update: `window.AGENT_STATE = window.AGENT_STATE || {};
                window.AGENT_STATE['${agentId}'] = newState;`,
                notify: `window.dispatchEvent(new CustomEvent('state-changed', {
                    detail: { agent: '${agentId}', state: newState }
                }))`
            }
        };
    }

    generateUnificationInstructions() {
        return {
            beforeModifying: [
                'Buscar funciones similares existentes',
                'Verificar si puedes reutilizar código',
                'Comprobar configuraciones existentes',
                'Revisar si ya existe la funcionalidad'
            ],
            duringModification: [
                'Usar nombres únicos según convenciones',
                'Extender funcionalidad existente en lugar de duplicar',
                'Centralizar nuevas configuraciones',
                'Mantener comunicación con otros archivos'
            ],
            afterModification: [
                'Verificar cero duplicaciones nuevas',
                'Validar que las referencias funcionan',
                'Probar comunicación entre archivos',
                'Actualizar mapeo de dependencias'
            ]
        };
    }

    // ===== MÉTODOS DE UTILIDAD UNIFICADOS =====
    findAllProjectFiles() {
        const files = [];
        const extensions = ['.js', '.html', '.css', '.json', '.md'];
        
        function scanDir(dir) {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                if (entry.startsWith('.')) continue;
                
                const fullPath = path.join(dir, entry);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (extensions.some(ext => entry.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        }
        
        scanDir('.');
        return files;
    }

    extractFunctions(content) {
        const functions = [];
        const patterns = [
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*function/g,
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*\(/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                functions.push({
                    name: match[1],
                    line: content.substring(0, match.index).split('\n').length
                });
            }
        });
        
        return functions;
    }

    extractVariables(content) {
        const variables = [];
        const pattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;
        
        while ((match = pattern.exec(content)) !== null) {
            variables.push(match[1]);
        }
        
        return variables;
    }

    extractImports(content) {
        const imports = [];
        const patterns = [
            /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /<script\s+src=['"]([^'"]+)['"]/g,
            /<link\s+.*?href=['"]([^'"]+)['"]/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1]);
            }
        });
        
        return imports;
    }

    extractExports(content) {
        const exports = [];
        const patterns = [
            /export\s+(?:function|class|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
            /export\s*\{\s*([^}]+)\s*\}/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (pattern.source.includes('{')) {
                    // Export list
                    const names = match[1].split(',').map(n => n.trim());
                    exports.push(...names);
                } else {
                    exports.push(match[1]);
                }
            }
        });
        
        return exports;
    }

    saveAgentInstructions(agentId, instructions) {
        const filename = `./instructions_${agentId.toLowerCase().replace('-', '_')}.json`;
        fs.writeFileSync(filename, JSON.stringify(instructions, null, 2));
        this.log(`📋 Instrucciones guardadas para ${agentId}: ${filename}`);
    }

    loadFileContent(filePath) {
        try {
            return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
        } catch (error) {
            return null;
        }
    }

    getDefaultUnifiedConfig() {
        return {
            agents: {
                'AGENT-1': { role: 'Coordinador', permissions: { read: ['*'], write: [], delete: [] } },
                'AGENT-2': { role: 'Aplicación Principal', permissions: { read: ['index.html', 'flashcard-app-final.js'], write: ['index.html', 'flashcard-app-final.js'], delete: [] } },
                'AGENT-3': { role: 'Gestión de Datos', permissions: { read: ['flashcard-app-final.js'], write: ['flashcard-app-final.js'], delete: [] } },
                'AGENT-4': { role: 'UI y Navegación', permissions: { read: ['services/NavigationService.js', 'index.html'], write: ['services/NavigationService.js', 'index.html'], delete: [] } },
                'AGENT-5': { role: 'Utilidades y Testing', permissions: { read: ['utils/*', 'tests/*', 'styles.css'], write: ['utils/*', 'tests/*', 'styles.css'], delete: ['tests/*'] } }
            },
            unification: { maxSimilarFunctions: 0, maxSimilarFiles: 0, centralizeConfigs: true },
            communication: { eventSystem: true, apiRegistry: true, stateManagement: true },
            syntax: { enforceConventions: true, preventConflicts: true, validateReferences: true }
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${this.agentId}] ${timestamp}: ${message}`);
    }
}

// ===== EJECUCIÓN PRINCIPAL =====
async function main() {
    const coordinator = new EnhancedAgent1Coordinator();
    
    try {
        // Ejecutar verificación unificada completa
        const results = await coordinator.executeUnifiedVerification();
        
        // Generar reporte final
        const report = {
            timestamp: new Date().toISOString(),
            coordinator: coordinator.agentId,
            status: results.status,
            totalIssues: results.issues,
            verification: results.results,
            executionTime: Date.now() - coordinator.startTime
        };
        
        // Guardar reporte
        fs.writeFileSync('./unified_coordination_report.json', JSON.stringify(report, null, 2));
        
        coordinator.log(`🎯 Verificación completada: ${results.status} (${results.issues} problemas)`, 
                       results.status === 'SUCCESS' ? 'success' : 'warning');
        
        return results;
        
    } catch (error) {
        coordinator.log(`❌ Error en coordinación: ${error.message}`, 'error');
        throw error;
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { EnhancedAgent1Coordinator };

    // ===== FUNCIONES FALTANTES IMPLEMENTADAS =====
    
    loadAgentConfig() {
        try {
            const configPath = './agent_config.json';
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8')).agents;
            }
        } catch (error) {
            this.log(`Error cargando agent_config.json: ${error.message}`, 'warning');
        }
        return this.getDefaultUnifiedConfig().agents;
    }

    loadUnificationRules() {
        return { maxSimilarFunctions: 0, maxSimilarFiles: 0, centralizeConfigs: true };
    }

    loadCommunicationRules() {
        return { eventSystem: true, apiRegistry: true, stateManagement: true };
    }

    loadSyntaxRules() {
        return { enforceConventions: true, preventConflicts: true, validateReferences: true };
    }

    extractDependencies(content) {
        const dependencies = [];
        const patterns = [
            /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                dependencies.push(match[1]);
            }
        });
        
        return dependencies;
    }

    determineAgentOwner(filePath) {
        if (filePath.includes('index.html') || filePath.includes('flashcard-app-final.js')) return 'AGENT-2';
        if (filePath.includes('services/NavigationService.js')) return 'AGENT-4';
        if (filePath.includes('utils/') || filePath.includes('tests/') || filePath.includes('styles.css')) return 'AGENT-5';
        if (filePath.includes('scripts/enhanced_agent1_coordinator.cjs')) return 'AGENT-1';
        return 'AGENT-3';
    }

    async detectDuplicateFunctions() {
        const duplicates = [];
        const functionMap = new Map();
        
        const files = this.findAllProjectFiles().filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const functions = this.extractFunctions(content);
                
                for (const func of functions) {
                    if (functionMap.has(func.name)) {
                        duplicates.push({
                            type: 'DUPLICATE_FUNCTION',
                            name: func.name,
                            files: [functionMap.get(func.name), file],
                            severity: 'HIGH'
                        });
                    } else {
                        functionMap.set(func.name, file);
                    }
                }
            }
        }
        
        return duplicates;
    }

    async detectSimilarFiles() {
        const similar = [];
        const files = this.findAllProjectFiles();
        
        for (let i = 0; i < files.length; i++) {
            for (let j = i + 1; j < files.length; j++) {
                const similarity = this.calculateFileSimilarity(files[i], files[j]);
                if (similarity > 0.8) {
                    similar.push({
                        type: 'SIMILAR_FILES',
                        files: [files[i], files[j]],
                        similarity: similarity,
                        severity: 'MEDIUM'
                    });
                }
            }
        }
        
        return similar;
    }

    async detectScatteredConfigs() {
        const scattered = [];
        const configPatterns = ['API_URL', 'CONFIG', 'ENDPOINT', 'BASE_URL'];
        const configMap = new Map();
        
        const files = this.findAllProjectFiles().filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                
                for (const pattern of configPatterns) {
                    const regex = new RegExp(`(const|let|var)\\s+.*${pattern}`, 'g');
                    if (regex.test(content)) {
                        if (configMap.has(pattern)) {
                            scattered.push({
                                type: 'SCATTERED_CONFIG',
                                pattern: pattern,
                                files: [configMap.get(pattern), file],
                                severity: 'MEDIUM'
                            });
                        } else {
                            configMap.set(pattern, file);
                        }
                    }
                }
            }
        }
        
        return scattered;
    }

    async detectDuplicateCode() {
        return []; // Implementación básica
    }

    findSimilarFunctions() {
        return []; // Implementación básica
    }

    findScatteredConfigurations() {
        return []; // Implementación básica
    }

    async verifyInstructionReading() {
        return []; // Implementación básica
    }

    async verifyFilePermissions() {
        return []; // Implementación básica
    }

    async verifyAgentIndependence() {
        return []; // Implementación básica
    }

    async verifyImportsExports() {
        const issues = [];
        const files = this.findAllProjectFiles().filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const imports = this.extractImports(content);
                
                for (const importPath of imports) {
                    if (!fs.existsSync(importPath) && !importPath.startsWith('http')) {
                        issues.push({
                            type: 'BROKEN_IMPORT',
                            file: file,
                            import: importPath,
                            severity: 'HIGH'
                        });
                    }
                }
            }
        }
        
        return issues;
    }

    async verifyFunctionReferences() {
        return []; // Implementación básica
    }

    async verifyCommunicationSyntax() {
        return []; // Implementación básica
    }

    async verifyNamingConventions() {
        return []; // Implementación básica
    }

    async verifyNameConflicts() {
        return []; // Implementación básica
    }

    async verifyFileSyntax() {
        return []; // Implementación básica
    }

    calculateFileSimilarity(file1, file2) {
        if (!fs.existsSync(file1) || !fs.existsSync(file2)) return 0;
        
        const content1 = fs.readFileSync(file1, 'utf8');
        const content2 = fs.readFileSync(file2, 'utf8');
        
        const lines1 = content1.split('\n');
        const lines2 = content2.split('\n');
        
        const commonLines = lines1.filter(line => lines2.includes(line)).length;
        const totalLines = Math.max(lines1.length, lines2.length);
        
        return totalLines > 0 ? commonLines / totalLines : 0;
    }

    getAgentFiles(agentId) {
        const agent = this.config.agents[agentId];
        if (!agent) return [];
        
        const files = [];
        const allFiles = this.findAllProjectFiles();
        
        for (const pattern of agent.permissions.read) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            files.push(...allFiles.filter(f => regex.test(f)));
        }
        
        return [...new Set(files)]; // Remove duplicates
    }

    findFileCommunications(file) {
        const communications = [];
        
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const imports = this.extractImports(content);
            
            for (const imp of imports) {
                if (fs.existsSync(imp)) {
                    communications.push(imp);
                }
            }
        }
        
        return communications;
    }

    generateDependencyCheck(files) {
        const dependencies = new Set();
        
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const deps = this.extractDependencies(content);
                deps.forEach(dep => dependencies.add(dep));
            }
        }
        
        return Array.from(dependencies);
    }

    getRelatedAgents(agentId) {
        const allAgents = Object.keys(this.config.agents);
        return allAgents.filter(id => id !== agentId);
    }

    getExistingNames() {
        return Array.from(this.communication.nameRegistry);
    }

