#!/usr/bin/env node
/**
 * AGENTE 1 - COORDINADOR MAESTRO CON PROTOCOLO UNIFICADO
 * Sistema completo funcional y operativo
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnhancedAgent1Coordinator {
    constructor() {
        this.startTime = Date.now();
        this.agentId = 'AGENT-1-UNIFIED';
        this.config = this.getDefaultUnifiedConfig();
        this.communication = {
            fileMap: new Map(),
            nameRegistry: new Set()
        };
        
        this.log('✅ Coordinador inicializado correctamente');
    }

    // ===== VERIFICACIÓN PRINCIPAL =====
    async executeUnifiedVerification() {
        this.log('🔍 Iniciando verificación unificada completa...');
        
        const results = {
            duplicates: await this.verifyNoDuplicates(),
            communication: await this.verifyCommunication(),
            fileStructure: await this.verifyFileStructure()
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
        
        this.log(`📊 Duplicados encontrados: ${duplicates.length}`);
        return duplicates;
    }

    async verifyCommunication() {
        this.log('🔗 Verificando comunicación entre archivos...');
        const issues = [];
        
        const files = this.findAllProjectFiles().filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const imports = this.extractImports(content);
                
                for (const importPath of imports) {
                    if (!fs.existsSync(importPath) && !importPath.startsWith('http') && !importPath.startsWith('.')) {
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

    async verifyFileStructure() {
        this.log('📁 Verificando estructura de archivos...');
        const issues = [];
        
        const expectedFiles = [
            'index.html',
            'flashcard-app-final.js',
            'services/NavigationService.js',
            'utils/helpers.js',
            'utils/formValidation.js',
            'styles.css'
        ];
        
        for (const file of expectedFiles) {
            if (!fs.existsSync(file)) {
                issues.push({
                    type: 'MISSING_FILE',
                    file: file,
                    severity: 'MEDIUM'
                });
            }
        }
        
        return issues;
    }

    // ===== GENERACIÓN DE INSTRUCCIONES =====
    generateAgentInstructions(agentId, task, files = []) {
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
                agentConfig: './agent_config.json'
            },
            
            // PASO 2: PERMISOS Y RESTRICCIONES
            permissions: {
                canRead: agent.permissions.read,
                canWrite: agent.permissions.write,
                canDelete: agent.permissions.delete || [],
                forbidden: this.getForbiddenActions(agentId)
            },
            
            // PASO 3: CONVENCIONES DE NOMBRES
            namingConventions: this.generateNamingRules(agentId),
            
            // PASO 4: COMUNICACIÓN
            communicationProtocol: this.generateCommunicationRules(agentId),
            
            // PASO 5: UNIFICACIÓN
            unificationRules: {
                beforeModifying: [
                    'Buscar funciones similares existentes',
                    'Verificar si puedes reutilizar código',
                    'Comprobar configuraciones existentes'
                ],
                duringModification: [
                    'Usar nombres únicos según convenciones',
                    'Extender funcionalidad existente',
                    'Centralizar nuevas configuraciones'
                ],
                afterModification: [
                    'Verificar cero duplicaciones nuevas',
                    'Validar que las referencias funcionan',
                    'Probar comunicación entre archivos'
                ]
            },
            
            // PASO 6: VERIFICACIONES
            requiredChecks: {
                preWork: ['Verificar permisos', 'Leer protocolos', 'Comprobar dependencias'],
                postWork: ['Verificar sintaxis', 'Probar funcionalidad', 'Confirmar cero duplicados']
            }
        };
        
        // Guardar instrucciones
        this.saveAgentInstructions(agentId, instructions);
        
        return instructions;
    }

    generateNamingRules(agentId) {
        const agentNumber = agentId.split('-')[1];
        
        return {
            functionPattern: `agent${agentNumber}[A-Z][a-zA-Z]*`,
            variablePattern: `AGENT${agentNumber}_[A-Z_]+`,
            examples: {
                function: `agent${agentNumber}DataLoad`,
                variable: `AGENT${agentNumber}_CONFIG`
            },
            forbidden: ['duplicateFunction', 'copyFunction', 'similarFunction']
        };
    }

    generateCommunicationRules(agentId) {
        return {
            eventSystem: {
                emit: `window.dispatchEvent(new CustomEvent('agent-communication', {
                    detail: { from: '${agentId}', action: 'ACTION', data: {} }
                }))`,
                listen: `window.addEventListener('agent-communication', (event) => {
                    if (event.detail.from !== '${agentId}') { /* handle */ }
                })`
            },
            apiRegistration: {
                register: `window.AGENT_API = window.AGENT_API || {};
                window.AGENT_API['${agentId}'] = { functionName: functionReference };`,
                call: `window.AGENT_API['TARGET-AGENT'].functionName(params)`
            }
        };
    }

    getForbiddenActions(agentId) {
        const forbidden = ['Crear funciones duplicadas', 'Modificar archivos de otros agentes'];
        
        switch(agentId) {
            case 'AGENT-1':
                forbidden.push('Modificar código de aplicación');
                break;
            case 'AGENT-2':
                forbidden.push('Modificar servicios de otros agentes');
                break;
            case 'AGENT-3':
                forbidden.push('Modificar UI directamente');
                break;
            case 'AGENT-4':
                forbidden.push('Modificar lógica de datos');
                break;
            case 'AGENT-5':
                forbidden.push('Modificar código principal');
                break;
        }
        
        return forbidden;
    }

    // ===== SISTEMA DE ASIGNACIÓN DINÁMICA =====
    
    assignAgentsForTask(description, files = [], priority = 'medium') {
        this.log(`🎯 Asignando agentes para: "${description}"`);
        
        const assignment = this.analyzeTaskRequirements(description, files);
        
        // Generar instrucciones específicas para cada agente asignado
        const instructions = {};
        
        // Agente principal
        instructions[assignment.primary] = this.generateTaskInstructions(
            assignment.primary, description, files, 'primary'
        );
        
        // Agentes de apoyo
        assignment.support.forEach(agentId => {
            instructions[agentId] = this.generateTaskInstructions(
                agentId, description, files, 'support'
            );
        });
        
        // Validador
        if (assignment.validator) {
            instructions[assignment.validator] = this.generateTaskInstructions(
                assignment.validator, description, files, 'validator'
            );
        }
        
        // Supervisor (siempre AGENT-1)
        instructions['AGENT-1'] = this.generateTaskInstructions(
            'AGENT-1', description, files, 'supervisor'
        );
        
        this.log(`✅ Asignados: ${Object.keys(instructions).join(', ')}`);
        
        return { assignment, instructions };
    }
    
    analyzeTaskRequirements(description, files) {
        const assignment = {
            primary: null,
            support: [],
            supervisor: 'AGENT-1',
            validator: null
        };
        
        const desc = description.toLowerCase();
        const fileList = files.join(' ').toLowerCase();
        
        // Análisis inteligente de la tarea
        if (desc.includes('html') || fileList.includes('index.html') || desc.includes('formulario') || desc.includes('página')) {
            assignment.primary = 'AGENT-2';
            assignment.support = ['AGENT-4']; // UI/Navegación
            assignment.validator = 'AGENT-5'; // Testing
        }
        
        else if (desc.includes('javascript') || desc.includes('js') || fileList.includes('flashcard-app-final.js') || desc.includes('función') || desc.includes('lógica')) {
            assignment.primary = 'AGENT-2';
            assignment.support = ['AGENT-3']; // Datos
            assignment.validator = 'AGENT-5'; // Testing
        }
        
        else if (desc.includes('css') || desc.includes('estilo') || desc.includes('color') || desc.includes('diseño') || fileList.includes('styles.css')) {
            assignment.primary = 'AGENT-5';
            assignment.support = ['AGENT-2']; // HTML
            assignment.validator = 'AGENT-4'; // UI
        }
        
        else if (desc.includes('service') || desc.includes('servicio') || desc.includes('navegación') || fileList.includes('navigationservice.js')) {
            assignment.primary = 'AGENT-4';
            assignment.support = ['AGENT-2']; // Integración
            assignment.validator = 'AGENT-5'; // Testing
        }
        
        else if (desc.includes('data') || desc.includes('datos') || desc.includes('backend') || desc.includes('base de datos')) {
            assignment.primary = 'AGENT-3';
            assignment.support = ['AGENT-2']; // Frontend
            assignment.validator = 'AGENT-5'; // Testing
        }
        
        else if (desc.includes('test') || desc.includes('prueba') || desc.includes('validar') || desc.includes('verificar')) {
            assignment.primary = 'AGENT-5';
            assignment.support = ['AGENT-2']; // Aplicación
            assignment.validator = 'AGENT-1'; // Supervisor
        }
        
        // Tareas complejas que requieren múltiples agentes
        else if (desc.includes('optimizar') || desc.includes('performance') || desc.includes('rendimiento')) {
            assignment.primary = 'AGENT-3'; // Datos
            assignment.support = ['AGENT-2', 'AGENT-5']; // Frontend + Testing
            assignment.validator = 'AGENT-4'; // UI
        }
        
        else if (desc.includes('integrar') || desc.includes('conectar') || desc.includes('comunicación')) {
            assignment.primary = 'AGENT-2'; // Principal
            assignment.support = ['AGENT-3', 'AGENT-4']; // Datos + UI
            assignment.validator = 'AGENT-5'; // Testing
        }
        
        // Tarea general - asignar AGENT-2 como principal
        else {
            assignment.primary = 'AGENT-2';
            assignment.support = ['AGENT-5']; // Testing
            assignment.validator = 'AGENT-1'; // Supervisor
        }
        
        return assignment;
    }
    
    generateTaskInstructions(agentId, description, files, role) {
        const baseInstructions = this.generateAgentInstructions(agentId, description, files);
        
        // Personalizar según el rol en la tarea
        baseInstructions.taskRole = role;
        baseInstructions.taskSpecificGuidelines = this.getTaskSpecificGuidelines(agentId, role, description);
        baseInstructions.coordinationProtocol = this.getCoordinationProtocol(agentId, role);
        
        return baseInstructions;
    }
    
    getTaskSpecificGuidelines(agentId, role, description) {
        const guidelines = [];
        
        switch(role) {
            case 'primary':
                guidelines.push('Eres el RESPONSABLE PRINCIPAL de esta tarea');
                guidelines.push('Ejecuta la modificación principal');
                guidelines.push('Coordina con agentes de apoyo');
                guidelines.push('Reporta progreso al supervisor');
                break;
                
            case 'support':
                guidelines.push('Eres APOYO para el agente principal');
                guidelines.push('Verifica compatibilidad con tu área');
                guidelines.push('Sugiere mejoras si es necesario');
                guidelines.push('NO modifiques sin coordinación');
                break;
                
            case 'validator':
                guidelines.push('Eres el VALIDADOR de la tarea');
                guidelines.push('Prueba la funcionalidad después de cambios');
                guidelines.push('Reporta cualquier problema encontrado');
                guidelines.push('Confirma que todo funciona correctamente');
                break;
                
            case 'supervisor':
                guidelines.push('Eres el SUPERVISOR de toda la tarea');
                guidelines.push('Coordina entre todos los agentes');
                guidelines.push('Verifica que no hay duplicaciones');
                guidelines.push('Aprueba o rechaza el trabajo final');
                break;
        }
        
        return guidelines;
    }
    
    getCoordinationProtocol(agentId, role) {
        return {
            reportTo: role === 'supervisor' ? null : 'AGENT-1',
            coordinateWith: role === 'primary' ? ['support', 'validator'] : ['primary'],
            waitFor: role === 'validator' ? ['primary', 'support'] : [],
            notifyWhen: ['task_start', 'task_complete', 'issue_found']
        };
    }
    // ===== VERIFICACIÓN DE ESTÁNDARES OBLIGATORIOS =====
    
    async loadCodingStandards() {
        this.log('📋 Cargando estándares de codificación obligatorios...');
        
        try {
            const fs = require('fs');
            const standardsPath = './AGENT_CODING_STANDARDS.md';
            
            if (!fs.existsSync(standardsPath)) {
                this.log('❌ AGENT_CODING_STANDARDS.md no encontrado - CRÍTICO', 'error');
                return false;
            }
            
            const standards = fs.readFileSync(standardsPath, 'utf8');
            this.codingStandards = this.parseCodingStandards(standards);
            
            this.log('✅ Estándares de codificación cargados exitosamente');
            return true;
        } catch (error) {
            this.log(`❌ Error cargando estándares: ${error.message}`, 'error');
            return false;
        }
    }
    
    parseCodingStandards(content) {
        return {
            namingConventions: this.extractNamingConventions(content),
            dependencies: this.extractDependencyRules(content),
            syntaxRules: this.extractSyntaxRules(content),
            prohibitedActions: this.extractProhibitedActions(content),
            requiredActions: this.extractRequiredActions(content)
        };
    }
    
    extractNamingConventions(content) {
        const conventions = {};
        
        // Extraer prefijos obligatorios
        const prefixMatch = content.match(/#### \*\*Prefijos Obligatorios:\*\*([\s\S]*?)#### \*\*Sufijos/);
        if (prefixMatch) {
            const prefixes = prefixMatch[1].match(/`(\w+)`/g);
            conventions.prefixes = prefixes ? prefixes.map(p => p.replace(/`/g, '')) : [];
        }
        
        // Extraer sufijos
        const suffixMatch = content.match(/#### \*\*Sufijos para Contexto:\*\*([\s\S]*?)### \*\*🔧/);
        if (suffixMatch) {
            const suffixes = suffixMatch[1].match(/`(\w+)`/g);
            conventions.suffixes = suffixes ? suffixes.map(s => s.replace(/`/g, '')) : [];
        }
        
        return conventions;
    }
    
    extractDependencyRules(content) {
        const dependencies = {};
        
        // Extraer servicios disponibles
        const servicesMatch = content.match(/#### \*\*Dependencias Comunes Disponibles:\*\*([\s\S]*?)```/);
        if (servicesMatch) {
            const services = servicesMatch[1].match(/- (\w+)/g);
            dependencies.availableServices = services ? services.map(s => s.replace('- ', '')) : [];
        }
        
        return dependencies;
    }
    
    extractSyntaxRules(content) {
        return {
            indentation: 4, // espacios
            braceStyle: 'javascript',
            commentsRequired: true,
            errorHandlingRequired: true
        };
    }
    
    extractProhibitedActions(content) {
        const prohibitedMatch = content.match(/### \*\*🚫 PROHIBIDO ABSOLUTAMENTE:\*\*([\s\S]*?)### \*\*✅ OBLIGATORIO/);
        if (prohibitedMatch) {
            const actions = prohibitedMatch[1].match(/\d+\. \*\*NO ([^*]+)\*\*/g);
            return actions ? actions.map(a => a.replace(/\d+\. \*\*NO /, '').replace(/\*\*/, '')) : [];
        }
        return [];
    }
    
    extractRequiredActions(content) {
        const requiredMatch = content.match(/### \*\*✅ OBLIGATORIO SIEMPRE:\*\*([\s\S]*?)---/);
        if (requiredMatch) {
            const actions = requiredMatch[1].match(/\d+\. \*\*SÍ ([^*]+)\*\*/g);
            return actions ? actions.map(a => a.replace(/\d+\. \*\*SÍ /, '').replace(/\*\*/, '')) : [];
        }
        return [];
    }
    
    async verifyCodingStandards(filePath) {
        this.log(`🔍 Verificando estándares de codificación en ${filePath}...`);
        
        if (!this.codingStandards) {
            const loaded = await this.loadCodingStandards();
            if (!loaded) {
                return { passed: false, error: 'No se pudieron cargar estándares' };
            }
        }
        
        try {
            const fs = require('fs');
            const content = fs.readFileSync(filePath, 'utf8');
            
            const violations = [];
            
            // Verificar nomenclatura de funciones
            const functionNames = this.extractFunctionNames(content);
            functionNames.forEach(name => {
                if (!this.validateFunctionName(name)) {
                    violations.push(`Función '${name}' no sigue convenciones de nomenclatura`);
                }
            });
            
            // Verificar dependencias
            const imports = this.extractImports(content);
            imports.forEach(imp => {
                if (!this.validateDependency(imp)) {
                    violations.push(`Dependencia '${imp}' no está en lista de servicios disponibles`);
                }
            });
            
            // Verificar sintaxis básica
            if (!this.validateSyntax(content)) {
                violations.push('Código no cumple reglas básicas de sintaxis');
            }
            
            const passed = violations.length === 0;
            
            this.log(passed ? '✅ Código cumple estándares' : `❌ ${violations.length} violaciones encontradas`);
            
            return {
                passed: passed,
                violations: violations,
                score: Math.max(0, 100 - (violations.length * 10))
            };
        } catch (error) {
            this.log(`❌ Error verificando estándares: ${error.message}`, 'error');
            return { passed: false, error: error.message };
        }
    }
    
    validateFunctionName(name) {
        if (!this.codingStandards?.namingConventions?.prefixes) return true;
        
        const validPrefixes = this.codingStandards.namingConventions.prefixes;
        return validPrefixes.some(prefix => name.toLowerCase().startsWith(prefix.toLowerCase()));
    }
    
    validateDependency(dependency) {
        if (!this.codingStandards?.dependencies?.availableServices) return true;
        
        const available = this.codingStandards.dependencies.availableServices;
        return available.includes(dependency) || dependency.includes('require') || dependency.includes('import');
    }
    
    validateSyntax(content) {
        // Verificaciones básicas de sintaxis
        const hasProperIndentation = !content.includes('\t'); // No tabs
        const hasProperBraces = this.validateBraces(content);
        
        return hasProperIndentation && hasProperBraces;
    }
    
    validateBraces(content) {
        let braceCount = 0;
        for (let char of content) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (braceCount < 0) return false;
        }
        return braceCount === 0;
    }
    
    extractFunctionNames(content) {
        const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const arrowFunctionRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*(?:async\s+)?\(/g;
        
        const names = [];
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            names.push(match[1]);
        }
        
        while ((match = arrowFunctionRegex.exec(content)) !== null) {
            names.push(match[1]);
        }
        
        return names;
    }
    
    extractImports(content) {
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
        
        const imports = [];
        let match;
        
        while ((match = requireRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        
        return imports;
    }
    
    async checkServicesAvailable(requiredServices) {
        this.log(`🔍 Verificando disponibilidad de servicios: ${requiredServices.join(', ')}`);
        
        const available = this.codingStandards?.dependencies?.availableServices || [];
        const missing = requiredServices.filter(service => !available.includes(service));
        
        return {
            allFound: missing.length === 0,
            missing: missing,
            available: available
        };
    }
    
    async enforceStandardsBeforeWork(agentId, description, targetFiles = []) {
        this.log(`🛡️ Aplicando estándares obligatorios para ${agentId}...`);
        
        // 1. Cargar estándares si no están cargados
        if (!this.codingStandards) {
            const loaded = await this.loadCodingStandards();
            if (!loaded) {
                throw new Error('CRÍTICO: No se pueden cargar estándares de codificación');
            }
        }
        
        // 2. Verificar que la descripción no viola reglas prohibidas
        const prohibited = this.codingStandards.prohibitedActions || [];
        for (const action of prohibited) {
            if (description.toLowerCase().includes(action.toLowerCase())) {
                throw new Error(`PROHIBIDO: ${action} - Descripción: "${description}"`);
            }
        }
        
        // 3. Verificar archivos objetivo
        for (const file of targetFiles) {
            if (file === 'flashcard-app-final.js') {
                this.log('⚠️ Modificación de archivo principal - verificación extra requerida', 'warn');
                const analysis = await this.analyzeAndManageFunction(description, null, file);
                if (!analysis) {
                    throw new Error('CRÍTICO: Análisis inteligente requerido para archivo principal');
                }
            }
        }
        
        this.log(`✅ Estándares verificados para ${agentId} - Puede proceder`);
        return true;
    }

    // ===== INTEGRACIÓN CON GESTIÓN INTELIGENTE DE FUNCIONES =====
    
    async analyzeAndManageFunction(description, functionCode = null, targetFile = 'flashcard-app-final.js') {
        this.log('🧠 Iniciando análisis inteligente de función...');
        
        try {
            const { analyzeAndExecuteFunction } = require('./intelligent_function_manager.cjs');
            const result = await analyzeAndExecuteFunction(description, functionCode, targetFile);
            
            this.log(`💡 Recomendación: ${result.recommendation.action} (confianza: ${result.recommendation.confidence})`);
            
            if (result.result) {
                this.log(`✅ Acción ejecutada: ${result.result.action}`);
            }
            
            return result;
        } catch (error) {
            this.log(`⚠️ Error en gestión inteligente: ${error.message}`, 'warn');
            return null;
        }
    }
    
    async createOrUpdateFunction(description, functionCode, targetFile = 'flashcard-app-final.js') {
        this.log(`🔧 Creando/actualizando función: "${description}"`);
        
        // 1. Analizar si función similar existe
        const analysis = await this.analyzeAndManageFunction(description, null, targetFile);
        
        if (!analysis) {
            this.log('❌ No se pudo analizar la función', 'error');
            return false;
        }
        
        // 2. Ejecutar acción recomendada
        const result = await this.analyzeAndManageFunction(description, functionCode, targetFile);
        
        if (result && result.result && result.result.success) {
            this.log(`✅ Función gestionada exitosamente: ${result.result.action}`, 'success');
            
            // 3. Verificar que no se crearon duplicados
            await this.executeAutoCleanup();
            
            return true;
        } else {
            this.log('❌ Error gestionando función', 'error');
            return false;
        }
    }

    // ===== INTEGRACIÓN CON SISTEMA DE LIMPIEZA =====
    
    async executeAutoCleanup() {
        this.log('🧹 Iniciando limpieza automática antes de verificación...');
        
        try {
            const { AutoCleanupSystem } = require('./auto_cleanup_system.cjs');
            const cleanup = new AutoCleanupSystem();
            const results = await cleanup.executeAutoCleanup();
            
            this.log(`✅ Limpieza completada: ${results.summary?.totalCleaned || 0} elementos eliminados`);
            return results;
        } catch (error) {
            this.log(`⚠️ Error en limpieza automática: ${error.message}`, 'warn');
            return null;
        }
    }
    
    async verifyProjectWithCleanup() {
        // 1. Ejecutar limpieza automática primero
        await this.executeAutoCleanup();
        
        // 2. Luego ejecutar verificación normal
        return this.verifyProject();
    }

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

    extractImports(content) {
        const imports = [];
        const patterns = [
            /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /<script\s+src=['"]([^'"]+)['"]/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1]);
            }
        });
        
        return imports;
    }

    saveAgentInstructions(agentId, instructions) {
        const filename = `./instructions_${agentId.toLowerCase().replace('-', '_')}.json`;
        fs.writeFileSync(filename, JSON.stringify(instructions, null, 2));
        this.log(`📋 Instrucciones guardadas para ${agentId}: ${filename}`);
    }

    getDefaultUnifiedConfig() {
        return {
            agents: {
                'AGENT-1': { 
                    role: 'Coordinador Maestro', 
                    permissions: { read: ['*'], write: ['scripts/*', 'instructions_*'], delete: [] } 
                },
                'AGENT-2': { 
                    role: 'Aplicación Principal', 
                    permissions: { 
                        read: ['index.html', 'flashcard-app-final.js'], 
                        write: ['index.html', 'flashcard-app-final.js'], 
                        delete: [] 
                    } 
                },
                'AGENT-3': { 
                    role: 'Gestión de Datos', 
                    permissions: { 
                        read: ['flashcard-app-final.js'], 
                        write: ['flashcard-app-final.js'], 
                        delete: [] 
                    } 
                },
                'AGENT-4': { 
                    role: 'UI y Navegación', 
                    permissions: { 
                        read: ['services/NavigationService.js', 'index.html'], 
                        write: ['services/NavigationService.js', 'index.html'], 
                        delete: [] 
                    } 
                },
                'AGENT-5': { 
                    role: 'Utilidades y Testing', 
                    permissions: { 
                        read: ['utils/*', 'tests/*', 'styles.css'], 
                        write: ['utils/*', 'tests/*', 'styles.css'], 
                        delete: ['tests/*'] 
                    } 
                }
            }
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
        
        // Generar instrucciones para todos los agentes
        const agentIds = ['AGENT-1', 'AGENT-2', 'AGENT-3', 'AGENT-4', 'AGENT-5'];
        
        for (const agentId of agentIds) {
            coordinator.generateAgentInstructions(agentId, 'Trabajo general del agente');
        }
        
        // Generar reporte final
        const report = {
            timestamp: new Date().toISOString(),
            coordinator: coordinator.agentId,
            status: results.status,
            totalIssues: results.issues,
            verification: results.results,
            executionTime: Date.now() - coordinator.startTime,
            instructionsGenerated: agentIds.length
        };
        
        // Guardar reporte
        fs.writeFileSync('./unified_coordination_report.json', JSON.stringify(report, null, 2));
        
        coordinator.log(`🎯 Verificación completada: ${results.status} (${results.issues} problemas)`, 
                       results.status === 'SUCCESS' ? 'success' : 'warning');
        
        coordinator.log(`📋 Instrucciones generadas para ${agentIds.length} agentes`, 'success');
        
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

