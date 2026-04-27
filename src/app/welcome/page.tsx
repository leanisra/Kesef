'use client'
import Link from 'next/link'

export default function WelcomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#D4A843', marginBottom: 12 }}>Bienvenido a KESEF</h1>
        <p style={{ color: '#8A96AA', fontSize: 16, lineHeight: 1.7, marginBottom: 12 }}>
          Tu cuenta fue creada. Tenes 10 dias de prueba gratuita para explorar todas las funcionalidades.
        </p>
        <p style={{ color: '#556070', fontSize: 14, marginBottom: 36 }}>
          Revisa tu email para confirmar tu cuenta y luego ingresa al sistema.
        </p>
        <Link href="/login" style={{ background: '#D4A843', color: '#0E1117', borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
          Ir al login
        </Link>
      </div>
    </main>
  )
}