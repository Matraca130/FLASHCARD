export const API_BASE_URL = 'https://flashcard-u10n.onrender.com';

/**
 * Wrapper simplificado para realizar solicitudes HTTP
 * @param {string} endpoint - Ruta relativa o URL absoluta
 * @param {Object} [options={}] - Opciones de fetch
 * @returns {Promise<Object>} - {success:boolean, data?:any, error?:string}
 */
export async function api(endpoint, options = {}) {
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const { params, body, method = 'GET', headers = {}, ...rest } = options;

  // Append query params if provided
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams(params).toString();
    if (searchParams) {
      url += url.includes('?') ? `&${searchParams}` : `?${searchParams}`;
    }
  }

  const isForm = body instanceof FormData;
  const finalHeaders = { ...headers };
  let finalBody = body;

  if (body !== undefined && body !== null && !isForm) {
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
    finalBody = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const config = { method, headers: finalHeaders, ...rest };
  if (finalBody !== undefined) {
    config.body = finalBody;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || response.statusText);
    }
    return { success: true, data };
  } catch (error) {
    console.error('API request error:', error);
    return { success: false, error: error.message };
  }
}

export default { api };
