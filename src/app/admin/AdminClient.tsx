'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  activa:      { bg: 'rgba(34,197,94,0.12)',  text: '#4ADE80' },
  trial:       { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
  advertencia: { bg: 'rgba(239,68,68,0.1)',   text: '#F87171' },
  suspendida:  { bg: 'rgba(239,68,68,0.15)',  text: '#F87171' },
  cancelada:   { bg: 'var(--tag-bg)',         text: 'var(--text-muted)' },
}

const inp: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)',
  fontFamily: 'system-ui', fontSize: 13, outline: 'none', width: '100%',
}

export default function AdminClient({ datos, planes, whitelist: wlInicial, pagos }: {
  datos: any[], planes: any[], whitelist: any[], pagos: any[]
}) {
  const [lista, setLista] = useState(datos)
  const [whitelist, setWhitelist] = useState(wlInicial)
  const [modal, setModal] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tab, setTab] = useState<'usuarios' | 'planes' | 'whitelist' | 'pagos'>('usuarios')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // Edit form state
  const [editPlan, setEditPlan] = useState('')
  const [editDescuento, setEditDescuento] = useState('')
  const [editPrecioFinal, setEditPrecioFinal] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [editActivo, setEditActivo] = useState(true)

  // Edit precio ARS del plan
  const [editandoPlan, setEditandoPlan] = useState<any>(null)
  const [planPrecioARS, setPlanPrecioARS] = useState('')

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3500) }

  const abrirModal = (item: any) => {
    setModal(item)
    setEditPlan(item.sub?.plan_id || '')
    setEditDescuento(String(item.sub?.descuento_pct || 0))
    setEditPrecioFinal(String(item.sub?.precio_final_usd || item.plan?.precio_usd || 0))
    setEditEstado(item.sub?.estado || 'trial')
    setEditNotas(item.sub?.notas_admin || '')
    setEditActivo(item.owner?.activo ?? true)
  }

  const guardarCambios = async () => {
    if (!modal?.sub?.id) return
    setGuardando(true)

    // Actualizar suscripción
    const { error: subErr } = await supabase.from('suscripciones').update({
      plan_id: editPlan || null,
      descuento_pct: parseFloat(editDescuento) || 0,
      precio_final_usd: parseFloat(editPrecioFinal) || 0,
      estado: editEstado,
      notas_admin: editNotas || null,
      updated_at: new Date().toISOString(),
      ...(editEstado === 'advertencia' && !modal.sub.fecha_advertencia
        ? { fecha_advertencia: new Date().toISOString() }
        : {}),
    }).eq('id', modal.sub.id)

    // Actualizar activo en todos los miembros si cambió
    if (editActivo !== (modal.owner?.activo ?? true)) {
      await supabase.from('user_profiles')
        .update({ activo: editActivo })
        .eq('organizacion_id', modal.org.id)
    }

    if (subErr) { flash('❌ Error: ' + subErr.message); setGuardando(false); return }

    // Actualizar estado local
    setLista(ls => ls.map(l => l.org.id === modal.org.id ? {
      ...l,
      sub: { ...l.sub, plan_id: editPlan, descuento_pct: parseFloat(editDescuento)||0, precio_final_usd: parseFloat(editPrecioFinal)||0, estado: editEstado, notas_admin: editNotas },
      plan: planes.find(p => p.id === editPlan) || l.plan,
      owner: l.owner ? { ...l.owner, activo: editActivo } : l.owner,
    } : l))

    setModal(null)
    flash('✓ Cambios guardados')
    setGuardando(false)
  }

  const guardarPrecioARS = async () => {
    if (!editandoPlan) return
    setGuardando(true)
    const { error } = await supabase.from('planes').update({
      precio_ars: parseFloat(planPrecioARS) || 0,
    }).eq('id', editandoPlan.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else { flash('✓ Precio ARS actualizado'); setEditandoPlan(null) }
    setGuardando(false)
  }

  const agregarWhitelist = async () => {
    if (!nuevoEmail.trim()) return
    const { error } = await supabase.from('whitelist_admin').insert({ email: nuevoEmail.trim(), descripcion: 'Agregado desde admin' })
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setWhitelist(w => [...w, { email: nuevoEmail.trim(), descripcion: 'Agregado desde admin', created_at: new Date().toISOString() }])
      setNuevoEmail('')
      flash('✓ Email agregado a la whitelist')
    }
  }

  const quitarWhitelist = async (email: string) => {
    await supabase.from('whitelist_admin').delete().eq('email', email)
    setWhitelist(w => w.filter(x => x.email !== email))
    flash('✓ Removido de whitelist')
  }

  const listaFiltrada = lista.filter(item =>
    busqueda === '' ||
    item.org.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.owner?.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    item.owner?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <>
      {mensaje && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 999, background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{mensaje}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          { key: 'usuarios', label: `👥 Usuarios · ${lista.length}` },
          { key: 'planes', label: '💳 Planes' },
          { key: 'whitelist', label: `🔑 Whitelist · ${whitelist.length}` },
          { key: 'pagos', label: `📋 Pagos · ${pagos.length}` },
        ].map(t => (
          <div key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: tab === t.key ? '#F0C060' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t.key ? '#F0C060' : 'transparent'}`,
          }}>{t.label}</div>
        ))}
      </div>

      {/* ── Tab Usuarios ───────────────────────────────────────────────────── */}
      {tab === 'usuarios' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, empresa o email..." style={{ ...inp, maxWidth: 360 }} />
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-head)' }}>
                  {['Empresa','Owner','Plan','Estado','Trial / Próximo cobro','Precio USD','Usuarios','Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Sin resultados</td></tr>
                )}
                {listaFiltrada.map((item, i) => {
                  const st = ESTADO_COLOR[item.sub?.estado || 'trial'] || ESTADO_COLOR.trial
                  const fechaInfo = item.sub?.estado === 'trial'
                    ? (item.diasTrial !== null ? `${item.diasTrial}d restantes` : '—')
                    : item.sub?.fecha_proximo_cobro
                    ? new Date(item.sub.fecha_proximo_cobro).toLocaleDateString('es-AR')
                    : '—'

                  return (
                    <tr key={item.org.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--row-alt)', opacity: item.owner?.activo === false ? 0.5 : 1 }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                        {item.org.nombre}
                        {item.sub?.notas_admin && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>📝 {item.sub.notas_admin}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        <div>{item.owner?.nombre || '—'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.owner?.email}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {item.plan?.nombre || '—'}
                        {item.sub?.descuento_pct > 0 && (
                          <span style={{ marginLeft: 6, background: 'rgba(34,197,94,0.12)', color: '#4ADE80', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>-{item.sub.descuento_pct}%</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: st.bg, color: st.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                          {item.sub?.estado || '—'}
                        </span>
                        {item.owner?.activo === false && <span style={{ marginLeft: 6, background: 'rgba(239,68,68,0.12)', color: '#F87171', padding: '2px 6px', borderRadius: 10, fontSize: 10 }}>bloqueado</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: item.diasTrial !== null && item.diasTrial <= 2 ? '#F87171' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {fechaInfo}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#F0C060' }}>
                        USD {fmt(item.sub?.precio_final_usd || item.plan?.precio_usd || 0)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.miembros.length} / {item.plan?.max_usuarios === -1 ? '∞' : (item.plan?.max_usuarios || 1)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={() => abrirModal(item)} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Tab Planes ─────────────────────────────────────────────────────── */}
      {tab === 'planes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {planes.map(plan => (
            <div key={plan.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{plan.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{plan.descripcion}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#F0C060' }}>USD {plan.precio_usd}/mes</div>
                  <div style={{ fontSize: 13, color: plan.precio_ars ? '#4ADE80' : '#F59E0B', marginTop: 2, fontFamily: 'monospace' }}>
                    {plan.precio_ars ? `ARS $ ${fmt(plan.precio_ars)}/mes` : '⚠ Sin precio ARS (MP)'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
                <div>Max usuarios: <strong>{plan.max_usuarios === -1 ? 'ilimitado' : plan.max_usuarios}</strong></div>
                <div>Max obras: <strong>{plan.max_obras === -1 ? 'ilimitado' : plan.max_obras}</strong></div>
              </div>
              {editandoPlan?.id === plan.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="number" value={planPrecioARS} onChange={e => setPlanPrecioARS(e.target.value)} placeholder="Precio en ARS" style={{ ...inp, flex: 1 }} />
                  <button onClick={guardarPrecioARS} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui', fontWeight: 600 }}>Guardar</button>
                  <button onClick={() => setEditandoPlan(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => { setEditandoPlan(plan); setPlanPrecioARS(String(plan.precio_ars || '')) }}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                  ✏️ Configurar precio ARS para MP
                </button>
              )}
            </div>
          ))}
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div>Para conectar MercadoPago:</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>1. mercadopago.com.ar/developers</div>
              <div style={{ fontSize: 12 }}>2. Crear app → obtener ACCESS_TOKEN</div>
              <div style={{ fontSize: 12 }}>3. Agregar a .env.local como MP_ACCESS_TOKEN</div>
              <div style={{ fontSize: 12 }}>4. Configurar precio ARS en cada plan</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Whitelist ──────────────────────────────────────────────────── */}
      {tab === 'whitelist' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#F59E0B' }}>
            Estos emails nunca serán bloqueados sin importar el estado de suscripción o trial.
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregarWhitelist()} placeholder="email@empresa.com" style={{ ...inp, flex: 1 }} />
            <button onClick={agregarWhitelist} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui', whiteSpace: 'nowrap' }}>
              ＋ Agregar
            </button>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {whitelist.map((w, i) => (
              <div key={w.email} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{w.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{w.descripcion}</div>
                </div>
                <span style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>🔑 Whitelist</span>
                <button onClick={() => quitarWhitelist(w.email)} style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>Quitar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab Pagos ──────────────────────────────────────────────────────── */}
      {tab === 'pagos' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {pagos.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Sin pagos registrados todavía.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-head)' }}>
                  {['Fecha','Período','Monto USD','Monto ARS','Estado','MP ID'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagos.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--row-alt)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{p.periodo || '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#F0C060' }}>USD {p.monto_usd || '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>$ {fmt(p.monto_ars) || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: p.estado === 'aprobado' ? 'rgba(34,197,94,0.12)' : p.estado === 'rechazado' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                        color: p.estado === 'aprobado' ? '#4ADE80' : p.estado === 'rechazado' ? '#F87171' : '#F59E0B',
                        padding: '2px 8px', borderRadius: 20, fontSize: 11,
                      }}>{p.estado}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.mp_payment_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal gestionar usuario ────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 32, width: 540, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Gestionar · {modal.org.nombre}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>{modal.owner?.email} · {modal.miembros.length} usuario{modal.miembros.length !== 1 ? 's' : ''}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Plan</label>
                <select value={editPlan} onChange={e => {
                  setEditPlan(e.target.value)
                  const p = planes.find(x => x.id === e.target.value)
                  if (p) setEditPrecioFinal(String(p.precio_usd))
                }} style={inp}>
                  <option value="">Sin plan</option>
                  {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} · USD {p.precio_usd}/mes</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Estado</label>
                <select value={editEstado} onChange={e => setEditEstado(e.target.value)} style={inp}>
                  <option value="trial">Trial</option>
                  <option value="activa">Activa</option>
                  <option value="advertencia">Advertencia (10d)</option>
                  <option value="suspendida">Suspendida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Descuento %</label>
                <input type="number" value={editDescuento} onChange={e => {
                  setEditDescuento(e.target.value)
                  const p = planes.find(x => x.id === editPlan)
                  if (p) {
                    const desc = parseFloat(e.target.value) || 0
                    setEditPrecioFinal(String(Math.round(p.precio_usd * (1 - desc / 100) * 100) / 100))
                  }
                }} style={inp} min="0" max="100" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Precio final USD/mes</label>
                <input type="number" value={editPrecioFinal} onChange={e => setEditPrecioFinal(e.target.value)} style={{ ...inp, color: '#F0C060' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Notas internas</label>
                <input value={editNotas} onChange={e => setEditNotas(e.target.value)} placeholder="Ej: cliente VIP, acordar precio especial..." style={inp} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="editActivo" checked={editActivo} onChange={e => setEditActivo(e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                <label htmlFor="editActivo" style={{ fontSize: 13, cursor: 'pointer', color: editActivo ? 'var(--text-primary)' : '#F87171' }}>
                  {editActivo ? '✓ Cuenta activa' : '🔒 Cuenta bloqueada manualmente'}
                </label>
              </div>
            </div>

            {/* Miembros */}
            {modal.miembros.length > 0 && (
              <div style={{ background: 'var(--bg-section)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Usuarios de la cuenta</div>
                {modal.miembros.map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                    <span>{m.nombre || m.email}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{m.rol} · {m.email}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '9px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={guardarCambios} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
