'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 16, padding: '40px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#D4A843', marginBottom: 8, textAlign: 'center' }}>KESEF</h1>
        <p style={{ color: '#556070', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>Sistema de administración de obras</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', background: '#D4A843', color: '#0E1117', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </main>
  )
}