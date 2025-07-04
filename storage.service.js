// storage.service.js - CÓDIGO LIMPIO Y FUNCIONAL
// Servicio de almacenamiento para decks y flashcards

const StorageService = {
    // Configuración
    prefix: 'studyingflash_',
    
    // Métodos básicos de almacenamiento
    save: function(key, data) {
        try {
            const fullKey = this.prefix + key;
            localStorage.setItem(fullKey, JSON.stringify(data));
            console.log('✅ Datos guardados:', key);
            return true;
        } catch (error) {
            console.error('❌ Error al guardar:', error);
            return false;
        }
    },

    load: function(key) {
        try {
            const fullKey = this.prefix + key;
            const data = localStorage.getItem(fullKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Error al cargar:', error);
            return null;
        }
    },

    remove: function(key) {
        try {
            const fullKey = this.prefix + key;
            localStorage.removeItem(fullKey);
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar:', error);
            return false;
        }
    },

    // GESTIÓN DE DECKS
    
    // Obtener todos los decks
    getDecks: function() {
        const decks = this.load('decks') || [];
        console.log('📚 Decks cargados:', decks.length);
        return decks;
    },

    // Obtener un deck por ID
    getDeck: function(deckId) {
        const decks = this.getDecks();
        const deck = decks.find(d => d.id === deckId);
        console.log('📖 Deck encontrado:', deck ? deck.nombre : 'No encontrado');
        return deck;
    },

    // Crear nuevo deck
    createDeck: function(deckData) {
        try {
            const decks = this.getDecks();
            
            const newDeck = {
                id: 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: deckData.name || 'Nuevo Deck',
                descripcion: deckData.descripcion || '',
                categoria: deckData.categoria || 'general',
                dificultad: deckData.dificultad || 'medio',
                public: deckData.public || false,
                fechaCreacion: new Date().toISOString(),
                autor: 'user_demo',
                flashcards: [],
                estadisticas: {
                    totalFlashcards: 0,
                    completadas: 0,
                    precision: 0,
                    tiempoPromedio: 0
                }
            };

            decks.push(newDeck);
            this.save('decks', decks);
            
            console.log('✅ Deck creado:', newDeck.nombre);
            return newDeck;
        } catch (error) {
            console.error('❌ Error al crear deck:', error);
            return null;
        }
    },

    // Actualizar deck
    updateDeck: function(deckId, updateData) {
        try {
            const decks = this.getDecks();
            const deckIndex = decks.findIndex(d => d.id === deckId);
            
            if (deckIndex === -1) {
                console.error('❌ Deck no encontrado:', deckId);
                return false;
            }

            // Actualizar campos
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    decks[deckIndex][key] = updateData[key];
                }
            });

            this.save('decks', decks);
            console.log('✅ Deck actualizado:', deckId);
            return decks[deckIndex];
        } catch (error) {
            console.error('❌ Error al actualizar deck:', error);
            return false;
        }
    },

    // Eliminar deck
    deleteDeck: function(deckId) {
        try {
            const decks = this.getDecks();
            const filteredDecks = decks.filter(d => d.id !== deckId);
            
            if (filteredDecks.length === decks.length) {
                console.error('❌ Deck no encontrado para eliminar:', deckId);
                return false;
            }

            this.save('decks', filteredDecks);
            
            // También eliminar flashcards del deck
            this.deleteFlashcardsByDeck(deckId);
            
            console.log('✅ Deck eliminado:', deckId);
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar deck:', error);
            return false;
        }
    },

    // GESTIÓN DE FLASHCARDS

    // Obtener todas las flashcards
    getFlashcards: function() {
        const flashcards = this.load('flashcards') || [];
        console.log('🃏 Flashcards cargadas:', flashcards.length);
        return flashcards;
    },

    // Obtener flashcards de un deck específico
    getFlashcardsByDeck: function(deckId) {
        const flashcards = this.getFlashcards();
        const deckFlashcards = flashcards.filter(f => f.deckId === deckId);
        console.log('🃏 Flashcards del deck', deckId + ':', deckFlashcards.length);
        return deckFlashcards;
    },

    // Obtener una flashcard por ID
    getFlashcard: function(flashcardId) {
        const flashcards = this.getFlashcards();
        const flashcard = flashcards.find(f => f.id === flashcardId);
        console.log('🃏 Flashcard encontrada:', flashcard ? 'Sí' : 'No');
        return flashcard;
    },

    // Crear nueva flashcard
    createFlashcard: function(flashcardData) {
        try {
            const flashcards = this.getFlashcards();
            
            const newFlashcard = {
                id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                deckId: flashcardData.deckId,
                frente: flashcardData.frente || '',
                reverso: flashcardData.reverso || '',
                dificultad: flashcardData.dificultad || 'medio',
                fechaCreacion: new Date().toISOString(),
                estadisticas: {
                    vecesEstudiada: 0,
                    vecesCorrecta: 0,
                    ultimaRevision: null,
                    proximaRevision: new Date().toISOString()
                }
            };

            flashcards.push(newFlashcard);
            this.save('flashcards', flashcards);
            
            // Actualizar estadísticas del deck
            this.updateDeckStats(flashcardData.deckId);
            
            console.log('✅ Flashcard creada para deck:', flashcardData.deckId);
            return newFlashcard;
        } catch (error) {
            console.error('❌ Error al crear flashcard:', error);
            return null;
        }
    },

    // Actualizar flashcard
    updateFlashcard: function(flashcardId, updateData) {
        try {
            const flashcards = this.getFlashcards();
            const flashcardIndex = flashcards.findIndex(f => f.id === flashcardId);
            
            if (flashcardIndex === -1) {
                console.error('❌ Flashcard no encontrada:', flashcardId);
                return false;
            }

            // Actualizar campos
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    flashcards[flashcardIndex][key] = updateData[key];
                }
            });

            this.save('flashcards', flashcards);
            console.log('✅ Flashcard actualizada:', flashcardId);
            return flashcards[flashcardIndex];
        } catch (error) {
            console.error('❌ Error al actualizar flashcard:', error);
            return false;
        }
    },

    // Eliminar flashcard
    deleteFlashcard: function(flashcardId) {
        try {
            const flashcards = this.getFlashcards();
            const flashcard = flashcards.find(f => f.id === flashcardId);
            
            if (!flashcard) {
                console.error('❌ Flashcard no encontrada para eliminar:', flashcardId);
                return false;
            }

            const filteredFlashcards = flashcards.filter(f => f.id !== flashcardId);
            this.save('flashcards', filteredFlashcards);
            
            // Actualizar estadísticas del deck
            this.updateDeckStats(flashcard.deckId);
            
            console.log('✅ Flashcard eliminada:', flashcardId);
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar flashcard:', error);
            return false;
        }
    },

    // Eliminar todas las flashcards de un deck
    deleteFlashcardsByDeck: function(deckId) {
        try {
            const flashcards = this.getFlashcards();
            const filteredFlashcards = flashcards.filter(f => f.deckId !== deckId);
            this.save('flashcards', filteredFlashcards);
            
            console.log('✅ Flashcards del deck eliminadas:', deckId);
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar flashcards del deck:', error);
            return false;
        }
    },

    // ESTADÍSTICAS Y UTILIDADES

    // Actualizar estadísticas de un deck
    updateDeckStats: function(deckId) {
        try {
            const deck = this.getDeck(deckId);
            if (!deck) return false;

            const flashcards = this.getFlashcardsByDeck(deckId);
            const totalFlashcards = flashcards.length;
            
            let completadas = 0;
            let totalCorrectas = 0;
            let totalEstudiadas = 0;

            flashcards.forEach(card => {
                if (card.estadisticas.vecesEstudiada > 0) {
                    completadas++;
                    totalCorrectas += card.estadisticas.vecesCorrecta;
                    totalEstudiadas += card.estadisticas.vecesEstudiada;
                }
            });

            const precision = totalEstudiadas > 0 ? totalCorrectas / totalEstudiadas : 0;

            const updatedStats = {
                estadisticas: {
                    totalFlashcards: totalFlashcards,
                    completadas: completadas,
                    precision: Math.round(precision * 100) / 100,
                    tiempoPromedio: 0 // Se actualizará con datos de sesiones
                }
            };

            this.updateDeck(deckId, updatedStats);
            console.log('✅ Estadísticas del deck actualizadas:', deckId);
            return true;
        } catch (error) {
            console.error('❌ Error al actualizar estadísticas:', error);
            return false;
        }
    },

    // Buscar decks
    searchDecks: function(query) {
        const decks = this.getDecks();
        const searchTerm = query.toLowerCase();
        
        return decks.filter(deck => 
            deck.nombre.toLowerCase().includes(searchTerm) ||
            deck.descripcion.toLowerCase().includes(searchTerm) ||
            deck.categoria.toLowerCase().includes(searchTerm)
        );
    },

    // Buscar flashcards
    searchFlashcards: function(query, deckId = null) {
        let flashcards = this.getFlashcards();
        
        if (deckId) {
            flashcards = flashcards.filter(f => f.deckId === deckId);
        }
        
        const searchTerm = query.toLowerCase();
        
        return flashcards.filter(card => 
            card.frente.toLowerCase().includes(searchTerm) ||
            card.reverso.toLowerCase().includes(searchTerm)
        );
    },

    // Obtener estadísticas generales
    getGeneralStats: function() {
        const decks = this.getDecks();
        const flashcards = this.getFlashcards();
        
        return {
            totalDecks: decks.length,
            totalFlashcards: flashcards.length,
            decksPublicos: decks.filter(d => d.publico).length,
            categorias: [...new Set(decks.map(d => d.categoria))],
            ultimaActividad: new Date().toISOString()
        };
    },

    // Exportar datos
    exportData: function() {
        try {
            const data = {
                decks: this.getDecks(),
                flashcards: this.getFlashcards(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('❌ Error al exportar datos:', error);
            return null;
        }
    },

    // Importar datos
    importData: function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.decks) {
                this.save('decks', data.decks);
            }
            
            if (data.flashcards) {
                this.save('flashcards', data.flashcards);
            }
            
            console.log('✅ Datos importados correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al importar datos:', error);
            return false;
        }
    },

    // Limpiar todos los datos
    clearAllData: function() {
        try {
            this.remove('decks');
            this.remove('flashcards');
            this.remove('sessions');
            this.remove('activity');
            this.remove('analytics');
            
            console.log('✅ Todos los datos eliminados');
            return true;
        } catch (error) {
            console.error('❌ Error al limpiar datos:', error);
            return false;
        }
    },

    // Inicializar con datos de ejemplo si no existen
    initializeIfEmpty: function() {
        const decks = this.getDecks();
        
        if (decks.length === 0) {
            console.log('📚 Inicializando con datos de ejemplo...');
            
            // Usar DataGeneratorService si está disponible
            if (typeof DataGeneratorService !== 'undefined') {
                DataGeneratorService.initializeSampleData();
            } else {
                // Crear datos básicos manualmente
                this.createBasicSampleData();
            }
        }
    },

    // Crear datos básicos de ejemplo
    createBasicSampleData: function() {
        // Crear deck de ejemplo
        const deck1 = this.createDeck({
            nombre: 'Vocabulario Inglés',
            descripcion: 'Palabras básicas en inglés',
            categoria: 'idiomas',
            publico: true
        });

        const deck2 = this.createDeck({
            nombre: 'Matemáticas Básicas',
            descripcion: 'Operaciones matemáticas fundamentales',
            categoria: 'matematicas',
            publico: false
        });

        // Crear flashcards de ejemplo
        if (deck1) {
            this.createFlashcard({
                deckId: deck1.id,
                frente: 'Hello',
                reverso: 'Hola'
            });
            
            this.createFlashcard({
                deckId: deck1.id,
                frente: 'Goodbye',
                reverso: 'Adiós'
            });
        }

        if (deck2) {
            this.createFlashcard({
                deckId: deck2.id,
                frente: '2 + 2 = ?',
                reverso: '4'
            });
            
            this.createFlashcard({
                deckId: deck2.id,
                frente: '5 × 3 = ?',
                reverso: '15'
            });
        }

        console.log('✅ Datos básicos de ejemplo creados');
    }
};

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
    
    // Inicializar automáticamente
    document.addEventListener('DOMContentLoaded', function() {
        StorageService.initializeIfEmpty();
    });
}

