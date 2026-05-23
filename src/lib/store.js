import { create } from 'zustand'
import { sb } from './api'

export const useAuth = create((set) => ({
  user: null,
  loading: true,

  init: async () => {
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session?.user) {
        // Buscar username en pitdata_users
        const { data: profile } = await sb.from('pitdata_users')
          .select('username, email')
          .eq('id', session.user.id)
          .maybeSingle()  // maybeSingle no tira error si no encuentra
        set({ 
          user: { 
            id: session.user.id,
            email: session.user.email,
            username: profile?.username || session.user.email.split('@')[0]
          }, 
          loading: false 
        })
      } else {
        set({ user: null, loading: false })
      }
    } catch(e) {
      console.error('Init error:', e)
      set({ user: null, loading: false })
    }
  },

  login: async (username, password) => {
    // Buscar email por username
    const { data: rows } = await sb.from('pitdata_users')
      .select('email')
      .eq('username', username)
      .limit(1)
    
    if (!rows || rows.length === 0) throw new Error('Usuario no encontrado')
    const email = rows[0].email

    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Credenciales inválidas')

    const { data: profile } = await sb.from('pitdata_users')
      .select('username')
      .eq('id', data.user.id)
      .maybeSingle()

    set({ user: { id: data.user.id, email: data.user.email, username: profile?.username || username } })
    return data
  },

  register: async (username, email, password) => {
    // Verificar que el username no exista
    const { data: existing } = await sb.from('pitdata_users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (existing) throw new Error('Nombre de usuario ya existe')

    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) throw new Error(error.message)

    // Crear perfil
    await sb.from('pitdata_users').insert({
      id: data.user.id,
      username,
      email,
      hashed_pw: 'supabase_auth'
    })

    set({ user: { id: data.user.id, email, username } })
    return data
  },

  logout: async () => {
    await sb.auth.signOut()
    set({ user: null })
  },
}))
