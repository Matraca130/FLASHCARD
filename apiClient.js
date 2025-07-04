// apiClient.js - Cliente API básico
// API Client para StudyingFlash - Conectado con Backend Real
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://api.studyingflash.com';

export class ApiClient {
  static getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  static setAuthToken(token) {
    localStorage.setItem('auth_token', token);
  }

  static removeAuthToken() {
    localStorage.removeItem('auth_token');
  }

  static getAuthHeaders() {
    const token = this.getAuthToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }

  static async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.removeAuthToken();
          window.location.href = '/login';
          return { error: 'Token expirado' };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API GET error:', error);
      return { error: error.message };
    }
  }

  static async post(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.removeAuthToken();
          window.location.href = '/login';
          return { error: 'Token expirado' };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API POST error:', error);
      return { error: error.message };
    }
  }

  static async put(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.removeAuthToken();
          window.location.href = '/login';
          return { error: 'Token expirado' };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API PUT error:', error);
      return { error: error.message };
    }
  }

  static async delete(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.removeAuthToken();
          window.location.href = '/login';
          return { error: 'Token expirado' };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API DELETE error:', error);
      return { error: error.message };
    }
  }

  // Métodos específicos para autenticación
  static async login(email, password) {
    const response = await this.post('/api/auth/login', { email, password });
    if (response.success && response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  static async register(userData) {
    const response = await this.post('/api/auth/register', userData);
    if (response.success && response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  static async logout() {
    this.removeAuthToken();
    window.location.href = '/';
  }

  // Métodos específicos para estudio - CRÍTICOS
  static async startStudySession(deckId, options = {}) {
    return await this.post('/api/study/session', {
      deck_id: deckId,
      ...options
    });
  }

  static async answerCard(cardId, quality, sessionId, responseTime = 0) {
    return await this.post('/api/study/card/answer', {
      card_id: cardId,
      quality: quality,
      session_id: sessionId,
      response_time: responseTime
    });
  }

  static async endStudySession(sessionId) {
    return await this.post(`/api/study/session/${sessionId}/end`, {});
  }

  // Métodos para dashboard
  static async getDashboard() {
    return await this.get('/api/dashboard/');
  }

  static async getWeeklyStats() {
    return await this.get('/api/dashboard/stats/weekly');
  }

  // Métodos para decks
  static async getDecks() {
    return await this.get('/api/decks/');
  }

  static async createDeck(deckData) {
    return await this.post('/api/decks/', deckData);
  }

  static async getDeck(deckId) {
    return await this.get(`/api/decks/${deckId}`);
  }

  static async updateDeck(deckId, deckData) {
    return await this.put(`/api/decks/${deckId}`, deckData);
  }

  static async deleteDeck(deckId) {
    return await this.delete(`/api/decks/${deckId}`);
  }

  // Métodos para flashcards
  static async createFlashcard(flashcardData) {
    return await this.post('/api/flashcards/', flashcardData);
  }

  static async getFlashcard(flashcardId) {
    return await this.get(`/api/flashcards/${flashcardId}`);
  }

  static async updateFlashcard(flashcardId, flashcardData) {
    return await this.put(`/api/flashcards/${flashcardId}`, flashcardData);
  }

  static async deleteFlashcard(flashcardId) {
    return await this.delete(`/api/flashcards/${flashcardId}`);
  }

  static async getDeckFlashcards(deckId) {
    return await this.get(`/api/flashcards/deck/${deckId}`);
  }

  // Métodos para estadísticas
  static async getStats() {
    return await this.get('/api/stats/');
  }

  static async getChartData(type = 'weekly') {
    return await this.get(`/api/stats/charts?type=${type}`);
  }
}

export default ApiClient;

