import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ClienteMora {
  id: string;
  codigo: string;
  nombre: string;
  asesor: string;
  diasAtraso: number;
  saldoCapital: number;
  cuotasAtrasadas: number;
  montoAtrasado: number;
  celular: string;
}

const getRangoMora = (dias: number): { label: string; color: string; bg: string } => {
  if (dias <= 8)  return { label: '0 - 8 días',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  if (dias <= 30) return { label: '9 - 30 días',   color: '#f97316', bg: 'rgba(249,115,22,0.1)' };
  if (dias <= 60) return { label: '31 - 60 días',  color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' };
  if (dias <= 120)return { label: '61 - 120 días', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' };
  return           { label: '+120 días',            color: '#7c0000', bg: 'rgba(124,0,0,0.2)' };
};

export const ReporteMora: React.FC = () => {
  const [datos, setDatos] = useState<ClienteMora[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filtroRango, setFiltroRango] = useState<string>('todos');
  const [filtroAsesor, setFiltroAsesor] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  const cargarMora = async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('cuotas')
        .select(`
          id,
          fecha_vencimiento,
          monto_total,
          monto_capital,
          monto_pagado,
          creditos (
            codigo_credito,
            solicitudes_credito (
              clientes ( id, nombre_completo, celular ),
              perfiles:asesor_id ( nombre_completo )
            )
          )
        `)
        .in('estado', ['pendiente', 'mora'])
        .lt('fecha_vencimiento', hoy);

      if (error) throw error;

      if (data && data.length > 0) {
        const agrupadoporCliente = new Map<string, ClienteMora>();
        const hoyDate = new Date(hoy);

        data.forEach((c: any) => {
          const clienteId = c.creditos?.solicitudes_credito?.clientes?.id;
          if (!clienteId) return;

          const fv = new Date(c.fecha_vencimiento);
          const diff = Math.floor((hoyDate.getTime() - fv.getTime()) / (1000 * 60 * 60 * 24));
          const saldo = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pagado) || 0);
          const cap = parseFloat(c.monto_capital) || 0;

          if (agrupadoporCliente.has(clienteId)) {
            const ext = agrupadoporCliente.get(clienteId)!;
            ext.diasAtraso = Math.max(ext.diasAtraso, diff);
            ext.saldoCapital += cap;
            ext.cuotasAtrasadas += 1;
            ext.montoAtrasado += saldo;
          } else {
            agrupadoporCliente.set(clienteId, {
              id: clienteId,
              codigo: c.creditos?.codigo_credito || '—',
              nombre: c.creditos?.solicitudes_credito?.clientes?.nombre_completo || 'Desconocido',
              asesor: c.creditos?.solicitudes_credito?.perfiles?.nombre_completo || 'Desconocido',
              diasAtraso: diff,
              saldoCapital: cap,
              cuotasAtrasadas: 1,
              montoAtrasado: saldo,
              celular: c.creditos?.solicitudes_credito?.clientes?.celular || '',
            });
          }
        });

        setDatos(Array.from(agrupadoporCliente.values()).sort((a,b) => b.diasAtraso - a.diasAtraso));
      } else {
        setDatos([]);
      }
    } catch (err) {
      console.error('Error cargando reporte mora:', err);
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarMora(); }, []);

  const asesores = [...new Set(datos.map(c => c.asesor))];

  const clientesFiltrados = datos.filter(c => {
    const rango = getRangoMora(c.diasAtraso).label;
    const matchRango = filtroRango === 'todos' || rango === filtroRango;
    const matchAsesor = filtroAsesor === 'todos' || c.asesor === filtroAsesor;
    const matchBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.codigo.includes(busqueda);
    return matchRango && matchAsesor && matchBusqueda;
  });

  const totalMora = clientesFiltrados.reduce((a, c) => a + c.montoAtrasado, 0);
  const totalCapital = clientesFiltrados.reduce((a, c) => a + c.saldoCapital, 0);

  // Resumen por rangos
  const rangos = ['0 - 8 días', '9 - 30 días', '31 - 60 días', '61 - 120 días', '+120 días'];
  const resumenRangos = rangos.map(r => ({
    rango: r,
    count: datos.filter(c => getRangoMora(c.diasAtraso).label === r).length,
    monto: datos.filter(c => getRangoMora(c.diasAtraso).label === r).reduce((a, c) => a + c.montoAtrasado, 0),
    color: datos.find(c => getRangoMora(c.diasAtraso).label === r) ? getRangoMora(datos.find(c => getRangoMora(c.diasAtraso).label === r)!.diasAtraso).color : '#888',
  }));

  const exportarAExcel = () => {
    const cabeceras = ['Código', 'Cliente', 'Asesor', 'Rango de Mora', 'Días de Atraso', 'Cuotas Atrasadas', 'Capital', 'Monto Atrasado', 'Celular'];
    const lineas = clientesFiltrados.map(c => 
      `${c.codigo},"${c.nombre}","${c.asesor}",${getRangoMora(c.diasAtraso).label},${c.diasAtraso},${c.cuotasAtrasadas},${c.saldoCapital.toFixed(2)},${c.montoAtrasado.toFixed(2)},${c.celular}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [cabeceras.join(","), ...lineas].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Mora_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Reporte de Mora y Cobranza</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Clasificación de cartera vencida por rangos de atraso.</p>
        </div>
        <button className="btn btn-secondary" onClick={exportarAExcel} disabled={clientesFiltrados.length === 0}>
          📊 Exportar a Excel (CSV)
        </button>
      </div>

      {/* Tarjetas de resumen por rango */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {resumenRangos.map(r => (
          <button
            key={r.rango}
            onClick={() => setFiltroRango(filtroRango === r.rango ? 'todos' : r.rango)}
            className="glass"
            style={{
              padding: '16px 12px', textAlign: 'left', border: filtroRango === r.rango ? `1px solid ${r.color}` : '1px solid var(--border)',
              background: filtroRango === r.rango ? `rgba(${r.color}, 0.1)` : 'var(--surface)',
              cursor: 'pointer', borderRadius: '12px', transition: 'var(--transition)',
            }}
          >
            <p style={{ fontSize: '0.7rem', color: r.color, fontWeight: 700, marginBottom: '6px' }}>{r.rango}</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{r.count}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>S/. {r.monto.toFixed(0)}</p>
          </button>
        ))}
      </div>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Capital en Riesgo</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--warning)' }}>S/. {totalCapital.toFixed(2)}</p>
          </div>
          <span style={{ fontSize: '2rem' }}>💰</span>
        </div>
        <div className="glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Monto en Mora</p>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)' }}>S/. {totalMora.toFixed(2)}</p>
          </div>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '200px' }}>
          <label>Buscar Cliente o Código</label>
          <input type="text" placeholder="Ej: Torres o LM-0018" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label>Filtrar por Asesor</label>
          <select value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}>
            <option value="todos">Todos los Asesores</option>
            {asesores.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary" style={{ padding: '12px 20px' }} onClick={() => { setFiltroRango('todos'); setFiltroAsesor('todos'); setBusqueda(''); }}>
          Limpiar
        </button>
      </div>

      {/* Tabla de Clientes en Mora */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Detalle de Cartera en Mora ({clientesFiltrados.length} registros)
        </h4>
        
        {loading ? (
           <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '0.9rem' }}>Cargando datos de mora...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Código', 'Cliente', 'Asesor', 'Rango de Mora', 'Días de Atraso', 'Cuotas Atrasadas', 'Monto Atrasado', 'Acciones'].map(h => (
                  <th key={h} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)', paddingRight: '12px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => {
                const rango = getRangoMora(c.diasAtraso);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{c.codigo}</td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.nombre}</td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.asesor}</td>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <span style={{ background: rango.bg, color: rango.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {rango.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: '0.85rem', color: rango.color, fontWeight: 700 }}>{c.diasAtraso}d</td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{c.cuotasAtrasadas}</td>
                    <td style={{ padding: '12px 12px 12px 0', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 700 }}>S/. {c.montoAtrasado.toFixed(2)}</td>
                    <td style={{ padding: '12px 0' }}>
                      {c.celular ? (
                        <a href={`tel:${c.celular}`} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                          📞 Llamar
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin N°</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {!loading && clientesFiltrados.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '0.9rem' }}>
            No se encontraron clientes con los filtros seleccionados.
          </p>
        )}
      </div>
    </div>
  );
};
