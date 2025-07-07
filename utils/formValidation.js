/**
 * Validaciones de Formulario Unificadas - Calidad Empresarial Premium
 * Elimina duplicación de validaciones en todo el frontend
 */

class FormValidator {
    /**
     * Valida que los campos requeridos no estén vacíos
     * @param {Object} formData - Datos del formulario
     * @param {Array} requiredFields - Lista de campos requeridos
     * @returns {Object} - {isValid: boolean, errors: Array}
     */
    static validateRequiredFields(formData, requiredFields) {
        const errors = [];
        
        for (const field of requiredFields) {
            const value = formData[field];
            
            if (!value || (typeof value === 'string' && !value.trim())) {
                errors.push(`El campo ${field} es requerido`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Valida un formulario de flashcard
     * @param {Object} formData - {deckId, front, back}
     * @returns {Object} - {isValid: boolean, errors: Array}
     */
    static validateFlashcardForm(formData) {
        const requiredFields = ['deckId', 'front', 'back'];
        const validation = this.validateRequiredFields(formData, requiredFields);
        
        // Validaciones adicionales específicas
        if (formData.front && formData.front.trim().length > 1000) {
            validation.errors.push('El texto frontal no puede exceder 1000 caracteres');
            validation.isValid = false;
        }
        
        if (formData.back && formData.back.trim().length > 1000) {
            validation.errors.push('El texto trasero no puede exceder 1000 caracteres');
            validation.isValid = false;
        }
        
        return validation;
    }
    
    /**
     * Valida un formulario de deck
     * @param {Object} formData - {name, description}
     * @returns {Object} - {isValid: boolean, errors: Array}
     */
    static validateDeckForm(formData) {
        const requiredFields = ['name'];
        const validation = this.validateRequiredFields(formData, requiredFields);
        
        // Validaciones adicionales
        if (formData.name && formData.name.trim().length < 2) {
            validation.errors.push('El nombre del deck debe tener al menos 2 caracteres');
            validation.isValid = false;
        }
        
        if (formData.name && formData.name.trim().length > 100) {
            validation.errors.push('El nombre del deck no puede exceder 100 caracteres');
            validation.isValid = false;
        }
        
        return validation;
    }
    
    /**
     * Obtiene los datos de un formulario de manera segura
     * @param {string} formSelector - Selector del formulario
     * @returns {Object|null} - Datos del formulario o null si no existe
     */
    static getFormData(formSelector) {
        const form = document.querySelector(formSelector);
        if (!form) {
            console.error(`Formulario no encontrado: ${formSelector}`);
            return null;
        }
        
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    /**
     * Obtiene datos específicos de elementos del DOM
     * @param {Object} fieldSelectors - {fieldName: selector}
     * @returns {Object} - Datos extraídos
     */
    static getFieldData(fieldSelectors) {
        const data = {};
        
        for (const [fieldName, selector] of Object.entries(fieldSelectors)) {
            const element = document.querySelector(selector);
            if (element) {
                data[fieldName] = element.value?.trim() || '';
            } else {
                console.warn(`Elemento no encontrado: ${selector}`);
                data[fieldName] = '';
            }
        }
        
        return data;
    }
    
    /**
     * Limpia un formulario
     * @param {string} formSelector - Selector del formulario
     */
    static clearForm(formSelector) {
        const form = document.querySelector(formSelector);
        if (form) {
            form.reset();
        }
    }
    
    /**
     * Limpia campos específicos
     * @param {Array} selectors - Array de selectores de campos
     */
    static clearFields(selectors) {
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = '';
            }
        });
    }
}

/**
 * Utilidades específicas para formularios de flashcards
 */
class FlashcardFormUtils {
    /**
     * Obtiene datos del formulario de creación de flashcard
     * @returns {Object} - {deckId, front, back}
     */
    static getCreateFormData() {
        return FormValidator.getFieldData({
            deckId: '#deck-select',
            front: '#front-text',
            back: '#back-text'
        });
    }
    
    /**
     * Limpia el formulario de creación de flashcard
     */
    static clearCreateForm() {
        FormValidator.clearFields(['#front-text', '#back-text']);
        // Mantener el deck seleccionado para facilitar creación múltiple
    }
    
    /**
     * Valida y obtiene datos del formulario de flashcard
     * @returns {Object} - {isValid, data, errors}
     */
    static validateAndGetData() {
        const data = this.getCreateFormData();
        const validation = FormValidator.validateFlashcardForm(data);
        
        return {
            isValid: validation.isValid,
            data: data,
            errors: validation.errors
        };
    }
}

/**
 * Utilidades específicas para formularios de decks
 */
class DeckFormUtils {
    /**
     * Obtiene datos del formulario de creación de deck
     * @returns {Object} - {name, description}
     */
    static getCreateFormData() {
        return FormValidator.getFieldData({
            name: '#deck-name',
            description: '#deck-description'
        });
    }
    
    /**
     * Limpia el formulario de creación de deck
     */
    static clearCreateForm() {
        FormValidator.clearFields(['#deck-name', '#deck-description']);
    }
    
    /**
     * Valida y obtiene datos del formulario de deck
     * @returns {Object} - {isValid, data, errors}
     */
    static validateAndGetData() {
        const data = this.getCreateFormData();
        const validation = FormValidator.validateDeckForm(data);
        
        return {
            isValid: validation.isValid,
            data: data,
            errors: validation.errors
        };
    }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FormValidator,
        FlashcardFormUtils,
        DeckFormUtils
    };
}

// Hacer disponible globalmente para compatibilidad
window.FormValidator = FormValidator;
window.FlashcardFormUtils = FlashcardFormUtils;
window.DeckFormUtils = DeckFormUtils;

