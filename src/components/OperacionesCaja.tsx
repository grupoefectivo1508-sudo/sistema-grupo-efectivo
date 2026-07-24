import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Movimiento {
  id: string;
  hora: string;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
  descripcion: string;
  monto: number;
  usuario: string;
}

export const OperacionesCaja: React.FC = () => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroTipo, setFiltroTipo]   = useState<'todos' | 'Ingreso' | 'Egreso'>('todos');
  const [filtroCat, setFiltroCat]     = useState('todos');
  const [filtroUser, setFiltroUser]   = useState('todos');

  const cargarMovimientos = async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('movimientos_caja')
        .select(`
          id,
          tipo_movimiento,
          categoria,
          descripcion,
          monto,
          created_at,
          cajas_operacion (
            perfiles ( nombre_completo )
          )
        `)
        .gte('created_at', hoy + 'T00:00:00')
        .lte('created_at', hoy + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: Movimiento[] = data.map((m: any) => ({
          id: m.id,
          hora: new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          tipo: m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso',
          categoria: (m.categoria || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          descripcion: m.descripcion || '—',
          monto: parseFloat(m.monto) || 0,
          usuario: m.cajas_operacion?.perfiles?.nombre_completo || 'Usuario',
        }));
        setMovimientos(mapped);
      } else {
        setMovimientos([]);
      }
    } catch (err) {
      console.error('Error cargando movimientos de caja:', err);
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarMovimientos(); }, []);

  const categorias  = [...new Set(movimientos.map(m => m.categoria))];
  const usuarios    = [...new Set(movimientos.map(m => m.usuario))];

  const filtrados = movimientos.filter(m => {
    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
    const matchCat  = filtroCat  === 'todos' || m.categoria === filtroCat;
    const matchUser = filtroUser === 'todos' || m.usuario   === filtroUser;
    return matchTipo && matchCat && matchUser;
  });

  const totalIngresos = filtrados.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + m.monto, 0);
  const totalEgresos  = filtrados.filter(m => m.tipo === 'Egreso' ).reduce((a, m) => a + m.monto, 0);
  const saldoNeto     = totalIngresos - totalEgresos;

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Operaciones de Caja</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Movimientos del día actual registrados en la base de datos.
        </p>
      </div>

      {/* KPI resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
        {[
          { label: 'Total Ingresos',  value: totalIngresos, color: 'var(--success)', icon: '⬆' },
          { label: 'Total Egresos',   value: totalEgresos,  color: 'var(--danger)',  icon: '⬇' },
          { label: 'Saldo Neto',      value: saldoNeto,     color: saldoNeto >= 0 ? 'var(--primary)' : 'var(--danger)', icon: '⚖' },
        ].map(k => (
          <div key={k.label} className="glass" style={{ padding: '22px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{k.label}</p>
              <span style={{ fontSize: '1.2rem' }}>{k.icon}</span>
            </div>
            <p style={{ fontSize: '1.7rem', fontWeight: 700, color: k.color, marginTop: '8px' }}>
              S/. {k.value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="glass" style={{ padding: '18px 22px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
          <label>Tipo</label>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}>
            <option value="todos">Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '180px' }}>
          <label>Categoría</label>
          <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            <option value="todos">Todas</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
          <label>Usuario</label>
          <select value={filtroUser} onChange={e => setFiltroUser(e.target.value)}>
            <option value="todos">Todos</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" style={{ padding: '12px 18px' }}
          onClick={() => { setFiltroTipo('todos'); setFiltroCat('todos'); setFiltroUser('todos'); }}>
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          {filtrados.length} movimiento{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
        </p>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Cargando operaciones...</p>
        ) : filtrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No hay movimientos que coincidan con los filtros.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Hora', 'Tipo', 'Categoría', 'Descripción', 'Usuario', 'Monto'].map(h => (
                  <th key={h} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)', paddingRight: '16px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '11px 16px 11px 0', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.hora}</td>
                  <td style={{ padding: '11px 16px 11px 0' }}>
                    <span style={{
                      background: m.tipo === 'Ingreso' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                      color: m.tipo === 'Ingreso' ? 'var(--success)' : 'var(--danger)',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                    }}>{m.tipo}</span>
                  </td>
                  <td style={{ padding: '11px 16px 11px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.categoria}</td>
                  <td style={{ padding: '11px 16px 11px 0', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{m.descripcion}</td>
                  <td style={{ padding: '11px 16px 11px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.usuario}</td>
                  <td style={{ padding: '11px 0', fontSize: '0.88rem', fontWeight: 700, color: m.tipo === 'Ingreso' ? 'var(--success)' : 'var(--danger)', textAlign: 'right' }}>
                    {m.tipo === 'Ingreso' ? '+' : '-'} S/. {m.monto.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
