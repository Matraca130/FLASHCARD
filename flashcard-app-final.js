// Sin módulos ES6 - Todo en un solo archivo
const CONFIG = {
    API_BASE_URL: 'https://flashcard-u10n.onrender.com/api',
    STORAGE_PREFIX: 'studyingflash_',
    DEBUG: true
};

// ===== UTILIDADES GLOBALES =====
const Utils = {
    log: (message, data = null) => {
        if (CONFIG.DEBUG) {
            console.log(`🔧 [StudyingFlash] ${message}`, data || '');
    error: (message, error = null) => {
        console.error(`❌ [StudyingFlash] ${message}`, error || '');
    },
    
    showNotification: (message, type = 'success') => {
        // Crear notificación visual
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
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
        return new Date(date).toLocaleDateString('es-ES');
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
            Utils.log(`API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
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
        
        const method = options.method || 'GET';
        const storageKey = `${CONFIG.STORAGE_PREFIX}${endpoint.replace(/\//g, '_')}`;
        
        switch (method) {
            case 'GET':
                const stored = localStorage.getItem(storageKey);
                return stored ? JSON.parse(stored) : [];
                
            case 'POST':
                const newData = JSON.parse(options.body);
                newData.id = Utils.generateId();
                newData.createdAt = new Date().toISOString();
                
                const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
                existing.push(newData);
                localStorage.setItem(storageKey, JSON.stringify(existing));
                
                return newData;
                
            case 'PUT':
                // Actualizar elemento existente
                const updateData = JSON.parse(options.body);
                const allItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
                const index = allItems.findIndex(item => item.id === updateData.id);
                
                if (index !== -1) {
                    allItems[index] = { ...allItems[index], ...updateData };
                    localStorage.setItem(storageKey, JSON.stringify(allItems));
                    return allItems[index];
                }
                return null;
                
            case 'DELETE':
                const deleteId = endpoint.split('/').pop();
                const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
                const filtered = items.filter(item => item.id !== deleteId);
                localStorage.setItem(storageKey, JSON.stringify(filtered));
                return { success: true };
                
            default:
                return null;
        }
    }
};

// ===== AUTH SERVICE =====
const AuthService = {
    async checkAuthStatus() {
        const token = this.getAuthToken();
        if (!token) {
            return;
        }

        try {
            const data = await ApiService.request('/auth/verify');
            if (data && data.user) {
                // Actualizar estado de usuario si hay un store
                if (window.updateAuthUI) {
                    window.updateAuthUI();
                }
                return data.user;
            } else {
                this.removeAuthToken();
                return null;
            }
        } catch (error) {
            Utils.error('Auth verification failed:', error);
            this.removeAuthToken();
            return null;
        }
    },

    async login(email, password) {
        if (!email || !password) {
            Utils.showNotification('Email y contraseña son requeridos', 'error');
            return false;
        }

        try {
            const result = await ApiService.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (result && result.token) {
                this.setAuthToken(result.token, result.refresh_token);
                
                if (window.updateAuthUI) {
                    window.updateAuthUI();
                }
                if (window.hideLoginModal) {
                    window.hideLoginModal();
                }

                Utils.showNotification('Sesión iniciada exitosamente');
                return result.user;
            }
        } catch (error) {
            Utils.error('Login failed:', error);
            Utils.showNotification('Error al iniciar sesión', 'error');
            return false;
        }
    },

    async register(email, password, confirmPassword, name = '') {
        if (!email || !password) {
            Utils.showNotification('Email y contraseña son requeridos', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            Utils.showNotification('Las contraseñas no coinciden', 'error');
            return false;
        }

        try {
            const result = await ApiService.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password, name })
            });

            if (result) {
                Utils.showNotification('Cuenta creada exitosamente');
                // Auto-login después del registro
                return await this.login(email, password);
            }
        } catch (error) {
            Utils.error('Registration failed:', error);
            Utils.showNotification('Error al crear la cuenta', 'error');
            return false;
        }
    },

    logout() {
        this.removeAuthToken();
        
        if (window.updateAuthUI) {
            window.updateAuthUI();
        }
        if (window.showSection) {
            window.showSection('inicio');
        }

        Utils.showNotification('Sesión cerrada', 'info');
    },

    getAuthToken() {
        return localStorage.getItem('authToken');
    },

    setAuthToken(token, refreshToken = null) {
        if (token) {
            localStorage.setItem('authToken', token);
        }
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }
    },

    removeAuthToken() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
    },

    isAuthenticated() {
        return !!this.getAuthToken();
    },

    getCurrentUser() {
        // Intentar obtener usuario del localStorage o estado global
        const userStr = localStorage.getItem('currentUser');

// ===== DECK SERVICE =====
const DeckService = {
    async getAll() {
        return await ApiService.request('/decks');
    },
    
    async create(deckData) {
        const deck = {
            name: deckData.name,
            description: deckData.description || '',
            isPublic: deckData.isPublic || false,
            category: deckData.category || 'general',
            flashcardCount: 0
        };
        
        const result = await ApiService.request('/decks', {
            method: 'POST',
            body: JSON.stringify(deck)
        });
        
        Utils.showNotification(`Deck "${deck.name}" creado exitosamente`);
        return result;
    },
    
    async update(id, deckData) {
        return await ApiService.request(`/decks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(deckData)
        });
    },
    
    async delete(id) {
        const result = await ApiService.request(`/decks/${id}`, {
            method: 'DELETE'
        });
        
        Utils.showNotification('Deck eliminado exitosamente');
        return result;
    }
};

// ===== FLASHCARD SERVICE =====
const FlashcardService = {
    async getByDeck(deckId) {
        return await ApiService.request(`/flashcards?deckId=${deckId}`);
    },
    
    async create(flashcardData) {
        const flashcard = {
            deckId: flashcardData.deckId,
            front: flashcardData.front,
            back: flashcardData.back,
            difficulty: 1,
            interval: 1,
            easeFactor: 2.5,
            nextReview: new Date().toISOString()
        };
        
        const result = await ApiService.request('/flashcards', {
            method: 'POST',
            body: JSON.stringify(flashcard)
        });
        
        Utils.showNotification('Flashcard creada exitosamente');
        return result;
    },
    
    async update(id, flashcardData) {
        return await ApiService.request(`/flashcards/${id}`, {
            method: 'PUT',
            body: JSON.stringify(flashcardData)
        });
    },
    
    async delete(id) {
        return await ApiService.request(`/flashcards/${id}`, {
            method: 'DELETE'
        });
    }
};

// ===== ALGORITMO SM-2 =====
const SM2Algorithm = {
    calculateNext(flashcard, quality) {
        // quality: 0-5 (0=total blackout, 5=perfect response)
        let { interval, easeFactor, repetitions } = flashcard;
        
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            repetitions++;
        } else {
            // Respuesta incorrecta
            repetitions = 0;
            interval = 1;
        }
        
        // Actualizar ease factor
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (easeFactor < 1.3) easeFactor = 1.3;
        
        // Calcular próxima revisión
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);
        
        return {
            interval,
            easeFactor,
            repetitions,
            nextReview: nextReview.toISOString(),
            lastReviewed: new Date().toISOString()
        };
    }
};

// ===== STUDY SERVICE =====
const StudyService = {
    async getFlashcardsForReview(deckId) {
        const flashcards = await FlashcardService.getByDeck(deckId);
        const now = new Date();
        
        // Filtrar flashcards que necesitan revisión
        return flashcards.filter(card => {
            const nextReview = new Date(card.nextReview);
            return nextReview <= now;
        });
    },
    
    async processAnswer(flashcardId, quality) {
        // Obtener flashcard actual
        const flashcards = await ApiService.request('/flashcards');
        const flashcard = flashcards.find(f => f.id === flashcardId);
        
        if (!flashcard) {
            throw new Error('Flashcard no encontrada');
        }
        
        // Calcular próxima revisión con SM-2
        const updates = SM2Algorithm.calculateNext(flashcard, quality);
        
        // Actualizar flashcard
        const updatedFlashcard = await FlashcardService.update(flashcardId, {
            ...flashcard,
            ...updates
        });
        
        Utils.log(`Flashcard actualizada con SM-2:`, updates);
        return updatedFlashcard;
    }
};

// ===== DASHBOARD SERVICE =====
const DashboardService = {
    async getStats() {
        try {
            const [decks, flashcards] = await Promise.all([
                DeckService.getAll(),
                ApiService.request('/flashcards')
            ]);
            
            const today = new Date().toDateString();
            const studiedToday = flashcards.filter(f => 
                f.lastReviewed && new Date(f.lastReviewed).toDateString() === today
            ).length;
            
            const totalFlashcards = flashcards.length;
            const accuracy = this.calculateAccuracy(flashcards);
            
            return {
                totalDecks: decks.length,
                totalFlashcards,
                studiedToday,
                accuracy,
                streak: this.calculateStreak(flashcards),
                studyTime: this.calculateStudyTime(flashcards)
            };
        } catch (error) {
            Utils.error('Error getting dashboard stats', error);
            return {
                totalDecks: 0,
                totalFlashcards: 0,
                studiedToday: 0,
                accuracy: 0,
                streak: 0,
                studyTime: 0
            };
        }
    },
    
    calculateAccuracy(flashcards) {
        const reviewed = flashcards.filter(f => f.lastReviewed);
        if (reviewed.length === 0) return 0;
        
        const correct = reviewed.filter(f => f.easeFactor >= 2.5).length;
        return Math.round((correct / reviewed.length) * 100);
    },
    
    calculateStreak(flashcards) {
        // Calcular racha de días consecutivos estudiando
        const dates = flashcards
            .filter(f => f.lastReviewed)
            .map(f => new Date(f.lastReviewed).toDateString())
            .filter((date, index, arr) => arr.indexOf(date) === index)
            .sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        const today = new Date().toDateString();
        
        for (let i = 0; i < dates.length; i++) {
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            
            if (dates[i] === expectedDate.toDateString()) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    },
    
    calculateStudyTime(flashcards) {
        // Estimar tiempo de estudio (2 minutos por flashcard revisada hoy)
        const today = new Date().toDateString();
        const studiedToday = flashcards.filter(f => 
            f.lastReviewed && new Date(f.lastReviewed).toDateString() === today
    }
};

// ===== UI CONTROLLERS =====
const UIController = {
    // Actualizar dashboard
    async updateDashboard() {
        Utils.log('Actualizando dashboard...');
        
        const stats = await DashboardService.getStats();
        
        // Actualizar elementos del DOM
        this.updateElement('.total-flashcards .stat-number', stats.totalFlashcards);
        this.updateElement('.studied-today .stat-number', stats.studiedToday);
        this.updateElement('.accuracy .stat-number', `${stats.accuracy}%`);
        this.updateElement('.streak .stat-number', stats.streak);
        this.updateElement('.study-time .stat-number', `${stats.studyTime}m`);
        
        Utils.log('Dashboard actualizado', stats);
    },
    
    // Cargar lista de decks
    async loadDecks() {
        Utils.log('Cargando decks...');
        
        const decks = await DeckService.getAll();
        const container = document.querySelector('.deck-grid, .decks-container, #decks-list');
        
        if (!container) {
            Utils.error('Contenedor de decks no encontrado');
            return;
        }
        
        if (decks.length === 0) {
            container.innerHTML = '<p class="no-decks">No hay decks creados. ¡Crea tu primer deck!</p>';
            return;
        }
        
        container.innerHTML = decks.map(deck => `
            <div class="deck-card" data-deck-id="${deck.id}">
                <h3>${deck.name}</h3>
                <p>${deck.description || 'Sin descripción'}</p>
                <div class="deck-stats">
                    <span>📚 ${deck.flashcardCount || 0} flashcards</span>
                    <span>📅 ${Utils.formatDate(deck.createdAt)}</span>
                </div>
                <div class="deck-actions">
                    <button onclick="StudyingFlash.startStudy('${deck.id}')" class="btn-study">Estudiar</button>
                    <button onclick="StudyingFlash.editDeck('${deck.id}')" class="btn-edit">Editar</button>
                </div>
            </div>
        `).join('');
        
        Utils.log(`${decks.length} decks cargados`);
    },
    
    // Cargar opciones de deck en select
    async loadDeckOptions() {
        const decks = await DeckService.getAll();
        const selects = document.querySelectorAll('select[name="deckId"], #deck-select');
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar deck...</option>' +
                decks.map(deck => `<option value="${deck.id}">${deck.name}</option>`).join('');
        });
    },
    
    // Utilidad para actualizar elementos del DOM
    updateElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    },
    
    // Limpiar formulario
    clearForm(formSelector) {
        const form = document.querySelector(formSelector);
        if (form) {
            form.reset();
        }
    }
};

// ===== MAIN APPLICATION OBJECT =====
const StudyingFlash = {
    // Inicializar aplicación
    async init() {
        Utils.log('🚀 Inicializando StudyingFlash...');
        
        try {
            // INICIALIZAR NAVEGACIÓN DE SECCIONES PRIMERO
            this.initializeSections();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Actualizar UI
            await UIController.updateDashboard();
            await UIController.loadDecks();
            await UIController.loadDeckOptions();
            
            Utils.log('✅ StudyingFlash inicializado correctamente');
            Utils.showNotification('Aplicación cargada correctamente');
            
        } catch (error) {
            Utils.error('Error inicializando aplicación', error);
            Utils.showNotification('Error al cargar la aplicación', 'error');
        }
    },
    
    // Inicializar navegación de secciones
    initializeSections() {
        Utils.log('Inicializando navegación de secciones...');
        
        // Ocultar todas las secciones excepto dashboard
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Mostrar solo dashboard por defecto
        const dashboardSection = document.querySelector('#dashboard');
        if (dashboardSection) {
            dashboardSection.classList.add('active');
            dashboardSection.style.display = 'block';
        }
        
        Utils.log('Navegación de secciones inicializada');
    },
    
    // Cargar datos iniciales
    async loadInitialData() {
        // Verificar conexión con backend
        try {
            await ApiService.request('/health');
            Utils.log('✅ Conexión con backend establecida');
        } catch (error) {
            Utils.log('⚠️ Backend no disponible, usando localStorage');
        }
    },
    
    // Configurar event listeners
    setupEventListeners() {
        // Formulario crear deck
        const createDeckForm = document.querySelector('#create-deck-form, .create-deck-form');
        if (createDeckForm) {
            createDeckForm.addEventListener('submit', this.handleCreateDeck.bind(this));
        }
        
        // Formulario crear flashcard
        const createFlashcardForm = document.querySelector('#create-flashcard-form, .create-flashcard-form');
        if (createFlashcardForm) {
            createFlashcardForm.addEventListener('submit', this.handleCreateFlashcard.bind(this));
        }
        
        // Navegación
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                this.navigateToSection(e.target.dataset.section);
            }
        });
        
        Utils.log('Event listeners configurados');
    },
    
    // Manejar creación de deck
    async handleCreateDeck(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const deckData = {
            name: formData.get('name'),
            description: formData.get('description'),
            isPublic: formData.get('isPublic') === 'on'
        };
        
        if (!deckData.name) {
            Utils.showNotification('El nombre del deck es requerido', 'error');
            return;
        }
        
        try {
            Utils.log('Creando deck...', deckData);
            
            await DeckService.create(deckData);
            
            // Actualizar UI
            await UIController.loadDecks();
            await UIController.loadDeckOptions();
            await UIController.updateDashboard();
            
            // Limpiar formulario
            UIController.clearForm('#create-deck-form, .create-deck-form');
            
        } catch (error) {
            Utils.error('Error creando deck', error);
            Utils.showNotification('Error al crear el deck', 'error');
        }
    },
    
    // Manejar creación de flashcard
    async handleCreateFlashcard(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const flashcardData = {
            deckId: formData.get('deckId'),
            front: formData.get('front'),
            back: formData.get('back')
        };
        
        if (!flashcardData.deckId || !flashcardData.front || !flashcardData.back) {
            Utils.showNotification('Todos los campos son requeridos', 'error');
            return;
        }
        
        try {
            Utils.log('Creando flashcard...', flashcardData);
            
            await FlashcardService.create(flashcardData);
            
            // Actualizar UI
            await UIController.loadDecks();
            await UIController.updateDashboard();
            
            // Limpiar formulario
            UIController.clearForm('#create-flashcard-form, .create-flashcard-form');
            
        } catch (error) {
            Utils.error('Error creando flashcard', error);
            Utils.showNotification('Error al crear la flashcard', 'error');
        }
    },
    
    // Iniciar sesión de estudio
    async startStudy(deckId) {
        try {
            const flashcards = await StudyService.getFlashcardsForReview(deckId);
            
            if (flashcards.length === 0) {
                Utils.showNotification('No hay flashcards para revisar en este deck');
                return;
            }
            
            Utils.log(`Iniciando estudio con ${flashcards.length} flashcards`);
            
            // Navegar a sección de estudio
            this.navigateToSection('estudiar');
            
            // Inicializar sesión de estudio
            this.currentStudySession = {
                deckId,
                flashcards,
                currentIndex: 0,
                answers: []
            };
            
            this.showCurrentFlashcard();
            
        } catch (error) {
            Utils.error('Error iniciando estudio', error);
            Utils.showNotification('Error al iniciar el estudio', 'error');
        }
    },
    
    // Mostrar flashcard actual
    showCurrentFlashcard() {
        if (!this.currentStudySession) return;
        
        const { flashcards, currentIndex } = this.currentStudySession;
        const flashcard = flashcards[currentIndex];
        
        if (!flashcard) {
            this.finishStudySession();
            return;
        }
        
        // Actualizar UI de estudio
        const frontElement = document.querySelector('.flashcard-front, #flashcard-front');
        const backElement = document.querySelector('.flashcard-back, #flashcard-back');
        const progressElement = document.querySelector('.study-progress');
        
        if (frontElement) frontElement.textContent = flashcard.front;
        if (backElement) backElement.textContent = flashcard.back;
        if (progressElement) {
            progressElement.textContent = `${currentIndex + 1} / ${flashcards.length}`;
        }
        
        Utils.log(`Mostrando flashcard ${currentIndex + 1}/${flashcards.length}`);
    },
    
    // Procesar respuesta de estudio
    async processStudyAnswer(quality) {
        if (!this.currentStudySession) return;
        
        const { flashcards, currentIndex } = this.currentStudySession;
        const flashcard = flashcards[currentIndex];
        
        try {
            // Procesar respuesta con algoritmo SM-2
            await StudyService.processAnswer(flashcard.id, quality);
            
            // Guardar respuesta
            this.currentStudySession.answers.push({
                flashcardId: flashcard.id,
                quality,
                timestamp: new Date().toISOString()
            });
            
            // Avanzar a siguiente flashcard
            this.currentStudySession.currentIndex++;
            this.showCurrentFlashcard();
            
        } catch (error) {
            Utils.error('Error procesando respuesta', error);
            Utils.showNotification('Error al procesar la respuesta', 'error');
        }
    },
    
    // Finalizar sesión de estudio
    async finishStudySession() {
        if (!this.currentStudySession) return;
        
        const { answers } = this.currentStudySession;
        
        Utils.log('Sesión de estudio completada', {
            totalAnswers: answers.length,
            correctAnswers: answers.filter(a => a.quality >= 3).length
        });
        
        Utils.showNotification(`¡Sesión completada! ${answers.length} flashcards revisadas`);
        
        // Actualizar dashboard
        await UIController.updateDashboard();
        
        // Limpiar sesión
        this.currentStudySession = null;
        
        // Navegar al dashboard
        this.navigateToSection('dashboard');
    },
    
    // Navegación entre secciones
    navigateToSection(sectionName) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.querySelector(`#${sectionName}, .${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        Utils.log(`Navegando a: ${sectionName}`);
    },
    
    // Editar deck
    async editDeck(deckId) {
        // Implementar edición de deck
        Utils.log(`Editando deck: ${deckId}`);
        Utils.showNotification('Función de edición en desarrollo');
    },
    
    // Refrescar datos
    async refresh() {
        Utils.log('Refrescando datos...');
        
        await UIController.updateDashboard();
        await UIController.loadDecks();
        await UIController.loadDeckOptions();
        
        Utils.showNotification('Datos actualizados');
    }
};

// ===== INICIALIZACIÓN AUTOMÁTICA =====
document.addEventListener('DOMContentLoaded', () => {
    Utils.log('DOM cargado, inicializando aplicación...');
    StudyingFlash.init();
});

// ===== EXPOSICIÓN GLOBAL =====
window.StudyingFlash = StudyingFlash;
window.Utils = Utils;

// ===== ESTILOS PARA NOTIFICACIONES =====
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
    }
    
    .notification:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(notificationStyles);

console.log('✅ StudyingFlash - Versión Integrada Completa Cargada');
console.log('🔗 Conectado con Render Backend:', CONFIG.API_BASE_URL);
console.log('📱 Funcionalidades disponibles:');
console.log('  - Crear y gestionar decks');
console.log('  - Crear y gestionar flashcards');

    
    // Agregar clase active a la sección seleccionada Y forzar display block
        Utils.log(`Sección mostrada: ${sectionName}`);
    }
    // Actualizar navegación activa
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    
    // Cargar datos específicos de cada sección
    switch (sectionName) {
        case 'dashboard':
            if (window.StudyingFlash && window.StudyingFlash.loadDashboardData) {
                window.StudyingFlash.loadDashboardData();
            }
            break;
        case 'estudiar':
            Utils.log('Cargando sección de estudio');
            break;
        case 'crear':
            Utils.log('Cargando sección de crear');
            break;
        case 'gestionar':
            Utils.log('Cargando sección de gestionar');
            break;
        case 'ranking':
            Utils.log('Cargando sección de ranking');
            break;
    }
}

// Función debounce para optimizar búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función generateActivityHeatmap para el dashboard
function generateActivityHeatmap() {
    Utils.log('Generando heatmap de actividad...');
    
    const heatmapContainer = document.querySelector('.activity-heatmap, #activity-heatmap');
    if (!heatmapContainer) {
        Utils.log('Contenedor de heatmap no encontrado');
        return;
    }
    
    // Generar datos de ejemplo para el heatmap
    const today = new Date();
    
    
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const activity = Math.floor(Math.random() * 5); // 0-4 niveles de actividad
        const dateStr = d.toISOString().split('T')[0];
        heatmapHTML += `
            <div class="heatmap-day activity-${activity}" 
                 data-date="${dateStr}" 
                 title="${dateStr}: ${activity} actividades">
            </div>
        `;
    }
    
    heatmapHTML += '</div>';
    heatmapContainer.innerHTML = heatmapHTML;
    
    Utils.log('Heatmap de actividad generado');
}

// Función para manejar la creación de decks
async function handleCreateDeck(event) {
    if (event) event.preventDefault();
    
    const nameInput = document.querySelector('input[placeholder*="Vocabulario"], #deck-name');
    const descriptionInput = document.querySelector('textarea[placeholder*="contenido"], #deck-description');
    const publicCheckbox = document.querySelector('input[type="checkbox"]');
    
    if (!nameInput || !descriptionInput) {
        Utils.error('Campos de formulario no encontrados');
        Utils.showNotification('Error: Formulario no encontrado', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    const isPublic = publicCheckbox ? publicCheckbox.checked : false;
    
    if (!name) {
        Utils.showNotification('Por favor, ingresa un nombre para el deck', 'error');
        return;
    }
    
    try {
        Utils.log('Creando deck...', { name, description, isPublic });
        
        const newDeck = await DeckService.create({
            name,
            description,
            is_public: isPublic
        });
        
        Utils.showNotification(`Deck "${name}" creado exitosamente`, 'success');
        
        // Limpiar formulario
        nameInput.value = '';
        descriptionInput.value = '';
        if (publicCheckbox) publicCheckbox.checked = false;
        
        // Actualizar UI
        await UIController.loadDecks();
        await UIController.loadDeckOptions();
        await UIController.updateDashboard();
        
        Utils.log('Deck creado exitosamente', newDeck);
        
    } catch (error) {
        Utils.error('Error creando deck', error);
        Utils.showNotification('Error al crear el deck', 'error');
    }
}

// Función para manejar la creación de flashcards
async function handleCreateFlashcard(event) {
    if (event) event.preventDefault();
    
    const deckSelect = document.querySelector('select[name="deckId"], #flashcard-deck');
    const frontInput = document.querySelector('textarea[placeholder*="pregunta"], #flashcard-front');
    const backInput = document.querySelector('textarea[placeholder*="respuesta"], #flashcard-back');
    
    if (!deckSelect || !frontInput || !backInput) {
        Utils.error('Campos de formulario de flashcard no encontrados');
        Utils.showNotification('Error: Formulario no encontrado', 'error');
        return;
    }
    
    const deckId = deckSelect.value;
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    
    if (!deckId || !front || !back) {
        Utils.showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    try {
        Utils.log('Creando flashcard...', { deckId, front, back });
        
        const newFlashcard = await FlashcardService.create({
            deck_id: parseInt(deckId),
            front,
            back
        });
        
        Utils.showNotification('Flashcard creada exitosamente', 'success');
        
        // Limpiar formulario
        frontInput.value = '';
        backInput.value = '';
        
        // Actualizar UI
        await UIController.updateDashboard();
        
        Utils.log('Flashcard creada exitosamente', newFlashcard);
        
    } catch (error) {
        Utils.error('Error creando flashcard', error);
        Utils.showNotification('Error al crear la flashcard', 'error');
    }
}

// Exponer funciones globalmente para compatibilidad con HTML
window.showSection = showSection;
window.debounce = debounce;
window.generateActivityHeatmap = generateActivityHeatmap;
window.handleCreateDeck = handleCreateDeck;
window.handleCreateFlashcard = handleCreateFlashcard;

Utils.log('✅ Funciones de compatibilidad agregadas');




function validateUserLogin(username, password) {
    }
    if (username.length < 3) {
        return { valid: false, error: 'Usuario muy corto' };
    }
    
    return { valid: true };
}

