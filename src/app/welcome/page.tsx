'use client'
import Link from 'next/link'
import { ThemeToggle } from '@/lib/ThemeToggle'

export default function WelcomePage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>Bienvenido a KESEF</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 12 }}>
          Tu cuenta fue creada. Tenes 10 dias de prueba gratuita para explorar todas las funcionalidades.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 36 }}>
          Revisa tu email para confirmar tu cuenta y luego ingresa al sistema.
        </p>
        <Link href="/login" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
          Ir al login
        </Link>
      </div>
    </main>
  )
}
