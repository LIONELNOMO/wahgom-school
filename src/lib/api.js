const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  let payload
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok || payload?.ok === false) {
    throw new ApiError(payload?.message || `Erreur serveur (${response.status})`, response.status, payload)
  }
  return payload
}

export const api = {
  health: () => request('health', { method: 'GET' }),
  login: (username, password) => request('login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('logout', { method: 'POST', body: '{}' }),
  session: () => request('session', { method: 'GET' }),
  pull: () => request('sync', { method: 'GET' }),
  push: ({ clientId, mutationId, baseRevision, snapshot, force = false }) => request('sync', {
    method: 'POST',
    body: JSON.stringify({ clientId, mutationId, baseRevision, snapshot, force }),
  }),
}
