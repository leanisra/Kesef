import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import UnidadesClient from './UnidadesClient'

export default async function UnidadesPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: unidades } = await supabase
    .from('unidades')
    .select('*')
    .eq('obra_id', obraId)
    .order('orden')

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a Guatemala 5934
          </Link>
        </div>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>🏢 Unidades</h1>
          <p style={{ color: '#556070', fontSize: 14 }}>Lista de precios editable · Guatemala 5934</p>
        </div>
        <UnidadesClient unidadesIniciales={unidades || []} obraId={obraId} />
      </div>
    </main>
  )
}