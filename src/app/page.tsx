import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function Home() {
  const { data: obras } = await supabase
    .from('obras')
    .select('*')
    .order('created_at')

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0E1117',
      color: '#E8EDF5',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 3,
            color: '#D4A843',
            marginBottom: 4
          }}>
            KESEF
          </h1>
          <p style={{ color: '#556070', fontSize: 14 }}>
            Sistema de administración de obras
          </p>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
          Obras activas
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {obras?.map(obra => (
            <Link key={obra.id} href={`/obras/${obra.id}`}
              style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#161B25',
                border: '1px solid #252D3D',
                borderRadius: 10,
                padding: 24,
              }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#E8EDF5', marginBottom: 6 }}>
                  {obra.nombre}
                </div>
                <div style={{ fontSize: 13, color: '#556070', marginBottom: 16 }}>
                  {obra.direccion}
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#556070', textTransform: 'uppercase', letterSpacing: 1 }}>Estado</div>
                    <div style={{ fontSize: 14, color: '#4ADE80', marginTop: 2 }}>● {obra.estado}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#556070', textTransform: 'uppercase', letterSpacing: 1 }}>Pisos</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#60A5FA', marginTop: 2 }}>{obra.pisos}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#556070', textTransform: 'uppercase', letterSpacing: 1 }}>Tipo</div>
                    <div style={{ fontSize: 14, color: '#E8EDF5', marginTop: 2 }}>{obra.tipo}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {(!obras || obras.length === 0) && (
            <div style={{ color: '#556070', padding: 40 }}>
              No hay obras cargadas todavía.
            </div>
          )}
        </div>

      </div>
    </main>
  )
}