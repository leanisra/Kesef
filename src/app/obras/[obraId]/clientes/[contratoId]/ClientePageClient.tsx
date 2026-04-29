'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const estadoColor: Record<string, string> = {
  pagada: '#4ADE80', pendiente: '#F59E0B', futura: 'var(--text-muted)', pagada_parcial: '#60A5FA',
}
const estadoBg: Record<string, string> = {
  pagada: 'rgba(34,197,94,0.12)', pendiente: 'rgba(245,158,11,0.12)', futura: 'var(--tag-bg)', pagada_parcial: 'rgba(59,130,246,0.12)',
}

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)',
  fontFamily: 'monospace', fontSize: 14, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

export default function ClientePageClient({ cuotas: cuotasIniciales, contrato }: { cuotas: any[], contrato: any }) {
  const [cuotas, setCuotas] = useState(cuotasIniciales.filter((c: any) => !c.eliminado))
  const [papelera, setPapelera] = useState<any[]>(cuotasIniciales.filter((c: any) => c.eliminado))
  const [modal, setModal] = useState<any>(null)          // pago modal
  const [editModal, setEditModal] = useState<any>(null)  // edit cuota modal
  const [editContrato, setEditContrato] = useState(false)
  const [contratoEdit, setContratoEdit] = useState({ ...contrato })
  const [pagoA, setPagoA] = useState('')
  const [pagoB, setPagoB] = useState('')
  const [fechaA, setFechaA] = useState(new Date().toISOString().split('T')[0])
  const [fechaB, setFechaB] = useState(new Date().toISOString().split('T')[0])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [verPapelera, setVerPapelera] = useState(false)

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3000) }

  const abrirModal = (cuota: any) => {
    setModal(cuota)
    setPagoA(cuota.monto_pagado_a?.toString() || '')
    setPagoB(cuota.monto_pagado_b?.toString() || '')
    setFechaA(cuota.fecha_pago_a || new Date().toISOString().split('T')[0])
    setFechaB(cuota.fecha_pago_b || new Date().toISOString().split('T')[0])
  }

  const guardarPago = async () => {
    if (!modal) return
    setGuardando(true)
    const montoA = parseFloat(pagoA) || 0
    const montoB = parseFloat(pagoB) || 0
    let nuevoEstado = 'pendiente'
    if (montoA >= modal.cuota_a_ars * 0.99 && montoB >= modal.cuota_b_ars * 0.99) nuevoEstado = 'pagada'
    else if (montoA > 0 || montoB > 0) nuevoEstado = 'pagada_parcial'

    const { error } = await supabase.from('cuotas').update({
      monto_pagado_a: montoA, monto_pagado_b: montoB,
      fecha_pago_a: montoA > 0 ? fechaA : null,
      fecha_pago_b: montoB > 0 ? fechaB : null,
      estado: nuevoEstado as any,
    }).eq('id', modal.id)

    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCuotas(cs => cs.map(c => c.id === modal.id ? { ...c, monto_pagado_a: montoA, monto_pagado_b: montoB, fecha_pago_a: montoA > 0 ? fechaA : null, fecha_pago_b: montoB > 0 ? fechaB : null, estado: nuevoEstado } : c))
      flash('✓ Guardado')
      setTimeout(() => setModal(null), 1200)
    }
    setGuardando(false)
  }

  const guardarEdicionCuota = async () => {
    if (!editModal) return
    setGuardando(true)
    const { error } = await supabase.from('cuotas').update({
      n_cuota: parseInt(editModal.n_cuota),
      fecha_vencimiento: editModal.fecha_vencimiento,
      cuota_a_ars: parseFloat(editModal.cuota_a_ars) || 0,
      cuota_b_ars: parseFloat(editModal.cuota_b_ars) || 0,
      estado: editModal.estado,
      fecha_pago_a: editModal.fecha_pago_a || null,
      fecha_pago_b: editModal.fecha_pago_b || null,
      monto_pagado_a: parseFloat(editModal.monto_pagado_a) || 0,
      monto_pagado_b: parseFloat(editModal.monto_pagado_b) || 0,
    }).eq('id', editModal.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCuotas(cs => cs.map(c => c.id === editModal.id ? { ...c, ...editModal,
        cuota_a_ars: parseFloat(editModal.cuota_a_ars) || 0,
        cuota_b_ars: parseFloat(editModal.cuota_b_ars) || 0,
        monto_pagado_a: parseFloat(editModal.monto_pagado_a) || 0,
        monto_pagado_b: parseFloat(editModal.monto_pagado_b) || 0,
      } : c))
      setEditModal(null)
      flash('✓ Cuota actualizada')
    }
    setGuardando(false)
  }

  const eliminarCuota = async (id: string) => {
    const { error } = await supabase.from('cuotas').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const cuota = cuotas.find(c => c.id === id)
      setCuotas(cs => cs.filter(c => c.id !== id))
      if (cuota) setPapelera(p => [cuota, ...p])
      setConfirmDel(null)
      flash('✓ Cuota eliminada · podés restaurarla')
    }
  }

  const restaurarCuota = async (cuota: any) => {
    const { error } = await supabase.from('cuotas').update({ eliminado: false }).eq('id', cuota.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCuotas(cs => [...cs, { ...cuota, eliminado: false }].sort((a, b) => a.n_cuota - b.n_cuota))
      setPapelera(p => p.filter(c => c.id !== cuota.id))
      flash('✓ Cuota restaurada')
    }
  }

  const guardarEdicionContrato = async () => {
    setGuardando(true)
    const { error } = await supabase.from('contratos').update({
      precio_usd_total: parseFloat(contratoEdit.precio_usd_total) || 0,
      anticipo_usd: parseFloat(contratoEdit.anticipo_usd) || 0,
      split_a_pct: parseFloat(contratoEdit.split_a_pct) || 50,
      n_cuotas: parseInt(contratoEdit.n_cuotas) || 0,
      tc_contrato: parseFloat(contratoEdit.tc_contrato) || 0,
    }).eq('id', contrato.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else { setEditContrato(false); flash('✓ Contrato actualizado') }
    setGuardando(false)
  }

  const pagadas = cuotas.filter(c => c.estado === 'pagada').length
  const pendientes = cuotas.filter(c => c.estado === 'pendiente').length

  const tc = contratoEdit.tc_contrato
  const splitB = 100 - contratoEdit.split_a_pct
  const saldoUSD = (contratoEdit.precio_usd_total || 0) - (contratoEdit.anticipo_usd || 0)
  const cuotaUSD = (contratoEdit.n_cuotas || 1) > 0 ? saldoUSD / contratoEdit.n_cuotas : 0
  const cuotaA = Math.round(cuotaUSD * (contratoEdit.split_a_pct / 100) * tc)
  const cuotaB = Math.round(cuotaUSD * (1 - contratoEdit.split_a_pct / 100) * tc)

  return (
    <>
      {mensaje && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600
        }}>{mensaje}</div>
      )}

      {/* KPIs contrato */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Datos del contrato</span>
        <button onClick={() => setEditContrato(v => !v)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
          {editContrato ? 'Cancelar' : '✏️ Editar contrato'}
        </button>
      </div>

      {editContrato ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            {[
              { label: 'Precio total USD', key: 'precio_usd_total' },
              { label: 'Anticipo USD', key: 'anticipo_usd' },
              { label: 'TC fijo $', key: 'tc_contrato' },
              { label: 'Split A % (banco)', key: 'split_a_pct' },
              { label: 'N° cuotas', key: 'n_cuotas' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type="number" value={(contratoEdit as any)[f.key]} onChange={e => setContratoEdit((d: any) => ({...d, [f.key]: e.target.value}))} style={inputStyle}/>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditContrato(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
            <button onClick={guardarEdicionContrato} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
              {guardando ? 'Guardando...' : '✓ Guardar contrato'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Precio total', valor: `USD ${fmt(contratoEdit.precio_usd_total)}`, color: 'var(--text-primary)' },
            { label: `Cuota A · banco (${contratoEdit.split_a_pct}%)`, valor: `$ ${fmt(cuotaA)}`, color: '#60A5FA' },
            { label: `Cuota B · efectivo (${splitB}%)`, valor: `$ ${fmt(cuotaB)}`, color: '#F0C060' },
            { label: 'TC contrato (fijo)', valor: `$ ${fmt(tc)}`, color: '#F0C060' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
            </div>
          ))}
        </div>
      )}

      {/* Estado cuotas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Pagadas', valor: pagadas, color: '#4ADE80', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Pendientes', valor: pendientes, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Total cuotas', valor: cuotas.length, color: 'var(--text-primary)', bg: 'var(--bg-card)' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Tabla cuotas */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Detalle de cuotas · {cuotas.length}</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>TC fijo: $ {fmt(tc)} · click para registrar pago</span>
            {papelera.length > 0 && (
              <button onClick={() => setVerPapelera(v => !v)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                🗑️ Papelera · {papelera.length}
              </button>
            )}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-table-head)' }}>
              {['N°','Vencimiento','Cuota A · banco','Cuota B · efectivo','Total','Estado','Pago A','Pago B',''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuotas.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--border)', opacity: c.estado === 'futura' ? 0.45 : 1 }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{String(c.n_cuota).padStart(2,'0')}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{c.fecha_vencimiento}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#60A5FA' }}>$ {fmt(c.cuota_a_ars)}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#F0C060' }}>$ {fmt(c.cuota_b_ars)}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>$ {fmt(c.cuota_a_ars + c.cuota_b_ars)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: estadoBg[c.estado] || estadoBg.futura, color: estadoColor[c.estado] || estadoColor.futura, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                    {c.estado === 'pagada' ? '✓ Pagada' : c.estado === 'pendiente' ? '⏳ Pendiente' : c.estado === 'pagada_parcial' ? 'Parcial' : 'Futura'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{c.fecha_pago_a ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{c.fecha_pago_b ?? '—'}</td>
                <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => abrirModal(c)} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'system-ui', marginRight: 4 }}>
                    Pago
                  </button>
                  <button onClick={() => setEditModal({ ...c, cuota_a_ars: String(c.cuota_a_ars), cuota_b_ars: String(c.cuota_b_ars), monto_pagado_a: String(c.monto_pagado_a||0), monto_pagado_b: String(c.monto_pagado_b||0) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.5, marginRight: 4 }} title="Editar">✏️</button>
                  {confirmDel === c.id ? (
                    <>
                      <button onClick={() => eliminarCuota(c.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginRight: 4 }}>Sí</button>
                      <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDel(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.25, color: '#F87171' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity='1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity='0.25')}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Papelera */}
      {verPapelera && papelera.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F87171', marginBottom: 14 }}>🗑️ Papelera · cuotas eliminadas</div>
          {papelera.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < papelera.length-1 ? '1px solid rgba(239,68,68,0.1)' : 'none' }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                Cuota {String(c.n_cuota).padStart(2,'0')} · {c.fecha_vencimiento} · $ {fmt(c.cuota_a_ars + c.cuota_b_ars)}
              </div>
              <span style={{ background: estadoBg[c.estado]||estadoBg.futura, color: estadoColor[c.estado]||estadoColor.futura, padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{c.estado}</span>
              <button onClick={() => restaurarCuota(c)} style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                ↩ Restaurar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal pago */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Registrar pago · Cuota {String(modal.n_cuota).padStart(2,'0')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Vencimiento: {modal.fecha_vencimiento}</p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#60A5FA', fontWeight: 600, marginBottom: 8 }}>CUOTA A — Transferencia bancaria (esperado: $ {fmt(modal.cuota_a_ars)})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Monto recibido $</div>
                  <input type="number" value={pagoA} onChange={e => setPagoA(e.target.value)} placeholder={fmt(modal.cuota_a_ars)} style={inputStyle}/>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Fecha de pago</div>
                  <input type="date" value={fechaA} onChange={e => setFechaA(e.target.value)} style={{ ...inputStyle, fontFamily: 'system-ui', fontSize: 13 }}/>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#F0C060', fontWeight: 600, marginBottom: 8 }}>CUOTA B — Efectivo (esperado: $ {fmt(modal.cuota_b_ars)})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Monto recibido $</div>
                  <input type="number" value={pagoB} onChange={e => setPagoB(e.target.value)} placeholder={fmt(modal.cuota_b_ars)} style={inputStyle}/>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Fecha de pago</div>
                  <input type="date" value={fechaB} onChange={e => setFechaB(e.target.value)} style={{ ...inputStyle, fontFamily: 'system-ui', fontSize: 13 }}/>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={guardarPago} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edición cuota */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 520, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Editar cuota {String(editModal.n_cuota).padStart(2,'0')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>N° cuota</label>
                <input type="number" value={editModal.n_cuota} onChange={e => setEditModal((d: any) => ({...d, n_cuota: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Fecha vencimiento</label>
                <input type="date" value={editModal.fecha_vencimiento} onChange={e => setEditModal((d: any) => ({...d, fecha_vencimiento: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Cuota A ARS $</label>
                <input type="number" value={editModal.cuota_a_ars} onChange={e => setEditModal((d: any) => ({...d, cuota_a_ars: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Cuota B ARS $</label>
                <input type="number" value={editModal.cuota_b_ars} onChange={e => setEditModal((d: any) => ({...d, cuota_b_ars: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={editModal.estado} onChange={e => setEditModal((d: any) => ({...d, estado: e.target.value}))} style={inputStyle}>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="pagada_parcial">Pagada parcial</option>
                  <option value="futura">Futura</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pagado A $</label>
                <input type="number" value={editModal.monto_pagado_a} onChange={e => setEditModal((d: any) => ({...d, monto_pagado_a: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Fecha pago A</label>
                <input type="date" value={editModal.fecha_pago_a || ''} onChange={e => setEditModal((d: any) => ({...d, fecha_pago_a: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Pagado B $</label>
                <input type="number" value={editModal.monto_pagado_b} onChange={e => setEditModal((d: any) => ({...d, monto_pagado_b: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Fecha pago B</label>
                <input type="date" value={editModal.fecha_pago_b || ''} onChange={e => setEditModal((d: any) => ({...d, fecha_pago_b: e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditModal(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={guardarEdicionCuota} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
