'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #252D3D', position: 'sticky', top: 0, background: '#0E1117', zIndex: 100 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#D4A843', letterSpacing: 2 }}>KESEF</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{ background: 'none', border: '1px solid #252D3D', borderRadius: 8, color: '#8A96AA', padding: '8px 18px', fontSize: 14, textDecoration: 'none' }}>Ingresar</Link>
          <Link href="/register" style={{ background: '#D4A843', border: 'none', borderRadius: 8, color: '#0E1117', padding: '8px 18px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Probar gratis</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: 'center', padding: '90px 40px 70px' }}>
        <div style={{ display: 'inline-block', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 20, padding: '4px 16px', fontSize: 12, color: '#D4A843', marginBottom: 24 }}>
          🚀 Versión Beta — 10 días gratis, sin tarjeta
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, maxWidth: 700, margin: '0 auto 20px' }}>
          Administrá tus obras con <span style={{ color: '#D4A843' }}>claridad total</span>
        </h1>
        <p style={{ fontSize: 18, color: '#8A96AA', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          KESEF es el sistema de gestión diseñado para desarrolladores inmobiliarios. Caja, clientes, proveedores, presupuesto y más — todo en un solo lugar.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ background: '#D4A843', color: '#0E1117', borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            Empezar prueba gratuita →
          </Link>
          <Link href="/login" style={{ background: 'none', border: '1px solid #252D3D', color: '#8A96AA', borderRadius: 10, padding: '14px 32px', fontSize: 16, textDecoration: 'none' }}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* MÓDULOS */}
      <section style={{ padding: '60px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Todo lo que necesitás en una sola plataforma</h2>
        <p style={{ textAlign: 'center', color: '#556070', marginBottom: 48 }}>Módulos diseñados para la realidad del mercado inmobiliario argentino</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { icon: '💰', title: 'Caja', desc: 'Control de ingresos y egresos en ARS y USD. Cheques, echeqs y cotización blue en tiempo real.' },
            { icon: '👥', title: 'Clientes y Cuotas', desc: 'Seguimiento de contratos, cuotas pendientes, vencidas y alertas automáticas.' },
            { icon: '🏗️', title: 'Proveedores', desc: 'Certificados de avance, órdenes de pago y generación de PDFs profesionales.' },
            { icon: '📊', title: 'Presupuesto', desc: 'Presupuesto por rubros con seguimiento de ejecución en tiempo real.' },
            { icon: '🏠', title: 'Unidades', desc: 'Gestión de unidades funcionales, cocheras y superficies.' },
            { icon: '📋', title: 'Órdenes de pago', desc: 'Órdenes globales con trazabilidad completa de cada pago.' },
          ].map(m => (
            <div key={m.title} style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 12, padding: '24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#D4A843', marginBottom: 8 }}>{m.title}</h3>
              <p style={{ fontSize: 14, color: '#556070', lineHeight: 1.6 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VENTAJAS */}
      <section style={{ padding: '60px 40px', background: '#161B25', borderTop: '1px solid #252D3D', borderBottom: '1px solid #252D3D' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 48 }}>¿Por qué KESEF?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 32 }}>
            {[
              { icon: '⚡', title: 'Acceso desde cualquier lugar', desc: 'Web, mobile y desktop. Tu equipo trabaja sincronizado en tiempo real desde cualquier dispositivo.' },
              { icon: '🔒', title: 'Datos 100% seguros', desc: 'Cada empresa ve solo sus datos. Infraestructura enterprise con backups automáticos.' },
              { icon: '👨‍👩‍👧‍👦', title: 'Multiusuario', desc: 'Administrativos, gerentes y comerciales con acceso simultáneo a la misma información.' },
              { icon: '🇦🇷', title: 'Hecho para Argentina', desc: 'Cotización blue en tiempo real, manejo de pesos y dólares, cheques y echeqs.' },
            ].map(v => (
              <div key={v.title} style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 28 }}>{v.icon}</span>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{v.title}</h3>
                  <p style={{ fontSize: 13, color: '#556070', lineHeight: 1.6 }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section style={{ padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Planes y precios</h2>
        <p style={{ textAlign: 'center', color: '#556070', marginBottom: 8 }}>10 días de prueba gratuita en todos los planes</p>
        <p style={{ textAlign: 'center', color: '#556070', fontSize: 12, marginBottom: 48 }}>
          * Precios expresados en USD, libres de impuestos. El monto final se ajustará según el tipo de facturación de cada cliente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {[
            {
              name: 'Starter', price: 58, obras: 'Hasta 3 obras', usuarios: 'Hasta 5 usuarios',
              features: ['Todos los módulos incluidos', 'Multiusuario', 'Soporte por email'],
              color: '#60A5FA', highlight: false
            },
            {
              name: 'Pro', price: 118, obras: 'Hasta 10 obras', usuarios: 'Hasta 15 usuarios',
              features: ['Todos los módulos incluidos', 'Multiusuario', 'Soporte prioritario', 'Reportes avanzados'],
              color: '#D4A843', highlight: true
            },
            {
              name: 'Premium', price: 198, obras: 'Obras ilimitadas', usuarios: 'Usuarios ilimitados',
              features: ['Todos los módulos incluidos', 'Multiusuario ilimitado', 'Soporte dedicado', 'Reportes avanzados', 'API access'],
              color: '#A855F7', highlight: false
            },
          ].map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? 'rgba(212,168,67,0.06)' : '#161B25', border: `1px solid ${plan.highlight ? 'rgba(212,168,67,0.4)' : '#252D3D'}`, borderRadius: 14, padding: '32px 28px', position: 'relative' }}>
              {plan.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#D4A843', color: '#0E1117', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>MÁS POPULAR</div>}
              <h3 style={{ fontSize: 20, fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ fontSize: 38, fontWeight: 800, color: '#E8EDF5', marginBottom: 4 }}>USD {plan.price}<span style={{ fontSize: 16, color: '#556070', fontWeight: 400 }}>/mes</span></div>
              <p style={{ fontSize: 12, color: '#556070', marginBottom: 4 }}>{plan.obras}</p>
              <p style={{ fontSize: 12, color: '#556070', marginBottom: 24 }}>{plan.usuarios}</p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: '#8A96AA', marginBottom: 8, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#4ADE80' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ display: 'block', textAlign: 'center', background: plan.highlight ? '#D4A843' : 'none', border: plan.highlight ? 'none' : '1px solid #252D3D', color: plan.highlight ? '#0E1117' : '#8A96AA', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Empezar gratis →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ textAlign: 'center', padding: '80px 40px', background: '#161B25', borderTop: '1px solid #252D3D' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>¿Listo para tomar el control de tus obras?</h2>
        <p style={{ color: '#556070', fontSize: 16, marginBottom: 32 }}>Empezá hoy. Sin tarjeta de crédito. Sin compromisos.</p>
        <Link href="/register" style={{ background: '#D4A843', color: '#0E1117', borderRadius: 10, padding: '16px 40px', fontSize: 17, fontWeight: 700, textDecoration: 'none' }}>
          Crear cuenta gratis →
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '24px 40px', borderTop: '1px solid #252D3D', color: '#556070', fontSize: 12 }}>
        © 2026 KESEF · Sistema de administración de obras · Todos los derechos reservados
      </footer>

    </main>
  )
}