import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'

function fmtMs(ms) {
  if (!ms) return '—'
  const m = Math.floor(ms / 60000)
  return `${m}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
}
function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
}

const s = {
  page: { padding:24, maxWidth:1100, margin:'0 auto' },
  heading: { fontSize:20, fontWeight:600, color:'#dce6f5', marginBottom:4 },
  sub: { fontSize:12, color:'#6b7d99', marginBottom:24 },
  stats: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 },
  stat: { background:'#0c1018', border:'1px solid #1c2535', borderRadius:10, padding:'12px 16px' },
  statVal: { fontSize:22, fontWeight:500, color:'#dce6f5', fontFamily:'JetBrains Mono' },
  statLbl: { fontSize:10, color:'#6b7d99', textTransform:'uppercase', letterSpacing:'.1em', marginTop:3 },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:'8px 12px', fontSize:10, color:'#6b7d99', textTransform:'uppercase', letterSpacing:'.1em', borderBottom:'1px solid #1c2535', fontWeight:600 },
  tr: { borderBottom:'1px solid #111722', cursor:'pointer', transition:'background .1s' },
  td: { padding:'10px 12px', fontSize:13, color:'#6b7d99', fontFamily:'JetBrains Mono' },
  tdMain: { padding:'10px 12px', fontSize:13, color:'#dce6f5' },
  badge: (ok) => ({
    display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600,
    background: ok ? '#00e67622' : '#ff335118',
    color: ok ? '#00e676' : '#ff3351',
    border: `1px solid ${ok ? '#00e67644' : '#ff335144'}`
  }),
  empty: { textAlign:'center', padding:'60px 0', color:'#2e3d55', fontSize:14 },
  install: { background:'#0c1018', border:'1px solid #243040', borderRadius:10, padding:20, marginBottom:28 },
  installTitle: { fontSize:13, fontWeight:600, color:'#00c8f0', marginBottom:8 },
  installSteps: { fontSize:12, color:'#6b7d99', lineHeight:1.8 },
  code: { background:'#07090d', padding:'2px 6px', borderRadius:4, fontFamily:'JetBrains Mono', color:'#00e676', fontSize:11 },
}

export default function Dashboard() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.sessions(), api.stats()])
      .then(([s, st]) => { setSessions(s); setStats(st) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={s.page}>
      <div style={s.heading}>Bienvenido, {user?.username}</div>
      <div style={s.sub}>Tus sesiones de telemetría</div>

      {/* Stats */}
      <div style={s.stats}>
        <div style={s.stat}><div style={s.statVal}>{stats?.sessions ?? '—'}</div><div style={s.statLbl}>Sesiones</div></div>
        <div style={s.stat}><div style={s.statVal}>{stats?.valid_laps ?? '—'}</div><div style={s.statLbl}>Vueltas válidas</div></div>
        <div style={s.stat}><div style={{...s.statVal,color:'#b388ff'}}>{fmtMs(stats?.best_lap_ms)}</div><div style={s.statLbl}>Mejor vuelta</div></div>
        <div style={s.stat}><div style={{...s.statVal,color:'#00e676'}}>{sessions.length}</div><div style={s.statLbl}>Subidas al cloud</div></div>
      </div>

      {/* Instrucciones de instalación */}
      <div style={s.install}>
        <div style={s.installTitle}>📡 Cómo sincronizar tu telemetría</div>
        <div style={s.installSteps}>
          1. Descargá la app PitData para tu PC desde el link del equipo<br/>
          2. Corré <span style={s.code}>python sync_client.py login</span> e ingresá tu usuario<br/>
          3. Después de cada sesión, hacé clic en <span style={s.code}>cloud ✓</span> en el dashboard para subir las vueltas<br/>
          4. Recargá esta página para ver tus sesiones
        </div>
      </div>

      {/* Tabla de sesiones */}
      {loading ? (
        <div style={s.empty}>Cargando sesiones...</div>
      ) : sessions.length === 0 ? (
        <div style={s.empty}>No hay sesiones aún — instalá la app y corré una sesión</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Circuito</th>
              <th style={s.th}>Auto</th>
              <th style={s.th}>Fecha</th>
              <th style={s.th}>Estado</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(sess => (
              <tr key={sess.id} style={s.tr} onMouseEnter={e=>e.currentTarget.style.background='#0c1018'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={s.tdMain}>{sess.track || '—'}</td>
                <td style={s.td}>{sess.car || '—'}</td>
                <td style={s.td}>{fmtDate(sess.started_at)}</td>
                <td style={s.td}><span style={s.badge(true)}>✓ subida</span></td>
                <td style={s.td}><Link to={`/session/${sess.id}`} style={{color:'#00c8f0',textDecoration:'none',fontSize:11}}>Ver →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
