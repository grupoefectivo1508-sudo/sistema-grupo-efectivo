import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CreditoListo {
  id: string;
  solicitudId: string;
  codigo: string;
  clienteNombre: string;
  monto: number;
  asesor: string;
  fechaAprobacion: string;
  diasDesdeAprobacion: number;
  estado: 'listo' | 'desembolsado' | 'fecha_pasada';
}

export const DesembolsoCredito: React.FC = () => {
  const [creditos, setCreditos] = useState<CreditoListo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<CreditoListo | null>(null);
  const [confirmandoFechaPasada, setConfirmandoFechaPasada] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [exitoso, setExitoso] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarCreditosAprobados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitudes_credito')
        .select(`
          id,
          monto_solicitado,
          fecha_solicitud,
          estado,
          clientes ( nombre_completo ),
          perfiles:asesor_id ( nombre_completo )
        `)
        .eq('estado', 'aprobada')
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const hoy = new Date();
        const mapped: CreditoListo[] = data.map((s: any, i: number) => {
          const fechaSol = new Date(s.fecha_solicitud);
          const diffDias = Math.floor((hoy.getTime() - fechaSol.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: s.id,
            solicitudId: s.id,
            codigo: `LM-${String(1000 + i).slice(1)}`,
            clienteNombre: s.clientes?.nombre_completo || 'Cliente Desconocido',
            monto: parseFloat(s.monto_solicitado) || 0,
            asesor: s.perfiles?.nombre_completo || 'Asesor',
            fechaAprobacion: fechaSol.toLocaleDateString('es-PE'),
            diasDesdeAprobacion: diffDias,
            estado: diffDias > 3 ? 'fecha_pasada' : 'listo',
          };
        });
        setCreditos(mapped);
      } else {
        setCreditos([]);
      }
    } catch (err: any) {
      console.error('Error cargando créditos aprobados:', err.message);
      setCreditos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarCreditosAprobados(); }, []);

  const handleSeleccionar = (c: CreditoListo) => {
    setCreditoSeleccionado(c);
    setConfirmandoFechaPasada(false);
    setErrorMsg(null);
  };

  const handleDesembolsar = async () => {
    if (!creditoSeleccionado) return;
    if (creditoSeleccionado.estado === 'fecha_pasada' && !confirmandoFechaPasada) {
      setConfirmandoFechaPasada(true);
      return;
    }
    setProcesando(true);
    setErrorMsg(null);

    try {
      // 1. Crear el registro de crédito en la tabla creditos
      const codigoCredito = `LM-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const { error: errorCredito } = await supabase
        .from('creditos')
        .insert({
          solicitud_id: creditoSeleccionado.solicitudId,
          codigo_credito: codigoCredito,
          monto_desembolsado: creditoSeleccionado.monto,
          estado: 'activo',
        });

      if (errorCredito) throw errorCredito;

      // 2. Actualizar estado de la solicitud a 'desembolsada'
      const { error: errorSolicitud } = await supabase
        .from('solicitudes_credito')
        .update({ estado: 'desembolsada' })
        .eq('id', creditoSeleccionado.solicitudId);

      if (errorSolicitud) throw errorSolicitud;

      // Marcar como desembolsado localmente
      setCreditos(prev => prev.map(c => c.id === creditoSeleccionado.id ? { ...c, estado: 'desembolsado' as const } : c));
      setExitoso(codigoCredito);
      setCreditoSeleccionado(null);
      setConfirmandoFechaPasada(false);

      // Recargar lista
      setTimeout(() => cargarCreditosAprobados(), 1500);
    } catch (err: any) {
      setErrorMsg('Error al desembolsar: ' + err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Lista de créditos */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Desembolsar Crédito</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Créditos aprobados listos para entrega de efectivo.
          </p>
        </div>

        {exitoso && (
          <div className="animate-fade" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '14px 18px' }}>
            <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
              ✓ Desembolso del crédito <strong>{exitoso}</strong> registrado con éxito. Entrega el efectivo al cliente.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="animate-fade" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '12px', padding: '14px 18px' }}>
            <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>⚠ {errorMsg}</p>
          </div>
        )}

        {loading ? (
          <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando créditos aprobados...</p>
          </div>
        ) : creditos.filter(c => c.estado !== 'desembolsado').length === 0 ? (
          <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
              {creditos.length === 0 ? 'No hay créditos aprobados pendientes de desembolso.' : '✓ Todos los créditos del día han sido desembolsados.'}
            </p>
          </div>
        ) : creditos.map(c => {
          const isSelected    = creditoSeleccionado?.id === c.id;
          const isDesembolsado = c.estado === 'desembolsado';
          const isFechaPasada  = c.estado === 'fecha_pasada';

          return (
            <button
              key={c.id}
              onClick={() => !isDesembolsado && handleSeleccionar(c)}
              className="glass"
              style={{
                padding: '18px 22px', textAlign: 'left', width: '100%',
                border: isSelected ? '1px solid var(--primary)' : isDesembolsado ? '1px solid var(--success)' : isFechaPasada ? '1px solid rgba(244,63,94,0.4)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(14,165,233,0.07)' : isDesembolsado ? 'rgba(16,185,129,0.04)' : 'var(--surface)',
                cursor: isDesembolsado ? 'default' : 'pointer',
                opacity: isDesembolsado ? 0.65 : 1,
                borderRadius: '12px', transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 700 }}>{c.codigo}</span>
                    {isFechaPasada && (
                      <span style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                        ⚠ Fecha Pasada ({c.diasDesdeAprobacion}d)
                      </span>
                    )}
                    {isDesembolsado && (
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                        ✓ Desembolsado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{c.clienteNombre}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Asesor: {c.asesor} &nbsp;|&nbsp; Aprobado: {c.fechaAprobacion}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    S/. {c.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Panel de confirmación */}
      <div style={{ flex: 1 }}>
        <div className="glass" style={{ padding: '24px', position: 'sticky', top: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Confirmar Desembolso
          </h4>

          {!creditoSeleccionado ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>💸</p>
              <p style={{ fontSize: '0.85rem' }}>Selecciona un crédito aprobado para ejecutar el desembolso.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Datos del crédito */}
              <div style={{ background: 'rgba(14,165,233,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(14,165,233,0.1)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Crédito</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{creditoSeleccionado.codigo}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>{creditoSeleccionado.clienteNombre}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '8px' }}>
                  S/. {creditoSeleccionado.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Alerta de fecha pasada */}
              {creditoSeleccionado.estado === 'fecha_pasada' && (
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600 }}>
                    ⚠ Alerta: La fecha de desembolso programada ya pasó ({creditoSeleccionado.diasDesdeAprobacion} días atrás).
                    Proceder es bajo tu responsabilidad.
                  </p>
                  {confirmandoFechaPasada && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <input type="checkbox" defaultChecked /> Confirmo que soy responsable de este desembolso fuera de fecha.
                      </label>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleDesembolsar}
                disabled={procesando}
              >
                {procesando ? 'Procesando...' : confirmandoFechaPasada ? '⚠ Confirmar de todas formas' : '✓ Ejecutar Desembolso'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setCreditoSeleccionado(null); setConfirmandoFechaPasada(false); }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
