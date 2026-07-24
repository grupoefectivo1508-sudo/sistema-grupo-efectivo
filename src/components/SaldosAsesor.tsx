import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AsesorCartelera {
  nombre: string;
  iniciales: string;
  clientesActivos: number;
  capitalColocado: number;
  capitalEnMora: number;
  porcentajeMora: number;
}

export const SaldosAsesor: React.FC = () => {
  const [asesores, setAsesores] = useState<AsesorCartelera[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];

      // 1. Obtener créditos activos por asesor
      const { data: creditosData, error: errCred } = await supabase
        .from('creditos')
        .select(`
          monto_desembolsado,
          solicitudes_credito (
            perfiles:asesor_id ( id, nombre_completo )
          )
        `)
        .eq('estado', 'activo');

      if (errCred) throw errCred;

      // 2. Obtener cuotas en mora
      const { data: cuotasData, error: errCuo } = await supabase
        .from('cuotas')
        .select(`
          monto_capital,
          monto_pagado,
          creditos!inner (
            solicitudes_credito (
              perfiles:asesor_id ( id, nombre_completo )
            )
          )
        `)
        .in('estado', ['pendiente', 'mora'])
        .lt('fecha_vencimiento', hoy);

      if (errCuo) throw errCuo;

      // Map para agrupar por asesor
      const mapAsesores = new Map<string, AsesorCartelera>();

      // Procesar créditos activos (capital colocado)
      if (creditosData) {
        creditosData.forEach((c: any) => {
          const asesor = c.solicitudes_credito?.perfiles;
          if (!asesor) return;
          
          if (!mapAsesores.has(asesor.id)) {
            const arrName = asesor.nombre_completo.split(' ');
            const ini = arrName.length > 1 ? arrName[0][0] + arrName[1][0] : arrName[0][0];
            mapAsesores.set(asesor.id, {
              nombre: asesor.nombre_completo,
              iniciales: ini.toUpperCase(),
              clientesActivos: 0,
              capitalColocado: 0,
              capitalEnMora: 0,
              porcentajeMora: 0
            });
          }
          
          const asData = mapAsesores.get(asesor.id)!;
          asData.clientesActivos += 1;
          asData.capitalColocado += (parseFloat(c.monto_desembolsado) || 0);
        });
      }

      // Procesar cuotas (capital en mora)
      if (cuotasData) {
        cuotasData.forEach((c: any) => {
          const asesor = c.creditos?.solicitudes_credito?.perfiles;
          if (!asesor) return;
          
          // Solo si el asesor tiene créditos activos (debería tenerlos)
          if (mapAsesores.has(asesor.id)) {
            const asData = mapAsesores.get(asesor.id)!;
            // Para cálculo exacto de mora: asumimos que el pago abonado cubre capital (lógica simplificada para reporte)
            const cap = parseFloat(c.monto_capital) || 0;
            const pag = parseFloat(c.monto_pagado) || 0;
            // Si el pago es menor al capital, consideramos la diferencia como capital en mora
            const moraCap = cap > pag ? cap - pag : 0; 
            
            asData.capitalEnMora += moraCap;
          }
        });
      }

      // Calcular porcentajes
      const result = Array.from(mapAsesores.values()).map(a => {
        a.porcentajeMora = a.capitalColocado > 0 ? (a.capitalEnMora / a.capitalColocado) * 100 : 0;
        return a;
      });

      // Ordenar por capital colocado desc
      setAsesores(result.sort((a,b) => b.capitalColocado - a.capitalColocado));
    } catch (err) {
      console.error('Error cargando saldos por asesor:', err);
      setAsesores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const totalColocado = asesores.reduce((a, c) => a + c.capitalColocado, 0);
  const totalMora     = asesores.reduce((a, c) => a + c.capitalEnMora, 0);
  const moraPromedio  = totalColocado > 0 ? (totalMora / totalColocado) * 100 : 0;

  const exportarAExcel = () => {
    const cabeceras = ['Asesor', 'Clientes Activos', 'Capital Colocado', 'Capital en Mora', 'Porcentaje Mora', 'Desempeño'];
    const lineas = asesores.map(a => {
      const status = a.porcentajeMora <= 3 ? 'Excelente' : a.porcentajeMora <= 7 ? 'Regular' : 'Crítico';
      return `"${a.nombre}",${a.clientesActivos},${a.capitalColocado.toFixed(2)},${a.capitalEnMora.toFixed(2)},${a.porcentajeMora.toFixed(2)},${status}`
    });
    const csvContent = "data:text/csv;charset=utf-8," + [cabeceras.join(","), ...lineas].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Saldos_Asesor_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Saldos y Desempeño por Asesor</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Análisis consolidado del capital colocado y morosidad de la cartera asignada a cada asesor de crédito.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportarAExcel} disabled={asesores.length === 0}>
          📊 Exportar a Excel (CSV)
        </button>
      </div>

      {/* KPI Globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Cartera Activa', value: `S/. ${totalColocado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, color: 'var(--primary)' },
          { label: 'Total Cartera en Mora', value: `S/. ${totalMora.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, color: 'var(--danger)' },
          { label: 'Morosidad Promedio', value: `${moraPromedio.toFixed(2)}%`, color: moraPromedio > 5 ? 'var(--warning)' : 'var(--success)' },
        ].map(k => (
          <div key={k.label} className="glass" style={{ padding: '20px', textAlign: 'left' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{k.label}</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: k.color, marginTop: '6px' }}>
              {loading ? '...' : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Comparativo */}
      <div className="glass" style={{ padding: '28px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>
          Comparativa de Cartera vs Mora por Asesor (S/.)
        </h4>
        
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando saldos...</p>
        ) : asesores.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos de asesores para mostrar.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {asesores.map(asesor => {
              const pctColocado = (asesor.capitalColocado / totalColocado) * 100;
              // Para visualización de la barra de mora, la comparamos contra un max para que se vea
              const pctMoraBar = Math.min((asesor.capitalEnMora / (asesor.capitalColocado || 1)) * 100 * 5, 100); 
              
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
                      {asesor.clientesActivos} clientes &nbsp;|&nbsp; Mora: <strong style={{ color: asesor.porcentajeMora > 5 ? 'var(--danger)' : 'var(--success)' }}>{asesor.porcentajeMora.toFixed(2)}%</strong>
                    </span>
                  </div>

                  {/* Barras de datos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Barra Colocación */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pctColocado}%`, background: 'linear-gradient(90deg, var(--primary) 0%, #06b6d4 100%)', borderRadius: '6px', transition: 'width 1s ease-out' }}></div>
                      </div>
                      <span style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Col: S/. {asesor.capitalColocado.toLocaleString()}
                      </span>
                    </div>

                    {/* Barra Mora */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pctMoraBar}%`, background: 'var(--danger)', borderRadius: '6px', transition: 'width 1s ease-out' }}></div>
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
        )}
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
            {asesores.map(asesor => {
              const status = asesor.porcentajeMora <= 3 ? 'Excelente' : asesor.porcentajeMora <= 7 ? 'Regular' : 'Crítico';
              const statusColor = status === 'Excelente' ? 'var(--success)' : status === 'Regular' ? 'var(--warning)' : 'var(--danger)';
              
              return (
                <tr key={asesor.nombre} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{asesor.nombre}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{asesor.clientesActivos}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>S/. {asesor.capitalColocado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 700 }}>S/. {asesor.capitalEnMora.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: statusColor, fontWeight: 700 }}>{asesor.porcentajeMora.toFixed(2)}%</td>
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
