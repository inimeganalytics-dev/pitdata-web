import React, { useState, useCallback, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null
  
  // Detectar separador
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g,'').toLowerCase())
  
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/"/g,''))
    if (vals.length < 3) continue
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = parseFloat(vals[idx]) || vals[idx]
    })
    rows.push(row)
  }
  return { headers, rows }
}

// Mapear columnas comunes de diferentes exportadores
function mapColumns(headers) {
  const find = (...names) => headers.find(h => names.some(n => h.includes(n))) || null
  return {
    dist:     find('dist', 'distance', 'pos', 'position', 'norm'),
    time:     find('time', 'tiempo', 't'),
    speed:    find('speed', 'velocidad', 'vel', 'spd', 'kmh', 'km/h'),
    throttle: find('throttle', 'gas', 'aceler', 'thr', 'acc'),
    brake:    find('brake', 'freno', 'brk', 'braking'),
    gear:     find('gear', 'marcha', 'gr'),
    rpm:      find('rpm', 'revs'),
    glat:     find('glat', 'g_lat', 'lateral_g', 'lat_g', 'lat'),
    steering: find('steer', 'volante', 'str'),
  }
}

// Colores por vuelta
const COLORS = ['#00c8f0', '#00e676', '#ffd600', '#ff8c42', '#b388ff', '#ff3351']

// ── Chart Component ───────────────────────────────────────────────────────────
function LapChart({ title, dataKey, laps, yDomain, yLabel, color, height = 140 }) {
  const allPoints = laps.flatMap((lap, li) =>
    lap.rows.map(row => ({ ...row, _lap: li }))
  )

  return (
    <div style={{background:'#0c1018',border:'1px solid #1c2535',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
      <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.1em',color:'#2e3d55',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
        {title}
        {laps.map((l,i) => (
          <span key={i} style={{display:'flex',alignItems:'center',gap:4}}>
            <span style={{width:12,height:2,background:COLORS[i],borderRadius:1,display:'inline-block'}} />
            <span style={{color:COLORS[i],fontSize:9}}>{l.name}</span>
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart margin={{top:0,right:8,bottom:0,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
          <XAxis dataKey="dist" type="number" domain={['auto','auto']}
            tickFormatter={v => `${v.toFixed(0)}m`}
            tick={{fontSize:8,fill:'#2e3d55'}} />
          <YAxis domain={yDomain || ['auto','auto']}
            tick={{fontSize:8,fill:'#2e3d55'}}
            label={yLabel?{value:yLabel,angle:-90,position:'insideLeft',style:{fontSize:8,fill:'#2e3d55'}}:null} />
          <Tooltip
            contentStyle={{background:'#0c1018',border:'1px solid #1c2535',fontSize:10}}
            labelFormatter={v => `Dist: ${parseFloat(v).toFixed(0)}m`} />
          {laps.map((lap, i) => (
            <Line key={i} data={lap.rows} type="monotone" dataKey={dataKey}
              stroke={COLORS[i]} dot={false} strokeWidth={1.5}
              name={lap.name} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Delta Chart ───────────────────────────────────────────────────────────────
function DeltaChart({ laps }) {
  if (laps.length < 2) return null
  const ref = laps[0]
  
  const deltas = laps.slice(1).map((lap, li) => {
    return lap.rows.map(row => {
      const refRow = ref.rows.find(r => Math.abs(r.dist - row.dist) < 5)
      const delta  = refRow ? (row.time - refRow.time) : null
      return { dist: row.dist, delta, _lap: li + 1 }
    }).filter(r => r.delta !== null)
  })

  return (
    <div style={{background:'#0c1018',border:'1px solid #1c2535',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
      <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.1em',color:'#2e3d55',marginBottom:8}}>
        Delta de tiempo (vs {laps[0].name})
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart margin={{top:0,right:8,bottom:0,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
          <XAxis dataKey="dist" type="number" domain={['auto','auto']}
            tickFormatter={v => `${v.toFixed(0)}m`} tick={{fontSize:8,fill:'#2e3d55'}} />
          <YAxis tick={{fontSize:8,fill:'#2e3d55'}} tickFormatter={v => `${v.toFixed(1)}s`} />
          <ReferenceLine y={0} stroke="#1c2535" strokeDasharray="4 4" />
          <Tooltip contentStyle={{background:'#0c1018',border:'1px solid #1c2535',fontSize:10}}
            formatter={v => [`${v?.toFixed(3)}s`]} />
          {laps.slice(1).map((lap, i) => (
            <Line key={i} data={deltas[i]} type="monotone" dataKey="delta"
              stroke={COLORS[i+1]} dot={false} strokeWidth={1.5} name={lap.name} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Analysis Page ─────────────────────────────────────────────────────────────
export default function Analysis() {
  const [laps, setLaps]         = useState([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef            = useRef(null)

  const processFile = useCallback((file, name) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result)
      if (!parsed) { alert('Error al leer el CSV'); return }
      
      const cols = mapColumns(parsed.headers)
      console.log('Columnas detectadas:', cols)
      
      // Normalizar los datos
      const rows = parsed.rows.map((row, i) => {
        const dist = cols.dist ? (parseFloat(row[cols.dist]) || i) : i
        const normDist = dist <= 1 ? dist * 10000 : dist // Si es 0-1, escalar a metros estimados
        return {
          dist:     normDist,
          time:     cols.time     ? (parseFloat(row[cols.time]) || 0) : i * 0.1,
          speed:    cols.speed    ? (parseFloat(row[cols.speed]) || 0) : 0,
          throttle: cols.throttle ? (parseFloat(row[cols.throttle]) || 0) : 0,
          brake:    cols.brake    ? (parseFloat(row[cols.brake]) || 0) : 0,
          gear:     cols.gear     ? (parseFloat(row[cols.gear]) || 0) : 0,
          rpm:      cols.rpm      ? (parseFloat(row[cols.rpm]) || 0) : 0,
          glat:     cols.glat     ? (parseFloat(row[cols.glat]) || 0) : 0,
          steering: cols.steering ? (parseFloat(row[cols.steering]) || 0) : 0,
        }
      }).filter(r => !isNaN(r.dist))

      // Ordenar por distancia
      rows.sort((a, b) => a.dist - b.dist)
      
      const lapName = name.replace('.csv','').replace('.CSV','')
      setLaps(prev => [...prev.slice(-3), { name: lapName, rows, headers: parsed.headers, cols }])
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files)
      .filter(f => f.name.toLowerCase().endsWith('.csv'))
      .forEach(f => processFile(f, f.name))
  }, [processFile])

  const handleFile = (e) => {
    Array.from(e.target.files).forEach(f => processFile(f, f.name))
    e.target.value = ''
  }

  const removeLap = (i) => setLaps(prev => prev.filter((_, idx) => idx !== i))

  const hasSpeed    = laps.some(l => l.rows.some(r => r.speed > 0))
  const hasThrottle = laps.some(l => l.rows.some(r => r.throttle > 0))
  const hasBrake    = laps.some(l => l.rows.some(r => r.brake > 0))
  const hasGear     = laps.some(l => l.rows.some(r => r.gear > 0))
  const hasRPM      = laps.some(l => l.rows.some(r => r.rpm > 0))
  const hasGlat     = laps.some(l => l.rows.some(r => r.glat !== 0))

  return (
    <div style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
      <div style={{fontSize:20,fontWeight:600,color:'#dce6f5',marginBottom:4}}>Análisis MoTeC</div>
      <div style={{fontSize:12,color:'#6b7d99',marginBottom:20}}>Subí hasta 4 vueltas en CSV para comparar</div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#00c8f0' : '#1c2535'}`,
          borderRadius:10, padding:'24px 0', textAlign:'center', cursor:'pointer',
          background: dragging ? '#00c8f008' : 'transparent',
          marginBottom:16, transition:'all .15s'
        }}>
        <div style={{fontSize:24,marginBottom:8}}>📂</div>
        <div style={{fontSize:13,color:'#6b7d99'}}>Arrastrá CSVs acá o hacé clic para seleccionar</div>
        <div style={{fontSize:11,color:'#2e3d55',marginTop:4}}>Soporta exportaciones de AC, MoTeC, SimHub, i2, etc.</div>
        <input ref={fileInputRef} type="file" accept=".csv" multiple
          style={{display:'none'}} onChange={handleFile} />
      </div>

      {/* Laps cargadas */}
      {laps.length > 0 && (
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
          {laps.map((lap, i) => (
            <div key={i} style={{
              display:'flex',alignItems:'center',gap:8,
              background:'#0c1018',border:`1px solid ${COLORS[i]}44`,
              borderRadius:20,padding:'4px 12px'
            }}>
              <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[i]}} />
              <span style={{fontSize:12,color:'#dce6f5'}}>{lap.name}</span>
              <span style={{fontSize:10,color:'#6b7d99'}}>{lap.rows.length} puntos</span>
              <button onClick={() => removeLap(i)} style={{
                background:'none',border:'none',color:'#2e3d55',cursor:'pointer',
                fontSize:14,lineHeight:1,padding:0,marginLeft:2
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Gráficos */}
      {laps.length > 0 && (
        <div>
          <DeltaChart laps={laps} />
          {hasSpeed    && <LapChart title="Velocidad (km/h)" dataKey="speed"    laps={laps} yDomain={[0,'auto']} />}
          {hasThrottle && <LapChart title="Acelerador (%)"   dataKey="throttle" laps={laps} yDomain={[0,100]} />}
          {hasBrake    && <LapChart title="Freno (%)"        dataKey="brake"    laps={laps} yDomain={[0,100]} />}
          {hasGear     && <LapChart title="Marchas"          dataKey="gear"     laps={laps} yDomain={[0,8]} height={80} />}
          {hasRPM      && <LapChart title="RPM"              dataKey="rpm"      laps={laps} yDomain={[0,'auto']} />}
          {hasGlat     && <LapChart title="G lateral"        dataKey="glat"     laps={laps} />}
        </div>
      )}

      {laps.length === 0 && (
        <div style={{textAlign:'center',padding:'40px 0',color:'#2e3d55',fontSize:13}}>
          Subí un CSV de vuelta para ver el análisis
        </div>
      )}
    </div>
  )
}
