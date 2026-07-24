import React, { useState } from 'react';

interface CuotaPendiente {
  id: string;
  codigoCredito: string;
  clienteNombre: string;
  numCuota: number;
  totalCuotas: number;
  fechaVencimiento: string;
  montoTotal: number;
  diasAtraso: number;
}

const CUOTAS_DEMO: CuotaPendiente[] = [
  { id: '1', codigoCredito: 'LM-0041', clienteNombre: 'GARCIA HUAMAN, Rosa Elena', numCuota: 4, totalCuotas: 12, fechaVencimiento: '20/07/2026', montoTotal: 180.50, diasAtraso: 3 },
  { id: '2', codigoCredito: 'LM-0078', clienteNombre: 'MENDOZA RAMOS, Luis Alfredo', numCuota: 1, totalCuotas: 6, fechaVencimiento: '23/07/2026', montoTotal: 550.00, diasAtraso: 0 },
  { id: '3', codigoCredito: 'LM-0023', clienteNombre: 'HUANUCO RAMOS, Felix', numCuota: 2, totalCuotas: 10, fechaVencimiento: '17/07/2026', montoTotal: 95.00, diasAtraso: 7 },
  { id: '4', codigoCredito: 'LM-0105', clienteNombre: 'SALAZAR POMA, Gladys', numCuota: 3, totalCuotas: 8, fechaVencimiento: '01/07/2026', montoTotal: 490.00, diasAtraso: 22 },
];

type EstadoPago = 'pendiente' | 'procesando' | 'cobrado';

export const CobroCuotas: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<CuotaPendiente | null>(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [estadosPago, setEstadosPago] = useState<Record<string, EstadoPago>>({});

  const cuotasFiltradas = CUOTAS_DEMO.filter(c =>
    c.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigoCredito.includes(busqueda)
  );

  const handleSeleccionar = (cuota: CuotaPendiente) => {
    setCuotaSeleccionada(cuota);
    setMontoPagado(cuota.montoTotal.toFixed(2));
  };

  const handleCobrar = () => {
    if (!cuotaSeleccionada) return;
    setEstadosPago(prev => ({ ...prev, [cuotaSeleccionada.id]: 'procesando' }));
    setTimeout(() => {
      setEstadosPago(prev => ({ ...prev, [cuotaSeleccionada.id]: 'cobrado' }));
      setCuotaSeleccionada(null);
      setMontoPagado('');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Panel Izquierdo: Lista de cuotas */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cobrar Cuotas</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Busca al cliente y selecciona la cuota a cobrar.</p>
        </div>

        <div>
          <label>Buscar por Nombre o Código de Crédito</label>
          <input type="text" placeholder="Ej: Garcia o LM-0041" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cuotasFiltradas.map(c => {
            const estado = estadosPago[c.id];
            const isCobrado = estado === 'cobrado';
            const isSelected = cuotaSeleccionada?.id === c.id;

            return (
              <button
                key={c.id}
                onClick={() => !isCobrado && handleSeleccionar(c)}
                className="glass"
                style={{
                  padding: '16px 20px', textAlign: 'left', cursor: isCobrado ? 'default' : 'pointer',
                  border: isSelected ? '1px solid var(--primary)' : isCobrado ? '1px solid var(--success)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(14,165,233,0.07)' : isCobrado ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
                  opacity: isCobrado ? 0.7 : 1,
                  transition: 'var(--transition)', borderRadius: '12px', width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{c.clienteNombre}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {c.codigoCredito} &nbsp;|&nbsp; Cuota {c.numCuota}/{c.totalCuotas} &nbsp;|&nbsp; Vence: {c.fechaVencimiento}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isCobrado ? (
                      <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>✓ Cobrado</span>
                    ) : (
                      <>
                        <p style={{ fontSize: '1.15rem', fontWeight: 700, color: c.diasAtraso > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                          S/. {c.montoTotal.toFixed(2)}
                        </p>
                        {c.diasAtraso > 0 && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(244,63,94,0.1)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                            {c.diasAtraso} días de atraso
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {cuotasFiltradas.length === 0 && (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No se encontraron cuotas pendientes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho: Formulario de cobro */}
      <div style={{ flex: 1 }}>
        <div className="glass" style={{ padding: '24px', position: 'sticky', top: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Detalle de Cobro
          </h4>

          {!cuotaSeleccionada ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>💵</p>
              <p style={{ fontSize: '0.85rem' }}>Selecciona una cuota de la lista para proceder con el cobro.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(14,165,233,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(14,165,233,0.1)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cliente</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cuotaSeleccionada.clienteNombre}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {cuotaSeleccionada.codigoCredito} · Cuota {cuotaSeleccionada.numCuota}/{cuotaSeleccionada.totalCuotas}
                </p>
              </div>

              <div>
                <label>Monto a Cobrar (S/.)</label>
                <input type="number" value={montoPagado} onChange={e => setMontoPagado(e.target.value)} step="0.01" min="0" />
              </div>

              {parseFloat(montoPagado) < cuotaSeleccionada.montoTotal && montoPagado !== '' && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                    ⚠️ Pago parcial: Quedará un saldo pendiente de S/. {(cuotaSeleccionada.montoTotal - parseFloat(montoPagado || '0')).toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <label>Método de Pago</label>
                <select>
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape / Plin</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
                onClick={handleCobrar}
                disabled={!montoPagado || parseFloat(montoPagado) <= 0}
              >
                ✓ Confirmar Cobro de S/. {parseFloat(montoPagado || '0').toFixed(2)}
              </button>

              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setCuotaSeleccionada(null)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
