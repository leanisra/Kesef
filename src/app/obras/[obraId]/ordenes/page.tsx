import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ThemeToggle } from '@/lib/ThemeToggle'
import OrdenesClient from './OrdenesClient'

export const revalidate = 0

export default async function OrdenesPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: obra } = await supabase.from('obras').select('nombre').eq('id', obraId).single()

  const { data: ordenes } = await supabase
    .from('ordenes_pago')
    .select(`
      *,
      certificados (
        numero, descripcion, notas,
        proveedores ( id, razon_social, rubro )
      )
    `)
    .eq('obra_id', obraId)
    .order('numero', { ascending: false })

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
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>📄 Órdenes de pago</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Todas las órdenes · {obra?.nombre}</p>
        </div>
        <OrdenesClient ordenesIniciales={ordenes || []} obraId={obraId} />
      </div>
    </main>
  )
}
