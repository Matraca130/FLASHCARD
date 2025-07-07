import { api } from './apiClient.js';
import { validateDeckData } from './utils/validation.js';
import { performCrudOperation, apiWithFallback } from './utils/apiHelpers.js';
import { showNotification, generateId, downloadFile } from './utils/helpers.js';

// Variables globales para el proceso de importación
let importFileContent = null;
let importFileFormat = null;

// Formatos soportados
const SUPPORTED_FORMATS = {
  json: {
    name: 'JSON',
    extension: '.json',
    mimeType: 'application/json',
    description: 'Formato nativo de StudyingFlash'
  },
  csv: {
    name: 'CSV',
    extension: '.csv',
    mimeType: 'text/csv',
    description: 'Valores separados por comas'
  },
  anki: {
    name: 'Anki',
    extension: '.apkg',
    mimeType: 'application/zip',
    description: 'Paquete de Anki'
  },
  txt: {
    name: 'Texto',
    extension: '.txt',
    mimeType: 'text/plain',
    description: 'Texto plano (frente|reverso por línea)'
  }
};

/**
 * Exporta un deck en el formato especificado
 * @param {number} deckId - ID del deck a exportar
 * @param {string} format - Formato de exportación
 * @returns {Promise<void>}
 */
export async function exportDeck(deckId, format = 'json') {
  if (!SUPPORTED_FORMATS[format]) {
    showNotification('Formato de exportación no soportado', 'error');
    return;
  }
  
  try {
    // Cargar datos del deck y flashcards
    const [deck, flashcards] = await Promise.all([
      apiWithFallback(`/api/decks/${deckId}`, {}),
      apiWithFallback(`/api/flashcards/deck/${deckId}`, [])
    ]);
    
    if (!deck.id) {
      showNotification('Deck no encontrado', 'error');
      return;
    }
    
    // Generar contenido según formato
    let content, filename, mimeType;
    
    switch (format) {
      case 'json':
        content = generateJSONExport(deck, flashcards);
        filename = `${sanitizeFilename(deck.name)}_${getCurrentDate()}.json`;
        mimeType = SUPPORTED_FORMATS.json.mimeType;
        break;
        
      case 'csv':
        content = generateCSVExport(deck, flashcards);
        filename = `${sanitizeFilename(deck.name)}_${getCurrentDate()}.csv`;
        mimeType = SUPPORTED_FORMATS.csv.mimeType;
        break;
        
      case 'txt':
        content = generateTXTExport(flashcards);
        filename = `${sanitizeFilename(deck.name)}_${getCurrentDate()}.txt`;
        mimeType = SUPPORTED_FORMATS.txt.mimeType;
        break;
        
      default:
        throw new Error('Formato no implementado');
    }
    
    // Descargar archivo
    downloadFile(content, filename, mimeType);
    
    showNotification(`Deck exportado exitosamente en formato ${format.toUpperCase()}`, 'success');
    
  } catch (error) {
    console.error('Error exporting deck:', error);
    showNotification('Error al exportar el deck', 'error');
  }
}

/**
 * Exporta múltiples decks en un archivo comprimido
 * @param {Array} deckIds - Array de IDs de decks
 * @param {string} format - Formato de exportación
 */
export async function exportMultipleDecks(deckIds, format = 'json') {
  if (!Array.isArray(deckIds) || deckIds.length === 0) {
    showNotification('Selecciona al menos un deck para exportar', 'warning');
    return;
  }
  
  try {
    showNotification('Preparando exportación múltiple...', 'info');
    
    const exportPromises = deckIds.map(async (deckId) => {
      const [deck, flashcards] = await Promise.all([
        apiWithFallback(`/api/decks/${deckId}`, {}),
        apiWithFallback(`/api/flashcards/deck/${deckId}`, [])
      ]);
      
      return { deck, flashcards };
    });
    
    const results = await Promise.all(exportPromises);
    
    // Generar archivo combinado
    const combinedData = {
      export_info: {
        date: new Date().toISOString(),
        format: format,
        version: '1.0',
        total_decks: results.length,
        total_cards: results.reduce((sum, r) => sum + r.flashcards.length, 0)
      },
      decks: results
    };
    
    const content = JSON.stringify(combinedData, null, 2);
    const filename = `studyingflash_export_${getCurrentDate()}.json`;
    
    downloadFile(content, filename, 'application/json');
    
    showNotification(`${deckIds.length} decks exportados exitosamente`, 'success');
    
  } catch (error) {
    console.error('Error exporting multiple decks:', error);
    showNotification('Error al exportar decks', 'error');
  }
}

/**
 * Maneja la subida de archivos para importación
 * @param {Event} event - Evento de cambio del input file
 */
export function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tamaño del archivo (máximo 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showNotification('El archivo es demasiado grande (máximo 10MB)', 'error');
    return;
  }
  
  // Detectar formato por extensión
  const extension = file.name.toLowerCase().split('.').pop();
  const format = detectFileFormat(extension);
  
  if (!format) {
    showNotification('Formato de archivo no soportado', 'error');
    return;
  }
  
  importFileFormat = format;
  
  // Leer contenido del archivo
  const reader = new FileReader();
  
  reader.onload = function(e) {
    importFileContent = e.target.result;
    showImportPreview(file.name, format);
  };
  
  reader.onerror = function() {
    showNotification('Error al leer el archivo', 'error');
  };
  
  // Leer como texto para la mayoría de formatos
  if (format === 'anki') {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

/**
 * Detecta el formato del archivo por extensión
 * @param {string} extension - Extensión del archivo
 * @returns {string|null} - Formato detectado o null
 */
function detectFileFormat(extension) {
  const formatMap = {
    'json': 'json',
    'csv': 'csv',
    'txt': 'txt',
    'apkg': 'anki'
  };
  
  return formatMap[extension] || null;
}

/**
 * Muestra la vista previa de importación
 * @param {string} filename - Nombre del archivo
 * @param {string} format - Formato detectado
 */
function showImportPreview(filename, format) {
  try {
    let previewData;
    
    switch (format) {
      case 'json':
        previewData = parseJSONImport(importFileContent);
        break;
      case 'csv':
        previewData = parseCSVImport(importFileContent);
        break;
      case 'txt':
        previewData = parseTXTImport(importFileContent);
        break;
      default:
        throw new Error('Formato no soportado para vista previa');
    }
    
    renderImportPreview(filename, format, previewData);
    
  } catch (error) {
    console.error('Error parsing import file:', error);
    showNotification('Error al procesar el archivo de importación', 'error');
  }
}

/**
 * Renderiza la vista previa de importación
 * @param {string} filename - Nombre del archivo
 * @param {string} format - Formato del archivo
 * @param {Object} previewData - Datos de vista previa
 */
function renderImportPreview(filename, format, previewData) {
  const previewContainer = document.getElementById('import-preview') || createImportPreviewContainer();
  
  const previewHTML = `
    <div class="import-preview-content">
      <div class="import-header">
        <h3>Vista Previa de Importación</h3>
        <span class="import-format">${SUPPORTED_FORMATS[format].name}</span>
      </div>
      
      <div class="import-info">
        <p><strong>Archivo:</strong> ${filename}</p>
        <p><strong>Decks encontrados:</strong> ${previewData.decks.length}</p>
        <p><strong>Total de tarjetas:</strong> ${previewData.totalCards}</p>
      </div>
      
      <div class="import-decks">
        ${previewData.decks.map((deck, index) => `
          <div class="import-deck-item">
            <label>
              <input type="checkbox" checked data-deck-index="${index}">
              <strong>${deck.name}</strong> (${deck.cards.length} tarjetas)
            </label>
            <div class="deck-preview">
              ${deck.cards.slice(0, 3).map(card => `
                <div class="card-preview">
                  <span class="card-front">${card.front}</span>
                  <span class="card-separator">→</span>
                  <span class="card-back">${card.back}</span>
                </div>
              `).join('')}
              ${deck.cards.length > 3 ? `<p class="more-cards">... y ${deck.cards.length - 3} tarjetas más</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="import-actions">
        <button class="btn btn-secondary" onclick="cancelImport()">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmImport()">Importar Seleccionados</button>
      </div>
    </div>
  `;
  
  previewContainer.innerHTML = previewHTML;
  previewContainer.style.display = 'block';
}

/**
 * Crea el contenedor de vista previa si no existe
 * @returns {HTMLElement} - Contenedor creado
 */
function createImportPreviewContainer() {
  const container = document.createElement('div');
  container.id = 'import-preview';
  container.className = 'import-preview-modal';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    z-index: 1000;
    overflow-y: auto;
  `;
  
  document.body.appendChild(container);
  return container;
}

/**
 * Confirma y ejecuta la importación
 */
export async function confirmImport() {
  try {
    const selectedDecks = getSelectedDecksForImport();
    
    if (selectedDecks.length === 0) {
      showNotification('Selecciona al menos un deck para importar', 'warning');
      return;
    }
    
    showNotification('Importando decks...', 'info');
    
    const importResults = [];
    
    for (const deckData of selectedDecks) {
      try {
        const result = await importSingleDeck(deckData);
        importResults.push(result);
      } catch (error) {
        console.error('Error importing deck:', deckData.name, error);
      }
    }
    
    // Cerrar vista previa
    cancelImport();
    
    // Mostrar resultados
    const successCount = importResults.filter(r => r.success).length;
    const totalCount = selectedDecks.length;
    
    if (successCount === totalCount) {
      showNotification(`${successCount} decks importados exitosamente`, 'success');
    } else {
      showNotification(`${successCount}/${totalCount} decks importados. Algunos fallaron.`, 'warning');
    }
    
    // Recargar datos
    if (window.loadDashboardData) {
      window.loadDashboardData();
    }
    
  } catch (error) {
    console.error('Error during import:', error);
    showNotification('Error durante la importación', 'error');
  }
}

/**
 * Obtiene los decks seleccionados para importar
 * @returns {Array} - Array de datos de decks seleccionados
 */
function getSelectedDecksForImport() {
  const checkboxes = document.querySelectorAll('#import-preview input[type="checkbox"]:checked');
  const selectedDecks = [];
  
  checkboxes.forEach(checkbox => {
    const deckIndex = parseInt(checkbox.dataset.deckIndex);
    const previewData = parseCurrentImportFile();
    
    if (previewData && previewData.decks[deckIndex]) {
      selectedDecks.push(previewData.decks[deckIndex]);
    }
  });
  
  return selectedDecks;
}

/**
 * Importa un deck individual
 * @param {Object} deckData - Datos del deck a importar
 * @returns {Promise<Object>} - Resultado de la importación
 */
async function importSingleDeck(deckData) {
  try {
    // Validar datos del deck
    if (!validateDeckData(deckData.name, deckData.description || '')) {
      throw new Error('Datos de deck inválidos');
    }
    
    // Crear deck
    const deck = await performCrudOperation(
      () => api('/api/decks', {
        method: 'POST',
        body: JSON.stringify({
          name: deckData.name,
          description: deckData.description || '',
          is_public: deckData.is_public || false
        })
      }),
      null, // No mostrar notificación individual
      null
    );
    
    // Importar flashcards
    if (deckData.cards && deckData.cards.length > 0) {
      await performCrudOperation(
        () => api('/api/flashcards/bulk', {
          method: 'POST',
          body: JSON.stringify({
            deck_id: deck.id,
            flashcards: deckData.cards
          })
        }),
        null, // No mostrar notificación individual
        null
      );
    }
    
    return { success: true, deck: deck };
    
  } catch (error) {
    console.error('Error importing single deck:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancela la importación
 */
export function cancelImport() {
  const previewContainer = document.getElementById('import-preview');
  if (previewContainer) {
    previewContainer.style.display = 'none';
  }
  
  // Limpiar variables globales
  importFileContent = null;
  importFileFormat = null;
}

/**
 * Parsea el archivo de importación actual
 * @returns {Object} - Datos parseados
 */
function parseCurrentImportFile() {
  if (!importFileContent || !importFileFormat) return null;
  
  switch (importFileFormat) {
    case 'json':
      return parseJSONImport(importFileContent);
    case 'csv':
      return parseCSVImport(importFileContent);
    case 'txt':
      return parseTXTImport(importFileContent);
    default:
      return null;
  }
}

/**
 * Genera exportación en formato JSON
 * @param {Object} deck - Datos del deck
 * @param {Array} flashcards - Array de flashcards
 * @returns {string} - Contenido JSON
 */
function generateJSONExport(deck, flashcards) {
  const exportData = {
    export_info: {
      date: new Date().toISOString(),
      format: 'json',
      version: '1.0',
      source: 'StudyingFlash'
    },
    deck: {
      name: deck.name,
      description: deck.description || '',
      is_public: deck.is_public || false,
      created_at: deck.created_at,
      card_count: flashcards.length
    },
    flashcards: flashcards.map(card => ({
      front: card.front,
      back: card.back,
      created_at: card.created_at
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Genera exportación en formato CSV
 * @param {Object} deck - Datos del deck
 * @param {Array} flashcards - Array de flashcards
 * @returns {string} - Contenido CSV
 */
function generateCSVExport(deck, flashcards) {
  const headers = ['Frente', 'Reverso', 'Fecha Creación'];
  const rows = flashcards.map(card => [
    `"${card.front.replace(/"/g, '""')}"`,
    `"${card.back.replace(/"/g, '""')}"`,
    `"${card.created_at || ''}"`
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Genera exportación en formato TXT
 * @param {Array} flashcards - Array de flashcards
 * @returns {string} - Contenido TXT
 */
function generateTXTExport(flashcards) {
  return flashcards.map(card => `${card.front}|${card.back}`).join('\n');
}

/**
 * Parsea importación JSON
 * @param {string} content - Contenido del archivo
 * @returns {Object} - Datos parseados
 */
function parseJSONImport(content) {
  const data = JSON.parse(content);
  
  // Detectar formato
  if (data.decks && Array.isArray(data.decks)) {
    // Formato múltiple
    return {
      decks: data.decks.map(item => ({
        name: item.deck.name,
        description: item.deck.description || '',
        is_public: item.deck.is_public || false,
        cards: item.flashcards || []
      })),
      totalCards: data.decks.reduce((sum, item) => sum + (item.flashcards?.length || 0), 0)
    };
  } else if (data.deck && data.flashcards) {
    // Formato simple
    return {
      decks: [{
        name: data.deck.name,
        description: data.deck.description || '',
        is_public: data.deck.is_public || false,
        cards: data.flashcards || []
      }],
      totalCards: data.flashcards?.length || 0
    };
  }
  
  throw new Error('Formato JSON no reconocido');
}

/**
 * Parsea importación CSV
 * @param {string} content - Contenido del archivo
 * @returns {Object} - Datos parseados
 */
function parseCSVImport(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const cards = [];
  
  // Detectar si tiene headers
  const hasHeaders = lines[0].toLowerCase().includes('frente') || lines[0].toLowerCase().includes('front');
  const startIndex = hasHeaders ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parsear CSV simple (asumiendo que no hay comas en el contenido)
    const parts = line.split(',').map(part => part.replace(/^"|"$/g, '').replace(/""/g, '"'));
    
    if (parts.length >= 2) {
      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim()
      });
    }
  }
  
  return {
    decks: [{
      name: 'Deck Importado CSV',
      description: 'Importado desde archivo CSV',
      is_public: false,
      cards: cards
    }],
    totalCards: cards.length
  };
}

/**
 * Parsea importación TXT
 * @param {string} content - Contenido del archivo
 * @returns {Object} - Datos parseados
 */
function parseTXTImport(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const cards = [];
  
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 2) {
      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim()
      });
    }
  }
  
  return {
    decks: [{
      name: 'Deck Importado TXT',
      description: 'Importado desde archivo de texto',
      is_public: false,
      cards: cards
    }],
    totalCards: cards.length
  };
}

/**
 * Sanitiza un nombre de archivo
 * @param {string} filename - Nombre original
 * @returns {string} - Nombre sanitizado
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns {string} - Fecha formateada
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Exponer funciones globalmente para compatibilidad
window.exportDeck = exportDeck;
window.exportMultipleDecks = exportMultipleDecks;
window.handleFileUpload = handleFileUpload;
window.confirmImport = confirmImport;
window.cancelImport = cancelImport;

