import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ClientePageClient from './ClientePageClient'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export default async function ClientePage({ params }: { params: { obraId: string, contratoId: string } }) {
  const { obraId, contratoId } = await params

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

  if (!contrato) return <div style={{ color: 'white', padding: 40 }}>Contrato no encontrado</div>

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0E1117',
      color: '#E8EDF5',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a Guatemala 5934
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
              {contrato.clientes?.nombre}
            </h1>
            <div style={{ color: '#556070', fontSize: 13 }}>
              Unidades: {contrato.contratos_unidades?.map((cu: any) => cu.unidades?.codigo).join(', ')} · 
              Tel: {contrato.clientes?.telefono}
            </div>
          </div>
          <span style={{
            background: 'rgba(34,197,94,0.12)', color: '#4ADE80',
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500
          }}>
            {contrato.estado}
          </span>
        </div>

        <ClientePageClient cuotas={cuotas || []} contrato={contrato} />

      </div>
    </main>
  )
}