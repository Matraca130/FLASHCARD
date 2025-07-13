#!/usr/bin/env node
/**
 * SISTEMA INTELIGENTE DE GESTIÓN DE FUNCIONES
 * Detecta funciones duplicadas por funcionalidad y las reemplaza/modifica automáticamente
 */

const fs = require('fs');
const path = require('path');

class IntelligentFunctionManager {
    constructor() {
        this.systemId = 'INTELLIGENT-FUNC-MGR';
        this.functionDatabase = new Map(); // Base de datos de funciones existentes
        this.similarityThreshold = 0.7; // 70% de similitud para considerar duplicado
    }

    // ===== ANÁLISIS INTELIGENTE DE FUNCIONES =====
    
    async analyzeFunctionRequest(description, targetFile = null) {
        this.log(`🧠 Analizando solicitud: "${description}"`);
        
        // 1. Extraer intención de la función
        const intention = this.extractFunctionIntention(description);
        
        // 2. Buscar funciones existentes con similar funcionalidad
        const existingFunctions = await this.findSimilarFunctions(intention);
        
        // 3. Decidir acción: crear, modificar o reemplazar
        const recommendation = this.determineAction(intention, existingFunctions);
        
        this.log(`💡 Recomendación: ${recommendation.action}`);
        
        return recommendation;
    }
    
    extractFunctionIntention(description) {
        const desc = description.toLowerCase();
        
        // Extraer palabras clave de funcionalidad
        const keywords = [];
        const actions = ['verificar', 'validar', 'crear', 'generar', 'procesar', 'calcular', 'obtener', 'guardar', 'eliminar', 'actualizar'];
        const objects = ['formulario', 'datos', 'usuario', 'archivo', 'elemento', 'lista', 'objeto', 'valor'];
        
        actions.forEach(action => {
            if (desc.includes(action)) keywords.push(action);
        });
        
        objects.forEach(object => {
            if (desc.includes(object)) keywords.push(object);
        });
        
        // Detectar patrones específicos
        const patterns = {
            validation: /verificar|validar|comprobar|revisar/,
            creation: /crear|generar|construir|hacer/,
            processing: /procesar|manejar|gestionar|ejecutar/,
            dataAccess: /obtener|buscar|cargar|leer/,
            dataSaving: /guardar|almacenar|escribir|persistir/,
            calculation: /calcular|computar|sumar|contar/
        };
        
        const detectedPatterns = [];
        Object.keys(patterns).forEach(pattern => {
            if (patterns[pattern].test(desc)) {
                detectedPatterns.push(pattern);
            }
        });
        
        return {
            description: description,
            keywords: keywords,
            patterns: detectedPatterns,
            mainAction: detectedPatterns[0] || 'general',
            complexity: this.estimateComplexity(description)
        };
    }
    
    async findSimilarFunctions(intention) {
        this.log('🔍 Buscando funciones similares...');
        
        // Cargar todas las funciones existentes
        await this.loadExistingFunctions();
        
        const similarFunctions = [];
        
        this.functionDatabase.forEach((funcData, funcName) => {
            const similarity = this.calculateSimilarity(intention, funcData.intention);
            
            if (similarity >= this.similarityThreshold) {
                similarFunctions.push({
                    name: funcName,
                    file: funcData.file,
                    line: funcData.line,
                    similarity: similarity,
                    intention: funcData.intention,
                    code: funcData.code,
                    lastModified: funcData.lastModified,
                    isWorking: funcData.isWorking
                });
            }
        });
        
        // Ordenar por similitud descendente
        similarFunctions.sort((a, b) => b.similarity - a.similarity);
        
        this.log(`📊 Funciones similares encontradas: ${similarFunctions.length}`);
        
        return similarFunctions;
    }
    
    determineAction(intention, similarFunctions) {
        if (similarFunctions.length === 0) {
            return {
                action: 'CREATE_NEW',
                reason: 'No existe función similar - crear nueva',
                targetFunction: null,
                confidence: 1.0
            };
        }
        
        const mostSimilar = similarFunctions[0];
        
        // Si la función más similar tiene alta similitud
        if (mostSimilar.similarity >= 0.9) {
            if (mostSimilar.isWorking) {
                return {
                    action: 'MODIFY_EXISTING',
                    reason: 'Función muy similar existe y funciona - modificar para nueva necesidad',
                    targetFunction: mostSimilar,
                    confidence: mostSimilar.similarity
                };
            } else {
                return {
                    action: 'REPLACE_BROKEN',
                    reason: 'Función muy similar existe pero no funciona - reemplazar completamente',
                    targetFunction: mostSimilar,
                    confidence: mostSimilar.similarity
                };
            }
        }
        
        // Si hay similitud media
        if (mostSimilar.similarity >= 0.7) {
            const daysSinceModified = (Date.now() - mostSimilar.lastModified) / (1000 * 60 * 60 * 24);
            
            if (daysSinceModified > 7) {
                return {
                    action: 'REPLACE_OLD',
                    reason: 'Función similar existe pero es antigua - reemplazar con versión actualizada',
                    targetFunction: mostSimilar,
                    confidence: mostSimilar.similarity
                };
            } else {
                return {
                    action: 'ENHANCE_EXISTING',
                    reason: 'Función similar reciente existe - mejorar funcionalidad existente',
                    targetFunction: mostSimilar,
                    confidence: mostSimilar.similarity
                };
            }
        }
        
        return {
            action: 'CREATE_NEW',
            reason: 'Similitud insuficiente - crear nueva función',
            targetFunction: mostSimilar,
            confidence: mostSimilar.similarity
        };
    }
    
    // ===== EJECUCIÓN DE ACCIONES =====
    
    async executeRecommendation(recommendation, newFunctionCode, targetFile) {
        this.log(`🔧 Ejecutando acción: ${recommendation.action}`);
        
        switch (recommendation.action) {
            case 'CREATE_NEW':
                return await this.createNewFunction(newFunctionCode, targetFile);
                
            case 'MODIFY_EXISTING':
                return await this.modifyExistingFunction(recommendation.targetFunction, newFunctionCode);
                
            case 'REPLACE_BROKEN':
            case 'REPLACE_OLD':
                return await this.replaceFunction(recommendation.targetFunction, newFunctionCode);
                
            case 'ENHANCE_EXISTING':
                return await this.enhanceExistingFunction(recommendation.targetFunction, newFunctionCode);
                
            default:
                throw new Error(`Acción no reconocida: ${recommendation.action}`);
        }
    }
    
    async createNewFunction(functionCode, targetFile) {
        this.log(`✨ Creando nueva función en ${targetFile}`);
        
        try {
            // Agregar función al final del archivo
            const content = fs.readFileSync(targetFile, 'utf8');
            const newContent = content + '\n\n' + functionCode + '\n';
            
            fs.writeFileSync(targetFile, newContent);
            
            return {
                success: true,
                action: 'CREATED',
                file: targetFile,
                message: 'Nueva función creada exitosamente'
            };
        } catch (error) {
            return {
                success: false,
                action: 'FAILED',
                error: error.message
            };
        }
    }
    
    async replaceFunction(targetFunction, newFunctionCode) {
        this.log(`🔄 Reemplazando función ${targetFunction.name} en ${targetFunction.file}`);
        
        try {
            const content = fs.readFileSync(targetFunction.file, 'utf8');
            const lines = content.split('\n');
            
            // Encontrar inicio y fin de la función
            const { startLine, endLine } = this.findFunctionBounds(lines, targetFunction.name);
            
            if (startLine === -1) {
                throw new Error(`No se pudo encontrar la función ${targetFunction.name}`);
            }
            
            // Reemplazar función
            const beforeFunction = lines.slice(0, startLine);
            const afterFunction = lines.slice(endLine + 1);
            const newLines = [...beforeFunction, ...newFunctionCode.split('\n'), ...afterFunction];
            
            fs.writeFileSync(targetFunction.file, newLines.join('\n'));
            
            return {
                success: true,
                action: 'REPLACED',
                file: targetFunction.file,
                oldFunction: targetFunction.name,
                message: `Función ${targetFunction.name} reemplazada exitosamente`
            };
        } catch (error) {
            return {
                success: false,
                action: 'FAILED',
                error: error.message
            };
        }
    }
    
    async modifyExistingFunction(targetFunction, modifications) {
        this.log(`🔧 Modificando función ${targetFunction.name} en ${targetFunction.file}`);
        
        try {
            const content = fs.readFileSync(targetFunction.file, 'utf8');
            const lines = content.split('\n');
            
            // Encontrar la función
            const { startLine, endLine } = this.findFunctionBounds(lines, targetFunction.name);
            
            if (startLine === -1) {
                throw new Error(`No se pudo encontrar la función ${targetFunction.name}`);
            }
            
            // Aplicar modificaciones inteligentes
            const modifiedFunction = this.applyIntelligentModifications(
                lines.slice(startLine, endLine + 1).join('\n'),
                modifications
            );
            
            // Reemplazar función modificada
            const beforeFunction = lines.slice(0, startLine);
            const afterFunction = lines.slice(endLine + 1);
            const newLines = [...beforeFunction, ...modifiedFunction.split('\n'), ...afterFunction];
            
            fs.writeFileSync(targetFunction.file, newLines.join('\n'));
            
            return {
                success: true,
                action: 'MODIFIED',
                file: targetFunction.file,
                function: targetFunction.name,
                message: `Función ${targetFunction.name} modificada exitosamente`
            };
        } catch (error) {
            return {
                success: false,
                action: 'FAILED',
                error: error.message
            };
        }
    }
    
    async enhanceExistingFunction(targetFunction, enhancements) {
        this.log(`⚡ Mejorando función ${targetFunction.name} en ${targetFunction.file}`);
        
        // Similar a modify pero con enfoque en mejoras incrementales
        return await this.modifyExistingFunction(targetFunction, enhancements);
    }
    
    // ===== MÉTODOS DE UTILIDAD =====
    
    async loadExistingFunctions() {
        this.functionDatabase.clear();
        
        const codeFiles = this.findAllCodeFiles();
        
        for (const file of codeFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const functions = this.extractFunctionsFromFile(content, file);
                
                functions.forEach(func => {
                    this.functionDatabase.set(func.name, func);
                });
            }
        }
        
        this.log(`📚 Cargadas ${this.functionDatabase.size} funciones existentes`);
    }
    
    extractFunctionsFromFile(content, file) {
        const functions = [];
        const lines = content.split('\n');
        
        // Patrones para detectar funciones
        const functionPatterns = [
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*function/,
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*\(/
        ];
        
        lines.forEach((line, index) => {
            functionPatterns.forEach(pattern => {
                const match = line.match(pattern);
                if (match) {
                    const funcName = match[1];
                    const { startLine, endLine } = this.findFunctionBounds(lines, funcName, index);
                    
                    if (startLine !== -1) {
                        const funcCode = lines.slice(startLine, endLine + 1).join('\n');
                        const intention = this.extractFunctionIntentionFromCode(funcCode);
                        
                        functions.push({
                            name: funcName,
                            file: file,
                            line: startLine + 1,
                            code: funcCode,
                            intention: intention,
                            lastModified: fs.statSync(file).mtime,
                            isWorking: this.testFunctionWorking(funcCode)
                        });
                    }
                }
            });
        });
        
        return functions;
    }
    
    calculateSimilarity(intention1, intention2) {
        // Similitud basada en palabras clave comunes
        const keywords1 = new Set(intention1.keywords);
        const keywords2 = new Set(intention2.keywords);
        
        const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
        const union = new Set([...keywords1, ...keywords2]);
        
        const keywordSimilarity = intersection.size / union.size;
        
        // Similitud basada en patrones
        const patterns1 = new Set(intention1.patterns);
        const patterns2 = new Set(intention2.patterns);
        
        const patternIntersection = new Set([...patterns1].filter(x => patterns2.has(x)));
        const patternUnion = new Set([...patterns1, ...patterns2]);
        
        const patternSimilarity = patternIntersection.size / (patternUnion.size || 1);
        
        // Similitud de acción principal
        const actionSimilarity = intention1.mainAction === intention2.mainAction ? 1 : 0;
        
        // Promedio ponderado
        return (keywordSimilarity * 0.4 + patternSimilarity * 0.4 + actionSimilarity * 0.2);
    }
    
    extractFunctionIntentionFromCode(code) {
        // Extraer intención de comentarios y nombres de variables
        const comments = code.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
        const commentText = comments.join(' ').toLowerCase();
        
        return this.extractFunctionIntention(commentText + ' ' + code);
    }
    
    estimateComplexity(description) {
        const complexWords = ['complejo', 'avanzado', 'múltiple', 'integrar', 'optimizar'];
        const simpleWords = ['simple', 'básico', 'verificar', 'obtener'];
        
        const desc = description.toLowerCase();
        let complexity = 0.5; // neutral
        
        complexWords.forEach(word => {
            if (desc.includes(word)) complexity += 0.1;
        });
        
        simpleWords.forEach(word => {
            if (desc.includes(word)) complexity -= 0.1;
        });
        
        return Math.max(0, Math.min(1, complexity));
    }
    
    findFunctionBounds(lines, funcName, startHint = -1) {
        let startLine = -1;
        let endLine = -1;
        
        // Buscar inicio de función
        for (let i = startHint >= 0 ? startHint : 0; i < lines.length; i++) {
            if (lines[i].includes(`function ${funcName}`) || 
                lines[i].includes(`${funcName} =`) ||
                lines[i].includes(`${funcName}:`)) {
                startLine = i;
                break;
            }
        }
        
        if (startLine === -1) return { startLine: -1, endLine: -1 };
        
        // Buscar fin de función (contando llaves)
        let braceCount = 0;
        let inFunction = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('{')) {
                braceCount += (line.match(/\{/g) || []).length;
                inFunction = true;
            }
            
            if (line.includes('}')) {
                braceCount -= (line.match(/\}/g) || []).length;
            }
            
            if (inFunction && braceCount === 0) {
                endLine = i;
                break;
            }
        }
        
        return { startLine, endLine };
    }
    
    testFunctionWorking(code) {
        // Heurística simple para determinar si una función probablemente funciona
        const errorIndicators = ['TODO', 'FIXME', 'BUG', 'BROKEN', 'console.error'];
        const workingIndicators = ['return', 'success', 'complete'];
        
        let score = 0;
        
        errorIndicators.forEach(indicator => {
            if (code.includes(indicator)) score -= 1;
        });
        
        workingIndicators.forEach(indicator => {
            if (code.includes(indicator)) score += 1;
        });
        
        return score >= 0;
    }
    
    applyIntelligentModifications(originalCode, modifications) {
        // Aplicar modificaciones inteligentes preservando estructura
        let modifiedCode = originalCode;
        
        // Aquí se implementarían las modificaciones específicas
        // Por ahora, retorna el código original con comentario de modificación
        
        return modifiedCode + '\n    // Función modificada automáticamente';
    }
    
    findAllCodeFiles() {
        const files = [];
        const extensions = ['.js', '.html'];
        
        function scanDir(dir) {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                if (entry.startsWith('.') || entry === 'node_modules') continue;
                
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
    
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🧠';
        console.log(`${prefix} [${this.systemId}] ${timestamp}: ${message}`);
    }
}

// ===== API PRINCIPAL =====

async function analyzeAndExecuteFunction(description, functionCode = null, targetFile = 'flashcard-app-final.js') {
    const manager = new IntelligentFunctionManager();
    
    try {
        // 1. Analizar solicitud
        const recommendation = await manager.analyzeFunctionRequest(description, targetFile);
        
        // 2. Si se proporciona código, ejecutar recomendación
        if (functionCode) {
            const result = await manager.executeRecommendation(recommendation, functionCode, targetFile);
            return { recommendation, result };
        }
        
        return { recommendation };
    } catch (error) {
        manager.log(`❌ Error: ${error.message}`, 'error');
        throw error;
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    const description = process.argv[2] || 'verificar formulario de usuario';
    analyzeAndExecuteFunction(description).then(console.log).catch(console.error);
}

module.exports = { IntelligentFunctionManager, analyzeAndExecuteFunction };

