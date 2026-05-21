const API = "https://veizytujurlhlvchxgbi.supabase.co/functions/v1/pitdata-api"
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaXp5dHVqdXJsaGx2Y2h4Z2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDYxNjMsImV4cCI6MjA5MjgyMjE2M30.BHTDUyYhOnXbHlDAx-DnXyFBadapqwYTRG3qy9ystqk"

export function getToken() { return localStorage.getItem('pd_token') }
export function setToken(t) { localStorage.setItem('pd_token', t) }
export function clearToken() { localStorage.removeItem('pd_token') }

async function req(path, opts = {}) {
  const token = getToken()
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    }
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }))
    throw new Error(err.error || r.statusText)
  }
  return r.json()
}

export const api = {
  register: (username, email, password) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  login: (username, password) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => req('/auth/me'),
  sessions: () => req('/sessions/'),
  session: (id) => req(`/sessions/${id}`),
  frames: (lapId) => req(`/laps/${lapId}/frames`),
  leaderboard: (track, car) => req(`/leaderboard/?track=${encodeURIComponent(track)}${car ? `&car=${encodeURIComponent(car)}` : ''}`),
  tracks: () => req('/leaderboard/tracks'),
  stats: () => req('/users/me/stats'),
}
