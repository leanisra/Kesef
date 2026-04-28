import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ThemeToggle } from '@/lib/ThemeToggle'

const fmt = (n: number) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) ?? '-'

export default async function PresupuestoPage({ params }: { params: { obraId: string } }) {
  const { obraId } = await params

  const { data: obra } = await supabase.from('obras').select('nombre').eq('id', obraId).single()

  const { data: rubros } = await supabase
    .from('presupuesto_rubros')
    .select('*')
    .eq('obra_id', obraId)
    .order('orden')

  const { data: items } = await supabase
    .from('presupuesto_items')
    .select('*')
    .eq('obra_id', obraId)

  const rubrosNivel1 = rubros?.filter(r => r.nivel === 1) || []
  const rubrosNivel2 = rubros?.filter(r => r.nivel === 2) || []

  const totalPresup = rubrosNivel1.reduce((a, r) => {
    const its = items?.filter(i => i.rubro_id === r.id) || []
    return a + its.reduce((b, i) => b + ((i.cantidad || 0) * ((i.costo_unit_mat || 0) + (i.costo_unit_mo || 0))), 0)
  }, 0)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Link href={`/obras/${obraId}`} style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
            ← Volver a {obra?.nombre}
          </Link>
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>📋 Presupuesto</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Rubros y seguimiento de ejecución · {obra?.nombre}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={`/obras/${obraId}/presupuesto/nuevo-rubro`} style={{
              background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 16px', fontSize: 13, textDecoration: 'none'
            }}>＋ Agregar rubro</Link>
            <Link href={`/obras/${obraId}/presupuesto/nuevo-item`} style={{
              background: 'var(--accent)', color: 'var(--accent-contrast)', borderRadius: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none'
            }}>＋ Agregar ítem</Link>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total presupuestado', valor: `$ ${fmt(totalPresup)}`, color: '#60A5FA' },
            { label: 'Rubros nivel 1', valor: rubrosNivel1.length, color: 'var(--text-primary)' },
            { label: 'Ítems cargados', valor: items?.length || 0, color: '#A855F7' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {/* Árbol de rubros */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
            Árbol de rubros · hacé click para expandir
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-head)' }}>
                {['Código', 'Descripción', 'Ítems', 'Total presupuestado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rubrosNivel1.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay rubros cargados todavía.
                </td></tr>
              ) : rubrosNivel1.map(r => {
                const itemsRubro = items?.filter(i => i.rubro_id === r.id) || []
                const totalRubro = itemsRubro.reduce((a, i) =>
                  a + ((i.cantidad || 0) * ((i.costo_unit_mat || 0) + (i.costo_unit_mo || 0))), 0)
                const hijosRubro = rubrosNivel2.filter(h => h.parent_id === r.id)

                return (
                  <>
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)', background: 'var(--row-alt)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#F0C060', fontSize: 13, fontWeight: 600 }}>{r.codigo}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{r.descripcion}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{itemsRubro.length}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {totalRubro > 0 ? `$ ${fmt(totalRubro)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/obras/${obraId}/presupuesto/${r.id}`}
                          style={{ color: '#60A5FA', fontSize: 12, textDecoration: 'none' }}>
                          Ver detalle →
                        </Link>
                      </td>
                    </tr>
                    {hijosRubro.map(h => {
                      const itemsHijo = items?.filter(i => i.rubro_id === h.id) || []
                      const totalHijo = itemsHijo.reduce((a, i) =>
                        a + ((i.cantidad || 0) * ((i.costo_unit_mat || 0) + (i.costo_unit_mo || 0))), 0)
                      return (
                        <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 16px 10px 32px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{h.codigo}</td>
                          <td style={{ padding: '10px 16px 10px 32px', color: 'var(--text-secondary)', fontSize: 13 }}>{h.descripcion}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12 }}>{itemsHijo.length}</td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                            {totalHijo > 0 ? `$ ${fmt(totalHijo)}` : '—'}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <Link href={`/obras/${obraId}/presupuesto/${h.id}`}
                              style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>
                              Ver →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}
