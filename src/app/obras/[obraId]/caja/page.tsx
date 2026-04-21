import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CajaClient from './CajaClient'

export default async function CajaPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: cajas } = await supabase
    .from('cajas')
    .select('*')
    .eq('obra_id', obraId)
    .order('nombre')

  const { data: movimientos } = await supabase
    .from('movimientos_caja')
    .select('*')
    .eq('obra_id', obraId)
    .order('fecha', { ascending: false })

  const { data: tc } = await supabase
    .from('tipos_cambio')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(1)
    .single()

  const cajasSeguras = cajas ?? []
  const movimientosSeguras = movimientos ?? []

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a Guatemala 5934
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>💰 Caja</h1>
            <p style={{ color: '#556070', fontSize: 14 }}>Movimientos bimonetarios · Guatemala 5934</p>
          </div>
          <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
            <span style={{ color: '#556070' }}>TC Blue hoy · </span>
            <span style={{ color: '#F0C060', fontFamily: 'monospace', fontWeight: 600 }}>
              $ {tc?.promedio?.toLocaleString('es-AR') ?? '—'}
            </span>
          </div>
        </div>
        {cajasSeguras.length === 0 ? (
          <div style={{ color: '#556070', padding: 40 }}>No hay cajas configuradas para esta obra.</div>
        ) : (
          <CajaClient cajas={cajasSeguras} movimientosIniciales={movimientosSeguras} obraId={obraId} tcHoy={tc?.promedio ?? 1415} />
        )}
      </div>
    </main>
  )
}