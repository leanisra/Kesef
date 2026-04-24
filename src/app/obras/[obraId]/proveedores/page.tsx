import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export const revalidate = 0

export default async function ProveedoresPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select(`
      *,
      proveedores_obras!inner ( obra_id ),
      certificados ( monto_certificado, monto_base, ordenes_pago ( monto_efectivo, monto_transfer, monto_cheque, estado ) )
    `)
    .eq('proveedores_obras.obra_id', obraId)

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
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>🏗️ Proveedores</h1>
            <p style={{ color: '#556070', fontSize: 14 }}>Cuenta corriente por proveedor · Guatemala 5934</p>
          </div>
        </div>

        <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1D2535' }}>
                {['Proveedor', 'Rubro', 'CUIT', 'Certificado', 'Base', 'Pagado', 'Saldo', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#556070', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores?.map((p: any) => {
                const certs = p.certificados || []
                const totalCertificado = certs.reduce((a: number, c: any) => a + (c.monto_certificado || 0), 0)
                const totalBase = certs.reduce((a: number, c: any) => a + (c.monto_base || c.monto_certificado || 0), 0)
                const totalPagado = certs.reduce((a: number, c: any) =>
                  a + (c.ordenes_pago?.filter((o: any) => o.estado === 'pagada')
                    .reduce((b: number, o: any) => b + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0), 0)
                const saldo = totalBase - totalPagado
                const sinDeuda = saldo <= 0

                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #252D3D' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.razon_social}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: '#8A96AA', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                        {p.rubro || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#556070' }}>{p.cuit || '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#E8EDF5', fontSize: 13 }}>
                      {totalCertificado > 0 ? `$ ${fmt(totalCertificado)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#60A5FA', fontSize: 13 }}>
                      {totalBase > 0 ? `$ ${fmt(totalBase)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4ADE80' }}>
                      {totalPagado > 0 ? `$ ${fmt(totalPagado)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: sinDeuda ? '#4ADE80' : '#F87171' }}>
                      {sinDeuda ? '✓ Al día' : `$ ${fmt(saldo)}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {sinDeuda
                        ? <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Pagado</span>
                        : totalCertificado === 0
                        ? <span style={{ background: 'rgba(255,255,255,0.06)', color: '#556070', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Sin certificados</span>
                        : <span style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Pendiente</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/obras/${obraId}/proveedores/${p.id}`}
                        style={{ color: '#60A5FA', fontSize: 13, textDecoration: 'none' }}>
                        Ver cuenta →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!proveedores || proveedores.length === 0) && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#556070' }}>
                  No hay proveedores cargados todavía.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}