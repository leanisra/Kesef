import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CajaClient from './CajaClient'
import { ThemeToggle } from '@/lib/ThemeToggle'

export const revalidate = 0

export default async function CajaPage({ params, searchParams }: { params: { obraId: string }, searchParams: { op?: string } }) {
  const { obraId } = await params
  const opPreseleccionada = searchParams?.op || null

  const { data: obra } = await supabase.from('obras').select('nombre').eq('id', obraId).single()

  const { data: cajas } = await supabase
    .from('cajas').select('*').eq('obra_id', obraId).order('nombre')

  const { data: movimientos } = await supabase
    .from('movimientos_caja').select('*').eq('obra_id', obraId)
    .neq('eliminado', true)
    .order('fecha', { ascending: false })

  const { data: ordenesPendientes } = await supabase
    .from('ordenes_pago')
    .select('*, certificados(numero, descripcion, notas, proveedores(razon_social))')
    .eq('obra_id', obraId).eq('estado', 'emitida').neq('eliminado', true).order('numero')

  const { data: cheques } = await supabase
    .from('cheques').select('*, proveedores(razon_social)')
    .eq('obra_id', obraId).neq('eliminado', true).order('fecha_vencimiento', { ascending: true })

  const { data: proveedoresObra } = await supabase
    .from('proveedores_obras').select('proveedor_id').eq('obra_id', obraId)

  const proveedorIds = proveedoresObra?.map(p => p.proveedor_id) || []
  const { data: proveedores } = await supabase
    .from('proveedores').select('id, razon_social').in('id', proveedorIds)

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
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>💰 Caja</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Movimientos · Cheques · {obra?.nombre}</p>
        </div>
        {(cajas?.length ?? 0) === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: 40 }}>No hay cajas configuradas.</div>
        ) : (
          <CajaClient
            cajas={cajas || []}
            movimientosIniciales={movimientos || []}
            obraId={obraId}
            ordenesPendientes={ordenesPendientes || []}
            chequesIniciales={cheques || []}
            proveedores={proveedores || []}
            opPreseleccionada={opPreseleccionada}
          />
        )}
      </div>
    </main>
  )
}
