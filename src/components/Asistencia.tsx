import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AsistenciaRegistro {
  id: string;
  dni: string;
  nombre: string;
  rol: string;
  horaEntrada: string;
  horaSalida?: string;
  fecha: string;
  estado: 'presente' | 'salida_registrada';
}

interface PerfilSupabase {
  id: string;
  nombre_completo: string;
  rol: string;
}

const HOY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const HOY_LOCAL = new Date().toLocaleDateString('es-PE');

export const Asistencia: React.FC = () => {
  const [registros, setRegistros]   = useState<AsistenciaRegistro[]>([]);
  const [perfiles, setPerfiles]     = useState<PerfilSupabase[]>([]);
  const [dniBusqueda, setDniBusqueda] = useState('');
  const [mensaje, setMensaje]       = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);

  const mostrarMensaje = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  // Cargar registros de asistencia del día
  const cargarAsistencia = async () => {
    setLoadingLista(true);
    try {
      const { data, error } = await supabase
        .from('asistencia')
        .select(`
          id,
          fecha,
          hora_entrada,
          hora_salida,
          perfiles (
            nombre_completo,
            rol
          )
        `)
        .eq('fecha', HOY)
        .order('hora_entrada', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: AsistenciaRegistro[] = data.map((r: any) => ({
          id: r.id,
          dni: '—',
          nombre: r.perfiles?.nombre_completo || 'Empleado Desconocido',
          rol: r.perfiles?.rol || '—',
          horaEntrada: r.hora_entrada ? r.hora_entrada.slice(0, 5) : '—',
          horaSalida: r.hora_salida ? r.hora_salida.slice(0, 5) : undefined,
          fecha: HOY_LOCAL,
          estado: r.hora_salida ? 'salida_registrada' : 'presente',
        }));
        setRegistros(mapped);
      }
    } catch (err: any) {
      console.error('Error cargando asistencia:', err.message);
    } finally {
      setLoadingLista(false);
    }
  };

  // Cargar perfiles de empleados por DNI (para fichaje)
  const cargarPerfiles = async () => {
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, rol')
        .eq('activo', true);
      if (data) setPerfiles(data);
    } catch (err) {
      console.error('Error cargando perfiles:', err);
    }
  };

  useEffect(() => {
    cargarAsistencia();
    cargarPerfiles();
  }, []);

  const handleFichar = async () => {
    if (!procesando) {
      // Modo demo: fichar con cualquier ID de perfil disponible
      setProcesando(true);
      const ahora = new Date();
      const horaStr = ahora.toTimeString().slice(0, 8); // HH:MM:SS

      try {
        // Buscar si ya hay un registro hoy para el perfil demo
        const perfilDemo = perfiles[0]; // Usa el primer perfil disponible como demo
        if (!perfilDemo) {
          mostrarMensaje('error', 'No hay perfiles registrados. Ejecuta el SQL de relax_constraints.sql en Supabase.');
          setProcesando(false);
          return;
        }

        const { data: existente } = await supabase
          .from('asistencia')
          .select('id, hora_salida')
          .eq('usuario_id', perfilDemo.id)
          .eq('fecha', HOY)
          .maybeSingle();

        if (existente) {
          if (existente.hora_salida) {
            mostrarMensaje('error', `${perfilDemo.nombre_completo} ya registró su salida hoy.`);
          } else {
            // Registrar salida
            const { error } = await supabase
              .from('asistencia')
              .update({ hora_salida: horaStr })
              .eq('id', existente.id);

            if (error) throw error;
            mostrarMensaje('ok', `Salida registrada para ${perfilDemo.nombre_completo} a las ${horaStr.slice(0,5)}.`);
          }
        } else {
          // Registrar entrada
          const { error } = await supabase
            .from('asistencia')
            .insert([{
              usuario_id: perfilDemo.id,
              sucursal_id: null,
              fecha: HOY,
              hora_entrada: horaStr
            }]);

          if (error) throw error;
          mostrarMensaje('ok', `Entrada registrada para ${perfilDemo.nombre_completo} a las ${horaStr.slice(0,5)}.`);
        }

        setDniBusqueda('');
        await cargarAsistencia();
      } catch (err: any) {
        mostrarMensaje('error', 'Error al fichar: ' + err.message);
      } finally {
        setProcesando(false);
      }
    }
  };

  const presentes        = registros.filter(r => r.estado === 'presente').length;
  const salidaRegistrada = registros.filter(r => r.estado === 'salida_registrada').length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Registro de Asistencia</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Ingresa el DNI del colaborador para registrar entrada o salida. Fecha: <strong>{HOY_LOCAL}</strong>
        </p>
      </div>

      {/* Panel de fichaje */}
      <div className="glass" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Fichar Asistencia</p>
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '420px' }}>
          <input
            type="text" maxLength={8}
            placeholder="Ingresa el DNI (8 dígitos)"
            value={dniBusqueda}
            onChange={e => setDniBusqueda(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleFichar()}
            style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', letterSpacing: '4px' }}
          />
          <button className="btn btn-primary" style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}
            onClick={handleFichar} disabled={procesando}>
            {procesando ? '...' : 'Fichar'}
          </button>
        </div>

        {mensaje && (
          <div className="animate-fade" style={{
            background: mensaje.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
            border: `1px solid ${mensaje.tipo === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            color: mensaje.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
            padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 500,
            maxWidth: '420px', width: '100%',
          }}>
            {mensaje.tipo === 'ok' ? '✓' : '⚠'} {mensaje.texto}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
        {[
          { label: 'Total Personal Hoy',    value: registros.length, color: 'var(--primary)' },
          { label: 'Presentes Ahora',        value: presentes,        color: 'var(--success)' },
          { label: 'Salida Registrada',      value: salidaRegistrada, color: 'var(--text-secondary)' },
        ].map(k => (
          <div key={k.label} className="glass" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{k.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Registro del Día — {HOY_LOCAL}
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Colaborador', 'Rol', 'Entrada', 'Salida', 'Estado'].map(h => (
                <th key={h} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)', paddingRight: '16px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingLista ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.85rem' }}>Cargando asistencia...</td>
              </tr>
            ) : registros.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.85rem' }}>No hay registros de asistencia para el día de hoy.</td>
              </tr>
            ) : registros.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px 12px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{r.nombre}</td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.rol}</td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>{r.horaEntrada}</td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: '0.82rem', color: r.horaSalida ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {r.horaSalida || '— En curso'}
                </td>
                <td style={{ padding: '12px 0' }}>
                  <span style={{
                    background: r.estado === 'presente' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                    color: r.estado === 'presente' ? 'var(--success)' : 'var(--text-secondary)',
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {r.estado === 'presente' ? '● Presente' : '✓ Salida OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
