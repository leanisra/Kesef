'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/lib/ThemeToggle'

type MfaStep = 'idle' | 'enrolling' | 'verifying' | 'success'

export default function PerfilPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mfaActivo, setMfaActivo] = useState(false)
  const [step, setStep] = useState<MfaStep>('idle')
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')

      const { data } = await supabase.auth.mfa.listFactors()
      const activo = (data?.totp ?? []).some(f => f.status === 'verified')
      setMfaActivo(activo)
    }
    cargar()
  }, [router])

  const activarMfa = async () => {
    setError('')
    setCargando(true)
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setCargando(false)
    if (err || !data) { setError(err?.message ?? 'Error al generar QR'); return }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setStep('enrolling')
  }

  const verificar = async () => {
    if (codigo.length !== 6) { setError('Ingresá los 6 dígitos del código'); return }
    setError('')
    setCargando(true)

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
    if (chErr || !ch) { setCargando(false); setError(chErr?.message ?? 'Error al generar desafío'); return }
    setChallengeId(ch.id)

    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: codigo })
    setCargando(false)
    if (vErr) { setError('Código incorrecto. Revisá el código en Google Authenticator.'); return }

    setStep('success')
    setMfaActivo(true)
  }

  const inp: React.CSSProperties = {
    background: 'var(--input-bg)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: 20, letterSpacing: 6, textAlign: 'center', outline: 'none',
    width: '100%', fontFamily: 'monospace',
  }

  const btn = (accent = false): React.CSSProperties => ({
    background: accent ? 'var(--accent)' : 'transparent',
    color: accent ? 'var(--accent-contrast)' : 'var(--text-secondary)',
    border: accent ? 'none' : '1px solid var(--border)',
    borderRadius: 8, padding: '10px 22px', fontSize: 14,
    fontWeight: 600, cursor: cargando ? 'not-allowed' : 'pointer',
    opacity: cargando ? 0.6 : 1, fontFamily: 'system-ui',
  })

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Volver</Link>
          <ThemeToggle />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 28 }}>Mi perfil</h1>

        {/* Datos de cuenta */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cuenta</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{email || '—'}</div>
        </div>

        {/* MFA */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Autenticación de dos factores</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {mfaActivo ? 'MFA activado en esta cuenta.' : 'Añadí una capa extra de seguridad con Google Authenticator.'}
              </div>
            </div>
            {mfaActivo && step !== 'success' && (
              <span style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                Activo
              </span>
            )}
          </div>

          {/* Estado: idle y MFA no activo → botón activar */}
          {step === 'idle' && !mfaActivo && (
            <button onClick={activarMfa} style={btn(true)} disabled={cargando}>
              {cargando ? 'Generando...' : 'Activar MFA'}
            </button>
          )}

          {/* Estado: enrolling → mostrar QR */}
          {step === 'enrolling' && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Escaneá este QR con Google Authenticator y luego ingresá el código de 6 dígitos.
              </div>

              {/* QR code */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}
                  dangerouslySetInnerHTML={{ __html: qrCode }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Código de verificación
                </label>
                <input
                  style={inp}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verificar()}
                />
              </div>

              {error && (
                <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep('idle'); setError(''); setCodigo('') }} style={btn(false)}>
                  Cancelar
                </button>
                <button onClick={verificar} style={btn(true)} disabled={cargando || codigo.length !== 6}>
                  {cargando ? 'Verificando...' : 'Verificar y activar'}
                </button>
              </div>
            </div>
          )}

          {/* Estado: success */}
          {step === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--success-bg)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
                MFA activado correctamente. Tu cuenta ahora está protegida.
              </span>
            </div>
          )}

          {/* Ya activo desde antes */}
          {step === 'idle' && mfaActivo && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Usá Google Authenticator para obtener tu código al iniciar sesión.
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
