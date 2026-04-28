import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ThemeToggle } from '@/lib/ThemeToggle'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

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

  const totalEmitido = ordenes?.reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0
  const totalPagado = ordenes?.filter(o => o.estado === 'pagada').reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0
  const totalPendiente = ordenes?.filter(o => o.estado === 'emitida').reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0

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

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total emitido', valor: `$ ${fmt(totalEmitido)}`, color: 'var(--text-primary)' },
            { label: 'Pendiente de pago', valor: `$ ${fmt(totalPendiente)}`, color: '#F59E0B' },
            { label: 'Total pagado', valor: `$ ${fmt(totalPagado)}`, color: 'var(--success)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-head)' }}>
                {['N° OP', 'Fecha', 'Proveedor', 'Cert.', 'Descripción', 'Transferencia', 'Efectivo', 'Cheque', 'Total', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!ordenes || ordenes.length === 0) && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay órdenes de pago todavía.
                </td></tr>
              )}
              {ordenes?.map((o, idx) => {
                const total = (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0)
                const proveedor = (o.certificados as any)?.proveedores
                return (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--border)', background: idx%2===0 ? 'transparent' : 'var(--row-alt)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#F0C060' }}>
                      {String(o.numero).padStart(4,'0')}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {o.fecha}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      <Link href={`/obras/${obraId}/proveedores/${proveedor?.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {proveedor?.razon_social || '—'}
                      </Link>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{proveedor?.rubro}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      N°{String((o.certificados as any)?.numero || '').padStart(2,'0')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(o.certificados as any)?.descripcion || (o.certificados as any)?.notas || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: o.monto_transfer>0 ? '#60A5FA' : 'var(--text-muted)' }}>
                      {o.monto_transfer > 0 ? `$ ${fmt(o.monto_transfer)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: o.monto_efectivo>0 ? '#F0C060' : 'var(--text-muted)' }}>
                      {o.monto_efectivo > 0 ? `$ ${fmt(o.monto_efectivo)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: o.monto_cheque>0 ? '#A855F7' : 'var(--text-muted)' }}>
                      {o.monto_cheque > 0 ? `$ ${fmt(o.monto_cheque)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>
                      $ {fmt(total)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {o.estado === 'pagada'
                        ? <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>✓ Pagada</span>
                        : <a href={`/obras/${obraId}/caja?op=${o.id}`} style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>⏳ A pagar →</a>
                      }
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
