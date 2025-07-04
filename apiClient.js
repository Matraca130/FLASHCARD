// apiClient.js - Cliente API básico
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.studyingflash.com';

export class ApiClient {
  static async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API POST error:', error);
      return { error: error.message };
    }
  }
}

export default ApiClient;

