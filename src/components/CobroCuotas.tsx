import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CuotaPendiente {
  id: string;
  codigoCredito: string;
  clienteNombre: string;
  numCuota: number;
  totalCuotas: number;
  fechaVencimiento: string;
  montoTotal: number;
  montoPagado: number;
  diasAtraso: number;
}

type EstadoPago = 'pendiente' | 'procesando' | 'cobrado';

interface CobroCuotasProps {
  sucursalNombre?: string;
  cajaOperacionIdGlobal?: string | null;
}

export const CobroCuotas: React.FC<CobroCuotasProps> = ({ sucursalNombre = 'La Merced', cajaOperacionIdGlobal }) => {
  const [cuotas, setCuotas] = useState<CuotaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<CuotaPendiente | null>(null);
  const [montoPagado, setMontoPagado] = useState('');
  const [estadosPago, setEstadosPago] = useState<Record<string, EstadoPago>>({});
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [cajaOperacionId, setCajaOperacionId] = useState<string | null>(cajaOperacionIdGlobal || null);
  const [checkingCaja, setCheckingCaja] = useState(false);

  useEffect(() => {
    if (cajaOperacionIdGlobal !== undefined) {
      setCajaOperacionId(cajaOperacionIdGlobal);
    }
  }, [cajaOperacionIdGlobal]);

  const mostrarMsg = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const verificarCaja = async () => {
    if (cajaOperacionIdGlobal !== undefined) return; // Si viene por prop, no consultamos
    setCheckingCaja(true);
    try {
      const { data: sucData } = await supabase
        .from('sucursales')
        .select('id')
        .eq('nombre', sucursalNombre)
        .maybeSingle();

      if (sucData) {
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id || '00000000-0000-0000-0000-000000000000';

        const { data: cajaData } = await supabase
          .from('cajas_operacion')
          .select('id')
          .eq('estado', 'abierta')
          .eq('sucursal_id', sucData.id)
          .eq('usuario_id', currentUserId)
          .maybeSingle();

        if (cajaData) {
          setCajaOperacionId(cajaData.id);
        } else {
          setCajaOperacionId(null);
        }
      }
    } catch (err) {
      console.error('Error verificando caja:', err);
    } finally {
      setCheckingCaja(false);
    }
  };

  const cargarCuotas = async () => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('cuotas')
        .select(`
          id,
          numero_cuota,
          fecha_vencimiento,
          monto_total,
          monto_pagado,
          estado,
          creditos (
            codigo_credito,
            solicitudes_credito (
              numero_cuotas,
              clientes ( nombre_completo )
            )
          )
        `)
        .in('estado', ['pendiente', 'mora'])
        .order('fecha_vencimiento', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: CuotaPendiente[] = data.map((c: any) => {
          const fv = new Date(c.fecha_vencimiento);
          const hoyDate = new Date(hoy);
          const diff = Math.floor((hoyDate.getTime() - fv.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: c.id,
            codigoCredito: c.creditos?.codigo_credito || '—',
            clienteNombre: c.creditos?.solicitudes_credito?.clientes?.nombre_completo || 'Cliente Desconocido',
            numCuota: c.numero_cuota,
            totalCuotas: c.creditos?.solicitudes_credito?.numero_cuotas || 0,
            fechaVencimiento: fv.toLocaleDateString('es-PE'),
            montoTotal: parseFloat(c.monto_total) || 0,
            montoPagado: parseFloat(c.monto_pagado) || 0,
            diasAtraso: Math.max(0, diff),
          };
        });
        setCuotas(mapped);
      } else {
        setCuotas([]);
      }
    } catch (err: any) {
      console.error('Error cargando cuotas:', err.message);
      setCuotas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarCaja();
    cargarCuotas();
  }, [sucursalNombre]);

  const cuotasFiltradas = cuotas.filter(c =>
    c.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigoCredito.includes(busqueda)
  );

  const handleSeleccionar = (cuota: CuotaPendiente) => {
    setCuotaSeleccionada(cuota);
    setMontoPagado((cuota.montoTotal - cuota.montoPagado).toFixed(2));
  };

  const handleCobrar = async () => {
    if (!cuotaSeleccionada) return;
    if (!cajaOperacionId) {
      mostrarMsg('error', 'No se puede cobrar: La caja de operaciones debe estar abierta para esta sucursal.');
      return;
    }

    const montoACobrar = parseFloat(montoPagado || '0');
    if (montoACobrar <= 0) return;

    setEstadosPago(prev => ({ ...prev, [cuotaSeleccionada.id]: 'procesando' }));

    try {
      const descripcionMovimiento = `Cobro cuota ${cuotaSeleccionada.numCuota}/${cuotaSeleccionada.totalCuotas} de crédito ${cuotaSeleccionada.codigoCredito} — ${cuotaSeleccionada.clienteNombre}`;

      const { error: rpcError } = await supabase.rpc('rpc_cobrar_cuota', {
        p_cuota_id: cuotaSeleccionada.id,
        p_caja_operacion_id: cajaOperacionId,
        p_monto_a_cobrar: montoACobrar,
        p_descripcion_movimiento: descripcionMovimiento
      });

      if (rpcError) throw rpcError;

      setEstadosPago(prev => ({ ...prev, [cuotaSeleccionada.id]: 'cobrado' }));
      mostrarMsg('ok', `Cobro de S/. ${montoACobrar.toFixed(2)} registrado en caja y cuota actualizada.`);
      setCuotaSeleccionada(null);
      setMontoPagado('');
      await cargarCuotas();
    } catch (err: any) {
      setEstadosPago(prev => ({ ...prev, [cuotaSeleccionada.id]: 'pendiente' }));
      mostrarMsg('error', 'Error al registrar cobro: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Panel Izquierdo: Lista de cuotas */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cobrar Cuotas</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Busca al cliente y selecciona la cuota a cobrar.</p>
        </div>

        {checkingCaja ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verificando estado de la caja sucursal...</p>
          </div>
        ) : !cajaOperacionId ? (
          <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
              ⚠ Caja Cerrada: Debes abrir la caja de operaciones del día desde el menú superior para poder procesar pagos.
            </p>
          </div>
        ) : null}

        {mensaje && (
          <div className="animate-fade" style={{
            background: mensaje.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
            border: `1px solid ${mensaje.tipo === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            color: mensaje.tipo === 'ok' ? 'var(--success)' : 'var(--danger)',
            padding: '12px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500,
          }}>
            {mensaje.tipo === 'ok' ? '✓' : '⚠'} {mensaje.texto}
          </div>
        )}

        <div>
          <label>Buscar por Nombre o Código de Crédito</label>
          <input type="text" placeholder="Ej: Garcia o LM-0041" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando cuotas pendientes...</p>
            </div>
          ) : cuotasFiltradas.length === 0 ? (
            <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No se encontraron cuotas pendientes.</p>
            </div>
          ) : cuotasFiltradas.map(c => {
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
                          S/. {(c.montoTotal - c.montoPagado).toFixed(2)}
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

              {parseFloat(montoPagado) < (cuotaSeleccionada.montoTotal - cuotaSeleccionada.montoPagado) && montoPagado !== '' && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                    ⚠️ Pago parcial: Quedará un saldo pendiente de S/. {((cuotaSeleccionada.montoTotal - cuotaSeleccionada.montoPagado) - parseFloat(montoPagado || '0')).toFixed(2)}
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
                disabled={!montoPagado || parseFloat(montoPagado) <= 0 || !cajaOperacionId}
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
