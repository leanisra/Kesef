'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ThemeToggle } from '@/lib/ThemeToggle'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)',
  fontFamily: 'system-ui', fontSize: 13, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

const emptyForm = { razon_social: '', cuit: '', rubro: '', cbu: '', alias: '', email: '', telefono: '', whatsapp: '', notas: '' }

export default function ProveedoresPage() {
  const params = useParams()
  const obraId = params.obraId as string

  const [obraNombre, setObraNombre] = useState('')
  const [proveedores, setProveedores] = useState<any[]>([])
  const [papelera, setPapelera] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [modal, setModal] = useState<'nuevo'|'editar'|null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editandoId, setEditandoId] = useState<string|null>(null)
  const [confirmDel, setConfirmDel] = useState<string|null>(null)
  const [verPapelera, setVerPapelera] = useState(false)

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3500) }

  useEffect(() => {
    const cargar = async () => {
      const [{ data: obra }, { data: pvObra }] = await Promise.all([
        supabase.from('obras').select('nombre').eq('id', obraId).single(),
        supabase.from('proveedores_obras').select('proveedor_id').eq('obra_id', obraId),
      ])
      setObraNombre(obra?.nombre || '')
      const ids = pvObra?.map(p => p.proveedor_id) || []
      if (ids.length === 0) { setCargando(false); return }

      const { data: pvs } = await supabase
        .from('proveedores')
        .select(`*, certificados(monto_certificado, monto_base, ordenes_pago(monto_efectivo, monto_transfer, monto_cheque, estado))`)
        .in('id', ids)
      setProveedores((pvs || []).filter(p => !p.eliminado))
      setPapelera((pvs || []).filter(p => p.eliminado))
      setCargando(false)
    }
    cargar()
  }, [obraId])

  const abrirNuevo = () => { setForm(emptyForm); setModal('nuevo') }

  const abrirEditar = (p: any) => {
    setForm({ razon_social: p.razon_social||'', cuit: p.cuit||'', rubro: p.rubro||'', cbu: p.cbu||'', alias: p.alias||'', email: p.email||'', telefono: p.telefono||'', whatsapp: p.whatsapp||'', notas: p.notas||'' })
    setEditandoId(p.id)
    setModal('editar')
  }

  const guardarNuevo = async () => {
    if (!form.razon_social.trim()) { flash('❌ Ingresá la razón social'); return }
    setGuardando(true)
    const { data, error } = await supabase.from('proveedores').insert({
      razon_social: form.razon_social, cuit: form.cuit||null, rubro: form.rubro||null,
      cbu: form.cbu||null, alias: form.alias||null, email: form.email||null,
      telefono: form.telefono||null, whatsapp: form.whatsapp||null, notas: form.notas||null,
    }).select().single()
    if (error) { flash('❌ Error: ' + error.message); setGuardando(false); return }
    await supabase.from('proveedores_obras').insert({ proveedor_id: data.id, obra_id: obraId })
    setProveedores(ps => [...ps, { ...data, certificados: [] }])
    setModal(null)
    flash('✓ Proveedor agregado')
    setGuardando(false)
  }

  const guardarEdicion = async () => {
    if (!editandoId) return
    setGuardando(true)
    const { error } = await supabase.from('proveedores').update({
      razon_social: form.razon_social, cuit: form.cuit||null, rubro: form.rubro||null,
      cbu: form.cbu||null, alias: form.alias||null, email: form.email||null,
      telefono: form.telefono||null, whatsapp: form.whatsapp||null, notas: form.notas||null,
    }).eq('id', editandoId)
    if (error) { flash('❌ Error: ' + error.message); setGuardando(false); return }
    setProveedores(ps => ps.map(p => p.id === editandoId ? { ...p, ...form } : p))
    setModal(null)
    flash('✓ Proveedor actualizado')
    setGuardando(false)
  }

  const eliminarProveedor = async (id: string) => {
    const { error } = await supabase.from('proveedores').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const p = proveedores.find(x => x.id === id)
      setProveedores(ps => ps.filter(x => x.id !== id))
      if (p) setPapelera(pp => [p, ...pp])
      setConfirmDel(null)
      flash('✓ Proveedor eliminado · podés restaurarlo')
    }
  }

  const restaurarProveedor = async (p: any) => {
    const { error } = await supabase.from('proveedores').update({ eliminado: false }).eq('id', p.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setProveedores(ps => [...ps, { ...p, eliminado: false }])
      setPapelera(pp => pp.filter(x => x.id !== p.id))
      flash('✓ Proveedor restaurado')
    }
  }

  const FormModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 560, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{modal === 'nuevo' ? 'Agregar proveedor' : 'Editar proveedor'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Razón social *</label>
            <input value={form.razon_social} onChange={e => setForm(f => ({...f, razon_social: e.target.value}))} placeholder="ej: BD Constructora SA" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>CUIT</label>
            <input value={form.cuit} onChange={e => setForm(f => ({...f, cuit: e.target.value}))} placeholder="20-12345678-9" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Rubro</label>
            <input value={form.rubro} onChange={e => setForm(f => ({...f, rubro: e.target.value}))} placeholder="ej: Estructura, Pintura..." style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>CBU</label>
            <input value={form.cbu} onChange={e => setForm(f => ({...f, cbu: e.target.value}))} placeholder="22 dígitos" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Alias CBU</label>
            <input value={form.alias} onChange={e => setForm(f => ({...f, alias: e.target.value}))} placeholder="ej: empresa.proveedor" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="contacto@empresa.com" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} placeholder="+54 11 1234-5678" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} placeholder="+54 9 11 1234-5678" style={inputStyle}/>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notas</label>
            <input value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))} placeholder="Opcional" style={inputStyle}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setModal(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
          <button onClick={modal === 'nuevo' ? guardarNuevo : guardarEdicion} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
            {guardando ? 'Guardando...' : '✓ Guardar'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {mensaje && (
          <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 999, background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{mensaje}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Volver a {obraNombre}</Link>
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>🏗️ Proveedores</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cuenta corriente por proveedor · {obraNombre}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {papelera.length > 0 && (
              <button onClick={() => setVerPapelera(v => !v)} style={{ background: 'transparent', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>
                🗑️ Papelera · {papelera.length}
              </button>
            )}
            <button onClick={abrirNuevo} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
              ＋ Agregar proveedor
            </button>
          </div>
        </div>

        {/* Papelera */}
        {verPapelera && papelera.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F87171', marginBottom: 14 }}>🗑️ Papelera · proveedores eliminados</div>
            {papelera.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < papelera.length-1 ? '1px solid rgba(239,68,68,0.1)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.razon_social}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.rubro || ''} {p.cuit ? `· CUIT: ${p.cuit}` : ''}</div>
                </div>
                <button onClick={() => restaurarProveedor(p)} style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>↩ Restaurar</button>
              </div>
            ))}
          </div>
        )}

        {cargando ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-head)' }}>
                  {['Proveedor','Rubro','CUIT','Certificado','Base','Pagado','Saldo','Estado',''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p: any) => {
                  const certs = p.certificados || []
                  const totalCertificado = certs.reduce((a: number, c: any) => a + (c.monto_certificado||0), 0)
                  const totalBase = certs.reduce((a: number, c: any) => a + (c.monto_base||c.monto_certificado||0), 0)
                  const totalPagado = certs.reduce((a: number, c: any) =>
                    a + (c.ordenes_pago?.filter((o: any) => o.estado==='pagada').reduce((b: number, o: any) => b + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0)||0), 0)
                  const saldo = totalBase - totalPagado
                  const sinDeuda = saldo <= 0
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.razon_social}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{p.rubro||'—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.cuit||'—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{totalCertificado>0?`$ ${fmt(totalCertificado)}`:'—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#60A5FA', fontSize: 13 }}>{totalBase>0?`$ ${fmt(totalBase)}`:'—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--success)' }}>{totalPagado>0?`$ ${fmt(totalPagado)}`:'—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: sinDeuda?'var(--success)':'var(--error)' }}>{sinDeuda?'✓ Al día':`$ ${fmt(saldo)}`}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {sinDeuda?<span style={{ background:'var(--success-bg)', color:'var(--success)', padding:'2px 8px', borderRadius:20, fontSize:11 }}>Pagado</span>
                          :totalCertificado===0?<span style={{ background:'var(--tag-bg)', color:'var(--text-muted)', padding:'2px 8px', borderRadius:20, fontSize:11 }}>Sin cert.</span>
                          :<span style={{ background:'rgba(239,68,68,0.12)', color:'var(--error)', padding:'2px 8px', borderRadius:20, fontSize:11 }}>Pendiente</span>}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <Link href={`/obras/${obraId}/proveedores/${p.id}`} style={{ color:'#60A5FA', fontSize:13, textDecoration:'none', marginRight:8 }}>Ver →</Link>
                        <button onClick={() => abrirEditar(p)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, opacity:0.5, marginRight:4 }} title="Editar">✏️</button>
                        {confirmDel===p.id?(
                          <>
                            <button onClick={() => eliminarProveedor(p.id)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer', marginRight:4 }}>Sí</button>
                            <button onClick={() => setConfirmDel(null)} style={{ background:'var(--border)', color:'var(--text-secondary)', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer' }}>No</button>
                          </>
                        ):(
                          <button onClick={() => setConfirmDel(p.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.25, color:'#F87171' }}
                            onMouseEnter={e=>(e.currentTarget.style.opacity='1')}
                            onMouseLeave={e=>(e.currentTarget.style.opacity='0.25')}>✕</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {proveedores.length===0&&(
                  <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                    No hay proveedores. <button onClick={abrirNuevo} style={{ color:'#60A5FA', background:'none', border:'none', cursor:'pointer', fontFamily:'system-ui', fontSize:14 }}>Agregar el primero →</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {modal && <FormModal />}
      </div>
    </main>
  )
}
