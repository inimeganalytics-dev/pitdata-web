import React, { useState, useCallback, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

// ── Colores por vuelta ────────────────────────────────────────────────────────
const COLORS = ['#00c8f0','#00e676','#ffd600','#ff8c42','#b388ff','#ff3351']

// ── Parser específico para AC pyTelemetry CSV ─────────────────────────────────
function parseACCSV(text) {
  const lines = text.split('\n').map(l => l.replace(/\r/g,''))

  // Metadata
  const meta = {}
  for (let i = 0; i < 15; i++) {
    if (!lines[i]) continue
    const [k, ...rest] = lines[i].split(',')
    if (k && rest.length) meta[k.trim()] = rest.join(',').trim().replace(/"/g,'')
  }

  // Encontrar línea de headers (contiene 'time' y 'Speed' o 'Throttle')
  let headerLine = -1
  for (let i = 0; i < 30; i++) {
    if (lines[i] && lines[i].toLowerCase().startsWith('time,')) {
      headerLine = i
      break
    }
  }
  if (headerLine < 0) return null

  const headers = lines[headerLine].split(',').map(h => h.trim())

  // Mapear columnas por nombre exacto
  const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const COL = {
    time:     idx('time'),
    dist:     idx('Lap Distance'),
    lap_num:  idx('Lap Number'),
    lap_time: idx('Lap Time'),
    speed:    idx('Ground Speed'),
    throttle: idx('Throttle Pos'),
    brake:    idx('Brake Pos'),
    gear:     idx('Gear'),
    rpm:      idx('Engine RPM'),
    steer:    idx('Steering Angle'),
    glat:     idx('CG Accel Lateral'),
    glon:     idx('CG Accel Longitudinal'),
    fuel:     idx('Fuel Level'),
    tt_fl:    idx('Tire Temp Core FL'),
    tt_fr:    idx('Tire Temp Core FR'),
    tt_rl:    idx('Tire Temp Core RL'),
    tt_rr:    idx('Tire Temp Core RR'),
    x:        idx('Car Coord X'),
    y:        idx('Car Coord Z'),
    tc:       idx('TC Active'),
    abs:      idx('ABS Active'),
  }

  // Parsear datos (desde headerLine + 2, saltando la línea de unidades)
  const dataStart = headerLine + 2
  const byLap = {}

  for (let i = dataStart; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const vals = lines[i].split(',')
    if (vals.length < 10) continue

    const get = (col) => {
      if (col < 0 || col >= vals.length) return null
      const v = vals[col].trim()
      return v === '' ? null : parseFloat(v)
    }

    const lapNum = get(COL.lap_num)
    if (lapNum === null || isNaN(lapNum)) continue
    const ln = Math.round(lapNum)
    if (!byLap[ln]) byLap[ln] = []

    byLap[ln].push({
      time:     get(COL.time),
      dist:     get(COL.dist),
      lap_time: get(COL.lap_time),
      speed:    get(COL.speed),
      throttle: get(COL.throttle),
      brake:    get(COL.brake),
      gear:     get(COL.gear),
      rpm:      get(COL.rpm),
      steer:    get(COL.steer),
      glat:     get(COL.glat),
      glon:     get(COL.glon),
      fuel:     get(COL.fuel),
      tt_fl:    get(COL.tt_fl),
      tt_fr:    get(COL.tt_fr),
      tt_rl:    get(COL.tt_rl),
      tt_rr:    get(COL.tt_rr),
      x:        get(COL.x),
      y:        get(COL.y),
      tc:       get(COL.tc),
      abs:      get(COL.abs),
    })
  }

  // Procesar vueltas
  const lapTimes = meta['lapTimes']
    ? meta['lapTimes'].replace(/"/g,'').split(',').map(Number)
    : []

  const laps = Object.entries(byLap).map(([ln, rows]) => {
    const n = parseInt(ln)
    // Filtrar filas válidas y ordenar por distancia
    const valid = rows.filter(r => r.dist !== null && r.speed !== null)
    valid.sort((a, b) => a.dist - b.dist)
    // Deduplicar por distancia
    const deduped = []
    let lastDist = -1
    for (const row of valid) {
      if (row.dist !== lastDist) { deduped.push(row); lastDist = row.dist }
    }
    const lapTime = lapTimes[n - 2] || (deduped.length > 0 ? Math.max(...deduped.map(r => r.lap_time||0)) : 0)
    return {
      lapNum:  n,
      lapTime,
      rows:    deduped,
      maxDist: deduped.length ? Math.max(...deduped.map(r => r.dist)) : 0,
    }
  }).filter(l => l.rows.length > 50 && l.maxDist > 1000)
    .sort((a, b) => a.lapNum - b.lapNum)

  return { meta, laps }
}

// ── Formatear tiempo ──────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(3).padStart(6, '0')}`
}

// ── Tooltip custom ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'#0c1018',border:'1px solid #1c2535',borderRadius:6,padding:'8px 10px',fontSize:10}}>
      <div style={{color:'#6b7d99',marginBottom:4}}>{`${parseFloat(label).toFixed(0)}m`}</div>
      {payload.map((p, i) => (
        <div key={i} style={{color:p.color,display:'flex',gap:8,justifyContent:'space-between'}}>
          <span>{p.name}</span>
          <span style={{fontFamily:'JetBrains Mono'}}>
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit||''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Chart Row ─────────────────────────────────────────────────────────────────
function ChartRow({ title, dataKey, selectedLaps, unit='', yDomain, height=130, formatter }) {
  return (
    <div style={{background:'#0c1018',border:'1px solid #1c2535',borderRadius:8,
      padding:'8px 12px 4px',marginBottom:6}}>
      <div style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
        letterSpacing:'.1em',color:'#2e3d55',marginBottom:6,
        display:'flex',alignItems:'center',gap:12}}>
        {title} <span style={{color:'#6b7d99',fontSize:8,fontWeight:400}}>{unit}</span>
        <span style={{marginLeft:'auto',display:'flex',gap:10}}>
          {selectedLaps.map((l,i) => (
            <span key={i} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:12,height:2,background:COLORS[i],borderRadius:1,display:'inline-block'}}/>
              <span style={{color:COLORS[i],fontSize:8}}>V{l.lapNum} {fmtTime(l.lapTime)}</span>
            </span>
          ))}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart margin={{top:0,right:4,bottom:0,left:0}}>
          <CartesianGrid strokeDasharray="2 4" stroke="#111722" />
          <XAxis dataKey="dist" type="number" domain={['dataMin','dataMax']}
            tickFormatter={v => `${(v/1000).toFixed(2)}km`}
            tick={{fontSize:7,fill:'#2e3d55'}} />
          <YAxis domain={yDomain||['auto','auto']}
            tick={{fontSize:7,fill:'#2e3d55'}} width={32}
            tickFormatter={formatter} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {selectedLaps.map((lap, i) => (
            <Line key={i} data={lap.rows} type="monotone" dataKey={dataKey}
              stroke={COLORS[i]} dot={false} strokeWidth={1.5}
              name={`V${lap.lapNum}`} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Delta Chart ───────────────────────────────────────────────────────────────
function DeltaChart({ selectedLaps }) {
  if (selectedLaps.length < 2) return null
  const ref = selectedLaps[0]

  // Interpolación por distancia
  const interp = (rows, dist) => {
    const i = rows.findIndex(r => r.dist >= dist)
    if (i <= 0) return rows[0]?.lap_time || null
    const a = rows[i-1], b = rows[i]
    const t = (dist - a.dist) / (b.dist - a.dist)
    return a.lap_time + t * (b.lap_time - a.lap_time)
  }

  const deltas = selectedLaps.slice(1).map(lap => {
    return lap.rows.map(row => {
      const refTime = interp(ref.rows, row.dist)
      if (refTime === null) return null
      return { dist: row.dist, delta: row.lap_time - refTime }
    }).filter(Boolean)
  })

  return (
    <div style={{background:'#0c1018',border:'1px solid #243040',borderRadius:8,
      padding:'8px 12px 4px',marginBottom:6}}>
      <div style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
        letterSpacing:'.1em',color:'#2e3d55',marginBottom:6,
        display:'flex',alignItems:'center',gap:12}}>
        Delta de tiempo <span style={{color:'#6b7d99',fontSize:8,fontWeight:400}}>vs V{ref.lapNum}</span>
        <span style={{marginLeft:'auto',display:'flex',gap:10}}>
          {selectedLaps.slice(1).map((l,i) => (
            <span key={i} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:12,height:2,background:COLORS[i+1],borderRadius:1,display:'inline-block'}}/>
              <span style={{color:COLORS[i+1],fontSize:8}}>V{l.lapNum}</span>
            </span>
          ))}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <LineChart margin={{top:0,right:4,bottom:0,left:0}}>
          <CartesianGrid strokeDasharray="2 4" stroke="#111722" />
          <XAxis dataKey="dist" type="number" domain={['dataMin','dataMax']}
            tickFormatter={v => `${(v/1000).toFixed(2)}km`}
            tick={{fontSize:7,fill:'#2e3d55'}} />
          <YAxis tick={{fontSize:7,fill:'#2e3d55'}} width={32}
            tickFormatter={v => `${v.toFixed(2)}s`} />
          <ReferenceLine y={0} stroke="#1c2535" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip unit="s" />} />
          {selectedLaps.slice(1).map((lap, i) => (
            <Line key={i} data={deltas[i]} type="monotone" dataKey="delta"
              stroke={COLORS[i+1]} dot={false} strokeWidth={1.5}
              name={`V${lap.lapNum}`} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Lap Summary Table ─────────────────────────────────────────────────────────
function LapTable({ laps, selectedNums, onToggle }) {
  if (!laps.length) return null
  const bestTime = Math.min(...laps.map(l => l.lapTime).filter(Boolean))

  return (
    <div style={{background:'#0c1018',border:'1px solid #1c2535',borderRadius:8,padding:12,marginBottom:16}}>
      <div style={{fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'.1em',color:'#2e3d55',marginBottom:8}}>
        Vueltas — hacé clic para comparar (máx 4)
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {laps.map((lap, i) => {
          const isBest = lap.lapTime === bestTime
          const isSelected = selectedNums.includes(lap.lapNum)
          const selIdx = selectedNums.indexOf(lap.lapNum)
          const delta = bestTime ? lap.lapTime - bestTime : 0

          return (
            <div key={i} onClick={() => onToggle(lap.lapNum)}
              style={{
                display:'flex',alignItems:'center',gap:12,padding:'6px 10px',
                borderRadius:6,cursor:'pointer',transition:'all .1s',
                background: isSelected ? COLORS[selIdx]+'18' : 'transparent',
                border: isSelected ? `1px solid ${COLORS[selIdx]}44` : '1px solid transparent',
              }}>
              {isSelected && (
                <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[selIdx],flexShrink:0}} />
              )}
              {!isSelected && <div style={{width:8,height:8,borderRadius:'50%',background:'#1c2535',flexShrink:0}} />}
              <span style={{fontSize:11,color:'#6b7d99',fontFamily:'JetBrains Mono',minWidth:24}}>V{lap.lapNum}</span>
              <span style={{fontSize:13,fontWeight:500,color: isBest?'#b388ff':'#dce6f5',
                fontFamily:'JetBrains Mono',flex:1}}>{fmtTime(lap.lapTime)}</span>
              <span style={{fontSize:10,fontFamily:'JetBrains Mono',
                color: isBest?'#b388ff':delta>0?'#ff3351':'#00e676'}}>
                {isBest ? '★ mejor' : (delta>0?'+':'')+delta.toFixed(3)+'s'}
              </span>
              <span style={{fontSize:9,color:'#2e3d55'}}>{lap.rows.length} pts</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Analysis Page ────────────────────────────────────────────────────────
export default function Analysis() {
  const [files, setFiles]         = useState([])   // { name, meta, laps }
  const [selectedNums, setSelNums] = useState([])
  const [dragging, setDragging]   = useState(false)
  const [activeFile, setActiveFile] = useState(0)
  const fileInputRef = useRef(null)

  const processFile = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = parseACCSV(e.target.result)
      if (!result || !result.laps.length) {
        alert(`No se pudo leer el archivo: ${file.name}`)
        return
      }
      setFiles(prev => {
        // Máximo 2 archivos a la vez
        const next = [...prev.slice(-1), { name: file.name, ...result }]
        return next
      })
      setSelNums([])
      setActiveFile(0)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.csv'))
      .forEach(processFile)
  }, [processFile])

  const handleFile = (e) => {
    Array.from(e.target.files).forEach(processFile)
    e.target.value = ''
  }

  const toggleLap = (lapNum) => {
    setSelNums(prev => {
      if (prev.includes(lapNum)) return prev.filter(n => n !== lapNum)
      if (prev.length >= 4) return prev
      return [...prev, lapNum]
    })
  }

  const currentFile = files[activeFile]
  const allLaps     = currentFile?.laps || []
  const selectedLaps = selectedNums.map(n => allLaps.find(l => l.lapNum === n)).filter(Boolean)

  return (
    <div style={{display:'grid',gridTemplateColumns:'260px 1fr',height:'100%',background:'var(--bg0, #07090d)'}}>
      
      {/* ── Panel izquierdo ─────────────────────────── */}
      <div style={{background:'#0c1018',borderRight:'1px solid #1c2535',padding:16,
        overflow:'auto',display:'flex',flexDirection:'column',gap:12}}>
        
        <div>
          <div style={{fontSize:9,fontWeight:600,textTransform:'uppercase',
            letterSpacing:'.1em',color:'#2e3d55',marginBottom:8}}>Análisis MoTeC</div>
          
          {/* Drop zone */}
          <div onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border:`2px dashed ${dragging?'#00c8f0':'#1c2535'}`,
              borderRadius:8,padding:16,textAlign:'center',cursor:'pointer',
              background:dragging?'#00c8f008':'transparent',transition:'all .15s',
              marginBottom:8
            }}>
            <div style={{fontSize:20,marginBottom:6}}>📂</div>
            <div style={{fontSize:11,color:'#6b7d99'}}>Arrastrá CSV o hacé clic</div>
            <div style={{fontSize:9,color:'#2e3d55',marginTop:2}}>AC pyTelemetry / SimHub</div>
            <input ref={fileInputRef} type="file" accept=".csv" multiple
              style={{display:'none'}} onChange={handleFile} />
          </div>

          {/* Archivos cargados */}
          {files.map((f, i) => (
            <div key={i} onClick={() => { setActiveFile(i); setSelNums([]) }}
              style={{
                padding:'6px 10px',borderRadius:6,cursor:'pointer',marginBottom:4,
                background: activeFile===i ? '#00c8f018' : '#07090d',
                border: `1px solid ${activeFile===i ? '#00c8f044' : '#1c2535'}`
              }}>
              <div style={{fontSize:10,color:'#dce6f5',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {f.meta.Driver || 'Piloto'} — {f.meta.Venue?.slice(0,20)}
              </div>
              <div style={{fontSize:9,color:'#6b7d99',marginTop:2}}>
                {f.meta['Log Date']} · {f.laps.length} vueltas
              </div>
            </div>
          ))}
        </div>

        {/* Tabla de vueltas */}
        {allLaps.length > 0 && (
          <LapTable laps={allLaps} selectedNums={selectedNums} onToggle={toggleLap} />
        )}

        {/* Stats de vueltas seleccionadas */}
        {selectedLaps.length > 0 && (
          <div style={{background:'#07090d',borderRadius:8,padding:10}}>
            <div style={{fontSize:9,color:'#2e3d55',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>
              Comparativa
            </div>
            {selectedLaps.map((lap, i) => {
              const speeds = lap.rows.map(r => r.speed).filter(v => v !== null)
              const maxS = Math.max(...speeds).toFixed(1)
              const avgS = (speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(1)
              const fuels = lap.rows.map(r => r.fuel).filter(v => v !== null)
              const fuelUsed = fuels.length > 1 ? (fuels[0] - fuels[fuels.length-1]).toFixed(2) : '—'
              return (
                <div key={i} style={{marginBottom:8,paddingBottom:8,
                  borderBottom: i < selectedLaps.length-1 ? '1px solid #1c2535' : 'none'}}>
                  <div style={{fontSize:11,color:COLORS[i],fontWeight:600,marginBottom:4}}>
                    V{lap.lapNum} — {fmtTime(lap.lapTime)}
                  </div>
                  <div style={{fontSize:10,color:'#6b7d99',display:'grid',gridTemplateColumns:'1fr 1fr',gap:2}}>
                    <span>Vel max:</span><span style={{fontFamily:'JetBrains Mono',color:'#dce6f5'}}>{maxS} km/h</span>
                    <span>Vel prom:</span><span style={{fontFamily:'JetBrains Mono',color:'#dce6f5'}}>{avgS} km/h</span>
                    <span>Combustible:</span><span style={{fontFamily:'JetBrains Mono',color:'#dce6f5'}}>{fuelUsed} L</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Panel derecho: gráficos ──────────────────── */}
      <div style={{overflow:'auto',padding:16}}>
        {selectedLaps.length === 0 ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',
            height:'100%',flexDirection:'column',gap:12,color:'#2e3d55'}}>
            <div style={{fontSize:40}}>📊</div>
            <div style={{fontSize:14}}>
              {allLaps.length > 0 ? 'Seleccioná una o más vueltas para ver el análisis' : 'Subí un CSV para empezar'}
            </div>
            <div style={{fontSize:11,color:'#1c2535'}}>
              Soporta archivos de AC pyTelemetry, SimHub, MoTeC i2
            </div>
          </div>
        ) : (
          <>
            <DeltaChart selectedLaps={selectedLaps} />
            <ChartRow title="Velocidad"       dataKey="speed"    selectedLaps={selectedLaps} unit="km/h"  yDomain={[0,'auto']} />
            <ChartRow title="Acelerador"      dataKey="throttle" selectedLaps={selectedLaps} unit="%"     yDomain={[0,100]} />
            <ChartRow title="Freno"           dataKey="brake"    selectedLaps={selectedLaps} unit="%"     yDomain={[0,100]} />
            <ChartRow title="Marchas"         dataKey="gear"     selectedLaps={selectedLaps} unit=""      yDomain={[0,9]} height={80} />
            <ChartRow title="RPM Motor"       dataKey="rpm"      selectedLaps={selectedLaps} unit="rpm"   yDomain={[0,'auto']} />
            <ChartRow title="G Lateral"       dataKey="glat"     selectedLaps={selectedLaps} unit="G" />
            <ChartRow title="G Longitudinal"  dataKey="glon"     selectedLaps={selectedLaps} unit="G" />
            <ChartRow title="Ángulo volante"  dataKey="steer"    selectedLaps={selectedLaps} unit="°" />
            <ChartRow title="Combustible"     dataKey="fuel"     selectedLaps={selectedLaps} unit="L"     yDomain={['auto','auto']} />
          </>
        )}
      </div>
    </div>
  )
}
