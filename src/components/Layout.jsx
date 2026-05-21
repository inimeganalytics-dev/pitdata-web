import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'

const s = {
  shell: { display:'grid', gridTemplateRows:'48px 1fr', height:'100vh' },
  header: {
    display:'flex', alignItems:'center', gap:14, padding:'0 20px',
    background:'#0c1018', borderBottom:'1px solid #1c2535'
  },
  logo: { fontSize:15, fontWeight:700, letterSpacing:'.1em', color:'#00c8f0', textDecoration:'none' },
  logoEm: { color:'#6b7d99', fontWeight:500 },
  nav: { display:'flex', gap:4, marginLeft:16 },
  navLink: {
    padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:600,
    letterSpacing:'.08em', textTransform:'uppercase', color:'#6b7d99',
    textDecoration:'none', transition:'color .15s'
  },
  right: { marginLeft:'auto', display:'flex', alignItems:'center', gap:12 },
  user: { fontSize:11, color:'#6b7d99', fontFamily:'JetBrains Mono' },
  logout: {
    background:'none', border:'1px solid #1c2535', color:'#6b7d99',
    padding:'3px 10px', borderRadius:20, fontSize:10, cursor:'pointer',
    fontFamily:'JetBrains Mono'
  },
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div style={s.shell}>
      <header style={s.header}>
        <Link to="/" style={s.logo}>PIT<em style={s.logoEm}>DATA</em></Link>
        <nav style={s.nav}>
          <Link to="/" style={{...s.navLink, color:'#dce6f5'}}>Sesiones</Link>
        </nav>
        <div style={s.right}>
          <span style={s.user}>{user?.username}</span>
          <button style={s.logout} onClick={() => { logout(); navigate('/auth') }}>Salir</button>
        </div>
      </header>
      <main style={{ overflow:'auto', background:'#07090d' }}>
        <Outlet />
      </main>
    </div>
  )
}
