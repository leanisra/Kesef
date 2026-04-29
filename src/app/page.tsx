'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/lib/ThemeToggle'

export default function Home() {
  const router = useRouter()
  const [obras, setObras] = useState<any[]>([])

  useEffect(() => {
    const fetchObras = async () => {
      const { data } = await supabase
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false })
      setObras(data || [])
    }
    fetchObras()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>KESEF</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ThemeToggle />
            <Link href="/perfil" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '6px 14px', fontSize: 13, textDecoration: 'none' }}>
              Mi perfil
            </Link>
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Sistema de administración de obras</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {obras.map(obra => (
            <Link key={obra.id} href={`/obras/${obra.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', cursor: 'pointer' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>{obra.nombre}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{obra.direccion}</p>
                <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{obra.estado}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
