import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 0

export default async function ObraPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: obra } = await supabase
    .from('obras')
    .select('*')
    .eq('id', obraId)
    .single()

  const { data: clientes_contratos } = await supabase
    .from('contratos')
    .select(`
      id,
      precio_usd_total,
      anticipo_usd,
      n_cuotas,
      split_a_pct,
      tc_contrato,
      fecha_primera_cuota,
      estado,
      clientes ( id, nombre, telefono ),
      contratos_unidades ( unidades ( codigo ) )
    `)
    .eq('obra_id', obraId)

  if (!obra) return <div style={{ color: 'white', padding: 40 }}>Obra no encontrada</div>

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0E1117',
      color: '#E8EDF5',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px'
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <Link href="/" style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a obras
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#D4A843', marginBottom: 4 }}>
              {obra.nombre}
            </h1>
            <p style={{ color: '#556070', fontSize: 14 }}>{obra.direccion}</p>
          </div>
          <span style={{
            background: 'rgba(34,197,94,0.12)',
            color: '#4ADE80',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500
          }}>
            ● {obra.estado}
          </span>
        </div>

        {/* Módulos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 40 }}>
          {[
            { label: 'Clientes y Cuotas', icon: '👥', href: `/obras/${obraId}/clientes`, color: '#60A5FA' },
            { label: 'Caja', icon: '💰', href: `/obras/${obraId}/caja`, color: '#F0C060' },
            { label: 'Presupuesto', icon: '📋', href: `/obras/${obraId}/presupuesto`, color: '#4ADE80' },
            { label: 'Proveedores', icon: '🏗️', href: `/obras/${obraId}/proveedores`, color: '#A855F7' },
            { label: 'Unidades', icon: '🏢', href: `/obras/${obraId}/unidades`, color: '#F59E0B' },
            { label: 'WhatsApp Bot', icon: '📱', href: `/obras/${obraId}/whatsapp`, color: '#22C55E' },
          ].map(m => (
            <Link key={m.label} href={m.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#161B25',
                border: '1px solid #252D3D',
                borderRadius: 10,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: m.color }}>{m.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Clientes */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Clientes · {clientes_contratos?.length || 0} contratos</h2>

        <div style={{
          background: '#161B25',
          border: '1px solid #252D3D',
          borderRadius: 10,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1D2535' }}>
                {['Cliente', 'Unidades', 'Precio USD', 'TC contrato', 'Cuotas', 'Estado'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    color: '#556070',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes_contratos?.map((contrato: any) => (
                <tr key={contrato.id} style={{ borderTop: '1px solid #252D3D' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <Link href={`/obras/${obraId}/clientes/${contrato.id}`}
                      style={{ color: '#E8EDF5', textDecoration: 'none' }}>
                      {contrato.clientes?.nombre}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#8A96AA', fontSize: 13 }}>
                    {contrato.contratos_unidades?.map((cu: any) => cu.unidades?.codigo).filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#F0C060' }}>
                    USD {contrato.precio_usd_total?.toLocaleString('es-AR')}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#8A96AA', fontSize: 13 }}>
                    $ {contrato.tc_contrato?.toLocaleString('es-AR')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#8A96AA', fontSize: 13 }}>
                    {contrato.n_cuotas} cuotas
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: 'rgba(34,197,94,0.12)',
                      color: '#4ADE80',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 11
                    }}>
                      {contrato.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}