import React, { useState } from 'react';

interface CreditoListo {
  id: string;
  codigo: string;
  clienteNombre: string;
  monto: number;
  asesor: string;
  fechaAprobacion: string;
  diasDesdeAprobacion: number;
  estado: 'listo' | 'desembolsado' | 'fecha_pasada';
}

const CREDITOS_LISTOS: CreditoListo[] = [
  { id: '1', codigo: 'LM-0104', clienteNombre: 'PAREDES LEON, Jorge',    monto: 5000, asesor: 'MLOPEZ', fechaAprobacion: '24/07/2026', diasDesdeAprobacion: 0, estado: 'listo' },
  { id: '2', codigo: 'LM-0103', clienteNombre: 'ROMERO VASQUEZ, Sandra', monto: 2000, asesor: 'CROJAS', fechaAprobacion: '24/07/2026', diasDesdeAprobacion: 0, estado: 'listo' },
  { id: '3', codigo: 'LM-0101', clienteNombre: 'CUBA RIOS, Alvaro',      monto: 1500, asesor: 'RPEREZ', fechaAprobacion: '20/07/2026', diasDesdeAprobacion: 4, estado: 'fecha_pasada' },
];

export const DesembolsoCredito: React.FC = () => {
  const [creditos, setCreditos] = useState<CreditoListo[]>(CREDITOS_LISTOS);
  const [creditoSeleccionado, setCreditoSeleccionado] = useState<CreditoListo | null>(null);
  const [confirmandoFechaPasada, setConfirmandoFechaPasada] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [exitoso, setExitoso] = useState<string | null>(null);

  const handleSeleccionar = (c: CreditoListo) => {
    setCreditoSeleccionado(c);
    setConfirmandoFechaPasada(false);
  };

  const handleDesembolsar = () => {
    if (!creditoSeleccionado) return;
    if (creditoSeleccionado.estado === 'fecha_pasada' && !confirmandoFechaPasada) {
      setConfirmandoFechaPasada(true);
      return;
    }
    setProcesando(true);
    setTimeout(() => {
      setCreditos(prev => prev.map(c => c.id === creditoSeleccionado.id ? { ...c, estado: 'desembolsado' } : c));
      setExitoso(creditoSeleccionado.codigo);
      setCreditoSeleccionado(null);
      setProcesando(false);
      setConfirmandoFechaPasada(false);
    }, 1800);
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

        {creditos.map(c => {
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
                    S/. {c.monto.toLocaleString()}.00
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {creditos.filter(c => c.estado !== 'desembolsado').length === 0 && (
          <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
              ✓ Todos los créditos del día han sido desembolsados.
            </p>
          </div>
        )}
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
                  S/. {creditoSeleccionado.monto.toLocaleString()}.00
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
