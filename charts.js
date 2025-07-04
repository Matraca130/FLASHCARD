// charts.js - Configuración de gráficas para el dashboard
export function initializeCharts() {
  console.log('Initializing charts...');
  
  try {
    // Verificar si Chart.js está disponible
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js no está disponible. Las gráficas no se mostrarán.');
      return;
    }

    // Configurar gráfica de progreso semanal
    initializeWeeklyProgressChart();
    
    // Configurar gráfica de distribución de categorías
    initializeCategoryDistributionChart();
    
    // Configurar gráfica de rendimiento
    initializePerformanceChart();
    
    console.log('Charts initialized successfully');
  } catch (error) {
    console.error('Error initializing charts:', error);
  }
}

function initializeWeeklyProgressChart() {
  const ctx = document.getElementById('weeklyProgressChart');
  if (!ctx) return;

  const data = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [{
      label: 'Tarjetas Estudiadas',
      data: [12, 19, 3, 5, 2, 3, 9],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  };

  new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Progreso Semanal'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function initializeCategoryDistributionChart() {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  const data = {
    labels: ['Matemáticas', 'Historia', 'Ciencias', 'Idiomas', 'Otros'],
    datasets: [{
      data: [30, 25, 20, 15, 10],
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF'
      ]
    }]
  };

  new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Distribución por Categorías'
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function initializePerformanceChart() {
  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;

  const data = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [{
      label: 'Precisión (%)',
      data: [65, 70, 75, 80, 85, 88],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      tension: 0.1
    }, {
      label: 'Velocidad (seg)',
      data: [15, 12, 10, 8, 7, 6],
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      tension: 0.1,
      yAxisID: 'y1'
    }]
  };

  new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Rendimiento en el Tiempo'
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Precisión (%)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Tiempo (segundos)'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  });
}

// Función para actualizar datos de las gráficas
export function updateChartData(chartType, newData) {
  console.log(`Updating ${chartType} chart with new data:`, newData);
  // Implementar actualización de datos según sea necesario
}

// Función para redimensionar gráficas
export function resizeCharts() {
  if (typeof Chart !== 'undefined') {
    Chart.instances.forEach(chart => {
      chart.resize();
    });
  }
}

// Exportar funciones principales
export default {
  initializeCharts,
  updateChartData,
  resizeCharts
};

