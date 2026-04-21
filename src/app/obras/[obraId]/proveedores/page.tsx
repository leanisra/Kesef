import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export default async function ProveedoresPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: proveedores } = await supabase
    .from('proveedores')
    .select(`
      *,
      proveedores_obras!inner ( obra_id ),
      facturas ( monto_ars, estado )
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
          <Link href={`/obras/${obraId}/proveedores/nuevo`} style={{
            background: '#D4A843', color: '#0E1117', borderRadius: 6,
            padding: '8px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none'
          }}>
            ＋ Nuevo proveedor
          </Link>
        </div>

        {/* Tabla proveedores */}
        <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1D2535' }}>
                {['Proveedor', 'Rubro', 'CUIT', 'Facturado', 'Pagado', 'Saldo', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#556070', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores?.map((p: any) => {
                const facturas = p.facturas || []
                const totalFacturado = facturas.reduce((a: number, f: any) => a + (f.monto_ars || 0), 0)
                const totalPagado = facturas.filter((f: any) => f.estado === 'pagada').reduce((a: number, f: any) => a + (f.monto_ars || 0), 0)
                const saldo = totalFacturado - totalPagado
                const pct = totalFacturado > 0 ? Math.round(totalPagado / totalFacturado * 100) : 0
                const sinDeuda = saldo === 0

                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #252D3D' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.razon_social}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: '#8A96AA', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                        {p.rubro || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#556070' }}>{p.cuit || '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#E8EDF5' }}>
                      {totalFacturado > 0 ? `$ ${fmt(totalFacturado)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#4ADE80' }}>
                      {totalPagado > 0 ? `$ ${fmt(totalPagado)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: sinDeuda ? '#4ADE80' : saldo > 100000000 ? '#F87171' : '#F59E0B' }}>
                      {sinDeuda ? '✓ Al día' : `$ ${fmt(saldo)}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {sinDeuda
                        ? <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Pagado</span>
                        : totalFacturado === 0
                        ? <span style={{ background: 'rgba(255,255,255,0.06)', color: '#556070', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Sin facturas</span>
                        : pct > 50
                        ? <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Parcial {pct}%</span>
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
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#556070' }}>
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