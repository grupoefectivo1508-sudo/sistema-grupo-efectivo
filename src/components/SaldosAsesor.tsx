import React from 'react';

interface AsesorCartelera {
  nombre: string;
  iniciales: string;
  clientesActivos: number;
  capitalColocado: number;
  capitalEnMora: number;
  porcentajeMora: number;
}

const ASESORES_DEMO: AsesorCartelera[] = [
  { nombre: 'Carlos Rojas (CROJAS)', iniciales: 'CR', clientesActivos: 58, capitalColocado: 42500, capitalEnMora: 1200, porcentajeMora: 2.82 },
  { nombre: 'Maria Lopez (MLOPEZ)',  iniciales: 'ML', clientesActivos: 42, capitalColocado: 31000, capitalEnMora: 2860, porcentajeMora: 9.22 },
  { nombre: 'Rosa Perez (RPEREZ)',   iniciales: 'RP', clientesActivos: 38, capitalColocado: 28900, capitalEnMora: 1980, porcentajeMora: 6.85 },
];

export const SaldosAsesor: React.FC = () => {
  const totalColocado = ASESORES_DEMO.reduce((a, c) => a + c.capitalColocado, 0);
  const totalMora     = ASESORES_DEMO.reduce((a, c) => a + c.capitalEnMora, 0);
  const moraPromedio  = (totalMora / totalColocado) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Saldos y Desempeño por Asesor</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Análisis consolidado del capital colocado y morosidad de la cartera asignada a cada asesor de crédito.
        </p>
      </div>

      {/* KPI Globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Cartera Activa', value: `S/. ${totalColocado.toLocaleString()}`, color: 'var(--primary)' },
          { label: 'Total Cartera en Mora', value: `S/. ${totalMora.toLocaleString()}`, color: 'var(--danger)' },
          { label: 'Morosidad Promedio', value: `${moraPromedio.toFixed(2)}%`, color: moraPromedio > 5 ? 'var(--warning)' : 'var(--success)' },
        ].map(k => (
          <div key={k.label} className="glass" style={{ padding: '20px', textAlign: 'left' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{k.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: k.color, marginTop: '6px' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Comparativo (Simulado con HTML/CSS) */}
      <div className="glass" style={{ padding: '28px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>
          Comparativa de Cartera vs Mora por Asesor (S/.)
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {ASESORES_DEMO.map(asesor => {
            const pctColocado = (asesor.capitalColocado / totalColocado) * 100;
            const pctMora = (asesor.capitalEnMora / asesor.capitalColocado) * 100;
            
            return (
              <div key={asesor.nombre} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)'
                    }}>
                      {asesor.iniciales}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{asesor.nombre}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {asesor.clientesActivos} clientes &nbsp;|&nbsp; Mora: <strong style={{ color: pctMora > 5 ? 'var(--danger)' : 'var(--success)' }}>{asesor.porcentajeMora}%</strong>
                  </span>
                </div>

                {/* Barras de datos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Barra Colocación */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctColocado}%`, background: 'linear-gradient(90deg, var(--primary) 0%, #06b6d4 100%)', borderRadius: '6px' }}></div>
                    </div>
                    <span style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Col: S/. {asesor.capitalColocado.toLocaleString()}
                    </span>
                  </div>

                  {/* Barra Mora */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(asesor.capitalEnMora / 5000) * 100}%`, background: 'var(--danger)', borderRadius: '6px' }}></div>
                    </div>
                    <span style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                      Mora: S/. {asesor.capitalEnMora.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Asesor', 'Clientes Activos', 'Capital Colocado', 'Capital en Mora', 'Porcentaje Mora', 'Desempeño'].map(h => (
                <th key={h} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)', paddingRight: '16px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASESORES_DEMO.map(asesor => {
              const status = asesor.porcentajeMora <= 3 ? 'Excelente' : asesor.porcentajeMora <= 7 ? 'Regular' : 'Crítico';
              const statusColor = status === 'Excelente' ? 'var(--success)' : status === 'Regular' ? 'var(--warning)' : 'var(--danger)';
              
              return (
                <tr key={asesor.nombre} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{asesor.nombre}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{asesor.clientesActivos}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>S/. {asesor.capitalColocado.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 700 }}>S/. {asesor.capitalEnMora.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: statusColor, fontWeight: 700 }}>{asesor.porcentajeMora}%</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ background: `${statusColor}1A`, color: statusColor, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
