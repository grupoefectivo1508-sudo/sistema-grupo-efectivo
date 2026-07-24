import React, { useState } from 'react';
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

const OPERACIONES_DEMO = [
  { id: '1', hora: '10:45 AM', tipo: 'Ingreso',  categoria: 'Cobro Cuota',    monto: 150.00, desc: 'Cuota 3/10 — Garcia Huaman Rosa' },
  { id: '2', hora: '11:15 AM', tipo: 'Egreso',   categoria: 'Desembolso',     monto: 3500.00, desc: 'Préstamo #LM-0104 — Torres Maria' },
  { id: '3', hora: '11:30 AM', tipo: 'Ingreso',  categoria: 'Cobro Cuota',    monto: 220.00, desc: 'Cuota 1/12 — Medina Quispe Pedro' },
  { id: '4', hora: '11:55 AM', tipo: 'Egreso',   categoria: 'Gasto Manual',   monto: 45.00,  desc: 'Útiles de oficina' },
];

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [activeModule, setActiveModule]       = useState<Modulo>('home');
  const [activeSubModule, setActiveSubModule] = useState('');
  const [isBovedaOpen, setIsBovedaOpen]       = useState(true);
  const [sidebarOpen, setSidebarOpen]         = useState(true);

  const selectModule = (mod: Modulo, sub = '') => {
    setActiveModule(mod);
    setActiveSubModule(sub);
  };

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
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setIsBovedaOpen(true)}>
            Abrir Caja Ahora
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
      return <CobroCuotas />;
    }
    if (activeModule === 'credito' && activeSubModule === 'simular') {
      return <SimuladorCredito />;
    }
    if (activeModule === 'credito' && activeSubModule === 'solicitudes') {
      return <RegistrarSolicitud sucursalNombre={session.sucursal} />;
    }
    if (activeModule === 'caja' && activeSubModule === 'desembolsar') {
      return <DesembolsoCredito />;
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
      return (
        <div className="animate-fade" style={s.homeGrid}>
          {/* KPIs */}
          <div style={s.kpiGrid}>
            {[
              { label: 'Tasa de Cobranza', value: '94.2%',        sub: '+1.5% vs ayer',   color: 'var(--success)', pct: 94  },
              { label: 'Desembolsos Hoy',  value: 'S/. 12,500',   sub: '4 créditos',      color: 'var(--primary)', pct: 60  },
              { label: 'Mora General',     value: '5.8%',         sub: 'Bajo control',    color: 'var(--danger)',  pct: 5.8 },
              { label: 'Clientes Activos', value: '138',          sub: 'Esta agencia',    color: 'var(--warning)', pct: 70  },
            ].map(k => (
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Hora', 'Tipo', 'Categoría', 'Descripción', 'Monto'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OPERACIONES_DEMO.map(op => (
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
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              onClick={() => setIsBovedaOpen(o => !o)}
            >
              {isBovedaOpen ? 'Cerrar Caja' : 'Abrir Caja'}
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
