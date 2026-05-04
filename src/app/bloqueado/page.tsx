'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

const MENSAJES: Record<string, { titulo: string; texto: string; cta: string }> = {
  trial: {
    titulo: 'Tu período de prueba ha finalizado',
    texto: 'Los 10 días gratuitos de KESEF han vencido. Elegí un plan para continuar administrando tus obras sin interrupciones.',
    cta: 'Ver planes y suscribirme',
  },
  pago: {
    titulo: 'Tu suscripción está suspendida',
    texto: 'Hubo un problema con el cobro de tu plan. Actualizá tu método de pago para reactivar el acceso a KESEF.',
    cta: 'Regularizar pago',
  },
  bloqueado: {
    titulo: 'Cuenta suspendida',
    texto: 'Tu cuenta fue suspendida por un administrador. Contactate con soporte para resolver la situación.',
    cta: 'Contactar soporte',
  },
}

function BloqueadoContent() {
  const params = useSearchParams()
  const razon = params.get('razon') || 'trial'
  const info = MENSAJES[razon] || MENSAJES.trial

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

        <div style={{ fontSize: 64, marginBottom: 20 }}>
          {razon === 'bloqueado' ? '🔒' : razon === 'pago' ? '💳' : '⏰'}
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>KESEF</div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 40 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{info.titulo}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 }}>{info.texto}</p>

          {razon !== 'bloqueado' && (
            <Link href="/planes" style={{
              display: 'block', background: 'var(--accent)', color: 'var(--accent-contrast)',
              borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 700,
              textDecoration: 'none', marginBottom: 16,
            }}>
              {info.cta}
            </Link>
          )}

          <a href="mailto:leandroisrael@gmail.com" style={{
            display: 'block', color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none',
          }}>
            ¿Necesitás ayuda? Escribinos →
          </a>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
          <a onClick={() => { supabase.auth.signOut().then(() => { window.location.href = '/login' }) }}
            style={{ cursor: 'pointer', color: 'var(--text-muted)', textDecoration: 'underline' }}>
            Cerrar sesión
          </a>
        </p>
      </div>
    </main>
  )
}

export default function BloqueadoPage() {
  return (
    <Suspense fallback={<div />}>
      <BloqueadoContent />
    </Suspense>
  )
}
