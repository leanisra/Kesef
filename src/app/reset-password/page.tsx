'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/lib/ThemeToggle'

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
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px', width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, textAlign: 'center' }}>KESEF</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>Nueva contraseña</p>

        {!ready ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14 }}>Verificando enlace...</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 40px 10px 12px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Confirmá la contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            {error && <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>}

            <button onClick={handleReset} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
