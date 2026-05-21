import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://veizytujurlhlvchxgbi.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaXp5dHVqdXJsaGx2Y2h4Z2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDYxNjMsImV4cCI6MjA5MjgyMjE2M30.BHTDUyYhOnXbHlDAx-DnXyFBadapqwYTRG3qy9ystqk'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

export function getToken() { return localStorage.getItem('pd_token') }
export function setToken(t) { localStorage.setItem('pd_token', t) }
export function clearToken() { localStorage.removeItem('pd_token') }
export function getUser() {
  const raw = localStorage.getItem('pd_user')
  return raw ? JSON.parse(raw) : null
}
export function setUser(u) { localStorage.setItem('pd_user', JSON.stringify(u)) }
export function clearUser() { localStorage.removeItem('pd_user') }

// Usar Supabase Auth nativo
export const api = {
  register: async (username, email, password) => {
    // Registrar en Supabase Auth
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    // Guardar username en la tabla
    await sb.from('pitdata_users').insert({
      id: data.user.id,
      username,
      email,
      hashed_pw: 'supabase_auth'
    })
    return { user_id: data.user.id, username, access_token: data.session?.access_token }
  },

  login: async (username, password) => {
    // Buscar email por username
    const { data: userRow } = await sb.from('pitdata_users').select('email').eq('username', username).single()
    if (!userRow) throw new Error('Usuario no encontrado')
    const { data, error } = await sb.auth.signInWithPassword({ email: userRow.email, password })
    if (error) throw new Error('Credenciales inválidas')
    return { user_id: data.user.id, username, access_token: data.session.access_token }
  },

  logout: async () => {
    await sb.auth.signOut()
  },

  me: async () => {
    const { data } = await sb.auth.getUser()
    if (!data.user) throw new Error('No autenticado')
    const { data: profile } = await sb.from('pitdata_users').select('username,email').eq('id', data.user.id).single()
    return { ...data.user, ...profile }
  },

  sessions: async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { data, error } = await sb.from('pitdata_sessions').select('id,track,car,started_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    if (error) throw new Error(error.message)
    return data || []
  },

  session: async (id) => {
    const { data: s } = await sb.from('pitdata_sessions').select('id,user_id,track,car').eq('id', id).single()
    if (!s) throw new Error('Sesión no encontrada')
    const { data: laps } = await sb.from('pitdata_laps').select('id,lap_number,lap_time_ms,sectors_json,is_valid,invalid_reason').eq('session_id', id).order('lap_number')
    return { ...s, laps: (laps || []).map(l => ({ ...l, sectors: l.sectors_json })) }
  },

  frames: async (lapId) => {
    const { data } = await sb.from('pitdata_laps').select('frames_json,lap_time_ms,sectors_json').eq('id', lapId).single()
    if (!data) throw new Error('Vuelta no encontrada')
    return { lap_id: lapId, lap_time_ms: data.lap_time_ms, sectors: data.sectors_json, frames: data.frames_json || [] }
  },

  stats: async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const { data: profile } = await sb.from('pitdata_users').select('username').eq('id', user.id).single()
    const { count: sc } = await sb.from('pitdata_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    const { count: lc, data: ld } = await sb.from('pitdata_laps')
      .select('lap_time_ms', { count: 'exact' })
      .eq('is_valid', true)
    const bestMs = ld?.length ? Math.min(...ld.map(l => l.lap_time_ms)) : null
    return { username: profile?.username, sessions: sc || 0, valid_laps: lc || 0, best_lap_ms: bestMs }
  },

  leaderboard: async (track, car) => {
    let q = sb.from('pitdata_track_records').select('lap_time_ms,car,lap_id,pitdata_users(username)').eq('track', track).order('lap_time_ms').limit(20)
    if (car) q = q.eq('car', car)
    const { data } = await q
    const fmt = (ms) => { const m = Math.floor(ms/60000); return `${m}:${((ms%60000)/1000).toFixed(3).padStart(6,'0')}` }
    return (data || []).map((r, i) => ({ position: i+1, username: r.pitdata_users?.username, car: r.car, lap_time_ms: r.lap_time_ms, lap_time: fmt(r.lap_time_ms) }))
  },

  tracks: async () => {
    const { data } = await sb.from('pitdata_track_records').select('track')
    return { tracks: [...new Set((data || []).map(r => r.track))] }
  },
}
