'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export default function CajaClient({ cajas, movimientosIniciales, obraId, tcHoy }: {
  cajas: any[], movimientosIniciales: any[], obraId: string, tcHoy: number
}) {
  const [movimientos, setMovimientos] = useState(movimientosIniciales)
  const [cajaActiva, setCajaActiva] = useState<string>(() => cajas?.[0]?.id ?? '')
  const [tab, setTab] = useState<'movimientos' | 'nuevo'>('movimientos')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'ingreso',
    concepto: '',
    contraparte: '',
    monto_ars: '',
    monto_usd: '',
  })

  const cajaActivaObj = cajas.find(c => c.id === cajaActiva)
  const movsFiltrados = movimientos.filter(m => m.caja_id === cajaActiva)
  const ingresos = movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + (m.monto_ars || 0), 0)
  const egresos = movsFiltrados.filter(m => m.tipo === 'egreso').reduce((a, m) => a + (m.monto_ars || 0), 0)

  const guardar = async () => {
    if (!form.concepto || (!form.monto_ars && !form.monto_usd)) {
      setMensaje('❌ Completá el concepto y al menos un monto')
      return
    }
    setGuardando(true)
    const { data, error } = await supabase.from('movimientos_caja').insert({
      caja_id: cajaActiva,
      obra_id: obraId,
      fecha: form.fecha,
      tipo: form.tipo,
      concepto: form.concepto,
      contraparte: form.contraparte || null,
      monto_ars: form.monto_ars ? parseFloat(form.monto_ars) : null,
      monto_usd: form.monto_usd ? parseFloat(form.monto_usd) : null,
      tc_blue: tcHoy,
      origen: 'manual',
    }).select().single()

    if (error) {
      setMensaje('❌ Error: ' + error.message)
    } else {
      setMovimientos(m => [data, ...m])
      setForm({ fecha: new Date().toISOString().split('T')[0], tipo: 'ingreso', concepto: '', contraparte: '', monto_ars: '', monto_usd: '' })
      setMensaje('✓ Movimiento registrado')
      setTab('movimientos')
      setTimeout(() => setMensaje(''), 3000)
    }
    setGuardando(false)
  }

  const inputStyle = {
    width: '100%', background: '#0E1117', border: '1px solid #2E3A52',
    borderRadius: 6, padding: '8px 12px', color: '#E8EDF5',
    fontFamily: 'system-ui', fontSize: 13, outline: 'none'
  }
  const labelStyle = { fontSize: 11, color: '#556070', marginBottom: 4, display: 'block' as const }

  return (
    <>
      {/* Cajas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {cajas.map(cj => {
          const movsCaja = movimientos.filter(m => m.caja_id === cj.id)
          const saldoARS = movsCaja.reduce((a, m) => a + (m.tipo === 'ingreso' ? (m.monto_ars || 0) : -(m.monto_ars || 0)), 0)
          const saldoUSD = movsCaja.reduce((a, m) => a + (m.tipo === 'ingreso' ? (m.monto_usd || 0) : -(m.monto_usd || 0)), 0)
          const activa = cajaActiva === cj.id
          return (
            <div key={cj.id} onClick={() => setCajaActiva(cj.id)} style={{
              background: '#161B25',
              border: `1px solid ${activa ? '#D4A843' : '#252D3D'}`,
              boxShadow: activa ? '0 0 0 1px #D4A843' : 'none',
              borderRadius: 10, padding: '16px 20px', cursor: 'pointer'
            }}>
              <div style={{ fontSize: 11, color: '#556070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Caja {cj.nombre}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#F0C060' }}>
                {cj.moneda === 'ARS' ? `$ ${fmt(saldoARS)}` : `USD ${fmt(saldoUSD)}`}
              </div>
              <div style={{ fontSize: 11, color: '#556070', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                {cj.nombre === 'Banco' ? 'Galicia · actualización manual' : 'Carga manual'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #252D3D', marginBottom: 24 }}>
        {(['movimientos', 'nuevo'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: tab === t ? '#F0C060' : '#556070',
            borderBottom: `2px solid ${tab === t ? '#F0C060' : 'transparent'}`,
            transition: 'all 0.15s'
          }}>
            {t === 'movimientos' ? `Movimientos · ${movsFiltrados.length}` : '＋ Nuevo movimiento'}
          </div>
        ))}
      </div>

      {mensaje && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: mensaje.startsWith('✓') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: mensaje.startsWith('✓') ? '#4ADE80' : '#F87171'
        }}>{mensaje}</div>
      )}

      {/* Movimientos */}
      {tab === 'movimientos' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Ingresos', valor: ingresos, color: '#4ADE80' },
              { label: 'Egresos', valor: egresos, color: '#F87171' },
              { label: 'Neto', valor: ingresos - egresos, color: ingresos - egresos >= 0 ? '#4ADE80' : '#F87171' },
            ].map(k => (
              <div key={k.label} style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 8, padding: '12px 18px', flex: 1 }}>
                <div style={{ fontSize: 10, color: '#556070', textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: k.color, marginTop: 4 }}>
                  {k.valor >= 0 ? '' : '-'}$ {fmt(Math.abs(k.valor))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1D2535' }}>
                  {['Fecha', 'Concepto', 'Contraparte', 'Ingreso', 'Egreso'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: '#556070', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movsFiltrados.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#556070' }}>
                    Sin movimientos. <span style={{ color: '#60A5FA', cursor: 'pointer' }} onClick={() => setTab('nuevo')}>Agregar el primero →</span>
                  </td></tr>
                ) : movsFiltrados.map((m, i) => (
                  <tr key={m.id || i} style={{ borderTop: '1px solid #252D3D' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#556070' }}>{m.fecha}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.concepto}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#8A96AA' }}>{m.contraparte || '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#4ADE80' }}>
                      {m.tipo === 'ingreso' ? `$ ${fmt(m.monto_ars)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#F87171' }}>
                      {m.tipo === 'egreso' ? `$ ${fmt(m.monto_ars)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Nuevo movimiento */}
      {tab === 'nuevo' && (
        <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 10, padding: 28, maxWidth: 600 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
            Nuevo movimiento
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Caja *</label>
            <select value={cajaActiva} onChange={e => setCajaActiva(e.target.value)} style={inputStyle}>
              {cajas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} · {c.moneda}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Concepto *</label>
            <input type="text" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
              placeholder="ej: Cuota 01 Depto 801, Pago BD Constructora..." style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Contraparte</label>
            <input type="text" value={form.contraparte} onChange={e => setForm(f => ({ ...f, contraparte: e.target.value }))}
              placeholder="ej: Sharon y Mati, BD Constructora..." style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Monto ARS $</label>
              <input type="number" value={form.monto_ars} onChange={e => setForm(f => ({ ...f, monto_ars: e.target.value }))}
                placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Monto USD (opcional)</label>
              <input type="number" value={form.monto_usd} onChange={e => setForm(f => ({ ...f, monto_usd: e.target.value }))}
                placeholder="0" style={inputStyle} />
            </div>
          </div>

          <button onClick={guardar} disabled={guardando} style={{
            background: '#D4A843', color: '#0E1117', border: 'none', borderRadius: 6,
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'system-ui'
          }}>
            {guardando ? 'Guardando...' : '✓ Guardar movimiento'}
          </button>
        </div>
      )}
    </>
  )
}