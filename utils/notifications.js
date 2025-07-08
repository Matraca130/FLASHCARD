/**
 * Sistema de Notificaciones Unificado - Calidad Empresarial Premium
 * Centraliza todas las notificaciones para consistencia y mantenibilidad
 */

class NotificationManager {
    /**
     * Configuración por defecto para notificaciones
     */
    static config = {
        duration: 3000,
        position: 'top-right',
        showIcon: true,
        allowDismiss: true
    };
    
    /**
     * Tipos de notificación estandarizados
     */
    static types = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };
    
    /**
     * Muestra una notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación (success, error, warning, info)
     * @param {Object} options - Opciones adicionales
     */
    static show(message, type = this.types.INFO, options = {}) {
        const finalOptions = { ...this.config, ...options };
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type, finalOptions);
            return;
        }
        
        // Fallback a implementación básica
        this._showBasicNotification(message, type, finalOptions);
    }
    
    /**
     * Notificación de éxito
     * @param {string} message - Mensaje de éxito
     * @param {Object} options - Opciones adicionales
     */
    static success(message, options = {}) {
        this.show(message, this.types.SUCCESS, options);
    }
    
    /**
     * Notificación de error
     * @param {string} message - Mensaje de error
     * @param {Object} options - Opciones adicionales
     */
    static error(message, options = {}) {
        this.show(message, this.types.ERROR, { 
            ...options, 
            duration: options.duration || 5000 // Errores duran más
        });
    }
    
    /**
     * Notificación de advertencia
     * @param {string} message - Mensaje de advertencia
     * @param {Object} options - Opciones adicionales
     */
    static warning(message, options = {}) {
        this.show(message, this.types.WARNING, options);
    }
    
    /**
     * Notificación informativa
     * @param {string} message - Mensaje informativo
     * @param {Object} options - Opciones adicionales
     */
    static info(message, options = {}) {
        this.show(message, this.types.INFO, options);
    }
    
    /**
     * Implementación básica de notificación como fallback
     * @private
     */
    static _showBasicNotification(message, type, options) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
        `;
        
        // Colores según tipo
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        // Agregar al DOM
        document.body.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-remover
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, options.duration);
        
        // Permitir cerrar manualmente
        if (options.allowDismiss) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', () => {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            });
        }
    }
}

/**
 * Mensajes estandarizados para operaciones comunes
 */
class StandardMessages {
    // Mensajes de éxito
    static success = {
        FLASHCARD_CREATED: 'Flashcard creada exitosamente',
        FLASHCARD_UPDATED: 'Flashcard actualizada exitosamente',
        FLASHCARD_DELETED: 'Flashcard eliminada exitosamente',
        DECK_CREATED: 'Deck creado exitosamente',
        DECK_UPDATED: 'Deck actualizado exitosamente',
        DECK_DELETED: 'Deck eliminado exitosamente',
        DATA_SAVED: 'Datos guardados exitosamente',
        OPERATION_COMPLETED: 'Operación completada exitosamente'
    };
    
    // Mensajes de error
    static error = {
        REQUIRED_FIELDS: 'Por favor, completa todos los campos requeridos',
        NETWORK_ERROR: 'Error de conexión. Por favor, intenta nuevamente',
        SERVER_ERROR: 'Error interno del servidor. Por favor, intenta más tarde',
        UNAUTHORIZED: 'No tienes permisos para realizar esta acción',
        NOT_FOUND: 'El recurso solicitado no fue encontrado',
        VALIDATION_ERROR: 'Los datos ingresados no son válidos',
        OPERATION_FAILED: 'La operación no pudo completarse'
    };
    
    // Mensajes de advertencia
    static warning = {
        UNSAVED_CHANGES: 'Tienes cambios sin guardar',
        CONFIRM_DELETE: '¿Estás seguro de que deseas eliminar este elemento?',
        NETWORK_SLOW: 'La conexión es lenta, por favor espera',
        BROWSER_COMPATIBILITY: 'Algunas funciones pueden no estar disponibles en tu navegador'
    };
    
    // Mensajes informativos
    static info = {
        LOADING: 'Cargando...',
        SAVING: 'Guardando...',
        PROCESSING: 'Procesando...',
        NO_DATA: 'No hay datos disponibles',
        EMPTY_STATE: 'No se encontraron elementos'
    };
}

/**
 * Utilidades específicas para notificaciones de flashcards
 */
class FlashcardNotifications {
    static created() {
        NotificationManager.success(StandardMessages.success.FLASHCARD_CREATED);
    }
    
    static updated() {
        NotificationManager.success(StandardMessages.success.FLASHCARD_UPDATED);
    }
    
    static deleted() {
        NotificationManager.success(StandardMessages.success.FLASHCARD_DELETED);
    }
    
    static validationError() {
        NotificationManager.warning(StandardMessages.error.REQUIRED_FIELDS);
    }
    
    static createError() {
        NotificationManager.error('Error al crear la flashcard');
    }
    
    static updateError() {
        NotificationManager.error('Error al actualizar la flashcard');
    }
    
    static deleteError() {
        NotificationManager.error('Error al eliminar la flashcard');
    }
}

/**
 * Utilidades específicas para notificaciones de decks
 */
class DeckNotifications {
    static created() {
        NotificationManager.success(StandardMessages.success.DECK_CREATED);
    }
    
    static updated() {
        NotificationManager.success(StandardMessages.success.DECK_UPDATED);
    }
    
    static deleted() {
        NotificationManager.success(StandardMessages.success.DECK_DELETED);
    }
    
    static validationError() {
        NotificationManager.warning(StandardMessages.error.REQUIRED_FIELDS);
    }
    
    static createError() {
        NotificationManager.error('Error al crear el deck');
    }
    
    static updateError() {
        NotificationManager.error('Error al actualizar el deck');
    }
    
    static deleteError() {
        NotificationManager.error('Error al eliminar el deck');
    }
}

/**
 * Utilidades para notificaciones de red y API
 */
class NetworkNotifications {
    static connectionError() {
        NotificationManager.error(StandardMessages.error.NETWORK_ERROR);
    }
    
    static serverError() {
        NotificationManager.error(StandardMessages.error.SERVER_ERROR);
    }
    
    static unauthorized() {
        NotificationManager.error(StandardMessages.error.UNAUTHORIZED);
    }
    
    static notFound() {
        NotificationManager.error(StandardMessages.error.NOT_FOUND);
    }
    
    static loading() {
        NotificationManager.info(StandardMessages.info.LOADING);
    }
    
    static saving() {
        NotificationManager.info(StandardMessages.info.SAVING);
    }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotificationManager,
        StandardMessages,
        FlashcardNotifications,
        DeckNotifications,
        NetworkNotifications
    };
}

// Hacer disponible globalmente
window.NotificationManager = NotificationManager;
window.StandardMessages = StandardMessages;
window.FlashcardNotifications = FlashcardNotifications;
window.DeckNotifications = DeckNotifications;
window.NetworkNotifications = NetworkNotifications;

