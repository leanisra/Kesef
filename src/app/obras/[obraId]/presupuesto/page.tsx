import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ThemeToggle } from '@/lib/ThemeToggle'
import PresupuestoClient from './PresupuestoClient'

export default async function PresupuestoPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: obra } = await supabase.from('obras').select('nombre').eq('id', obraId).single()

  const { data: rubros } = await supabase
    .from('presupuesto_rubros')
    .select('*')
    .eq('obra_id', obraId)
    .order('orden')

  const { data: items } = await supabase
    .from('presupuesto_items')
    .select('*')
    .eq('obra_id', obraId)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a {obra?.nombre}
          </Link>
          <ThemeToggle />
        </div>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>📋 Presupuesto</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Rubros y seguimiento de ejecución · {obra?.nombre}</p>
        </div>
        <PresupuestoClient
          rubrosIniciales={rubros || []}
          itemsIniciales={items || []}
          obraId={obraId}
        />
      </div>
    </main>
  )
}
