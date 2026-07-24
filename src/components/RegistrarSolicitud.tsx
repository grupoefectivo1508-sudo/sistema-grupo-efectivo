import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RegistrarSolicitudProps {
  sucursalNombre: string;
}

interface SolicitudData {
  clienteDni: string;
  clienteNombre: string;
  monto: string;
  tasa: string;
  cuotas: string;
  tipoPeriodo: string;
  asesor: string;
  sustento: string;
}

type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'desembolsada';

interface Solicitud {
  id: string;
  codigo: string;
  clienteDni: string;
  clienteNombre: string;
  monto: string;
  tasa: string;
  cuotas: string;
  tipoPeriodo: string;
  asesor: string;
  sustento: string;
  fechaSolicitud: string;
  estado: EstadoSolicitud;
}

const BADGE: Record<EstadoSolicitud, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  aprobada:  { label: 'Aprobada',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  rechazada: { label: 'Rechazada',  color: '#f43f5e', bg: 'rgba(244,63,94,0.1)'  },
  desembolsada: { label: 'Desembolsada', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' }
};

export const RegistrarSolicitud: React.FC<RegistrarSolicitudProps> = ({ sucursalNombre }) => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [realSucursalId, setRealSucursalId] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  const [form, setForm] = useState<SolicitudData>({
    clienteDni: '', clienteNombre: '', monto: '', tasa: '3.5',
    cuotas: '12', tipoPeriodo: 'mensual', asesor: 'CROJAS', sustento: '',
  });
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniBuscado, setDniBuscado] = useState(false);

  // Cargar sucursal id al montar
  useEffect(() => {
    const obtenerSucursal = async () => {
      try {
        const { data } = await supabase
          .from('sucursales')
          .select('id')
          .eq('nombre', sucursalNombre)
          .maybeSingle();
        if (data) setRealSucursalId(data.id);
      } catch (err) {
        console.error('Error cargando sucursal:', err);
      }
    };
    obtenerSucursal();
  }, [sucursalNombre]);

  // Cargar solicitudes de Supabase
  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitudes_credito')
        .select(`
          id,
          monto_solicitado,
          tasa_interes_mensual,
          tipo_periodo,
          numero_cuotas,
          sustento_negocio,
          estado,
          fecha_solicitud,
          clientes (
            dni,
            nombre_completo
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapeadas: Solicitud[] = data.map((s: any, index: number) => ({
          id: s.id,
          codigo: `SOL-${String(data.length - index).padStart(4, '0')}`,
          clienteDni: s.clientes?.dni || '—',
          clienteNombre: s.clientes?.nombre_completo || 'Cliente Eliminado',
          monto: s.monto_solicitado.toString(),
          tasa: s.tasa_interes_mensual.toString(),
          cuotas: s.numero_cuotas.toString(),
          tipoPeriodo: s.tipo_periodo,
          asesor: 'Carlos Rojas',
          sustento: s.sustento_negocio || '',
          fechaSolicitud: new Date(s.fecha_solicitud).toLocaleDateString('es-PE'),
          estado: s.estado as EstadoSolicitud
        }));
        setSolicitudes(mapeadas);
      }
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleBuscarDni = async () => {
    if (form.clienteDni.length !== 8) return;
    setBuscandoDni(true);
    setDniBuscado(false);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_completo')
        .eq('dni', form.clienteDni)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setForm(f => ({ ...f, clienteNombre: data.nombre_completo }));
        setSelectedClienteId(data.id);
        setDniBuscado(true);
      } else {
        alert('Cliente no encontrado. Por favor regístralo primero en la sección Clientes.');
      }
    } catch (err: any) {
      alert('Error consultando DNI: ' + err.message);
    } finally {
      setBuscandoDni(false);
    }
  };

  const handleGuardar = async () => {
    if (!selectedClienteId || !realSucursalId) {
      alert('Error interno: Faltan identificadores de cliente o sucursal.');
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('solicitudes_credito')
        .insert([{
          cliente_id: selectedClienteId,
          sucursal_id: realSucursalId,
          asesor_id: '00000000-0000-0000-0000-000000000000', // Perfil mock
          monto_solicitado: parseFloat(form.monto),
          tasa_interes_mensual: parseFloat(form.tasa),
          tipo_periodo: form.tipoPeriodo,
          numero_cuotas: parseInt(form.cuotas),
          sustento_negocio: form.sustento,
          estado: 'pendiente'
        }]);

      if (error) throw error;

      alert('Solicitud de crédito guardada con éxito.');
      setShowForm(false);
      setForm({ clienteDni: '', clienteNombre: '', monto: '', tasa: '3.5', cuotas: '12', tipoPeriodo: 'mensual', asesor: 'CROJAS', sustento: '' });
      setDniBuscado(false);
      cargarSolicitudes();
    } catch (err: any) {
      alert('Error al guardar solicitud: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (id: string, estado: EstadoSolicitud) => {
    try {
      const { error } = await supabase
        .from('solicitudes_credito')
        .update({ estado })
        .eq('id', id);

      if (error) throw error;
      cargarSolicitudes();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Solicitudes de Crédito</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Registra, revisa y aprueba las solicitudes de préstamo.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancelar' : '+ Nueva Solicitud'}
        </button>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <div className="glass animate-fade" style={{ padding: '28px' }}>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '22px' }}>Nueva Solicitud de Crédito</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label>DNI del Cliente</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" maxLength={8} placeholder="12345678" value={form.clienteDni}
                  onChange={e => { setForm(f => ({ ...f, clienteDni: e.target.value.replace(/\D/g,''), clienteNombre: '' })); setDniBuscado(false); }} />
                <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap', padding: '0 14px' }}
                  onClick={handleBuscarDni} disabled={buscandoDni || form.clienteDni.length !== 8}>
                  {buscandoDni ? '...' : '🔍'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Nombre del Cliente</label>
              <input type="text" placeholder="Se completa al buscar DNI" value={form.clienteNombre} disabled />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Monto Solicitado (S/.)</label>
              <input type="number" placeholder="Ej: 2000" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} min="100" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Tasa de Interés Mensual (%)</label>
              <input type="number" placeholder="Ej: 3.5" value={form.tasa} onChange={e => setForm(f => ({ ...f, tasa: e.target.value }))} step="0.1" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Número de Cuotas</label>
              <input type="number" placeholder="Ej: 12" value={form.cuotas} onChange={e => setForm(f => ({ ...f, cuotas: e.target.value }))} min="1" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Tipo de Periodo</label>
              <select value={form.tipoPeriodo} onChange={e => setForm(f => ({ ...f, tipoPeriodo: e.target.value }))}>
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '18px' }}>
            <label>Sustento del Crédito (Destino del Dinero)</label>
            <textarea rows={3} placeholder="Ej: Compra de mercadería para bodega, ampliación de local..."
              value={form.sustento} onChange={e => setForm(f => ({ ...f, sustento: e.target.value }))}
              style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleGuardar}
              disabled={loading || !dniBuscado || !form.monto}>
              Guardar Solicitud
            </button>
          </div>
        </div>
      )}

      {/* Listado de solicitudes */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Código', 'Cliente', 'Monto', 'Cuotas', 'Tasa', 'Fecha', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)', paddingRight: '14px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map(s => {
              const b = BADGE[s.estado];
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 14px 12px 0', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>{s.codigo}</td>
                  <td style={{ padding: '12px 14px 12px 0', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{s.clienteNombre}</td>
                  <td style={{ padding: '12px 14px 12px 0', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 700 }}>S/. {parseFloat(s.monto).toLocaleString()}</td>
                  <td style={{ padding: '12px 14px 12px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.cuotas} x {s.tipoPeriodo}</td>
                  <td style={{ padding: '12px 14px 12px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.tasa}%</td>
                  <td style={{ padding: '12px 14px 12px 0', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.fechaSolicitud}</td>
                  <td style={{ padding: '12px 14px 12px 0' }}>
                    <span style={{ background: b.bg, color: b.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>{b.label}</span>
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    {s.estado === 'pendiente' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.75rem' }} onClick={() => cambiarEstado(s.id, 'aprobada')}>✓ Aprobar</button>
                        <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => cambiarEstado(s.id, 'rechazada')}>✕</button>
                      </div>
                    )}
                    {s.estado !== 'pendiente' && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.85rem' }}>
                  {loading ? 'Cargando solicitudes...' : 'No hay solicitudes de crédito registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
