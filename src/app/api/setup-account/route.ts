import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId, email, nombre, empresa } = await req.json()
    if (!userId || !email) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    // Verificar si ya tiene perfil
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existing) return NextResponse.json({ ok: true, already: true })

    // 1. Crear organización
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizaciones')
      .insert({ nombre: empresa || nombre || email, email_owner: email })
      .select()
      .single()

    if (orgErr) throw orgErr

    // 2. Crear perfil de usuario
    await supabaseAdmin.from('user_profiles').insert({
      id: userId,
      organizacion_id: org.id,
      nombre,
      email,
      rol: 'owner',
      activo: true,
    })

    // 3. Obtener plan Trial
    const { data: planTrial } = await supabaseAdmin
      .from('planes')
      .select('id')
      .eq('nombre', 'Trial')
      .maybeSingle()

    // 4. Crear suscripción trial (10 días)
    const finTrial = new Date()
    finTrial.setDate(finTrial.getDate() + 10)

    await supabaseAdmin.from('suscripciones').insert({
      organizacion_id: org.id,
      plan_id: planTrial?.id || null,
      estado: 'trial',
      fecha_fin_trial: finTrial.toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    // Si las tablas no existen aún, no bloqueamos al usuario
    console.error('setup-account error:', e.message)
    return NextResponse.json({ ok: true, skipped: true })
  }
}
