// ===== CONFIGURACIÓN GLOBAL =====
const CONFIG = {
    API_BASE_URL: "https://flashcard-u10n.onrender.com/api",
    STORAGE_PREFIX: "studyingflash_",
    DEBUG: true
};

// ===== UTILIDADES GLOBALES =====
const Utils = {
    log: (message, data = null) => {
        if (CONFIG.DEBUG) {
            console.log(`🔧 [StudyingFlash] ${message}`, data || "");
        }
    },
    
    error: (message, error = null) => {
        console.error(`❌ [StudyingFlash] ${message}`, error || "");
    },
    
    showNotification: (message, type = "success") => {
        // Crear notificación visual
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "success" ? "#10b981" : "#ef4444"};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    formatDate: (date) => {
        return new Date(date).toLocaleDateString("es-ES");
    },

    // Función debounce para optimizar búsquedas
    debounce: (func, delay) => {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },

    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// ===== API SERVICE =====
const ApiService = {
    // Hacer petición con fallback a localStorage
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        try {
            Utils.log(`API Request: ${options.method || "GET"} ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            Utils.log(`API Response:`, data);
            return data;
            
        } catch (error) {
            Utils.error(`API Error: ${endpoint}`, error);
            
            // Fallback a localStorage para desarrollo
            return this.fallbackToLocalStorage(endpoint, options);
        }
    },
    
    // Fallback cuando la API no está disponible
    fallbackToLocalStorage(endpoint, options) {
        Utils.log(`Using localStorage fallback for: ${endpoint}`);
        
        const method = options.method || "GET";
        const storageKey = `${CONFIG.STORAGE_PREFIX}${endpoint.replace(/\//g, "_")}`;
        
        switch (method) {
            case "GET":
                const stored = localStorage.getItem(storageKey);
                return stored ? JSON.parse(stored) : [];
                
            case "POST":
                const newData = JSON.parse(options.body);
                newData.id = Utils.generateId();
                newData.createdAt = new Date().toISOString();
                
                const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
                existing.push(newData);
                localStorage.setItem(storageKey, JSON.stringify(existing));
                
                return newData;
                
            case "PUT":
                // Actualizar elemento existente
                const updateData = JSON.parse(options.body);
                const allItems = JSON.parse(localStorage.getItem(storageKey) || "[]");
                const index = allItems.findIndex(item => item.id === updateData.id);
                
                if (index !== -1) {
                    allItems[index] = { ...allItems[index], ...updateData };
                    localStorage.setItem(storageKey, JSON.stringify(allItems));
                    return allItems[index];
                }
                return null;
                
            case "DELETE":
                const deleteId = endpoint.split("/").pop();
                const items = JSON.parse(localStorage.getItem(storageKey) || "[]");
                const filtered = items.filter(item => item.id !== deleteId);
                localStorage.setItem(storageKey, JSON.stringify(filtered));
                return { success: true };
                
            default:
                return null;
        }
    },

    // Métodos específicos para la API
    async get(endpoint) {
        return this.request(endpoint, { method: "GET" });
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: "POST",
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: "PUT",
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: "DELETE" });
    }
};

// ===== CLASE PRINCIPAL (MANTENIDA DE app-functional.js) =====
class StudyingFlashApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.decks = JSON.parse(localStorage.getItem('studyingflash_decks') || '[]');
        this.flashcards = JSON.parse(localStorage.getItem('studyingflash_flashcards') || '[]');
        this.stats = JSON.parse(localStorage.getItem('studyingflash_stats') || '{}');
        
        this.init();
    }

    init() {
        console.log('🚀 StudyingFlash App iniciando...');
        Utils.log('App inicializando con capacidades API');
        this.setupEventListeners();
        this.showSection('dashboard');
        this.updateStats();
        console.log('✅ App inicializada correctamente');
    }

    setupEventListeners() {
        // Navegación principal
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Navegación Apple mobile
        document.querySelectorAll('.apple-nav-item[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.getAttribute('data-section');
                this.showSection(section);
                this.closeMobileMenu();
            });
        });

        // Botón crear deck
        const createDeckBtn = document.getElementById('create-deck-btn');
        if (createDeckBtn) {
            createDeckBtn.addEventListener('click', () => this.createDeck());
        }

        // Botón crear flashcard
        const createFlashcardBtn = document.getElementById('create-flashcard-btn');
        if (createFlashcardBtn) {
            createFlashcardBtn.addEventListener('click', () => this.createFlashcard());
        }

        // Menú móvil
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const appleMenuBtn = document.getElementById('apple-menu-btn');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        if (appleMenuBtn) {
            appleMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Cerrar menú móvil al hacer clic fuera
        document.addEventListener('click', (e) => {
            const mobileMenu = document.querySelector('.mobile-menu');
            const menuBtn = document.getElementById('mobile-menu-btn');
            
            if (mobileMenu && mobileMenu.classList.contains('active') && 
                !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    }

    showSection(sectionName) {
        Utils.log(`Navegando a sección: ${sectionName}`);
        
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });

        // Mostrar la sección solicitada
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
        }

        // Actualizar navegación activa
        document.querySelectorAll('[data-section]').forEach(link => {
            link.classList.remove('active');
        });

        // Marcar como activo el enlace correspondiente
        const activeLinks = document.querySelectorAll(`[data-section="${sectionName}"]`);
        activeLinks.forEach(link => {
            link.classList.add('active');
        });

        // Cargar contenido específico de la sección
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'crear':
                this.loadCreateSection();
                break;
            case 'estudiar':
                this.loadStudySection();
                break;
            case 'estadisticas':
                this.loadStatsSection();
                break;
            case 'configuracion':
                this.loadConfigSection();
                break;
        }

        // Cerrar menú móvil si está abierto
        this.closeMobileMenu();
    }

    toggleMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.toggle('active');
        }
    }

    closeMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.remove('active');
        }
    }

    loadDashboard() {
        Utils.log('Cargando dashboard');
        this.updateDecksList();
        this.updateStats();
    }

    loadCreateSection() {
        Utils.log('Cargando sección crear');
        this.updateDeckOptions();
    }

    loadStudySection() {
        Utils.log('Cargando sección estudiar');
        this.updateStudyDecks();
    }

    loadStatsSection() {
        Utils.log('Cargando estadísticas');
        this.updateStatsSection();
    }

    loadConfigSection() {
        Utils.log('Cargando configuración');
        // Configuración específica si es necesaria
    }

    // ===== GESTIÓN DE DECKS (CON CAPACIDADES API) =====
    async createDeck() {
        const nameInput = document.getElementById('deck-name');
        const descriptionInput = document.getElementById('deck-description');
        
        if (!nameInput || !descriptionInput) {
            Utils.error('Elementos de formulario no encontrados');
            return;
        }

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!name) {
            Utils.showNotification('El nombre del deck es requerido', 'error');
            return;
        }

        const newDeck = {
            id: Utils.generateId(),
            name: name,
            description: description,
            createdAt: new Date().toISOString(),
            flashcards: [],
            stats: {
                total: 0,
                studied: 0,
                mastered: 0
            }
        };

        try {
            // Intentar guardar en API primero
            const savedDeck = await ApiService.post('/decks', newDeck);
            Utils.log('Deck guardado en API', savedDeck);
            
            // Actualizar localStorage como backup
            this.decks.push(savedDeck);
            localStorage.setItem('studyingflash_decks', JSON.stringify(this.decks));
            
            Utils.showNotification('Deck creado exitosamente', 'success');
            
        } catch (error) {
            // Fallback a localStorage
            Utils.log('Usando fallback localStorage para deck');
            this.decks.push(newDeck);
            localStorage.setItem('studyingflash_decks', JSON.stringify(this.decks));
            Utils.showNotification('Deck creado (modo offline)', 'success');
        }

        // Limpiar formulario
        nameInput.value = '';
        descriptionInput.value = '';

        // Actualizar UI
        this.updateDecksList();
        this.updateDeckOptions();
    }

    async createFlashcard() {
        const deckSelect = document.getElementById('flashcard-deck');
        const frontInput = document.getElementById('flashcard-front');
        const backInput = document.getElementById('flashcard-back');
        
        if (!deckSelect || !frontInput || !backInput) {
            Utils.error('Elementos de formulario no encontrados');
            return;
        }

        const deckId = deckSelect.value;
        const front_content = {
            text: frontInput.value.trim(),
            image_url: null,
            audio_url: null,
            video_url: null
        };
        const back_content = {
            text: backInput.value.trim(),
            image_url: null,
            audio_url: null,
            video_url: null
        };

        if (!deckId || !front_content.text || !back_content.text) {
            Utils.showNotification('Todos los campos son requeridos', 'error');
            return;
        }

        const newFlashcard = {
            id: Utils.generateId(),
            deckId: deckId,
            front_content: front_content,
            back_content: back_content,
            createdAt: new Date().toISOString(),
            algorithm_data: {
                algorithm_type: 'sm2',
                ease_factor: 2.5,
                interval: 1,
                repetitions: 0,
                next_review: new Date().toISOString()
            }
        };

        try {
            // Intentar guardar en API
            const savedFlashcard = await ApiService.post('/flashcards', newFlashcard);
            Utils.log('Flashcard guardado en API', savedFlashcard);
            
            // Actualizar localStorage
            this.flashcards.push(savedFlashcard);
            localStorage.setItem('studyingflash_flashcards', JSON.stringify(this.flashcards));
            
            Utils.showNotification('Flashcard creado exitosamente', 'success');
            
        } catch (error) {
            // Fallback a localStorage
            Utils.log('Usando fallback localStorage para flashcard');
            this.flashcards.push(newFlashcard);
            localStorage.setItem('studyingflash_flashcards', JSON.stringify(this.flashcards));
            Utils.showNotification('Flashcard creado (modo offline)', 'success');
        }

        // Limpiar formulario
        frontInput.value = '';
        backInput.value = '';

        // Actualizar estadísticas del deck
        this.updateDeckStats(deckId);
    }

    updateDecksList() {
        const decksList = document.getElementById('decks-list');
        if (!decksList) return;

        if (this.decks.length === 0) {
            decksList.innerHTML = '<p class="no-decks">No tienes decks creados aún. ¡Crea tu primer deck!</p>';
            return;
        }

        decksList.innerHTML = this.decks.map(deck => {
            const flashcardsCount = this.flashcards.filter(card => card.deckId === deck.id).length;
            return `
                <div class="deck-card" data-deck-id="${deck.id}">
                    <div class="deck-header">
                        <h3>${deck.name}</h3>
                        <div class="deck-actions">
                            <button onclick="app.editDeck('${deck.id}')" class="btn-edit">✏️</button>
                            <button onclick="app.deleteDeck('${deck.id}')" class="btn-delete">🗑️</button>
                        </div>
                    </div>
                    <p class="deck-description">${deck.description || 'Sin descripción'}</p>
                    <div class="deck-stats">
                        <span class="stat">📚 ${flashcardsCount} tarjetas</span>
                        <span class="stat">📅 ${Utils.formatDate(deck.createdAt)}</span>
                    </div>
                    <div class="deck-actions-bottom">
                        <button onclick="app.startStudySession('${deck.id}')" class="btn-study">Estudiar</button>
                        <button onclick="app.showSection('crear')" class="btn-add-card">+ Agregar tarjeta</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateDeckOptions() {
        const deckSelect = document.getElementById('flashcard-deck');
        if (!deckSelect) return;

        if (this.decks.length === 0) {
            deckSelect.innerHTML = '<option value="">Primero crea un deck</option>';
            deckSelect.disabled = true;
            return;
        }

        deckSelect.disabled = false;
        deckSelect.innerHTML = '<option value="">Selecciona un deck</option>' +
            this.decks.map(deck => `<option value="${deck.id}">${deck.name}</option>`).join('');
    }

    updateStudyDecks() {
        const studyDecks = document.getElementById('study-decks');
        if (!studyDecks) return;

        if (this.decks.length === 0) {
            studyDecks.innerHTML = '<p class="no-decks">No tienes decks para estudiar. ¡Crea algunos primero!</p>';
            return;
        }

        studyDecks.innerHTML = this.decks.map(deck => {
            const deckFlashcards = this.flashcards.filter(card => card.deckId === deck.id);
            const readyToReview = deckFlashcards.filter(card => 
                new Date(card.algorithm_data.next_review) <= new Date()
            ).length;

            return `
                <div class="study-deck-card">
                    <h3>${deck.name}</h3>
                    <p>${deck.description || 'Sin descripción'}</p>
                    <div class="study-stats">
                        <span>📚 ${deckFlashcards.length} total</span>
                        <span>⏰ ${readyToReview} para revisar</span>
                    </div>
                    <button onclick="app.startStudySession('${deck.id}')" 
                            class="btn-study" 
                            ${deckFlashcards.length === 0 ? 'disabled' : ''}>
                        ${deckFlashcards.length === 0 ? 'Sin tarjetas' : 'Estudiar'}
                    </button>
                </div>
            `;
        }).join('');
    }

    // ===== SESIÓN DE ESTUDIO =====
    startStudySession(deckId) {
        Utils.log(`Iniciando sesión de estudio para deck: ${deckId}`);
        
        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) {
            Utils.showNotification('Deck no encontrado', 'error');
            return;
        }

        const deckFlashcards = this.flashcards.filter(card => card.deckId === deckId);
        if (deckFlashcards.length === 0) {
            Utils.showNotification('Este deck no tiene tarjetas', 'error');
            return;
        }

        // Filtrar tarjetas que necesitan revisión
        const cardsToReview = deckFlashcards.filter(card => 
            new Date(card.algorithm_data.next_review) <= new Date()
        );

        if (cardsToReview.length === 0) {
            Utils.showNotification('No hay tarjetas para revisar en este momento', 'info');
            return;
        }

        // Inicializar sesión de estudio
        this.currentStudySession = {
            deckId: deckId,
            deckName: deck.name,
            cards: cardsToReview,
            currentCardIndex: 0,
            isFlipped: false,
            stats: {
                total: cardsToReview.length,
                correct: 0,
                incorrect: 0
            }
        };

        this.showStudyCard();
        this.showSection('study-session');
    }

    showStudyCard() {
        if (!this.currentStudySession) return;

        const session = this.currentStudySession;
        const currentCard = session.cards[session.currentCardIndex];

        if (!currentCard) {
            this.endStudySession();
            return;
        }

        // Actualizar UI de la tarjeta
        const cardContainer = document.getElementById('study-card-container');
        if (cardContainer) {
            cardContainer.innerHTML = `
                <div class="study-card ${session.isFlipped ? 'flipped' : ''}">
                    <div class="card-front">
                        <div class="card-content">
                            ${currentCard.front_content.text}
                        </div>
                        <button onclick="app.flipCard()" class="btn-flip">Ver respuesta</button>
                    </div>
                    <div class="card-back">
                        <div class="card-content">
                            ${currentCard.back_content.text}
                        </div>
                        <div class="evaluation-buttons">
                            <button onclick="app.evaluateCard(1)" class="btn-eval btn-again">Otra vez</button>
                            <button onclick="app.evaluateCard(2)" class="btn-eval btn-hard">Difícil</button>
                            <button onclick="app.evaluateCard(3)" class="btn-eval btn-good">Bien</button>
                            <button onclick="app.evaluateCard(4)" class="btn-eval btn-easy">Fácil</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Actualizar progreso
        const progressInfo = document.getElementById('study-progress');
        if (progressInfo) {
            progressInfo.innerHTML = `
                <span>Tarjeta ${session.currentCardIndex + 1} de ${session.total}</span>
                <span>Deck: ${session.deckName}</span>
            `;
        }
    }

    flipCard() {
        if (!this.currentStudySession) return;
        
        this.currentStudySession.isFlipped = true;
        this.showStudyCard();
    }

    evaluateCard(difficulty) {
        if (!this.currentStudySession || !this.currentStudySession.isFlipped) return;

        const session = this.currentStudySession;
        const currentCard = session.cards[session.currentCardIndex];

        // Actualizar algoritmo de repetición espaciada
        this.updateSpacedRepetition(currentCard, difficulty);

        // Actualizar estadísticas de la sesión
        if (difficulty >= 3) {
            session.stats.correct++;
        } else {
            session.stats.incorrect++;
        }

        // Avanzar a la siguiente tarjeta
        session.currentCardIndex++;
        session.isFlipped = false;

        if (session.currentCardIndex >= session.cards.length) {
            this.endStudySession();
        } else {
            this.showStudyCard();
        }
    }

    updateSpacedRepetition(card, difficulty) {
        const algorithmData = card.algorithm_data;
        
        // Algoritmo SM-2 simplificado
        if (difficulty >= 3) {
            algorithmData.repetitions++;
            algorithmData.ease_factor = Math.max(1.3, 
                algorithmData.ease_factor + (0.1 - (5 - difficulty) * (0.08 + (5 - difficulty) * 0.02))
            );
            
            if (algorithmData.repetitions === 1) {
                algorithmData.interval = 1;
            } else if (algorithmData.repetitions === 2) {
                algorithmData.interval = 6;
            } else {
                algorithmData.interval = Math.round(algorithmData.interval * algorithmData.ease_factor);
            }
        } else {
            algorithmData.repetitions = 0;
            algorithmData.interval = 1;
        }

        // Calcular próxima revisión
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + algorithmData.interval);
        algorithmData.next_review = nextReview.toISOString();

        // Guardar cambios
        this.saveFlashcard(card);
    }

    async saveFlashcard(flashcard) {
        try {
            // Intentar guardar en API
            await ApiService.put(`/flashcards/${flashcard.id}`, flashcard);
            Utils.log('Flashcard actualizado en API');
        } catch (error) {
            Utils.log('Usando fallback localStorage para actualizar flashcard');
        }

        // Actualizar localStorage
        const index = this.flashcards.findIndex(card => card.id === flashcard.id);
        if (index !== -1) {
            this.flashcards[index] = flashcard;
            localStorage.setItem('studyingflash_flashcards', JSON.stringify(this.flashcards));
        }
    }

    endStudySession() {
        if (!this.currentStudySession) return;

        const session = this.currentStudySession;
        
        // Mostrar resumen de la sesión
        Utils.showNotification(
            `Sesión completada: ${session.stats.correct}/${session.stats.total} correctas`, 
            'success'
        );

        // Actualizar estadísticas globales
        this.updateGlobalStats(session.stats);

        // Limpiar sesión
        this.currentStudySession = null;

        // Volver al dashboard
        this.showSection('dashboard');
    }

    // ===== ESTADÍSTICAS =====
    updateStats() {
        const totalDecks = this.decks.length;
        const totalFlashcards = this.flashcards.length;
        const studiedToday = this.getStudiedToday();

        // Actualizar elementos de estadísticas en el dashboard
        const statsElements = {
            'total-decks': totalDecks,
            'total-flashcards': totalFlashcards,
            'studied-today': studiedToday
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateStatsSection() {
        // Implementar estadísticas detalladas
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;

        const stats = this.calculateDetailedStats();
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Decks Totales</h3>
                    <div class="stat-number">${stats.totalDecks}</div>
                </div>
                <div class="stat-card">
                    <h3>Tarjetas Totales</h3>
                    <div class="stat-number">${stats.totalFlashcards}</div>
                </div>
                <div class="stat-card">
                    <h3>Estudiadas Hoy</h3>
                    <div class="stat-number">${stats.studiedToday}</div>
                </div>
                <div class="stat-card">
                    <h3>Racha Actual</h3>
                    <div class="stat-number">${stats.currentStreak} días</div>
                </div>
            </div>
        `;
    }

    calculateDetailedStats() {
        return {
            totalDecks: this.decks.length,
            totalFlashcards: this.flashcards.length,
            studiedToday: this.getStudiedToday(),
            currentStreak: this.getCurrentStreak()
        };
    }

    getStudiedToday() {
        const today = new Date().toDateString();
        return this.flashcards.filter(card => {
            const lastReview = new Date(card.algorithm_data.next_review);
            return lastReview.toDateString() === today;
        }).length;
    }

    getCurrentStreak() {
        // Implementar lógica de racha
        return this.stats.currentStreak || 0;
    }

    updateGlobalStats(sessionStats) {
        if (!this.stats.totalSessions) this.stats.totalSessions = 0;
        if (!this.stats.totalCorrect) this.stats.totalCorrect = 0;
        if (!this.stats.totalAnswered) this.stats.totalAnswered = 0;

        this.stats.totalSessions++;
        this.stats.totalCorrect += sessionStats.correct;
        this.stats.totalAnswered += sessionStats.total;
        this.stats.lastStudyDate = new Date().toISOString();

        localStorage.setItem('studyingflash_stats', JSON.stringify(this.stats));
    }

    updateDeckStats(deckId) {
        const deckFlashcards = this.flashcards.filter(card => card.deckId === deckId);
        const deck = this.decks.find(d => d.id === deckId);
        
        if (deck) {
            deck.stats = {
                total: deckFlashcards.length,
                studied: deckFlashcards.filter(card => card.algorithm_data.repetitions > 0).length,
                mastered: deckFlashcards.filter(card => card.algorithm_data.repetitions >= 3).length
            };
            
            localStorage.setItem('studyingflash_decks', JSON.stringify(this.decks));
        }
    }

    // ===== GESTIÓN DE DECKS =====
    editDeck(deckId) {
        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) return;

        const newName = prompt('Nuevo nombre del deck:', deck.name);
        if (newName && newName.trim()) {
            deck.name = newName.trim();
            localStorage.setItem('studyingflash_decks', JSON.stringify(this.decks));
            this.updateDecksList();
            Utils.showNotification('Deck actualizado', 'success');
        }
    }

    async deleteDeck(deckId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este deck y todas sus tarjetas?')) {
            return;
        }

        try {
            // Intentar eliminar de API
            await ApiService.delete(`/decks/${deckId}`);
            Utils.log('Deck eliminado de API');
        } catch (error) {
            Utils.log('Usando fallback localStorage para eliminar deck');
        }

        // Eliminar de localStorage
        this.decks = this.decks.filter(deck => deck.id !== deckId);
        this.flashcards = this.flashcards.filter(card => card.deckId !== deckId);
        
        localStorage.setItem('studyingflash_decks', JSON.stringify(this.decks));
        localStorage.setItem('studyingflash_flashcards', JSON.stringify(this.flashcards));

        this.updateDecksList();
        this.updateDeckOptions();
        Utils.showNotification('Deck eliminado', 'success');
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    Utils.log('DOM cargado, inicializando app');
    
    // Crear instancia global de la app
    window.app = new StudyingFlashApp();
    
    // Exponer funciones globales para onclick en HTML
    window.showSection = (sectionName) => app.showSection(sectionName);
    window.startStudySession = (deckId) => app.startStudySession(deckId);
    window.editDeck = (deckId) => app.editDeck(deckId);
    window.deleteDeck = (deckId) => app.deleteDeck(deckId);
    window.createDeck = () => app.createDeck();
    window.createFlashcard = () => app.createFlashcard();
    window.flipCard = () => app.flipCard();
    window.evaluateCard = (difficulty) => app.evaluateCard(difficulty);
    window.exitStudySession = () => app.endStudySession();
    window.startNewSession = () => app.loadStudySection(); // Assuming this is for starting a new session from summary
    console.log('✅ App inicializada y expuesta globalmente');
});

// Hacer la app accesible globalmente para debugging
window.StudyingFlashApp = StudyingFlashApp;
window.CONFIG = CONFIG;
window.Utils = Utils;
window.ApiService = ApiService;

