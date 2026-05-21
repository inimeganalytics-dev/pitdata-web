import { create } from 'zustand'
import { api, getToken, setToken, clearToken } from './api'

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    if (!getToken()) { set({ loading: false }); return }
    try {
      const user = await api.me()
      set({ user, loading: false })
    } catch {
      clearToken()
      set({ user: null, loading: false })
    }
  },

  login: async (username, password) => {
    const data = await api.login(username, password)
    setToken(data.access_token)
    set({ user: { username: data.username, user_id: data.user_id } })
    return data
  },

  register: async (username, email, password) => {
    const data = await api.register(username, email, password)
    setToken(data.access_token)
    set({ user: { username: data.username, user_id: data.user_id } })
    return data
  },

  logout: () => {
    clearToken()
    set({ user: null })
  },
}))
