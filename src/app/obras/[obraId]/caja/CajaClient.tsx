'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const diasHasta = (fecha: string) => {
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const venc = new Date(fecha); venc.setHours(0,0,0,0)
  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)',
  fontFamily: 'system-ui', fontSize: 13, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

export default function CajaClient({ cajas, movimientosIniciales, obraId, ordenesPendientes, chequesIniciales, proveedores, opPreseleccionada }: {
  cajas: any[], movimientosIniciales: any[], obraId: string, ordenesPendientes: any[], chequesIniciales: any[], proveedores: any[], opPreseleccionada?: string | null
}) {
  const [movimientos, setMovimientos] = useState(movimientosIniciales)
  const [ordenes, setOrdenes] = useState(ordenesPendientes)
  const [cheques, setCheques] = useState(chequesIniciales)
  const [cajaActiva, setCajaActiva] = useState<string>(() => cajas?.[0]?.id ?? '')
  const [tab, setTab] = useState<'movimientos'|'nuevo'|'cheques'|'nuevo_cheque'>(opPreseleccionada ? 'nuevo' : 'movimientos')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<string>(opPreseleccionada || '')
  const [tcHoy, setTcHoy] = useState<number>(1415)
  const [tcLabel, setTcLabel] = useState<string>('cargando...')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [confirmCambio, setConfirmCambio] = useState<{id: string, estado: string}|null>(null)

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(r => r.json())
      .then(d => {
        const promedio = Math.round((d.compra + d.venta) / 2)
        setTcHoy(promedio)
        setTcLabel(`$ ${promedio.toLocaleString('es-AR')}`)
      })
      .catch(() => setTcLabel('$ 1.415'))
  }, [])

  useEffect(() => {
    if (opPreseleccionada && ordenes.length > 0) {
      aplicarOrden(opPreseleccionada, true)
    }
  }, [opPreseleccionada, ordenes])

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'ingreso', concepto: '', contraparte: '', monto_ars: '', monto_usd: '',
  })

  const [formCheque, setFormCheque] = useState({
    tipo: 'cheque', numero: '', banco: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '', monto: '', beneficiario: '',
    proveedor_id: '', orden_pago_id: '', notas: '',
  })

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3500) }
  const cajaActivaObj = cajas.find(c => c.id === cajaActiva)

  const aplicarOrden = (ordenId: string, esMovimiento = true) => {
    if (!ordenId) {
      if (esMovimiento) setOrdenSeleccionada('')
      else setFormCheque(f => ({...f, orden_pago_id: ''}))
      return
    }
    const orden = ordenes.find(o => o.id === ordenId)
    if (!orden) return

    const proveedor = orden.certificados?.proveedores?.razon_social || ''
    const certNum = String(orden.certificados?.numero || '').padStart(2, '0')
    const total = (orden.monto_transfer||0) + (orden.monto_efectivo||0) + (orden.monto_cheque||0)

    if (esMovimiento) {
      setOrdenSeleccionada(ordenId)
      const concepto = `OP N°${String(orden.numero).padStart(4,'0')} - ${proveedor} - Cert. N°${certNum}`
      let monto = ''
      if (cajaActivaObj?.nombre === 'Banco ARS' && orden.monto_transfer > 0) monto = String(orden.monto_transfer)
      else if (cajaActivaObj?.nombre === 'Cash ARS' && orden.monto_efectivo > 0) monto = String(orden.monto_efectivo)
      else if (orden.monto_cheque > 0) monto = String(orden.monto_cheque)
      else monto = String(total)
      setForm(f => ({ ...f, tipo: 'egreso', concepto, contraparte: proveedor, monto_ars: monto }))
    } else {
      setFormCheque(f => ({
        ...f, orden_pago_id: ordenId,
        monto: String(total),
        beneficiario: proveedor || f.beneficiario,
      }))
    }
  }

  const guardarMovimiento = async () => {
    if (!form.concepto || (!form.monto_ars && !form.monto_usd)) {
      flash('❌ Completá el concepto y al menos un monto'); return
    }
    setGuardando(true)
    const { data, error } = await supabase.from('movimientos_caja').insert({
      caja_id: cajaActiva, obra_id: obraId, fecha: form.fecha,
      tipo: form.tipo, concepto: form.concepto,
      contraparte: form.contraparte || null,
      monto_ars: form.monto_ars ? parseFloat(form.monto_ars) : null,
      monto_usd: form.monto_usd ? parseFloat(form.monto_usd) : null,
      tc_blue: tcHoy, origen: 'manual',
      orden_pago_id: ordenSeleccionada || null,
    }).select().single()

    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setMovimientos(m => [data, ...m])
      if (ordenSeleccionada) {
        const orden = ordenes.find(o => o.id === ordenSeleccionada)
        if (orden) {
          const montoEstePago = form.monto_ars ? parseFloat(form.monto_ars) : 0
          const { data: movsPrevios } = await supabase.from('movimientos_caja').select('monto_ars').eq('orden_pago_id', ordenSeleccionada)
          const totalPagado = (movsPrevios?.reduce((a, m) => a + (m.monto_ars || 0), 0) || 0) + montoEstePago
          const totalOrden = (orden.monto_efectivo||0) + (orden.monto_transfer||0) + (orden.monto_cheque||0)
          if (totalPagado >= totalOrden * 0.99) {
            await supabase.from('ordenes_pago').update({ estado: 'pagada', fecha_pago: form.fecha }).eq('id', ordenSeleccionada)
            await supabase.from('certificados').update({ estado: 'pagado' }).eq('id', orden.certificado_id)
            setOrdenes(os => os.filter(o => o.id !== ordenSeleccionada))
          }
        }
      }
      setForm({ fecha: new Date().toISOString().split('T')[0], tipo: 'ingreso', concepto: '', contraparte: '', monto_ars: '', monto_usd: '' })
      setOrdenSeleccionada('')
      flash('✓ Movimiento registrado')
      setTab('movimientos')
    }
    setGuardando(false)
  }

  const guardarCheque = async () => {
    if (!formCheque.numero || !formCheque.monto || !formCheque.fecha_vencimiento) {
      flash('❌ Completá número, monto y fecha de vencimiento'); return
    }
    setGuardando(true)
    const { data, error } = await supabase.from('cheques').insert({
      obra_id: obraId, tipo: formCheque.tipo, numero: formCheque.numero,
      banco: formCheque.banco || null, fecha_emision: formCheque.fecha_emision,
      fecha_vencimiento: formCheque.fecha_vencimiento,
      monto: parseFloat(formCheque.monto),
      beneficiario: formCheque.beneficiario || null,
      proveedor_id: formCheque.proveedor_id || null,
      orden_pago_id: formCheque.orden_pago_id || null,
      estado: 'emitido', notas: formCheque.notas || null,
    }).select('*, proveedores(razon_social)').single()

    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCheques(cs => [...cs, data].sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()))
      setFormCheque({ tipo: 'cheque', numero: '', banco: '', fecha_emision: new Date().toISOString().split('T')[0], fecha_vencimiento: '', monto: '', beneficiario: '', proveedor_id: '', orden_pago_id: '', notas: '' })
      setTab('cheques')
      flash('✓ Cheque registrado')
    }
    setGuardando(false)
  }

  const cambiarEstadoCheque = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase.from('cheques').update({ estado: nuevoEstado }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCheques(cs => cs.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c))
      setConfirmCambio(null)
      flash('✓ Estado actualizado')
    }
  }

  const movsFiltrados = movimientos.filter(m => m.caja_id === cajaActiva)
  const ingresos = movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + (m.monto_ars || 0), 0)
  const egresos = movsFiltrados.filter(m => m.tipo === 'egreso').reduce((a, m) => a + (m.monto_ars || 0), 0)

  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const en7dias = new Date(hoy.getTime() + 7*24*60*60*1000)
  const chequesVencenProximo = cheques.filter(c => { const v = new Date(c.fecha_vencimiento); v.setHours(0,0,0,0); return c.estado === 'emitido' && v >= hoy && v <= en7dias })
  const chequesVencidos = cheques.filter(c => { const v = new Date(c.fecha_vencimiento); v.setHours(0,0,0,0); return c.estado === 'emitido' && v < hoy })
  const chequesFiltrados = cheques.filter(c => filtroEstado === 'todos' ? true : c.estado === filtroEstado)

  const estadoColor: Record<string, { bg: string, text: string }> = {
    emitido:    { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
    depositado: { bg: 'rgba(34,197,94,0.12)',  text: '#4ADE80' },
    rechazado:  { bg: 'rgba(239,68,68,0.12)',  text: '#F87171' },
    anulado:    { bg: 'var(--tag-bg)',          text: 'var(--text-muted)' },
  }

  const OrdenDetalle = ({ ordenId }: { ordenId: string }) => {
    const o = ordenes.find(x => x.id === ordenId)
    if (!o) return null
    return (
      <div style={{ marginTop: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#F0C060' }}>
        {o.monto_transfer > 0 && <div>Transferencia: $ {fmt(o.monto_transfer)}</div>}
        {o.monto_efectivo > 0 && <div>Efectivo: $ {fmt(o.monto_efectivo)}</div>}
        {o.monto_cheque > 0 && <div>Cheque: $ {fmt(o.monto_cheque)}</div>}
      </div>
    )
  }

  const SelectorOrdenes = ({ value, onChange }: { value: string, onChange: (id: string) => void }) => (
    <>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, borderColor: value ? 'var(--accent)' : 'var(--border)', color: value ? '#F0C060' : 'var(--text-primary)' }}>
        <option value="">— Seleccioná una orden de pago —</option>
        {ordenes.map(o => {
          const proveedor = o.certificados?.proveedores?.razon_social || ''
          const certNum = String(o.certificados?.numero || '').padStart(2, '0')
          const total = (o.monto_transfer||0) + (o.monto_efectivo||0) + (o.monto_cheque||0)
          return <option key={o.id} value={o.id}>OP N°{String(o.numero).padStart(4,'0')} · {proveedor} · Cert.{certNum} · $ {fmt(total)}</option>
        })}
      </select>
      {value && <OrdenDetalle ordenId={value} />}
    </>
  )

  return (
    <>
      {mensaje && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600
        }}>{mensaje}</div>
      )}

      {/* TC Blue */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>TC Blue hoy · </span>
          <span style={{ color: '#F0C060', fontFamily: 'monospace', fontWeight: 600 }}>{tcLabel}</span>
        </div>
      </div>

      {/* Alertas cheques */}
      {chequesVencidos.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F87171' }}>{chequesVencidos.length} cheque{chequesVencidos.length > 1 ? 's' : ''} vencido{chequesVencidos.length > 1 ? 's' : ''} sin depositar</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{chequesVencidos.map(c => `N°${c.numero} · $ ${fmt(c.monto)}`).join(' · ')}</div>
          </div>
          <button onClick={() => setTab('cheques')} style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>Ver →</button>
        </div>
      )}
      {chequesVencenProximo.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>{chequesVencenProximo.length} cheque{chequesVencenProximo.length > 1 ? 's' : ''} vence{chequesVencenProximo.length > 1 ? 'n' : ''} en 7 días</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{chequesVencenProximo.map(c => `N°${c.numero} · vence ${c.fecha_vencimiento}`).join(' · ')}</div>
          </div>
          <button onClick={() => setTab('cheques')} style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>Ver →</button>
        </div>
      )}

      {/* Cajas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {cajas.map(cj => {
          const movsCaja = movimientos.filter(m => m.caja_id === cj.id)
          const saldoARS = movsCaja.reduce((a, m) => a + (m.tipo === 'ingreso' ? (m.monto_ars || 0) : -(m.monto_ars || 0)), 0)
          const saldoUSD = movsCaja.reduce((a, m) => a + (m.tipo === 'ingreso' ? (m.monto_usd || 0) : -(m.monto_usd || 0)), 0)
          const activa = cajaActiva === cj.id
          return (
            <div key={cj.id} onClick={() => { setCajaActiva(cj.id); setOrdenSeleccionada('') }} style={{
              background: 'var(--bg-card)', border: `1px solid ${activa ? 'var(--accent)' : 'var(--border)'}`,
              boxShadow: activa ? '0 0 0 1px var(--accent)' : 'none',
              borderRadius: 10, padding: '16px 20px', cursor: 'pointer'
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Caja {cj.nombre}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#F0C060' }}>
                {cj.moneda === 'ARS' ? `$ ${fmt(saldoARS)}` : `USD ${fmt(saldoUSD)}`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                {cj.nombre.includes('Banco') ? 'Galicia · actualización manual' : 'Carga manual'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Alerta órdenes pendientes */}
      {ordenes.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div style={{ flex: 1, fontSize: 13, color: '#F59E0B' }}>
            {ordenes.length} {ordenes.length === 1 ? 'orden de pago pendiente' : 'órdenes de pago pendientes'} de registrar en caja
          </div>
          <button onClick={() => setTab('nuevo')} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
            Registrar ahora →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          { key: 'movimientos', label: `Movimientos · ${movsFiltrados.length}` },
          { key: 'nuevo', label: '＋ Nuevo movimiento' },
          { key: 'cheques', label: `🏦 Cheques · ${cheques.filter(c => c.estado === 'emitido').length} emitidos` },
          { key: 'nuevo_cheque', label: '＋ Nuevo cheque' },
        ].map(t => (
          <div key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: tab === t.key ? '#F0C060' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t.key ? '#F0C060' : 'transparent'}`,
          }}>{t.label}</div>
        ))}
      </div>

      {/* Movimientos */}
      {tab === 'movimientos' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Ingresos', valor: ingresos, color: '#4ADE80' },
              { label: 'Egresos', valor: egresos, color: '#F87171' },
              { label: 'Neto', valor: ingresos - egresos, color: ingresos - egresos >= 0 ? '#4ADE80' : '#F87171' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 18px', flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: k.color, marginTop: 4 }}>
                  {k.valor >= 0 ? '' : '-'}$ {fmt(Math.abs(k.valor))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-head)' }}>
                  {['Fecha','Concepto','Contraparte','Ingreso','Egreso'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movsFiltrados.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Sin movimientos. <span style={{ color: '#60A5FA', cursor: 'pointer' }} onClick={() => setTab('nuevo')}>Agregar el primero →</span>
                  </td></tr>
                ) : movsFiltrados.map((m, i) => (
                  <tr key={m.id || i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{m.fecha}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      {m.concepto}
                      {m.orden_pago_id && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 10 }}>OP</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>{m.contraparte || '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#4ADE80' }}>{m.tipo === 'ingreso' ? `$ ${fmt(m.monto_ars)}` : '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#F87171' }}>{m.tipo === 'egreso' ? `$ ${fmt(m.monto_ars)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Nuevo movimiento */}
      {tab === 'nuevo' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 28, maxWidth: 600 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Nuevo movimiento</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Caja *</label>
            <select value={cajaActiva} onChange={e => { setCajaActiva(e.target.value); setOrdenSeleccionada('') }} style={inputStyle}>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.moneda}</option>)}
            </select>
          </div>
          {ordenes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Orden de pago pendiente (opcional)</label>
              <SelectorOrdenes value={ordenSeleccionada} onChange={id => aplicarOrden(id, true)} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({...f, fecha: e.target.value}))} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))} style={inputStyle}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Concepto *</label>
            <input type="text" value={form.concepto} onChange={e => setForm(f => ({...f, concepto: e.target.value}))} placeholder="ej: Cuota 01 Depto 801..." style={inputStyle}/>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Contraparte</label>
            <input type="text" value={form.contraparte} onChange={e => setForm(f => ({...f, contraparte: e.target.value}))} placeholder="ej: Sharon y Mati..." style={inputStyle}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Monto ARS $</label>
              <input type="number" value={form.monto_ars} onChange={e => setForm(f => ({...f, monto_ars: e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Monto USD (opcional)</label>
              <input type="number" value={form.monto_usd} onChange={e => setForm(f => ({...f, monto_usd: e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
          </div>
          <button onClick={guardarMovimiento} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
            {guardando ? 'Guardando...' : '✓ Guardar movimiento'}
          </button>
        </div>
      )}

      {/* Lista cheques */}
      {tab === 'cheques' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Emitidos', valor: `$ ${fmt(cheques.filter(c=>c.estado==='emitido').reduce((a,c)=>a+c.monto,0))}`, color: '#F59E0B' },
              { label: 'Depositados', valor: `$ ${fmt(cheques.filter(c=>c.estado==='depositado').reduce((a,c)=>a+c.monto,0))}`, color: '#4ADE80' },
              { label: 'Vencen en 7d', valor: chequesVencenProximo.length, color: chequesVencenProximo.length > 0 ? '#F59E0B' : 'var(--text-muted)' },
              { label: 'Vencidos', valor: chequesVencidos.length, color: chequesVencidos.length > 0 ? '#F87171' : 'var(--text-muted)' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: 12 }}>
              <option value="todos">Todos</option>
              <option value="emitido">Emitidos</option>
              <option value="depositado">Depositados</option>
              <option value="rechazado">Rechazados</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {chequesFiltrados.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay cheques. <span style={{ color: '#60A5FA', cursor: 'pointer' }} onClick={() => setTab('nuevo_cheque')}>Registrar el primero →</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-head)' }}>
                    {['Tipo','N°','Banco','Beneficiario','Vencimiento','Días','Monto','Estado',''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chequesFiltrados.map((c, idx) => {
                    const dias = diasHasta(c.fecha_vencimiento)
                    const esVencido = dias < 0 && c.estado === 'emitido'
                    const esProximo = dias >= 0 && dias <= 7 && c.estado === 'emitido'
                    const st = estadoColor[c.estado] || estadoColor.emitido
                    return (
                      <tr key={c.id} style={{ borderTop: '1px solid var(--border)', background: esVencido ? 'rgba(239,68,68,0.04)' : esProximo ? 'rgba(245,158,11,0.04)' : idx%2===0 ? 'transparent' : 'var(--row-alt)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: c.tipo === 'echeq' ? 'rgba(168,85,247,0.12)' : 'rgba(59,130,246,0.12)', color: c.tipo === 'echeq' ? '#A855F7' : '#60A5FA', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                            {c.tipo === 'echeq' ? 'E-CHEQ' : 'CHEQUE'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{c.numero}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{c.banco || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.beneficiario || c.proveedores?.razon_social || '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: esVencido ? '#F87171' : esProximo ? '#F59E0B' : 'var(--text-primary)', fontWeight: esVencido||esProximo ? 600 : 400 }}>
                          {c.fecha_vencimiento}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>
                          {c.estado === 'emitido'
                            ? <span style={{ color: esVencido ? '#F87171' : esProximo ? '#F59E0B' : 'var(--text-muted)', fontWeight: 600 }}>
                                {esVencido ? `−${Math.abs(dias)}d` : dias === 0 ? '¡hoy!' : `${dias}d`}
                              </span>
                            : '—'
                          }
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#F0C060' }}>$ {fmt(c.monto)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: st.bg, color: st.text, padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                            {c.estado === 'emitido' ? '⏳ Emitido' : c.estado === 'depositado' ? '✓ Depositado' : c.estado === 'rechazado' ? '✕ Rechazado' : 'Anulado'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {c.estado === 'emitido' && (
                            confirmCambio?.id === c.id ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => cambiarEstadoCheque(c.id, confirmCambio!.estado)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>Sí</button>
                                <button onClick={() => setConfirmCambio(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>No</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => setConfirmCambio({ id: c.id, estado: 'depositado' })} style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>✓ Depositado</button>
                                <button onClick={() => setConfirmCambio({ id: c.id, estado: 'rechazado' })} style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>✕ Rechazado</button>
                                <button onClick={() => setConfirmCambio({ id: c.id, estado: 'anulado' })} style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>Anular</button>
                              </div>
                            )
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Nuevo cheque */}
      {tab === 'nuevo_cheque' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 28, maxWidth: 580 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Registrar cheque / e-cheq</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={formCheque.tipo} onChange={e => setFormCheque(f => ({...f, tipo: e.target.value}))} style={inputStyle}>
                <option value="cheque">Cheque físico</option>
                <option value="echeq">E-cheq</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>N° cheque *</label>
              <input value={formCheque.numero} onChange={e => setFormCheque(f => ({...f, numero: e.target.value}))} placeholder="ej: 00012345" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Banco</label>
              <input value={formCheque.banco} onChange={e => setFormCheque(f => ({...f, banco: e.target.value}))} placeholder="ej: Galicia, Santander..." style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Monto $ *</label>
              <input type="number" value={formCheque.monto} onChange={e => setFormCheque(f => ({...f, monto: e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Fecha de emisión</label>
              <input type="date" value={formCheque.fecha_emision} onChange={e => setFormCheque(f => ({...f, fecha_emision: e.target.value}))} style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Fecha de vencimiento *</label>
              <input type="date" value={formCheque.fecha_vencimiento} onChange={e => setFormCheque(f => ({...f, fecha_vencimiento: e.target.value}))} style={inputStyle}/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Beneficiario</label>
              <input value={formCheque.beneficiario} onChange={e => setFormCheque(f => ({...f, beneficiario: e.target.value}))} placeholder="ej: BD Constructora SA" style={inputStyle}/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Proveedor (opcional)</label>
              <select value={formCheque.proveedor_id} onChange={e => setFormCheque(f => ({...f, proveedor_id: e.target.value}))} style={inputStyle}>
                <option value="">Sin asignar</option>
                {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
            </div>
            {ordenes.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Orden de pago pendiente (opcional)</label>
                <SelectorOrdenes value={formCheque.orden_pago_id} onChange={id => aplicarOrden(id, false)} />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Notas</label>
              <input value={formCheque.notas} onChange={e => setFormCheque(f => ({...f, notas: e.target.value}))} placeholder="Opcional" style={inputStyle}/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setTab('cheques')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
            <button onClick={guardarCheque} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
              {guardando ? 'Guardando...' : '✓ Registrar cheque'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
