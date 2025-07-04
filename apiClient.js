// Centralized API wrapper
const API_BASE = window.API_BASE || '';

export async function api(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    // Attach status for easier debugging
    const error = data || { message: 'Request failed' };
    error.status = response.status;
    throw error;
  }

  return data;
}
