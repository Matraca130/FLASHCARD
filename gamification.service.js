import { store } from '../store/store.js';
import { showNotification } from '../utils/helpers.js';

// Datos de gamificación
let gamificationData = {
  points: 0,
  level: 1,
  streak: 0,
  achievements: [],
  totalSessions: 0,
  totalCards: 0,
  correctAnswers: 0
};

// Datos de sesión actual
let sessionStats = {
  total: 0,
  correct: 0,
  startTime: null,
  endTime: null
};

/**
 * Calcula puntos basado en la dificultad y velocidad de respuesta
 */
export function calculatePoints(difficulty, card, responseTime = 0) {
  let basePoints = 0;
  
  switch (difficulty) {
    case 0: basePoints = 2; break;  // Again
    case 1: basePoints = 5; break;  // Hard
    case 2: basePoints = 8; break;  // Good
    case 3: basePoints = 10; break; // Easy
  }
  
  // Bonus for speed (if answered quickly)
  let speedBonus = 0;
  if (responseTime > 0 && responseTime < 5000) { // Less than 5 seconds
    speedBonus = Math.max(0, 5 - Math.floor(responseTime / 1000));
  }
  
  const totalPoints = basePoints + speedBonus;
  gamificationData.points += totalPoints;
  
  // Update session stats
  sessionStats.total++;
  if (difficulty >= 2) { // Good or Easy
    sessionStats.correct++;
    gamificationData.correctAnswers++;
  }
  gamificationData.totalCards++;
  
  // Show points animation
  showPointsAnimation(totalPoints, speedBonus > 0);
  
  // Check for level up
  updateLevel();
  
  // Save data
  saveGamificationData();
  
  return totalPoints;
}

/**
 * Actualiza el nivel del usuario basado en puntos
 */
export function updateLevel() {
  const levels = [
    { level: 1, points: 0, title: "Principiante", icon: "🌱" },
    { level: 2, points: 100, title: "Estudiante", icon: "📚" },
    { level: 3, points: 300, title: "Aprendiz", icon: "🎓" },
    { level: 4, points: 600, title: "Conocedor", icon: "💪" },
    { level: 5, points: 1000, title: "Experto", icon: "🎯" },
    { level: 6, points: 1500, title: "Maestro", icon: "🏆" },
    { level: 7, points: 2100, title: "Sabio", icon: "👑" },
    { level: 8, points: 2800, title: "Genio", icon: "✨" },
    { level: 9, points: 3600, title: "Leyenda", icon: "🌟" },
    { level: 10, points: 4500, title: "Inmortal", icon: "💫" }
  ];
  
  const currentLevel = gamificationData.level;
  let newLevel = 1;
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (gamificationData.points >= levels[i].points) {
      newLevel = levels[i].level;
      break;
    }
  }
  
  if (newLevel > currentLevel) {
    gamificationData.level = newLevel;
    showLevelUpAnimation(newLevel, levels[newLevel - 1]);
  }
  
  updateGamificationUI();
}

/**
 * Obtiene datos del nivel actual
 */
export function getLevelData(level) {
  const levels = [
    { level: 1, points: 0, title: "Principiante", icon: "🌱" },
    { level: 2, points: 100, title: "Estudiante", icon: "📚" },
    { level: 3, points: 300, title: "Aprendiz", icon: "🎓" },
    { level: 4, points: 600, title: "Conocedor", icon: "💪" },
    { level: 5, points: 1000, title: "Experto", icon: "🎯" },
    { level: 6, points: 1500, title: "Maestro", icon: "🏆" },
    { level: 7, points: 2100, title: "Sabio", icon: "👑" },
    { level: 8, points: 2800, title: "Genio", icon: "✨" },
    { level: 9, points: 3600, title: "Leyenda", icon: "🌟" },
    { level: 10, points: 4500, title: "Inmortal", icon: "💫" }
  ];
  
  return levels.find(l => l.level === level) || levels[0];
}

/**
 * Actualiza la UI de gamificación
 */
export function updateGamificationUI() {
  // Update navbar elements
  const userLevel = document.getElementById('user-level');
  const userPoints = document.getElementById('user-points');
  
  if (userLevel) {
    const levelData = getLevelData(gamificationData.level);
    userLevel.innerHTML = `
      <span class="level-icon">${levelData.icon}</span>
      <span>Nivel ${gamificationData.level}</span>
    `;
  }
  
  if (userPoints) {
    userPoints.innerHTML = `
      <span>⭐</span>
      <span>${gamificationData.points} pts</span>
    `;
  }
}

/**
 * Verifica y otorga achievements
 */
export function checkAchievements() {
  const achievements = [
    {
      id: 'first_session',
      title: 'Primera Sesión',
      description: 'Completa tu primera sesión de estudio',
      icon: '🎯',
      condition: () => sessionStats.total > 0
    },
    {
      id: 'perfect_session',
      title: 'Sesión Perfecta',
      description: 'Responde todas las cartas correctamente',
      icon: '💯',
      condition: () => sessionStats.total > 0 && sessionStats.correct === sessionStats.total
    },
    {
      id: 'speed_demon',
      title: 'Demonio de la Velocidad',
      description: 'Completa una sesión en menos de 2 minutos',
      icon: '⚡',
      condition: () => {
        if (!sessionStats.startTime || !sessionStats.endTime) return false;
        const duration = sessionStats.endTime - sessionStats.startTime;
        return sessionStats.total >= 5 && duration < 120000; // 2 minutes
      }
    },
    {
      id: 'streak_3',
      title: 'Racha de 3',
      description: 'Estudia 3 días consecutivos',
      icon: '🔥',
      condition: () => gamificationData.streak >= 3
    },
    {
      id: 'points_100',
      title: 'Centurión',
      description: 'Acumula 100 puntos',
      icon: '🏅',
      condition: () => gamificationData.points >= 100
    },
    {
      id: 'points_500',
      title: 'Quinientos',
      description: 'Acumula 500 puntos',
      icon: '🎖️',
      condition: () => gamificationData.points >= 500
    },
    {
      id: 'cards_100',
      title: 'Estudioso',
      description: 'Estudia 100 cartas',
      icon: '📖',
      condition: () => gamificationData.totalCards >= 100
    }
  ];
  
  achievements.forEach(achievement => {
    if (!gamificationData.achievements.includes(achievement.id) && achievement.condition()) {
      gamificationData.achievements.push(achievement.id);
      showAchievement(achievement.title, achievement.description, achievement.icon);
      gamificationData.points += 50; // Bonus points for achievement
    }
  });
  
  saveGamificationData();
}

/**
 * Muestra animación de logro
 */
export function showAchievement(title, description, icon) {
  const achievementEl = document.createElement('div');
  achievementEl.className = 'achievement-notification';
  achievementEl.innerHTML = `
    <div class="achievement-content">
      <div class="achievement-icon">${icon}</div>
      <div class="achievement-text">
        <div class="achievement-title">${title}</div>
        <div class="achievement-description">${description}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(achievementEl);
  
  // Animate in
  setTimeout(() => achievementEl.classList.add('show'), 100);
  
  // Remove after 4 seconds
  setTimeout(() => {
    achievementEl.classList.remove('show');
    setTimeout(() => document.body.removeChild(achievementEl), 300);
  }, 4000);
}

/**
 * Muestra animación de subida de nivel
 */
export function showLevelUpAnimation(level, levelData) {
  showAchievement(
    `¡Nivel ${level}!`,
    `Has alcanzado el nivel ${levelData.title}`,
    levelData.icon
  );
}

/**
 * Muestra animación de puntos
 */
export function showPointsAnimation(points, hasSpeedBonus = false) {
  const pointsEl = document.createElement('div');
  pointsEl.className = 'points-animation';
  pointsEl.innerHTML = `
    +${points} pts ${hasSpeedBonus ? '⚡' : ''}
  `;
  
  document.body.appendChild(pointsEl);
  
  // Animate
  setTimeout(() => pointsEl.classList.add('show'), 100);
  
  // Remove after 2 seconds
  setTimeout(() => {
    pointsEl.classList.remove('show');
    setTimeout(() => document.body.removeChild(pointsEl), 300);
  }, 2000);
}

/**
 * Inicia una nueva sesión de estudio
 */
export function startStudySession() {
  sessionStats = {
    total: 0,
    correct: 0,
    startTime: Date.now(),
    endTime: null
  };
}

/**
 * Termina la sesión de estudio
 */
export function endStudySession() {
  sessionStats.endTime = Date.now();
  gamificationData.totalSessions++;
  
  // Check achievements
  checkAchievements();
  
  // Update streak (simplified logic)
  const lastStudyDate = localStorage.getItem('lastStudyDate');
  const today = new Date().toDateString();
  
  if (lastStudyDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastStudyDate === yesterday.toDateString()) {
      gamificationData.streak++;
    } else {
      gamificationData.streak = 1;
    }
    
    localStorage.setItem('lastStudyDate', today);
  }
  
  saveGamificationData();
}

/**
 * Carga datos de gamificación
 */
export function loadGamificationData() {
  const saved = localStorage.getItem('gamificationData');
  if (saved) {
    gamificationData = { ...gamificationData, ...JSON.parse(saved) };
  }
  updateGamificationUI();
  return gamificationData;
}

/**
 * Guarda datos de gamificación
 */
export function saveGamificationData() {
  localStorage.setItem('gamificationData', JSON.stringify(gamificationData));
  updateGamificationUI();
}

/**
 * Obtiene estadísticas de gamificación
 */
export function getGamificationStats() {
  return { ...gamificationData };
}

/**
 * Obtiene estadísticas de la sesión actual
 */
export function getSessionStats() {
  return { ...sessionStats };
}

// Exponer funciones globalmente para compatibilidad
window.calculatePoints = calculatePoints;
window.updateLevel = updateLevel;
window.checkAchievements = checkAchievements;
window.showAchievement = showAchievement;
window.loadGamificationData = loadGamificationData;
window.saveGamificationData = saveGamificationData;

