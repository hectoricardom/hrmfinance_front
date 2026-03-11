import { Component } from 'solid-js';
import { FilingStatus } from '../../types/taxTypes';

interface Form8880Props {
  adjustedGrossIncome: number;
  filingStatus: FilingStatus;
  retirementContributions: number;
  spouseRetirementContributions?: number;
  age: number;
  spouseAge?: number;
  isFullTimeStudent: boolean;
  spouseIsFullTimeStudent?: boolean;
}

const Form8880: Component<Form8880Props> = (props) => {
  // Check eligibility
  const isEligible = () => {
    // Must be 18 or older
    if (props.age < 18) return false;
    if (props.filingStatus === 'married_joint' && props.spouseAge && props.spouseAge < 18) return false;

    // Cannot be full-time student
    if (props.isFullTimeStudent) return false;
    if (props.filingStatus === 'married_joint' && props.spouseIsFullTimeStudent) return false;

    // AGI limits for 2024
    const agiLimits = {
      married_joint: 76500,
      head_of_household: 57375,
      single: 38250,
      married_separate: 38250
    };

    return props.adjustedGrossIncome <= agiLimits[props.filingStatus];
  };

  // Determine credit rate based on AGI
  const getCreditRate = (): number => {
    if (!isEligible()) return 0;

    const agi = props.adjustedGrossIncome;

    // 2024 AGI ranges for credit rates
    if (props.filingStatus === 'married_joint') {
      if (agi <= 46000) return 0.50;
      if (agi <= 50000) return 0.20;
      if (agi <= 76500) return 0.10;
    } else if (props.filingStatus === 'head_of_household') {
      if (agi <= 34500) return 0.50;
      if (agi <= 37500) return 0.20;
      if (agi <= 57375) return 0.10;
    } else {
      if (agi <= 23000) return 0.50;
      if (agi <= 25000) return 0.20;
      if (agi <= 38250) return 0.10;
    }

    return 0;
  };

  // Line 1: Traditional and Roth IRA contributions
  const line1 = Math.min(props.retirementContributions, 2000);

  // Line 2: Certain distributions (not implemented - would reduce contributions)
  const line2 = 0;

  // Line 3: Subtract line 2 from line 1
  const line3 = Math.max(0, line1 - line2);

  // Line 4: Spouse's contributions (if MFJ)
  const line4 = props.filingStatus === 'married_joint' && props.spouseRetirementContributions
    ? Math.min(props.spouseRetirementContributions, 2000)
    : 0;

  // Line 5: Spouse's certain distributions
  const line5 = 0;

  // Line 6: Subtract line 5 from line 4
  const line6 = Math.max(0, line4 - line5);

  // Line 7: Add lines 3 and 6
  const line7 = line3 + line6;

  // Line 8: Enter applicable decimal amount (credit rate)
  const line8 = getCreditRate();

  // Line 9: Multiply line 7 by line 8 (Tentative credit)
  const line9 = Math.round(line7 * line8);

  // Line 10: Tax liability limit (not fully implemented)
  const line10 = 9999999; // Placeholder - would be actual tax liability

  // Line 11: Credit (smaller of line 9 or line 10)
  const line11 = Math.min(line9, line10);

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

  const creditRate = getCreditRate();
  const eligible = isEligible();

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      'border-radius': 'var(--border-radius-sm)',
      'margin-bottom': '1.5rem',
      border: '2px solid #06b6d4'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#0891b2',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        💰 FORM 8880 - Credit for Qualified Retirement Savings Contributions (Saver's Credit)
      </h3>

      <div style={{
        background: '#ecfeff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #06b6d4'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          ¿Qué es el Crédito del Ahorrador (Saver's Credit)?
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>• Crédito para trabajadores de ingresos bajos a moderados que ahorran para la jubilación</div>
          <div>• Puede recibir hasta 50%, 20%, o 10% de sus contribuciones (hasta $2,000 por persona)</div>
          <div>• Disponible para contribuciones a 401(k), IRA tradicional, IRA Roth, y otros planes de jubilación</div>
          <div>• Crédito NO REEMBOLSABLE (solo reduce impuestos, no genera reembolso)</div>
          <div>• Debe tener 18 años o más, no ser estudiante de tiempo completo, y cumplir límites de AGI</div>
        </div>
      </div>

      {/* Eligibility Check */}
      <div style={{
        background: eligible ? '#ecfdf5' : '#fef2f2',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: `1px solid ${eligible ? '#10b981' : '#ef4444'}`
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: eligible ? '#059669' : '#dc2626' }}>
          {eligible ? '✓ Elegible para el Crédito del Ahorrador' : '✗ No Elegible para el Crédito del Ahorrador'}
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>• Edad: {props.age} años {props.age >= 18 ? '✓' : '✗ (debe tener 18+)'}</div>
          <div>• Estudiante de tiempo completo: {props.isFullTimeStudent ? '✗ (no elegible)' : '✓'}</div>
          <div>• AGI: ${props.adjustedGrossIncome.toLocaleString()}</div>
          <div>• Límite de AGI para {props.filingStatus}: ${
            props.filingStatus === 'married_joint' ? '76,500' :
            props.filingStatus === 'head_of_household' ? '57,375' : '38,250'
          }</div>
          {eligible && (
            <div style={{ 'margin-top': '0.5rem', 'font-weight': '600', color: '#059669' }}>
              Tasa de Crédito: {(creditRate * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>

      {/* Part I - Retirement Contributions */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#0891b2', 'margin-bottom': '1rem' }}>
          Parte I - Contribuciones a Planes de Jubilación
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 1:</strong> Sus Contribuciones IRA Tradicional y Roth
            <span style={formulaStyle}>
              Máximo $2,000
            </span>
          </div>
          <div style={valueStyle}>${line1.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 2:</strong> Ciertas Distribuciones
            <span style={formulaStyle}>
              Distribuciones que reducen contribuciones elegibles
            </span>
          </div>
          <div style={valueStyle}>${line2.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#ecfeff',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none'
        }}>
          <div style={labelStyle}>
            <strong>Línea 3:</strong> Contribuciones Netas Ajustadas
            <span style={formulaStyle}>
              Línea 1 - Línea 2 = ${line1.toLocaleString()} - ${line2.toLocaleString()}
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#0891b2' }}>${line3.toLocaleString()}</div>
        </div>

        {props.filingStatus === 'married_joint' && (
          <>
            <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
              <div style={labelStyle}>
                <strong>Línea 4:</strong> Contribuciones de su Cónyuge
                <span style={formulaStyle}>
                  Máximo $2,000
                </span>
              </div>
              <div style={valueStyle}>${line4.toLocaleString()}</div>
            </div>

            <div style={lineStyle}>
              <div style={labelStyle}>
                <strong>Línea 5:</strong> Distribuciones del Cónyuge
              </div>
              <div style={valueStyle}>${line5.toLocaleString()}</div>
            </div>

            <div style={{
              ...lineStyle,
              background: '#ecfeff',
              padding: '0.75rem',
              'border-radius': '0.5rem',
              'font-weight': '600',
              'border-bottom': 'none'
            }}>
              <div style={labelStyle}>
                <strong>Línea 6:</strong> Contribuciones Netas del Cónyuge
                <span style={formulaStyle}>
                  Línea 4 - Línea 5
                </span>
              </div>
              <div style={{ ...valueStyle, color: '#0891b2' }}>${line6.toLocaleString()}</div>
            </div>
          </>
        )}

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
            <strong>Línea 7:</strong> Total de Contribuciones Ajustadas
            <span style={formulaStyle}>
              Línea 3 + Línea 6 = ${line3.toLocaleString()} + ${line6.toLocaleString()}
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line7.toLocaleString()}</div>
        </div>
      </div>

      {/* Part II - Credit Calculation */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#0891b2', 'margin-bottom': '1rem' }}>
          Parte II - Cálculo del Crédito
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8:</strong> Tasa de Crédito Aplicable
            <span style={formulaStyle}>
              Basado en AGI: {eligible ? `${(creditRate * 100).toFixed(0)}%` : 'No elegible'}
            </span>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              AGI ${props.adjustedGrossIncome.toLocaleString()} determina la tasa
            </div>
          </div>
          <div style={valueStyle}>{creditRate.toFixed(2)}</div>
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
            <strong>Línea 9:</strong> Crédito Tentativo
            <span style={formulaStyle}>
              Línea 7 × Línea 8 = ${line7.toLocaleString()} × {creditRate.toFixed(2)}
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Este es el crédito basado en sus contribuciones
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line9.toLocaleString()}</div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 10:</strong> Límite de Obligación Tributaria
            <span style={formulaStyle}>
              El crédito no puede exceder su obligación tributaria
            </span>
          </div>
          <div style={valueStyle}>Sin límite en este cálculo</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#0891b2',
          color: 'white',
          padding: '1rem',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1.1rem',
          'border-bottom': 'none',
          'margin-top': '1rem'
        }}>
          <div style={{ flex: '1' }}>
            <strong>Línea 11:</strong> Crédito del Ahorrador (Saver's Credit)
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Menor de línea 9 (${line9.toLocaleString()}) o línea 10
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese en Schedule 3 (Form 1040), línea 4
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Este crédito reduce su obligación tributaria federal
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${line11.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Credit Rate Table */}
      <div style={{
        background: '#ecfeff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #06b6d4'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#0891b2' }}>
          📊 Tabla de Tasas de Crédito 2024
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ 'margin-bottom': '0.5rem', 'font-weight': '600' }}>
            Tasa del 50%:
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Casados Presentando Juntos: AGI hasta $46,000
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Jefe de Familia: AGI hasta $34,500
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '1rem' }}>
            • Soltero/Casado Presentando por Separado: AGI hasta $23,000
          </div>

          <div style={{ 'margin-bottom': '0.5rem', 'font-weight': '600' }}>
            Tasa del 20%:
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Casados Presentando Juntos: AGI $46,001 - $50,000
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Jefe de Familia: AGI $34,501 - $37,500
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '1rem' }}>
            • Soltero/Casado Presentando por Separado: AGI $23,001 - $25,000
          </div>

          <div style={{ 'margin-bottom': '0.5rem', 'font-weight': '600' }}>
            Tasa del 10%:
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Casados Presentando Juntos: AGI $50,001 - $76,500
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Jefe de Familia: AGI $37,501 - $57,375
          </div>
          <div style={{ 'margin-left': '1rem' }}>
            • Soltero/Casado Presentando por Separado: AGI $25,001 - $38,250
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        background: '#ecfeff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1rem',
        border: '1px solid #06b6d4'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#0891b2' }}>
          📋 Resumen del Form 8880
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Contribuciones Totales:</span>
            <strong>${line7.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Tasa de Crédito:</span>
            <strong>{(creditRate * 100).toFixed(0)}%</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Estado de Elegibilidad:</span>
            <strong style={{ color: eligible ? '#059669' : '#dc2626' }}>
              {eligible ? 'Elegible' : 'No Elegible'}
            </strong>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'border-top': '2px solid #06b6d4',
            'margin-top': '0.5rem',
            'font-weight': '700',
            color: '#0891b2'
          }}>
            <span>Crédito del Ahorrador:</span>
            <span>${line11.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      {!eligible && (
        <div style={{
          background: '#fef2f2',
          padding: '1rem',
          'border-radius': '0.5rem',
          'margin-top': '1rem',
          border: '1px solid #ef4444'
        }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#dc2626' }}>
            ⚠️ Razones por las que no es elegible:
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {props.age < 18 && <div>• Debe tener al menos 18 años de edad</div>}
            {props.isFullTimeStudent && <div>• No puede ser estudiante de tiempo completo</div>}
            {props.adjustedGrossIncome > (props.filingStatus === 'married_joint' ? 76500 : props.filingStatus === 'head_of_household' ? 57375 : 38250) && (
              <div>• Su AGI excede el límite para su estado civil</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Form8880;
