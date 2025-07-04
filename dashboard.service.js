import { api } from './apiClient.js';
import { initializeCharts, updateProgressChart, updateAccuracyChart, updateChartPeriod } from '../charts.js';
import { generateActivityHeatmap, updateHeatmapWithData } from './activity-heatmap.service.js';

// Carga estadísticas y decks del usuario en el Dashboard
export async function loadDashboardData() {
  try {
    // Cargar estadísticas del usuario
    let stats;
    try {
      stats = await api('/api/stats');
    } catch (error) {
      console.log('API no disponible, usando datos de ejemplo');
      stats = {
        totalCards: 150,
        studiedToday: 25,
        accuracy: 78,
        streak: 5,
        totalCorrect: 120,
        totalIncorrect: 30,
        weeklyProgress: [12, 19, 15, 25, 22, 18, 30]
      };
    }
    
    // Actualizar estadísticas en la UI
    updateDashboardStats(stats);

    // Cargar decks del usuario
    let decks;
    try {
      decks = await api('/api/decks');
    } catch (error) {
      console.log('API no disponible, usando datos de ejemplo');
      decks = [
        { id: 1, name: 'Vocabulario Inglés', card_count: 50, last_studied: '2024-01-15' },
        { id: 2, name: 'Matemáticas Básicas', card_count: 30, last_studied: '2024-01-14' }
      ];
    }
    
    updateDashboardDecks(decks);
    
    // Inicializar gráficos con datos reales
    initializeChartsWithData(stats);
    
    // Generar heatmap de actividad
    generateActivityHeatmap();
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    if (window.showNotification) {
      window.showNotification('Error al cargar datos del dashboard', 'error');
    }
  }
}

/**
 * Actualiza las estadísticas del dashboard
 */
function updateDashboardStats(stats) {
  // Actualizar tarjetas de estadísticas
  const elements = {
    totalCards: document.querySelector('[data-stat="total-cards"]'),
    studiedToday: document.querySelector('[data-stat="studied-today"]'),
    accuracy: document.querySelector('[data-stat="accuracy"]'),
    streak: document.querySelector('[data-stat="streak"]')
  };
  
  if (elements.totalCards) elements.totalCards.textContent = stats.totalCards || 0;
  if (elements.studiedToday) elements.studiedToday.textContent = stats.studiedToday || 0;
  if (elements.accuracy) elements.accuracy.textContent = `${stats.accuracy || 0}%`;
  if (elements.streak) elements.streak.textContent = stats.streak || 0;
  
  // Llamar función global si existe (compatibilidad)
  if (window.updateDashboardStats) {
    window.updateDashboardStats(stats);
  }
}

/**
 * Actualiza la lista de decks en el dashboard
 */
function updateDashboardDecks(decks) {
  const deckContainer = document.getElementById('dashboard-decks');
  if (!deckContainer) return;
  
  if (!decks || decks.length === 0) {
    deckContainer.innerHTML = `
      <div class="empty-state">
        <p>No tienes decks creados aún.</p>
        <button onclick="window.showSection('crear')" class="btn btn-primary">
          Crear tu primer deck
        </button>
      </div>
    `;
    return;
  }
  
  deckContainer.innerHTML = decks.map(deck => `
    <div class="deck-card" onclick="startStudySession('${deck.id}')">
      <h3>${deck.name}</h3>
      <p>${deck.card_count || 0} cartas</p>
      <small>Última vez: ${deck.last_studied ? new Date(deck.last_studied).toLocaleDateString() : 'Nunca'}</small>
    </div>
  `).join('');
  
  // Llamar función global si existe (compatibilidad)
  if (window.updateDashboardDecks) {
    window.updateDashboardDecks(decks);
  }
}

/**
 * Inicializa los gráficos con datos reales
 */
function initializeChartsWithData(stats) {
  // Asegurar que los gráficos estén inicializados
  setTimeout(() => {
    initializeCharts();
    
    // Actualizar gráfico de progreso si hay datos
    if (stats.weeklyProgress) {
      updateProgressChart(stats.weeklyProgress);
    }
    
    // Actualizar gráfico de precisión
    if (stats.totalCorrect !== undefined && stats.totalIncorrect !== undefined) {
      updateAccuracyChart(stats.totalCorrect, stats.totalIncorrect);
    }
  }, 200);
}

/**
 * Maneja el cambio de período en los gráficos
 */
export function handlePeriodChange(period) {
  updateChartPeriod(period);
  
  // Actualizar botones activos
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[data-period="${period}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

/**
 * Carga datos de ranking/leaderboard
 */
export async function loadRankingData() {
  try {
    let rankingData;
    try {
      rankingData = await api('/api/ranking');
    } catch (error) {
      console.log('API no disponible, usando datos de ejemplo');
      rankingData = {
        userStats: {
          points: 1250,
          level: 5,
          streak: 7,
          achievements: 12
        },
        leaderboard: [
          { position: 1, username: 'StudyMaster', points: 2500, level: 8, streak: 15 },
          { position: 2, username: 'FlashGenius', points: 2200, level: 7, streak: 12 },
          { position: 3, username: 'CardWizard', points: 1800, level: 6, streak: 9 }
        ]
      };
    }
    
    updateRankingUI(rankingData);
    
  } catch (error) {
    console.error('Error loading ranking data:', error);
    if (window.showNotification) {
      window.showNotification('Error al cargar datos del ranking', 'error');
    }
  }
}

/**
 * Actualiza la UI del ranking
 */
function updateRankingUI(data) {
  // Actualizar estadísticas del usuario
  const userStats = data.userStats;
  const elements = {
    points: document.querySelector('[data-stat="user-points"]'),
    level: document.querySelector('[data-stat="user-level"]'),
    streak: document.querySelector('[data-stat="user-streak"]'),
    achievements: document.querySelector('[data-stat="user-achievements"]')
  };
  
  if (elements.points) elements.points.textContent = userStats.points || 0;
  if (elements.level) elements.level.textContent = userStats.level || 1;
  if (elements.streak) elements.streak.textContent = userStats.streak || 0;
  if (elements.achievements) elements.achievements.textContent = userStats.achievements || 0;
  
  // Actualizar leaderboard
  const leaderboardContainer = document.getElementById('leaderboard-table');
  if (leaderboardContainer && data.leaderboard) {
    const tbody = leaderboardContainer.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = data.leaderboard.map(user => `
        <tr>
          <td>${user.position}</td>
          <td>${user.username}</td>
          <td>${user.points}</td>
          <td>${user.level}</td>
          <td>${user.streak}</td>
        </tr>
      `).join('');
    }
  }
}

// Exponer funciones globalmente para compatibilidad
window.loadDashboardData = loadDashboardData;
window.handlePeriodChange = handlePeriodChange;
window.loadRankingData = loadRankingData;