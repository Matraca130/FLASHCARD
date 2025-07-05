import { apiWithFallback } from './utils/apiHelpers.js';
import { showNotification, formatDate } from './utils/helpers.js';

/**
 * Servicio de heatmap de actividad refactorizado
 * Muestra la actividad de estudio del usuario en formato similar a GitHub
 */

// Configuración del heatmap
const HEATMAP_CONFIG = {
  weeks: 52,
  daysPerWeek: 7,
  maxActivityLevel: 4,
  colors: {
    0: '#ebedf0', // Sin actividad
    1: '#9be9a8', // Baja actividad
    2: '#40c463', // Actividad media
    3: '#30a14e', // Alta actividad
    4: '#216e39'  // Actividad muy alta
  },
  tooltipMessages: {
    0: 'Sin estudio',
    1: 'Poco estudio',
    2: 'Estudio moderado',
    3: 'Buen estudio',
    4: 'Excelente estudio'
  }
};

// Cache de datos de actividad
let activityCache = null;
let lastCacheUpdate = null;

/**
 * Genera el heatmap de actividad principal
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<void>}
 */
export async function generateActivityHeatmap(options = {}) {
  const {
    containerId = 'activity-heatmap',
    showLegend = true,
    showStats = true,
    animated = true
  } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found for activity heatmap`);
    return;
  }

  try {
    // Cargar datos de actividad
    const activityData = await loadActivityData();
    
    // Generar HTML del heatmap
    const heatmapHTML = generateHeatmapHTML(activityData, { showLegend, showStats });
    
    // Insertar en el DOM
    container.innerHTML = heatmapHTML;
    
    // Agregar interactividad
    addHeatmapInteractivity(containerId);
    
    // Aplicar animación si está habilitada
    if (animated) {
      animateHeatmapAppearance(containerId);
    }
    
  } catch (error) {
    console.error('Error generating activity heatmap:', error);
    container.innerHTML = '<p class="error-message">Error al cargar el heatmap de actividad</p>';
  }
}

/**
 * Carga los datos de actividad del usuario
 * @param {boolean} forceRefresh - Forzar actualización del cache
 * @returns {Promise<Array>} - Array de datos de actividad
 */
async function loadActivityData(forceRefresh = false) {
  // Verificar cache
  const cacheAge = lastCacheUpdate ? Date.now() - lastCacheUpdate : Infinity;
  const cacheExpired = cacheAge > 5 * 60 * 1000; // 5 minutos
  
  if (!forceRefresh && activityCache && !cacheExpired) {
    return activityCache;
  }
  
  try {
    // Cargar desde API con fallback a datos mock
    const data = await apiWithFallback(
      '/api/stats/activity-heatmap',
      generateMockActivityData()
    );
    
    // Actualizar cache
    activityCache = data;
    lastCacheUpdate = Date.now();
    
    return data;
    
  } catch (error) {
    console.error('Error loading activity data:', error);
    
    // Fallback a datos mock
    const mockData = generateMockActivityData();
    activityCache = mockData;
    lastCacheUpdate = Date.now();
    
    return mockData;
  }
}

/**
 * Genera datos mock de actividad para fallback
 * @returns {Array} - Array de datos de actividad
 */
function generateMockActivityData() {
  const data = [];
  const today = new Date();
  const totalDays = HEATMAP_CONFIG.weeks * HEATMAP_CONFIG.daysPerWeek;
  
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (totalDays - i - 1));
    
    // Generar actividad realista (más actividad en días laborables)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseActivity = isWeekend ? 0.3 : 0.7;
    
    const activity = Math.random() < baseActivity ? 
      Math.floor(Math.random() * (HEATMAP_CONFIG.maxActivityLevel + 1)) : 0;
    
    data.push({
      date: date.toISOString().split('T')[0],
      activity: activity,
      cards_studied: activity * Math.floor(Math.random() * 10 + 1),
      study_time: activity * Math.floor(Math.random() * 30 + 5), // minutos
      sessions: activity > 0 ? Math.floor(Math.random() * 3 + 1) : 0
    });
  }
  
  return data;
}

/**
 * Genera el HTML del heatmap
 * @param {Array} activityData - Datos de actividad
 * @param {Object} options - Opciones de renderizado
 * @returns {string} - HTML generado
 */
function generateHeatmapHTML(activityData, options = {}) {
  const { showLegend = true, showStats = true } = options;
  
  let html = '<div class="activity-heatmap-container">';
  
  // Estadísticas generales
  if (showStats) {
    html += generateStatsHTML(activityData);
  }
  
  // Heatmap principal
  html += '<div class="heatmap-grid">';
  html += generateMonthLabels();
  html += generateWeekdayLabels();
  html += generateHeatmapGrid(activityData);
  html += '</div>';
  
  // Leyenda
  if (showLegend) {
    html += generateLegendHTML();
  }
  
  html += '</div>';
  
  return html;
}

/**
 * Genera las estadísticas del heatmap
 * @param {Array} activityData - Datos de actividad
 * @returns {string} - HTML de estadísticas
 */
function generateStatsHTML(activityData) {
  const totalCards = activityData.reduce((sum, day) => sum + (day.cards_studied || 0), 0);
  const totalSessions = activityData.reduce((sum, day) => sum + (day.sessions || 0), 0);
  const activeDays = activityData.filter(day => day.activity > 0).length;
  const currentStreak = calculateCurrentStreak(activityData);
  
  return `
    <div class="heatmap-stats">
      <div class="stat-item">
        <span class="stat-value">${totalCards.toLocaleString()}</span>
        <span class="stat-label">Tarjetas estudiadas</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${activeDays}</span>
        <span class="stat-label">Días activos</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${currentStreak}</span>
        <span class="stat-label">Racha actual</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${totalSessions}</span>
        <span class="stat-label">Sesiones totales</span>
      </div>
    </div>
  `;
}

/**
 * Genera las etiquetas de los meses
 * @returns {string} - HTML de etiquetas de meses
 */
function generateMonthLabels() {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  let html = '<div class="month-labels">';
  
  // Calcular posiciones de los meses
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const monthName = months[monthDate.getMonth()];
    
    html += `<span class="month-label">${monthName}</span>`;
  }
  
  html += '</div>';
  return html;
}

/**
 * Genera las etiquetas de los días de la semana
 * @returns {string} - HTML de etiquetas de días
 */
function generateWeekdayLabels() {
  const weekdays = ['', 'Lun', '', 'Mié', '', 'Vie', ''];
  
  let html = '<div class="weekday-labels">';
  weekdays.forEach(day => {
    html += `<span class="weekday-label">${day}</span>`;
  });
  html += '</div>';
  
  return html;
}

/**
 * Genera la grilla principal del heatmap
 * @param {Array} activityData - Datos de actividad
 * @returns {string} - HTML de la grilla
 */
function generateHeatmapGrid(activityData) {
  let html = '<div class="heatmap-weeks">';
  
  // Organizar datos por semanas
  const weeks = organizeDataByWeeks(activityData);
  
  weeks.forEach((week, weekIndex) => {
    html += '<div class="heatmap-week">';
    
    week.forEach((day, dayIndex) => {
      const activity = day ? day.activity : 0;
      const date = day ? day.date : '';
      const cardsStudied = day ? day.cards_studied : 0;
      const studyTime = day ? day.study_time : 0;
      const sessions = day ? day.sessions : 0;
      
      html += `
        <div class="heatmap-day activity-${activity}" 
             data-activity="${activity}"
             data-date="${date}"
             data-cards="${cardsStudied}"
             data-time="${studyTime}"
             data-sessions="${sessions}"
             style="background-color: ${HEATMAP_CONFIG.colors[activity]}"
             title="${generateTooltipText(day)}">
        </div>
      `;
    });
    
    html += '</div>';
  });
  
  html += '</div>';
  return html;
}

/**
 * Organiza los datos por semanas
 * @param {Array} activityData - Datos de actividad
 * @returns {Array} - Array de semanas con días
 */
function organizeDataByWeeks(activityData) {
  const weeks = [];
  const dataMap = new Map();
  
  // Crear mapa de datos por fecha
  activityData.forEach(day => {
    dataMap.set(day.date, day);
  });
  
  // Calcular fecha de inicio (hace 52 semanas)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (HEATMAP_CONFIG.weeks * 7 - 1));
  
  // Ajustar al domingo más cercano
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);
  
  // Generar semanas
  for (let week = 0; week < HEATMAP_CONFIG.weeks; week++) {
    const weekData = [];
    
    for (let day = 0; day < HEATMAP_CONFIG.daysPerWeek; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + (week * 7) + day);
      
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dataMap.get(dateStr) || null;
      
      weekData.push(dayData);
    }
    
    weeks.push(weekData);
  }
  
  return weeks;
}

/**
 * Genera el texto del tooltip
 * @param {Object} day - Datos del día
 * @returns {string} - Texto del tooltip
 */
function generateTooltipText(day) {
  if (!day || day.activity === 0) {
    return `${formatDate(new Date(day?.date || Date.now()), 'DD/MM/YYYY')} - Sin actividad`;
  }
  
  const date = formatDate(new Date(day.date), 'DD/MM/YYYY');
  const message = HEATMAP_CONFIG.tooltipMessages[day.activity];
  const cards = day.cards_studied || 0;
  const time = day.study_time || 0;
  
  return `${date} - ${message}\n${cards} tarjetas, ${time} minutos`;
}

/**
 * Genera la leyenda del heatmap
 * @returns {string} - HTML de la leyenda
 */
function generateLegendHTML() {
  let html = '<div class="heatmap-legend">';
  html += '<span class="legend-label">Menos</span>';
  
  for (let i = 0; i <= HEATMAP_CONFIG.maxActivityLevel; i++) {
    html += `
      <div class="legend-square activity-${i}" 
           style="background-color: ${HEATMAP_CONFIG.colors[i]}"
           title="${HEATMAP_CONFIG.tooltipMessages[i]}">
      </div>
    `;
  }
  
  html += '<span class="legend-label">Más</span>';
  html += '</div>';
  
  return html;
}

/**
 * Agrega interactividad al heatmap
 * @param {string} containerId - ID del contenedor
 */
function addHeatmapInteractivity(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const days = container.querySelectorAll('.heatmap-day');
  
  days.forEach(day => {
    // Hover effects
    day.addEventListener('mouseenter', handleDayHover);
    day.addEventListener('mouseleave', handleDayLeave);
    
    // Click events
    day.addEventListener('click', handleDayClick);
  });
}

/**
 * Maneja el hover sobre un día
 * @param {Event} event - Evento de mouse
 */
function handleDayHover(event) {
  const day = event.target;
  const activity = parseInt(day.dataset.activity);
  
  // Resaltar día
  day.classList.add('hovered');
  
  // Mostrar información adicional si es necesario
  if (activity > 0) {
    day.style.transform = 'scale(1.1)';
    day.style.zIndex = '10';
  }
}

/**
 * Maneja cuando el mouse sale de un día
 * @param {Event} event - Evento de mouse
 */
function handleDayLeave(event) {
  const day = event.target;
  
  // Remover efectos de hover
  day.classList.remove('hovered');
  day.style.transform = '';
  day.style.zIndex = '';
}

/**
 * Maneja el click en un día
 * @param {Event} event - Evento de click
 */
function handleDayClick(event) {
  const day = event.target;
  const date = day.dataset.date;
  const activity = parseInt(day.dataset.activity);
  const cards = parseInt(day.dataset.cards);
  
  if (activity > 0) {
    showDayDetails(date, {
      activity,
      cards,
      time: parseInt(day.dataset.time),
      sessions: parseInt(day.dataset.sessions)
    });
  }
}

/**
 * Muestra detalles de un día específico
 * @param {string} date - Fecha del día
 * @param {Object} data - Datos del día
 */
function showDayDetails(date, data) {
  const formattedDate = formatDate(new Date(date), 'DD/MM/YYYY');
  const message = `
    📅 ${formattedDate}
    📚 ${data.cards} tarjetas estudiadas
    ⏱️ ${data.time} minutos de estudio
    🎯 ${data.sessions} sesiones completadas
  `;
  
  showNotification(message, 'info', 5000);
}

/**
 * Anima la aparición del heatmap
 * @param {string} containerId - ID del contenedor
 */
function animateHeatmapAppearance(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const days = container.querySelectorAll('.heatmap-day');
  
  days.forEach((day, index) => {
    day.style.opacity = '0';
    day.style.transform = 'scale(0)';
    
    setTimeout(() => {
      day.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      day.style.opacity = '1';
      day.style.transform = 'scale(1)';
    }, index * 2); // Delay progresivo
  });
}

/**
 * Calcula la racha actual de días activos
 * @param {Array} activityData - Datos de actividad
 * @returns {number} - Días de racha actual
 */
function calculateCurrentStreak(activityData) {
  let streak = 0;
  
  // Empezar desde el día más reciente
  for (let i = activityData.length - 1; i >= 0; i--) {
    if (activityData[i].activity > 0) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Actualiza el heatmap con nuevos datos
 * @param {Array} newData - Nuevos datos de actividad
 */
export async function updateHeatmapWithData(newData) {
  if (!Array.isArray(newData)) {
    console.warn('Invalid data provided for heatmap update');
    return;
  }
  
  // Actualizar cache
  activityCache = newData;
  lastCacheUpdate = Date.now();
  
  // Regenerar heatmap
  await generateActivityHeatmap();
  
  showNotification('Heatmap actualizado', 'success', 2000);
}

/**
 * Refresca el heatmap forzando la carga de datos
 */
export async function refreshActivityHeatmap() {
  try {
    showNotification('Actualizando heatmap...', 'info', 1000);
    await loadActivityData(true); // Forzar refresh
    await generateActivityHeatmap();
    showNotification('Heatmap actualizado', 'success');
  } catch (error) {
    console.error('Error refreshing heatmap:', error);
    showNotification('Error al actualizar heatmap', 'error');
  }
}

// Exponer funciones globalmente para compatibilidad
window.generateActivityHeatmap = generateActivityHeatmap;
window.updateHeatmapWithData = updateHeatmapWithData;
window.refreshActivityHeatmap = refreshActivityHeatmap;

