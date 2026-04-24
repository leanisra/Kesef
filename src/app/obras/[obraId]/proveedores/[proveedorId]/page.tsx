import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ProveedorClient from './ProveedorClient'

export const revalidate = 0

export default async function ProveedorPage({ params }: { params: { obraId: string, proveedorId: string } }) {
  const { obraId, proveedorId } = await params

  const { data: obra } = await supabase
    .from('obras')
    .select('*')
    .eq('id', obraId)
    .single()

  const { data: proveedor } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', proveedorId)
    .single()

  const { data: certificados } = await supabase
    .from('certificados')
    .select('*, ordenes_pago(*)')
    .eq('proveedor_id', proveedorId)
    .eq('obra_id', obraId)
    .order('numero')

  const { data: rubros } = await supabase
    .from('presupuesto_rubros')
    .select('*')
    .eq('obra_id', obraId)
    .order('orden')

  if (!proveedor) return <div style={{ color: 'white', padding: 40 }}>Proveedor no encontrado</div>

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <Link href={`/obras/${obraId}/proveedores`} style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a proveedores
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{proveedor.razon_social}</h1>
            <div style={{ color: '#556070', fontSize: 13 }}>
              {proveedor.rubro} · CUIT {proveedor.cuit || '—'}
            </div>
          </div>
        </div>
        <ProveedorClient
          proveedor={proveedor}
          certificadosIniciales={certificados || []}
          rubros={rubros || []}
          obraId={obraId}
          empresaAdmin={obra?.empresa_admin || 'KESEF'}
          obraNombre={obra?.nombre || 'Obra'}
          obraDireccion={obra?.direccion || ''}
        />
      </div>
    </main>
  )
}