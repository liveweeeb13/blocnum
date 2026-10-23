// Centralized API Client with JWT authorization

export function getAuthToken() {
  return localStorage.getItem('lowcode_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('lowcode_token', token);
  } else {
    localStorage.removeItem('lowcode_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      setAuthToken(null);
      window.dispatchEvent(new Event('auth-logout'));
    }
    throw new Error(data.error || `Erreur requête (${response.status})`);
  }

  return data;
}

