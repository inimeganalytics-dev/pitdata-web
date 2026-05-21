import React, { useEffect, useState } from 'react'
import { sb } from '../lib/api'

function fmtMs(ms) {
  if (!ms || ms <= 0) return '—'
  const m = Math.floor(ms / 60000)
  return `${m}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
}
function fmtS(ms) { return ms > 0 ? (ms / 1000).toFixed(3) : '—' }
function gLbl(g) { return g === -1 ? 'R' : g === 0 ? 'N' : String(g) }
function tyreColor(t) {
  return t < 50 ? '#3d6fff' : t < 70 ? '#00c8f0' : t < 100 ? '#00e676' : t < 120 ? '#ffd600' : '#ff3351'
}

const COLORS = ['#00c8f0', '#00e676', '#ffd600', '#b388ff']

function PedalBar({ val, color }) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
      <div style={{width:14,height:56,background:'#07090d',borderRadius:3,overflow:'hidden',
        display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
        <div style={{width:'100%',background:color,borderRadius:'2px 2px 0 0',
          height:`${Math.min(100,Math.round((val||0)*100))}%`,transition:'height .1s'}} />
      </div>
      <div style={{fontSize:9,fontFamily:'JetBrains Mono',color:'#6b7d99'}}>{Math.round((val||0)*100)}%</div>
    </div>
  )
}

function PilotCard({ pilot, color }) {
  const dMs = pilot.delta_ms || 0
  const sectors = [pilot.s1_ms, pilot.s2_ms, pilot.s3_ms]
  const tt = [pilot.tyre_temp_fl, pilot.tyre_temp_fr, pilot.tyre_temp_rl, pilot.tyre_temp_rr]
  const tIds = ['FL','FR','RL','RR']

  return (
    <div style={{
      background:'#0c1018',
      border:`1px solid ${pilot.is_online ? color+'66' : '#1c2535'}`,
      borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:10,
      opacity: pilot.is_online ? 1 : 0.45, transition:'all .3s'
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:pilot.is_online?color:'#2e3d55',
            boxShadow:pilot.is_online?`0 0 8px ${color}`:'none',transition:'all .3s'}} />
          <span style={{fontSize:16,fontWeight:600,color:'#dce6f5'}}>{pilot.username}</span>
          {pilot.track && <span style={{fontSize:10,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>{pilot.track}</span>}
        </div>
        <span style={{fontSize:9,fontFamily:'JetBrains Mono',color:pilot.is_online?color:'#2e3d55',
          letterSpacing:'.1em',textTransform:'uppercase'}}>
          {pilot.is_online ? '● EN PISTA' : 'offline'}
        </span>
      </div>

      {pilot.is_online && <>
        {/* Tiempos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>VUELTA</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#dce6f5'}}>{fmtMs(pilot.lap_time_ms)}</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>MEJOR</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#b388ff'}}>{fmtMs(pilot.best_time_ms)}</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>DELTA</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,
              color:dMs<-50?'#00e676':dMs>50?'#ff3351':'#6b7d99'}}>
              {(dMs<=0?'':'+')+(dMs/1000).toFixed(3)}
            </div>
          </div>
        </div>

        {/* Dinámica */}
        <div style={{display:'flex',gap:8,alignItems:'stretch'}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 14px',textAlign:'center',minWidth:52}}>
            <div style={{fontSize:28,fontWeight:700,color,fontFamily:'JetBrains Mono',lineHeight:1}}>{gLbl(pilot.gear)}</div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>MARCHA</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {Math.round(pilot.speed_kmh||0)}
            </div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>KM/H</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {(pilot.rpm||0).toLocaleString()}
            </div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>RPM</div>
          </div>
          <div style={{display:'flex',gap:5,padding:'6px 8px',background:'#07090d',borderRadius:6,alignItems:'flex-end'}}>
            <PedalBar val={pilot.throttle} color="#00e676" />
            <PedalBar val={pilot.brake}    color="#ff3351" />
          </div>
        </div>

        {/* Sectores */}
        <div style={{display:'flex',gap:5}}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              flex:1,background:'#07090d',borderRadius:6,padding:'5px 8px',textAlign:'center',
              borderTop:`2px solid ${pilot.current_sector===i?color:'transparent'}`
            }}>
              <div style={{fontSize:8,color:'#2e3d55',marginBottom:2}}>S{i+1}</div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:11,
                color:pilot.current_sector===i?color:'#dce6f5'}}>
                {sectors[i]>0 ? fmtS(sectors[i]) : pilot.current_sector===i ? '...' : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Temps neumáticos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4}}>
          {tIds.map((id,i) => (
            <div key={id} style={{background:'#07090d',borderRadius:5,padding:'4px 6px',textAlign:'center'}}>
              <div style={{fontSize:8,color:'#2e3d55',marginBottom:2}}>{id}</div>
              <div style={{width:20,height:3,borderRadius:2,background:tyreColor(tt[i]||0),margin:'0 auto 3px'}} />
              <div style={{fontSize:10,fontFamily:'JetBrains Mono',color:'#dce6f5'}}>
                {tt[i]>0?Math.round(tt[i])+'°':'—'}
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

export default function Live() {
  const [pilots, setPilots] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    // Carga inicial
    sb.from('pitdata_live').select('*').order('username')
      .then(({ data }) => { if (data) setPilots(data); setLastUpdate(new Date()) })

    // Realtime — updates instantáneos via WebSocket
    const channel = sb
      .channel('live-team')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pitdata_live'
      }, ({ eventType, new: updated, old: removed }) => {
        if (eventType === 'DELETE') {
          setPilots(prev => prev.filter(p => p.user_id !== removed.user_id))
        } else {
          setPilots(prev => {
            const idx = prev.findIndex(p => p.user_id === updated.user_id)
            if (idx >= 0) { const n=[...prev]; n[idx]=updated; return n }
            return [...prev, updated]
          })
        }
        setLastUpdate(new Date())
      })
      .subscribe()

    return () => sb.removeChannel(channel)
  }, [])

  const online  = pilots.filter(p => p.is_online)
  const offline = pilots.filter(p => !p.is_online)
  const sorted  = [...online, ...offline]

  return (
    <div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:20,fontWeight:600,color:'#dce6f5',display:'flex',alignItems:'center',gap:10}}>
            Live — Equipo
            {online.length > 0 && (
              <span style={{fontSize:12,color:'#00e676',fontFamily:'JetBrains Mono',
                background:'#00e67618',border:'1px solid #00e67644',
                padding:'2px 8px',borderRadius:20}}>
                {online.length} en pista
              </span>
            )}
          </div>
          <div style={{fontSize:11,color:'#6b7d99',marginTop:3}}>
            {lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString()}` : 'Conectando...'}
          </div>
        </div>
      </div>

      {/* Cards */}
      {pilots.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0',color:'#2e3d55'}}>
          <div style={{fontSize:40,marginBottom:16}}>🏁</div>
          <div style={{fontSize:14,marginBottom:8}}>Ningún piloto en línea todavía</div>
          <div style={{fontSize:12}}>Iniciá el dashboard en tu PC para aparecer aquí</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
          {sorted.map((p, i) => (
            <PilotCard key={p.user_id} pilot={p} color={COLORS[i % 4]} />
          ))}
        </div>
      )}
    </div>
  )
}import React, { useEffect, useState } from 'react'
import { sb } from '../lib/api'

function fmtMs(ms) {
  if (!ms || ms <= 0) return '—'
  const m = Math.floor(ms / 60000)
  return `${m}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
}
function fmtS(ms) { return ms > 0 ? (ms / 1000).toFixed(3) : '—' }
function gLbl(g) { return g === -1 ? 'R' : g === 0 ? 'N' : String(g) }
function tyreColor(t) {
  return t < 50 ? '#3d6fff' : t < 70 ? '#00c8f0' : t < 100 ? '#00e676' : t < 120 ? '#ffd600' : '#ff3351'
}

const COLORS = ['#00c8f0', '#00e676', '#ffd600', '#b388ff']

function PedalBar({ val, color }) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
      <div style={{width:14,height:56,background:'#07090d',borderRadius:3,overflow:'hidden',
        display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
        <div style={{width:'100%',background:color,borderRadius:'2px 2px 0 0',
          height:`${Math.min(100,Math.round((val||0)*100))}%`,transition:'height .1s'}} />
      </div>
      <div style={{fontSize:9,fontFamily:'JetBrains Mono',color:'#6b7d99'}}>{Math.round((val||0)*100)}%</div>
    </div>
  )
}

function PilotCard({ pilot, color }) {
  const dMs = pilot.delta_ms || 0
  const sectors = [pilot.s1_ms, pilot.s2_ms, pilot.s3_ms]
  const tt = [pilot.tyre_temp_fl, pilot.tyre_temp_fr, pilot.tyre_temp_rl, pilot.tyre_temp_rr]
  const tIds = ['FL','FR','RL','RR']

  return (
    <div style={{
      background:'#0c1018',
      border:`1px solid ${pilot.is_online ? color+'66' : '#1c2535'}`,
      borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:10,
      opacity: pilot.is_online ? 1 : 0.45, transition:'all .3s'
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:pilot.is_online?color:'#2e3d55',
            boxShadow:pilot.is_online?`0 0 8px ${color}`:'none',transition:'all .3s'}} />
          <span style={{fontSize:16,fontWeight:600,color:'#dce6f5'}}>{pilot.username}</span>
          {pilot.track && <span style={{fontSize:10,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>{pilot.track}</span>}
        </div>
        <span style={{fontSize:9,fontFamily:'JetBrains Mono',color:pilot.is_online?color:'#2e3d55',
          letterSpacing:'.1em',textTransform:'uppercase'}}>
          {pilot.is_online ? '● EN PISTA' : 'offline'}
        </span>
      </div>

      {pilot.is_online && <>
        {/* Tiempos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>VUELTA</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#dce6f5'}}>{fmtMs(pilot.lap_time_ms)}</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>MEJOR</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#b388ff'}}>{fmtMs(pilot.best_time_ms)}</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>DELTA</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,
              color:dMs<-50?'#00e676':dMs>50?'#ff3351':'#6b7d99'}}>
              {(dMs<=0?'':'+')+(dMs/1000).toFixed(3)}
            </div>
          </div>
        </div>

        {/* Dinámica */}
        <div style={{display:'flex',gap:8,alignItems:'stretch'}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 14px',textAlign:'center',minWidth:52}}>
            <div style={{fontSize:28,fontWeight:700,color,fontFamily:'JetBrains Mono',lineHeight:1}}>{gLbl(pilot.gear)}</div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>MARCHA</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {Math.round(pilot.speed_kmh||0)}
            </div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>KM/H</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {(pilot.rpm||0).toLocaleString()}
            </div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>RPM</div>
          </div>
          <div style={{display:'flex',gap:5,padding:'6px 8px',background:'#07090d',borderRadius:6,alignItems:'flex-end'}}>
            <PedalBar val={pilot.throttle} color="#00e676" />
            <PedalBar val={pilot.brake}    color="#ff3351" />
          </div>
        </div>

        {/* Sectores */}
        <div style={{display:'flex',gap:5}}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              flex:1,background:'#07090d',borderRadius:6,padding:'5px 8px',textAlign:'center',
              borderTop:`2px solid ${pilot.current_sector===i?color:'transparent'}`
            }}>
              <div style={{fontSize:8,color:'#2e3d55',marginBottom:2}}>S{i+1}</div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:11,
                color:pilot.current_sector===i?color:'#dce6f5'}}>
                {sectors[i]>0 ? fmtS(sectors[i]) : pilot.current_sector===i ? '...' : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Temps neumáticos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4}}>
          {tIds.map((id,i) => (
            <div key={id} style={{background:'#07090d',borderRadius:5,padding:'4px 6px',textAlign:'center'}}>
              <div style={{fontSize:8,color:'#2e3d55',marginBottom:2}}>{id}</div>
              <div style={{width:20,height:3,borderRadius:2,background:tyreColor(tt[i]||0),margin:'0 auto 3px'}} />
              <div style={{fontSize:10,fontFamily:'JetBrains Mono',color:'#dce6f5'}}>
                {tt[i]>0?Math.round(tt[i])+'°':'—'}
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

export default function Live() {
  const [pilots, setPilots] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    // Carga inicial
    sb.from('pitdata_live').select('*').order('username')
      .then(({ data }) => { if (data) setPilots(data); setLastUpdate(new Date()) })

    // Realtime — updates instantáneos via WebSocket
    const channel = sb
      .channel('live-team')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pitdata_live'
      }, ({ eventType, new: updated, old: removed }) => {
        if (eventType === 'DELETE') {
          setPilots(prev => prev.filter(p => p.user_id !== removed.user_id))
        } else {
          setPilots(prev => {
            const idx = prev.findIndex(p => p.user_id === updated.user_id)
            if (idx >= 0) { const n=[...prev]; n[idx]=updated; return n }
            return [...prev, updated]
          })
        }
        setLastUpdate(new Date())
      })
      .subscribe()

    return () => sb.removeChannel(channel)
  }, [])

  const online  = pilots.filter(p => p.is_online)
  const offline = pilots.filter(p => !p.is_online)
  const sorted  = [...online, ...offline]

  return (
    <div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:20,fontWeight:600,color:'#dce6f5',display:'flex',alignItems:'center',gap:10}}>
            Live — Equipo
            {online.length > 0 && (
              <span style={{fontSize:12,color:'#00e676',fontFamily:'JetBrains Mono',
                background:'#00e67618',border:'1px solid #00e67644',
                padding:'2px 8px',borderRadius:20}}>
                {online.length} en pista
              </span>
            )}
          </div>
          <div style={{fontSize:11,color:'#6b7d99',marginTop:3}}>
            {lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString()}` : 'Conectando...'}
          </div>
        </div>
      </div>

      {/* Cards */}
      {pilots.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0',color:'#2e3d55'}}>
          <div style={{fontSize:40,marginBottom:16}}>🏁</div>
          <div style={{fontSize:14,marginBottom:8}}>Ningún piloto en línea todavía</div>
          <div style={{fontSize:12}}>Iniciá el dashboard en tu PC para aparecer aquí</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
          {sorted.map((p, i) => (
            <PilotCard key={p.user_id} pilot={p} color={COLORS[i % 4]} />
          ))}
        </div>
      )}
    </div>
  )
}import React, { useEffect, useState } from 'react'
import { sb } from '../lib/api'

function fmtMs(ms) {
  if (!ms || ms <= 0) return '—'
  const m = Math.floor(ms / 60000)
  return `${m}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
}
function fmtS(ms) { return ms > 0 ? (ms / 1000).toFixed(3) : '—' }
function gLbl(g) { return g === -1 ? 'R' : g === 0 ? 'N' : String(g) }
function tyreColor(t) {
  return t < 50 ? '#3d6fff' : t < 70 ? '#00c8f0' : t < 100 ? '#00e676' : t < 120 ? '#ffd600' : '#ff3351'
}

const COLORS = ['#00c8f0', '#00e676', '#ffd600', '#b388ff']

function PedalBar({ val, color }) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
      <div style={{width:14,height:56,background:'#07090d',borderRadius:3,overflow:'hidden',
        display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
        <div style={{width:'100%',background:color,borderRadius:'2px 2px 0 0',
          height:`${Math.min(100,Math.round((val||0)*100))}%`,transition:'height .1s'}} />
      </div>
      <div style={{fontSize:9,fontFamily:'JetBrains Mono',color:'#6b7d99'}}>{Math.round((val||0)*100)}%</div>
    </div>
  )
}

function PilotCard({ pilot, color }) {
  const dMs = pilot.delta_ms || 0
  const sectors = [pilot.s1_ms, pilot.s2_ms, pilot.s3_ms]
  const tt = [pilot.tyre_temp_fl, pilot.tyre_temp_fr, pilot.tyre_temp_rl, pilot.tyre_temp_rr]
  const tIds = ['FL','FR','RL','RR']

  return (
    <div style={{
      background:'#0c1018',
      border:`1px solid ${pilot.is_online ? color+'66' : '#1c2535'}`,
      borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:10,
      opacity: pilot.is_online ? 1 : 0.45, transition:'all .3s'
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:pilot.is_online?color:'#2e3d55',
            boxShadow:pilot.is_online?`0 0 8px ${color}`:'none',transition:'all .3s'}} />
          <span style={{fontSize:16,fontWeight:600,color:'#dce6f5'}}>{pilot.username}</span>
          {pilot.track && <span style={{fontSize:10,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>{pilot.track}</span>}
        </div>
        <span style={{fontSize:9,fontFamily:'JetBrains Mono',color:pilot.is_online?color:'#2e3d55',
          letterSpacing:'.1em',textTransform:'uppercase'}}>
          {pilot.is_online ? '● EN PISTA' : 'offline'}
        </span>
      </div>

      {pilot.is_online && <>
        {/* Tiempos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>VUELTA</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#dce6f5'}}>{fmtMs(pilot.lap_time_ms)}</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>MEJOR</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'#b388ff'}}>{fmtMs(pilot.best_time_ms)}</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#2e3d55',letterSpacing:'.08em',marginBottom:2}}>DELTA</div>
            <div style={{fontFamily:'JetBrains Mono',fontSize:12,
              color:dMs<-50?'#00e676':dMs>50?'#ff3351':'#6b7d99'}}>
              {(dMs<=0?'':'+')+(dMs/1000).toFixed(3)}
            </div>
          </div>
        </div>

        {/* Dinámica */}
        <div style={{display:'flex',gap:8,alignItems:'stretch'}}>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 14px',textAlign:'center',minWidth:52}}>
            <div style={{fontSize:28,fontWeight:700,color,fontFamily:'JetBrains Mono',lineHeight:1}}>{gLbl(pilot.gear)}</div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>MARCHA</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {Math.round(pilot.speed_kmh||0)}
            </div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>KM/H</div>
          </div>
          <div style={{background:'#07090d',borderRadius:6,padding:'8px 12px',flex:1,textAlign:'center'}}>
            <div style={{fontSize:14,fontWeight:500,color:'#dce6f5',fontFamily:'JetBrains Mono',lineHeight:1}}>
              {(pilot.rpm||0).toLocaleString()}
            </div>
            <div style={{fontSize:8,color:'#2e3d55',marginTop:2}}>RPM</div>
          </div>
          <div style={{display:'flex',gap:5,padding:'6px 8px',background:'#07090d',borderRadius:6,alignItems:'flex-end'}}>
            <PedalBar val={pilot.throttle} color="#00e676" />
            <PedalBar val={pilot.brake}    color="#ff3351" />
          </div>
        </div>

        {/* Sectores */}
        <div style={{display:'flex',gap:5}}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              flex:1,background:'#07090d',borderRadius:6,padding:'5px 8px',textAlign:'center',
              borderTop:`2px solid ${pilot.current_sector===i?color:'transparent'}`
            }}>
              <div style={{fontSize:8,color:'#2e3d55',marginBottom:2}}>S{i+1}</div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:11,
                color:pilot.current_sector===i?color:'#dce6f5'}}>
                {sectors[i]>0 ? fmtS(sectors[i]) : pilot.current_sector===i ? '...' : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Temps neumáticos */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4}}>
          {tIds.map((id,i) => (
            <div key={id} style={{background:'#07090d',borderRadius:5,padding:'4px 6px',textAlign:'center'}}>
              <div style={{fontSize:8,color:'#2e3d55',marginBottom:2}}>{id}</div>
              <div style={{width:20,height:3,borderRadius:2,background:tyreColor(tt[i]||0),margin:'0 auto 3px'}} />
              <div style={{fontSize:10,fontFamily:'JetBrains Mono',color:'#dce6f5'}}>
                {tt[i]>0?Math.round(tt[i])+'°':'—'}
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

export default function Live() {
  const [pilots, setPilots] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    // Carga inicial
    sb.from('pitdata_live').select('*').order('username')
      .then(({ data }) => { if (data) setPilots(data); setLastUpdate(new Date()) })

    // Realtime — updates instantáneos via WebSocket
    const channel = sb
      .channel('live-team')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pitdata_live'
      }, ({ eventType, new: updated, old: removed }) => {
        if (eventType === 'DELETE') {
          setPilots(prev => prev.filter(p => p.user_id !== removed.user_id))
        } else {
          setPilots(prev => {
            const idx = prev.findIndex(p => p.user_id === updated.user_id)
            if (idx >= 0) { const n=[...prev]; n[idx]=updated; return n }
            return [...prev, updated]
          })
        }
        setLastUpdate(new Date())
      })
      .subscribe()

    return () => sb.removeChannel(channel)
  }, [])

  const online  = pilots.filter(p => p.is_online)
  const offline = pilots.filter(p => !p.is_online)
  const sorted  = [...online, ...offline]

  return (
    <div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:20,fontWeight:600,color:'#dce6f5',display:'flex',alignItems:'center',gap:10}}>
            Live — Equipo
            {online.length > 0 && (
              <span style={{fontSize:12,color:'#00e676',fontFamily:'JetBrains Mono',
                background:'#00e67618',border:'1px solid #00e67644',
                padding:'2px 8px',borderRadius:20}}>
                {online.length} en pista
              </span>
            )}
          </div>
          <div style={{fontSize:11,color:'#6b7d99',marginTop:3}}>
            {lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString()}` : 'Conectando...'}
          </div>
        </div>
      </div>

      {/* Cards */}
      {pilots.length === 0 ? (
        <div style={{textAlign:'center',padding:'80px 0',color:'#2e3d55'}}>
          <div style={{fontSize:40,marginBottom:16}}>🏁</div>
          <div style={{fontSize:14,marginBottom:8}}>Ningún piloto en línea todavía</div>
          <div style={{fontSize:12}}>Iniciá el dashboard en tu PC para aparecer aquí</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
          {sorted.map((p, i) => (
            <PilotCard key={p.user_id} pilot={p} color={COLORS[i % 4]} />
          ))}
        </div>
      )}
    </div>
  )
}
