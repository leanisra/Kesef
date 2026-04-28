'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const precioTotal = (u: any) =>
  Math.round((u.m2_cubierta || 0) * (u.precio_m2_usd || 0) +
    (u.m2_semi || 0) * (u.precio_m2_usd || 0) * 0.5 +
    (u.m2_descubierto || 0) * (u.precio_m2_usd || 0) * 0.33)

const estadoColor: Record<string, { bg: string, text: string }> = {
  vendido:    { bg: 'rgba(34,197,94,0.12)',  text: '#4ADE80' },
  disponible: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA' },
  reservado:  { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
}

const PISOS = ['SS','PB','1','2','3','4','5','6','7','8','9','10','Terraza']
const ESTADOS = ['disponible','reservado','vendido']

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)',
  fontFamily: 'monospace', fontSize: 13, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

export default function UnidadesClient({ unidadesIniciales, obraId }: { unidadesIniciales: any[], obraId: string }) {
  const [unidades, setUnidades] = useState(unidadesIniciales)
  const [editando, setEditando] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [modalNueva, setModalNueva] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [nueva, setNueva] = useState({
    piso: '1', codigo: '', tipo: '', m2_cubierta: '', m2_semi: '',
    m2_descubierto: '', precio_m2_usd: '', estado: 'disponible'
  })

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3000) }

  const cargarHistorial = async () => {
    const { data } = await supabase.from('historial')
      .select('*')
      .eq('obra_id', obraId)
      .eq('tabla', 'unidades')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistorial(data || [])
  }

  const guardarEdicion = async () => {
    if (!editando) return
    setGuardando(true)
    const antes = unidades.find(u => u.id === editando.id)
    const despues = {
      piso: editando.piso, codigo: editando.codigo, tipo: editando.tipo,
      m2_cubierta: parseFloat(editando.m2_cubierta) || 0,
      m2_semi: parseFloat(editando.m2_semi) || 0,
      m2_descubierto: parseFloat(editando.m2_descubierto) || 0,
      precio_m2_usd: parseFloat(editando.precio_m2_usd) || 0,
      estado: editando.estado,
    }
    const { error } = await supabase.from('unidades').update(despues).eq('id', editando.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      await supabase.from('historial').insert({
        tabla: 'unidades', registro_id: editando.id, obra_id: obraId,
        accion: 'edicion', datos_antes: antes, datos_despues: despues,
        descripcion: `Unidad ${editando.codigo} editada`,
      })
      setUnidades(us => us.map(u => u.id === editando.id ? { ...u, ...despues } : u))
      setEditando(null)
      flash('✓ Unidad actualizada')
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    const unidad = unidades.find(u => u.id === id)
    const { error } = await supabase.from('unidades').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      await supabase.from('historial').insert({
        tabla: 'unidades', registro_id: id, obra_id: obraId,
        accion: 'eliminacion', datos_antes: unidad, datos_despues: null,
        descripcion: `Unidad ${unidad?.codigo} eliminada`,
      })
      setUnidades(us => us.filter(u => u.id !== id))
      setConfirmDel(null)
      flash('✓ Eliminada · podés restaurarla desde el historial')
    }
  }

  const restaurar = async (id: string, datosAntes: any) => {
    const { error } = await supabase.from('unidades')
      .update({ ...datosAntes, eliminado: false }).eq('id', id)
    if (error) { flash('❌ Error al restaurar') }
    else {
      setUnidades(us => [...us, { ...datosAntes, eliminado: false }])
      await cargarHistorial()
      flash('✓ Unidad restaurada')
    }
  }

  const agregarNueva = async () => {
    if (!nueva.codigo || !nueva.piso) { flash('❌ Completá al menos piso y código'); return }
    setGuardando(true)
    const maxOrden = Math.max(...unidades.map(u => u.orden || 0), 0)
    const { data, error } = await supabase.from('unidades').insert({
      obra_id: obraId, piso: nueva.piso, codigo: nueva.codigo, tipo: nueva.tipo,
      m2_cubierta: parseFloat(nueva.m2_cubierta) || 0,
      m2_semi: parseFloat(nueva.m2_semi) || 0,
      m2_descubierto: parseFloat(nueva.m2_descubierto) || 0,
      precio_m2_usd: parseFloat(nueva.precio_m2_usd) || 0,
      estado: nueva.estado, orden: maxOrden + 1, eliminado: false,
    }).select().single()
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      await supabase.from('historial').insert({
        tabla: 'unidades', registro_id: data.id, obra_id: obraId,
        accion: 'creacion', datos_antes: null, datos_despues: data,
        descripcion: `Unidad ${data.codigo} creada`,
      })
      setUnidades(us => [...us, data])
      setModalNueva(false)
      setNueva({ piso: '1', codigo: '', tipo: '', m2_cubierta: '', m2_semi: '', m2_descubierto: '', precio_m2_usd: '', estado: 'disponible' })
      flash('✓ Unidad agregada')
    }
    setGuardando(false)
  }

  const vendidas = unidades.filter(u => u.estado === 'vendido').length
  const disponibles = unidades.filter(u => u.estado === 'disponible').length

  return (
    <>
      {mensaje && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600
        }}>{mensaje}</div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Vendidas', valor: `${vendidas} / ${unidades.length}`, color: '#4ADE80' },
          { label: 'Disponibles', valor: disponibles, color: '#60A5FA' },
          { label: 'Reservadas', valor: unidades.filter(u => u.estado === 'reservado').length, color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        <button onClick={() => { setVerHistorial(v => !v); cargarHistorial() }} style={{
          background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui'
        }}>📋 {verHistorial ? 'Ocultar historial' : 'Ver historial'}</button>
        <button onClick={() => setModalNueva(true)} style={{
          background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6,
          padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui'
        }}>＋ Agregar unidad</button>
      </div>

      {/* Historial */}
      {verHistorial && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>📋 Historial de cambios</div>
          {historial.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay cambios registrados todavía.</div>
            : historial.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < historial.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>
                  {h.accion === 'creacion' ? '✅' : h.accion === 'eliminacion' ? '🗑️' : '✏️'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{h.descripcion}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(h.created_at).toLocaleString('es-AR')}
                  </div>
                </div>
                {h.accion === 'eliminacion' && (
                  <button onClick={() => restaurar(h.registro_id, h.datos_antes)} style={{
                    background: 'rgba(59,130,246,0.12)', color: '#60A5FA',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6,
                    padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui'
                  }}>↩ Restaurar</button>
                )}
              </div>
            ))
          }
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          ✏️ para editar · ✕ para eliminar (se puede restaurar desde el historial)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-table-head)' }}>
              {['Piso','Código','Tipo','M² cub.','M² semi','USD/m²','Total USD','Estado',''].map(h => (
                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unidades.map((u, idx) => {
              const total = precioTotal(u)
              const st = estadoColor[u.estado] || estadoColor.disponible
              return (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--row-alt)' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{u.piso}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{u.codigo}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{u.tipo || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{u.m2_cubierta}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{u.m2_semi || '—'}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#F0C060', fontSize: 12 }}>
                    {u.precio_m2_usd > 0 ? `USD ${fmt(u.precio_m2_usd)}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {total > 0 ? `USD ${fmt(total)}` : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: st.bg, color: st.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                      {u.estado === 'vendido' ? '✓ Vendida' : u.estado === 'reservado' ? 'Reservada' : 'Disponible'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditando({ ...u, m2_cubierta: String(u.m2_cubierta), m2_semi: String(u.m2_semi || 0), m2_descubierto: String(u.m2_descubierto || 0), precio_m2_usd: String(u.precio_m2_usd) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginRight: 6, opacity: 0.6 }}>✏️</button>
                    {confirmDel === u.id
                      ? <>
                          <button onClick={() => eliminar(u.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginRight: 4 }}>Sí</button>
                          <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>No</button>
                        </>
                      : <button onClick={() => setConfirmDel(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.3, color: '#F87171' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>✕</button>
                    }
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
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 520, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Editar · {editando.codigo}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Piso</label>
                <select value={editando.piso} onChange={e => setEditando((d: any) => ({ ...d, piso: e.target.value }))} style={inputStyle}>
                  {PISOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Código</label>
                <input value={editando.codigo} onChange={e => setEditando((d: any) => ({ ...d, codigo: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tipo</label>
                <input value={editando.tipo || ''} onChange={e => setEditando((d: any) => ({ ...d, tipo: e.target.value }))} style={inputStyle} placeholder="ej: 3 AMB CF" />
              </div>
              <div>
                <label style={labelStyle}>M² cubiertos</label>
                <input type="number" value={editando.m2_cubierta} onChange={e => setEditando((d: any) => ({ ...d, m2_cubierta: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>M² semicubiertos</label>
                <input type="number" value={editando.m2_semi} onChange={e => setEditando((d: any) => ({ ...d, m2_semi: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>M² descubiertos</label>
                <input type="number" value={editando.m2_descubierto} onChange={e => setEditando((d: any) => ({ ...d, m2_descubierto: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Precio USD/m²</label>
                <input type="number" value={editando.precio_m2_usd} onChange={e => setEditando((d: any) => ({ ...d, precio_m2_usd: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Estado</label>
                <select value={editando.estado} onChange={e => setEditando((d: any) => ({ ...d, estado: e.target.value }))} style={inputStyle}>
                  {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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

      {/* Modal nueva */}
      {modalNueva && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 520, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Nueva unidad</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Piso *</label>
                <select value={nueva.piso} onChange={e => setNueva(n => ({ ...n, piso: e.target.value }))} style={inputStyle}>
                  {PISOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Código *</label>
                <input value={nueva.codigo} onChange={e => setNueva(n => ({ ...n, codigo: e.target.value }))} style={inputStyle} placeholder="ej: 901" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tipo</label>
                <input value={nueva.tipo} onChange={e => setNueva(n => ({ ...n, tipo: e.target.value }))} style={inputStyle} placeholder="ej: 3 AMB CF" />
              </div>
              <div>
                <label style={labelStyle}>M² cubiertos</label>
                <input type="number" value={nueva.m2_cubierta} onChange={e => setNueva(n => ({ ...n, m2_cubierta: e.target.value }))} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>M² semicubiertos</label>
                <input type="number" value={nueva.m2_semi} onChange={e => setNueva(n => ({ ...n, m2_semi: e.target.value }))} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>M² descubiertos</label>
                <input type="number" value={nueva.m2_descubierto} onChange={e => setNueva(n => ({ ...n, m2_descubierto: e.target.value }))} style=
{inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Precio USD/m²</label>
                <input type="number" value={nueva.precio_m2_usd} onChange={e => setNueva(n => ({ ...n, precio_m2_usd: e.target.value }))} style={inputStyle} placeholder="0" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Estado</label>
                <select value={nueva.estado} onChange={e => setNueva(n => ({ ...n, estado: e.target.value }))} style={inputStyle}>
                  {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalNueva(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={agregarNueva} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
