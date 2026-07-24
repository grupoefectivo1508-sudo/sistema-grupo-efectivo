import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RegisterClient } from './RegisterClient';
import { SimuladorCredito } from './SimuladorCredito';
import { ReporteMora } from './ReporteMora';
import { CobroCuotas } from './CobroCuotas';
import { RegistrarSolicitud } from './RegistrarSolicitud';
import { DesembolsoCredito } from './DesembolsoCredito';
import { OperacionesCaja } from './OperacionesCaja';
import { Asistencia } from './Asistencia';
import { PosicionCliente } from './PosicionCliente';
import { SaldosAsesor } from './SaldosAsesor';

interface UserSession {
  email: string;
  sucursal: string;
  rol: string;
}

interface DashboardProps {
  session: UserSession;
  onLogout: () => void;
}

type Modulo = 'home' | 'caja' | 'cliente' | 'credito' | 'inversion' | 'administracion';

interface KpiData {
  totalClientes: number;
  creditosActivos: number;
  montoDesembolsadoHoy: number;
  cuotasVencidas: number;
}

interface OperacionReciente {
  id: string;
  hora: string;
  tipo: string;
  categoria: string;
  monto: number;
  desc: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [activeModule, setActiveModule]       = useState<Modulo>('home');
  const [activeSubModule, setActiveSubModule] = useState('');
  const [isBovedaOpen, setIsBovedaOpen]       = useState(false);
  const [cajaData, setCajaData] = useState<{ id: string; sucursal_id: string; usuario_id: string } | null>(null);
  const [cajaLoading, setCajaLoading] = useState(false);

  useEffect(() => {
    const verificarCajaGlobal = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;
        if (!currentUserId) return;

        const { data: sucData } = await supabase
          .from('sucursales')
          .select('id')
          .eq('nombre', session.sucursal)
          .maybeSingle();

        if (sucData) {
          const { data: cData } = await supabase
            .from('cajas_operacion')
            .select('id')
            .eq('estado', 'abierta')
            .eq('sucursal_id', sucData.id)
            .eq('usuario_id', currentUserId)
            .maybeSingle();

          if (cData) {
            setIsBovedaOpen(true);
            setCajaData({ id: cData.id, sucursal_id: sucData.id, usuario_id: currentUserId });
          } else {
            setIsBovedaOpen(false);
            setCajaData({ id: '', sucursal_id: sucData.id, usuario_id: currentUserId });
          }
        }
      } catch (err) {
        console.error('Error verificando caja:', err);
      }
    };
    verificarCajaGlobal();
  }, [session.sucursal]);

  const toggleBoveda = async () => {
    if (!cajaData || !cajaData.sucursal_id || !cajaData.usuario_id) return;
    setCajaLoading(true);
    try {
      if (isBovedaOpen) {
        await supabase.from('cajas_operacion').update({ estado: 'cerrada', fecha_cierre: new Date().toISOString() }).eq('id', cajaData.id);
        setIsBovedaOpen(false);
        setCajaData({ ...cajaData, id: '' });
      } else {
        const { data: newCaja } = await supabase.from('cajas_operacion').insert({ sucursal_id: cajaData.sucursal_id, usuario_id: cajaData.usuario_id, estado: 'abierta', saldo_inicial: 0 }).select('id').single();
        if (newCaja) {
          setIsBovedaOpen(true);
          setCajaData({ ...cajaData, id: newCaja.id });
        }
      }
    } catch (err: any) {
      console.error('Error alternando caja:', err);
      alert('Error alternando caja: ' + err.message);
    } finally {
      setCajaLoading(false);
    }
  };
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [kpis, setKpis] = useState<KpiData>({ totalClientes: 0, creditosActivos: 0, montoDesembolsadoHoy: 0, cuotasVencidas: 0 });
  const [operaciones, setOperaciones] = useState<OperacionReciente[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);

  const selectModule = (mod: Modulo, sub = '') => {
    setActiveModule(mod);
    setActiveSubModule(sub);
  };

  // Cargar KPIs reales desde Supabase
  useEffect(() => {
    const cargarKPIs = async () => {
      setLoadingKpis(true);
      try {
        // Total de clientes
        const { count: totalClientes } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true });

        // Créditos activos
        const { count: creditosActivos } = await supabase
          .from('creditos')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'activo');

        // Monto desembolsado hoy
        const hoy = new Date().toISOString().split('T')[0];
        const { data: desembolsosHoy } = await supabase
          .from('creditos')
          .select('monto_desembolsado')
          .gte('fecha_desembolso', hoy + 'T00:00:00')
          .lte('fecha_desembolso', hoy + 'T23:59:59');

        const montoHoy = (desembolsosHoy || []).reduce((a: number, c: any) => a + (parseFloat(c.monto_desembolsado) || 0), 0);

        // Cuotas vencidas (mora)
        const { count: cuotasVencidas } = await supabase
          .from('cuotas')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
          .lt('fecha_vencimiento', hoy);

        setKpis({
          totalClientes: totalClientes || 0,
          creditosActivos: creditosActivos || 0,
          montoDesembolsadoHoy: montoHoy,
          cuotasVencidas: cuotasVencidas || 0,
        });

        // Operaciones recientes de caja (últimos 10 movimientos)
        const { data: movimientos } = await supabase
          .from('movimientos_caja')
          .select('id, tipo_movimiento, categoria, monto, descripcion, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (movimientos && movimientos.length > 0) {
          const mapped: OperacionReciente[] = movimientos.map((m: any) => ({
            id: m.id,
            hora: new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
            tipo: m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso',
            categoria: (m.categoria || '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            monto: parseFloat(m.monto) || 0,
            desc: m.descripcion || '—',
          }));
          setOperaciones(mapped);
        }
      } catch (err) {
        console.error('Error cargando KPIs:', err);
      } finally {
        setLoadingKpis(false);
      }
    };

    cargarKPIs();
  }, [activeModule]); // Recargar cuando vuelve al home

  // ----- Renderizado del área central según módulo/submódulo activo -----
  const renderContent = () => {
    // Bloqueo de caja cuando está cerrada
    if (activeModule === 'caja' && !isBovedaOpen) {
      return (
        <div className="glass animate-fade" style={s.lockPanel}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h3 style={{ marginTop: '14px', color: 'var(--text-primary)' }}>Módulo Bloqueado — Bóveda Cerrada</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', margin: '10px auto', fontSize: '0.9rem' }}>
            La caja de la sucursal está cerrada. Usa el botón <strong>"Abrir Caja"</strong> en la barra superior
            para habilitar los cobros y desembolsos del día.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={toggleBoveda} disabled={cajaLoading}>
            {cajaLoading ? 'Abriendo...' : 'Abrir Caja Ahora'}
          </button>
        </div>
      );
    }

    // Submódulos específicos
    if (activeModule === 'cliente' && activeSubModule === 'registrar_cliente') {
      return <RegisterClient sucursalNombre={session.sucursal} onSuccess={() => selectModule('cliente')} onCancel={() => selectModule('cliente')} />;
    }
    if (activeModule === 'cliente' && activeSubModule === 'posicion') {
      return <PosicionCliente />;
    }
    if (activeModule === 'cliente' && activeSubModule === 'reporte_mora') {
      return <ReporteMora />;
    }
    if (activeModule === 'cliente' && activeSubModule === 'saldos_asesor') {
      return <SaldosAsesor />;
    }
    if (activeModule === 'caja' && activeSubModule === 'cobrar') {
      return <CobroCuotas sucursalNombre={session.sucursal} cajaOperacionIdGlobal={cajaData?.id || null} />;
    }
    if (activeModule === 'credito' && activeSubModule === 'simular') {
      return <SimuladorCredito />;
    }
    if (activeModule === 'credito' && activeSubModule === 'solicitudes') {
      return <RegistrarSolicitud sucursalNombre={session.sucursal} />;
    }
    if (activeModule === 'caja' && activeSubModule === 'desembolsar') {
      return <DesembolsoCredito sucursalNombre={session.sucursal} cajaOperacionIdGlobal={cajaData?.id || null} />;
    }
    if (activeModule === 'caja' && activeSubModule === 'operaciones') {
      return <OperacionesCaja />;
    }
    if (activeModule === 'administracion' && activeSubModule === 'asistencia') {
      return <Asistencia />;
    }
    if (activeModule === 'administracion' && activeSubModule === 'rep_asistencia') {
      return <Asistencia />;
    }

    // Dashboard de inicio
    if (activeModule === 'home') {
      const kpiCards = [
        { label: 'Clientes Registrados', value: loadingKpis ? '...' : `${kpis.totalClientes}`, sub: 'Total en base de datos', color: 'var(--primary)', pct: Math.min(kpis.totalClientes, 100) },
        { label: 'Créditos Activos',     value: loadingKpis ? '...' : `${kpis.creditosActivos}`, sub: 'Vigentes actualmente',  color: 'var(--success)', pct: Math.min(kpis.creditosActivos * 10, 100) },
        { label: 'Desembolsos Hoy',      value: loadingKpis ? '...' : `S/. ${kpis.montoDesembolsadoHoy.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, sub: 'Monto entregado hoy', color: 'var(--warning)', pct: Math.min(kpis.montoDesembolsadoHoy / 100, 100) },
        { label: 'Cuotas en Mora',       value: loadingKpis ? '...' : `${kpis.cuotasVencidas}`, sub: 'Vencidas sin pagar',    color: 'var(--danger)',  pct: Math.min(kpis.cuotasVencidas * 5, 100) },
      ];

      return (
        <div className="animate-fade" style={s.homeGrid}>
          {/* KPIs */}
          <div style={s.kpiGrid}>
            {kpiCards.map(k => (
              <div key={k.label} className="glass" style={s.kpiCard}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{k.label}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '10px 0 12px' }}>
                  <h3 style={{ fontSize: '1.7rem', fontWeight: 700, color: '#fff' }}>{k.value}</h3>
                  <span style={{ fontSize: '0.78rem', color: k.color }}>{k.sub}</span>
                </div>
                <div style={s.progressBg}>
                  <div style={{ ...s.progressFill, width: `${k.pct}%`, backgroundColor: k.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Operaciones recientes + Accesos rápidos */}
          <div style={s.bottomRow}>
            <div className="glass" style={{ ...s.panel, flex: 2 }}>
              <h4 style={s.panelTitle}>Operaciones Recientes de Caja</h4>
              {operaciones.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.85rem' }}>
                  {loadingKpis ? 'Cargando...' : 'No hay movimientos de caja registrados aún.'}
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Hora', 'Tipo', 'Categoría', 'Descripción', 'Monto'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operaciones.map(op => (
                      <tr key={op.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={s.td}>{op.hora}</td>
                        <td style={{ ...s.td, color: op.tipo === 'Ingreso' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{op.tipo}</td>
                        <td style={s.td}>{op.categoria}</td>
                        <td style={{ ...s.td, color: 'var(--text-primary)' }}>{op.desc}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>S/. {op.monto.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="glass" style={{ ...s.panel, flex: 1 }}>
              <h4 style={s.panelTitle}>Acciones Rápidas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: '👤', label: 'Registrar Cliente',  action: () => selectModule('cliente', 'registrar_cliente') },
                  { icon: '✍️', label: 'Simular Crédito',    action: () => selectModule('credito', 'simular') },
                  { icon: '💵', label: 'Cobrar Cuota',       action: () => selectModule('caja', 'cobrar') },
                  { icon: '⚠️', label: 'Reporte de Mora',   action: () => selectModule('cliente', 'reporte_mora') },
                ].map(a => (
                  <button key={a.label} className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%', padding: '13px' }} onClick={a.action}>
                    {a.icon}&nbsp; {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Vista genérica para sub-módulos en construcción
    return (
      <div className="glass animate-fade" style={s.placeholderPanel}>
        <span style={{ fontSize: '2.5rem' }}>🔧</span>
        <h4 style={{ color: 'var(--text-primary)', marginTop: '14px' }}>Módulo en Construcción</h4>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
          Este submódulo estará disponible en la siguiente fase del desarrollo.
        </p>
      </div>
    );
  };

  // ----- Menú lateral -----
  type NavItem = { icon: string; label: string; mod: Modulo; subs?: { key: string; label: string }[] };
  const navItems: NavItem[] = [
    {
      icon: '💵', label: 'Caja / Bóveda', mod: 'caja',
      subs: [
        { key: 'desembolsar', label: 'Desembolsar Crédito' },
        { key: 'cobrar',      label: 'Cobrar Cuota' },
        { key: 'prepago',     label: 'PrePago / Cancelación' },
        { key: 'entradas',    label: 'Reg. Entradas / Salidas' },
        { key: 'operaciones', label: 'Operaciones de Caja' },
      ],
    },
    {
      icon: '👤', label: 'Clientes', mod: 'cliente',
      subs: [
        { key: 'registrar_cliente', label: 'Registrar Cliente' },
        { key: 'posicion',          label: 'Posición del Cliente' },
        { key: 'reporte_mora',      label: 'Reporte Mora Cobranza' },
        { key: 'saldos_asesor',     label: 'Saldos x Asesor' },
      ],
    },
    {
      icon: '✍️', label: 'Créditos', mod: 'credito',
      subs: [
        { key: 'solicitudes',        label: 'Registrar Solicitudes' },
        { key: 'simular',            label: 'Simular Plan de Pago' },
        { key: 'desembolsos_agencia', label: 'R. Desembolso x Agencias' },
      ],
    },
    {
      icon: '📈', label: 'Inversión', mod: 'inversion',
      subs: [
        { key: 'simular_inv',  label: 'Simulador de Inversión' },
        { key: 'deposito_inv', label: 'Depósito Inversión' },
        { key: 'retiro_inv',   label: 'Retiro Inversión' },
      ],
    },
    {
      icon: '⚙️', label: 'Administración', mod: 'administracion',
      subs: [
        { key: 'asistencia',     label: 'Registrar Asistencia' },
        { key: 'rep_asistencia', label: 'Reporte Asistencia' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ===== SIDEBAR ===== */}
      <aside style={{ ...s.sidebar, width: sidebarOpen ? '260px' : '64px', transition: 'width 0.3s ease' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', padding: '0 4px', overflow: 'hidden' }}>
          <div style={s.logo}>GE</div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Grupo Efectivo</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Core Moderno v1.0</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(o => !o)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Botón de Inicio */}
        <button
          style={{ ...s.navBtn, ...(activeModule === 'home' ? s.navBtnActive : {}), justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          onClick={() => selectModule('home')}
        >
          <span style={{ flexShrink: 0 }}>🏠</span>
          {sidebarOpen && <span style={{ marginLeft: '10px', whiteSpace: 'nowrap' }}>Inicio</span>}
        </button>

        {sidebarOpen && <div style={s.divider}>MÓDULOS</div>}

        {/* Módulos de Negocio */}
        {navItems.map(item => (
          <div key={item.mod}>
            <button
              style={{ ...s.navBtn, ...(activeModule === item.mod ? s.navBtnActive : {}), justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              onClick={() => selectModule(item.mod)}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ marginLeft: '10px', whiteSpace: 'nowrap' }}>{item.label}</span>}
            </button>

            {sidebarOpen && activeModule === item.mod && item.subs && (
              <div style={{ paddingLeft: '20px', borderLeft: '1px solid var(--border)', marginLeft: '16px', marginTop: '2px', marginBottom: '4px' }}>
                {item.subs.map(sub => (
                  <button
                    key={sub.key}
                    style={{ ...s.subBtn, ...(activeSubModule === sub.key ? s.subBtnActive : {}) }}
                    onClick={() => setActiveSubModule(sub.key)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer del sidebar */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {sidebarOpen ? (
            <>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>CARLOS JONY</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>CROJAS · {session.sucursal}</p>
            </>
          ) : null}
          <button onClick={onLogout} style={s.logoutBtn}>
            <span>🚪</span>
            {sidebarOpen && <span style={{ marginLeft: '8px' }}>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <header style={s.topBar}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Agencia: {session.sucursal.toUpperCase()}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Indicador de Bóveda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: isBovedaOpen ? 'var(--success)' : 'var(--danger)', boxShadow: isBovedaOpen ? '0 0 8px var(--success)' : 'none' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isBovedaOpen ? 'Caja Abierta' : 'Caja Cerrada'}</span>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem', opacity: cajaLoading ? 0.7 : 1 }}
              onClick={toggleBoveda}
              disabled={cajaLoading}
            >
              {cajaLoading ? 'Procesando...' : isBovedaOpen ? 'Cerrar Caja' : 'Abrir Caja'}
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={s.content}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// ===== Styles =====
const s: Record<string, React.CSSProperties> = {
  sidebar: {
    background: '#070a13',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  logo: {
    width: '38px', height: '38px', borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'bold', color: '#fff', fontSize: '0.85rem', flexShrink: 0,
    boxShadow: '0 2px 12px rgba(14,165,233,0.35)',
  },
  navBtn: {
    width: '100%', display: 'flex', alignItems: 'center',
    padding: '11px 12px', background: 'transparent', border: 'none',
    borderRadius: '10px', color: 'var(--text-secondary)',
    fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer',
    transition: 'var(--transition)', marginBottom: '2px',
  },
  navBtnActive: {
    background: 'rgba(14,165,233,0.1)', color: 'var(--primary)', fontWeight: 600,
  },
  subBtn: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '7px 10px', background: 'transparent', border: 'none',
    borderRadius: '8px', color: 'var(--text-muted)',
    fontSize: '0.8rem', cursor: 'pointer', transition: 'var(--transition)',
  },
  subBtnActive: {
    color: 'var(--text-primary)', background: 'rgba(255,255,255,0.04)',
  },
  divider: {
    fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
    padding: '14px 12px 6px', letterSpacing: '0.6px',
  },
  logoutBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
    borderRadius: '10px', color: 'var(--danger)', padding: '9px',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 36px', borderBottom: '1px solid var(--border)',
    background: 'rgba(11,15,25,0.6)', backdropFilter: 'blur(10px)',
    position: 'sticky', top: 0, zIndex: 10,
  },
  content: {
    padding: '36px', overflowY: 'auto', flex: 1,
  },
  homeGrid: {
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
  },
  kpiCard: {
    padding: '22px', textAlign: 'left',
  },
  progressBg: {
    height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '3px',
  },
  bottomRow: {
    display: 'flex', gap: '20px',
  },
  panel: {
    padding: '24px', textAlign: 'left',
  },
  panelTitle: {
    fontSize: '0.95rem', fontWeight: 600,
    color: 'var(--text-primary)', marginBottom: '16px',
  },
  th: {
    fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700,
    textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)',
    paddingRight: '16px',
  },
  td: {
    padding: '11px 16px 11px 0', fontSize: '0.83rem', color: 'var(--text-secondary)',
  },
  lockPanel: {
    maxWidth: '480px', margin: '60px auto', padding: '60px 40px', textAlign: 'center',
  },
  placeholderPanel: {
    maxWidth: '440px', margin: '60px auto', padding: '60px 40px', textAlign: 'center',
  },
};
