import { Component } from 'solid-js';
import { FilingStatus } from '../../types/taxTypes';

interface Schedule8812Props {
  adjustedGrossIncome: number;
  filingStatus: FilingStatus;
  dependents: number;
  earnedIncome: number;
  federalTaxLiability: number;
  totalWithheld: number;
  earnedIncomeCredit: number;
}

const Schedule8812: Component<Schedule8812Props> = (props) => {
  // Part I - Child Tax Credit and Credit for Other Dependents

  // Line 1: AGI from Form 1040
  const line1 = props.adjustedGrossIncome;

  // Lines 2a-2d: Special income additions (not applicable for most)
  const line2a = 0; // Puerto Rico income
  const line2b = 0; // Foreign earned income
  const line2c = 0; // Form 4563
  const line2d = line2a + line2b + line2c;

  // Line 3: Add lines 1 and 2d
  const line3 = line1 + line2d;

  // Line 4: Number of qualifying children under 17
  const line4 = props.dependents;

  // Line 5: Multiply line 4 by $2,000
  const line5 = line4 * 2000;

  // Line 6: Number of other dependents
  const line6 = 0; // No other dependents in this case

  // Line 7: Multiply line 6 by $500
  const line7 = line6 * 500;

  // Line 8: Add lines 5 and 7
  const line8 = line5 + line7;

  // Line 9: Threshold based on filing status
  const line9 = props.filingStatus === 'married_joint' ? 400000 : 200000;

  // Line 10: Subtract line 9 from line 3
  let line10 = line3 - line9;
  if (line10 < 0) line10 = 0;
  // Round up to next $1,000
  if (line10 > 0 && line10 % 1000 !== 0) {
    line10 = Math.ceil(line10 / 1000) * 1000;
  }

  // Line 11: Multiply line 10 by 5%
  const line11 = Math.round(line10 * 0.05);

  // Line 12: Is line 8 more than line 11?
  const line12 = line8 - line11;

  // Line 13: Credit limit (federal tax liability)
  const line13 = props.federalTaxLiability;

  // Line 14: Smaller of line 12 or line 13 (non-refundable CTC)
  const line14 = Math.min(line12, line13);

  // Part II-A - Additional Child Tax Credit for All Filers

  // Line 16a: Subtract line 14 from line 12
  const line16a = line12 - line14;

  // Line 16b: Number of qualifying children × $1,700
  const line16b = line4 * 1700;

  // Line 17: Smaller of line 16a or line 16b
  const line17 = Math.min(line16a, line16b);

  // Line 18a: Earned income
  const line18a = props.earnedIncome;

  // Line 18b: Nontaxable combat pay
  const line18b = 0;

  // Line 19: Is line 18a more than $2,500?
  const line19 = Math.max(0, line18a - 2500);

  // Line 20: Multiply line 19 by 15%
  const line20 = Math.round(line19 * 0.15);

  // Part II-B - Certain Filers Who Have Three or More Qualifying Children

  // Line 21: Withheld social security, Medicare, and Additional Medicare taxes
  const line21 = props.totalWithheld;

  // Line 22: Schedule 1, line 15 + Schedule 2, lines 5, 6, 13
  const line22 = 0; // Not applicable

  // Line 23: Add lines 21 and 22
  const line23 = line21 + line22;

  // Line 24: EIC from Form 1040, line 27
  const line24 = props.earnedIncomeCredit;

  // Line 25: Subtract line 24 from line 23
  const line25 = Math.max(0, line23 - line24);

  // Line 26: Larger of line 20 or line 25
  const line26 = Math.max(line20, line25);

  // Line 27: Smaller of line 17 or line 26 (Additional CTC)
  const line27 = Math.min(line17, line26);

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
      border: '2px solid #ec4899'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#db2777',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        👨‍👩‍👧‍👦 SCHEDULE 8812 - Credits for Qualifying Children and Other Dependents
      </h3>

      <div style={{
        background: '#fdf2f8',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #ec4899'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>¿Qué es el Crédito Tributario por Hijos?</div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>• <strong>Child Tax Credit (CTC):</strong> Hasta $2,000 por cada hijo calificado menor de 17 años</div>
          <div>• <strong>Non-refundable:</strong> Limitado a su obligación tributaria federal (reduce impuestos pero no genera reembolso)</div>
          <div>• <strong>Additional Child Tax Credit (ACTC):</strong> Hasta $1,700 por hijo (porción reembolsable)</div>
          <div>• <strong>Refundable:</strong> Puede recibir este crédito como reembolso, incluso si no debe impuestos</div>
        </div>
      </div>

      {/* Part I - Child Tax Credit */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#db2777', 'margin-bottom': '1rem' }}>
          Parte I - Crédito Tributario por Hijos y Crédito por Otros Dependientes
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 1:</strong> Ingreso Bruto Ajustado (AGI)
            <span style={formulaStyle}>
              De Form 1040, línea 11
            </span>
          </div>
          <div style={valueStyle}>${line1.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Líneas 2a-2d:</strong> Ingresos Especiales
            <span style={formulaStyle}>
              Puerto Rico, extranjero, etc. (no aplica)
            </span>
          </div>
          <div style={valueStyle}>${line2d.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 3:</strong> Sume líneas 1 y 2d
            <span style={formulaStyle}>
              ${line1.toLocaleString()} + $0
            </span>
          </div>
          <div style={valueStyle}>${line3.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 4:</strong> Número de Hijos Calificados Menores de 17
            <span style={formulaStyle}>
              Con número de Seguro Social válido
            </span>
          </div>
          <div style={valueStyle}>{line4}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 5:</strong> Multiplique línea 4 por $2,000
            <span style={formulaStyle}>
              {line4} × $2,000
            </span>
          </div>
          <div style={valueStyle}>${line5.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 6:</strong> Número de Otros Dependientes
          </div>
          <div style={valueStyle}>{line6}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 7:</strong> Multiplique línea 6 por $500
          </div>
          <div style={valueStyle}>${line7.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#fdf2f8',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none'
        }}>
          <div style={labelStyle}>
            <strong>Línea 8:</strong> Crédito Total Potencial
            <span style={formulaStyle}>
              Sume líneas 5 y 7 = ${line5.toLocaleString()} + ${line7.toLocaleString()}
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#db2777' }}>${line8.toLocaleString()}</div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 9:</strong> Umbral de Ingresos
            <span style={formulaStyle}>
              ${props.filingStatus === 'married_joint' ? '$400,000' : '$200,000'} para {props.filingStatus === 'married_joint' ? 'Casados Presentando Juntos' : 'Otros Estados Civiles'}
            </span>
          </div>
          <div style={valueStyle}>${line9.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 10:</strong> Reste línea 9 de línea 3
            <span style={formulaStyle}>
              Redondeado al próximo múltiplo de $1,000
            </span>
          </div>
          <div style={valueStyle}>${line10.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 11:</strong> Multiplique línea 10 por 5%
            <span style={formulaStyle}>
              Reducción del crédito por ingresos altos
            </span>
          </div>
          <div style={valueStyle}>${line11.toLocaleString()}</div>
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
            <strong>Línea 12:</strong> Reste línea 11 de línea 8
            <span style={formulaStyle}>
              ${line8.toLocaleString()} - ${line11.toLocaleString()}
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Crédito después de la reducción por ingresos altos
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line12.toLocaleString()}</div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 13:</strong> Límite del Crédito
            <span style={formulaStyle}>
              Obligación tributaria federal (Form 1040, línea 16)
            </span>
          </div>
          <div style={valueStyle}>${line13.toLocaleString()}</div>
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
            <strong>Línea 14:</strong> Child Tax Credit (No Reembolsable)
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Menor de línea 12 (${line12.toLocaleString()}) o línea 13 (${line13.toLocaleString()})
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Form 1040, línea 19
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Este crédito reduce su obligación tributaria federal
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${line14.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Part II-A - Additional Child Tax Credit */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#db2777', 'margin-bottom': '1rem' }}>
          Parte II-A - Crédito Tributario Adicional por Hijos (Refundable)
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 16a:</strong> Reste línea 14 de línea 12
            <span style={formulaStyle}>
              ${line12.toLocaleString()} - ${line14.toLocaleString()} = Crédito No Utilizado
            </span>
          </div>
          <div style={valueStyle}>${line16a.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 16b:</strong> Número de hijos × $1,700
            <span style={formulaStyle}>
              {line4} × $1,700 (máximo ACTC por hijo)
            </span>
          </div>
          <div style={valueStyle}>${line16b.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 17:</strong> Menor de línea 16a o línea 16b
            <span style={formulaStyle}>
              Límite del Additional CTC
            </span>
          </div>
          <div style={valueStyle}>${line17.toLocaleString()}</div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 18a:</strong> Ingreso Ganado (Earned Income)
            <span style={formulaStyle}>
              Salarios W-2 + Ganancia Neta del Negocio
            </span>
          </div>
          <div style={valueStyle}>${line18a.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 18b:</strong> Pago de Combate No Tributable
          </div>
          <div style={valueStyle}>${line18b.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 19:</strong> ¿Es línea 18a más de $2,500?
            <span style={formulaStyle}>
              ${line18a.toLocaleString()} - $2,500 = ${line19.toLocaleString()}
            </span>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              El ACTC se basa en ingresos ganados sobre $2,500
            </div>
          </div>
          <div style={valueStyle}>${line19.toLocaleString()}</div>
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
            <strong>Línea 20:</strong> Multiplique línea 19 por 15%
            <span style={formulaStyle}>
              ${line19.toLocaleString()} × 0.15 = ${line20.toLocaleString()}
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              ACTC basado en 15% del ingreso ganado sobre $2,500
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line20.toLocaleString()}</div>
        </div>
      </div>

      {/* Part II-B - Three or More Children */}
      {line4 >= 3 && (
        <div style={sectionStyle}>
          <h4 style={{ color: '#db2777', 'margin-bottom': '1rem' }}>
            Parte II-B - Declarantes con Tres o Más Hijos Calificados
          </h4>

          <div style={lineStyle}>
            <div style={labelStyle}>
              <strong>Línea 21:</strong> Impuestos Retenidos del Seguro Social y Medicare
              <span style={formulaStyle}>
                De Form(s) W-2, cajas 4 y 6
              </span>
            </div>
            <div style={valueStyle}>${line21.toLocaleString()}</div>
          </div>

          <div style={lineStyle}>
            <div style={labelStyle}>
              <strong>Línea 22:</strong> Otros Impuestos
              <span style={formulaStyle}>
                Schedules 1, 2 (no aplica)
              </span>
            </div>
            <div style={valueStyle}>${line22.toLocaleString()}</div>
          </div>

          <div style={lineStyle}>
            <div style={labelStyle}>
              <strong>Línea 23:</strong> Sume líneas 21 y 22
            </div>
            <div style={valueStyle}>${line23.toLocaleString()}</div>
          </div>

          <div style={lineStyle}>
            <div style={labelStyle}>
              <strong>Línea 24:</strong> Crédito por Ingreso Ganado (EIC)
              <span style={formulaStyle}>
                De Form 1040, línea 27
              </span>
            </div>
            <div style={valueStyle}>${line24.toLocaleString()}</div>
          </div>

          <div style={lineStyle}>
            <div style={labelStyle}>
              <strong>Línea 25:</strong> Reste línea 24 de línea 23
              <span style={formulaStyle}>
                ${line23.toLocaleString()} - ${line24.toLocaleString()}
              </span>
            </div>
            <div style={valueStyle}>${line25.toLocaleString()}</div>
          </div>

          <div style={lineStyle}>
            <div style={labelStyle}>
              <strong>Línea 26:</strong> Mayor de línea 20 o línea 25
              <span style={formulaStyle}>
                Máximo entre método regular (${line20.toLocaleString()}) y método de 3+ hijos (${line25.toLocaleString()})
              </span>
            </div>
            <div style={valueStyle}>${line26.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Part II-C - Final Additional CTC */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#db2777', 'margin-bottom': '1rem' }}>
          Parte II-C - Crédito Tributario Adicional por Hijos Final
        </h4>

        <div style={{
          ...lineStyle,
          background: '#059669',
          color: 'white',
          padding: '1rem',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1.1rem',
          'border-bottom': 'none'
        }}>
          <div style={{ flex: '1' }}>
            <strong>Línea 27:</strong> Additional Child Tax Credit (Reembolsable)
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Menor de línea 17 (${line17.toLocaleString()}) o línea {line4 >= 3 ? '26' : '20'} (${(line4 >= 3 ? line26 : line20).toLocaleString()})
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Form 1040, línea 28
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              <strong>Este es un crédito REEMBOLSABLE</strong> - puede recibirlo como reembolso
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${line27.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        background: '#fdf2f8',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #ec4899'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#db2777' }}>
          📋 Resumen del Schedule 8812
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Número de Hijos Calificados:</span>
            <strong>{line4}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Crédito Total Potencial:</span>
            <strong>${line8.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Child Tax Credit (No Reembolsable):</span>
            <strong>${line14.toLocaleString()}</strong>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'border-top': '2px solid #ec4899',
            'margin-top': '0.5rem',
            'font-weight': '700',
            color: '#059669'
          }}>
            <span>Additional CTC (Reembolsable):</span>
            <span>${line27.toLocaleString()}</span>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'font-weight': '700',
            color: '#db2777'
          }}>
            <span>Total de Créditos:</span>
            <span>${(line14 + line27).toLocaleString()}</span>
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
          💡 Diferencia Entre CTC y Additional CTC
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Child Tax Credit (CTC) - ${line14.toLocaleString()}</strong>
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Crédito NO reembolsable
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Solo puede reducir su obligación tributaria federal a $0
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '1rem' }}>
            • Si sus impuestos son bajos, no puede usar todo el crédito
          </div>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            <strong>Additional Child Tax Credit (ACTC) - ${line27.toLocaleString()}</strong>
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Crédito REEMBOLSABLE
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Puede recibirlo como reembolso, incluso si no debe impuestos
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Calculado como 15% de ingresos ganados sobre $2,500
          </div>
          <div style={{ 'margin-left': '1rem' }}>
            • Limitado a $1,700 por hijo y al crédito no utilizado
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule8812;
