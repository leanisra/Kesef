import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Webhook de MercadoPago para eventos de suscripciones
// Configurar en: https://www.mercadopago.com.ar/developers/panel/webhooks
// URL: https://tu-dominio.com/api/mp/webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    // Verificar firma (recomendado en producción)
    // const signature = req.headers.get('x-signature')
    // TODO: validar con MP_WEBHOOK_SECRET

    if (type === 'subscription_preapproval') {
      const preapprovalId = data?.id
      if (!preapprovalId) return NextResponse.json({ ok: true })

      // Consultar estado del preapproval en MP
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      })
      const mp = await mpRes.json()

      // Buscar suscripción local
      const { data: sub } = await supabaseAdmin
        .from('suscripciones')
        .select('id, organizacion_id')
        .eq('mp_preapproval_id', preapprovalId)
        .maybeSingle()

      if (!sub) return NextResponse.json({ ok: true })

      // Mapear estados de MP → KESEF
      const estadoMap: Record<string, string> = {
        authorized:  'activa',
        paused:      'advertencia',
        cancelled:   'cancelada',
        pending:     'advertencia',
      }
      const nuevoEstado = estadoMap[mp.status] || 'advertencia'

      const update: any = { estado: nuevoEstado, updated_at: new Date().toISOString() }
      if (nuevoEstado === 'activa') {
        // Próximo cobro
        update.fecha_advertencia = null
        if (mp.next_payment_date) update.fecha_proximo_cobro = mp.next_payment_date
      }
      if (nuevoEstado === 'advertencia' && !sub) {
        update.fecha_advertencia = new Date().toISOString()
      }

      await supabaseAdmin.from('suscripciones').update(update).eq('id', sub.id)
    }

    if (type === 'payment') {
      const paymentId = data?.id
      if (!paymentId) return NextResponse.json({ ok: true })

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      })
      const mp = await mpRes.json()

      if (mp.metadata?.suscripcion_id) {
        await supabaseAdmin.from('suscripcion_pagos').insert({
          suscripcion_id: mp.metadata.suscripcion_id,
          monto_ars: mp.transaction_amount,
          estado: mp.status === 'approved' ? 'aprobado' : 'rechazado',
          mp_payment_id: String(paymentId),
          periodo: new Date().toISOString().substring(0, 7),
          descripcion: `Pago MP #${paymentId}`,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('MP webhook error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'MP webhook activo' })
}
