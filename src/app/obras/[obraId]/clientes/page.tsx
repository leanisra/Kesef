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
  fontFamily: 'system-ui', fontSize: 13, outline: 'none',
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

const ESTADO_COLOR: Record<string, string> = {
  pagada: '#4ADE80', pendiente: '#F59E0B', futura: 'var(--text-muted)', pagada_parcial: '#60A5FA',
}

const emptyCliente = { nombre: '', telefono: '', email: '' }
const emptyContrato = {
  precio_usd_total: '', anticipo_usd: '', split_a_pct: '50',
  n_cuotas: '12', tc_contrato: '', estado: 'activo',
}

export default function ClientesPage() {
  const params = useParams()
  const obraId = params.obraId as string

  const [obraNombre, setObraNombre] = useState('')
  const [contratos, setContratos] = useState<any[]>([])
  const [cuotas, setCuotas] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [papelera, setPapelera] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // Modal state
  const [modal, setModal] = useState<'nuevo' | 'editar' | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formCliente, setFormCliente] = useState(emptyCliente)
  const [formContrato, setFormContrato] = useState(emptyContrato)
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<string[]>([])
  const [generarCuotas, setGenerarCuotas] = useState(true)
  const [fechaInicioCuotas, setFechaInicioCuotas] = useState('')

  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [verPapelera, setVerPapelera] = useState(false)

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3500) }

  useEffect(() => {
    cargarDatos()
  }, [obraId])

  const cargarDatos = async () => {
    setCargando(true)
    const [{ data: obra }, { data: ctrs }, { data: unis }] = await Promise.all([
      supabase.from('obras').select('nombre').eq('id', obraId).single(),
      supabase.from('contratos')
        .select('*, clientes(id, nombre, telefono, email), contratos_unidades(unidades(id, codigo, tipo, piso))')
        .eq('obra_id', obraId)
        .order('created_at'),
      supabase.from('unidades').select('id, codigo, tipo, piso').eq('obra_id', obraId).neq('eliminado', true).order('orden'),
    ])
    setObraNombre(obra?.nombre || '')
    setUnidades(unis || [])
    const todos = ctrs || []
    setContratos(todos)

    // Cargar cuotas para todos los contratos
    const ids = todos.map((c: any) => c.id)
    if (ids.length > 0) {
      const { data: cqs } = await supabase
        .from('cuotas').select('contrato_id, estado, cuota_a_ars, cuota_b_ars, fecha_vencimiento, n_cuota')
        .in('contrato_id', ids)
        .neq('eliminado', true)
      setCuotas(cqs || [])
    }
    setCargando(false)
  }

  const abrirNuevo = () => {
    setFormCliente(emptyCliente)
    setFormContrato({ ...emptyContrato, tc_contrato: '' })
    setUnidadesSeleccionadas([])
    setGenerarCuotas(true)
    setFechaInicioCuotas(new Date().toISOString().split('T')[0])
    setEditandoId(null)
    setModal('nuevo')
  }

  const abrirEditar = (contrato: any) => {
    setFormCliente({
      nombre: contrato.clientes?.nombre || '',
      telefono: contrato.clientes?.telefono || '',
      email: contrato.clientes?.email || '',
    })
    setFormContrato({
      precio_usd_total: String(contrato.precio_usd_total || ''),
      anticipo_usd: String(contrato.anticipo_usd || ''),
      split_a_pct: String(contrato.split_a_pct || 50),
      n_cuotas: String(contrato.n_cuotas || 12),
      tc_contrato: String(contrato.tc_contrato || ''),
      estado: contrato.estado || 'activo',
    })
    setUnidadesSeleccionadas(
      contrato.contratos_unidades?.map((cu: any) => cu.unidades?.id).filter(Boolean) || []
    )
    setGenerarCuotas(false)
    setEditandoId(contrato.id)
    setModal('editar')
  }

  const toggleUnidad = (id: string) =>
    setUnidadesSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const guardarNuevo = async () => {
    if (!formCliente.nombre.trim()) { flash('❌ El nombre del cliente es obligatorio'); return }
    const precio = parseFloat(formContrato.precio_usd_total) || 0
    const anticipo = parseFloat(formContrato.anticipo_usd) || 0
    const tc = parseFloat(formContrato.tc_contrato) || 0
    const nCuotas = parseInt(formContrato.n_cuotas) || 0
    const splitA = parseFloat(formContrato.split_a_pct) || 50
    if (precio <= 0) { flash('❌ Ingresá el precio total en USD'); return }
    if (tc <= 0) { flash('❌ Ingresá el TC del contrato'); return }

    setGuardando(true)

    // 1. Crear cliente
    const { data: cliente, error: errCli } = await supabase
      .from('clientes')
      .insert({ nombre: formCliente.nombre, telefono: formCliente.telefono || null, email: formCliente.email || null })
      .select().single()
    if (errCli) { flash('❌ Error creando cliente: ' + errCli.message); setGuardando(false); return }

    // 2. Crear contrato
    const { data: contrato, error: errCtr } = await supabase
      .from('contratos')
      .insert({
        obra_id: obraId, cliente_id: cliente.id,
        estado: formContrato.estado,
        precio_usd_total: precio, anticipo_usd: anticipo,
        split_a_pct: splitA, n_cuotas: nCuotas, tc_contrato: tc,
      })
      .select().single()
    if (errCtr) { flash('❌ Error creando contrato: ' + errCtr.message); setGuardando(false); return }

    // 3. Vincular unidades
    if (unidadesSeleccionadas.length > 0) {
      await supabase.from('contratos_unidades').insert(
        unidadesSeleccionadas.map(uid => ({ contrato_id: contrato.id, unidad_id: uid }))
      )
    }

    // 4. Generar cuotas automáticamente
    if (generarCuotas && nCuotas > 0 && fechaInicioCuotas) {
      const saldo = precio - anticipo
      const cuotaUSD = saldo / nCuotas
      const cuotaA = Math.round(cuotaUSD * (splitA / 100) * tc)
      const cuotaB = Math.round(cuotaUSD * (1 - splitA / 100) * tc)

      const cuotasRows = Array.from({ length: nCuotas }, (_, i) => {
        const fecha = new Date(fechaInicioCuotas)
        fecha.setMonth(fecha.getMonth() + i)
        return {
          contrato_id: contrato.id,
          n_cuota: i + 1,
          fecha_vencimiento: fecha.toISOString().split('T')[0],
          cuota_a_ars: cuotaA,
          cuota_b_ars: cuotaB,
          estado: 'pendiente',
          monto_pagado_a: 0,
          monto_pagado_b: 0,
          eliminado: false,
        }
      })
      await supabase.from('cuotas').insert(cuotasRows)
    }

    setModal(null)
    flash('✓ Cliente y contrato creados correctamente')
    setGuardando(false)
    await cargarDatos()
  }

  const guardarEdicion = async () => {
    if (!editandoId || !formCliente.nombre.trim()) { flash('❌ El nombre es obligatorio'); return }
    setGuardando(true)

    const contrato = contratos.find(c => c.id === editandoId)

    // Actualizar cliente
    if (contrato?.clientes?.id) {
      await supabase.from('clientes').update({
        nombre: formCliente.nombre,
        telefono: formCliente.telefono || null,
        email: formCliente.email || null,
      }).eq('id', contrato.clientes.id)
    }

    // Actualizar contrato
    await supabase.from('contratos').update({
      estado: formContrato.estado,
      precio_usd_total: parseFloat(formContrato.precio_usd_total) || 0,
      anticipo_usd: parseFloat(formContrato.anticipo_usd) || 0,
      split_a_pct: parseFloat(formContrato.split_a_pct) || 50,
      n_cuotas: parseInt(formContrato.n_cuotas) || 0,
      tc_contrato: parseFloat(formContrato.tc_contrato) || 0,
    }).eq('id', editandoId)

    // Actualizar unidades: borrar y recrear
    await supabase.from('contratos_unidades').delete().eq('contrato_id', editandoId)
    if (unidadesSeleccionadas.length > 0) {
      await supabase.from('contratos_unidades').insert(
        unidadesSeleccionadas.map(uid => ({ contrato_id: editandoId, unidad_id: uid }))
      )
    }

    setModal(null)
    flash('✓ Contrato actualizado')
    setGuardando(false)
    await cargarDatos()
  }

  const eliminarContrato = async (id: string) => {
    const c = contratos.find(x => x.id === id)
    // Soft delete en cuotas del contrato
    await supabase.from('cuotas').update({ eliminado: true }).eq('contrato_id', id)
    // Eliminar contrato (hard delete — no tiene columna eliminado)
    const { error } = await supabase.from('contratos').delete().eq('id', id)
    if (error) { flash('❌ Error: ' + error.message); return }
    setContratos(cs => cs.filter(x => x.id !== id))
    setCuotas(qs => qs.filter(q => q.contrato_id !== id))
    if (c) setPapelera(p => [c, ...p])
    setConfirmDel(null)
    flash('✓ Contrato eliminado · podés restaurarlo desde la papelera')
  }

  const restaurarContrato = async (c: any) => {
    // Re-insertar contrato
    const { data: nuevo, error } = await supabase.from('contratos').insert({
      obra_id: obraId, cliente_id: c.clientes?.id,
      estado: c.estado, precio_usd_total: c.precio_usd_total,
      anticipo_usd: c.anticipo_usd, split_a_pct: c.split_a_pct,
      n_cuotas: c.n_cuotas, tc_contrato: c.tc_contrato,
    }).select().single()
    if (error) { flash('❌ Error al restaurar: ' + error.message); return }
    // Restaurar cuotas
    await supabase.from('cuotas').update({ eliminado: false, contrato_id: nuevo.id }).eq('contrato_id', c.id)
    setPapelera(p => p.filter(x => x.id !== c.id))
    flash('✓ Contrato restaurado')
    await cargarDatos()
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente')
  const cuotasVencidas = cuotasPendientes.filter(c => new Date(c.fecha_vencimiento) < hoy)
  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagada')
  const totalPorCobrar = cuotasPendientes.reduce((a, c) => a + (c.cuota_a_ars || 0) + (c.cuota_b_ars || 0), 0)

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
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>👥 Clientes y Cuotas</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{contratos.length} contrato{contratos.length !== 1 ? 's' : ''} · {obraNombre}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {papelera.length > 0 && (
              <button onClick={() => setVerPapelera(v => !v)} style={{ background: 'transparent', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>
                🗑️ Papelera · {papelera.length}
              </button>
            )}
            <button onClick={abrirNuevo} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
              ＋ Nuevo cliente
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Contratos activos', valor: contratos.length, color: 'var(--text-primary)' },
            { label: 'Cuotas pagadas', valor: cuotasPagadas.length, color: '#4ADE80' },
            { label: 'Cuotas pendientes', valor: cuotasPendientes.length, color: '#F59E0B' },
            { label: 'Cuotas vencidas', valor: cuotasVencidas.length, color: cuotasVencidas.length > 0 ? '#F87171' : '#4ADE80' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {totalPorCobrar > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 13, color: '#F59E0B' }}>
            💰 Total por cobrar en cuotas pendientes: <strong>$ {fmt(totalPorCobrar)}</strong>
            {cuotasVencidas.length > 0 && <span style={{ marginLeft: 16, color: '#F87171' }}>⚠ {cuotasVencidas.length} vencida{cuotasVencidas.length > 1 ? 's' : ''}</span>}
          </div>
        )}

        {/* Papelera */}
        {verPapelera && papelera.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F87171', marginBottom: 14 }}>🗑️ Papelera · contratos eliminados</div>
            {papelera.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < papelera.length - 1 ? '1px solid rgba(239,68,68,0.1)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.clientes?.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>USD {fmt(c.precio_usd_total)} · {c.n_cuotas} cuotas · TC $ {fmt(c.tc_contrato)}</div>
                </div>
                <button onClick={() => restaurarContrato(c)} style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>↩ Restaurar</button>
              </div>
            ))}
          </div>
        )}

        {/* Lista contratos */}
        {cargando ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : contratos.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay clientes cargados todavía.
            <button onClick={abrirNuevo} style={{ display: 'block', margin: '16px auto 0', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui', fontSize: 14 }}>
              Agregar el primero →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {contratos.map(contrato => {
              const cuotasContrato = cuotas.filter(q => q.contrato_id === contrato.id)
              const pagadas = cuotasContrato.filter(q => q.estado === 'pagada').length
              const pend = cuotasContrato.filter(q => q.estado === 'pendiente').length
              const venc = cuotasContrato.filter(q => q.estado === 'pendiente' && new Date(q.fecha_vencimiento) < hoy).length
              const unids = contrato.contratos_unidades?.map((cu: any) => cu.unidades?.codigo).filter(Boolean).join(', ')
              const splitB = 100 - (contrato.split_a_pct || 50)
              const saldo = (contrato.precio_usd_total || 0) - (contrato.anticipo_usd || 0)
              const cuotaUSD = (contrato.n_cuotas || 1) > 0 ? saldo / contrato.n_cuotas : 0
              const cuotaA = Math.round(cuotaUSD * ((contrato.split_a_pct || 50) / 100) * (contrato.tc_contrato || 0))
              const cuotaB = Math.round(cuotaUSD * (splitB / 100) * (contrato.tc_contrato || 0))

              return (
                <div key={contrato.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{contrato.clientes?.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {unids ? `Unidades: ${unids}` : 'Sin unidades asignadas'}
                          {contrato.clientes?.telefono && ` · Tel: ${contrato.clientes.telefono}`}
                        </div>
                      </div>
                      <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                        {contrato.estado}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link href={`/obras/${obraId}/clientes/${contrato.id}`} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        Ver cuotas →
                      </Link>
                      <button onClick={() => abrirEditar(contrato)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }} title="Editar">✏️</button>
                      {confirmDel === contrato.id ? (
                        <>
                          <button onClick={() => eliminarContrato(contrato.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}>Sí, eliminar</button>
                          <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, padding: '5px 10px', cursor: 'pointer' }}>No</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDel(contrato.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: '#F87171', padding: '5px 10px', fontSize: 12, cursor: 'pointer', opacity: 0.5 }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>🗑️</button>
                      )}
                    </div>
                  </div>

                  {/* Body: métricas del contrato */}
                  <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Precio total', valor: `USD ${fmt(contrato.precio_usd_total)}`, color: 'var(--text-primary)' },
                      { label: 'TC contrato', valor: `$ ${fmt(contrato.tc_contrato)}`, color: '#F0C060' },
                      { label: `Cuota A (${contrato.split_a_pct}%)`, valor: `$ ${fmt(cuotaA)}`, color: '#60A5FA' },
                      { label: `Cuota B (${splitB}%)`, valor: `$ ${fmt(cuotaB)}`, color: '#F0C060' },
                      { label: 'Pagadas', valor: `${pagadas} / ${cuotasContrato.length}`, color: '#4ADE80' },
                      { label: venc > 0 ? `Vencidas 🚨` : 'Pendientes', valor: venc > 0 ? venc : pend, color: venc > 0 ? '#F87171' : pend > 0 ? '#F59E0B' : '#4ADE80' },
                    ].map(k => (
                      <div key={k.label}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.valor}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini barra de progreso cuotas */}
                  {cuotasContrato.length > 0 && (
                    <div style={{ padding: '0 20px 14px' }}>
                      <div style={{ display: 'flex', gap: 1, height: 5, borderRadius: 4, overflow: 'hidden', background: 'var(--border)' }}>
                        {cuotasContrato.map(q => (
                          <div key={q.n_cuota} style={{
                            flex: 1,
                            background: q.estado === 'pagada' ? '#4ADE80'
                              : q.estado === 'pagada_parcial' ? '#60A5FA'
                              : (q.estado === 'pendiente' && new Date(q.fecha_vencimiento) < hoy) ? '#F87171'
                              : 'var(--border)',
                          }} title={`Cuota ${q.n_cuota}: ${q.estado}`} />
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        Progreso de cuotas · verde = pagada · rojo = vencida
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Modal nuevo / editar ────────────────────────────────────────── */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 32, width: 620, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
                {modal === 'nuevo' ? '＋ Nuevo cliente y contrato' : '✏️ Editar contrato'}
              </h3>

              {/* Sección cliente */}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>Datos del cliente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nombre completo *</label>
                  <input value={formCliente.nombre} onChange={e => setFormCliente(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Sharon Menajovsky y Matias Bekerman" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input value={formCliente.telefono} onChange={e => setFormCliente(f => ({ ...f, telefono: e.target.value }))} placeholder="+54 11 1234-5678" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={formCliente.email} onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" style={inputStyle} />
                </div>
              </div>

              {/* Sección contrato */}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>Datos del contrato</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Precio total USD *</label>
                  <input type="number" value={formContrato.precio_usd_total} onChange={e => setFormContrato(f => ({ ...f, precio_usd_total: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Anticipo USD</label>
                  <input type="number" value={formContrato.anticipo_usd} onChange={e => setFormContrato(f => ({ ...f, anticipo_usd: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>TC fijo del contrato $ *</label>
                  <input type="number" value={formContrato.tc_contrato} onChange={e => setFormContrato(f => ({ ...f, tc_contrato: e.target.value }))} placeholder="ej: 1310" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>N° de cuotas</label>
                  <input type="number" value={formContrato.n_cuotas} onChange={e => setFormContrato(f => ({ ...f, n_cuotas: e.target.value }))} placeholder="12" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Split A % (banco/transferencia)</label>
                  <input type="number" value={formContrato.split_a_pct} onChange={e => setFormContrato(f => ({ ...f, split_a_pct: e.target.value }))} placeholder="50" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select value={formContrato.estado} onChange={e => setFormContrato(f => ({ ...f, estado: e.target.value }))} style={inputStyle}>
                    <option value="activo">Activo</option>
                    <option value="vigente">Vigente</option>
                    <option value="rescindido">Rescindido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Preview cuota calculada */}
              {parseFloat(formContrato.precio_usd_total) > 0 && parseFloat(formContrato.tc_contrato) > 0 && parseInt(formContrato.n_cuotas) > 0 && (
                <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cuota A: </span>
                  <span style={{ color: '#60A5FA', fontWeight: 700, fontFamily: 'monospace' }}>
                    $ {fmt(Math.round(((parseFloat(formContrato.precio_usd_total) - parseFloat(formContrato.anticipo_usd || '0')) / parseInt(formContrato.n_cuotas)) * (parseFloat(formContrato.split_a_pct) / 100) * parseFloat(formContrato.tc_contrato)))}
                  </span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 14 }}>Cuota B: </span>
                  <span style={{ color: '#F0C060', fontWeight: 700, fontFamily: 'monospace' }}>
                    $ {fmt(Math.round(((parseFloat(formContrato.precio_usd_total) - parseFloat(formContrato.anticipo_usd || '0')) / parseInt(formContrato.n_cuotas)) * ((100 - parseFloat(formContrato.split_a_pct)) / 100) * parseFloat(formContrato.tc_contrato)))}
                  </span>
                </div>
              )}

              {/* Unidades */}
              {unidades.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>Unidades vinculadas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {unidades.map(u => (
                      <button key={u.id} onClick={() => toggleUnidad(u.id)} style={{
                        background: unidadesSeleccionadas.includes(u.id) ? 'var(--accent)' : 'var(--tag-bg)',
                        color: unidadesSeleccionadas.includes(u.id) ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                        border: `1px solid ${unidadesSeleccionadas.includes(u.id) ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui',
                      }}>
                        {u.codigo} {u.tipo ? `· ${u.tipo}` : ''}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Generar cuotas automáticamente (solo en nuevo) */}
              {modal === 'nuevo' && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>Cuotas</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: generarCuotas ? 14 : 20 }}>
                    <input type="checkbox" id="gen-cuotas" checked={generarCuotas} onChange={e => setGenerarCuotas(e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                    <label htmlFor="gen-cuotas" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>Generar cuotas automáticamente al crear el contrato</label>
                  </div>
                  {generarCuotas && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={labelStyle}>Fecha de la primera cuota</label>
                      <input type="date" value={fechaInicioCuotas} onChange={e => setFechaInicioCuotas(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setModal(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '9px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
                <button onClick={modal === 'nuevo' ? guardarNuevo : guardarEdicion} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'system-ui' }}>
                  {guardando ? 'Guardando...' : modal === 'nuevo' ? '✓ Crear cliente y contrato' : '✓ Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
