import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://veizytujurlhlvchxgbi.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaXp5dHVqdXJsaGx2Y2h4Z2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDYxNjMsImV4cCI6MjA5MjgyMjE2M30.BHTDUyYhOnXbHlDAx-DnXyFBadapqwYTRG3qy9ystqk'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON)

export const api = {
  sessions: async (userId) => {
    const { data, error } = await sb.from('pitdata_sessions')
      .select('id,track,car,started_at,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return data || []
  },

  session: async (id) => {
    const { data: s } = await sb.from('pitdata_sessions')
      .select('id,user_id,track,car')
      .eq('id', id)
      .single()
    if (!s) throw new Error('Sesión no encontrada')
    const { data: laps } = await sb.from('pitdata_laps')
      .select('id,lap_number,lap_time_ms,sectors_json,is_valid,invalid_reason')
      .eq('session_id', id)
      .order('lap_number')
    return { ...s, laps: (laps || []).map(l => ({ ...l, sectors: l.sectors_json })) }
  },

  frames: async (lapId) => {
    const { data } = await sb.from('pitdata_laps')
      .select('frames_json,lap_time_ms,sectors_json')
      .eq('id', lapId)
      .single()
    if (!data) throw new Error('Vuelta no encontrada')
    return { lap_id: lapId, lap_time_ms: data.lap_time_ms, sectors: data.sectors_json, frames: data.frames_json || [] }
  },

  stats: async (userId) => {
    const { count: sc } = await sb.from('pitdata_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    const { count: lc, data: ld } = await sb.from('pitdata_laps')
      .select('lap_time_ms', { count: 'exact' })
      .eq('is_valid', true)
    const bestMs = ld?.length ? Math.min(...ld.map(l => l.lap_time_ms)) : null
    return { sessions: sc || 0, valid_laps: lc || 0, best_lap_ms: bestMs }
  },
}
