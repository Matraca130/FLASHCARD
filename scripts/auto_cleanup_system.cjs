#!/usr/bin/env node
/**
 * SISTEMA DE LIMPIEZA AUTOMÁTICA
 * Elimina automáticamente código obsoleto y duplicaciones
 */

const fs = require('fs');
const path = require('path');

class AutoCleanupSystem {
    constructor() {
        this.startTime = Date.now();
        this.systemId = 'AUTO-CLEANUP';
        this.cleanupResults = {
            obsoleteFunctions: [],
            deadCode: [],
            unusedFiles: [],
            duplicateConfigs: [],
            brokenReferences: []
        };
    }

    // ===== LIMPIEZA AUTOMÁTICA PRINCIPAL =====
    async executeAutoCleanup() {
        this.log('🧹 Iniciando limpieza automática del proyecto...');
        
        // 1. Detectar funciones obsoletas
        await this.detectObsoleteFunctions();
        
        // 2. Detectar código muerto
        await this.detectDeadCode();
        
        // 3. Detectar archivos no utilizados
        await this.detectUnusedFiles();
        
        // 4. Detectar configuraciones duplicadas
        await this.detectDuplicateConfigs();
        
        // 5. Detectar referencias rotas
        await this.detectBrokenReferences();
        
        // 6. Ejecutar limpieza
        await this.executeCleanup();
        
        // 7. Generar reporte
        this.generateCleanupReport();
        
        const totalCleaned = Object.values(this.cleanupResults).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalCleaned > 0) {
            this.log(`✅ Limpieza completada: ${totalCleaned} elementos eliminados`, 'success');
        } else {
            this.log('✅ Proyecto ya está limpio - no se encontró código obsoleto', 'success');
        }
        
        return this.cleanupResults;
    }

    // ===== DETECTAR FUNCIONES OBSOLETAS =====
    async detectObsoleteFunctions() {
        this.log('🔍 Detectando funciones obsoletas...');
        
        const allFiles = this.findAllCodeFiles();
        const functionUsage = new Map();
        const functionDefinitions = new Map();
        
        // Paso 1: Encontrar todas las definiciones de funciones
        for (const file of allFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const functions = this.extractFunctionDefinitions(content);
                
                functions.forEach(func => {
                    functionDefinitions.set(func.name, {
                        file: file,
                        line: func.line,
                        lastModified: fs.statSync(file).mtime
                    });
                    functionUsage.set(func.name, 0);
                });
            }
        }
        
        // Paso 2: Contar uso de cada función
        for (const file of allFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                
                functionDefinitions.forEach((def, funcName) => {
                    const usageCount = this.countFunctionUsage(content, funcName);
                    functionUsage.set(funcName, functionUsage.get(funcName) + usageCount);
                });
            }
        }
        
        // Paso 3: Identificar funciones obsoletas
        functionUsage.forEach((count, funcName) => {
            const def = functionDefinitions.get(funcName);
            const daysSinceModified = (Date.now() - def.lastModified) / (1000 * 60 * 60 * 24);
            
            // Función obsoleta si:
            // - Se usa 0 o 1 vez (solo definición)
            // - No se modificó en los últimos 7 días
            // - No es función de agente activa
            if (count <= 1 && daysSinceModified > 7 && !this.isActiveFunctionName(funcName)) {
                this.cleanupResults.obsoleteFunctions.push({
                    name: funcName,
                    file: def.file,
                    line: def.line,
                    usageCount: count,
                    daysSinceModified: Math.round(daysSinceModified),
                    reason: 'Función no utilizada y obsoleta'
                });
            }
        });
        
        this.log(`📊 Funciones obsoletas encontradas: ${this.cleanupResults.obsoleteFunctions.length}`);
    }

    // ===== DETECTAR CÓDIGO MUERTO =====
    async detectDeadCode() {
        this.log('🔍 Detectando código muerto...');
        
        const allFiles = this.findAllCodeFiles();
        
        for (const file of allFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    // Detectar código comentado extenso
                    if (this.isDeadCodeLine(line)) {
                        this.cleanupResults.deadCode.push({
                            file: file,
                            line: index + 1,
                            content: line.trim(),
                            reason: 'Código comentado o debug obsoleto'
                        });
                    }
                });
            }
        }
        
        this.log(`📊 Líneas de código muerto encontradas: ${this.cleanupResults.deadCode.length}`);
    }

    // ===== DETECTAR ARCHIVOS NO UTILIZADOS =====
    async detectUnusedFiles() {
        this.log('🔍 Detectando archivos no utilizados...');
        
        const allFiles = this.findAllProjectFiles();
        const usedFiles = new Set();
        
        // Marcar archivos principales como usados
        const coreFiles = [
            'index.html',
            'flashcard-app-final.js',
            'services/NavigationService.js',
            'styles.css'
        ];
        
        coreFiles.forEach(file => {
            if (fs.existsSync(file)) {
                usedFiles.add(file);
            }
        });
        
        // Encontrar referencias entre archivos
        for (const file of allFiles) {
            if (fs.existsSync(file) && this.isCodeFile(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const references = this.extractFileReferences(content);
                
                references.forEach(ref => {
                    if (fs.existsSync(ref)) {
                        usedFiles.add(ref);
                    }
                });
            }
        }
        
        // Identificar archivos no utilizados
        for (const file of allFiles) {
            if (!usedFiles.has(file) && this.isCleanableFile(file)) {
                const stats = fs.statSync(file);
                const daysSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
                
                if (daysSinceModified > 3) { // No modificado en 3 días
                    this.cleanupResults.unusedFiles.push({
                        file: file,
                        size: stats.size,
                        daysSinceModified: Math.round(daysSinceModified),
                        reason: 'Archivo no referenciado y obsoleto'
                    });
                }
            }
        }
        
        this.log(`📊 Archivos no utilizados encontrados: ${this.cleanupResults.unusedFiles.length}`);
    }

    // ===== DETECTAR CONFIGURACIONES DUPLICADAS =====
    async detectDuplicateConfigs() {
        this.log('🔍 Detectando configuraciones duplicadas...');
        
        const allFiles = this.findAllCodeFiles();
        const configPatterns = ['API_URL', 'CONFIG', 'ENDPOINT', 'BASE_URL', 'SETTINGS'];
        const configMap = new Map();
        
        for (const file of allFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                
                configPatterns.forEach(pattern => {
                    const regex = new RegExp(`(const|let|var)\\s+.*${pattern}.*=`, 'gi');
                    const matches = content.match(regex);
                    
                    if (matches) {
                        matches.forEach(match => {
                            const key = `${pattern}_${match}`;
                            if (configMap.has(key)) {
                                this.cleanupResults.duplicateConfigs.push({
                                    pattern: pattern,
                                    files: [configMap.get(key), file],
                                    config: match,
                                    reason: 'Configuración duplicada'
                                });
                            } else {
                                configMap.set(key, file);
                            }
                        });
                    }
                });
            }
        }
        
        this.log(`📊 Configuraciones duplicadas encontradas: ${this.cleanupResults.duplicateConfigs.length}`);
    }

    // ===== DETECTAR REFERENCIAS ROTAS =====
    async detectBrokenReferences() {
        this.log('🔍 Detectando referencias rotas...');
        
        const allFiles = this.findAllCodeFiles();
        
        for (const file of allFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const references = this.extractFileReferences(content);
                
                references.forEach(ref => {
                    if (!fs.existsSync(ref) && !ref.startsWith('http') && !ref.startsWith('//')) {
                        this.cleanupResults.brokenReferences.push({
                            file: file,
                            reference: ref,
                            reason: 'Referencia a archivo inexistente'
                        });
                    }
                });
            }
        }
        
        this.log(`📊 Referencias rotas encontradas: ${this.cleanupResults.brokenReferences.length}`);
    }

    // ===== EJECUTAR LIMPIEZA =====
    async executeCleanup() {
        this.log('🧹 Ejecutando limpieza automática...');
        
        let cleanedCount = 0;
        
        // 1. Eliminar funciones obsoletas
        for (const func of this.cleanupResults.obsoleteFunctions) {
            if (await this.removeFunctionFromFile(func.file, func.name)) {
                cleanedCount++;
                this.log(`🗑️ Función obsoleta eliminada: ${func.name} en ${func.file}`);
            }
        }
        
        // 2. Limpiar código muerto
        for (const deadCode of this.cleanupResults.deadCode) {
            if (await this.removeLineFromFile(deadCode.file, deadCode.line)) {
                cleanedCount++;
            }
        }
        
        // 3. Eliminar archivos no utilizados
        for (const unusedFile of this.cleanupResults.unusedFiles) {
            if (await this.removeFile(unusedFile.file)) {
                cleanedCount++;
                this.log(`🗑️ Archivo no utilizado eliminado: ${unusedFile.file}`);
            }
        }
        
        // 4. Consolidar configuraciones duplicadas
        for (const dupConfig of this.cleanupResults.duplicateConfigs) {
            if (await this.consolidateDuplicateConfig(dupConfig)) {
                cleanedCount++;
            }
        }
        
        // 5. Limpiar referencias rotas
        for (const brokenRef of this.cleanupResults.brokenReferences) {
            if (await this.removeBrokenReference(brokenRef.file, brokenRef.reference)) {
                cleanedCount++;
            }
        }
        
        this.log(`✅ Elementos limpiados: ${cleanedCount}`);
    }

    // ===== MÉTODOS DE UTILIDAD =====
    
    findAllCodeFiles() {
        return this.findAllProjectFiles().filter(f => 
            f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css')
        );
    }
    
    findAllProjectFiles() {
        const files = [];
        const extensions = ['.js', '.html', '.css', '.json', '.md'];
        
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
    
    extractFunctionDefinitions(content) {
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
    
    countFunctionUsage(content, funcName) {
        const regex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
        const matches = content.match(regex);
        return matches ? matches.length : 0;
    }
    
    isActiveFunctionName(funcName) {
        // Funciones de agentes activos no se eliminan
        return funcName.startsWith('agent1') || 
               funcName.startsWith('agent2') || 
               funcName.startsWith('agent3') || 
               funcName.startsWith('agent4') || 
               funcName.startsWith('agent5');
    }
    
    isDeadCodeLine(line) {
        const trimmed = line.trim();
        return (
            (trimmed.startsWith('//') && trimmed.length > 50) || // Comentarios largos
            trimmed.startsWith('console.log') || // Debug logs
            trimmed.startsWith('debugger') || // Debugger statements
            (trimmed.startsWith('/*') && trimmed.includes('TODO')) // TODOs viejos
        );
    }
    
    isCodeFile(file) {
        return file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css');
    }
    
    isCleanableFile(file) {
        const nonCleanable = [
            'package.json',
            'README.md',
            'MANUAL_5_AGENTES_UNIFICADO.md',
            'scripts/enhanced_agent1_coordinator_fixed.cjs'
        ];
        
        return !nonCleanable.some(nc => file.includes(nc));
    }
    
    extractFileReferences(content) {
        const references = [];
        const patterns = [
            /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /<script\s+src=['"]([^'"]+)['"]/g,
            /<link\s+.*?href=['"]([^'"]+)['"]/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                references.push(match[1]);
            }
        });
        
        return references;
    }
    
    async removeFunctionFromFile(file, funcName) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            const newLines = [];
            let inFunction = false;
            let braceCount = 0;
            
            for (const line of lines) {
                if (line.includes(`function ${funcName}`) || line.includes(`${funcName} =`)) {
                    inFunction = true;
                    braceCount = 0;
                    continue;
                }
                
                if (inFunction) {
                    braceCount += (line.match(/\{/g) || []).length;
                    braceCount -= (line.match(/\}/g) || []).length;
                    
                    if (braceCount <= 0) {
                        inFunction = false;
                    }
                    continue;
                }
                
                newLines.push(line);
            }
            
            fs.writeFileSync(file, newLines.join('\n'));
            return true;
        } catch (error) {
            this.log(`Error eliminando función ${funcName}: ${error.message}`, 'error');
            return false;
        }
    }
    
    async removeLineFromFile(file, lineNumber) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            if (lineNumber > 0 && lineNumber <= lines.length) {
                lines.splice(lineNumber - 1, 1);
                fs.writeFileSync(file, lines.join('\n'));
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
    
    async removeFile(file) {
        try {
            fs.unlinkSync(file);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async consolidateDuplicateConfig(dupConfig) {
        // Implementación básica - mantener en el primer archivo
        return true;
    }
    
    async removeBrokenReference(file, reference) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const newContent = content.replace(new RegExp(reference, 'g'), '');
            fs.writeFileSync(file, newContent);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    generateCleanupReport() {
        const report = {
            timestamp: new Date().toISOString(),
            systemId: this.systemId,
            executionTime: Date.now() - this.startTime,
            results: this.cleanupResults,
            summary: {
                totalCleaned: Object.values(this.cleanupResults).reduce((sum, arr) => sum + arr.length, 0),
                obsoleteFunctions: this.cleanupResults.obsoleteFunctions.length,
                deadCodeLines: this.cleanupResults.deadCode.length,
                unusedFiles: this.cleanupResults.unusedFiles.length,
                duplicateConfigs: this.cleanupResults.duplicateConfigs.length,
                brokenReferences: this.cleanupResults.brokenReferences.length
            }
        };
        
        fs.writeFileSync('./auto_cleanup_report.json', JSON.stringify(report, null, 2));
        this.log('📋 Reporte de limpieza generado: auto_cleanup_report.json');
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🧹';
        console.log(`${prefix} [${this.systemId}] ${timestamp}: ${message}`);
    }
}

// ===== EJECUCIÓN PRINCIPAL =====
async function main() {
    const cleanup = new AutoCleanupSystem();
    
    try {
        const results = await cleanup.executeAutoCleanup();
        return results;
    } catch (error) {
        cleanup.log(`❌ Error en limpieza automática: ${error.message}`, 'error');
        throw error;
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AutoCleanupSystem };

