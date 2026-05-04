import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Crea o actualiza la suscripción en MercadoPago para un usuario
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { planId } = await req.json()

    // Obtener perfil y suscripción
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organizacion_id, nombre')
      .eq('id', user.id)
      .single()

    if (!profile?.organizacion_id) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

    const { data: plan } = await supabaseAdmin
      .from('planes')
      .select('*')
      .eq('id', planId)
      .single()

    if (!plan || !plan.precio_ars) {
      return NextResponse.json({ error: 'Plan no válido o sin precio ARS configurado. Contactá al administrador.' }, { status: 400 })
    }

    const MP_TOKEN = process.env.MP_ACCESS_TOKEN
    if (!MP_TOKEN) return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 503 })

    // Crear o recuperar plan en MP
    let mpPlanId = plan.mp_plan_id
    if (!mpPlanId) {
      const planRes = await fetch('https://api.mercadopago.com/preapproval_plan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `KESEF ${plan.nombre}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: plan.precio_ars,
            currency_id: 'ARS',
          },
          back_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kesef.vercel.app'}/`,
        }),
      })
      const mpPlan = await planRes.json()
      mpPlanId = mpPlan.id
      // Guardar el ID del plan MP
      await supabaseAdmin.from('planes').update({ mp_plan_id: mpPlanId }).eq('id', planId)
    }

    // Obtener suscripción local
    const { data: sub } = await supabaseAdmin
      .from('suscripciones')
      .select('id, mp_preapproval_id')
      .eq('organizacion_id', profile.organizacion_id)
      .single()

    // Crear preapproval (suscripción) en MP
    const preapprovalRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preapproval_plan_id: mpPlanId,
        reason: `KESEF ${plan.nombre} - ${profile.nombre || user.email}`,
        payer_email: user.email,
        back_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kesef.vercel.app'}/`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.precio_ars,
          currency_id: 'ARS',
        },
      }),
    })
    const preapproval = await preapprovalRes.json()

    // Actualizar suscripción local
    await supabaseAdmin.from('suscripciones').update({
      plan_id: planId,
      mp_preapproval_id: preapproval.id,
      mp_plan_id: mpPlanId,
      precio_final_usd: plan.precio_usd,
      updated_at: new Date().toISOString(),
    }).eq('id', sub?.id)

    return NextResponse.json({ init_point: preapproval.init_point })
  } catch (e: any) {
    console.error('MP subscribe error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
