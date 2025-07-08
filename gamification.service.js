import { ApiClient } from './apiClient.js';
import { store } from './store/store.js';
import {
  apiWithFallback,
  performCrudOperation,
  FALLBACK_DATA,
} from './utils/apiHelpers.js';
import { showNotification } from './utils/helpers.js';

// Configuración de gamificación
const GAMIFICATION_CONFIG = {
  points: {
    again: 2,
    hard: 5,
    good: 8,
    easy: 10,
    speedBonus: 5,
    streakMultiplier: 1.5,
    perfectSessionBonus: 20,
  },
  levels: {
    1: { min: 0, max: 100, title: 'Principiante' },
    2: { min: 100, max: 300, title: 'Estudiante' },
    3: { min: 300, max: 600, title: 'Aprendiz' },
    4: { min: 600, max: 1000, title: 'Competente' },
    5: { min: 1000, max: 1500, title: 'Experto' },
    6: { min: 1500, max: 2500, title: 'Maestro' },
    7: { min: 2500, max: 4000, title: 'Gran Maestro' },
    8: { min: 4000, max: 6000, title: 'Leyenda' },
    9: { min: 6000, max: 10000, title: 'Mítico' },
    10: { min: 10000, max: Infinity, title: 'Inmortal' },
  },
  achievements: {
    first_study: {
      name: 'Primera Sesión',
      description: 'Completa tu primera sesión de estudio',
      points: 50,
    },
    streak_7: {
      name: 'Semana Perfecta',
      description: 'Estudia 7 días consecutivos',
      points: 100,
    },
    streak_30: {
      name: 'Mes Dedicado',
      description: 'Estudia 30 días consecutivos',
      points: 500,
    },
    perfect_session: {
      name: 'Sesión Perfecta',
      description: 'Responde correctamente todas las tarjetas',
      points: 100,
    },
    speed_demon: {
      name: 'Demonio de Velocidad',
      description: 'Responde 10 tarjetas en menos de 3 segundos cada una',
      points: 200,
    },
    hundred_cards: {
      name: 'Centurión',
      description: 'Estudia 100 tarjetas en total',
      points: 150,
    },
    thousand_cards: {
      name: 'Milenario',
      description: 'Estudia 1000 tarjetas en total',
      points: 1000,
    },
    accuracy_master: {
      name: 'Maestro de Precisión',
      description: 'Mantén 90% de precisión en 100 tarjetas',
      points: 300,
    },
  },
};

// Datos de gamificación
let gamificationData = {
  points: 0,
  level: 1,
  streak: 0,
  achievements: [],
  totalSessions: 0,
  totalCards: 0,
  correctAnswers: 0,
  lastStudyDate: null,
};

// Datos de sesión actual
let sessionStats = {
  total: 0,
  correct: 0,
  startTime: null,
  endTime: null,
  fastAnswers: 0,
  perfectSession: false,
};

/**
 * Carga los datos de gamificación del usuario
 * @returns {Promise<Object>} - Datos de gamificación
 */
export async function loadGamificationData() {
  try {
    const data = await apiWithFallback(
      '/api/gamification/profile',
      {
        ...gamificationData,
        achievements: Object.keys(GAMIFICATION_CONFIG.achievements).slice(0, 2), // Mock: primeros 2 logros
      },
      'GET'
    );

    gamificationData = { ...gamificationData, ...data };
    updateGamificationUI();

    return gamificationData;
  } catch (error) {
    console.error('Error cargando datos de gamificación:', error);
    return gamificationData;
  }
}

/**
 * Calcula puntos basado en la dificultad y velocidad de respuesta
 * @param {number} difficulty - Dificultad de la respuesta (0-3)
 * @param {Object} card - Datos de la tarjeta
 * @param {number} responseTime - Tiempo de respuesta en ms
 * @returns {number} - Puntos calculados
 */
export function calculatePoints(difficulty, card, responseTime = 0) {
  const config = GAMIFICATION_CONFIG.points;
  let basePoints = 0;

  // Puntos base según dificultad
  switch (difficulty) {
    case 0:
      basePoints = config.again;
      break;
    case 1:
      basePoints = config.hard;
      break;
    case 2:
      basePoints = config.good;
      break;
    case 3:
      basePoints = config.easy;
      break;
    default:
      basePoints = 0;
  }

  // Bonus por velocidad (respuesta rápida)
  let speedBonus = 0;
  if (responseTime > 0 && responseTime < 5000) {
    speedBonus = Math.max(
      0,
      config.speedBonus - Math.floor(responseTime / 1000)
    );

    // Contar respuestas rápidas para logros
    if (responseTime < 3000) {
      sessionStats.fastAnswers++;
    }
  }

  // Multiplicador por racha
  let streakMultiplier = 1;
  if (gamificationData.streak >= 7) {
    streakMultiplier = config.streakMultiplier;
  }

  const totalPoints = Math.round((basePoints + speedBonus) * streakMultiplier);

  // Actualizar datos
  gamificationData.points += totalPoints;
  sessionStats.total++;

  if (difficulty >= 2) {
    // Good o Easy
    sessionStats.correct++;
    gamificationData.correctAnswers++;
  }

  // Verificar si la sesión es perfecta
  sessionStats.perfectSession =
    sessionStats.correct === sessionStats.total && sessionStats.total > 0;

  // Actualizar UI
  updatePointsDisplay(totalPoints);

  return totalPoints;
}

/**
 * Inicia una nueva sesión de estudio
 */
export function startStudySession() {
  sessionStats = {
    total: 0,
    correct: 0,
    startTime: new Date(),
    endTime: null,
    fastAnswers: 0,
    perfectSession: false,
  };

  showNotification('¡Sesión de estudio iniciada! 🎯', 'info');
}

/**
 * Finaliza la sesión de estudio actual
 */
export async function endStudySession() {
  if (!sessionStats.startTime) {
    return;
  }

  sessionStats.endTime = new Date();
  gamificationData.totalSessions++;
  gamificationData.totalCards += sessionStats.total;

  // Actualizar racha
  updateStreak();

  // Verificar logros
  await checkAchievements();

  // Bonus por sesión perfecta
  if (sessionStats.perfectSession && sessionStats.total >= 5) {
    gamificationData.points += GAMIFICATION_CONFIG.points.perfectSessionBonus;
    showNotification(
      '¡Sesión perfecta! +' +
        GAMIFICATION_CONFIG.points.perfectSessionBonus +
        ' puntos bonus! 🎉',
      'success'
    );
  }

  // Actualizar nivel
  updateLevel();

  // Guardar datos
  await saveGamificationData();

  // Mostrar resumen de sesión
  showSessionSummary();

  // Limpiar datos de sesión
  sessionStats = {
    total: 0,
    correct: 0,
    startTime: null,
    endTime: null,
    fastAnswers: 0,
    perfectSession: false,
  };
}

/**
 * Actualiza la racha de estudio
 */
function updateStreak() {
  const today = new Date().toDateString();
  const lastStudy = gamificationData.lastStudyDate
    ? new Date(gamificationData.lastStudyDate).toDateString()
    : null;

  if (lastStudy === today) {
    // Ya estudió hoy, mantener racha
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (lastStudy === yesterdayStr) {
    // Estudió ayer, continuar racha
    gamificationData.streak++;
  } else if (lastStudy === null) {
    // Primera vez estudiando
    gamificationData.streak = 1;
  } else {
    // Rompió la racha
    gamificationData.streak = 1;
  }

  gamificationData.lastStudyDate = new Date().toISOString();
}

/**
 * Actualiza el nivel del usuario
 */
function updateLevel() {
  const currentPoints = gamificationData.points;
  let newLevel = gamificationData.level;

  // Buscar el nivel correspondiente
  for (const [level, config] of Object.entries(GAMIFICATION_CONFIG.levels)) {
    if (currentPoints >= config.min && currentPoints < config.max) {
      newLevel = parseInt(level);
      break;
    }
  }

  // Si subió de nivel
  if (newLevel > gamificationData.level) {
    const levelConfig = GAMIFICATION_CONFIG.levels[newLevel];
    gamificationData.level = newLevel;

    showNotification(
      `¡Subiste al nivel ${newLevel}: ${levelConfig.title}! 🎊`,
      'success',
      6000
    );

    // Efecto visual de subida de nivel
    triggerLevelUpEffect();
  }
}

/**
 * Verifica y otorga logros
 */
async function checkAchievements() {
  const newAchievements = [];

  // Primera sesión
  if (
    gamificationData.totalSessions === 1 &&
    !gamificationData.achievements.includes('first_study')
  ) {
    newAchievements.push('first_study');
  }

  // Racha de 7 días
  if (
    gamificationData.streak >= 7 &&
    !gamificationData.achievements.includes('streak_7')
  ) {
    newAchievements.push('streak_7');
  }

  // Racha de 30 días
  if (
    gamificationData.streak >= 30 &&
    !gamificationData.achievements.includes('streak_30')
  ) {
    newAchievements.push('streak_30');
  }

  // Sesión perfecta
  if (
    sessionStats.perfectSession &&
    sessionStats.total >= 5 &&
    !gamificationData.achievements.includes('perfect_session')
  ) {
    newAchievements.push('perfect_session');
  }

  // Demonio de velocidad
  if (
    sessionStats.fastAnswers >= 10 &&
    !gamificationData.achievements.includes('speed_demon')
  ) {
    newAchievements.push('speed_demon');
  }

  // 100 tarjetas
  if (
    gamificationData.totalCards >= 100 &&
    !gamificationData.achievements.includes('hundred_cards')
  ) {
    newAchievements.push('hundred_cards');
  }

  // 1000 tarjetas
  if (
    gamificationData.totalCards >= 1000 &&
    !gamificationData.achievements.includes('thousand_cards')
  ) {
    newAchievements.push('thousand_cards');
  }

  // Maestro de precisión
  const accuracy =
    gamificationData.totalCards > 0
      ? (gamificationData.correctAnswers / gamificationData.totalCards) * 100
      : 0;
  if (
    accuracy >= 90 &&
    gamificationData.totalCards >= 100 &&
    !gamificationData.achievements.includes('accuracy_master')
  ) {
    newAchievements.push('accuracy_master');
  }

  // Otorgar nuevos logros
  for (const achievementId of newAchievements) {
    await grantAchievement(achievementId);
  }
}

/**
 * Otorga un logro al usuario
 * @param {string} achievementId - ID del logro
 */
async function grantAchievement(achievementId) {
  const achievement = GAMIFICATION_CONFIG.achievements[achievementId];
  if (!achievement) {
    return;
  }

  gamificationData.achievements.push(achievementId);
  gamificationData.points += achievement.points;

  showNotification(
    `¡Logro desbloqueado: ${achievement.name}! +${achievement.points} puntos 🏆`,
    'success',
    8000
  );

  // Efecto visual de logro
  triggerAchievementEffect(achievement);
}

/**
 * Guarda los datos de gamificación
 */
async function saveGamificationData() {
  try {
    await performCrudOperation(
      () =>
        ApiClient.post('/api/gamification/profile', gamificationData),
      null, // No mostrar notificación
      'Error al guardar progreso de gamificación'
    );
  } catch (error) {
    console.error('Error guardando datos de gamificación:', error);
    // Guardar en localStorage como fallback
    localStorage.setItem('gamificationData', JSON.stringify(gamificationData));
  }
}

/**
 * Actualiza la UI de gamificación
 */
function updateGamificationUI() {
  // Actualizar puntos
  const pointsElement = document.getElementById('user-points');
  if (pointsElement) {
    pointsElement.textContent = gamificationData.points.toLocaleString();
  }

  // Actualizar nivel
  const levelElement = document.getElementById('user-level');
  if (levelElement) {
    const levelConfig = GAMIFICATION_CONFIG.levels[gamificationData.level];
    levelElement.textContent = `Nivel ${gamificationData.level}: ${levelConfig?.title || 'Desconocido'}`;
  }

  // Actualizar racha
  const streakElement = document.getElementById('user-streak');
  if (streakElement) {
    streakElement.textContent = `${gamificationData.streak} días`;
  }

  // Actualizar barra de progreso del nivel
  updateLevelProgress();

  // Actualizar logros
  updateAchievementsDisplay();
}

/**
 * Actualiza la visualización de puntos con animación
 * @param {number} pointsGained - Puntos ganados
 */
function updatePointsDisplay(pointsGained) {
  const pointsElement = document.getElementById('user-points');
  if (pointsElement) {
    pointsElement.textContent = gamificationData.points.toLocaleString();

    // Animación de puntos ganados
    if (pointsGained > 0) {
      const pointsGainedElement = document.createElement('div');
      pointsGainedElement.className = 'points-gained';
      pointsGainedElement.textContent = `+${pointsGained}`;
      pointsGainedElement.style.cssText = `
        position: absolute;
        color: #4caf50;
        font-weight: bold;
        font-size: 1.2em;
        animation: pointsFloat 2s ease-out forwards;
        pointer-events: none;
        z-index: 1000;
      `;

      pointsElement.parentNode.appendChild(pointsGainedElement);

      setTimeout(() => {
        if (pointsGainedElement.parentNode) {
          pointsGainedElement.parentNode.removeChild(pointsGainedElement);
        }
      }, 2000);
    }
  }
}

/**
 * Actualiza la barra de progreso del nivel
 */
function updateLevelProgress() {
  const progressBar = document.getElementById('level-progress');
  if (!progressBar) {
    return;
  }

  const currentLevel = GAMIFICATION_CONFIG.levels[gamificationData.level];
  const nextLevel = GAMIFICATION_CONFIG.levels[gamificationData.level + 1];

  if (!currentLevel || !nextLevel) {
    return;
  }

  const progress =
    ((gamificationData.points - currentLevel.min) /
      (nextLevel.min - currentLevel.min)) *
    100;
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;

  // Actualizar texto de progreso
  const progressText = document.getElementById('level-progress-text');
  if (progressText) {
    const pointsNeeded = nextLevel.min - gamificationData.points;
    progressText.textContent =
      pointsNeeded > 0
        ? `${pointsNeeded.toLocaleString()} puntos para el siguiente nivel`
        : 'Nivel máximo alcanzado';
  }
}

/**
 * Actualiza la visualización de logros
 */
function updateAchievementsDisplay() {
  const achievementsContainer = document.getElementById('achievements-list');
  if (!achievementsContainer) {
    return;
  }

  const achievementsHTML = Object.entries(GAMIFICATION_CONFIG.achievements)
    .map(([id, achievement]) => {
      const unlocked = gamificationData.achievements.includes(id);
      return `
      <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${unlocked ? '🏆' : '🔒'}</div>
        <div class="achievement-info">
          <h4>${achievement.name}</h4>
          <p>${achievement.description}</p>
          <span class="achievement-points">${achievement.points} puntos</span>
        </div>
      </div>
    `;
    })
    .join('');

  achievementsContainer.innerHTML = achievementsHTML;
}

/**
 * Muestra el resumen de la sesión
 */
function showSessionSummary() {
  if (sessionStats.total === 0) {
    return;
  }

  const accuracy = Math.round(
    (sessionStats.correct / sessionStats.total) * 100
  );
  const duration = sessionStats.endTime - sessionStats.startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  const summary = `
    📊 Resumen de Sesión:
    • Tarjetas estudiadas: ${sessionStats.total}
    • Respuestas correctas: ${sessionStats.correct}
    • Precisión: ${accuracy}%
    • Duración: ${minutes}m ${seconds}s
    ${sessionStats.perfectSession ? '🎉 ¡Sesión perfecta!' : ''}
  `;

  showNotification(summary, 'info', 8000);
}

/**
 * Efecto visual de subida de nivel
 */
function triggerLevelUpEffect() {
  // Implementar efecto visual de subida de nivel
  const body = document.body;
  body.classList.add('level-up-effect');

  setTimeout(() => {
    body.classList.remove('level-up-effect');
  }, 3000);
}

/**
 * Efecto visual de logro desbloqueado
 * @param {Object} achievement - Datos del logro
 */
function triggerAchievementEffect(achievement) {
  // Implementar efecto visual de logro
  const achievementPopup = document.createElement('div');
  achievementPopup.className = 'achievement-popup';
  achievementPopup.innerHTML = `
    <div class="achievement-content">
      <div class="achievement-icon">🏆</div>
      <h3>¡Logro Desbloqueado!</h3>
      <h4>${achievement.name}</h4>
      <p>${achievement.description}</p>
    </div>
  `;

  document.body.appendChild(achievementPopup);

  setTimeout(() => {
    if (achievementPopup.parentNode) {
      achievementPopup.parentNode.removeChild(achievementPopup);
    }
  }, 5000);
}

/**
 * Obtiene estadísticas de gamificación
 * @returns {Object} - Estadísticas actuales
 */
export function getGamificationStats() {
  return {
    ...gamificationData,
    currentSession: sessionStats,
    levelInfo: GAMIFICATION_CONFIG.levels[gamificationData.level],
    nextLevelInfo: GAMIFICATION_CONFIG.levels[gamificationData.level + 1],
    accuracy:
      gamificationData.totalCards > 0
        ? Math.round(
          (gamificationData.correctAnswers / gamificationData.totalCards) *
              100
        )
        : 0,
  };
}

// Exponer funciones globalmente para compatibilidad
window.loadGamificationData = loadGamificationData;
window.startStudySession = startStudySession;
window.endStudySession = endStudySession;
window.calculatePoints = calculatePoints;


