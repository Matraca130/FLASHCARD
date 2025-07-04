// charts.js - Enhanced chart initialization functions

let progressChart = null;
let accuracyChart = null;

export function initializeCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }
  
  initializeProgressChart();
  initializeAccuracyChart();
}

/**
 * Initialize the weekly progress chart
 */
function initializeProgressChart() {
  const progressCtx = document.getElementById('progressChart');
  if (!progressCtx) return;
  
  // Destroy existing chart if it exists
  if (progressChart) {
    progressChart.destroy();
  }
  
  progressChart = new Chart(progressCtx, {
    type: 'line',
    data: {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Cartas Estudiadas',
        data: [12, 19, 15, 25, 22, 18, 30],
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: { 
            color: 'rgba(255, 255, 255, 0.8)',
            font: { size: 12 }
          }
        },
        x: {
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: { 
            color: 'rgba(255, 255, 255, 0.8)',
            font: { size: 12 }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

/**
 * Initialize the accuracy doughnut chart
 */
function initializeAccuracyChart() {
  const accuracyCtx = document.getElementById('accuracyChart');
  if (!accuracyCtx) return;
  
  // Destroy existing chart if it exists
  if (accuracyChart) {
    accuracyChart.destroy();
  }
  
  accuracyChart = new Chart(accuracyCtx, {
    type: 'doughnut',
    data: {
      labels: ['Correctas', 'Incorrectas'],
      datasets: [{
        data: [75, 25],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(239, 68, 68, 0.9)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            font: { size: 12 },
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

/**
 * Update progress chart with new data
 * @param {Array} data - Array of numbers for each day
 * @param {Array} labels - Array of labels for each day
 */
export function updateProgressChart(data, labels = null) {
  if (!progressChart) return;
  
  if (labels) {
    progressChart.data.labels = labels;
  }
  progressChart.data.datasets[0].data = data;
  progressChart.update('active');
}

/**
 * Update accuracy chart with new data
 * @param {number} correct - Number of correct answers
 * @param {number} incorrect - Number of incorrect answers
 */
export function updateAccuracyChart(correct, incorrect) {
  if (!accuracyChart) return;
  
  accuracyChart.data.datasets[0].data = [correct, incorrect];
  accuracyChart.update('active');
}

/**
 * Update chart theme for different time periods
 * @param {string} period - '7D', '30D', or '90D'
 */
export function updateChartPeriod(period) {
  let labels, data;
  
  switch (period) {
    case '7D':
      labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      data = [12, 19, 15, 25, 22, 18, 30];
      break;
    case '30D':
      labels = Array.from({length: 30}, (_, i) => `${i + 1}`);
      data = Array.from({length: 30}, () => Math.floor(Math.random() * 40) + 5);
      break;
    case '90D':
      labels = Array.from({length: 12}, (_, i) => `Sem ${i + 1}`);
      data = Array.from({length: 12}, () => Math.floor(Math.random() * 200) + 50);
      break;
    default:
      return;
  }
  
  updateProgressChart(data, labels);
}

/**
 * Destroy all charts (useful for cleanup)
 */
export function destroyCharts() {
  if (progressChart) {
    progressChart.destroy();
    progressChart = null;
  }
  if (accuracyChart) {
    accuracyChart.destroy();
    accuracyChart = null;
  }
}

// Expose to legacy code
window.initializeCharts = initializeCharts;
window.updateProgressChart = updateProgressChart;
window.updateAccuracyChart = updateAccuracyChart;
window.updateChartPeriod = updateChartPeriod;

