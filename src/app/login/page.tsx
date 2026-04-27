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
  const [showPassword, setShowPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

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

  const handleForgot = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError('Error al enviar el email. Verificá que el email sea correcto.')
    } else {
      setForgotSent(true)
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 16, padding: '40px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#D4A843', marginBottom: 8, textAlign: 'center' }}>KESEF</h1>
        <p style={{ color: '#556070', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>Sistema de administración de obras</p>

        {forgotSent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
            <p style={{ color: '#4ADE80', fontSize: 14, marginBottom: 24 }}>Te enviamos un email para restablecer tu contraseña.</p>
            <button onClick={() => { setForgotMode(false); setForgotSent(false) }} style={{ color: '#D4A843', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Volver al login
            </button>
          </div>
        ) : forgotMode ? (
          <>
            <p style={{ color: '#8A96AA', fontSize: 13, marginBottom: 20 }}>Ingresá tu email y te enviamos un link para restablecer tu contraseña.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}
            <button onClick={handleForgot} disabled={loading} style={{ width: '100%', background: '#D4A843', color: '#0E1117', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <button onClick={() => setForgotMode(false)} style={{ width: '100%', background: 'none', color: '#556070', border: 'none', cursor: 'pointer', fontSize: 13 }}>
              Volver al login
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 40px 10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#556070', fontSize: 16 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <button onClick={() => setForgotMode(true)} style={{ background: 'none', border: 'none', color: '#556070', fontSize: 12, cursor: 'pointer' }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading} style={{ width: '100%', background: '#D4A843', color: '#0E1117', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}