/**
 * Correção definitiva para o dashboard
 * Este script garante que os dados do dashboard sejam carregados corretamente
 * Versão 2.0 - Melhorada com tratamento de erros e compatibilidade com API
 */

// Configuração da API
const API_CONFIG = {
  baseUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://flashcard-u10n.onrender.com',
  endpoints: {
    stats: '/api/stats',
    decks: '/api/decks',
    health: '/health'
  },
  timeout: 5000,
  retryAttempts: 2
};

// Função para carregar dados do dashboard com fallback
async function loadDashboardDataFixed() {
  console.log('🔧 Carregando dados do dashboard (versão melhorada)...');
  
  try {
    // Verificar conectividade com a API
    const isApiAvailable = await checkApiConnection();
    console.log(`🔌 API ${isApiAvailable ? 'disponível' : 'indisponível'}`);
    
    // Dados de fallback para quando a API não estiver disponível
    const fallbackStats = {
      totalCards: 0,
      studiedToday: 0,
      accuracy: 0,
      streak: 0,
      totalProgress: 0,
      totalStudyTime: 0,
      weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
      weeklyAccuracy: [0, 0, 0, 0, 0, 0, 0]
    };
    
    const fallbackDecks = [];
    
    // Carregar dados em paralelo para melhor performance
    const [stats, decks] = await Promise.all([
      fetchWithFallback(API_CONFIG.endpoints.stats, fallbackStats),
      fetchWithFallback(API_CONFIG.endpoints.decks, fallbackDecks)
    ]);
    
    // Atualizar interface com os dados
    updateDashboardStatsFixed(stats);
    updateDashboardDecksFixed(decks);
    
    // Inicializar gráficos se disponíveis
    if (typeof initializeCharts === 'function') {
      try {
        initializeCharts();
        
        // Atualizar gráficos com dados reais
        if (stats.weeklyProgress && typeof updateProgressChart === 'function') {
          updateProgressChart({
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            progress: stats.weeklyProgress,
            target: 85
          }, '7d');
        }
        
        if (stats.weeklyAccuracy && typeof updateAccuracyChart === 'function') {
          updateAccuracyChart({
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            accuracy: stats.weeklyAccuracy,
            target: 85
          }, '7d');
        }
      } catch (chartError) {
        console.warn('⚠️ Erro ao inicializar gráficos:', chartError);
      }
    }
    
    // Inicializar heatmap se disponível
    if (typeof generateActivityHeatmap === 'function') {
      try {
        generateActivityHeatmap();
      } catch (heatmapError) {
        console.warn('⚠️ Erro ao inicializar heatmap:', heatmapError);
      }
    }
    
    console.log('✅ Dashboard carregado com sucesso');
    
    // Mostrar notificação de status
    if (typeof showNotification === 'function') {
      if (isApiAvailable) {
        showNotification('Dashboard atualizado com sucesso', 'success', 3000);
      } else {
        showNotification('Modo offline ativado', 'warning', 5000);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    
    // Em caso de erro, usar dados de fallback
    updateDashboardStatsFixed({
      totalCards: 0,
      studiedToday: 0,
      accuracy: 0,
      streak: 0,
      totalProgress: 0,
      totalStudyTime: 0
    });
    updateDashboardDecksFixed([]);
    
    // Mostrar notificação de erro
    if (typeof showNotification === 'function') {
      showNotification('Erro ao carregar dados do dashboard', 'error', 5000);
    }
  }
}

// Função para verificar conexão com a API
async function checkApiConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.health}`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('⚠️ API indisponível:', error.message);
    return false;
  }
}

// Função para buscar dados com fallback
async function fetchWithFallback(endpoint, fallbackData) {
  try {
    for (let attempt = 0; attempt < API_CONFIG.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        
        // Se não for erro de servidor, não tentar novamente
        if (response.status < 500) {
          break;
        }
        
        // Esperar antes de tentar novamente
        if (attempt < API_CONFIG.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (fetchError) {
        if (fetchError.name === 'AbortError') {
          console.warn(`⚠️ Timeout ao buscar ${endpoint}`);
        } else {
          console.warn(`⚠️ Erro ao buscar ${endpoint}:`, fetchError.message);
        }
        
        // Esperar antes de tentar novamente
        if (attempt < API_CONFIG.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.warn(`⚠️ Usando dados de fallback para ${endpoint}`);
    return fallbackData;
  } catch (error) {
    console.error(`❌ Erro ao buscar ${endpoint}:`, error);
    return fallbackData;
  }
}

// Função para atualizar estatísticas do dashboard
function updateDashboardStatsFixed(stats) {
  console.log('📊 Atualizando estatísticas:', stats);
  
  const elements = {
    'total-cards': stats.totalCards || 0,
    'studied-today': stats.studiedToday || 0,
    'accuracy': `${stats.accuracy || 0}%`,
    'streak': stats.streak || 0,
    'total-progress': `${stats.totalProgress || 0}%`,
    'study-time': formatStudyTime(stats.totalStudyTime || 0)
  };
  
  // Atualizar elementos com animação
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      // Adicionar animação de atualização
      element.classList.remove('stat-updated');
      void element.offsetWidth; // Forçar reflow para reiniciar animação
      element.textContent = value;
      element.classList.add('stat-updated');
      
      console.log(`✅ Atualizado ${id}: ${value}`);
    } else {
      console.warn(`⚠️ Elemento ${id} não encontrado`);
    }
  });
  
  // Atualizar nível do usuário se disponível
  const userLevel = document.getElementById('user-level');
  if (userLevel) {
    const levelText = userLevel.querySelector('span:last-child');
    if (levelText) {
      levelText.textContent = `Nivel ${stats.level || 1}`;
    }
  }
  
  // Atualizar pontos do usuário se disponível
  const userPoints = document.getElementById('user-points');
  if (userPoints) {
    const pointsText = userPoints.querySelector('span');
    if (pointsText) {
      pointsText.textContent = `${stats.points || 0} pts`;
    }
  }
}

// Função para atualizar lista de decks
function updateDashboardDecksFixed(decks) {
  console.log('📚 Atualizando decks:', decks);
  
  const decksList = document.getElementById('dashboard-decks-list');
  
  if (!decksList) {
    console.warn('⚠️ Elemento dashboard-decks-list não encontrado');
    return;
  }
  
  if (!Array.isArray(decks) || decks.length === 0) {
    decksList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>Nenhum deck encontrado</h3>
        <p>Crie seu primeiro deck para começar a estudar!</p>
        <button class="btn btn-primary" onclick="showSection('crear')">
          Criar Primeiro Deck
        </button>
      </div>
    `;
    return;
  }
  
  const decksHTML = decks.map(deck => `
    <div class="deck-card" data-deck-id="${deck.id || 0}">
      <div class="deck-header">
        <h3 class="deck-name">${sanitizeHTML(deck.name) || 'Deck sem nome'}</h3>
        <span class="deck-count">${deck.card_count || 0} cartões</span>
      </div>
      <div class="deck-info">
        <p class="deck-description">${sanitizeHTML(deck.description) || 'Sem descrição'}</p>
        <p class="deck-last-studied">
          Último estudo: ${formatRelativeDate(deck.last_studied)}
        </p>
      </div>
      <div class="deck-actions">
        <button onclick="startStudySession(${deck.id || 0})" class="btn btn-primary btn-sm">
          Estudar
        </button>
        <button onclick="showSection('gestionar')" class="btn btn-secondary btn-sm">
          Gerenciar
        </button>
      </div>
    </div>
  `).join('');
  
  decksList.innerHTML = decksHTML;
  console.log(`✅ ${decks.length} decks carregados`);
  
  // Adicionar animação de entrada
  const deckCards = decksList.querySelectorAll('.deck-card');
  deckCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
    card.classList.add('deck-card-animated');
  });
}

// Função auxiliar para formatar tempo de estudo
function formatStudyTime(minutes) {
  if (!minutes || minutes === 0) return '0h 0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}h ${mins}m`;
}

// Função auxiliar para formatar data relativa
function formatRelativeDate(dateString) {
  if (!dateString) return 'Nunca';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (isNaN(date.getTime())) return 'Nunca';
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.ceil(diffDays / 7)} semanas`;
    
    // Formatar data de acordo com o idioma do navegador
    return date.toLocaleDateString(navigator.language || 'pt-BR');
  } catch (error) {
    console.warn('⚠️ Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

// Função para sanitizar HTML e prevenir XSS
function sanitizeHTML(text) {
  if (!text) return '';
  
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML;
}

// Função para inicializar o dashboard
function initializeDashboardFixed() {
  console.log('🚀 Inicializando dashboard corrigido...');
  
  // Aguardar um pouco para garantir que o DOM está pronto
  setTimeout(() => {
    loadDashboardDataFixed();
    
    // Configurar atualização periódica (a cada 5 minutos)
    setInterval(() => {
      loadDashboardDataFixed();
    }, 5 * 60 * 1000);
  }, 100);
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboardFixed);
} else {
  initializeDashboardFixed();
}

// Adicionar estilos para animações
const styleElement = document.createElement('style');
styleElement.textContent = `
  .stat-updated {
    animation: stat-pulse 0.5s ease-in-out;
  }
  
  @keyframes stat-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); color: #6366f1; }
    100% { transform: scale(1); }
  }
  
  .deck-card-animated {
    animation: deck-fade-in 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(10px);
  }
  
  @keyframes deck-fade-in {
    to { opacity: 1; transform: translateY(0); }
  }
  
  .empty-state {
    text-align: center;
    padding: 2rem;
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    margin: 1rem 0;
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
`;
document.head.appendChild(styleElement);

// Expor funções globalmente para compatibilidade
window.loadDashboardDataFixed = loadDashboardDataFixed;
window.updateDashboardStatsFixed = updateDashboardStatsFixed;
window.updateDashboardDecksFixed = updateDashboardDecksFixed;

// Substituir função original se existir
window.loadDashboardData = loadDashboardDataFixed;

console.log('✅ Dashboard fix melhorado carregado com sucesso');

