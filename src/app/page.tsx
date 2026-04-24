import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 0

export default async function Home() {
  const { data: obras } = await supabase
    .from('obras')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main style={{ minHeight: '100vh', background: '#0E1117', color: '#E8EDF5', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#D4A843', marginBottom: 8 }}>KESEF</h1>
        <p style={{ color: '#556070', fontSize: 14, marginBottom: 32 }}>Sistema de administración de obras</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {obras?.map(obra => (
            <Link key={obra.id} href={`/obras/${obra.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#161B25', border: '1px solid #252D3D', borderRadius: 12, padding: '20px 24px', cursor: 'pointer' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#D4A843', marginBottom: 6 }}>{obra.nombre}</h2>
                <p style={{ fontSize: 13, color: '#556070', marginBottom: 12 }}>{obra.direccion}</p>
                <span style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{obra.estado}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}