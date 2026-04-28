'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)',
  fontFamily: 'system-ui', fontSize: 13, outline: 'none'
}
const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' as const }

export default function ProveedorClient({ proveedor, certificadosIniciales, rubros, obraId, empresaAdmin, obraNombre, obraDireccion }: {
  proveedor: any, certificadosIniciales: any[], rubros: any[], obraId: string,
  empresaAdmin: string, obraNombre: string, obraDireccion: string
}) {
  const [certs, setCerts] = useState(certificadosIniciales)
  const [papelera, setPapelera] = useState<any[]>([])
  const [verPapelera, setVerPapelera] = useState(false)
  const [tab, setTab] = useState<'cuenta'|'nuevo_cert'|'orden_pago'>('cuenta')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [certSeleccionado, setCertSeleccionado] = useState<any>(null)
  const [ordenGenerada, setOrdenGenerada] = useState<any>(null)
  const [editandoCert, setEditandoCert] = useState<any>(null)
  const [editandoOrden, setEditandoOrden] = useState<any>(null)
  const [confirmDelCert, setConfirmDelCert] = useState<string|null>(null)
  const [confirmDelOrden, setConfirmDelOrden] = useState<string|null>(null)

  const [formCert, setFormCert] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '', monto_base: '', ajuste_cac: '',
    monto_iva: '', otros_impuestos: '',
    rubro_id: rubros[0]?.id || '', notas: '',
  })

  const [formOrden, setFormOrden] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto_efectivo: '', monto_transfer: '', monto_cheque: '', notas: '',
  })

  const flash = (msg: string) => { setMensaje(msg); setTimeout(() => setMensaje(''), 3500) }

  const getPagadoCert = (c: any) =>
    c.ordenes_pago?.filter((o: any) => o.estado === 'pagada')
      .reduce((a: number, o: any) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0

  const getBasecert = (c: any) => c.monto_base || c.monto_certificado || 0

  const totalCertificado = certs.reduce((a, c) => a + (c.monto_certificado || 0), 0)
  const totalBase = certs.reduce((a, c) => a + getBasecert(c), 0)
  const totalPagado = certs.reduce((a, c) => a + getPagadoCert(c), 0)
  const saldo = totalBase - totalPagado

  const guardarCert = async () => {
    if (!formCert.monto_base) { flash('❌ Completá el monto base'); return }
    setGuardando(true)
    const montoBase = parseFloat(formCert.monto_base) || 0
    const ajusteCac = parseFloat(formCert.ajuste_cac) || 0
    const montoIva = parseFloat(formCert.monto_iva) || 0
    const otrosImp = parseFloat(formCert.otros_impuestos) || 0
    const montoTotal = montoBase + ajusteCac + montoIva + otrosImp
    const notasPartes = [
      formCert.notas,
      ajusteCac > 0 ? `Ajuste CAC: $${fmt(ajusteCac)}` : '',
      montoIva > 0 ? `IVA: $${fmt(montoIva)}` : '',
      otrosImp > 0 ? `Otros imp.: $${fmt(otrosImp)}` : '',
    ].filter(Boolean).join(' · ')

    const { data: maxCert } = await supabase
      .from('certificados').select('numero').eq('proveedor_id', proveedor.id)
      .order('numero', { ascending: false }).limit(1).single()
    const numeroCert = (maxCert?.numero || 0) + 1

    const { data, error } = await supabase.from('certificados').insert({
      obra_id: obraId, proveedor_id: proveedor.id,
      rubro_id: formCert.rubro_id || null, numero: numeroCert,
      fecha: formCert.fecha, descripcion: formCert.descripcion || null,
      monto_certificado: montoTotal, tiene_iva: montoIva > 0,
      porcentaje_iva: 0, estado: 'pendiente', notas: notasPartes || null,
      monto_base: montoBase, monto_ajuste_cac: ajusteCac,
      monto_iva_manual: montoIva, monto_otros_imp: otrosImp,
    }).select('*, ordenes_pago(*)').single()
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCerts(cs => [...cs, data])
      setFormCert({ fecha: new Date().toISOString().split('T')[0], descripcion: '', monto_base: '', ajuste_cac: '', monto_iva: '', otros_impuestos: '', rubro_id: rubros[0]?.id || '', notas: '' })
      setTab('cuenta')
      flash('✓ Certificado cargado')
    }
    setGuardando(false)
  }

  const guardarEdicionCert = async () => {
    if (!editandoCert) return
    setGuardando(true)
    const { error } = await supabase.from('certificados').update({
      fecha: editandoCert.fecha, descripcion: editandoCert.descripcion,
      monto_certificado: parseFloat(editandoCert.monto_certificado) || 0,
      notas: editandoCert.notas || null, rubro_id: editandoCert.rubro_id || null,
    }).eq('id', editandoCert.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCerts(cs => cs.map(c => c.id === editandoCert.id ? { ...c, ...editandoCert } : c))
      setEditandoCert(null)
      flash('✓ Certificado actualizado')
    }
    setGuardando(false)
  }

  const eliminarCert = async (id: string) => {
    const cert = certs.find(c => c.id === id)
    const ordenesDelCert = cert?.ordenes_pago || []
    const { error } = await supabase.from('certificados').delete().eq('id', id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      const nuevosItems = [
        { tipo: 'certificado', datos: cert, eliminadoEn: new Date().toLocaleString('es-AR') },
        ...ordenesDelCert.map((o: any) => ({
          tipo: 'orden', datos: { ...o, certificado_id: id },
          eliminadoEn: new Date().toLocaleString('es-AR'), certEliminado: true
        }))
      ]
      setPapelera(p => [...p, ...nuevosItems])
      setCerts(cs => cs.filter(c => c.id !== id))
      setConfirmDelCert(null)
      flash('✓ Certificado eliminado · podés restaurarlo desde la papelera')
    }
  }

  const restaurarCert = async (item: any) => {
    const { data, error } = await supabase.from('certificados').insert({
      obra_id: item.datos.obra_id, proveedor_id: item.datos.proveedor_id,
      rubro_id: item.datos.rubro_id || null, numero: item.datos.numero,
      fecha: item.datos.fecha, descripcion: item.datos.descripcion || null,
      monto_certificado: item.datos.monto_certificado, tiene_iva: item.datos.tiene_iva,
      porcentaje_iva: item.datos.porcentaje_iva || 0, estado: item.datos.estado,
      notas: item.datos.notas || null,
    }).select('*, ordenes_pago(*)').single()
    if (error) { flash('❌ Error al restaurar: ' + error.message) }
    else {
      setCerts(cs => [...cs, data])
      setPapelera(p => p.filter(x => !(x === item || (x.certEliminado && x.datos.certificado_id === item.datos.id))))
      flash('✓ Certificado restaurado')
    }
  }

  const guardarEdicionOrden = async () => {
    if (!editandoOrden) return
    setGuardando(true)
    const { error } = await supabase.from('ordenes_pago').update({
      fecha: editandoOrden.fecha,
      monto_efectivo: parseFloat(editandoOrden.monto_efectivo) || 0,
      monto_transfer: parseFloat(editandoOrden.monto_transfer) || 0,
      monto_cheque: parseFloat(editandoOrden.monto_cheque) || 0,
      notas: editandoOrden.notas || null,
    }).eq('id', editandoOrden.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setCerts(cs => cs.map(c => ({
        ...c,
        ordenes_pago: c.ordenes_pago?.map((o: any) => o.id === editandoOrden.id ? { ...o, ...editandoOrden } : o)
      })))
      setEditandoOrden(null)
      flash('✓ Orden actualizada')
    }
    setGuardando(false)
  }

  const eliminarOrden = async (orden: any, certId: string) => {
    const { error } = await supabase.from('ordenes_pago').delete().eq('id', orden.id)
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      setPapelera(p => [...p, { tipo: 'orden', datos: { ...orden, certificado_id: certId }, eliminadoEn: new Date().toLocaleString('es-AR'), certEliminado: false }])
      setCerts(cs => cs.map(c => c.id === certId
        ? { ...c, ordenes_pago: c.ordenes_pago?.filter((o: any) => o.id !== orden.id) }
        : c))
      setConfirmDelOrden(null)
      flash('✓ Orden eliminada · podés restaurarla desde la papelera')
    }
  }

  const restaurarOrden = async (item: any) => {
    if (item.certEliminado) { flash('❌ Primero restaurá el certificado asociado'); return }
    const { certificado_id, id, cert, ...resto } = item.datos
    const { data, error } = await supabase.from('ordenes_pago').insert({
      certificado_id, obra_id: resto.obra_id, proveedor_id: resto.proveedor_id,
      numero: resto.numero, fecha: resto.fecha,
      monto_efectivo: resto.monto_efectivo || 0, monto_transfer: resto.monto_transfer || 0,
      monto_cheque: resto.monto_cheque || 0, monto_iva: resto.monto_iva || 0,
      estado: 'emitida', notas: resto.notas || null,
    }).select().single()
    if (error) { flash('❌ Error al restaurar: ' + error.message) }
    else {
      setCerts(cs => cs.map(c => c.id === certificado_id
        ? { ...c, ordenes_pago: [...(c.ordenes_pago||[]), data] }
        : c))
      setPapelera(p => p.filter(x => x !== item))
      flash('✓ Orden restaurada')
    }
  }

  const generarOrden = async () => {
    const montoEfvo = parseFloat(formOrden.monto_efectivo) || 0
    const montoTrans = parseFloat(formOrden.monto_transfer) || 0
    const montoCheq = parseFloat(formOrden.monto_cheque) || 0
    if (montoEfvo + montoTrans + montoCheq === 0) { flash('❌ Ingresá al menos un monto'); return }
    if (!certSeleccionado) { flash('❌ Seleccioná un certificado'); return }
    setGuardando(true)

    const { data: maxOrden } = await supabase
      .from('ordenes_pago').select('numero').eq('obra_id', obraId)
      .order('numero', { ascending: false }).limit(1).single()
    const numeroOrden = (maxOrden?.numero || 0) + 1

    const { data, error } = await supabase.from('ordenes_pago').insert({
      certificado_id: certSeleccionado.id, obra_id: obraId,
      proveedor_id: proveedor.id, numero: numeroOrden,
      fecha: formOrden.fecha, monto_efectivo: montoEfvo,
      monto_transfer: montoTrans, monto_cheque: montoCheq,
      monto_iva: 0, estado: 'emitida', notas: formOrden.notas || null,
    }).select().single()
    if (error) { flash('❌ Error: ' + error.message) }
    else {
      await supabase.from('certificados').update({ estado: 'pagado_parcial' }).eq('id', certSeleccionado.id)
      setCerts(cs => cs.map(c => c.id === certSeleccionado.id
        ? { ...c, estado: 'pagado_parcial', ordenes_pago: [...(c.ordenes_pago||[]), data] }
        : c))
      setOrdenGenerada({ ...data, cert: certSeleccionado })
      flash('✓ Orden emitida — registrá el pago en Caja para completar')
      setFormOrden({ fecha: new Date().toISOString().split('T')[0], monto_efectivo: '', monto_transfer: '', monto_cheque: '', notas: '' })
    }
    setGuardando(false)
  }

  const marcarPagada = async (orden: any) => {
    setGuardando(true)
    await supabase.from('ordenes_pago').update({ estado: 'pagada', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', orden.id)
    const { data: cajasBanco } = await supabase.from('cajas').select('id').eq('obra_id', obraId).eq('nombre', 'Banco ARS').single()
    const { data: cajasCash } = await supabase.from('cajas').select('id').eq('obra_id', obraId).eq('nombre', 'Cash ARS').single()
    if (orden.monto_transfer > 0 && cajasBanco?.id) {
      await supabase.from('movimientos_caja').insert({
        caja_id: cajasBanco.id, obra_id: obraId, fecha: new Date().toISOString().split('T')[0],
        tipo: 'egreso', concepto: `OP N°${orden.numero} - ${proveedor.razon_social}`,
        contraparte: proveedor.razon_social, monto_ars: orden.monto_transfer, origen: 'manual', orden_pago_id: orden.id,
      })
    }
    if (orden.monto_efectivo > 0 && cajasCash?.id) {
      await supabase.from('movimientos_caja').insert({
        caja_id: cajasCash.id, obra_id: obraId, fecha: new Date().toISOString().split('T')[0],
        tipo: 'egreso', concepto: `OP N°${orden.numero} - ${proveedor.razon_social} (efectivo)`,
        contraparte: proveedor.razon_social, monto_ars: orden.monto_efectivo, origen: 'manual', orden_pago_id: orden.id,
      })
    }
    const cert = certs.find(c => c.id === orden.certificado_id)
    if (cert) {
      const totalOrdenesPagadas = cert.ordenes_pago
        ?.filter((o: any) => o.id === orden.id || o.estado === 'pagada')
        .reduce((a: number, o: any) => a + (o.monto_efectivo||0) + (o.monto_transfer||0) + (o.monto_cheque||0), 0) || 0
      const nuevoEstado = totalOrdenesPagadas >= cert.monto_certificado * 0.99 ? 'pagado' : 'pagado_parcial'
      await supabase.from('certificados').update({ estado: nuevoEstado }).eq('id', cert.id)
      setCerts(cs => cs.map(c => c.id === cert.id
        ? { ...c, estado: nuevoEstado, ordenes_pago: c.ordenes_pago?.map((o: any) => o.id === orden.id ? { ...o, estado: 'pagada' } : o) }
        : c))
    }
    flash('✓ Pago registrado en caja')
    setGuardando(false)
  }

  const imprimirOrden = (orden: any) => {
    const montoTotal = (orden.monto_efectivo||0) + (orden.monto_transfer||0) + (orden.monto_cheque||0)
    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .empresa { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
  .empresa-sub { font-size: 10px; color: #555; margin-top: 2px; }
  .seccion { margin-bottom: 12px; }
  .seccion-titulo { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .campo label { font-size: 9px; text-transform: uppercase; color: #777; display: block; margin-bottom: 1px; }
  .campo .valor { font-size: 12px; font-weight: 500; }
  .montos { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .montos th { background: #f5f5f5; padding: 6px 10px; text-align: left; font-size: 10px; text-transform: uppercase; border: 1px solid #ddd; }
  .montos td { padding: 6px 10px; border: 1px solid #ddd; font-size: 11px; }
  .montos .total-row td { font-weight: 700; font-size: 13px; background: #f9f9f9; }
  .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; }
  .firma-linea { border-top: 1px solid #111; padding-top: 5px; margin-top: 40px; font-size: 9px; color: #555; }
  .recibo { margin-top: 16px; border-top: 2px dashed #111; padding-top: 14px; }
  .recibo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .firmas-recibo { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="empresa">${empresaAdmin}</div>
    <div class="empresa-sub">${obraNombre} · ${obraDireccion}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:16px;font-weight:700;">ORDEN DE PAGO</div>
    <div style="font-size:10px;color:#555;">N° ${String(orden.numero).padStart(4,'0')} · ${orden.fecha}</div>
    <div style="font-size:10px;color:#c00;font-weight:700;margin-top:3px;">ESTADO: A PAGAR</div>
  </div>
</div>
<div class="seccion">
  <div class="seccion-titulo">Proveedor</div>
  <div class="grid2">
    <div class="campo"><label>Razón social</label><div class="valor">${proveedor.razon_social}</div></div>
    <div class="campo"><label>CUIT</label><div class="valor">${proveedor.cuit || '—'}</div></div>
    <div class="campo"><label>Rubro</label><div class="valor">${proveedor.rubro || '—'}</div></div>
    <div class="campo"><label>Certificado N°</label><div class="valor">${String(orden.cert?.numero||'').padStart(2,'0')}</div></div>
  </div>
</div>
${orden.cert?.descripcion ? `<div class="seccion"><div class="seccion-titulo">Descripción</div><div style="font-size:11px;">${orden.cert.descripcion}</div></div>` : ''}
${orden.cert?.notas ? `<div class="seccion"><div class="seccion-titulo">Detalle</div><div style="font-size:11px;">${orden.cert.notas}</div></div>` : ''}
<div class="seccion">
  <div class="seccion-titulo">Detalle de pago</div>
  <div style="background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:8px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:10px;text-transform:uppercase;color:#555;letter-spacing:1px;">Total certificado N°${String(orden.cert?.numero||'').padStart(2,'0')}</span>
    <span style="font-size:16px;font-weight:700;">$ ${fmt(orden.cert?.monto_certificado || 0)}</span>
  </div>
  <table class="montos">
    <thead><tr><th>Forma de pago</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>
      ${orden.monto_transfer > 0 ? `<tr><td>Transferencia bancaria</td><td style="text-align:right">$ ${fmt(orden.monto_transfer)}</td></tr>` : ''}
      ${orden.monto_efectivo > 0 ? `<tr><td>Efectivo</td><td style="text-align:right">$ ${fmt(orden.monto_efectivo)}</td></tr>` : ''}
      ${orden.monto_cheque > 0 ? `<tr><td>Cheque</td><td style="text-align:right">$ ${fmt(orden.monto_cheque)}</td></tr>` : ''}
      <tr class="total-row"><td>TOTAL A PAGAR</td><td style="text-align:right">$ ${fmt(montoTotal)}</td></tr>
    </tbody>
  </table>
  ${orden.cert?.monto_certificado && montoTotal < orden.cert.monto_certificado ? `<div style="margin-top:8px;font-size:10px;color:#888;">Saldo pendiente del certificado: $ ${fmt(orden.cert.monto_certificado - montoTotal)}</div>` : ''}
  ${orden.notas ? `<div style="margin-top:6px;font-size:10px;color:#555;">Notas: ${orden.notas}</div>` : ''}
</div>
<div class="firmas">
  <div>
    <div style="font-size:10px;color:#555;margin-bottom:4px;">Autorizado por</div>
    <div class="firma-linea">Firma</div>
    <div class="firma-linea">Aclaración</div>
    <div class="firma-linea">DNI</div>
    <div class="firma-linea">Fecha</div>
  </div>
  <div>
    <div style="font-size:10px;color:#555;margin-bottom:4px;">Recibí conforme · ${proveedor.razon_social}</div>
    <div class="firma-linea">Firma</div>
    <div class="firma-linea">Aclaración</div>
    <div class="firma-linea">DNI</div>
    <div class="firma-linea">Fecha</div>
  </div>
</div>
<div class="recibo">
  <div style="font-size:12px;font-weight:700;margin-bottom:10px;">✂ RECIBO · ${obraNombre}</div>
  <div class="recibo-grid">
    <div class="campo"><label>Empresa administradora</label><div class="valor">${empresaAdmin}</div></div>
    <div class="campo"><label>Proveedor</label><div class="valor">${proveedor.razon_social}</div></div>
    <div class="campo"><label>Orden de pago N°</label><div class="valor">${String(orden.numero).padStart(4,'0')} · ${orden.fecha}</div></div>
    <div class="campo"><label>Monto total</label><div class="valor" style="font-size:16px;font-weight:700;">$ ${fmt(montoTotal)}</div></div>
  </div>
  <div class="firmas-recibo">
    <div>
      <div style="font-size:10px;color:#555;margin-bottom:4px;">Proveedor · ${proveedor.razon_social}</div>
      <div class="firma-linea">Firma</div>
      <div class="firma-linea">Aclaración</div>
      <div class="firma-linea">DNI</div>
      <div class="firma-linea">Fecha de cobro</div>
    </div>
    <div></div>
  </div>
</div>
</body></html>`
    const ventana = window.open('', '_blank')
    if (ventana) { ventana.document.write(html); ventana.document.close(); ventana.print() }
  }

  const certsPendientes = certs.filter(c => c.estado !== 'pagado')

  return (
    <>
      {mensaje && (
        <div style={{ position:'fixed', top:20, right:24, zIndex:999,
          background: mensaje.startsWith('✓') ? '#16a34a' : '#dc2626',
          color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:600
        }}>{mensaje}</div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total certificado', valor:`$ ${fmt(totalCertificado)}`, color:'var(--text-primary)' },
          { label:'Monto base (sin CAC/IVA)', valor:`$ ${fmt(totalBase)}`, color:'#60A5FA' },
          { label:'Total pagado', valor:`$ ${fmt(totalPagado)}`, color:'#4ADE80' },
          { label:'Saldo pendiente', valor:`$ ${fmt(saldo)}`, color: saldo>0?'#F87171':'#4ADE80' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 20px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:700, fontFamily:'monospace', color:k.color }}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        {[
          { key:'cuenta', label:`Cuenta corriente · ${certs.length} certificados` },
          { key:'nuevo_cert', label:'＋ Nuevo certificado' },
          { key:'orden_pago', label:'📄 Generar orden de pago' },
        ].map(t => (
          <div key={t.key} onClick={() => { setTab(t.key as any); setOrdenGenerada(null) }} style={{
            padding:'10px 18px', fontSize:13, fontWeight:500, cursor:'pointer',
            color: tab===t.key ? '#F0C060' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab===t.key ? '#F0C060' : 'transparent'}`,
          }}>{t.label}</div>
        ))}
      </div>

      {/* Cuenta corriente */}
      {tab === 'cuenta' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button onClick={() => setVerPapelera(v => !v)} style={{
              background:'transparent', color: papelera.length>0?'#F87171':'var(--text-muted)',
              border:`1px solid ${papelera.length>0?'rgba(239,68,68,0.3)':'var(--border)'}`,
              borderRadius:6, padding:'6px 14px', fontSize:12, cursor:'pointer', fontFamily:'system-ui'
            }}>
              🗑️ Papelera {papelera.length > 0 ? `· ${papelera.length}` : ''}
            </button>
          </div>

          {verPapelera && (
            <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#F87171', marginBottom:14 }}>🗑️ Papelera · elementos eliminados en esta sesión</div>
              {papelera.length === 0
                ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Papelera vacía.</div>
                : papelera.map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom: i < papelera.length-1 ? '1px solid rgba(239,68,68,0.1)' : 'none' }}>
                    <span style={{ fontSize:18 }}>{item.tipo === 'certificado' ? '📋' : '📄'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'var(--text-primary)' }}>
                        {item.tipo === 'certificado'
                          ? `Certificado N°${String(item.datos.numero).padStart(2,'0')} · $ ${fmt(item.datos.monto_certificado)}`
                          : `Orden N°${String(item.datos.numero).padStart(4,'0')} · $ ${fmt((item.datos.monto_efectivo||0)+(item.datos.monto_transfer||0)+(item.datos.monto_cheque||0))}`
                        }
                      </div>
                      <div style={{ fontSize:11, color: item.certEliminado ? '#F59E0B' : 'var(--text-muted)', marginTop:2 }}>
                        {item.certEliminado ? '⚠ Restaurá primero el certificado asociado' : `Eliminado: ${item.eliminadoEn}`}
                      </div>
                    </div>
                    <button
                      onClick={() => item.tipo === 'certificado' ? restaurarCert(item) : restaurarOrden(item)}
                      disabled={item.certEliminado}
                      style={{
                        background: item.certEliminado ? 'var(--tag-bg)' : 'rgba(59,130,246,0.12)',
                        color: item.certEliminado ? 'var(--text-muted)' : '#60A5FA',
                        border: `1px solid ${item.certEliminado ? 'var(--border)' : 'rgba(59,130,246,0.3)'}`,
                        borderRadius:6, padding:'4px 12px', fontSize:12,
                        cursor: item.certEliminado ? 'not-allowed' : 'pointer', fontFamily:'system-ui'
                      }}>
                      ↩ Restaurar
                    </button>
                  </div>
                ))
              }
            </div>
          )}

          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:24 }}>
            {certs.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                Sin certificados. <span style={{ color:'#60A5FA', cursor:'pointer' }} onClick={() => setTab('nuevo_cert')}>Cargar primer certificado →</span>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--bg-table-head)' }}>
                    {['N°','Fecha','Descripción','Certificado','Pagado','Saldo','Estado',''].map(h => (
                      <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, color:'var(--text-muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c, idx) => {
                    const pagado = getPagadoCert(c)
                    const saldoC = c.monto_certificado - pagado
                    return (
                      <tr key={c.id} style={{ borderTop:'1px solid var(--border)', background: idx%2===0?'transparent':'var(--row-alt)' }}>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', color:'var(--text-muted)', fontSize:12 }}>{String(c.numero).padStart(2,'0')}</td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:12 }}>{c.fecha}</td>
                        <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text-secondary)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {c.descripcion || '—'}
                          {c.notas && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{c.notas}</div>}
                        </td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontWeight:600 }}>$ {fmt(c.monto_certificado)}</td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', color:'#4ADE80' }}>$ {fmt(pagado)}</td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', color: saldoC>0?'#F87171':'#4ADE80', fontWeight:600 }}>
                          {saldoC > 0 ? `$ ${fmt(saldoC)}` : '✓'}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{
                            background: c.estado==='pagado'?'rgba(34,197,94,0.12)':c.estado==='pagado_parcial'?'rgba(59,130,246,0.12)':'rgba(245,158,11,0.12)',
                            color: c.estado==='pagado'?'#4ADE80':c.estado==='pagado_parcial'?'#60A5FA':'#F59E0B',
                            padding:'2px 8px', borderRadius:20, fontSize:11
                          }}>
                            {c.estado==='pagado'?'✓ Pagado':c.estado==='pagado_parcial'?'Parcial':'Pendiente'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                          <button onClick={() => setEditandoCert({ ...c, monto_certificado: String(c.monto_certificado) })}
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, marginRight:4, opacity:0.6 }}>✏️</button>
                          {confirmDelCert === c.id
                            ? <>
                                <button onClick={() => eliminarCert(c.id)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer', marginRight:4 }}>Sí</button>
                                <button onClick={() => setConfirmDelCert(null)} style={{ background:'var(--border)', color:'var(--text-secondary)', border:'none', borderRadius:3, fontSize:10, padding:'2px 6px', cursor:'pointer' }}>No</button>
                              </>
                            : <button onClick={() => setConfirmDelCert(c.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, opacity:0.3, color:'#F87171' }}
                                onMouseEnter={e => (e.currentTarget.style.opacity='1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity='0.3')}>✕</button>
                          }
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop:'2px solid var(--border)', background:'var(--row-alt)' }}>
                    <td colSpan={3} style={{ padding:'12px 14px', fontWeight:600 }}>TOTALES</td>
                    <td style={{ padding:'12px 14px', fontFamily:'monospace', fontWeight:700 }}>$ {fmt(totalCertificado)}</td>
                    <td style={{ padding:'12px 14px', fontFamily:'monospace', fontWeight:700, color:'#4ADE80' }}>$ {fmt(totalPagado)}</td>
                    <td style={{ padding:'12px 14px', fontFamily:'monospace', fontWeight:700, color: saldo>0?'#F87171':'#4ADE80' }}>$ {fmt(saldo)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {certs.some(c => c.ordenes_pago?.some((o: any) => o.estado === 'emitida')) && (
            <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#F59E0B', marginBottom:14 }}>⏳ Órdenes emitidas — pendientes de pago en caja</div>
              {certs.flatMap(c =>
                (c.ordenes_pago||[]).filter((o: any) => o.estado === 'emitida').map((o: any) => (
                  <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(245,158,11,0.1)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>OP N°{String(o.numero).padStart(4,'0')} · Cert. N°{String(c.numero).padStart(2,'0')}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                        {o.fecha} {o.monto_transfer>0?`· Transfer: $${fmt(o.monto_transfer)}`:''} {o.monto_efectivo>0?`· Efectivo: $${fmt(o.monto_efectivo)}`:''} {o.monto_cheque>0?`· Cheque: $${fmt(o.monto_cheque)}`:''}
                      </div>
                    </div>
                    <div style={{ fontFamily:'monospace', fontWeight:700, color:'#F59E0B' }}>
                      $ {fmt((o.monto_efectivo||0)+(o.monto_transfer||0)+(o.monto_cheque||0))}
                    </div>
                    <button onClick={() => setEditandoOrden({ ...o, monto_efectivo: String(o.monto_efectivo||0), monto_transfer: String(o.monto_transfer||0), monto_cheque: String(o.monto_cheque||0) })}
                      style={{ background:'transparent', color:'#60A5FA', border:'1px solid rgba(59,130,246,0.3)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'system-ui' }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => imprimirOrden({ ...o, cert: c })}
                      style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'system-ui' }}>
                      🖨️ Imprimir
                    </button>
                    {confirmDelOrden === o.id
                      ? <>
                          <button onClick={() => eliminarOrden(o, c.id)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:4, fontSize:11, padding:'4px 8px', cursor:'pointer' }}>Sí, eliminar</button>
                          <button onClick={() => setConfirmDelOrden(null)} style={{ background:'var(--border)', color:'var(--text-secondary)', border:'none', borderRadius:4, fontSize:11, padding:'4px 8px', cursor:'pointer' }}>No</button>
                        </>
                      : <button onClick={() => setConfirmDelOrden(o.id)}
                          style={{ background:'rgba(239,68,68,0.1)', color:'#F87171', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'system-ui' }}>
                          🗑️
                        </button>
                    }
                    <button onClick={() => marcarPagada({ ...o, certificado_id: c.id })} disabled={guardando}
                      style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
                      ✓ Marcar pagada
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Nuevo certificado */}
      {tab === 'nuevo_cert' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:28, maxWidth:580 }}>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:20 }}>
            Certificado N°{String(certs.length+1).padStart(2,'0')} · {proveedor.razon_social}
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={formCert.fecha} onChange={e => setFormCert(f => ({...f, fecha:e.target.value}))} style={inputStyle}/>
            </div>
            <div style={{ gridColumn:'1 / -1' }}>
              <label style={labelStyle}>Descripción del trabajo</label>
              <input value={formCert.descripcion} onChange={e => setFormCert(f => ({...f, descripcion:e.target.value}))} placeholder="ej: Hormigón columnas piso 3" style={inputStyle}/>
            </div>
            <div style={{ gridColumn:'1 / -1' }}>
              <label style={labelStyle}>Rubro de obra</label>
              <select value={formCert.rubro_id} onChange={e => setFormCert(f => ({...f, rubro_id:e.target.value}))} style={inputStyle}>
                <option value="">Sin asignar</option>
                {rubros.map(r => <option key={r.id} value={r.id}>{r.codigo} · {r.descripcion}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Monto base $</label>
              <input type="number" value={formCert.monto_base} onChange={e => setFormCert(f => ({...f, monto_base:e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Ajuste CAC $</label>
              <input type="number" value={formCert.ajuste_cac} onChange={e => setFormCert(f => ({...f, ajuste_cac:e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>IVA $</label>
              <input type="number" value={formCert.monto_iva} onChange={e => setFormCert(f => ({...f, monto_iva:e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Otros impuestos $</label>
              <input type="number" value={formCert.otros_impuestos} onChange={e => setFormCert(f => ({...f, otros_impuestos:e.target.value}))} placeholder="0" style={inputStyle}/>
            </div>
            {(parseFloat(formCert.monto_base)||0)+(parseFloat(formCert.ajuste_cac)||0)+(parseFloat(formCert.monto_iva)||0)+(parseFloat(formCert.otros_impuestos)||0) > 0 && (
              <div style={{ gridColumn:'1 / -1', background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:8, padding:'10px 14px' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Total certificado: </span>
                <span style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:'#F0C060' }}>
                  $ {fmt((parseFloat(formCert.monto_base)||0)+(parseFloat(formCert.ajuste_cac)||0)+(parseFloat(formCert.monto_iva)||0)+(parseFloat(formCert.otros_impuestos)||0))}
                </span>
              </div>
            )}
            <div style={{ gridColumn:'1 / -1' }}>
              <label style={labelStyle}>Notas adicionales</label>
              <input value={formCert.notas} onChange={e => setFormCert(f => ({...f, notas:e.target.value}))} placeholder="Opcional" style={inputStyle}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setTab('cuenta')} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>Cancelar</button>
            <button onClick={guardarCert} disabled={guardando} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
              {guardando ? 'Guardando...' : '✓ Guardar certificado'}
            </button>
          </div>
        </div>
      )}

      {/* Orden de pago */}
      {tab === 'orden_pago' && (
        <div style={{ maxWidth:580 }}>
          {ordenGenerada ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid #4ADE80', borderRadius:10, padding:28 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'#4ADE80', marginBottom:8 }}>✓ Orden emitida correctamente</div>
              <div style={{ fontSize:13, color:'#F59E0B', marginBottom:16 }}>⚠ Recordá marcarla como pagada cuando ejecutes el pago en caja</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => imprimirOrden(ordenGenerada)} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
                  🖨️ Imprimir orden + recibo
                </button>
                <button onClick={() => { setOrdenGenerada(null); setTab('cuenta') }} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>
                  Volver a cuenta corriente
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:28 }}>
              <h3 style={{ fontSize:15, fontWeight:600, marginBottom:20 }}>Generar orden de pago · {proveedor.razon_social}</h3>
              {certsPendientes.length === 0 ? (
                <div style={{ color:'var(--text-muted)', textAlign:'center', padding:20 }}>No hay certificados pendientes de pago.</div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                    <div style={{ gridColumn:'1 / -1' }}>
                      <label style={labelStyle}>Certificado *</label>
                      <select value={certSeleccionado?.id||''} onChange={e => setCertSeleccionado(certsPendientes.find(c => c.id===e.target.value)||null)} style={inputStyle}>
                        <option value="">Seleccioná un certificado</option>
                        {certsPendientes.map(c => {
                          const pag = getPagadoCert(c)
                          return <option key={c.id} value={c.id}>Cert. N°{String(c.numero).padStart(2,'0')} · {c.fecha} · Saldo $ {fmt(c.monto_certificado-pag)}</option>
                        })}
                      </select>
                    </div>
                    {certSeleccionado && (
                      <div style={{ gridColumn:'1 / -1', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#60A5FA' }}>
                        {certSeleccionado.descripcion && <div><strong>Descripción:</strong> {certSeleccionado.descripcion}</div>}
                        {certSeleccionado.notas && <div><strong>Detalle:</strong> {certSeleccionado.notas}</div>}
                        <div><strong>Total certificado:</strong> $ {fmt(certSeleccionado.monto_certificado)}</div>
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>Fecha</label>
                      <input type="date" value={formOrden.fecha} onChange={e => setFormOrden(f => ({...f, fecha:e.target.value}))} style={inputStyle}/>
                    </div>
                    <div>
                      <label style={labelStyle}>Monto transferencia $</label>
                      <input type="number" value={formOrden.monto_transfer} onChange={e => setFormOrden(f => ({...f, monto_transfer:e.target.value}))} placeholder="0" style={inputStyle}/>
                    </div>
                    <div>
                      <label style={labelStyle}>Monto efectivo $</label>
                      <input type="number" value={formOrden.monto_efectivo} onChange={e => setFormOrden(f => ({...f, monto_efectivo:e.target.value}))} placeholder="0" style={inputStyle}/>
                    </div>
                    <div>
                      <label style={labelStyle}>Monto cheque $</label>
                      <input type="number" value={formOrden.monto_cheque} onChange={e => setFormOrden(f => ({...f, monto_cheque:e.target.value}))} placeholder="0" style={inputStyle}/>
                    </div>
                    <div style={{ gridColumn:'1 / -1' }}>
                      <label style={labelStyle}>Notas</label>
                      <input value={formOrden.notas} onChange={e => setFormOrden(f => ({...f, notas:e.target.value}))} placeholder="Opcional" style={inputStyle}/>
                    </div>
                  </div>
                  <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#F59E0B' }}>
                    ⚠ La orden se emite pero el saldo no se descuenta hasta que confirmés el pago en caja.
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => setTab('cuenta')} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>Cancelar</button>
                    <button onClick={generarOrden} disabled={guardando||!certSeleccionado} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 20px', fontSize:13, fontWeight:600, cursor:(!certSeleccionado||guardando)?'not-allowed':'pointer', fontFamily:'system-ui', opacity:!certSeleccionado?0.6:1 }}>
                      {guardando ? 'Generando...' : '📄 Generar orden de pago'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal edición orden */}
      {editandoOrden && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:28, width:480, maxWidth:'90vw' }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Editar orden N°{String(editandoOrden.numero).padStart(4,'0')}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={editandoOrden.fecha} onChange={e => setEditandoOrden((d: any) => ({...d, fecha:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto transferencia $</label>
                <input type="number" value={editandoOrden.monto_transfer} onChange={e => setEditandoOrden((d: any) => ({...d, monto_transfer:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto efectivo $</label>
                <input type="number" value={editandoOrden.monto_efectivo} onChange={e => setEditandoOrden((d: any) => ({...d, monto_efectivo:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto cheque $</label>
                <input type="number" value={editandoOrden.monto_cheque} onChange={e => setEditandoOrden((d: any) => ({...d, monto_cheque:e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Notas</label>
                <input value={editandoOrden.notas||''} onChange={e => setEditandoOrden((d: any) => ({...d, notas:e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setEditandoOrden(null)} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>Cancelar</button>
              <button onClick={guardarEdicionOrden} disabled={guardando} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edición certificado */}
      {editandoCert && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:28, width:480, maxWidth:'90vw' }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>Editar certificado N°{String(editandoCert.numero).padStart(2,'0')}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={editandoCert.fecha} onChange={e => setEditandoCert((d: any) => ({...d, fecha:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Monto certificado $</label>
                <input type="number" value={editandoCert.monto_certificado} onChange={e => setEditandoCert((d: any) => ({...d, monto_certificado:e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Descripción</label>
                <input value={editandoCert.descripcion||''} onChange={e => setEditandoCert((d: any) => ({...d, descripcion:e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Rubro</label>
                <select value={editandoCert.rubro_id||''} onChange={e => setEditandoCert((d: any) => ({...d, rubro_id:e.target.value}))} style={inputStyle}>
                  <option value="">Sin asignar</option>
                  {rubros.map(r => <option key={r.id} value={r.id}>{r.codigo} · {r.descripcion}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={labelStyle}>Notas</label>
                <input value={editandoCert.notas||''} onChange={e => setEditandoCert((d: any) => ({...d, notas:e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setEditandoCert(null)} style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 16px', fontSize:13, cursor:'pointer', fontFamily:'system-ui' }}>Cancelar</button>
              <button onClick={guardarEdicionCert} disabled={guardando} style={{ background:'var(--accent)', color:'var(--accent-contrast)', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui' }}>
                {guardando ? 'Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
