// ===== DASHBOARD ENHANCED - FUNCIONALIDADES MODERNAS =====

/**
 * Classe para gerenciar o dashboard moderno
 */
class DashboardEnhanced {
    constructor() {
        this.animationQueue = [];
        this.charts = {};
        this.isInitialized = false;
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.init();
    }

    /**
     * Inicialização do dashboard
     */
    init() {
        this.setupIntersectionObserver();
        this.setupAnimations();
        this.setupChartInteractions();
        this.setupHeatmapInteractions();
        this.loadDashboardData();
        this.isInitialized = true;
        
        console.log('🎨 Dashboard Enhanced inicializado');
    }

    /**
     * Configurar observer para animações baseadas em scroll
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateElement(entry.target);
                    }
                });
            }, this.observerOptions);

            // Observar todos os cards de estatísticas
            document.querySelectorAll('.stat-card').forEach(card => {
                this.observer.observe(card);
            });

            // Observar containers de gráficos
            document.querySelectorAll('.chart-container').forEach(container => {
                this.observer.observe(container);
            });
        }
    }

    /**
     * Animar elemento quando entra na viewport
     */
    animateElement(element) {
        if (element.classList.contains('stat-card')) {
            this.animateStatCard(element);
        } else if (element.classList.contains('chart-container')) {
            this.animateChart(element);
        }
    }

    /**
     * Animar card de estatística
     */
    animateStatCard(card) {
        const valueElement = card.querySelector('.stat-value');
        const currentValue = valueElement.textContent;
        
        // Extrair número do texto
        const numericValue = parseInt(currentValue.replace(/[^\d]/g, '')) || 0;
        
        if (numericValue > 0) {
            this.animateCounter(valueElement, 0, numericValue, 1000);
        }

        // Adicionar classe de animação
        card.classList.add('animated');
    }

    /**
     * Animar contador numérico
     */
    animateCounter(element, start, end, duration) {
        const startTime = performance.now();
        const originalText = element.textContent;
        const suffix = originalText.replace(/[\d]/g, '');

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Usar easing function para suavizar a animação
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(start + (end - start) * easeOutQuart);
            
            element.textContent = currentValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Configurar animações CSS
     */
    setupAnimations() {
        // Adicionar classes de animação quando necessário
        const style = document.createElement('style');
        style.textContent = `
            .stat-card.animated {
                animation: statCardPulse 0.6s ease-out;
            }
            
            @keyframes statCardPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
            
            .chart-container.animated {
                animation: chartSlideIn 0.8s ease-out;
            }
            
            @keyframes chartSlideIn {
                0% { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                100% { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Configurar interações dos gráficos
     */
    setupChartInteractions() {
        // Configurar botões de filtro de tempo
        document.querySelectorAll('.chart-action').forEach(button => {
            button.addEventListener('click', (e) => {
                const period = e.target.textContent;
                this.updateChartPeriod(period, e.target);
            });
        });

        // Configurar hover nos gráficos
        document.querySelectorAll('.chart-canvas').forEach(canvas => {
            canvas.addEventListener('mouseenter', () => {
                canvas.style.transform = 'scale(1.02)';
                canvas.style.transition = 'transform 0.3s ease';
            });

            canvas.addEventListener('mouseleave', () => {
                canvas.style.transform = 'scale(1)';
            });
        });
    }

    /**
     * Atualizar período do gráfico
     */
    updateChartPeriod(period, button) {
        // Remover classe ativa de todos os botões
        button.parentElement.querySelectorAll('.chart-action').forEach(btn => {
            btn.classList.remove('active');
        });

        // Adicionar classe ativa ao botão clicado
        button.classList.add('active');

        // Simular carregamento de dados
        const chartContainer = button.closest('.chart-container');
        const canvas = chartContainer.querySelector('canvas');
        
        // Adicionar efeito de loading
        canvas.style.opacity = '0.5';
        canvas.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            canvas.style.opacity = '1';
            this.updateChartData(canvas, period);
        }, 500);

        console.log(`📊 Atualizando gráfico para período: ${period}`);
    }

    /**
     * Atualizar dados do gráfico
     */
    updateChartData(canvas, period) {
        // Aqui seria implementada a lógica real de atualização dos gráficos
        // Por enquanto, apenas simular a atualização
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Limpar canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Desenhar gráfico simples baseado no período
            this.drawSimpleChart(ctx, canvas, period);
        }
    }

    /**
     * Desenhar gráfico simples
     */
    drawSimpleChart(ctx, canvas, period) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Configurar estilo
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Gerar dados baseados no período
        const dataPoints = this.generateChartData(period);
        
        // Desenhar linha
        ctx.beginPath();
        dataPoints.forEach((point, index) => {
            const x = (index / (dataPoints.length - 1)) * width;
            const y = height - (point / 100) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Adicionar pontos
        ctx.fillStyle = '#6366f1';
        dataPoints.forEach((point, index) => {
            const x = (index / (dataPoints.length - 1)) * width;
            const y = height - (point / 100) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    /**
     * Gerar dados do gráfico baseado no período
     */
    generateChartData(period) {
        const dataCount = period === '7D' ? 7 : period === '30D' ? 30 : 90;
        const data = [];
        
        for (let i = 0; i < dataCount; i++) {
            // Gerar dados aleatórios com tendência crescente
            const baseValue = 20 + (i / dataCount) * 60;
            const randomVariation = (Math.random() - 0.5) * 20;
            data.push(Math.max(0, Math.min(100, baseValue + randomVariation)));
        }
        
        return data;
    }

    /**
     * Configurar interações do heatmap
     */
    setupHeatmapInteractions() {
        // Gerar heatmap dinâmico
        this.generateHeatmap();

        // Adicionar tooltips aos dias do heatmap
        document.querySelectorAll('.heatmap-day').forEach(day => {
            day.addEventListener('mouseenter', (e) => {
                this.showHeatmapTooltip(e.target);
            });

            day.addEventListener('mouseleave', () => {
                this.hideHeatmapTooltip();
            });
        });
    }

    /**
     * Gerar heatmap de atividade
     */
    generateHeatmap() {
        const heatmapGrid = document.getElementById('activity-heatmap');
        if (!heatmapGrid) return;

        // Limpar grid existente
        heatmapGrid.innerHTML = '';

        // Gerar 365 dias (53 semanas)
        for (let week = 0; week < 53; week++) {
            for (let day = 0; day < 7; day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'heatmap-day';
                
                // Gerar atividade aleatória
                const activity = Math.floor(Math.random() * 5);
                if (activity > 0) {
                    dayElement.classList.add(`activity-${activity}`);
                }
                
                // Adicionar data
                const date = new Date();
                date.setDate(date.getDate() - (52 - week) * 7 - (6 - day));
                dayElement.dataset.date = date.toISOString().split('T')[0];
                dayElement.dataset.activity = activity;
                
                heatmapGrid.appendChild(dayElement);
            }
        }
    }

    /**
     * Mostrar tooltip do heatmap
     */
    showHeatmapTooltip(element) {
        const date = element.dataset.date;
        const activity = element.dataset.activity;
        
        // Criar tooltip se não existir
        let tooltip = document.getElementById('heatmap-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'heatmap-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.2s ease;
            `;
            document.body.appendChild(tooltip);
        }

        // Atualizar conteúdo
        const activityText = activity === '0' ? 'Sem atividade' : `${activity} sessões`;
        tooltip.textContent = `${date}: ${activityText}`;

        // Posicionar tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
        tooltip.style.opacity = '1';
    }

    /**
     * Esconder tooltip do heatmap
     */
    hideHeatmapTooltip() {
        const tooltip = document.getElementById('heatmap-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    }

    /**
     * Carregar dados do dashboard
     */
    async loadDashboardData() {
        try {
            // Simular carregamento de dados
            const data = await this.fetchDashboardData();
            this.updateDashboardStats(data);
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            this.loadFallbackData();
        }
    }

    /**
     * Simular fetch de dados
     */
    async fetchDashboardData() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    totalCards: 1250,
                    studiedToday: 75,
                    accuracy: 92,
                    streak: 15,
                    studyTime: 130, // em minutos
                    totalProgress: 65
                });
            }, 1000);
        });
    }

    /**
     * Atualizar estatísticas do dashboard
     */
    updateDashboardStats(data) {
        // Atualizar valores com animação
        this.updateStatValue('total-cards', data.totalCards);
        this.updateStatValue('studied-today', data.studiedToday);
        this.updateStatValue('accuracy', data.accuracy, '%');
        this.updateStatValue('streak', data.streak);
        this.updateStatValue('study-time', Math.floor(data.studyTime / 60) + 'h ' + (data.studyTime % 60) + 'm');
        this.updateStatValue('total-progress', data.totalProgress, '%');

        // Atualizar textos de mudança
        this.updateStatChange('total-cards-change', '+12 esta semana');
        this.updateStatChange('studied-today-change', 'Meta: 20');
        this.updateStatChange('accuracy-change', '+5% vs ayer');
        this.updateStatChange('streak-change', 'días consecutivos');
        this.updateStatChange('study-time-change', 'hoy');
        this.updateStatChange('total-progress-change', 'completado');
    }

    /**
     * Atualizar valor de estatística
     */
    updateStatValue(elementId, value, suffix = '') {
        const element = document.getElementById(elementId);
        if (element) {
            const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
            if (numericValue > 0) {
                this.animateCounter(element, 0, numericValue, 1500);
                if (suffix) {
                    setTimeout(() => {
                        element.textContent = numericValue + suffix;
                    }, 1500);
                }
            } else {
                element.textContent = value + suffix;
            }
        }
    }

    /**
     * Atualizar texto de mudança
     */
    updateStatChange(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Carregar dados de fallback
     */
    loadFallbackData() {
        this.updateDashboardStats({
            totalCards: 0,
            studiedToday: 0,
            accuracy: 0,
            streak: 0,
            studyTime: 0,
            totalProgress: 0
        });
    }

    /**
     * Destruir instância
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Remover tooltips
        const tooltip = document.getElementById('heatmap-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
        
        this.isInitialized = false;
    }
}

// ===== INTEGRAÇÃO COM O SISTEMA EXISTENTE =====

/**
 * Função para inicializar o dashboard enhanced
 */
function initDashboardEnhanced() {
    if (window.dashboardEnhanced) {
        window.dashboardEnhanced.destroy();
    }
    
    window.dashboardEnhanced = new DashboardEnhanced();
}

/**
 * Função para atualizar período do gráfico (compatibilidade)
 */
function updateChartPeriod(period) {
    if (window.dashboardEnhanced) {
        const button = document.querySelector(`.chart-action[onclick*="${period}"]`);
        if (button) {
            window.dashboardEnhanced.updateChartPeriod(period, button);
        }
    }
}

// ===== INICIALIZAÇÃO AUTOMÁTICA =====

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardEnhanced);
} else {
    initDashboardEnhanced();
}

// Reinicializar quando a seção dashboard for mostrada
document.addEventListener('sectionChanged', (event) => {
    if (event.detail && event.detail.section === 'dashboard') {
        setTimeout(initDashboardEnhanced, 100);
    }
});

// Exportar para uso global
window.DashboardEnhanced = DashboardEnhanced;
window.initDashboardEnhanced = initDashboardEnhanced;
window.updateChartPeriod = updateChartPeriod;

