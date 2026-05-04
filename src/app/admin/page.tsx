import { supabaseAdmin } from '@/lib/supabase'
import { ThemeToggle } from '@/lib/ThemeToggle'
import Link from 'next/link'
import AdminClient from './AdminClient'

export const revalidate = 0

export default async function AdminPage() {
  // Fetch everything with service role (bypass RLS)
  const [
    { data: profiles },
    { data: suscripciones },
    { data: planes },
    { data: orgs },
    { data: whitelist },
    { data: pagos },
  ] = await Promise.all([
    supabaseAdmin.from('user_profiles')
      .select('*, organizaciones(nombre, email_owner)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('suscripciones')
      .select('*, planes(nombre, precio_usd, max_usuarios, max_obras)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('planes').select('*').eq('activo', true).order('precio_usd'),
    supabaseAdmin.from('organizaciones').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('whitelist_admin').select('*').order('created_at'),
    supabaseAdmin.from('suscripcion_pagos')
      .select('*').order('fecha', { ascending: false }).limit(50),
  ])

  // Construir lista enriquecida por organización
  const datos = (orgs || []).map(org => {
    const sub = (suscripciones || []).find(s => s.organizacion_id === org.id)
    const miembros = (profiles || []).filter(p => p.organizacion_id === org.id)
    const pagosDeSub = sub ? (pagos || []).filter(p => p.suscripcion_id === sub.id) : []
    const owner = miembros.find(m => m.rol === 'owner') || miembros[0]

    const ahora = new Date()
    let diasTrial: number | null = null
    if (sub?.estado === 'trial' && sub.fecha_fin_trial) {
      diasTrial = Math.ceil((new Date(sub.fecha_fin_trial).getTime() - ahora.getTime()) / 86400000)
    }

    return { org, sub, miembros, owner, pagosDeSub, diasTrial, plan: sub?.planes }
  })

  const totalUsuarios  = (profiles || []).length
  const totalActivos   = datos.filter(d => ['activa', 'trial'].includes(d.sub?.estado || '')).length
  const totalPagando   = datos.filter(d => d.sub?.estado === 'activa').length
  const totalTrial     = datos.filter(d => d.sub?.estado === 'trial').length
  const totalSuspendidos = datos.filter(d => ['suspendida', 'cancelada'].includes(d.sub?.estado || '')).length

  const mrr = datos
    .filter(d => d.sub?.estado === 'activa')
    .reduce((a, d) => a + (d.sub?.precio_final_usd || d.plan?.precio_usd || 0), 0)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Volver</Link>
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>⚙️ Panel de administración</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sólo visible para el equipo KESEF</p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'MRR', valor: `USD ${mrr}`, color: '#4ADE80' },
            { label: 'Cuentas', valor: datos.length, color: 'var(--text-primary)' },
            { label: 'Usuarios', valor: totalUsuarios, color: '#60A5FA' },
            { label: 'Pagando', valor: totalPagando, color: '#4ADE80' },
            { label: 'Trial', valor: totalTrial, color: '#F59E0B' },
            { label: 'Suspendidos', valor: totalSuspendidos, color: '#F87171' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
            </div>
          ))}
        </div>

        <AdminClient
          datos={datos}
          planes={planes || []}
          whitelist={whitelist || []}
          pagos={pagos || []}
        />
      </div>
    </main>
  )
}
