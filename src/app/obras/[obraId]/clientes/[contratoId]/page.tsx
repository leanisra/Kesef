import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ClientePageClient from './ClientePageClient'
import { ThemeToggle } from '@/lib/ThemeToggle'

export default async function ClientePage({ params }: { params: { obraId: string, contratoId: string } }) {
  const { obraId, contratoId } = await params

  const { data: obra } = await supabase.from('obras').select('nombre').eq('id', obraId).single()

  const { data: contrato } = await supabase
    .from('contratos')
    .select(`
      *,
      clientes ( nombre, telefono, email ),
      contratos_unidades ( unidades ( codigo, tipo, piso ) )
    `)
    .eq('id', contratoId)
    .single()

  const { data: cuotas } = await supabase
    .from('cuotas')
    .select('*')
    .eq('contrato_id', contratoId)
    .order('n_cuota')

  if (!contrato) return <div style={{ color: 'var(--text-primary)', padding: 40 }}>Contrato no encontrado</div>

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a {obra?.nombre}
          </Link>
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
              {contrato.clientes?.nombre}
            </h1>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Unidades: {contrato.contratos_unidades?.map((cu: any) => cu.unidades?.codigo).join(', ')} ·
              Tel: {contrato.clientes?.telefono}
            </div>
          </div>
          <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
            {contrato.estado}
          </span>
        </div>

        <ClientePageClient cuotas={cuotas || []} contrato={contrato} />

      </div>
    </main>
  )
}
