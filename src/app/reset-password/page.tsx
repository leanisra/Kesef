'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleReset = async () => {
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Error al actualizar la contraseña')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 16, padding: '40px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#D4A843', marginBottom: 8, textAlign: 'center' }}>KESEF</h1>
        <p style={{ color: '#556070', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>Nueva contraseña</p>

        {!ready ? (
          <p style={{ color: '#8A96AA', textAlign: 'center', fontSize: 14 }}>Verificando enlace...</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 40px 10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#556070', fontSize: 16 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#8A96AA', display: 'block', marginBottom: 6 }}>Confirmá la contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={{ width: '100%', background: '#0E1117', border: '1px solid #252D3D', borderRadius: 8, padding: '10px 12px', color: '#E8EDF5', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}

            <button onClick={handleReset} disabled={loading} style={{ width: '100%', background: '#D4A843', color: '#0E1117', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}