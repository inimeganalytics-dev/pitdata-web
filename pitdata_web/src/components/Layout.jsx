import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/store'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()

  const navItem = (to, label, activeColor = '#00c8f0') => ({
    style: {
      padding:'4px 14px', borderRadius:20, fontSize:11, fontWeight:600,
      letterSpacing:'.08em', textTransform:'uppercase', textDecoration:'none',
      transition:'all .15s',
      color: loc.pathname === to ? activeColor : '#6b7d99',
      background: loc.pathname === to ? activeColor+'18' : 'transparent',
      border: loc.pathname === to ? `1px solid ${activeColor}44` : '1px solid transparent',
    }
  })

  return (
    <div style={{display:'grid',gridTemplateRows:'48px 1fr',height:'100vh'}}>
      <header style={{display:'flex',alignItems:'center',gap:14,padding:'0 20px',
        background:'#0c1018',borderBottom:'1px solid #1c2535'}}>
        <Link to="/" style={{fontSize:15,fontWeight:700,letterSpacing:'.1em',
          color:'#00c8f0',textDecoration:'none'}}>
          PIT<em style={{color:'#6b7d99',fontStyle:'normal',fontWeight:500}}>DATA</em>
        </Link>
        <nav style={{display:'flex',gap:6,marginLeft:8}}>
          <Link to="/"         {...navItem('/','Sesiones')}>Sesiones</Link>
          <Link to="/live"     {...navItem('/live','Live','#00e676')}>
            {loc.pathname==='/live' && <span style={{marginRight:4,fontSize:8}}>●</span>}
            Live
          </Link>
          <Link to="/analysis" {...navItem('/analysis','Análisis','#ffd600')}>Análisis</Link>
        </nav>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:11,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>{user?.username}</span>
          <button style={{background:'none',border:'1px solid #1c2535',color:'#6b7d99',
            padding:'3px 10px',borderRadius:20,fontSize:10,cursor:'pointer',fontFamily:'JetBrains Mono'}}
            onClick={() => { logout(); navigate('/auth') }}>Salir</button>
        </div>
      </header>
      <main style={{overflow:'auto',background:'#07090d'}}>
        <Outlet />
      </main>
    </div>
  )
}
