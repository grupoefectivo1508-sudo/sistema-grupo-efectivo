import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (user: { email: string; sucursal: string; rol: string }) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [sucursal, setSucursal] = useState('La Merced');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Bypass de demostración si el email termina en @grupoefectivo.com o si las credenciales de prueba son ingresadas
    const isDemoAccount = email.toUpperCase() === 'CROJAS' || email === 'demo@grupoefectivo.com';
    const isDemoPassword = password === '76797846' || password === 'demo123';

    if (isDemoAccount && isDemoPassword) {
      setTimeout(() => {
        onLoginSuccess({
          email: 'crojas@grupoefectivo.com',
          sucursal,
          rol: 'administrador',
        });
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      // Intento de inicio de sesión real mediante Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.includes('@') ? email : `${email.toLowerCase()}@grupoefectivo.com`,
        password: password,
      });

      if (authError) {
        throw new Error(
          authError.message === 'Invalid login credentials'
            ? 'Credenciales de acceso incorrectas. Prueba usando CROJAS y contraseña.'
            : authError.message
        );
      }

      if (data?.user) {
        onLoginSuccess({
          email: data.user.email || '',
          sucursal,
          rol: 'administrador', // Por defecto, o cargado desde la tabla de perfiles en producción
        });
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass animate-fade" style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoCircle}>
            <span style={styles.logoText}>GE</span>
          </div>
          <h2 style={styles.title}>Grupo Efectivo</h2>
          <p style={styles.subtitle}>Plataforma de Control Crediticio</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="sucursal">Seleccionar Sucursal</label>
            <select
              id="sucursal"
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
            >
              <option value="La Merced">LA MERCED (001-LM)</option>
              <option value="Pichanaki">PICHANAKI (002-PK)</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="usuario">Usuario / Correo</label>
            <input
              id="usuario"
              type="text"
              placeholder="Ej: CROJAS"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={styles.btnSubmit} disabled={loading}>
            {loading ? 'Iniciando Sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Demo: Usa <strong>CROJAS</strong> / <strong>76797846</strong> para ingresar.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  card: {
    width: '420px',
    maxWidth: '100%',
    padding: '40px',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
  },
  logoCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 4px 20px rgba(14, 165, 233, 0.4)',
  },
  logoText: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  btnSubmit: {
    width: '100%',
    marginTop: '10px',
  },
  errorAlert: {
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: 'var(--danger)',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '20px',
    textAlign: 'left',
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center',
  },
};
