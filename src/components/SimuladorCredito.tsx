import React, { useState } from 'react';

interface CreditSimulator {
  monto: number;
  tasa: number;
  cuotas: number;
  tipoPeriodo: 'diario' | 'semanal' | 'quincenal' | 'mensual';
}

interface Cuota {
  numero: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  total: number;
  saldoRestante: number;
}

const calcularCronograma = (sim: CreditSimulator): Cuota[] => {
  const { monto, tasa, cuotas, tipoPeriodo } = sim;
  // Tasa efectiva según periodo
  const tasaMap = { diario: tasa / 30 / 100, semanal: tasa / 4.33 / 100, quincenal: tasa / 2 / 100, mensual: tasa / 100 };
  const tasaPeriodo = tasaMap[tipoPeriodo];
  const diasMap = { diario: 1, semanal: 7, quincenal: 15, mensual: 30 };
  const diasPeriodo = diasMap[tipoPeriodo];

  // Fórmula de cuota fija (sistema francés)
  const cuotaFija = monto * (tasaPeriodo * Math.pow(1 + tasaPeriodo, cuotas)) / (Math.pow(1 + tasaPeriodo, cuotas) - 1);
  
  let saldo = monto;
  const cronograma: Cuota[] = [];
  const hoy = new Date();

  for (let i = 1; i <= cuotas; i++) {
    const interes = saldo * tasaPeriodo;
    const capital = cuotaFija - interes;
    saldo = Math.max(0, saldo - capital);

    const fechaVenc = new Date(hoy);
    fechaVenc.setDate(hoy.getDate() + i * diasPeriodo);

    cronograma.push({
      numero: i,
      fechaVencimiento: fechaVenc.toLocaleDateString('es-PE'),
      capital: parseFloat(capital.toFixed(2)),
      interes: parseFloat(interes.toFixed(2)),
      total: parseFloat(cuotaFija.toFixed(2)),
      saldoRestante: parseFloat(saldo.toFixed(2)),
    });
  }
  return cronograma;
};

export const SimuladorCredito: React.FC = () => {
  const [monto, setMonto] = useState('');
  const [tasa, setTasa] = useState('3.5');
  const [cuotas, setCuotas] = useState('12');
  const [tipoPeriodo, setTipoPeriodo] = useState<CreditSimulator['tipoPeriodo']>('mensual');
  const [cronograma, setCronograma] = useState<Cuota[]>([]);
  const [simulated, setSimulated] = useState(false);

  const handleSimular = () => {
    if (!monto || parseFloat(monto) <= 0) return;
    const result = calcularCronograma({
      monto: parseFloat(monto),
      tasa: parseFloat(tasa),
      cuotas: parseInt(cuotas),
      tipoPeriodo,
    });
    setCronograma(result);
    setSimulated(true);
  };

  const totalIntereses = cronograma.reduce((acc, c) => acc + c.interes, 0);
  const totalPagar = cronograma.reduce((acc, c) => acc + c.total, 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="glass animate-fade" style={{ padding: '30px', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px', fontSize: '1.25rem', fontWeight: 600 }}>
          Simulador de Plan de Pago
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '28px' }}>
          Calcula automáticamente el cronograma de cuotas usando el sistema francés (cuota fija).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label>Monto del Crédito (S/.)</label>
            <input type="number" placeholder="Ej: 2000" value={monto} onChange={e => setMonto(e.target.value)} min="100" />
          </div>
          <div>
            <label>Tasa de Interés Mensual (%)</label>
            <input type="number" placeholder="Ej: 3.5" value={tasa} onChange={e => setTasa(e.target.value)} step="0.1" min="0.1" />
          </div>
          <div>
            <label>Número de Cuotas</label>
            <input type="number" placeholder="Ej: 12" value={cuotas} onChange={e => setCuotas(e.target.value)} min="1" max="120" />
          </div>
          <div>
            <label>Tipo de Periodo</label>
            <select value={tipoPeriodo} onChange={e => setTipoPeriodo(e.target.value as CreditSimulator['tipoPeriodo'])}>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: '24px', width: '100%' }} onClick={handleSimular}>
          Calcular Cronograma de Pago
        </button>
      </div>

      {simulated && cronograma.length > 0 && (
        <div className="animate-fade">
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Monto del Crédito', value: `S/. ${parseFloat(monto).toFixed(2)}`, color: 'var(--primary)' },
              { label: 'Total Intereses', value: `S/. ${totalIntereses.toFixed(2)}`, color: 'var(--warning)' },
              { label: 'Total a Pagar', value: `S/. ${totalPagar.toFixed(2)}`, color: 'var(--success)' },
            ].map(item => (
              <div key={item.label} className="glass" style={{ padding: '20px', textAlign: 'left' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{item.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Tabla de Cronograma */}
          <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>
              Cronograma Detallado ({cuotas} cuotas {tipoPeriodo}s)
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['N°', 'Fecha Venc.', 'Capital', 'Interés', 'Cuota Total', 'Saldo Restante'].map(h => (
                    <th key={h} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left', paddingBottom: '12px', borderBottom: '1px solid var(--border)', paddingRight: '16px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cronograma.map(c => (
                  <tr key={c.numero} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 16px 10px 0', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{c.numero}</td>
                    <td style={{ padding: '10px 16px 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.fechaVencimiento}</td>
                    <td style={{ padding: '10px 16px 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>S/. {c.capital.toFixed(2)}</td>
                    <td style={{ padding: '10px 16px 10px 0', fontSize: '0.85rem', color: 'var(--warning)' }}>S/. {c.interes.toFixed(2)}</td>
                    <td style={{ padding: '10px 16px 10px 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>S/. {c.total.toFixed(2)}</td>
                    <td style={{ padding: '10px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>S/. {c.saldoRestante.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
