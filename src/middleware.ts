import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/landing', '/login', '/register', '/welcome', '/reset-password', '/bloqueado', '/api/mp']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas sin chequeo
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  // ── Chequeo de whitelist y suscripción ────────────────────────────────────
  try {
    // 1. Whitelist: siempre pasan sin importar estado de suscripción
    const { data: wl } = await supabase
      .from('whitelist_admin')
      .select('email')
      .eq('email', user.email ?? '')
      .maybeSingle()

    if (wl) {
      // Si intenta acceder a /admin, verificar que esté en whitelist (ya lo está)
      return response
    }

    // 2. /admin solo para whitelist — si llegó acá, no está en whitelist
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 3. Buscar perfil del usuario
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organizacion_id, activo')
      .eq('id', user.id)
      .maybeSingle()

    // Usuario sin perfil: necesita onboarding (primer login después de registro)
    if (!profile) {
      if (!pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return response
    }

    // Usuario bloqueado manualmente
    if (!profile.activo) {
      return NextResponse.redirect(new URL('/bloqueado?razon=bloqueado', request.url))
    }

    // 4. Chequear suscripción
    if (profile.organizacion_id) {
      const { data: sub } = await supabase
        .from('suscripciones')
        .select('estado, fecha_fin_trial, fecha_advertencia')
        .eq('organizacion_id', profile.organizacion_id)
        .maybeSingle()

      if (sub) {
        const ahora = new Date()

        if (sub.estado === 'trial') {
          const finTrial = new Date(sub.fecha_fin_trial)
          if (ahora > finTrial) {
            return NextResponse.redirect(new URL('/bloqueado?razon=trial', request.url))
          }
        }

        if (sub.estado === 'advertencia') {
          const finGracia = sub.fecha_advertencia
            ? new Date(new Date(sub.fecha_advertencia).getTime() + 10 * 24 * 60 * 60 * 1000)
            : ahora
          if (ahora > finGracia) {
            return NextResponse.redirect(new URL('/bloqueado?razon=pago', request.url))
          }
          // Continúa pero con advertencia (el banner se muestra via cookie)
          response.cookies.set('kesef-advertencia', '1', { maxAge: 60 * 60 })
        }

        if (sub.estado === 'suspendida' || sub.estado === 'cancelada') {
          return NextResponse.redirect(new URL('/bloqueado?razon=pago', request.url))
        }
      }
    }
  } catch {
    // Si las tablas no existen aún (antes de correr el SQL), dejamos pasar
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
