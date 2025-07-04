import { api } from '../apiClient.js';
import { showNotification } from '../utils/helpers.js';

// Variables globales para el proceso de importación
let importFileContent = null;
let importFileFormat = null;

/**
 * Exporta un deck en el formato especificado
 */
export async function exportDeck(deckId, format = 'json') {
  try {
    const response = await fetch(`${window.API_BASE || ''}/api/decks/${deckId}/export?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al exportar deck');
    }
    
    if (format === 'csv') {
      const blob = await response.blob();
      downloadFile(blob, `deck_${deckId}.csv`, 'text/csv');
    } else {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadFile(blob, `deck_${deckId}.json`, 'application/json');
    }
    
    showNotification('Deck exportado exitosamente', 'success');
    
  } catch (error) {
    console.error('Error exporting deck:', error);
    showNotification('Error al exportar el deck', 'error');
  }
}

/**
 * Descarga un archivo
 */
function downloadFile(blob, filename, mimeType) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Maneja la subida de archivos
 */
export function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    processImportFile(file);
  }
}

/**
 * Maneja el drag over
 */
export function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('dragover');
}

/**
 * Maneja el drag leave
 */
export function handleDragLeave(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
}

/**
 * Maneja el drop de archivos
 */
export function handleFileDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
  
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processImportFile(files[0]);
  }
}

/**
 * Procesa un archivo para importación
 */
export async function processImportFile(file) {
  try {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!['json', 'csv', 'txt'].includes(fileExtension)) {
      showNotification('Formato de archivo no soportado. Use JSON, CSV o TXT', 'error');
      return;
    }
    
    const content = await readFileContent(file);
    
    // Validar contenido según el formato
    if (fileExtension === 'json') {
      try {
        const parsed = JSON.parse(content);
        if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
          throw new Error('Formato JSON inválido');
        }
        importFileContent = parsed;
        importFileFormat = 'json';
      } catch (error) {
        showNotification('Archivo JSON inválido', 'error');
        return;
      }
    } else if (fileExtension === 'csv') {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        showNotification('El archivo CSV debe tener al menos una fila de datos', 'error');
        return;
      }
      importFileContent = content;
      importFileFormat = 'csv';
    } else if (fileExtension === 'txt') {
      importFileContent = content;
      importFileFormat = 'txt';
    }
    
    // Mostrar preview del archivo
    showImportPreview(file.name, fileExtension);
    showNotification(`Archivo ${file.name} cargado exitosamente`, 'success');
    
  } catch (error) {
    console.error('Error processing file:', error);
    showNotification('Error al procesar el archivo', 'error');
  }
}

/**
 * Lee el contenido de un archivo
 */
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Muestra preview del archivo importado
 */
function showImportPreview(filename, format) {
  const previewContainer = document.getElementById('import-preview');
  if (!previewContainer) return;
  
  let previewContent = '';
  let cardCount = 0;
  
  if (format === 'json' && importFileContent) {
    cardCount = importFileContent.flashcards ? importFileContent.flashcards.length : 0;
    previewContent = `
      <div class="import-preview-item">
        <strong>Archivo:</strong> ${filename}
      </div>
      <div class="import-preview-item">
        <strong>Formato:</strong> JSON
      </div>
      <div class="import-preview-item">
        <strong>Flashcards:</strong> ${cardCount}
      </div>
    `;
  } else if (format === 'csv' && importFileContent) {
    const lines = importFileContent.split('\n').filter(line => line.trim());
    cardCount = Math.max(0, lines.length - 1); // Restar header
    previewContent = `
      <div class="import-preview-item">
        <strong>Archivo:</strong> ${filename}
      </div>
      <div class="import-preview-item">
        <strong>Formato:</strong> CSV
      </div>
      <div class="import-preview-item">
        <strong>Flashcards:</strong> ${cardCount}
      </div>
    `;
  } else if (format === 'txt' && importFileContent) {
    const lines = importFileContent.split('\n').filter(line => line.trim());
    cardCount = Math.floor(lines.length / 2); // Asumiendo formato front/back alternado
    previewContent = `
      <div class="import-preview-item">
        <strong>Archivo:</strong> ${filename}
      </div>
      <div class="import-preview-item">
        <strong>Formato:</strong> TXT
      </div>
      <div class="import-preview-item">
        <strong>Flashcards estimadas:</strong> ${cardCount}
      </div>
    `;
  }
  
  previewContainer.innerHTML = previewContent;
  previewContainer.style.display = 'block';
}

/**
 * Importa un deck
 */
export async function importDeck() {
  if (!importFileContent || !importFileFormat) {
    showNotification('Por favor, selecciona un archivo primero', 'error');
    return;
  }
  
  const deckNameInput = document.getElementById('import-deck-name');
  const deckName = deckNameInput ? deckNameInput.value.trim() : '';
  
  if (!deckName) {
    showNotification('Por favor, ingresa un nombre para el deck importado', 'error');
    return;
  }
  
  try {
    const response = await api('/api/decks/import', {
      method: 'POST',
      body: JSON.stringify({
        content: importFileContent,
        format: importFileFormat,
        deck_name: deckName
      })
    });
    
    if (response.id) {
      showNotification(`Deck "${deckName}" importado exitosamente`, 'success');
      
      // Limpiar formulario
      if (deckNameInput) deckNameInput.value = '';
      clearImportData();
      
      // Recargar datos si estamos en gestión
      if (window.loadManageData) {
        window.loadManageData();
      }
      
      // Ocultar modal si existe
      const modal = document.getElementById('import-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
    
  } catch (error) {
    console.error('Error importing deck:', error);
    showNotification('Error al importar el deck', 'error');
  }
}

/**
 * Limpia los datos de importación
 */
export function clearImportData() {
  importFileContent = null;
  importFileFormat = null;
  
  const previewContainer = document.getElementById('import-preview');
  if (previewContainer) {
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';
  }
  
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.value = '';
  }
}

/**
 * Carga las opciones de exportación para un deck
 */
export async function loadExportOptions(deckId) {
  try {
    const response = await api(`/api/decks/${deckId}`);
    const deck = response;
    
    const container = document.getElementById('export-options');
    if (!container) return;
    
    container.innerHTML = `
      <div class="export-deck-info">
        <h4>${deck.name}</h4>
        <p>${deck.description || 'Sin descripción'}</p>
        <p><strong>Flashcards:</strong> ${deck.flashcard_count || 0}</p>
      </div>
      <div class="export-formats">
        <button class="btn btn-primary" onclick="exportDeck(${deckId}, 'json')">
          Exportar como JSON
        </button>
        <button class="btn btn-secondary" onclick="exportDeck(${deckId}, 'csv')">
          Exportar como CSV
        </button>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading export options:', error);
    showNotification('Error al cargar opciones de exportación', 'error');
  }
}

/**
 * Inicializa los event listeners para importación/exportación
 */
export function initializeImportExportEvents() {
  // Event listener para subida de archivos
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
  
  // Event listeners para drag and drop
  const dropZone = document.getElementById('import-drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleFileDrop);
  }
  
  // Event listener para importar
  const importBtn = document.getElementById('import-deck-btn');
  if (importBtn) {
    importBtn.addEventListener('click', importDeck);
  }
  
  // Event listener para limpiar
  const clearBtn = document.getElementById('clear-import-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearImportData);
  }
}

/**
 * Obtiene formatos de exportación soportados
 */
export function getSupportedExportFormats() {
  return [
    {
      format: 'json',
      name: 'JSON',
      description: 'Formato JSON con metadatos completos',
      extension: '.json'
    },
    {
      format: 'csv',
      name: 'CSV',
      description: 'Archivo CSV compatible con Excel',
      extension: '.csv'
    }
  ];
}

/**
 * Obtiene formatos de importación soportados
 */
export function getSupportedImportFormats() {
  return [
    {
      format: 'json',
      name: 'JSON',
      description: 'Archivo JSON exportado desde la aplicación',
      extension: '.json'
    },
    {
      format: 'csv',
      name: 'CSV',
      description: 'Archivo CSV con columnas: front, back',
      extension: '.csv'
    },
    {
      format: 'txt',
      name: 'TXT',
      description: 'Archivo de texto con formato front/back alternado',
      extension: '.txt'
    }
  ];
}

// Exponer funciones globalmente para compatibilidad
window.exportDeck = exportDeck;
window.importDeck = importDeck;
window.handleFileUpload = handleFileUpload;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleFileDrop = handleFileDrop;
window.processImportFile = processImportFile;
window.loadExportOptions = loadExportOptions;
window.clearImportData = clearImportData;

// Exponer variables globalmente para compatibilidad
window.importFileContent = importFileContent;
window.importFileFormat = importFileFormat;

