import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Cliente {
  id: string;
  dni: string;
  nombre_completo: string;
  celular: string;
  direccion: string;
  ubigeo: string;
  latitud: number | null;
  longitud: number | null;
  tipo_negocio: string;
  ingresos_estimados: number;
  created_at: string;
}

export const PosicionCliente: React.FC = () => {
  const [dniBusqueda, setDniBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar últimos clientes registrados
  const cargarUltimosClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      if (data) setListaClientes(data as Cliente[]);
    } catch (err: any) {
      console.error('Error cargando lista de clientes:', err.message);
    }
  };

  useEffect(() => {
    cargarUltimosClientes();
  }, []);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniBusqueda) {
      setCliente(null);
      setErrorMsg(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCliente(null);

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('dni', dniBusqueda)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCliente(data as Cliente);
      } else {
        setErrorMsg('No se encontró ningún cliente registrado con ese número de DNI.');
      }
    } catch (err: any) {
      setErrorMsg('Error al consultar base de datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Panel Izquierdo: Buscador */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Posición de Cliente</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Busca y consulta el expediente consolidado del cliente.
          </p>
        </div>

        <form onSubmit={handleBuscar} className="glass" style={{ padding: '20px' }}>
          <label htmlFor="dni">Buscar por DNI</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="dni"
              type="text"
              maxLength={8}
              placeholder="Ej: 76797846"
              value={dniBusqueda}
              onChange={(e) => setDniBusqueda(e.target.value.replace(/\D/g, ''))}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || dniBusqueda.length !== 8}>
              {loading ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </form>

        {/* Últimos registrados */}
        <div className="glass" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Últimos Clientes Registrados
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {listaClientes.map(c => (
              <button
                key={c.id}
                onClick={() => { setCliente(c); setDniBusqueda(c.dni); }}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                  color: 'var(--text-secondary)', transition: 'var(--transition)', width: '100%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.nombre_completo}</p>
                <p style={{ fontSize: '0.75rem', marginTop: '2px' }}>DNI: {c.dni} &nbsp;|&nbsp; Negocio: {c.tipo_negocio}</p>
              </button>
            ))}
            {listaClientes.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No hay registros recientes.</p>
            )}
          </div>
        </div>
      </div>

      {/* Panel Derecho: Expediente */}
      <div style={{ flex: 1.8 }}>
        {errorMsg && (
          <div className="glass animate-fade" style={{ padding: '20px', color: 'var(--danger)', background: 'rgba(244,63,94,0.05)', borderColor: 'var(--danger)' }}>
            <p style={{ fontSize: '0.85rem' }}>⚠ {errorMsg}</p>
          </div>
        )}

        {cliente ? (
          <div className="glass animate-fade" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Cliente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
                display: 'flex', alignItems: 'center', justifyItems: 'center', alignContent: 'center', justifyContent: 'center',
                fontWeight: 'bold', color: '#fff', fontSize: '1.2rem'
              }}>
                {cliente.nombre_completo.charAt(0)}
              </div>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{cliente.nombre_completo}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente Activo · DNI {cliente.dni}</p>
              </div>
            </div>

            {/* Información Detallada */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Celular</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{cliente.celular || 'No registrado'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giro de Negocio</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{cliente.tipo_negocio || 'No especificado'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingresos Mensuales</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 700, marginTop: '2px' }}>S/. {cliente.ingresos_estimados.toFixed(2)}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código de Ubigeo</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>{cliente.ubigeo}</p>
              </div>
            </div>

            <div style={{ textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dirección Registrada</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '4px' }}>{cliente.direccion}</p>
            </div>

            {cliente.latitud && (
              <div style={{ textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Geolocalización (Coordenadas de Verificación)</span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    Lat: {cliente.latitud.toFixed(6)}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    Long: {cliente.longitud?.toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${cliente.latitud},${cliente.longitud}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    🗺️ Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass" style={{ padding: '60px 40px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: '14px' }}>📂</span>
            <h4 style={{ color: 'var(--text-primary)' }}>Expediente del Cliente</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '300px', margin: '8px auto 0' }}>
              Realiza una búsqueda por DNI o selecciona un cliente registrado recientemente para ver su información aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
