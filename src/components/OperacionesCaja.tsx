import React, { useState } from 'react';

interface Movimiento {
  id: string;
  hora: string;
  tipo: 'Ingreso' | 'Egreso';
  categoria: string;
  descripcion: string;
  monto: number;
  usuario: string;
}

const MOVIMIENTOS_DEMO: Movimiento[] = [
  { id:'1', hora:'08:05 AM', tipo:'Ingreso', categoria:'Apertura de Caja',    descripcion:'Saldo inicial del día',                   monto:5000.00, usuario:'CROJAS' },
  { id:'2', hora:'09:12 AM', tipo:'Ingreso', categoria:'Cobro Cuota',         descripcion:'Cuota 3/10 — Garcia Huaman Rosa',          monto:180.50,  usuario:'CROJAS' },
  { id:'3', hora:'09:45 AM', tipo:'Egreso',  categoria:'Desembolso',          descripcion:'Crédito LM-0104 — Paredes Leon Jorge',     monto:5000.00, usuario:'CROJAS' },
  { id:'4', hora:'10:20 AM', tipo:'Ingreso', categoria:'Cobro Cuota',         descripcion:'Cuota 1/6 — Mendoza Ramos Luis',           monto:550.00,  usuario:'CROJAS' },
  { id:'5', hora:'11:00 AM', tipo:'Egreso',  categoria:'Desembolso',          descripcion:'Crédito LM-0103 — Romero Vasquez Sandra',  monto:2000.00, usuario:'MLOPEZ' },
  { id:'6', hora:'11:35 AM', tipo:'Ingreso', categoria:'Cobro Cuota',         descripcion:'Cuota 7/12 — Torres Mendoza Ana',          monto:220.00,  usuario:'MLOPEZ' },
  { id:'7', hora:'12:10 PM', tipo:'Egreso',  categoria:'Gasto Manual',        descripcion:'Útiles de oficina y papelería',            monto:45.00,   usuario:'CROJAS' },
  { id:'8', hora:'02:30 PM', tipo:'Ingreso', categoria:'Cobro Cuota',         descripcion:'Cuota 2/8 — Campos Vega Martha',           monto:310.00,  usuario:'RPEREZ' },
];

export const OperacionesCaja: React.FC = () => {
  const [filtroTipo, setFiltroTipo]   = useState<'todos' | 'Ingreso' | 'Egreso'>('todos');
  const [filtroCat, setFiltroCat]     = useState('todos');
  const [filtroUser, setFiltroUser]   = useState('todos');

  const categorias  = [...new Set(MOVIMIENTOS_DEMO.map(m => m.categoria))];
  const usuarios    = [...new Set(MOVIMIENTOS_DEMO.map(m => m.usuario))];

  const filtrados = MOVIMIENTOS_DEMO.filter(m => {
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
          Movimientos del día actual en la sucursal.
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
      </div>
    </div>
  );
};
