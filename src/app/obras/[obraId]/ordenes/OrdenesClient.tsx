'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)',
  fontFamily: 'system-ui', fontSize: 13, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

export default function OrdenesClient({ ordenesIniciales, obraId }: { ordenesIniciales: any[], obraId: string }) {
  const [ordenes, setOrdenes] = useState(ordenesIniciales.filter((o: any) => !o.eliminado))
  const [papelera, setPapelera] = useState(ordenesIniciales.filter((o: any) => o.eliminado))
  const [editando, setEditando] = useState<any>(null)
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [verPapelera, setVerPapelera] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3500) }

  const guardarEdicion = async () => {
    if (!editando) return
    setGuardando(true)
    const { error } = await supabase.from('ordenes_pago').update({
      fecha: editando.fecha,
      monto_efectivo: parseFloat(editando.monto_efectivo) || 0,
      monto_transfer: parseFloat(editando.monto_transfer) || 0,
      monto_cheque: parseFloat(editando.monto_cheque) || 0,
      notas: editando.notas || null,
    }).eq('id', editando.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setOrdenes(os => os.map(o => o.id === editando.id ? {
        ...o, fecha: editando.fecha,
        monto_efectivo: parseFloat(editando.monto_efectivo) || 0,
        monto_transfer: parseFloat(editando.monto_transfer) || 0,
        monto_cheque: parseFloat(editando.monto_cheque) || 0,
        notas: editando.notas || null,
      } : o))
      setEditando(null)
      flash('✓ Orden actualizada')
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    const { error } = await supabase.from('ordenes_pago').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const o = ordenes.find(x => x.id === id)
      setOrdenes(os => os.filter(x => x.id !== id))
      if (o) setPapelera(p => [o, ...p])
      setConfirmDel(null)
      flash('✓ Orden eliminada · podés restaurarla')
    }
  }

  const restaurar = async (orden: any) => {
    const { error } = await supabase.from('ordenes_pago').update({ eliminado: false }).eq('id', orden.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setOrdenes(os => [{ ...orden, eliminado: false }, ...os].sort((a, b) => b.numero - a.numero))
      setPapelera(p => p.filter(x => x.id !== orden.id))
      flash('✓ Orden restaurada')
    }
  }

  const totalEmitido  = ordenes.reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0)
  const totalPagado   = ordenes.filter(o => o.estado === 'pagada').reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0)
  const totalPendiente = ordenes.filter(o => o.estado === 'emitida').reduce((a, o) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0)

  return (
    <>
      {mensaje && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600
        }}>{mensaje}</div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total emitido',      valor: `$ ${fmt(totalEmitido)}`,   color: 'var(--text-primary)' },
          { label: 'Pendiente de pago',  valor: `$ ${fmt(totalPendiente)}`, color: '#F59E0B' },
          { label: 'Total pagado',       valor: `$ ${fmt(totalPagado)}`,    color: 'var(--success)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Botón papelera */}
      {papelera.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button onClick={() => setVerPapelera(v => !v)} style={{ background: 'transparent', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
            🗑️ Papelera · {papelera.length}
          </button>
        </div>
      )}

      {/* Papelera */}
      {verPapelera && papelera.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F87171', marginBottom: 14 }}>🗑️ Papelera · órdenes eliminadas</div>
          {papelera.map((o, i) => {
            const total = (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0)
            const prov = o.certificados?.proveedores
            return (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < papelera.length-1 ? '1px solid rgba(239,68,68,0.1)' : 'none', opacity: 0.8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>OP N°{String(o.numero).padStart(4,'0')} · {prov?.razon_social || '—'} · $ {fmt(total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{o.fecha} · {o.estado}</div>
                </div>
                <button onClick={() => restaurar(o)} style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                  ↩ Restaurar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-table-head)' }}>
              {['N° OP','Fecha','Proveedor','Cert.','Descripción','Transfer.','Efectivo','Cheque','Total','Estado',''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenes.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay órdenes de pago.</td></tr>
            )}
            {ordenes.map((o, idx) => {
              const total = (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0)
              const prov = o.certificados?.proveedores
              return (
                <tr key={o.id} style={{ borderTop: '1px solid var(--border)', background: idx%2===0 ? 'transparent' : 'var(--row-alt)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#F0C060' }}>{String(o.numero).padStart(4,'0')}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{o.fecha}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                    <Link href={`/obras/${obraId}/proveedores/${prov?.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {prov?.razon_social || '—'}
                    </Link>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{prov?.rubro}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    N°{String(o.certificados?.numero || '').padStart(2,'0')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.certificados?.descripcion || o.certificados?.notas || '—'}
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
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>$ {fmt(total)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {o.estado === 'pagada'
                      ? <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>✓ Pagada</span>
                      : <a href={`/obras/${obraId}/caja?op=${o.id}`} style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>⏳ A pagar →</a>
                    }
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditando({ ...o, monto_efectivo: String(o.monto_efectivo||0), monto_transfer: String(o.monto_transfer||0), monto_cheque: String(o.monto_cheque||0) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.5, marginRight: 4 }} title="Editar">✏️</button>
                    {confirmDel === o.id ? (
                      <>
                        <button onClick={() => eliminar(o.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginRight: 4 }}>Sí</button>
                        <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>No</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDel(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.25, color: '#F87171' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.25')}>✕</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal edición */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 460, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Editar orden N°{String(editando.numero).padStart(4,'0')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={editando.fecha} onChange={e => setEditando((d: any) => ({...d, fecha: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto transferencia $</label>
                <input type="number" value={editando.monto_transfer} onChange={e => setEditando((d: any) => ({...d, monto_transfer: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto efectivo $</label>
                <input type="number" value={editando.monto_efectivo} onChange={e => setEditando((d: any) => ({...d, monto_efectivo: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto cheque $</label>
                <input type="number" value={editando.monto_cheque} onChange={e => setEditando((d: any) => ({...d, monto_cheque: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <input value={editando.notas || ''} onChange={e => setEditando((d: any) => ({...d, notas: e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditando(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
