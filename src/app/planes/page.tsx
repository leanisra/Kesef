import { supabaseAdmin } from '@/lib/supabase'
import PlanesClient from './PlanesClient'
import { ThemeToggle } from '@/lib/ThemeToggle'
import Link from 'next/link'

export const revalidate = 0

export default async function PlanesPage() {
  const [{ data: planes }, { data: suscripcion }] = await Promise.all([
    supabaseAdmin.from('planes').select('*').eq('activo', true).neq('nombre', 'Trial').order('precio_usd'),
    // suscripcion se carga en el cliente con el auth del usuario
    Promise.resolve({ data: null }),
  ])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Volver</Link>
          <ThemeToggle />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', letterSpacing: 2, marginBottom: 12 }}>KESEF</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Elegí tu plan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Suscribite con MercadoPago · Sin permanencia · Cancelá cuando quieras</p>
        </div>

        <PlanesClient planes={planes || []} />
      </div>
    </main>
  )
}
