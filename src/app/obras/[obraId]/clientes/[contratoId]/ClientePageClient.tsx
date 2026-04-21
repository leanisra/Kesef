'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const estadoColor: Record<string, string> = {
  pagada: '#4ADE80',
  pendiente: '#F59E0B',
  futura: '#556070',
  pagada_parcial: '#60A5FA',
}
const estadoBg: Record<string, string> = {
  pagada: 'rgba(34,197,94,0.12)',
  pendiente: 'rgba(245,158,11,0.12)',
  futura: 'rgba(255,255,255,0.04)',
  pagada_parcial: 'rgba(59,130,246,0.12)',
}

export default function ClientePageClient({ cuotas: cuotasIniciales, contrato }: { cuotas: any[], contrato: any }) {
  const [cuotas, setCuotas] = useState(cuotasIniciales)
  const [modal, setModal] = useState<any>(null)
  const [pagoA, setPagoA] = useState('')
  const [pagoB, setPagoB] = useState('')
  const [fechaA, setFechaA] = useState(new Date().toISOString().split('T')[0])
  const [fechaB, setFechaB] = useState(new Date().toISOString().split('T')[0])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const abrirModal = (cuota: any) => {
    setModal(cuota)
    setPagoA(cuota.monto_pagado_a?.toString() || '')
    setPagoB(cuota.monto_pagado_b?.toString() || '')
    setFechaA(cuota.fecha_pago_a || new Date().toISOString().split('T')[0])
    setFechaB(cuota.fecha_pago_b || new Date().toISOString().split('T')[0])
    setMensaje('')
  }

  const guardarPago = async () => {
    if (!modal) return
    setGuardando(true)

    const montoA = parseFloat(pagoA) || 0
    const montoB = parseFloat(pagoB) || 0

    let nuevoEstado = 'pendiente'
    if (montoA >= modal.cuota_a_ars * 0.99 && montoB >= modal.cuota_b_ars * 0.99) {
      nuevoEstado = 'pagada'
    } else if (montoA > 0 || montoB > 0) {
      nuevoEstado = 'pagada_parcial'
    }

    const { error } = await supabase
      .from('cuotas')
      .update({
        monto_pagado_a: montoA,
        monto_pagado_b: montoB,
        fecha_pago_a: montoA > 0 ? fechaA : null,
        fecha_pago_b: montoB > 0 ? fechaB : null,
        estado: nuevoEstado as any,
      })
      .eq('id', modal.id)

    if (error) {
      setMensaje('❌ Error al guardar: ' + error.message)
    } else {
      setCuotas(cs => cs.map(c => c.id === modal.id ? {
        ...c,
        monto_pagado_a: montoA,
        monto_pagado_b: montoB,
        fecha_pago_a: montoA > 0 ? fechaA : null,
        fecha_pago_b: montoB > 0 ? fechaB : null,
        estado: nuevoEstado,
      } : c))
      setMensaje('✓ Guardado correctamente')
      setTimeout(() => { setModal(null); setMensaje('') }, 1200)
    }
    setGuardando(false)
  }

  const pagadas = cuotas.filter(c => c.estado === 'pagada').length
  const pendientes = cuotas.filter(c => c.estado === 'pendiente').length

  const splitB = 100 - contrato.split_a_pct
  const saldoUSD = contrato.precio_usd_total - contrato.anticipo_usd
  const cuotaUSD = saldoUSD / contrato.n_cuotas
  const cuotaA = Math.round(cuotaUSD * (contrato.split_a_pct / 100) * contrato.tc_contrato)
  const cuotaB = Math.round(cuotaUSD * (1 - contrato.split_a_pct / 100) * contrato.tc_contrato)

  return (
    <>
      {/* KPIs cuotas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Precio total', valor: `USD ${fmt(contrato.precio_usd_total)}`, color: '#E8EDF5' },
          { label: `Cuota A · banco (${contrato.split_a_pct}%)`, valor: `$ ${fmt(cuotaA)}`, color: '#60A5FA' },
          { label: `Cuota B · efectivo (${splitB}%)`, valor: `$ ${fmt(cuotaB)}`, color: '#F0C060' },
          { label: 'TC contrato (fijo)', valor: `$ ${fmt(contrato.tc_contrato)}`, color: '#F0C060' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#161B25', border: '1px solid #252D3D',
            borderRadius: 10, padding: '16px 20px'
          }}>
            <div style={{ fontSize: 11, color: '#556070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>
              {k.valor}
            </div>
          </div>
        ))}
      </div>

      {/* Estado cuotas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Pagadas', valor: pagadas, color: '#4ADE80', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Pendientes', valor: pendientes, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Total cuotas', valor: cuotas.length, color: '#E8EDF5', bg: '#161B25' },
        ].map(k => (
          <div key={k.label} style={{
            background: k.bg, border: '1px solid #252D3D',
            borderRadius: 10, padding: '16px 20px'
          }}>
            <div style={{ fontSize: 11, color: '#556070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Tabla cuotas */}
      <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #252D3D', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Detalle de cuotas · {cuotas.length}</span>
          <span style={{ fontSize: 12, color: '#556070' }}>TC fijo: $ {fmt(contrato.tc_contrato)} · hacé click en una cuota para registrar pago</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1D2535' }}>
              {['N°', 'Vencimiento', 'Cuota A · banco', 'Cuota B · efectivo', 'Total', 'Estado', 'Pago A', 'Pago B', ''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: '#556070', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuotas.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #252D3D', opacity: c.estado === 'futura' ? 0.45 : 1 }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#556070', fontSize: 12 }}>
                  {String(c.n_cuota).padStart(2, '0')}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{c.fecha_vencimiento}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#60A5FA' }}>$ {fmt(c.cuota_a_ars)}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#F0C060' }}>$ {fmt(c.cuota_b_ars)}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>$ {fmt(c.cuota_a_ars + c.cuota_b_ars)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: estadoBg[c.estado] || estadoBg.futura,
                    color: estadoColor[c.estado] || estadoColor.futura,
                    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500
                  }}>
                    {c.estado === 'pagada' ? '✓ Pagada' : c.estado === 'pendiente' ? '⏳ Pendiente' : c.estado === 'pagada_parcial' ? 'Parcial' : 'Futura'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#556070' }}>{c.fecha_pago_a ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#556070' }}>{c.fecha_pago_b ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  {c.estado !== 'futura' && (
                    <button onClick={() => abrirModal(c)} style={{
                      background: 'rgba(212,168,67,0.15)', color: '#D4A843',
                      border: '1px solid rgba(212,168,67,0.3)', borderRadius: 6,
                      padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui'
                    }}>
                      Registrar pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal pago */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: '#161B25', border: '1px solid #2E3A52',
            borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              Registrar pago · Cuota {String(modal.n_cuota).padStart(2, '0')}
            </h3>
            <p style={{ color: '#556070', fontSize: 13, marginBottom: 24 }}>
              Vencimiento: {modal.fecha_vencimiento}
            </p>

            {/* Pago A */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#60A5FA', fontWeight: 600, marginBottom: 8 }}>
                CUOTA A — Transferencia bancaria (esperado: $ {fmt(modal.cuota_a_ars)})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#556070', marginBottom: 4 }}>Monto recibido $</div>
                  <input type="number" value={pagoA} onChange={e => setPagoA(e.target.value)}
                    placeholder={fmt(modal.cuota_a_ars)}
                    style={{
                      width: '100%', background: '#0E1117', border: '1px solid #2E3A52',
                      borderRadius: 6, padding: '8px 12px', color: '#E8EDF5',
                      fontFamily: 'monospace', fontSize: 14, outline: 'none'
                    }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#556070', marginBottom: 4 }}>Fecha de pago</div>
                  <input type="date" value={fechaA} onChange={e => setFechaA(e.target.value)}
                    style={{
                      width: '100%', background: '#0E1117', border: '1px solid #2E3A52',
                      borderRadius: 6, padding: '8px 12px', color: '#E8EDF5',
                      fontFamily: 'system-ui', fontSize: 13, outline: 'none'
                    }} />
                </div>
              </div>
            </div>

            {/* Pago B */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#F0C060', fontWeight: 600, marginBottom: 8 }}>
                CUOTA B — Efectivo (esperado: $ {fmt(modal.cuota_b_ars)})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#556070', marginBottom: 4 }}>Monto recibido $</div>
                  <input type="number" value={pagoB} onChange={e => setPagoB(e.target.value)}
                    placeholder={fmt(modal.cuota_b_ars)}
                    style={{
                      width: '100%', background: '#0E1117', border: '1px solid #2E3A52',
                      borderRadius: 6, padding: '8px 12px', color: '#E8EDF5',
                      fontFamily: 'monospace', fontSize: 14, outline: 'none'
                    }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#556070', marginBottom: 4 }}>Fecha de pago</div>
                  <input type="date" value={fechaB} onChange={e => setFechaB(e.target.value)}
                    style={{
                      width: '100%', background: '#0E1117', border: '1px solid #2E3A52',
                      borderRadius: 6, padding: '8px 12px', color: '#E8EDF5',
                      fontFamily: 'system-ui', fontSize: 13, outline: 'none'
                    }} />
                </div>
              </div>
            </div>

            {mensaje && (
              <div style={{
                padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
                background: mensaje.startsWith('✓') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: mensaje.startsWith('✓') ? '#4ADE80' : '#F87171'
              }}>
                {mensaje}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{
                background: 'transparent', color: '#8A96AA',
                border: '1px solid #2E3A52', borderRadius: 6,
                padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui'
              }}>
                Cancelar
              </button>
              <button onClick={guardarPago} disabled={guardando} style={{
                background: '#D4A843', color: '#0E1117',
                border: 'none', borderRadius: 6,
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'system-ui'
              }}>
                {guardando ? 'Guardando...' : '✓ Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}