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
  const [tab, setTab] = useState<'movimientos'|'nuevo'|'cheques'|'nuevo_cheque'|'papelera'|'importar'>(opPreseleccionada ? 'nuevo' : 'movimientos')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<string>(opPreseleccionada || '')
  const [tcHoy, setTcHoy] = useState<number>(1415)
  const [tcLabel, setTcLabel] = useState<string>('cargando...')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [confirmCambio, setConfirmCambio] = useState<{id: string, estado: string}|null>(null)

  // Edit / delete states
  const [editandoMov, setEditandoMov] = useState<any>(null)
  const [confirmDelMov, setConfirmDelMov] = useState<string|null>(null)
  const [confirmDelCheque, setConfirmDelCheque] = useState<string|null>(null)
  const [editandoCheque, setEditandoCheque] = useState<any>(null)

  // Papelera
  const [papeleraMovs, setPapeleraMovs] = useState<any[]>([])
  const [papeleraCheques, setPapeleraCheques] = useState<any[]>([])
  const [papeleraCargada, setPapeleraCargada] = useState(false)

  // Importador de extractos
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importSeleccion, setImportSeleccion] = useState<Set<number>>(new Set())
  const [importando, setImportando] = useState(false)
  const [importNombre, setImportNombre] = useState('')

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
    if (opPreseleccionada && ordenes.length > 0) aplicarOrden(opPreseleccionada, true)
  }, [opPreseleccionada, ordenes])

  const cargarPapelera = async () => {
    if (papeleraCargada) return
    const [{ data: movsDel }, { data: chequeDel }] = await Promise.all([
      supabase.from('movimientos_caja').select('*').eq('obra_id', obraId).eq('eliminado', true).order('fecha', { ascending: false }),
      supabase.from('cheques').select('*').eq('obra_id', obraId).eq('eliminado', true).order('fecha_vencimiento'),
    ])
    setPapeleraMovs(movsDel || [])
    setPapeleraCheques(chequeDel || [])
    setPapeleraCargada(true)
  }

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
      setFormCheque(f => ({ ...f, orden_pago_id: ordenId, monto: String(total), beneficiario: proveedor || f.beneficiario }))
    }
  }

  const guardarMovimiento = async () => {
    if (!form.concepto || (!form.monto_ars && !form.monto_usd)) { flash('❌ Completá el concepto y al menos un monto'); return }
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

  const guardarEdicionMov = async () => {
    if (!editandoMov) return
    setGuardando(true)
    const { error } = await supabase.from('movimientos_caja').update({
      fecha: editandoMov.fecha, tipo: editandoMov.tipo,
      concepto: editandoMov.concepto, contraparte: editandoMov.contraparte || null,
      monto_ars: editandoMov.monto_ars ? parseFloat(editandoMov.monto_ars) : null,
      monto_usd: editandoMov.monto_usd ? parseFloat(editandoMov.monto_usd) : null,
    }).eq('id', editandoMov.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setMovimientos(ms => ms.map(m => m.id === editandoMov.id ? { ...m, ...editandoMov,
        monto_ars: editandoMov.monto_ars ? parseFloat(editandoMov.monto_ars) : null,
        monto_usd: editandoMov.monto_usd ? parseFloat(editandoMov.monto_usd) : null,
      } : m))
      setEditandoMov(null)
      flash('✓ Movimiento actualizado')
    }
    setGuardando(false)
  }

  const eliminarMov = async (id: string) => {
    const { error } = await supabase.from('movimientos_caja').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const mov = movimientos.find(m => m.id === id)
      setMovimientos(ms => ms.filter(m => m.id !== id))
      if (mov) setPapeleraMovs(p => [mov, ...p])
      setPapeleraCargada(true)
      setConfirmDelMov(null)
      flash('✓ Movimiento eliminado · podés restaurarlo desde la Papelera')
    }
  }

  const restaurarMov = async (mov: any) => {
    const { error } = await supabase.from('movimientos_caja').update({ eliminado: false }).eq('id', mov.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setMovimientos(ms => [{ ...mov, eliminado: false }, ...ms])
      setPapeleraMovs(p => p.filter(m => m.id !== mov.id))
      flash('✓ Movimiento restaurado')
    }
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

  const guardarEdicionCheque = async () => {
    if (!editandoCheque) return
    setGuardando(true)
    const { error } = await supabase.from('cheques').update({
      numero: editandoCheque.numero, banco: editandoCheque.banco || null,
      fecha_vencimiento: editandoCheque.fecha_vencimiento,
      monto: parseFloat(editandoCheque.monto),
      beneficiario: editandoCheque.beneficiario || null,
      notas: editandoCheque.notas || null,
    }).eq('id', editandoCheque.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCheques(cs => cs.map(c => c.id === editandoCheque.id ? { ...c, ...editandoCheque, monto: parseFloat(editandoCheque.monto) } : c)
        .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()))
      setEditandoCheque(null)
      flash('✓ Cheque actualizado')
    }
    setGuardando(false)
  }

  const eliminarCheque = async (id: string) => {
    const { error } = await supabase.from('cheques').update({ eliminado: true }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const ch = cheques.find(c => c.id === id)
      setCheques(cs => cs.filter(c => c.id !== id))
      if (ch) setPapeleraCheques(p => [ch, ...p])
      setPapeleraCargada(true)
      setConfirmDelCheque(null)
      flash('✓ Cheque eliminado · podés restaurarlo desde la Papelera')
    }
  }

  const restaurarCheque = async (ch: any) => {
    const { error } = await supabase.from('cheques').update({ eliminado: false }).eq('id', ch.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCheques(cs => [...cs, { ...ch, eliminado: false }].sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()))
      setPapeleraCheques(p => p.filter(c => c.id !== ch.id))
      flash('✓ Cheque restaurado')
    }
  }

  const cambiarEstadoCheque = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase.from('cheques').update({ estado: nuevoEstado }).eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else { setCheques(cs => cs.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c)); setConfirmCambio(null); flash('✓ Estado actualizado') }
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

  const totalPapelera = papeleraMovs.length + papeleraCheques.length

  // ── Parsers de extracto ──────────────────────────────────────────────────
  const parsearOFX = (texto: string): any[] => {
    const txs: any[] = []
    // Normalizar: OFX usa SGML, no siempre es XML válido
    const bloques = texto.match(/<STMTTRN[\s\S]*?<\/STMTTRN>/gi) || []
    for (const bloque of bloques) {
      const get = (tag: string) => {
        const m = bloque.match(new RegExp(`<${tag}>([^<\r\n]+)`, 'i'))
        return m ? m[1].trim() : ''
      }
      const dtraw = get('DTPOSTED') || get('DTAVAIL')
      if (!dtraw) continue
      const fecha = `${dtraw.substring(0,4)}-${dtraw.substring(4,6)}-${dtraw.substring(6,8)}`
      const monto = parseFloat(get('TRNAMT'))
      if (isNaN(monto)) continue
      const concepto = get('MEMO') || get('NAME') || get('TRNTYPE') || 'Movimiento bancario'
      const fitid = get('FITID')
      txs.push({ fecha, monto, concepto, fitid })
    }
    return txs
  }

  const parsearCSV = (texto: string): any[] => {
    const txs: any[] = []
    // Detectar separador: ; o ,
    const sep = texto.includes(';') ? ';' : ','
    const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
    if (lineas.length < 2) return txs

    const header = lineas[0].toLowerCase()
    // Intentar detectar columnas por nombre de cabecera
    const cols = header.split(sep).map(c => c.replace(/"/g,'').trim())
    const ci = (names: string[]) => cols.findIndex(c => names.some(n => c.includes(n)))

    const iFecha   = ci(['fecha','date'])
    const iDesc    = ci(['descripci','concepto','detalle','memo'])
    const iDebito  = ci(['débito','debito','debit','egreso','cargo'])
    const iCredito = ci(['crédito','credito','credit','ingreso','abono','haber'])
    const iMonto   = ci(['monto','importe','amount'])
    const iRef     = ci(['referencia','ref','id','número','numero'])

    for (let i = 1; i < lineas.length; i++) {
      const partes = lineas[i].split(sep).map(p => p.replace(/"/g,'').trim())
      if (partes.length < 2) continue

      // Parsear fecha en formato DD/MM/YYYY o YYYY-MM-DD o DD-MM-YYYY
      const fechaRaw = iFecha >= 0 ? partes[iFecha] : ''
      let fecha = ''
      const m1 = fechaRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
      const m2 = fechaRaw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
      if (m2) {
        fecha = `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`
      } else if (m1) {
        const year = m1[3].length === 2 ? `20${m1[3]}` : m1[3]
        fecha = `${year}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
      }
      if (!fecha) continue

      // Parsear monto (formato argentino: "1.234,56" → 1234.56)
      const parseMonto = (s: string) =>
        parseFloat((s || '0').replace(/\./g,'').replace(',','.')) || 0

      let monto = 0
      if (iMonto >= 0) {
        monto = parseMonto(partes[iMonto])
      } else {
        const deb = parseMonto(iDebito >= 0 ? partes[iDebito] : '0')
        const cred = parseMonto(iCredito >= 0 ? partes[iCredito] : '0')
        monto = cred > 0 ? cred : -deb
      }
      if (monto === 0) continue

      const concepto = iDesc >= 0 ? partes[iDesc] : 'Movimiento bancario'
      const fitid    = iRef >= 0 ? partes[iRef] : ''
      txs.push({ fecha, monto, concepto, fitid })
    }
    return txs
  }

  const procesarArchivo = (file: File) => {
    if (!file) return
    setImportNombre(file.name)
    setImportPreview([])
    setImportSeleccion(new Set())
    const reader = new FileReader()
    reader.onload = (e) => {
      const texto = e.target?.result as string
      if (!texto) return
      const ext = file.name.split('.').pop()?.toLowerCase()
      let txs: any[] = []
      if (ext === 'ofx' || ext === 'qfx') {
        txs = parsearOFX(texto)
      } else if (ext === 'csv' || ext === 'txt') {
        txs = parsearCSV(texto)
      }
      if (txs.length === 0) {
        flash('❌ No se encontraron movimientos en el archivo. Verificá el formato.')
        return
      }
      // Marcar posibles duplicados comparando con movimientos existentes
      const movsCaja = movimientos.filter(m => m.caja_id === cajaActiva)
      const txsConInfo = txs.map(tx => {
        const tipo = tx.monto >= 0 ? 'ingreso' : 'egreso'
        const monto_ars = Math.abs(tx.monto)
        const esDuplicado = movsCaja.some(m =>
          m.fecha === tx.fecha &&
          Math.abs((m.monto_ars || m.monto_usd || 0) - monto_ars) < 1
        )
        return { ...tx, tipo, monto_ars, esDuplicado }
      })
      setImportPreview(txsConInfo)
      // Pre-seleccionar todos los no duplicados
      const sel = new Set<number>()
      txsConInfo.forEach((tx, i) => { if (!tx.esDuplicado) sel.add(i) })
      setImportSeleccion(sel)
    }
    reader.readAsText(file, 'latin1') // Galicia usa latin1/ISO-8859-1
  }

  const ejecutarImportacion = async () => {
    if (importSeleccion.size === 0) { flash('❌ Seleccioná al menos un movimiento'); return }
    setImportando(true)
    const rows = importPreview
      .filter((_, i) => importSeleccion.has(i))
      .map(tx => ({
        caja_id: cajaActiva,
        obra_id: obraId,
        fecha: tx.fecha,
        tipo: tx.tipo,
        concepto: tx.concepto,
        contraparte: null,
        monto_ars: tx.monto_ars,
        monto_usd: null,
        tc_blue: null,
        origen: 'manual',
      }))

    const BATCH = 50
    let ok = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const { data, error } = await supabase
        .from('movimientos_caja')
        .insert(rows.slice(i, i + BATCH))
        .select()
      if (error) { flash('❌ Error importando: ' + error.message); break }
      if (data) {
        setMovimientos(ms => [...data, ...ms])
        ok += data.length
      }
    }
    if (ok > 0) {
      flash(`✓ ${ok} movimiento${ok > 1 ? 's' : ''} importado${ok > 1 ? 's' : ''} correctamente`)
      setImportPreview([])
      setImportSeleccion(new Set())
      setImportNombre('')
      setTab('movimientos')
    }
    setImportando(false)
  }

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
          { key: 'papelera', label: `🗑️ Papelera${totalPapelera > 0 ? ` · ${totalPapelera}` : ''}` },
          { key: 'importar', label: '📥 Importar extracto' },
        ].map(t => (
          <div key={t.key} onClick={() => { setTab(t.key as any); if (t.key === 'papelera') cargarPapelera() }} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: tab === t.key ? (t.key === 'papelera' ? '#F87171' : '#F0C060') : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t.key ? (t.key === 'papelera' ? '#F87171' : '#F0C060') : 'transparent'}`,
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
                  {['Fecha','Concepto','Contraparte','Ingreso','Egreso',''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movsFiltrados.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
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
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setEditandoMov({ ...m, monto_ars: m.monto_ars ? String(m.monto_ars) : '', monto_usd: m.monto_usd ? String(m.monto_usd) : '' })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginRight: 4, opacity: 0.5 }} title="Editar">✏️</button>
                      {confirmDelMov === m.id ? (
                        <>
                          <button onClick={() => eliminarMov(m.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginRight: 4 }}>Sí</button>
                          <button onClick={() => setConfirmDelMov(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>No</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelMov(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.3, color: '#F87171' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>✕</button>
                      )}
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
                          <button onClick={() => setEditandoCheque({ ...c, monto: String(c.monto) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginRight: 4, opacity: 0.5 }} title="Editar">✏️</button>
                          {c.estado === 'emitido' && (
                            confirmCambio?.id === c.id ? (
                              <div style={{ display: 'inline-flex', gap: 4 }}>
                                <button onClick={() => cambiarEstadoCheque(c.id, confirmCambio!.estado)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>Sí</button>
                                <button onClick={() => setConfirmCambio(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>No</button>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', gap: 4 }}>
                                <button onClick={() => setConfirmCambio({ id: c.id, estado: 'depositado' })} style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>✓ Dep.</button>
                                <button onClick={() => setConfirmCambio({ id: c.id, estado: 'rechazado' })} style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, fontSize: 10, padding: '3px 8px', cursor: 'pointer' }}>✕ Rech.</button>
                              </div>
                            )
                          )}
                          {confirmDelCheque === c.id ? (
                            <>
                              <button onClick={() => eliminarCheque(c.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer', marginRight: 4, marginLeft: 4 }}>Sí</button>
                              <button onClick={() => setConfirmDelCheque(null)} style={{ background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>No</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDelCheque(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: 0.3, color: '#F87171', marginLeft: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}>✕</button>
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

      {/* Papelera */}
      {tab === 'papelera' && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F87171', marginBottom: 20 }}>🗑️ Papelera · elementos eliminados</div>
          {papeleraMovs.length === 0 && papeleraCheques.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              La papelera está vacía.
            </div>
          ) : (
            <>
              {papeleraMovs.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Movimientos eliminados · {papeleraMovs.length}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {papeleraMovs.map((m, i) => (
                        <tr key={m.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                          <td style={{ padding: '10px 18px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', width: 90 }}>{m.fecha}</td>
                          <td style={{ padding: '10px 18px' }}>{m.concepto}</td>
                          <td style={{ padding: '10px 18px', fontSize: 12, color: 'var(--text-secondary)' }}>{m.contraparte || '—'}</td>
                          <td style={{ padding: '10px 18px', fontFamily: 'monospace', color: m.tipo === 'ingreso' ? '#4ADE80' : '#F87171' }}>
                            {m.tipo === 'ingreso' ? '+ ' : '- '}$ {fmt(m.monto_ars)}
                          </td>
                          <td style={{ padding: '10px 18px', textAlign: 'right' }}>
                            <button onClick={() => restaurarMov(m)} style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                              ↩ Restaurar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {papeleraCheques.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Cheques eliminados · {papeleraCheques.length}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {papeleraCheques.map((c, i) => (
                        <tr key={c.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                          <td style={{ padding: '10px 18px', fontFamily: 'monospace', fontWeight: 600 }}>N°{c.numero}</td>
                          <td style={{ padding: '10px 18px', fontSize: 12, color: 'var(--text-secondary)' }}>{c.banco || '—'}</td>
                          <td style={{ padding: '10px 18px' }}>{c.beneficiario || '—'}</td>
                          <td style={{ padding: '10px 18px', fontFamily: 'monospace', fontSize: 12 }}>{c.fecha_vencimiento}</td>
                          <td style={{ padding: '10px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#F0C060' }}>$ {fmt(c.monto)}</td>
                          <td style={{ padding: '10px 18px', textAlign: 'right' }}>
                            <button onClick={() => restaurarCheque(c)} style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}>
                              ↩ Restaurar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Importar extracto */}
      {tab === 'importar' && (
        <div style={{ maxWidth: 860 }}>
          {/* Info */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📥 Importar extracto bancario</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Los movimientos se importarán a la caja activa: <strong style={{ color: 'var(--text-primary)' }}>{cajas.find(c => c.id === cajaActiva)?.nombre}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>• <strong>OFX / QFX</strong> — descargalo desde Galicia Empresas → Extractos → Exportar → formato OFX</div>
              <div>• <strong>CSV / TXT</strong> — exportación en texto plano, separado por punto y coma o coma</div>
              <div>• Los movimientos con fecha y monto coincidentes al extracto existente se marcan como posibles duplicados</div>
            </div>
          </div>

          {/* Upload zone */}
          <div
            style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '36px 20px', textAlign: 'center', marginBottom: 20, cursor: 'pointer', transition: 'border-color 0.2s' }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; const f = e.dataTransfer.files[0]; if (f) procesarArchivo(f) }}
            onClick={() => document.getElementById('import-file-input')?.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              {importNombre ? `Archivo cargado: ${importNombre}` : 'Arrastrá el archivo acá o hacé click para seleccionarlo'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>OFX, QFX, CSV, TXT</div>
            <input
              id="import-file-input"
              type="file"
              accept=".ofx,.qfx,.csv,.txt"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); e.target.value = '' }}
            />
          </div>

          {/* Preview */}
          {importPreview.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Vista previa · {importPreview.length} movimientos encontrados
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 10 }}>
                    {importSeleccion.size} seleccionados · {importPreview.filter(t => t.esDuplicado).length} posibles duplicados
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setImportSeleccion(new Set(importPreview.map((_, i) => i)))}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}
                  >Seleccionar todos</button>
                  <button
                    onClick={() => {
                      const nodup = new Set<number>()
                      importPreview.forEach((t, i) => { if (!t.esDuplicado) nodup.add(i) })
                      setImportSeleccion(nodup)
                    }}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}
                  >Solo nuevos</button>
                  <button
                    onClick={() => setImportSeleccion(new Set())}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui' }}
                  >Deseleccionar</button>
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-head)' }}>
                      <th style={{ padding: '9px 14px', width: 36 }}></th>
                      {['Fecha','Concepto','Tipo','Monto','Estado'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((tx, i) => (
                      <tr key={i} style={{
                        borderTop: '1px solid var(--border)',
                        opacity: importSeleccion.has(i) ? 1 : 0.4,
                        background: tx.esDuplicado ? 'rgba(245,158,11,0.04)' : 'transparent',
                      }}>
                        <td style={{ padding: '8px 14px' }}>
                          <input
                            type="checkbox"
                            checked={importSeleccion.has(i)}
                            onChange={e => {
                              const s = new Set(importSeleccion)
                              e.target.checked ? s.add(i) : s.delete(i)
                              setImportSeleccion(s)
                            }}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                        </td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tx.fecha}</td>
                        <td style={{ padding: '8px 14px', fontSize: 13, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.concepto}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{ background: tx.tipo === 'ingreso' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', color: tx.tipo === 'ingreso' ? '#4ADE80' : '#F87171', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                            {tx.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 600, color: tx.tipo === 'ingreso' ? '#4ADE80' : '#F87171' }}>
                          {tx.tipo === 'egreso' ? '-' : ''}$ {fmt(tx.monto_ars)}
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          {tx.esDuplicado
                            ? <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>⚠ Posible duplicado</span>
                            : <span style={{ background: 'rgba(34,197,94,0.08)', color: '#4ADE80', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Nuevo</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => { setImportPreview([]); setImportNombre('') }}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}
                >Cancelar</button>
                <button
                  onClick={ejecutarImportacion}
                  disabled={importando || importSeleccion.size === 0}
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: importSeleccion.size === 0 ? 'not-allowed' : 'pointer', opacity: importSeleccion.size === 0 ? 0.5 : 1, fontFamily: 'system-ui' }}
                >
                  {importando ? 'Importando...' : `✓ Importar ${importSeleccion.size} movimiento${importSeleccion.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal edición movimiento */}
      {editandoMov && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Editar movimiento</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={editandoMov.fecha} onChange={e => setEditandoMov((d: any) => ({...d, fecha: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={editandoMov.tipo} onChange={e => setEditandoMov((d: any) => ({...d, tipo: e.target.value}))} style={inputStyle}>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Concepto</label>
                <input value={editandoMov.concepto} onChange={e => setEditandoMov((d: any) => ({...d, concepto: e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Contraparte</label>
                <input value={editandoMov.contraparte || ''} onChange={e => setEditandoMov((d: any) => ({...d, contraparte: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto ARS $</label>
                <input type="number" value={editandoMov.monto_ars} onChange={e => setEditandoMov((d: any) => ({...d, monto_ars: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto USD</label>
                <input type="number" value={editandoMov.monto_usd} onChange={e => setEditandoMov((d: any) => ({...d, monto_usd: e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditandoMov(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={guardarEdicionMov} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edición cheque */}
      {editandoCheque && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Editar cheque N°{editandoCheque.numero}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>N° cheque</label>
                <input value={editandoCheque.numero} onChange={e => setEditandoCheque((d: any) => ({...d, numero: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Banco</label>
                <input value={editandoCheque.banco || ''} onChange={e => setEditandoCheque((d: any) => ({...d, banco: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto $</label>
                <input type="number" value={editandoCheque.monto} onChange={e => setEditandoCheque((d: any) => ({...d, monto: e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Fecha vencimiento</label>
                <input type="date" value={editandoCheque.fecha_vencimiento} onChange={e => setEditandoCheque((d: any) => ({...d, fecha_vencimiento: e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Beneficiario</label>
                <input value={editandoCheque.beneficiario || ''} onChange={e => setEditandoCheque((d: any) => ({...d, beneficiario: e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notas</label>
                <input value={editandoCheque.notas || ''} onChange={e => setEditandoCheque((d: any) => ({...d, notas: e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditandoCheque(null)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' }}>Cancelar</button>
              <button onClick={guardarEdicionCheque} disabled={guardando} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
