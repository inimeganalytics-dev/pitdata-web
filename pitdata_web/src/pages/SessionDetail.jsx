import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'

function fmtMs(ms) {
  if (!ms || ms <= 0) return '—'
  const m = Math.floor(ms / 60000)
  return `${m}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`
}
function fmtS(ms) { return ms > 0 ? (ms / 1000).toFixed(3) : '—' }

const s = {
  page: { padding:24, maxWidth:1200, margin:'0 auto' },
  back: { color:'#6b7d99', fontSize:12, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:16 },
  heading: { fontSize:20, fontWeight:600, color:'#dce6f5', marginBottom:4 },
  sub: { fontSize:12, color:'#6b7d99', marginBottom:24 },
  grid: { display:'grid', gridTemplateColumns:'280px 1fr', gap:16 },
  panel: { background:'#0c1018', border:'1px solid #1c2535', borderRadius:10, padding:16 },
  panelTitle: { fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.12em', color:'#2e3d55', marginBottom:12 },
  lapRow: (selected, best) => ({
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'7px 10px', borderRadius:6, cursor:'pointer', marginBottom:4,
    background: selected ? '#182030' : 'transparent',
    border: selected ? '1px solid #00c8f0' : '1px solid transparent',
    transition:'all .1s'
  }),
  lapNum: { fontSize:10, color:'#2e3d55' },
  lapTime: { fontFamily:'JetBrains Mono', fontSize:13, color:'#dce6f5' },
  lapDelta: (d) => ({
    fontFamily:'JetBrains Mono', fontSize:10,
    color: d === 0 ? '#b388ff' : d < 0 ? '#00e676' : '#ff3351'
  }),
  badge: { display:'inline-block', padding:'1px 6px', borderRadius:20, fontSize:9, fontWeight:600, background:'#ff335118', color:'#ff3351', border:'1px solid #ff335144', marginLeft:6 },
  charts: { display:'flex', flexDirection:'column', gap:12 },
  chart: { background:'#0c1018', border:'1px solid #1c2535', borderRadius:10, padding:16 },
  chartTitle: { fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.12em', color:'#2e3d55', marginBottom:12 },
  empty: { color:'#2e3d55', fontSize:12, textAlign:'center', padding:'40px 0' },
  sectors: { display:'flex', gap:8, marginTop:12 },
  sector: { flex:1, background:'#07090d', borderRadius:6, padding:'6px 10px', textAlign:'center' },
  secLbl: { fontSize:9, color:'#2e3d55', marginBottom:3 },
  secVal: { fontFamily:'JetBrains Mono', fontSize:13, color:'#dce6f5' },
}

const CHART_THEME = {
  current: '#00c8f0',
  best: '#b388ff',
  throttle: '#00e676',
  brake: '#ff3351',
  gear: '#ffd600',
}

export default function SessionDetail() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [selectedLap, setSelectedLap] = useState(null)
  const [frames, setFrames] = useState([])
  const [bestFrames, setBestFrames] = useState([])
  const [bestLapId, setBestLapId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingFrames, setLoadingFrames] = useState(false)

  useEffect(() => {
    api.session(id).then(s => {
      setSession(s)
      // Encontrar mejor vuelta válida
      const valid = (s.laps || []).filter(l => l.valid)
      if (valid.length) {
        const best = valid.reduce((a, b) => a.time_ms < b.time_ms ? a : b)
        setBestLapId(best.id || null)
      }
    }).finally(() => setLoading(false))
  }, [id])

  const loadLap = async (lap) => {
    if (!lap.id) return
    setSelectedLap(lap)
    setLoadingFrames(true)
    try {
      const data = await api.frames(lap.id)
      setFrames(data.frames || [])
    } catch(e) {
      setFrames([])
    } finally {
      setLoadingFrames(false)
    }
  }

  if (loading) return <div style={{padding:40,color:'#6b7d99',fontFamily:'JetBrains Mono'}}>Cargando sesión...</div>
  if (!session) return <div style={{padding:40,color:'#ff3351'}}>Sesión no encontrada</div>

  const laps = session.laps || []
  const validLaps = laps.filter(l => l.valid)
  const bestMs = validLaps.length ? Math.min(...validLaps.map(l => l.time_ms)) : 0

  return (
    <div style={s.page}>
      <Link to="/" style={s.back}>← Volver</Link>
      <div style={s.heading}>{session.track || 'Sesión'}</div>
      <div style={s.sub}>{session.car} · {laps.length} vueltas</div>

      <div style={s.grid}>
        {/* Panel izquierdo: lista de vueltas */}
        <div>
          <div style={s.panel}>
            <div style={s.panelTitle}>Vueltas</div>
            {laps.slice().reverse().map(lap => {
              const d = bestMs ? lap.time_ms - bestMs : 0
              const isBest = lap.time_ms === bestMs && lap.valid
              const isSelected = selectedLap?.lap === lap.lap
              return (
                <div key={lap.lap} style={s.lapRow(isSelected, isBest)} onClick={() => loadLap(lap)}>
                  <span style={s.lapNum}>V{lap.lap}</span>
                  <span style={s.lapTime}>
                    {fmtMs(lap.time_ms)}
                    {!lap.valid && <span style={s.badge}>✗</span>}
                  </span>
                  <span style={s.lapDelta(d)}>
                    {isBest ? '★ mejor' : (d <= 0 ? '' : '+') + (d / 1000).toFixed(3)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Sectores de la vuelta seleccionada */}
          {selectedLap && (
            <div style={{...s.panel, marginTop:12}}>
              <div style={s.panelTitle}>Sectores — V{selectedLap.lap}</div>
              <div style={s.sectors}>
                {(selectedLap.sectors || []).map((ms, i) => (
                  <div key={i} style={s.sector}>
                    <div style={s.secLbl}>S{i+1}</div>
                    <div style={s.secVal}>{fmtS(ms)}</div>
                  </div>
                ))}
                {(!selectedLap.sectors || selectedLap.sectors.length === 0) && (
                  <div style={{color:'#2e3d55',fontSize:12}}>Sin datos de sectores</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: gráficos */}
        <div style={s.charts}>
          {!selectedLap ? (
            <div style={{...s.panel, display:'flex', alignItems:'center', justifyContent:'center', minHeight:300}}>
              <div style={s.empty}>Seleccioná una vuelta para ver el análisis</div>
            </div>
          ) : loadingFrames ? (
            <div style={{...s.panel, display:'flex', alignItems:'center', justifyContent:'center', minHeight:300}}>
              <div style={{color:'#6b7d99',fontFamily:'JetBrains Mono',fontSize:12}}>Cargando telemetría...</div>
            </div>
          ) : frames.length === 0 ? (
            <div style={{...s.panel, display:'flex', alignItems:'center', justifyContent:'center', minHeight:300}}>
              <div style={s.empty}>Sin datos de telemetría para esta vuelta</div>
            </div>
          ) : (
            <>
              {/* Speed trace */}
              <div style={s.chart}>
                <div style={s.chartTitle}>Velocidad (km/h)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={frames} margin={{top:4,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
                    <XAxis dataKey="norm_pos" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{fontSize:9,fill:'#2e3d55'}} />
                    <YAxis tick={{fontSize:9,fill:'#2e3d55'}} />
                    <Tooltip contentStyle={{background:'#0c1018',border:'1px solid #1c2535',fontSize:11}} labelFormatter={v => `Pos: ${(v*100).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="speed" stroke={CHART_THEME.current} dot={false} strokeWidth={1.5} name="Velocidad" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Throttle & Brake */}
              <div style={s.chart}>
                <div style={s.chartTitle}>Acelerador / Freno (%)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={frames.map(f => ({...f, throttle_pct: f.throttle*100, brake_pct: f.brake*100}))} margin={{top:4,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
                    <XAxis dataKey="norm_pos" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{fontSize:9,fill:'#2e3d55'}} />
                    <YAxis domain={[0,100]} tick={{fontSize:9,fill:'#2e3d55'}} />
                    <Tooltip contentStyle={{background:'#0c1018',border:'1px solid #1c2535',fontSize:11}} labelFormatter={v => `Pos: ${(v*100).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="throttle_pct" stroke={CHART_THEME.throttle} dot={false} strokeWidth={1.5} name="Throttle" />
                    <Line type="monotone" dataKey="brake_pct" stroke={CHART_THEME.brake} dot={false} strokeWidth={1.5} name="Freno" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gear */}
              <div style={s.chart}>
                <div style={s.chartTitle}>Marchas</div>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={frames} margin={{top:4,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
                    <XAxis dataKey="norm_pos" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{fontSize:9,fill:'#2e3d55'}} />
                    <YAxis domain={[0,8]} ticks={[1,2,3,4,5,6,7,8]} tick={{fontSize:9,fill:'#2e3d55'}} />
                    <Tooltip contentStyle={{background:'#0c1018',border:'1px solid #1c2535',fontSize:11}} labelFormatter={v => `Pos: ${(v*100).toFixed(1)}%`} />
                    <Line type="stepAfter" dataKey="gear" stroke={CHART_THEME.gear} dot={false} strokeWidth={1.5} name="Marcha" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* G lateral */}
              <div style={s.chart}>
                <div style={s.chartTitle}>G lateral</div>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={frames} margin={{top:4,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
                    <XAxis dataKey="norm_pos" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{fontSize:9,fill:'#2e3d55'}} />
                    <YAxis tick={{fontSize:9,fill:'#2e3d55'}} />
                    <Tooltip contentStyle={{background:'#0c1018',border:'1px solid #1c2535',fontSize:11}} labelFormatter={v => `Pos: ${(v*100).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="g_lat" stroke="#ff8c42" dot={false} strokeWidth={1.5} name="G lat" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
