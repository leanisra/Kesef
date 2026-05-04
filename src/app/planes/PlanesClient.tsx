'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Plan {
  id: string
  nombre: string
  precio_usd: number
  precio_ars: number | null
  max_usuarios: number | null
  max_obras: number | null
  descripcion: string | null
}

interface Suscripcion {
  id: string
  plan_id: string | null
  estado: string
  fecha_fin_trial: string | null
}

const FEATURES: Record<string, string[]> = {
  Starter: ['3 obras activas', '5 usuarios', 'Caja y movimientos', 'Presupuesto y órdenes', 'Clientes y cuotas', 'Soporte por email'],
  Pro:     ['10 obras activas', '15 usuarios', 'Todo lo de Starter', 'Importador bancario OFX/CSV', 'Panel multi-obra', 'Soporte prioritario'],
  Premium: ['Obras ilimitadas', 'Usuarios ilimitados', 'Todo lo de Pro', 'Panel de administración', 'Onboarding personalizado', 'Soporte directo por WhatsApp'],
}

export default function PlanesClient({ planes }: { planes: Plan[] }) {
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organizacion_id')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.organizacion_id) return
      const { data: sub } = await supabase
        .from('suscripciones')
        .select('id, plan_id, estado, fecha_fin_trial')
        .eq('organizacion_id', profile.organizacion_id)
        .maybeSingle()
      setSuscripcion(sub)
    }
    cargar()
  }, [])

  const suscribirse = async (planId: string) => {
    setLoading(planId)
    setError('')
    setSuccess('')
    const res = await fetch('/api/mp/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (data.init_point) {
      window.location.href = data.init_point
    } else {
      setError(data.error || 'Error al iniciar el pago')
      setLoading(null)
    }
  }

  const diasTrial = () => {
    if (!suscripcion?.fecha_fin_trial) return null
    const d = Math.ceil((new Date(suscripcion.fecha_fin_trial).getTime() - Date.now()) / 86400000)
    return d > 0 ? d : 0
  }

  return (
    <div>
      {suscripcion?.estado === 'trial' && (
        <div style={{ background: '#F59E0B22', border: '1px solid #F59E0B', borderRadius: 10, padding: '14px 20px', marginBottom: 32, textAlign: 'center', fontSize: 14, color: '#F59E0B' }}>
          Estás en el período de prueba · {diasTrial()} día{diasTrial() !== 1 ? 's' : ''} restante{diasTrial() !== 1 ? 's' : ''}
        </div>
      )}
      {suscripcion?.estado === 'activa' && (
        <div style={{ background: '#4ADE8022', border: '1px solid #4ADE80', borderRadius: 10, padding: '14px 20px', marginBottom: 32, textAlign: 'center', fontSize: 14, color: '#4ADE80' }}>
          Tu suscripción está activa. Podés cambiar de plan en cualquier momento.
        </div>
      )}

      {error && <p style={{ color: 'var(--error)', textAlign: 'center', marginBottom: 16 }}>{error}</p>}
      {success && <p style={{ color: '#4ADE80', textAlign: 'center', marginBottom: 16 }}>{success}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        {planes.map((plan, i) => {
          const esActual = suscripcion?.plan_id === plan.id && suscripcion?.estado === 'activa'
          const esPro = plan.nombre === 'Pro'
          return (
            <div key={plan.id} style={{
              background: 'var(--bg-card)',
              border: esPro ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 16,
              padding: '32px 28px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {esPro && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 1 }}>
                  MÁS POPULAR
                </div>
              )}
              <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{plan.nombre}</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>
                USD {plan.precio_usd}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>/mes</span>
              </div>
              {plan.precio_ars && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                  ≈ ARS {plan.precio_ars.toLocaleString('es-AR')} /mes
                </div>
              )}
              {!plan.precio_ars && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Precio ARS próximamente</div>
              )}

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', flex: 1 }}>
                {(FEATURES[plan.nombre] || []).map(f => (
                  <li key={f} style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#4ADE80', flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              {esActual ? (
                <div style={{ background: '#4ADE8022', border: '1px solid #4ADE80', borderRadius: 8, padding: '11px', textAlign: 'center', fontSize: 14, color: '#4ADE80', fontWeight: 600 }}>
                  Plan actual
                </div>
              ) : (
                <button
                  onClick={() => suscribirse(plan.id)}
                  disabled={loading === plan.id || !plan.precio_ars}
                  style={{
                    background: esPro ? 'var(--accent)' : 'var(--bg-main)',
                    color: esPro ? 'var(--accent-contrast)' : 'var(--text-primary)',
                    border: esPro ? 'none' : '1px solid var(--border)',
                    borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700,
                    cursor: (loading === plan.id || !plan.precio_ars) ? 'not-allowed' : 'pointer',
                    opacity: (loading === plan.id || !plan.precio_ars) ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading === plan.id ? 'Redirigiendo...' : !plan.precio_ars ? 'Próximamente' : 'Suscribirme →'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)', fontSize: 13 }}>
        <p>El pago se procesa a través de MercadoPago de forma segura.</p>
        <p style={{ marginTop: 4 }}>¿Preguntas? <a href="mailto:leandroisrael@gmail.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Contactanos →</a></p>
      </div>
    </div>
  )
}
