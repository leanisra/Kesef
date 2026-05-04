'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Esta página se muestra brevemente cuando un usuario registra su cuenta
// y aún no tiene perfil en la BD. El proceso real lo hace la API route.
export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Intentar setup via API
      const res = await fetch('/api/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          nombre: user.user_metadata?.nombre || '',
          empresa: user.user_metadata?.empresa || '',
        }),
      })

      if (res.ok) {
        router.push('/')
      } else {
        // Si falla, intentar ir igual (las tablas pueden no existir aún)
        router.push('/')
      }
    }
    setup()
  }, [router])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>KESEF</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Configurando tu cuenta...</div>
      </div>
    </main>
  )
}
