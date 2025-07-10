/**
 * MOBILE FIXES - Correcciones específicas para dispositivos móviles
 * ================================================================
 * 
 * Este archivo contiene correcciones específicas para mejorar la funcionalidad
 * en dispositivos móviles y tablets, especialmente para el botón de estudiar.
 */

// Detectar si es un dispositivo móvil
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
};

// Mejorar event listeners para dispositivos móviles
const enhanceMobileEventListeners = () => {
    console.log('🔧 Aplicando correcciones móviles...');
    
    // Función para agregar eventos tanto de click como touch
    const addMobileEvents = (element, handler) => {
        if (!element) return;
        
        // Remover eventos existentes para evitar duplicados
        element.removeEventListener('click', handler);
        element.removeEventListener('touchstart', handler);
        element.removeEventListener('touchend', handler);
        
        // Agregar eventos optimizados para móvil
        if (isMobileDevice()) {
            // Para dispositivos móviles, usar touchstart para respuesta más rápida
            element.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevenir el click fantasma
                handler(e);
            }, { passive: false });
            
            // Fallback para click
            element.addEventListener('click', handler);
        } else {
            // Para desktop, usar solo click
            element.addEventListener('click', handler);
        }
    };
    
    // Mejorar navegación principal
    const navLinks = document.querySelectorAll('[data-section]');
    navLinks.forEach(link => {
        addMobileEvents(link, (e) => {
            e.preventDefault();
            const section = e.target.dataset.section || e.currentTarget.dataset.section;
            if (section && window.showSection) {
                console.log(`📱 Navegando a: ${section}`);
                window.showSection(section);
            }
        });
    });
    
    // Mejorar botones de estudio específicamente
    const studyButtons = document.querySelectorAll('.btn-study, [onclick*="startStudy"]');
    studyButtons.forEach(button => {
        addMobileEvents(button, (e) => {
            e.preventDefault();
            const deckId = button.getAttribute('onclick')?.match(/startStudy\('([^']+)'\)/)?.[1];
            if (deckId && window.StudyingFlash) {
                console.log(`📱 Iniciando estudio del deck: ${deckId}`);
                window.StudyingFlash.startStudy(deckId);
            }
        });
    });
    
    // Mejorar botones de dificultad en estudio
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(button => {
        addMobileEvents(button, (e) => {
            e.preventDefault();
            const quality = parseInt(e.currentTarget.dataset.quality);
            if (!isNaN(quality) && window.StudyingFlash) {
                console.log(`📱 Respuesta de calidad: ${quality}`);
                window.StudyingFlash.processStudyAnswer(quality);
            }
        });
    });
    
    // Mejorar volteo de flashcards
    const flashcardElement = document.getElementById('flashcard');
    if (flashcardElement) {
        addMobileEvents(flashcardElement, (e) => {
            e.preventDefault();
            if (window.StudyingFlash && window.StudyingFlash.flipCard) {
                console.log('📱 Volteando flashcard');
                window.StudyingFlash.flipCard();
            }
        });
    }
    
    console.log('✅ Correcciones móviles aplicadas');
};

// Mejorar la función showSection para móviles
const enhanceShowSectionForMobile = () => {
    const originalShowSection = window.showSection;
    
    window.showSection = function(sectionName) {
        console.log(`📱 showSection mejorado llamado para: ${sectionName}`);
        
        // Llamar a la función original
        if (originalShowSection) {
            const result = originalShowSection(sectionName);
            
            // Aplicar correcciones específicas después de cambiar sección
            setTimeout(() => {
                enhanceMobileEventListeners();
                
                // Scroll suave al inicio de la sección en móviles
                if (isMobileDevice()) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);
            
            return result;
        }
    };
};

// Agregar estilos CSS específicos para móvil
const addMobileStyles = () => {
    const mobileStyles = document.createElement('style');
    mobileStyles.id = 'mobile-fixes-styles';
    mobileStyles.textContent = `
        /* Mejoras táctiles para móviles */
        @media (max-width: 768px) {
            /* Mejorar área táctil de botones */
            .nav-link, .btn, button, [data-section] {
                min-height: 44px !important;
                min-width: 44px !important;
                padding: 12px 16px !important;
                touch-action: manipulation;
                -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
            }
            
            /* Mejorar botón de estudiar específicamente */
            .btn-study, [onclick*="startStudy"] {
                background: #2563eb !important;
                color: white !important;
                border: none !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                font-size: 16px !important;
                min-height: 48px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            
            .btn-study:active, [onclick*="startStudy"]:active {
                background: #1d4ed8 !important;
                transform: scale(0.98) !important;
            }
            
            /* Mejorar flashcard para táctil */
            #flashcard {
                cursor: pointer !important;
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
            }
            
            /* Mejorar botones de dificultad */
            .difficulty-btn {
                min-height: 48px !important;
                min-width: 80px !important;
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
            }
            
            /* Prevenir zoom en inputs */
            input, select, textarea {
                font-size: 16px !important;
            }
            
            /* Mejorar navegación móvil */
            .nav-container {
                position: sticky !important;
                top: 0 !important;
                z-index: 1000 !important;
                background: var(--bg-color, #ffffff) !important;
                border-bottom: 1px solid var(--border-color, #e5e7eb) !important;
            }
        }
        
        /* Animaciones suaves para feedback táctil */
        .nav-link:active, .btn:active, button:active, [data-section]:active {
            transform: scale(0.98);
            transition: transform 0.1s ease;
        }
    `;
    
    // Remover estilos existentes si los hay
    const existingStyles = document.getElementById('mobile-fixes-styles');
    if (existingStyles) {
        existingStyles.remove();
    }
    
    document.head.appendChild(mobileStyles);
    console.log('📱 Estilos móviles aplicados');
};

// Función principal de inicialización
const initMobileFixes = () => {
    console.log('📱 Inicializando correcciones móviles...');
    console.log('📱 Dispositivo móvil detectado:', isMobileDevice());
    
    // Aplicar correcciones
    addMobileStyles();
    enhanceShowSectionForMobile();
    enhanceMobileEventListeners();
    
    // Re-aplicar correcciones cuando el DOM cambie
    const observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldReapply = true;
            }
        });
        
        if (shouldReapply) {
            setTimeout(enhanceMobileEventListeners, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Correcciones móviles inicializadas');
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileFixes);
} else {
    initMobileFixes();
}

// Re-inicializar cuando la aplicación principal esté lista
window.addEventListener('load', () => {
    setTimeout(initMobileFixes, 500);
});

// Exponer funciones globalmente para debugging
window.MobileFixes = {
    init: initMobileFixes,
    enhance: enhanceMobileEventListeners,
    isMobile: isMobileDevice
};

console.log('📱 Mobile Fixes cargado - Versión 1.0');

