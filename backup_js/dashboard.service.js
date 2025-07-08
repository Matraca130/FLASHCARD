import { api } from './apiClient.js';
import stateManager from './state-manager.js';
import {
  initializeCharts,
  updateChart,
  updateProgressChart,
  updateAccuracyChart,
  updateChartPeriod,
} from './charts.js';
import {
  generateActivityHeatmap,
  updateHeatmapWithData,
} from './activity-heatmap.service.js';
import {
  multipleApiWithFallback,
  apiWithFallback,
  FALLBACK_DATA,
} from './utils/apiHelpers.js';
import {
  showNotification,
  formatDate,
  formatRelativeDate,
  renderEmptyDecksState,
} from './utils/helpers.js';

/**
 * Carga estadísticas y decks del usuario en el Dashboard
 */
export async function loadDashboardData() {
  try {
    console.log('📊 Cargando datos del dashboard desde state manager...');
    
    // Obtener datos del state manager
    const state = stateManager.getState();
    const decks = state.decks;
    const userStats = state.userStats;
    
    console.log('📊 Datos obtenidos:', { decks, userStats });

    // Actualizar UI con datos del state manager
    updateDashboardStats(userStats);
    updateDashboardDecks(decks);

    // Inicializar gráficos con datos reales
    initializeChartsWithData(userStats);

    // Generar heatmap de actividad
    await loadAndUpdateActivityHeatmap();
    
    console.log('✅ Dashboard actualizado con datos reales');
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showNotification('Error al cargar datos del dashboard', 'error');
  }
}

/**
 * Carga datos específicos de estadísticas
 * @returns {Promise<Object>} - Estadísticas del usuario
 */
export async function loadUserStats() {
  try {
    const userStats = stateManager.get('userStats');
    updateDashboardStats(userStats);
    return userStats;
  } catch (error) {
    console.error('Error loading user stats:', error);
    showNotification('Error al cargar estadísticas', 'error');
    return stateManager.get('userStats') || FALLBACK_DATA.stats;
  }
}

/**
 * Carga datos específicos de decks
 * @returns {Promise<Array>} - Array de decks del usuario
 */
export async function loadUserDecks() {
  try {
    const decks = stateManager.getDecks();
    updateDashboardDecks(decks);
    return decks;
  } catch (error) {
    console.error('Error loading user decks:', error);
    showNotification('Error al cargar decks', 'error');
    return [];
  }
}

/**
 * Carga estadísticas semanales
 * @returns {Promise<Object>} - Estadísticas semanales
 */
export async function loadWeeklyStats() {
  try {
    const weeklyStats = await apiWithFallback('/api/dashboard/stats/weekly', {
      weeklyProgress: [12, 19, 15, 25, 22, 18, 30],
      weeklyAccuracy: [75, 80, 85, 78, 82, 88, 90],
      totalStudyTime: 420, // minutos
    });

    // Atualizar gráficos com dados semanais
    if (weeklyStats.weeklyProgress) {
      updateProgressChart(
        {
          labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
          progress: weeklyStats.weeklyProgress,
          target: 85,
        },
        '7d'
      );
    }

    if (weeklyStats.weeklyAccuracy) {
      updateAccuracyChart(
        {
          labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
          accuracy: weeklyStats.weeklyAccuracy,
          target: 85,
        },
        '7d'
      );
    }

    return weeklyStats;
  } catch (error) {
    console.error('Error loading weekly stats:', error);
    return null;
  }
}

/**
 * Actualiza las estadísticas del dashboard
 * @param {Object} stats - Estadísticas a mostrar
 */
function updateDashboardStats(stats) {
  if (!stats) {
    return;
  }

  // Actualizar tarjetas de estadísticas usando selectores mejorados
  const statElements = {
    totalCards:
      document.querySelector('[data-stat="total-cards"]') ||
      document.getElementById('total-cards'),
    studiedToday:
      document.querySelector('[data-stat="studied-today"]') ||
      document.getElementById('studied-today'),
    accuracy:
      document.querySelector('[data-stat="accuracy"]') ||
      document.getElementById('accuracy'),
    streak:
      document.querySelector('[data-stat="streak"]') ||
      document.getElementById('streak'),
  };

  // Actualizar elementos con validación
  Object.entries(statElements).forEach(([key, element]) => {
    if (element && stats[key] !== undefined) {
      const value = key === 'accuracy' ? `${stats[key]}%` : stats[key];
      element.textContent = value;

      // Agregar animación de actualización
      element.classList.add('stat-updated');
      setTimeout(() => element.classList.remove('stat-updated'), 500);
    }
  });

  // Actualizar elementos adicionales
  updateAdditionalStats(stats);

  // Llamar función global si existe (compatibilidad)
  if (window.updateDashboardStats) {
    window.updateDashboardStats(stats);
  }
}

/**
 * Actualiza estadísticas adicionales
 * @param {Object} stats - Estadísticas del usuario
 */
function updateAdditionalStats(stats) {
  // Actualizar progreso total
  const totalCorrect = stats.totalCorrect || 0;
  const totalIncorrect = stats.totalIncorrect || 0;
  const totalAnswered = totalCorrect + totalIncorrect;

  const progressElement = document.getElementById('total-progress');
  if (progressElement && totalAnswered > 0) {
    const accuracyPercent = Math.round((totalCorrect / totalAnswered) * 100);
    progressElement.textContent = `${totalCorrect}/${totalAnswered} (${accuracyPercent}%)`;
  }

  // Actualizar tiempo de estudio
  const studyTimeElement = document.getElementById('study-time');
  if (studyTimeElement && stats.totalStudyTime) {
    const hours = Math.floor(stats.totalStudyTime / 60);
    const minutes = stats.totalStudyTime % 60;
    studyTimeElement.textContent = `${hours}h ${minutes}m`;
  }
}

/**
 * Actualiza la lista de decks en el dashboard
 * @param {Array} decks - Array de decks del usuario
 */
function updateDashboardDecks(decks) {
  if (!Array.isArray(decks)) {
    return;
  }

  const decksList =
    document.getElementById('dashboard-decks-list') ||
    document.querySelector('.decks-list') ||
    document.querySelector('[data-section="decks"]');

  if (!decksList) {
    return;
  }

  if (decks.length === 0) {
    renderEmptyDecksState(decksList);
    return;
  }

  // Generar HTML para cada deck
  const decksHTML = decks
    .map(
      (deck) => `
    <div class="deck-card" data-deck-id="${deck.id}">
      <div class="deck-header">
        <h3 class="deck-name">${deck.name || 'Sin nombre'}</h3>
        <span class="deck-count">${deck.card_count || 0} tarjetas</span>
      </div>
      <div class="deck-info">
        <p class="deck-description">${deck.description || 'Sin descripción'}</p>
        <p class="deck-last-studied">
          Último estudio: ${formatRelativeDate(deck.last_studied)}
        </p>
      </div>
      <div class="deck-actions">
        <button onclick="startStudySession(${deck.id})" class="btn btn-primary btn-sm">
          Estudiar
        </button>
        <button onclick="window.showSection('gestionar')" class="btn btn-secondary btn-sm">
          Gestionar
        </button>
      </div>
    </div>
  `
    )
    .join('');

  decksList.innerHTML = decksHTML;

  // Llamar función global si existe (compatibilidad)
  if (window.updateDashboardDecks) {
    window.updateDashboardDecks(decks);
  }
}

/**
 * Inicializa gráficos con datos del usuario
 * @param {Object} stats - Estadísticas del usuario
 */
function initializeChartsWithData(stats) {
  try {
    // Inicializar gráficos base
    initializeCharts();

    // Actualizar con datos reales
    if (stats.weeklyProgress) {
      updateProgressChart(
        {
          labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
          progress: stats.weeklyProgress,
          target: 85,
        },
        '7d'
      );
    }

    if (stats.weeklyAccuracy) {
      updateAccuracyChart(
        {
          labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
          accuracy: stats.weeklyAccuracy,
          target: 85,
        },
        '7d'
      );
    }

    // Cargar estadísticas semanales adicionales
    loadWeeklyStats();
  } catch (error) {
    console.error('Error initializing charts:', error);
  }
}

/**
 * Carga y actualiza el heatmap de actividad
 */
async function loadAndUpdateActivityHeatmap() {
  try {
    const activityData = await apiWithFallback(
      '/api/dashboard/stats/heatmap',
      generateMockActivityData()
    );

    // Generar heatmap base
    generateActivityHeatmap();

    // Actualizar con datos reales
    if (activityData && updateHeatmapWithData) {
      updateHeatmapWithData(activityData);
    }
  } catch (error) {
    console.error('Error loading activity heatmap:', error);
    // Generar heatmap con datos mock
    generateActivityHeatmap();
  }
}

/**
 * Genera datos mock para el heatmap de actividad
 * @returns {Array} - Array de datos de actividad
 */
function generateMockActivityData() {
  const data = [];
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 10),
      level: Math.floor(Math.random() * 5),
    });
  }

  return data;
}

/**
 * Actualiza el período de los gráficos
 * @param {string} period - Período a mostrar ('week', 'month', 'year')
 */
export async function updateDashboardPeriod(period) {
  try {
    // Actualizar gráficos con nuevo período
    if (updateChartPeriod) {
      updateChartPeriod(period);
    }

    // Cargar datos específicos del período
    const periodStats = await apiWithFallback(
      `/api/dashboard/stats/${period}`,
      FALLBACK_DATA.stats
    );

    updateDashboardStats(periodStats);
  } catch (error) {
    console.error('Error updating dashboard period:', error);
    showNotification('Error al actualizar período', 'error');
  }
}

/**
 * Refresca todos los datos del dashboard
 */
export async function refreshDashboard() {
  try {
    showNotification('Actualizando dashboard...', 'info', 1000);
    await loadDashboardData();
    showNotification('Dashboard actualizado', 'success');
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    showNotification('Error al actualizar dashboard', 'error');
  }
}

// Exponer funciones globalmente para compatibilidad
window.loadDashboardData = loadDashboardData;
window.refreshDashboard = refreshDashboard;
window.updateDashboardPeriod = updateDashboardPeriod;
