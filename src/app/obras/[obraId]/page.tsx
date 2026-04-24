import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 0

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export default async function ObraPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: obra } = await supabase.from('obras').select('*').eq('id', obraId).single()

  const { data: contratos } = await supabase
    .from('contratos').select('*, clientes(nombre), contratos_unidades(unidades(codigo))')
    .eq('obra_id', obraId)

  const { data: cuotas } = await supabase
    .from('cuotas').select('*').in('contrato_id', contratos?.map(c => c.id) || [])

  const { data: cajas } = await supabase
    .from('cajas').select('id, nombre, moneda').eq('obra_id', obraId)

  const { data: movimientos } = await supabase
    .from('movimientos_caja').select('caja_id, tipo, monto_ars, monto_usd').eq('obra_id', obraId)

  const { data: certificados } = await supabase
    .from('certificados').select('monto_base, monto_certificado, ordenes_pago(monto_efectivo, monto_transfer, monto_cheque, estado)')
    .eq('obra_id', obraId)

  const { data: ordenesPendientes } = await supabase
    .from('ordenes_pago').select('id').eq('obra_id', obraId).eq('estado', 'emitida')

  const { data: cheques } = await supabase
    .from('cheques').select('estado, monto, fecha_vencimiento').eq('obra_id', obraId)

  if (!obra) return <div style={{ color: 'white', padding: 40 }}>Obra no encontrada</div>

  // KPIs cuotas
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const cuotasPendientes = cuotas?.filter(c => c.estado === 'pendiente') || []
  const cuotasVencidas = cuotasPendientes.filter(c => new Date(c.fecha_vencimiento) < hoy)
  const totalCuotasArs = cuotasPendientes.reduce((a, c) => a + (c.cuota_a_ars||0) + (c.cuota_b_ars||0), 0)

  // KPIs caja
  const saldosBanco = cajas?.filter(c => c.nombre.includes('Banco')).map(cj => {
    const movsCaja = movimientos?.filter(m => m.caja_id === cj.id) || []
    return movsCaja.reduce((a, m) => a + (m.tipo === 'ingreso' ? (m.monto_ars||0) : -(m.monto_ars||0)), 0)
  }) || []
  const saldoTotalBanco = saldosBanco.reduce((a, s) => a + s, 0)

  const saldosCash = cajas?.filter(c => c.nombre.includes('Cash')).map(cj => {
    const movsCaja = movimientos?.filter(m => m.caja_id === cj.id) || []
    return movsCaja.reduce((a, m) => a + (m.tipo === 'ingreso' ? (m.monto_ars||0) : -(m.monto_ars||0)), 0)
  }) || []
  const saldoTotalCash = saldosCash.reduce((a, s) => a + s, 0)

  // KPIs proveedores
  const totalBaseProveedores = certificados?.reduce((a, c) => a + (c.monto_base || c.monto_certificado || 0), 0) || 0
  const totalPagadoProveedores = certificados?.reduce((a, c) =>
    a + (c.ordenes_pago?.filter((o: any) => o.estado === 'pagada')
      .reduce((b: number, o: any) => b + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0), 0) || 0
  const saldoProveedores = totalBaseProveedores - totalPagadoProveedores

  // KPIs cheques
  const en7dias = new Date(hoy.getTime() + 7*24*60*60*1000)
  const chequesVencenProximo = cheques?.filter(c => {
    const v = new Date(c.fecha_vencimiento); v.setHours(0,0,0,0)
    return c.estado === 'emitido' && v >= hoy && v <= en7dias
  }) || []
  const chequesVencidos = cheques?.filter(c => {
    const v = new Date(c.fecha_vencimiento); v.setHours(0,0,0,0)
    return c.estado === 'emitido' && v < hoy
  }) || []

  const modulos = [
    { label: 'Clientes y Cuotas', icon: '👥', href: `/obras/${obraId}/clientes`, color: '#60A5FA' },
    { label: 'Caja', icon: '💰', href: `/obras/${obraId}/caja`, color: '#F0C060' },
    { label: 'Presupuesto', icon: '📋', href: `/obras/${obraId}/presupuesto`, color: '#4ADE80' },
    { label: 'Proveedores', icon: '🏗️', href: `/obras/${obraId}/proveedores`, color: '#A855F7' },
    { label: 'Unidades', icon: '🏢', href: `/obras/${obraId}/unidades`, color: '#F59E0B' },
    { label: 'Órdenes de pago', icon: '📄', href: `/obras/${obraId}/ordenes`, color: '#22C55E' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 8 }}>
          <Link href="/" style={{ color: '#556070', fontSize: 13, textDecoration: 'none' }}>← Volver a obras</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#D4A843', marginBottom: 4 }}>{obra.nombre}</h1>
            <p style={{ color: '#556070', fontSize: 14 }}>{obra.direccion}</p>
          </div>
          <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>● {obra.estado}</span>
        </div>

        {/* Alertas */}
        {(chequesVencidos.length > 0 || cuotasVencidas.length > 0 || (ordenesPendientes?.length || 0) > 0) && (
          <div style={{ marginBottom: 24 }}>
            {chequesVencidos.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>🚨</span>
                <div style={{ flex: 1, fontSize: 13, color: '#F87171', fontWeight: 600 }}>{chequesVencidos.length} cheque{chequesVencidos.length > 1 ? 's' : ''} vencido{chequesVencidos.length > 1 ? 's' : ''} sin depositar</div>
                <Link href={`/obras/${obraId}/caja`} style={{ color: '#F87171', fontSize: 12, textDecoration: 'none' }}>Ver en caja →</Link>
              </div>
            )}
            {chequesVencenProximo.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>⚠️</span>
                <div style={{ flex: 1, fontSize: 13, color: '#F59E0B' }}>{chequesVencenProximo.length} cheque{chequesVencenProximo.length > 1 ? 's' : ''} vence{chequesVencenProximo.length > 1 ? 'n' : ''} en los próximos 7 días</div>
                <Link href={`/obras/${obraId}/caja`} style={{ color: '#F59E0B', fontSize: 12, textDecoration: 'none' }}>Ver →</Link>
              </div>
            )}
            {cuotasVencidas.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>📅</span>
                <div style={{ flex: 1, fontSize: 13, color: '#F87171' }}>{cuotasVencidas.length} cuota{cuotasVencidas.length > 1 ? 's' : ''} vencida{cuotasVencidas.length > 1 ? 's' : ''} sin cobrar · $ {fmt(cuotasVencidas.reduce((a, c) => a + (c.cuota_a_ars||0) + (c.cuota_b_ars||0), 0))}</div>
                <Link href={`/obras/${obraId}/clientes`} style={{ color: '#F87171', fontSize: 12, textDecoration: 'none' }}>Ver →</Link>
              </div>
            )}
            {(ordenesPendientes?.length || 0) > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>⏳</span>
                <div style={{ flex: 1, fontSize: 13, color: '#F59E0B' }}>{ordenesPendientes?.length} orden{(ordenesPendientes?.length||0) > 1 ? 'es' : ''} de pago pendiente{(ordenesPendientes?.length||0) > 1 ? 's' : ''} de ejecutar</div>
                <Link href={`/obras/${obraId}/ordenes`} style={{ color: '#F59E0B', fontSize: 12, textDecoration: 'none' }}>Ver →</Link>
              </div>
            )}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Saldo banco', valor: `$ ${fmt(saldoTotalBanco)}`, color: '#60A5FA', sub: 'Banco ARS + MN' },
            { label: 'Saldo cash', valor: `$ ${fmt(saldoTotalCash)}`, color: '#F0C060', sub: 'Cash ARS' },
            { label: 'Deuda proveedores', valor: saldoProveedores > 0 ? `$ ${fmt(saldoProveedores)}` : '✓ Al día', color: saldoProveedores > 0 ? '#F87171' : '#4ADE80', sub: 'Saldo base sin CAC/IVA' },
            { label: 'Cuotas pendientes', valor: cuotasPendientes.length, color: cuotasPendientes.length > 0 ? '#F59E0B' : '#4ADE80', sub: `$ ${fmt(totalCuotasArs)} por cobrar` },
            { label: 'Cuotas vencidas', valor: cuotasVencidas.length, color: cuotasVencidas.length > 0 ? '#F87171' : '#4ADE80', sub: cuotasVencidas.length > 0 ? 'Requieren atención' : 'Todo al día' },
            { label: 'Cheques emitidos', valor: cheques?.filter(c => c.estado === 'emitido').length || 0, color: '#A855F7', sub: chequesVencidos.length > 0 ? `${chequesVencidos.length} vencidos` : 'Sin vencidos' },
          ].map(k => (
            <div key={k.label} style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: '#556070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: k.color, marginBottom: 4 }}>{k.valor}</div>
              <div style={{ fontSize: 11, color: '#556070' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Módulos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 32 }}>
          {modulos.map(m => (
            <Link key={m.label} href={m.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: m.color }}>{m.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Clientes */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Clientes · {contratos?.length || 0} contratos</h2>
        <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1D2535' }}>
                {['Cliente', 'Unidades', 'Precio USD', 'TC contrato', 'Cuotas', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#556070', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contratos?.map((contrato: any) => (
                <tr key={contrato.id} style={{ borderTop: '1px solid #252D3D' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <Link href={`/obras/${obraId}/clientes/${contrato.id}`} style={{ color: '#E8EDF5', textDecoration: 'none' }}>
                      {contrato.clientes?.nombre}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#8A96AA', fontSize: 13 }}>
                    {contrato.contratos_unidades?.map((cu: any) => cu.unidades?.codigo).filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#F0C060' }}>USD {fmt(contrato.precio_usd_total)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#8A96AA', fontSize: 13 }}>$ {fmt(contrato.tc_contrato)}</td>
                  <td style={{ padding: '12px 16px', color: '#8A96AA', fontSize: 13 }}>{contrato.n_cuotas} cuotas</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{contrato.estado}</span>
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