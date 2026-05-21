import { create } from 'zustand'
import { sb, api, getUser, setUser, clearUser } from './api'

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await sb.auth.getSession()
    if (session) {
      try {
        const profile = await api.me()
        set({ user: profile, loading: false })
      } catch {
        set({ user: null, loading: false })
      }
    } else {
      set({ user: null, loading: false })
    }
  },

  login: async (username, password) => {
    const data = await api.login(username, password)
    const profile = await api.me()
    set({ user: profile })
    return data
  },

  register: async (username, email, password) => {
    const data = await api.register(username, email, password)
    // Esperar a que Supabase confirme
    await new Promise(r => setTimeout(r, 1000))
    try {
      const profile = await api.me()
      set({ user: profile })
    } catch {
      set({ user: { username, email } })
    }
    return data
  },

  logout: async () => {
    await api.logout()
    set({ user: null })
  },
}))
