import { apiWithFallback } from './utils/apiHelpers.js';
import { formatDate } from './utils/helpers.js';

/**
 * Servicio de gráficas refactorizado
 * Maneja visualización de datos con Chart.js y fallbacks
 */

// Configuración de gráficas
const CHARTS_CONFIG = {
  defaultColors: {
    primary: '#4a90e2',
    secondary: '#50c878',
    accent: '#ff6b6b',
    warning: '#ffa500',
    info: '#17a2b8',
    success: '#28a745',
    danger: '#dc3545'
  },
  
  colorPalettes: {
    blue: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5'],
    green: ['#e8f5e8', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047'],
    purple: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa'],
    orange: ['#fff3e0', '#ffe0b2', '#ffcc02', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00']
  },

  animations: {
    duration: 1000,
    easing: 'easeInOutQuart'
  },

  responsive: {
    maintainAspectRatio: false,
    aspectRatio: 2
  }
};

// Estado de las gráficas
const chartInstances = new Map();
let isChartJsLoaded = false;

/**
 * Inicializa el sistema de gráficas
 * @param {Object} options - Opciones de inicialización
 * @returns {Promise<boolean>} - Éxito de la inicialización
 */
export async function initializeCharts(options = {}) {
  const {
    loadChartJs = true,
    theme = 'auto',
    fallbackEnabled = true
  } = options;

  try {
    console.log('🚀 Inicializando sistema de gráficas...');

    // Cargar Chart.js si es necesario
    if (loadChartJs && typeof Chart === 'undefined') {
      await loadChartJsLibrary();
    }

    // Verificar disponibilidad
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no disponible');
      
      if (fallbackEnabled) {
        createFallbackCharts();
      }
      
      return false;
    }

    isChartJsLoaded = true;

    // Configurar Chart.js globalmente
    configureChartJsDefaults(theme);

    // Inicializar gráficas específicas
    await initializeAllCharts();

    console.log('✅ Sistema de gráficas inicializado exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error inicializando gráficas:', error);
    
    if (fallbackEnabled) {
      createFallbackCharts();
    }
    
    return false;
  }
}

/**
 * Carga la librería Chart.js dinámicamente
 * @returns {Promise<void>}
 */
async function loadChartJsLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof Chart !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = () => {
      console.log('📊 Chart.js cargado dinámicamente');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Error cargando Chart.js');
      reject(new Error('Failed to load Chart.js'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Configura valores por defecto de Chart.js
 * @param {string} theme - Tema a aplicar
 */
function configureChartJsDefaults(theme) {
  const isDark = theme === 'dark' || 
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  Chart.defaults.font.family = "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = isDark ? '#e0e0e0' : '#333333';
  Chart.defaults.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
  Chart.defaults.borderColor = isDark ? '#404040' : '#e0e0e0';
  
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 20;
  
  Chart.defaults.elements.point.radius = 4;
  Chart.defaults.elements.point.hoverRadius = 6;
  Chart.defaults.elements.line.tension = 0.3;
  Chart.defaults.elements.bar.borderRadius = 4;
}

/**
 * Inicializa todas las gráficas disponibles
 * @returns {Promise<void>}
 */
async function initializeAllCharts() {
  const chartInitializers = [
    { id: 'weeklyProgressChart', init: initializeWeeklyProgressChart },
    { id: 'categoryDistributionChart', init: initializeCategoryDistributionChart },
    { id: 'performanceChart', init: initializePerformanceChart },
    { id: 'studyTimeChart', init: initializeStudyTimeChart },
    { id: 'accuracyTrendChart', init: initializeAccuracyTrendChart },
    { id: 'deckProgressChart', init: initializeDeckProgressChart }
  ];

  for (const { id, init } of chartInitializers) {
    try {
      const element = document.getElementById(id);
      if (element) {
        await init();
      }
    } catch (error) {
      console.error(`Error inicializando gráfica ${id}:`, error);
    }
  }
}

/**
 * Inicializa gráfica de progreso semanal
 * @returns {Promise<void>}
 */
async function initializeWeeklyProgressChart() {
  const ctx = document.getElementById('weeklyProgressChart');
  if (!ctx) {return;}

  try {
    // Cargar datos reales con fallback
    const weeklyData = await apiWithFallback('/api/stats/weekly', {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      cardsStudied: [12, 19, 3, 5, 2, 3, 9],
      studyTime: [45, 60, 15, 30, 10, 20, 35],
      accuracy: [85, 92, 78, 88, 95, 82, 90]
    });

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyData.labels,
        datasets: [
          {
            label: 'Tarjetas Estudiadas',
            data: weeklyData.cardsStudied,
            borderColor: CHARTS_CONFIG.defaultColors.primary,
            backgroundColor: CHARTS_CONFIG.defaultColors.primary + '20',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Tiempo de Estudio (min)',
            data: weeklyData.studyTime,
            borderColor: CHARTS_CONFIG.defaultColors.secondary,
            backgroundColor: CHARTS_CONFIG.defaultColors.secondary + '20',
            tension: 0.3,
            fill: false,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          title: {
            display: true,
            text: 'Progreso Semanal',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                if (context.datasetIndex === 1) {
                  return `Precisión: ${weeklyData.accuracy[context.dataIndex]}%`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Día de la Semana'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Tarjetas'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Minutos'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        animation: CHARTS_CONFIG.animations
      }
    });

    chartInstances.set('weeklyProgress', chart);

  } catch (error) {
    console.error('Error creando gráfica de progreso semanal:', error);
    createFallbackChart(ctx, 'Progreso Semanal');
  }
}

/**
 * Inicializa gráfica de distribución de categorías
 * @returns {Promise<void>}
 */
async function initializeCategoryDistributionChart() {
  const ctx = document.getElementById('categoryDistributionChart');
  if (!ctx) {return;}

  try {
    // Cargar datos reales con fallback
    const categoryData = await apiWithFallback('/api/stats/categories', {
      labels: ['Idiomas', 'Matemáticas', 'Historia', 'Ciencias', 'Literatura', 'Otros'],
      data: [30, 25, 20, 15, 8, 2],
      colors: CHARTS_CONFIG.colorPalettes.blue
    });

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryData.labels,
        datasets: [{
          data: categoryData.data,
          backgroundColor: categoryData.colors || CHARTS_CONFIG.colorPalettes.blue,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverBorderWidth: 3,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución por Categorías',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              usePointStyle: true,
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[i];
                    const total = dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    
                    return {
                      text: `${label} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[i],
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} decks (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          ...CHARTS_CONFIG.animations,
          animateRotate: true,
          animateScale: true
        }
      }
    });

    chartInstances.set('categoryDistribution', chart);

  } catch (error) {
    console.error('Error creando gráfica de categorías:', error);
    createFallbackChart(ctx, 'Distribución por Categorías');
  }
}

/**
 * Inicializa gráfica de rendimiento
 * @returns {Promise<void>}
 */
async function initializePerformanceChart() {
  const ctx = document.getElementById('performanceChart');
  if (!ctx) {return;}

  try {
    // Cargar datos reales con fallback
    const performanceData = await apiWithFallback('/api/stats/performance', {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      accuracy: [75, 82, 88, 85, 92, 89],
      speed: [45, 42, 38, 40, 35, 37], // segundos promedio
      retention: [60, 65, 70, 75, 80, 85] // porcentaje
    });

    const chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Precisión', 'Velocidad', 'Retención', 'Consistencia', 'Mejora', 'Confianza'],
        datasets: [{
          label: 'Rendimiento Actual',
          data: [
            performanceData.accuracy[performanceData.accuracy.length - 1],
            100 - (performanceData.speed[performanceData.speed.length - 1] / 60 * 100), // Invertir velocidad
            performanceData.retention[performanceData.retention.length - 1],
            calculateConsistency(performanceData.accuracy),
            calculateImprovement(performanceData.accuracy),
            85 // Valor fijo para confianza
          ],
          borderColor: CHARTS_CONFIG.defaultColors.primary,
          backgroundColor: CHARTS_CONFIG.defaultColors.primary + '30',
          borderWidth: 2,
          pointBackgroundColor: CHARTS_CONFIG.defaultColors.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Análisis de Rendimiento',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              callback: function(value) {
                return value + '%';
              }
            },
            pointLabels: {
              font: { size: 12 }
            }
          }
        },
        animation: CHARTS_CONFIG.animations
      }
    });

    chartInstances.set('performance', chart);

  } catch (error) {
    console.error('Error creando gráfica de rendimiento:', error);
    createFallbackChart(ctx, 'Análisis de Rendimiento');
  }
}

/**
 * Inicializa gráfica de tiempo de estudio
 * @returns {Promise<void>}
 */
async function initializeStudyTimeChart() {
  const ctx = document.getElementById('studyTimeChart');
  if (!ctx) {return;}

  try {
    const studyTimeData = await apiWithFallback('/api/stats/study-time', {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      data: [5, 2, 15, 25, 35, 18]
    });

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: studyTimeData.labels,
        datasets: [{
          label: 'Sesiones de Estudio',
          data: studyTimeData.data,
          backgroundColor: CHARTS_CONFIG.colorPalettes.green,
          borderColor: CHARTS_CONFIG.defaultColors.secondary,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Tiempo de Estudio',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Hora del Día'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Número de Sesiones'
            }
          }
        },
        animation: CHARTS_CONFIG.animations
      }
    });

    chartInstances.set('studyTime', chart);

  } catch (error) {
    console.error('Error creando gráfica de tiempo de estudio:', error);
    createFallbackChart(ctx, 'Tiempo de Estudio');
  }
}

/**
 * Inicializa gráfica de tendencia de precisión
 * @returns {Promise<void>}
 */
async function initializeAccuracyTrendChart() {
  const ctx = document.getElementById('accuracyTrendChart');
  if (!ctx) {return;}

  try {
    const accuracyData = await apiWithFallback('/api/stats/accuracy-trend', {
      labels: Array.from({length: 30}, (_, i) => formatDate(new Date(Date.now() - (29-i) * 24 * 60 * 60 * 1000), 'DD/MM')),
      accuracy: Array.from({length: 30}, () => Math.floor(Math.random() * 20) + 75),
      target: 85
    });

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: accuracyData.labels,
        datasets: [
          {
            label: 'Precisión Actual',
            data: accuracyData.accuracy,
            borderColor: CHARTS_CONFIG.defaultColors.primary,
            backgroundColor: CHARTS_CONFIG.defaultColors.primary + '20',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Objetivo',
            data: Array(30).fill(accuracyData.target),
            borderColor: CHARTS_CONFIG.defaultColors.warning,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Tendencia de Precisión (30 días)',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Fecha'
            }
          },
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Precisión (%)'
            }
          }
        },
        animation: CHARTS_CONFIG.animations
      }
    });

    chartInstances.set('accuracyTrend', chart);

  } catch (error) {
    console.error('Error creando gráfica de tendencia:', error);
    createFallbackChart(ctx, 'Tendencia de Precisión');
  }
}

/**
 * Inicializa gráfica de progreso de decks
 * @returns {Promise<void>}
 */
async function initializeDeckProgressChart() {
  const ctx = document.getElementById('deckProgressChart');
  if (!ctx) {return;}

  try {
    const deckData = await apiWithFallback('/api/stats/deck-progress', {
      labels: ['Inglés Básico', 'Matemáticas', 'Historia Mundial', 'Química', 'Literatura'],
      progress: [85, 92, 67, 78, 45],
      total: [100, 150, 200, 120, 80]
    });

    const chart = new Chart(ctx, {
      type: 'horizontalBar',
      data: {
        labels: deckData.labels,
        datasets: [{
          label: 'Progreso (%)',
          data: deckData.progress,
          backgroundColor: CHARTS_CONFIG.colorPalettes.purple,
          borderColor: CHARTS_CONFIG.defaultColors.accent,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Progreso por Deck',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const index = context.dataIndex;
                const total = deckData.total[index];
                const completed = Math.round((context.parsed.x / 100) * total);
                return `${completed}/${total} tarjetas completadas`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Progreso (%)'
            }
          }
        },
        animation: CHARTS_CONFIG.animations
      }
    });

    chartInstances.set('deckProgress', chart);

  } catch (error) {
    console.error('Error creando gráfica de progreso de decks:', error);
    createFallbackChart(ctx, 'Progreso por Deck');
  }
}

// FUNCIONES DE UTILIDAD

/**
 * Calcula la consistencia basada en la variación de precisión
 * @param {Array} accuracyData - Datos de precisión
 * @returns {number} - Porcentaje de consistencia
 */
function calculateConsistency(accuracyData) {
  if (accuracyData.length < 2) {return 100;}
  
  const variance = accuracyData.reduce((acc, val, i, arr) => {
    if (i === 0) {return 0;}
    return acc + Math.pow(val - arr[i-1], 2);
  }, 0) / (accuracyData.length - 1);
  
  const consistency = Math.max(0, 100 - Math.sqrt(variance));
  return Math.round(consistency);
}

/**
 * Calcula la mejora basada en la tendencia
 * @param {Array} accuracyData - Datos de precisión
 * @returns {number} - Porcentaje de mejora
 */
function calculateImprovement(accuracyData) {
  if (accuracyData.length < 2) {return 50;}
  
  const first = accuracyData[0];
  const last = accuracyData[accuracyData.length - 1];
  const improvement = ((last - first) / first) * 100;
  
  return Math.max(0, Math.min(100, 50 + improvement));
}

/**
 * Crea gráficas de fallback cuando Chart.js no está disponible
 */
function createFallbackCharts() {
  const chartElements = document.querySelectorAll('[id$="Chart"]');
  
  chartElements.forEach(element => {
    const title = element.id.replace('Chart', '').replace(/([A-Z])/g, ' $1').trim();
    createFallbackChart(element, title);
  });
}

/**
 * Crea una gráfica de fallback individual
 * @param {HTMLElement} element - Elemento contenedor
 * @param {string} title - Título de la gráfica
 */
function createFallbackChart(element, title) {
  element.innerHTML = `
    <div class="fallback-chart">
      <div class="fallback-chart-title">${title}</div>
      <div class="fallback-chart-content">
        <div class="fallback-chart-icon">📊</div>
        <p>Gráfica no disponible</p>
        <small>Chart.js no pudo cargarse</small>
      </div>
    </div>
  `;

  // Agregar estilos si no existen
  if (!document.getElementById('fallback-chart-styles')) {
    const style = document.createElement('style');
    style.id = 'fallback-chart-styles';
    style.textContent = `
      .fallback-chart {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 200px;
        background: rgba(0,0,0,0.05);
        border-radius: 8px;
        border: 2px dashed rgba(0,0,0,0.1);
      }
      
      .fallback-chart-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #666;
      }
      
      .fallback-chart-content {
        text-align: center;
        color: #999;
      }
      
      .fallback-chart-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Actualiza una gráfica específica con nuevos datos
 * @param {string} chartId - ID de la gráfica
 * @param {Object} newData - Nuevos datos
 * @returns {boolean} - Éxito de la actualización
 */
export function updateChart(chartId, newData) {
  const chart = chartInstances.get(chartId);
  if (!chart) {
    console.warn(`Gráfica ${chartId} no encontrada`);
    return false;
  }

  try {
    // Actualizar datos
    if (newData.labels) {
      chart.data.labels = newData.labels;
    }
    
    if (newData.datasets) {
      chart.data.datasets = newData.datasets;
    }

    // Actualizar gráfica
    chart.update('active');
    
    console.log(`✅ Gráfica ${chartId} actualizada`);
    return true;

  } catch (error) {
    console.error(`Error actualizando gráfica ${chartId}:`, error);
    return false;
  }
}

/**
 * Destruye una gráfica específica
 * @param {string} chartId - ID de la gráfica
 */
export function destroyChart(chartId) {
  const chart = chartInstances.get(chartId);
  if (chart) {
    chart.destroy();
    chartInstances.delete(chartId);
    console.log(`🗑️ Gráfica ${chartId} destruida`);
  }
}

/**
 * Destruye todas las gráficas
 */
export function destroyAllCharts() {
  chartInstances.forEach((chart, id) => {
    chart.destroy();
    console.log(`🗑️ Gráfica ${id} destruida`);
  });
  chartInstances.clear();
}

/**
 * Cambia el tema de todas las gráficas
 * @param {string} newTheme - Nuevo tema
 */
export function updateChartsTheme(newTheme) {
  if (!isChartJsLoaded) {return;}

  // Reconfigurar defaults
  configureChartJsDefaults(newTheme);

  // Actualizar gráficas existentes
  chartInstances.forEach((chart, id) => {
    chart.update('none');
  });

  console.log(`🎨 Tema de gráficas actualizado: ${newTheme}`);
}

/**
 * Obtiene información de las gráficas
 * @returns {Object} - Información del estado
 */
export function getChartsInfo() {
  return {
    isChartJsLoaded: isChartJsLoaded,
    activeCharts: Array.from(chartInstances.keys()),
    chartCount: chartInstances.size,
    config: CHARTS_CONFIG
  };
}

// Exponer funciones globalmente para compatibilidad
window.initializeCharts = initializeCharts;
window.updateChart = updateChart;
window.destroyChart = destroyChart;
window.destroyAllCharts = destroyAllCharts;
window.updateChartsTheme = updateChartsTheme;
window.getChartsInfo = getChartsInfo;

