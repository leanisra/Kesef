'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)',
  fontFamily: 'system-ui', fontSize: 13, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

const totalRubro = (r: any, items: any[]) =>
  items.filter(i => i.rubro_id === r.id).reduce((a, i) => a + ((i.cantidad||0) * ((i.costo_unit_mat||0) + (i.costo_unit_mo||0))), 0)

export default function PresupuestoClient({ rubrosIniciales, itemsIniciales, obraId }: {
  rubrosIniciales: any[], itemsIniciales: any[], obraId: string
}) {
  const [rubros, setRubros] = useState(rubrosIniciales.filter(r => !r.eliminado))
  const [items, setItems] = useState(itemsIniciales.filter(i => !i.eliminado))
  const [papeleraRubros, setPapeleraRubros] = useState(rubrosIniciales.filter(r => r.eliminado))
  const [papeleraItems, setPapeleraItems] = useState(itemsIniciales.filter(i => i.eliminado))
  const [verPapelera, setVerPapelera] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // Modal rubro
  const [modalRubro, setModalRubro] = useState<'nuevo'|'editar'|null>(null)
  const [editandoRubroId, setEditandoRubroId] = useState<string|null>(null)
  const [formRubro, setFormRubro] = useState({ codigo: '', descripcion: '', nivel: '1', parent_id: '' })
  const [confirmDelRubro, setConfirmDelRubro] = useState<string|null>(null)

  // Modal item
  const [modalItem, setModalItem] = useState<'nuevo'|'editar'|null>(null)
  const [editandoItemId, setEditandoItemId] = useState<string|null>(null)
  const [formItem, setFormItem] = useState({ descripcion: '', unidad: '', cantidad: '', costo_unit_mat: '', costo_unit_mo: '', rubro_id: '' })
  const [confirmDelItem, setConfirmDelItem] = useState<string|null>(null)

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3000) }

  // ── Rubros ──
  const guardarRubro = async () => {
    if (!formRubro.codigo || !formRubro.descripcion) { flash('❌ Completá código y descripción'); return }
    setGuardando(true)
    const maxOrden = Math.max(...rubros.map(r => r.orden||0), 0)

    if (modalRubro === 'nuevo') {
      const { data, error } = await supabase.from('presupuesto_rubros').insert({
        obra_id: obraId, codigo: formRubro.codigo, descripcion: formRubro.descripcion,
        nivel: parseInt(formRubro.nivel)||1, parent_id: formRubro.parent_id||null,
        orden: maxOrden + 1, eliminado: false,
      }).select().single()
      if (error) { flash('❌ Error: ' + error.message) }
      else { setRubros(rs => [...rs, data]); flash('✓ Rubro agregado') }
    } else {
      const { error } = await supabase.from('presupuesto_rubros').update({
        codigo: formRubro.codigo, descripcion: formRubro.descripcion,
        nivel: parseInt(formRubro.nivel)||1, parent_id: formRubro.parent_id||null,
      }).eq('id', editandoRubroId)
      if (error) { flash('❌ Error: ' + error.message) }
      else { setRubros(rs => rs.map(r => r.id===editandoRubroId ? {...r, ...formRubro, nivel: parseInt(formRubro.nivel)||1, parent_id: formRubro.parent_id||null} : r)); flash('✓ Rubro actualizado') }
    }
    setModalRubro(null); setGuardando(false)
  }

  const eliminarRubro = async (id: string) => {
    const { error } = await supabase.from('presupuesto_rubros').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const r = rubros.find(x => x.id===id)
      setRubros(rs => rs.filter(x => x.id!==id))
      if (r) setPapeleraRubros(p => [r, ...p])
      setConfirmDelRubro(null); flash('✓ Rubro eliminado')
    }
  }

  const restaurarRubro = async (r: any) => {
    const { error } = await supabase.from('presupuesto_rubros').update({ eliminado: false }).eq('id', r.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else { setRubros(rs => [...rs, {...r, eliminado:false}].sort((a,b)=>(a.orden||0)-(b.orden||0))); setPapeleraRubros(p=>p.filter(x=>x.id!==r.id)); flash('✓ Rubro restaurado') }
  }

  // ── Items ──
  const guardarItem = async () => {
    if (!formItem.descripcion || !formItem.rubro_id) { flash('❌ Completá descripción y rubro'); return }
    setGuardando(true)
    if (modalItem === 'nuevo') {
      const { data, error } = await supabase.from('presupuesto_items').insert({
        obra_id: obraId, rubro_id: formItem.rubro_id, descripcion: formItem.descripcion,
        unidad: formItem.unidad||null, cantidad: parseFloat(formItem.cantidad)||0,
        costo_unit_mat: parseFloat(formItem.costo_unit_mat)||0,
        costo_unit_mo: parseFloat(formItem.costo_unit_mo)||0, eliminado: false,
      }).select().single()
      if (error) { flash('❌ Error: ' + error.message) }
      else { setItems(is => [...is, data]); flash('✓ Ítem agregado') }
    } else {
      const { error } = await supabase.from('presupuesto_items').update({
        rubro_id: formItem.rubro_id, descripcion: formItem.descripcion,
        unidad: formItem.unidad||null, cantidad: parseFloat(formItem.cantidad)||0,
        costo_unit_mat: parseFloat(formItem.costo_unit_mat)||0,
        costo_unit_mo: parseFloat(formItem.costo_unit_mo)||0,
      }).eq('id', editandoItemId)
      if (error) { flash('❌ Error: ' + error.message) }
      else { setItems(is => is.map(i => i.id===editandoItemId ? {...i, ...formItem, cantidad:parseFloat(formItem.cantidad)||0, costo_unit_mat:parseFloat(formItem.costo_unit_mat)||0, costo_unit_mo:parseFloat(formItem.costo_unit_mo)||0} : i)); flash('✓ Ítem actualizado') }
    }
    setModalItem(null); setGuardando(false)
  }

  const eliminarItem = async (id: string) => {
    const { error } = await supabase.from('presupuesto_items').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const item = items.find(x => x.id===id)
      setItems(is => is.filter(x => x.id!==id))
      if (item) setPapeleraItems(p => [item, ...p])
      setConfirmDelItem(null); flash('✓ Ítem eliminado')
    }
  }

  const restaurarItem = async (item: any) => {
    const { error } = await supabase.from('presupuesto_items').update({ eliminado: false }).eq('id', item.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else { setItems(is => [...is, {...item, eliminado:false}]); setPapeleraItems(p=>p.filter(x=>x.id!==item.id)); flash('✓ Ítem restaurado') }
  }

  const rubrosNivel1 = rubros.filter(r => r.nivel===1).sort((a,b)=>(a.orden||0)-(b.orden||0))
  const rubrosNivel2 = rubros.filter(r => r.nivel===2)
  const totalPresup = rubrosNivel1.reduce((a, r) => a + totalRubro(r, items), 0)
  const totalPapelera = papeleraRubros.length + papeleraItems.length

  const abrirEditarRubro = (r: any) => {
    setFormRubro({ codigo: r.codigo||'', descripcion: r.descripcion||'', nivel: String(r.nivel||1), parent_id: r.parent_id||'' })
    setEditandoRubroId(r.id); setModalRubro('editar')
  }
  const abrirEditarItem = (i: any) => {
    setFormItem({ descripcion: i.descripcion||'', unidad: i.unidad||'', cantidad: String(i.cantidad||0), costo_unit_mat: String(i.costo_unit_mat||0), costo_unit_mo: String(i.costo_unit_mo||0), rubro_id: i.rubro_id||'' })
    setEditandoItemId(i.id); setModalItem('editar')
  }

  return (
    <>
      {mensaje && (
        <div style={{ position:'fixed', top:20, right:24, zIndex:999, background:mensaje.startsWith('✓')?'#16a34a':'#dc2626', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600 }}>{mensaje}</div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:28 }}>
        {[
          { label:'Total presupuestado', valor:`$ ${fmt(totalPresup)}`, color:'#60A5FA' },
          { label:'Rubros nivel 1', valor:rubrosNivel1.length, color:'var(--text-primary)' },
          { label:'Ítems cargados', valor:items.length, color:'#A855F7' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 20px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:700, color:k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Botones */}
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginBottom:20 }}>
        {totalPapelera > 0 && (
          <button onClick={() => setVerPapelera(v=>!v)} style={{ background:'transparent', color:'#F87171', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>
            🗑️ Papelera · {totalPapelera}
          </button>
        )}
        <button onClick={() => { setFormItem({descripcion:'',unidad:'',cantidad:'',costo_unit_mat:'',costo_unit_mo:'',rubro_id:rubros[0]?.id||''}); setModalItem('nuevo') }}
          style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>
          ＋ Agregar ítem
        </button>
        <button onClick={() => { setFormRubro({codigo:'',descripcion:'',nivel:'1',parent_id:''}); setModalRubro('nuevo') }}
          style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
          ＋ Agregar rubro
        </button>
      </div>

      {/* Papelera */}
      {verPapelera && (
        <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#F87171', marginBottom:14 }}>🗑️ Papelera · {totalPapelera} elementos</div>
          {papeleraRubros.map((r,i) => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'8px 0', borderBottom:'1px solid rgba(239,68,68,0.1)' }}>
              <span style={{ fontSize:18 }}>📁</span>
              <div style={{ flex:1, fontSize:13 }}><strong>Rubro</strong> {r.codigo} · {r.descripcion}</div>
              <button onClick={() => restaurarRubro(r)} style={{ background:'rgba(59,130,246,0.12)', color:'#60A5FA', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontFamily:'system-ui' }}>↩ Restaurar</button>
            </div>
          ))}
          {papeleraItems.map((item,i) => (
            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'8px 0', borderBottom:'1px solid rgba(239,68,68,0.1)' }}>
              <span style={{ fontSize:18 }}>📝</span>
              <div style={{ flex:1, fontSize:13 }}><strong>Ítem</strong> {item.descripcion} · {item.cantidad} {item.unidad}</div>
              <button onClick={() => restaurarItem(item)} style={{ background:'rgba(59,130,246,0.12)', color:'#60A5FA', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontFamily:'system-ui' }}>↩ Restaurar</button>
            </div>
          ))}
        </div>
      )}

      {/* Tabla rubros */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:600 }}>
          Árbol de rubros · {rubrosNivel1.length} rubros
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--bg-table-head)' }}>
              {['Código','Descripción','Ítems','Total presupuestado',''].map(h => (
                <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:11, color:'var(--text-muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rubrosNivel1.length===0?(
              <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No hay rubros. Agregá el primero.</td></tr>
            ):rubrosNivel1.map(r => {
              const tot = totalRubro(r, items)
              const hijos = rubrosNivel2.filter(h => h.parent_id===r.id)
              return (
                <>
                  <tr key={r.id} style={{ borderTop:'1px solid var(--border)', background:'var(--row-alt)' }}>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace', color:'#F0C060', fontSize:13, fontWeight:600 }}>{r.codigo}</td>
                    <td style={{ padding:'12px 16px', fontWeight:600, fontSize:14 }}>{r.descripcion}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text-secondary)', fontSize:13 }}>{items.filter(i=>i.rubro_id===r.id).length}</td>
                    <td style={{ padding:'12px 16px', fontFamily:'monospace', fontWeight:600 }}>{tot>0?`$ ${fmt(tot)}`:'—'}</td>
                    <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                      <Link href={`/obras/${obraId}/presupuesto/${r.id}`} style={{ color:'#60A5FA', fontSize:12, textDecoration:'none', marginRight:8 }}>Ver →</Link>
                      <button onClick={() => abrirEditarRubro(r)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, opacity:0.5, marginRight:4 }} title="Editar">✏️</button>
                      {confirmDelRubro===r.id?(
                        <>
                          <button onClick={() => eliminarRubro(r.id)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer', marginRight:4 }}>Sí</button>
                          <button onClick={() => setConfirmDelRubro(null)} style={{ background:'var(--border)', color:'var(--text-secondary)', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer' }}>No</button>
                        </>
                      ):(
                        <button onClick={() => setConfirmDelRubro(r.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.25, color:'#F87171' }}
                          onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                          onMouseLeave={e=>(e.currentTarget.style.opacity='0.25')}>✕</button>
                      )}
                    </td>
                  </tr>
                  {hijos.map(h => {
                    const totH = totalRubro(h, items)
                    return (
                      <tr key={h.id} style={{ borderTop:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 16px 10px 32px', fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{h.codigo}</td>
                        <td style={{ padding:'10px 16px 10px 32px', color:'var(--text-secondary)', fontSize:13 }}>{h.descripcion}</td>
                        <td style={{ padding:'10px 16px', color:'var(--text-muted)', fontSize:12 }}>{items.filter(i=>i.rubro_id===h.id).length}</td>
                        <td style={{ padding:'10px 16px', fontFamily:'monospace', fontSize:12 }}>{totH>0?`$ ${fmt(totH)}`:'—'}</td>
                        <td style={{ padding:'10px 16px', whiteSpace:'nowrap' }}>
                          <Link href={`/obras/${obraId}/presupuesto/${h.id}`} style={{ color:'var(--text-muted)', fontSize:12, textDecoration:'none', marginRight:8 }}>Ver →</Link>
                          <button onClick={() => abrirEditarRubro(h)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, opacity:0.5, marginRight:4 }}>✏️</button>
                          {confirmDelRubro===h.id?(
                            <>
                              <button onClick={() => eliminarRubro(h.id)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer', marginRight:4 }}>Sí</button>
                              <button onClick={() => setConfirmDelRubro(null)} style={{ background:'var(--border)', color:'var(--text-secondary)', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer' }}>No</button>
                            </>
                          ):(
                            <button onClick={() => setConfirmDelRubro(h.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.25, color:'#F87171' }}
                              onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                              onMouseLeave={e=>(e.currentTarget.style.opacity='0.25')}>✕</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Items del rubro */}
                  {items.filter(i=>i.rubro_id===r.id).map(item => (
                    <tr key={item.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'8px 16px 8px 40px', fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>ítem</td>
                      <td style={{ padding:'8px 16px 8px 40px', fontSize:12, color:'var(--text-secondary)' }}>{item.descripcion}</td>
                      <td style={{ padding:'8px 16px', fontSize:11, color:'var(--text-muted)' }}>{item.cantidad} {item.unidad}</td>
                      <td style={{ padding:'8px 16px', fontFamily:'monospace', fontSize:12 }}>
                        {((item.cantidad||0)*((item.costo_unit_mat||0)+(item.costo_unit_mo||0)))>0?`$ ${fmt((item.cantidad||0)*((item.costo_unit_mat||0)+(item.costo_unit_mo||0)))}`:'—'}
                      </td>
                      <td style={{ padding:'8px 16px', whiteSpace:'nowrap' }}>
                        <button onClick={() => abrirEditarItem(item)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.5, marginRight:4 }}>✏️</button>
                        {confirmDelItem===item.id?(
                          <>
                            <button onClick={() => eliminarItem(item.id)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer', marginRight:4 }}>Sí</button>
                            <button onClick={() => setConfirmDelItem(null)} style={{ background:'var(--border)', color:'var(--text-secondary)', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer' }}>No</button>
                          </>
                        ):(
                          <button onClick={() => setConfirmDelItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, opacity:0.25, color:'#F87171' }}
                            onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                            onMouseLeave={e=>(e.currentTarget.style.opacity='0.25')}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Rubro */}
      {modalRubro && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:28, width:460, maxWidth:'90vw' }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>{modalRubro==='nuevo'?'Nuevo rubro':'Editar rubro'}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Código *</label>
                <input value={formRubro.codigo} onChange={e=>setFormRubro(f=>({...f,codigo:e.target.value}))} placeholder="ej: 01.00" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Nivel</label>
                <select value={formRubro.nivel} onChange={e=>setFormRubro(f=>({...f,nivel:e.target.value}))} style={inputStyle}>
                  <option value="1">Nivel 1 (principal)</option>
                  <option value="2">Nivel 2 (subrubro)</option>
                </select>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input value={formRubro.descripcion} onChange={e=>setFormRubro(f=>({...f,descripcion:e.target.value}))} placeholder="ej: Estructura" style={inputStyle}/>
              </div>
              {formRubro.nivel==='2' && (
                <div style={{ gridColumn:'1 / -1' }}>
                  <label style={labelStyle}>Rubro padre</label>
                  <select value={formRubro.parent_id} onChange={e=>setFormRubro(f=>({...f,parent_id:e.target.value}))} style={inputStyle}>
                    <option value="">Sin padre</option>
                    {rubros.filter(r=>r.nivel===1).map(r=><option key={r.id} value={r.id}>{r.codigo} · {r.descripcion}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setModalRubro(null)} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>Cancelar</button>
              <button onClick={guardarRubro} disabled={guardando} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
                {guardando?'Guardando...':'✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {modalItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:28, width:500, maxWidth:'90vw' }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>{modalItem==='nuevo'?'Nuevo ítem':'Editar ítem'}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Descripción *</label>
                <input value={formItem.descripcion} onChange={e=>setFormItem(f=>({...f,descripcion:e.target.value}))} placeholder="ej: Hormigón H-30" style={inputStyle}/>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Rubro *</label>
                <select value={formItem.rubro_id} onChange={e=>setFormItem(f=>({...f,rubro_id:e.target.value}))} style={inputStyle}>
                  <option value="">Seleccioná un rubro</option>
                  {rubros.map(r=><option key={r.id} value={r.id}>{r.codigo} · {r.descripcion}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unidad</label>
                <input value={formItem.unidad} onChange={e=>setFormItem(f=>({...f,unidad:e.target.value}))} placeholder="ej: m³, m², kg" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Cantidad</label>
                <input type="number" value={formItem.cantidad} onChange={e=>setFormItem(f=>({...f,cantidad:e.target.value}))} placeholder="0" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Costo unit. materiales $</label>
                <input type="number" value={formItem.costo_unit_mat} onChange={e=>setFormItem(f=>({...f,costo_unit_mat:e.target.value}))} placeholder="0" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Costo unit. mano de obra $</label>
                <input type="number" value={formItem.costo_unit_mo} onChange={e=>setFormItem(f=>({...f,costo_unit_mo:e.target.value}))} placeholder="0" style={inputStyle}/>
              </div>
              {(parseFloat(formItem.cantidad)||0) > 0 && (
                <div style={{ gridColumn:'1 / -1', background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'8px 14px' }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Total: </span>
                  <span style={{ fontSize:15, fontWeight:700, fontFamily:'monospace', color:'#F0C060' }}>
                    $ {fmt((parseFloat(formItem.cantidad)||0) * ((parseFloat(formItem.costo_unit_mat)||0) + (parseFloat(formItem.costo_unit_mo)||0)))}
                  </span>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setModalItem(null)} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>Cancelar</button>
              <button onClick={guardarItem} disabled={guardando} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
                {guardando?'Guardando...':'✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
