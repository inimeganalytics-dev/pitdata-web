import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'

const c = {
  page: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090d' },
  box: { width:360, background:'#0c1018', border:'1px solid #1c2535', borderRadius:12, padding:32 },
  logo: { textAlign:'center', marginBottom:28 },
  logoTxt: { fontSize:22, fontWeight:700, letterSpacing:'.12em', color:'#00c8f0' },
  logoSub: { fontSize:11, color:'#6b7d99', marginTop:4 },
  tabs: { display:'flex', gap:0, marginBottom:24, borderBottom:'1px solid #1c2535' },
  tab: (active) => ({
    flex:1, padding:'8px 0', textAlign:'center', fontSize:12, fontWeight:600,
    letterSpacing:'.08em', textTransform:'uppercase', cursor:'pointer',
    color: active ? '#00c8f0' : '#2e3d55',
    borderBottom: active ? '2px solid #00c8f0' : '2px solid transparent',
    transition:'all .15s'
  }),
  label: { display:'block', fontSize:10, color:'#6b7d99', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6, marginTop:14 },
  input: {
    width:'100%', background:'#07090d', border:'1px solid #1c2535', borderRadius:6,
    padding:'8px 12px', color:'#dce6f5', fontSize:13, fontFamily:'JetBrains Mono',
    outline:'none'
  },
  btn: {
    width:'100%', marginTop:22, padding:'10px 0', background:'#00c8f0',
    border:'none', borderRadius:6, color:'#07090d', fontSize:13, fontWeight:700,
    letterSpacing:'.08em', cursor:'pointer', fontFamily:'Rajdhani'
  },
  err: { marginTop:12, padding:'8px 12px', background:'#ff335118', border:'1px solid #ff335144', borderRadius:6, fontSize:12, color:'#ff3351' },
}

export default function Auth() {
  const [tab, setTab]   = useState('login')
  const [form, setForm] = useState({ username:'', email:'', password:'' })
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (ev) => {
    ev.preventDefault()
    setErr(''); setLoading(true)
    try {
      if (tab === 'login') {
        await login(form.username, form.password)
      } else {
        await register(form.username, form.email, form.password)
      }
      navigate('/')
    } catch(e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={c.page}>
      <div style={c.box}>
        <div style={c.logo}>
          <div style={c.logoTxt}>PITDATA</div>
          <div style={c.logoSub}>Telemetría de sim racing</div>
        </div>
        <div style={c.tabs}>
          <div style={c.tab(tab==='login')} onClick={() => setTab('login')}>Ingresar</div>
          <div style={c.tab(tab==='register')} onClick={() => setTab('register')}>Registrarse</div>
        </div>
        <form onSubmit={submit}>
          <label style={c.label}>Usuario</label>
          <input style={c.input} value={form.username} onChange={set('username')} required autoFocus />
          {tab === 'register' && <>
            <label style={c.label}>Email</label>
            <input style={c.input} type="email" value={form.email} onChange={set('email')} required />
          </>}
          <label style={c.label}>Contraseña</label>
          <input style={c.input} type="password" value={form.password} onChange={set('password')} required />
          {err && <div style={c.err}>{err}</div>}
          <button style={c.btn} type="submit" disabled={loading}>
            {loading ? 'Cargando...' : tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
