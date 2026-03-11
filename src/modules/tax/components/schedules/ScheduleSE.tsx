import { Component } from 'solid-js';

interface ScheduleSEProps {
  netSelfEmploymentIncome: number;
  w2SocialSecurityWages: number;
}

const ScheduleSE: Component<ScheduleSEProps> = (props) => {
  // Part I - Self-Employment Tax Calculations

  // Line 2: Net profit from Schedule C
  const line2 = props.netSelfEmploymentIncome;

  // Line 3: Combine lines (only line 2 for most people)
  const line3 = line2;

  // Line 4a: Multiply line 3 by 92.35% (0.9235)
  const line4a = Math.round(line3 * 0.9235);

  // Line 4b: Optional methods (not used)
  const line4b = 0;

  // Line 4c: Combine lines 4a and 4b
  const line4c = line4a + line4b;

  // Line 5a: Church employee income (not applicable)
  const line5a = 0;

  // Line 5b: Multiply line 5a by 92.35%
  const line5b = 0;

  // Line 6: Add lines 4c and 5b
  const line6 = line4c + line5b;

  // Line 7: Maximum amount subject to social security tax
  const line7 = 168600; // 2024 limit

  // Line 8a: Total social security wages from W-2
  const line8a = props.w2SocialSecurityWages;

  // Line 8b: Unreported tips (not applicable)
  const line8b = 0;

  // Line 8c: Wages from Form 8919 (not applicable)
  const line8c = 0;

  // Line 8d: Add lines 8a, 8b, and 8c
  const line8d = line8a + line8b + line8c;

  // Line 9: Subtract line 8d from line 7
  const line9 = Math.max(0, line7 - line8d);

  // Line 10: Multiply the smaller of line 6 or line 9 by 12.4% (0.124)
  const line10 = Math.round(Math.min(line6, line9) * 0.124);

  // Line 11: Multiply line 6 by 2.9% (0.029) - Medicare tax
  const line11 = Math.round(line6 * 0.029);

  // Line 12: Self-employment tax (add lines 10 and 11)
  const line12 = line10 + line11;

  // Line 13: Deduction for one-half of self-employment tax
  const line13 = Math.round(line12 * 0.50);

  const lineStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const labelStyle = {
    flex: '1',
    'font-weight': '500'
  };

  const valueStyle = {
    'font-weight': '600',
    color: 'var(--primary-color)',
    'min-width': '120px',
    'text-align': 'right'
  };

  const formulaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'font-style': 'italic',
    'margin-left': '1rem'
  };

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      'border-radius': 'var(--border-radius-sm)',
      'margin-bottom': '1.5rem',
      border: '2px solid #8b5cf6'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#7c3aed',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        💼 SCHEDULE SE - Self-Employment Tax (Impuesto de Trabajo por Cuenta Propia)
      </h3>

      <div style={{
        background: '#faf5ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #8b5cf6'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>¿Qué es el Impuesto de Trabajo por Cuenta Propia?</div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>• Cuando trabajas por cuenta propia, debes pagar tanto la parte del empleador como del empleado del Seguro Social y Medicare.</div>
          <div>• Tasa total: 15.3% (12.4% Seguro Social + 2.9% Medicare)</div>
          <div>• Se calcula sobre el 92.35% de tu ganancia neta del negocio</div>
          <div>• Puedes deducir la mitad del impuesto de trabajo por cuenta propia como ajuste al ingreso</div>
        </div>
      </div>

      {/* Part I - Self-Employment Tax */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#7c3aed', 'margin-bottom': '1rem' }}>Parte I - Impuesto de Trabajo por Cuenta Propia</h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 2:</strong> Ganancia Neta del Negocio
            <span style={formulaStyle}>
              De Schedule C, línea 31
            </span>
          </div>
          <div style={valueStyle}>${line2.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 3:</strong> Combine líneas 1a, 1b y 2
            <span style={formulaStyle}>
              Solo línea 2 para la mayoría de personas
            </span>
          </div>
          <div style={valueStyle}>${line3.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 4a:</strong> Multiplique línea 3 por 92.35% (0.9235)
            <span style={formulaStyle}>
              ${line3.toLocaleString()} × 0.9235 = ${line4a.toLocaleString()}
            </span>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Este porcentaje representa la porción de ingreso sujeta a impuesto (excluye la mitad del SE tax que pagarás)
            </div>
          </div>
          <div style={valueStyle}>${line4a.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 4b:</strong> Métodos Opcionales
            <span style={formulaStyle}>
              No utilizado
            </span>
          </div>
          <div style={valueStyle}>${line4b.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 4c:</strong> Combine líneas 4a y 4b
            <span style={formulaStyle}>
              ${line4a.toLocaleString()} + ${line4b.toLocaleString()}
            </span>
          </div>
          <div style={valueStyle}>${line4c.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 5a:</strong> Ingreso de Empleado de Iglesia
            <span style={formulaStyle}>
              No aplica
            </span>
          </div>
          <div style={valueStyle}>${line5a.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 5b:</strong> Multiplique línea 5a por 92.35%
          </div>
          <div style={valueStyle}>${line5b.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#faf5ff',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none'
        }}>
          <div style={labelStyle}>
            <strong>Línea 6:</strong> Sume líneas 4c y 5b
            <span style={formulaStyle}>
              ${line4c.toLocaleString()} + ${line5b.toLocaleString()}
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Esta es la base para calcular el impuesto de trabajo por cuenta propia
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#7c3aed' }}>${line6.toLocaleString()}</div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 7:</strong> Monto Máximo Sujeto a Impuesto de Seguro Social
            <span style={formulaStyle}>
              Límite del IRS para 2024
            </span>
          </div>
          <div style={valueStyle}>${line7.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8a:</strong> Salarios del Seguro Social de Form W-2
            <span style={formulaStyle}>
              Total de cajas 3 y 7 en Form(s) W-2
            </span>
          </div>
          <div style={valueStyle}>${line8a.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8b:</strong> Propinas No Reportadas
          </div>
          <div style={valueStyle}>${line8b.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8c:</strong> Salarios de Form 8919
          </div>
          <div style={valueStyle}>${line8c.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8d:</strong> Sume líneas 8a, 8b y 8c
            <span style={formulaStyle}>
              ${line8a.toLocaleString()} + $0 + $0
            </span>
          </div>
          <div style={valueStyle}>${line8d.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 9:</strong> Reste línea 8d de línea 7
            <span style={formulaStyle}>
              ${line7.toLocaleString()} - ${line8d.toLocaleString()} = ${line9.toLocaleString()}
            </span>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Esta es la cantidad restante sujeta al impuesto del Seguro Social del 12.4%
            </div>
          </div>
          <div style={valueStyle}>${line9.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#fef3c7',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none',
          'margin-top': '1rem'
        }}>
          <div style={labelStyle}>
            <strong>Línea 10:</strong> Impuesto del Seguro Social
            <span style={formulaStyle}>
              Menor de (línea 6: ${line6.toLocaleString()} o línea 9: ${line9.toLocaleString()}) × 12.4%
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Cálculo: ${Math.min(line6, line9).toLocaleString()} × 0.124 = ${line10.toLocaleString()}
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line10.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#fef3c7',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none',
          'margin-top': '0.5rem'
        }}>
          <div style={labelStyle}>
            <strong>Línea 11:</strong> Impuesto de Medicare
            <span style={formulaStyle}>
              Línea 6 × 2.9%
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Cálculo: ${line6.toLocaleString()} × 0.029 = ${line11.toLocaleString()}
            </div>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              No hay límite máximo para el impuesto de Medicare (se aplica a todos los ingresos)
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line11.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#7c3aed',
          color: 'white',
          padding: '1rem',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1.1rem',
          'border-bottom': 'none',
          'margin-top': '1rem'
        }}>
          <div style={{ flex: '1' }}>
            <strong>Línea 12:</strong> Impuesto de Trabajo por Cuenta Propia (Self-Employment Tax)
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Sume líneas 10 y 11 = ${line10.toLocaleString()} + ${line11.toLocaleString()}
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Schedule 2 (Form 1040), línea 4
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Form 1040, línea 23 (Total Tax)
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${line12.toLocaleString()}
          </div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#10b981',
          color: 'white',
          padding: '1rem',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1.1rem',
          'border-bottom': 'none',
          'margin-top': '1rem'
        }}>
          <div style={{ flex: '1' }}>
            <strong>Línea 13:</strong> Deducción por la Mitad del Impuesto de Trabajo por Cuenta Propia
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Multiplique línea 12 por 50% (0.50) = ${line12.toLocaleString()} × 0.50
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Schedule 1 (Form 1040), línea 15
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Esta deducción reduce su Ingreso Bruto Ajustado (AGI)
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${line13.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        background: '#faf5ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #8b5cf6'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#7c3aed' }}>
          📋 Resumen del Schedule SE
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Ganancia Neta del Negocio:</span>
            <strong>${line2.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Base Imponible (92.35%):</span>
            <strong>${line6.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Impuesto del Seguro Social (12.4%):</span>
            <strong>${line10.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Impuesto de Medicare (2.9%):</span>
            <strong>${line11.toLocaleString()}</strong>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'border-top': '2px solid #8b5cf6',
            'margin-top': '0.5rem',
            'font-weight': '700',
            color: '#7c3aed'
          }}>
            <span>Total Impuesto de Trabajo por Cuenta Propia:</span>
            <span>${line12.toLocaleString()}</span>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'font-weight': '700',
            color: '#10b981'
          }}>
            <span>Deducción (50% del SE Tax):</span>
            <span>${line13.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      <div style={{
        background: '#eff6ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1rem',
        border: '1px solid #3b82f6'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#3b82f6' }}>
          💡 ¿Por Qué Pago Este Impuesto?
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            Como trabajador por cuenta propia (self-employed), usted es tanto el empleador como el empleado. Por lo tanto, debe pagar:
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • <strong>Parte del Empleador:</strong> 7.65% (6.2% Seguro Social + 1.45% Medicare)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • <strong>Parte del Empleado:</strong> 7.65% (6.2% Seguro Social + 1.45% Medicare)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • <strong>Total:</strong> 15.3%
          </div>
          <div style={{ 'margin-top': '0.5rem' }}>
            <strong>Buenas noticias:</strong> Puede deducir la mitad (${line13.toLocaleString()}) como ajuste al ingreso, lo que reduce su ingreso bruto ajustado y, por lo tanto, sus impuestos sobre la renta.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleSE;
