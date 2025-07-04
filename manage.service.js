import { api } from '../apiClient.js';
import { store } from '../store/store.js';

/**
 * Carga los decks del usuario para gestión y los renderiza.
 */
export async function loadManageDecks() {
  try {
    const decks = await api('/api/decks');
    const container = document.getElementById('manage-decks');
    if (!container) return;
    if (!decks.length) {
      container.innerHTML = '<p class="text-muted">No tienes decks creados.</p>';
      return;
    }
    container.innerHTML = decks.map(d => `
      <div class="deck-manage-card">
        <h4>${d.name}</h4>
        <button class="btn btn-sm btn-danger" onclick="deleteDeck(${d.id})">Eliminar</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error cargando decks:', err);
    if (window.showNotification) window.showNotification('Error al cargar decks', 'error');
  }
}

export async function deleteDeck(id) {
  if (!confirm('¿Seguro que quieres eliminar este deck?')) return;
  try {
    await api('/api/decks/' + id, { method: 'DELETE' });
    if (window.showNotification) window.showNotification('Deck eliminado', 'success');
    await loadManageDecks();
    if (window.loadDashboardData) window.loadDashboardData();
  } catch (err) {
    console.error('Error eliminando deck:', err);
    if (window.showNotification) window.showNotification('Error al eliminar deck', 'error');
  }
}