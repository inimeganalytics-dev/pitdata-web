import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/store'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import SessionDetail from './pages/SessionDetail'
import Layout from './components/Layout'

export default function App() {
  const { user, loading, init } = useAuth()
  useEffect(() => { init() }, [])
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#6b7d99',fontFamily:'JetBrains Mono'}}>Cargando...</div>
  return (
    <Routes>
      <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
      <Route element={user ? <Layout /> : <Navigate to="/auth" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:id" element={<SessionDetail />} />
      </Route>
    </Routes>
  )
}
