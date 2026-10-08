/**
 * Centralized API Client
 */

const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('freshmart_token');
  const guestToken =
    localStorage.getItem('freshmart_guest_token') ||
    getOrCreateGuestToken();

  const headers = {
    'Content-Type': 'application/json',
    'x-guest-token': guestToken,
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, let browser set Content-Type
  // including the multipart boundary.
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.message || `Request failed with status ${response.status}`;

    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;

    throw err;
  }

  return data;
}

export function getOrCreateGuestToken() {
  let token = localStorage.getItem('freshmart_guest_token');

  if (!token) {
    token = `gst_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    localStorage.setItem('freshmart_guest_token', token);
  }

  return token;
}

const client = {
  get: (endpoint, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'GET',
    }),

  post: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: (endpoint, body, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: (endpoint, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'DELETE',
    }),

  // ---------------------------------------
  // File Upload
  // ---------------------------------------
  upload: (endpoint, formData, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};

export default client;