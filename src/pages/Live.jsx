import React, { useEffect, useState, useRef } from 'react'
import { sb } from '../lib/api'

const LIVE_URL = 'https://veizytujurlhlvchxgbi.supabase.co/functions/v1/pitdata-live'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaXp5dHVqdXJsaGx2Y2h4Z2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNDYxNjMsImV4cCI6MjA5MjgyMjE2M30.BHTDUyYhOnXbHlDAx-DnXyFBadapqwYTRG3qy9ystqk'

function fmtMs(ms) {
  if (!ms || ms <= 0) return '—'
  const m = Math.floor(ms / 60000)
  return `${m}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
}
function fmtS(ms) { return ms > 0 ? (ms / 1000).toFixed(3) : '—' }
function gLbl(g) { return g === -1 ? 'R' : g === 0 ? 'N' : String(g) }
function tyreColor(t) { return t < 50 ? '#3d6fff' : t < 70 ? '#00c8f0' : t < 100 ? '#00e676' : t < 120 ? '#ffd600' : '#ff3351' }

const PILOT_COLORS = ['#00c8f0', '#00e676', '#ffd600', '#b388ff']

// ── Mini track map ────────────────────────────────────────────────────────────
function TrackDot({ pilots }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    pilots.filter(p => p.is_online && p.car_x !== 0).forEach((p, i) => {
      // Punto simple con posición normalizada en un óvalo
      const angle = p.norm_pos * Math.PI * 2
      const cx = 90 + Math.cos(angle) * 70
      const cy = 60 + Math.sin(angle) * 45
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = PILOT_COLORS[i % 4]; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Rajdhani,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(p.username?.slice(0,3)?.toUpperCase(), cx, cy + 3)
    })
  }, [pilots])
  return <canvas ref={canvasRef} width={180} height={120} style={{background:'#07090d',borderRadius:8}} />
}

// ── Barra de pedal ────────────────────────────────────────────────────────────
function PedalBar({ val, color }) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
      <div style={{width:16,height:60,background:'#07090d',borderRadius:3,overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
        <div style={{width:'100%',background:color,borderRadius:'2px 2px 0 0',height:`${Math.round(val*100)}%`,transition:'height .1s'}} />
      </div>
      <div style={{fontSize:9,fontFamily:'JetBrains Mono',color:'#6b7d99'}}>{Math.round(val*100)}%</div>
    </div>
  )
}

// ── Tyre temps ────────────────────────────────────────────────────────────────
function TyreGrid({ fl, fr, rl, rr }) {
  const tyres = [['FL',fl],['FR',fr],['RL',rl],['RR',rr]]
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3}}>
      {tyres.map(([lbl,t]) => (
        <div key={lbl} style={{display:'flex',alignItems:'center',gap:4}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:tyreColor(t),flexShrink:0}} />
          <span style={{fontSize:9,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>{lbl} {t > 0 ? Math.round(t)+'°' : '—'}</span>
        </div>
      ))}
    </div>
  )
}

// ── Pilot Card ────────────────────────────────────────────────────────────────
function PilotCard({ pilot, color, index }) {
  const dMs = pilot.delta_ms || 0
  const sectors = [pilot.s1_ms, pilot.s2_ms, pilot.s3_ms]

  return (
    <div style={{
      background:'#0c1018', border:`1px solid ${pilot.is_online ? color+'66' : '#1c2535'}`,
      borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:12,
      opacity: pilot.is_online ? 1 : 0.4, transition:'opacity .3s'
    }}>
      {/* Header: nombre + estado */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:pilot.is_online?color:'#2e3d55',
            boxShadow:pilot.is_online?`0 0 8px ${color}`:'none'}} />
          <span style={{fontSize:15,fontWeight:600,color:'#dce6f5'}}>{pilot.username}</span>
          {pilot.track && <span style={{fontSize:10,color:'#6b7d99'}}>{pilot.track}</span>}
        </div>
        <span style={{fontSize:10,color:'#2e3d55',fontFamily:'JetBrains Mono'}}>
          {pilot.is_online ? 'EN PISTA' : 'offline'}
        </span>
      </div>

      {pilot.is_online && <>
        {/* Métricas principales */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[
            ['Vuelta',fmtMs(pilot.lap_time_ms)],
            ['Mejor',fmtMs(pilot.best_time_ms)],
            ['Delta',(dMs<=0?'':'+')+(dMs/1000).toFixed(3)],
            ['V'+pilot.lap_number,'#'+pilot.lap_number],
          ].map(([lbl,val], i) => (
            <div key={lbl} style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
              <div style={{fontSize:10,color:'#2e3d55',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:2}}>{lbl}</div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:13,fontWeight:500,
                color: i===2?(dMs<-50?'#00e676':dMs>50?'#ff3351':'#6b7d99'):i===3?color:'#dce6f5'}}>
                {i===3 ? pilot.lap_number : val}
              </div>
            </div>
          ))}
        </div>

        {/* Dinámica: speed + gear + pedales */}
        <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',minWidth:70,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:700,color:color,fontFamily:'JetBrains Mono',lineHeight:1}}>
              {gLbl(pilot.gear)}
            </div>
            <div style={{fontSize:9,color:'#2e3d55',marginTop:2}}>MARCHA</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {Math.round(pilot.speed_kmh)}
            </div>
            <div style={{fontSize:9,color:'#2e3d55',marginTop:2}}>KM/H</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {(pilot.rpm||0).toLocaleString()}
            </div>
            <div style={{fontSize:9,color:'#2e3d55',marginTop:2}}>RPM</div>
          </div>
          <div style={{display:'flex',gap:6,padding:8,background:'#07090d',borderRadius:6}}>
            <PedalBar val={pilot.throttle||0} color="#00e676" />
            <PedalBar val={pilot.brake||0}    color="#ff3351" />
          </div>
        </div>

        {/* Sectores */}
        <div style={{display:'flex',gap:6}}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              flex:1, background:'#07090d', borderRadius:6, padding:'5px 8px', textAlign:'center',
              borderTop: pilot.current_sector===i ? `2px solid ${color}` : '2px solid transparent'
            }}>
              <div style={{fontSize:9,color:'#2e3d55',marginBottom:2}}>S{i+1}</div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:12,color: pilot.current_sector===i ? color : '#dce6f5'}}>
                {sectors[i] > 0 ? fmtS(sectors[i]) : pilot.current_sector===i ? '...' : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Temps */}
        <TyreGrid fl={pilot.tyre_temp_fl} fr={pilot.tyre_temp_fr}
                  rl={pilot.tyre_temp_rl} rr={pilot.tyre_temp_rr} />
      </>}
    </div>
  )
}

// ── Live Page ─────────────────────────────────────────────────────────────────
export default function Live() {
  const [pilots, setPilots] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${LIVE_URL}/status`, {
        headers: { apikey: ANON }
      })
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      setPilots(Array.isArray(data) ? data : [])
      setLastUpdate(new Date())
      setError(null)
    } catch(e) {
      setError(e.message)
    }
  }

  // Poll cada 1 segundo + Supabase Realtime para updates instantáneos
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 1000)

    // Realtime subscription
    const channel = sb.channel('pitdata_live_changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pitdata_live'
      }, (payload) => {
        setPilots(prev => {
          const updated = payload.new
          const idx = prev.findIndex(p => p.user_id === updated.user_id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = updated
            return next
          }
          return [...prev, updated]
        })
        setLastUpdate(new Date())
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      sb.removeChannel(channel)
    }
  }, [])

  const online = pilots.filter(p => p.is_online)
  const offline = pilots.filter(p => !p.is_online)

  return (
    <div style={{padding:24, maxWidth:1200, margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:20,fontWeight:600,color:'#dce6f5'}}>
            Live — Equipo
            <span style={{marginLeft:10,fontSize:13,color:'#00e676',fontFamily:'JetBrains Mono'}}>
              {online.length} en pista
            </span>
          </div>
          <div style={{fontSize:11,color:'#6b7d99',marginTop:2}}>
            {lastUpdate ? `Actualizado: ${lastUpdate.toLocaleTimeString()}` : 'Conectando...'}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',
            background:online.length?'#00e676':'#2e3d55',
            boxShadow:online.length?'0 0 8px #00e676':'none'}} />
          <span style={{fontSize:11,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>
            {online.length > 0 ? 'LIVE' : 'Sin pilotos en pista'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{background:'#ff335118',border:'1px solid #ff335144',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#ff3351'}}>
          Error: {error}
        </div>
      )}

      {/* Grid de pilotos */}
      {pilots.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0',color:'#2e3d55',fontSize:14}}>
          <div style={{fontSize:32,marginBottom:12}}>🏁</div>
          Ningún piloto en línea todavía<br/>
          <span style={{fontSize:12,marginTop:8,display:'block'}}>
            Iniciá el dashboard en tu PC para aparecer aquí
          </span>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
          {[...online, ...offline].map((pilot, i) => (
            <PilotCard key={pilot.user_id} pilot={pilot} color={PILOT_COLORS[i % 4]} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
