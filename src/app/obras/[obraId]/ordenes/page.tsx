import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export const revalidate = 0

export default async function OrdenesPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

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

  const totalEmitido = ordenes?.reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0
  const totalPagado = ordenes?.filter(o => o.estado === 'pagada').reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0
  const totalPendiente = ordenes?.filter(o => o.estado === 'emitida').reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a Guatemala 5934
          </Link>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>📄 Órdenes de pago</h1>
          <p style={{ color: '#556070', fontSize: 14 }}>Todas las órdenes · Guatemala 5934</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total emitido', valor: `$ ${fmt(totalEmitido)}`, color: '#E8EDF5' },
            { label: 'Pendiente de pago', valor: `$ ${fmt(totalPendiente)}`, color: '#F59E0B' },
            { label: 'Total pagado', valor: `$ ${fmt(totalPagado)}`, color: '#4ADE80' },
          ].map(k => (
            <div key={k.label} style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: '#556070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1D2535' }}>
                {['N° OP', 'Fecha', 'Proveedor', 'Cert.', 'Descripción', 'Transferencia', 'Efectivo', 'Cheque', 'Total', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: '#556070', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!ordenes || ordenes.length === 0) && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#556070' }}>
                  No hay órdenes de pago todavía.
                </td></tr>
              )}
              {ordenes?.map((o, idx) => {
                const total = (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0)
                const proveedor = (o.certificados as any)?.proveedores
                return (
                  <tr key={o.id} style={{ borderTop: '1px solid #252D3D', background: idx%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#F0C060' }}>
                      {String(o.numero).padStart(4,'0')}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#8A96AA' }}>
                      {o.fecha}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      <Link href={`/obras/${obraId}/proveedores/${proveedor?.id}`} style={{ color: '#E8EDF5', textDecoration: 'none' }}>
                        {proveedor?.razon_social || '—'}
                      </Link>
                      <div style={{ fontSize: 10, color: '#556070', marginTop: 1 }}>{proveedor?.rubro}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#556070' }}>
                      N°{String((o.certificados as any)?.numero || '').padStart(2,'0')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#8A96AA', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(o.certificados as any)?.descripcion || (o.certificados as any)?.notas || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: o.monto_transfer>0?'#60A5FA':'#556070' }}>
                      {o.monto_transfer > 0 ? `$ ${fmt(o.monto_transfer)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: o.monto_efectivo>0?'#F0C060':'#556070' }}>
                      {o.monto_efectivo > 0 ? `$ ${fmt(o.monto_efectivo)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: o.monto_cheque>0?'#A855F7':'#556070' }}>
                      {o.monto_cheque > 0 ? `$ ${fmt(o.monto_cheque)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>
                      $ {fmt(total)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: o.estado==='pagada'?'rgba(34,197,94,0.12)':'rgba(245,158,11,0.12)',
                        color: o.estado==='pagada'?'#4ADE80':'#F59E0B',
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500
                      }}>
                        {o.estado==='pagada'
                          ? <span style={{ background:'rgba(34,197,94,0.12)', color:'#4ADE80', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:500 }}>✓ Pagada</span>
                          : <a href={`/obras/${obraId}/caja?op=${o.id}`} style={{ background:'rgba(245,158,11,0.12)', color:'#F59E0B', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, textDecoration:'none', display:'inline-block' }}>⏳ A pagar →</a>
                        }
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}