// data-generator.service.js - CÓDIGO LIMPIO Y FUNCIONAL
// Generador de datos para testing y desarrollo

const DataGeneratorService = {
    // Configuración
    currentDate: new Date(),
    
    // Datos base para generar contenido realista
    deckTemplates: [
        {
            nombre: 'Vocabulario Inglés',
            descripcion: 'Palabras esenciales en inglés para principiantes',
            categoria: 'idiomas',
            dificultad: 'medio'
        },
        {
            nombre: 'Matemáticas Básicas',
            descripcion: 'Conceptos fundamentales de matemáticas',
            categoria: 'matematicas',
            dificultad: 'facil'
        },
        {
            nombre: 'Historia Universal',
            descripcion: 'Eventos importantes de la historia mundial',
            categoria: 'historia',
            dificultad: 'dificil'
        }
    ],

    flashcardTemplates: {
        'idiomas': [
            { frente: 'Hello', reverso: 'Hola' },
            { frente: 'Goodbye', reverso: 'Adiós' },
            { frente: 'Thank you', reverso: 'Gracias' },
            { frente: 'Please', reverso: 'Por favor' },
            { frente: 'Water', reverso: 'Agua' }
        ],
        'matematicas': [
            { frente: '2 + 2 = ?', reverso: '4' },
            { frente: '5 × 3 = ?', reverso: '15' },
            { frente: '10 ÷ 2 = ?', reverso: '5' },
            { frente: '√16 = ?', reverso: '4' },
            { frente: '3² = ?', reverso: '9' }
        ],
        'historia': [
            { frente: '¿En qué año comenzó la Segunda Guerra Mundial?', reverso: '1939' },
            { frente: '¿Quién descubrió América?', reverso: 'Cristóbal Colón' },
            { frente: '¿En qué año cayó el Muro de Berlín?', reverso: '1989' },
            { frente: '¿Cuál fue la primera civilización?', reverso: 'Mesopotamia' },
            { frente: '¿En qué año llegó el hombre a la Luna?', reverso: '1969' }
        ]
    },

    // Generar datos de sesiones de estudio
    generateStudySessionsData: function(days = 30) {
        const sessions = [];
        
        for (let i = 0; i < days; i++) {
            const date = new Date(this.currentDate);
            date.setDate(date.getDate() - i);
            
            // 70% probabilidad de tener sesión
            if (Math.random() > 0.3) {
                const numSessions = Math.floor(Math.random() * 3) + 1;
                
                for (let j = 0; j < numSessions; j++) {
                    sessions.push(this.generateSingleSession(date, j));
                }
            }
        }
        
        return sessions.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    },

    // Generar una sesión individual
    generateSingleSession: function(date, sessionIndex) {
        const startHour = 8 + sessionIndex * 4 + Math.floor(Math.random() * 3);
        const startDate = new Date(date);
        startDate.setHours(startHour, Math.floor(Math.random() * 60));
        
        const duration = 600 + Math.floor(Math.random() * 1800); // 10-40 minutos
        const endDate = new Date(startDate.getTime() + duration * 1000);
        
        const numCards = Math.floor(Math.random() * 20) + 5;
        const correctAnswers = Math.floor(numCards * (0.6 + Math.random() * 0.35));
        
        return {
            id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            deckId: 'deck_' + (Math.floor(Math.random() * 3) + 1),
            usuarioId: 'user_demo',
            fechaInicio: startDate.toISOString(),
            fechaFin: endDate.toISOString(),
            tipoSesion: 'estudio',
            progreso: {
                cartasCompletadas: numCards,
                cartasCorrectas: correctAnswers,
                cartasIncorrectas: numCards - correctAnswers,
                tiempoTotal: duration,
                tiempoPromedio: Math.round(duration / numCards)
            },
            respuestas: this.generateResponses(numCards, correctAnswers),
            metricas: {
                precision: Math.round((correctAnswers / numCards) * 100) / 100,
                velocidadPromedio: Math.round(duration / numCards),
                puntosGanados: correctAnswers * 10,
                rachaMaxima: Math.floor(Math.random() * 8) + 1
            }
        };
    },

    // Generar respuestas individuales
    generateResponses: function(total, correct) {
        const responses = [];
        const difficulties = ['facil', 'medio', 'dificil'];
        
        for (let i = 0; i < total; i++) {
            responses.push({
                flashcardId: 'card_' + (i + 1),
                respuesta: i < correct ? 'correcta' : 'incorrecta',
                dificultadReportada: difficulties[Math.floor(Math.random() * 3)],
                tiempoRespuesta: Math.round((2 + Math.random() * 8) * 10) / 10,
                timestamp: new Date().toISOString(),
                intentos: Math.random() > 0.8 ? 2 : 1
            });
        }
        
        return responses;
    },

    // Generar datos para heatmap de actividad
    generateActivityHeatmapData: function(year = new Date().getFullYear()) {
        const data = [];
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            // 60% probabilidad de actividad
            if (Math.random() > 0.4) {
                const sessions = Math.floor(Math.random() * 4) + 1;
                const timeTotal = sessions * (600 + Math.random() * 1200);
                const cardsStudied = sessions * (10 + Math.floor(Math.random() * 15));
                
                data.push({
                    fecha: d.toISOString().split('T')[0],
                    sesiones: sessions,
                    tiempoTotal: Math.round(timeTotal),
                    cartasEstudiadas: cardsStudied,
                    precision: Math.round((0.7 + Math.random() * 0.25) * 100) / 100
                });
            }
        }
        
        return data;
    },

    // Generar métricas de decks
    generateDeckMetrics: function() {
        return this.deckTemplates.map((template, index) => ({
            deckId: 'deck_' + (index + 1),
            nombre: template.nombre,
            descripcion: template.descripcion,
            categoria: template.categoria,
            estadisticas: {
                totalSesiones: Math.floor(Math.random() * 50) + 10,
                tiempoTotalEstudio: Math.floor(Math.random() * 36000) + 7200,
                cartasTotales: Math.floor(Math.random() * 80) + 20,
                cartasNuevas: Math.floor(Math.random() * 15) + 5,
                cartasEnAprendizaje: Math.floor(Math.random() * 30) + 10,
                cartasRevisadas: Math.floor(Math.random() * 35) + 5,
                precisionPromedio: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
                dificultadPromedio: Math.round((1.5 + Math.random() * 1) * 10) / 10,
                ultimaSesion: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            tendencias: {
                precisionUltimos7Dias: Array.from({length: 7}, () => 
                    Math.round((0.7 + Math.random() * 0.25) * 100) / 100
                ),
                tiempoUltimos7Dias: Array.from({length: 7}, () => 
                    Math.round(600 + Math.random() * 1200)
                ),
                sesionesUltimos30Dias: Array.from({length: 30}, () => 
                    Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0
                )
            }
        }));
    },

    // Generar analytics de usuario
    generateUserAnalytics: function() {
        return {
            usuarioId: 'user_demo',
            estadisticasGlobales: {
                tiempoTotalEstudio: Math.round(72000 + Math.random() * 36000),
                sesionesTotales: 120 + Math.floor(Math.random() * 80),
                cartasEstudiadas: 1500 + Math.floor(Math.random() * 1000),
                decksCompletados: 8 + Math.floor(Math.random() * 5),
                precisionGlobal: Math.round((0.8 + Math.random() * 0.15) * 100) / 100,
                rachaMaxima: 15 + Math.floor(Math.random() * 15),
                rachaActual: Math.floor(Math.random() * 10),
                nivel: 5 + Math.floor(Math.random() * 8),
                puntosTotal: 2500 + Math.floor(Math.random() * 3000)
            },
            patrones: {
                horaPreferida: 14 + Math.floor(Math.random() * 6),
                diaPreferido: Math.floor(Math.random() * 7),
                duracionSesionPromedio: Math.round(900 + Math.random() * 600),
                frecuenciaEstudio: Math.round((0.6 + Math.random() * 0.3) * 100) / 100,
                categoriaFavorita: ['idiomas', 'matematicas', 'ciencias'][Math.floor(Math.random() * 3)],
                dificultadPreferida: ['facil', 'medio', 'dificil'][Math.floor(Math.random() * 3)]
            },
            tendencias: {
                precisionUltimos30Dias: Array.from({length: 30}, () => 
                    Math.round((0.7 + Math.random() * 0.25) * 100) / 100
                ),
                tiempoUltimos30Dias: Array.from({length: 30}, () => 
                    Math.round(600 + Math.random() * 1200)
                ),
                actividadUltimos365Dias: Array.from({length: 365}, () => 
                    Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0
                )
            }
        };
    },

    // Generar decks completos con flashcards
    generateCompleteDecks: function() {
        return this.deckTemplates.map((template, index) => {
            const deckId = 'deck_' + (index + 1);
            const flashcards = this.flashcardTemplates[template.categoria] || [];
            
            return {
                id: deckId,
                nombre: template.nombre,
                descripcion: template.descripcion,
                categoria: template.categoria,
                dificultad: template.dificultad,
                publico: Math.random() > 0.5,
                fechaCreacion: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                autor: 'user_demo',
                flashcards: flashcards.map((card, cardIndex) => ({
                    id: deckId + '_card_' + (cardIndex + 1),
                    deckId: deckId,
                    frente: card.frente,
                    reverso: card.reverso,
                    dificultad: template.dificultad,
                    fechaCreacion: new Date().toISOString(),
                    estadisticas: {
                        vecesEstudiada: Math.floor(Math.random() * 20),
                        vecesCorrecta: Math.floor(Math.random() * 15),
                        ultimaRevision: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                        proximaRevision: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
                    }
                })),
                estadisticas: {
                    totalFlashcards: flashcards.length,
                    completadas: Math.floor(flashcards.length * (0.6 + Math.random() * 0.3)),
                    precision: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
                    tiempoPromedio: Math.round(600 + Math.random() * 600)
                }
            };
        });
    },

    // Generar datos para gráficos específicos
    generateChartData: function(type, period = 'week') {
        switch (type) {
            case 'progress':
                return this.generateProgressData(period);
            case 'accuracy':
                return this.generateAccuracyData(period);
            case 'time':
                return this.generateTimeData(period);
            case 'difficulty':
                return this.generateDifficultyData();
            default:
                return this.generateProgressData(period);
        }
    },

    // Datos para gráfico de progreso
    generateProgressData: function(period) {
        const periods = {
            'week': { days: 7, labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
            'month': { days: 30, labels: Array.from({length: 30}, (_, i) => (i + 1).toString()) },
            'year': { days: 12, labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] }
        };
        
        const config = periods[period] || periods.week;
        
        return {
            labels: config.labels,
            values: Array.from({length: config.days}, () => Math.floor(Math.random() * 50) + 10),
            type: 'line',
            color: '#6366f1'
        };
    },

    // Datos para gráfico de precisión
    generateAccuracyData: function(period) {
        const periods = {
            'week': { days: 7, labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
            'month': { days: 30, labels: Array.from({length: 30}, (_, i) => (i + 1).toString()) },
            'year': { days: 12, labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] }
        };
        
        const config = periods[period] || periods.week;
        
        return {
            labels: config.labels,
            values: Array.from({length: config.days}, () => Math.round((70 + Math.random() * 25))),
            type: 'area',
            color: '#10b981'
        };
    },

    // Datos para gráfico de tiempo
    generateTimeData: function(period) {
        const periods = {
            'week': { days: 7, labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
            'month': { days: 30, labels: Array.from({length: 30}, (_, i) => (i + 1).toString()) },
            'year': { days: 12, labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] }
        };
        
        const config = periods[period] || periods.week;
        
        return {
            labels: config.labels,
            values: Array.from({length: config.days}, () => Math.round((20 + Math.random() * 60))),
            type: 'bar',
            color: '#f59e0b'
        };
    },

    // Datos para gráfico de dificultad
    generateDifficultyData: function() {
        return {
            labels: ['Fácil', 'Medio', 'Difícil'],
            values: [
                Math.floor(Math.random() * 30) + 20,
                Math.floor(Math.random() * 40) + 30,
                Math.floor(Math.random() * 20) + 10
            ],
            type: 'pie',
            colors: ['#10b981', '#f59e0b', '#ef4444']
        };
    },

    // Inicializar datos de ejemplo en localStorage
    initializeSampleData: function() {
        try {
            // Generar y guardar decks
            const decks = this.generateCompleteDecks();
            localStorage.setItem('studyingflash_decks', JSON.stringify(decks));
            
            // Generar y guardar sesiones
            const sessions = this.generateStudySessionsData(30);
            localStorage.setItem('studyingflash_sessions', JSON.stringify(sessions));
            
            // Generar y guardar actividad
            const activity = this.generateActivityHeatmapData();
            localStorage.setItem('studyingflash_activity', JSON.stringify(activity));
            
            // Generar y guardar analytics
            const analytics = this.generateUserAnalytics();
            localStorage.setItem('studyingflash_analytics', JSON.stringify(analytics));
            
            console.log('✅ Datos de ejemplo inicializados correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar datos:', error);
            return false;
        }
    },

    // Obtener datos desde localStorage
    getData: function(type) {
        try {
            const data = localStorage.getItem('studyingflash_' + type);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al obtener datos:', error);
            return null;
        }
    },

    // Guardar datos en localStorage
    saveData: function(type, data) {
        try {
            localStorage.setItem('studyingflash_' + type, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error al guardar datos:', error);
            return false;
        }
    }
};

// Inicializar datos automáticamente si no existen
if (typeof window !== 'undefined') {
    // Solo ejecutar en el navegador
    document.addEventListener('DOMContentLoaded', function() {
        if (!localStorage.getItem('studyingflash_decks')) {
            DataGeneratorService.initializeSampleData();
        }
    });
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.DataGeneratorService = DataGeneratorService;
}

