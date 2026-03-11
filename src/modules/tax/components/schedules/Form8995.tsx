import { Component } from 'solid-js';
import { FilingStatus } from '../../types/taxTypes';

interface Form8995Props {
  netSelfEmploymentIncome: number;
  selfEmploymentTaxDeduction: number;
  adjustedGrossIncome: number;
  standardDeduction: number;
  filingStatus: FilingStatus;
  businessName: string;
}

const Form8995: Component<Form8995Props> = (props) => {
  // Line 1: Qualified business income from Schedule C
  // QBI = Net SE Income - SE Tax Deduction
  const line1 = props.netSelfEmploymentIncome - props.selfEmploymentTaxDeduction;

  // Line 2: Total qualified business income
  const line2 = line1;

  // Line 3: Qualified business net loss carryforward (not applicable)
  const line3 = 0;

  // Line 4: Total qualified business income
  const line4 = Math.max(0, line2 + line3);

  // Line 5: QBI component (20% of line 4)
  const line5 = Math.round(line4 * 0.20);

  // Line 6: Qualified REIT dividends and PTP income (not applicable)
  const line6 = 0;

  // Line 7: Qualified REIT and PTP loss carryforward (not applicable)
  const line7 = 0;

  // Line 8: Total qualified REIT dividends and PTP income
  const line8 = Math.max(0, line6 + line7);

  // Line 9: REIT and PTP component (20% of line 8)
  const line9 = Math.round(line8 * 0.20);

  // Line 10: QBI deduction before income limitation
  const line10 = line5 + line9;

  // Line 11: Taxable income before QBI deduction
  const line11 = props.adjustedGrossIncome - props.standardDeduction;

  // Line 12: Net capital gain (not applicable for most)
  const line12 = 0;

  // Line 13: Subtract line 12 from line 11
  const line13 = Math.max(0, line11 - line12);

  // Line 14: Income limitation (20% of line 13)
  const line14 = Math.round(line13 * 0.20);

  // Line 15: QBI deduction (smaller of line 10 or line 14)
  const line15 = Math.min(line10, line14);

  // Line 16: Total qualified business loss carryforward
  const line16 = 0;

  // Line 17: Total qualified REIT and PTP loss carryforward
  const line17 = 0;

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
      border: '2px solid #f59e0b'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#d97706',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        📊 FORM 8995 - Qualified Business Income Deduction (Deducción QBI)
      </h3>

      <div style={{
        background: '#fffbeb',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #f59e0b'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
          ¿Qué es la Deducción del Ingreso Comercial Calificado (QBI)?
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>• Permite a propietarios de negocios, trabajadores por cuenta propia y ciertos inversionistas deducir hasta el 20% de su ingreso comercial calificado</div>
          <div>• Esta es una deducción "above-the-line" que reduce su ingreso imponible</div>
          <div>• Disponible incluso si toma la deducción estándar</div>
          <div>• Limitada al menor de: (1) 20% del QBI o (2) 20% del ingreso imponible antes de QBI</div>
          <div>• Form 8995: Versión simplificada para ingresos ≤ $191,950 (solteros) o ≤ $383,900 (casados)</div>
        </div>
      </div>

      {/* Business Information */}
      <div style={{
        background: '#fffbeb',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #f59e0b'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>Información del Negocio</div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div>Nombre del Negocio: {props.businessName}</div>
          <div>Tipo de Negocio: Delivery Driver (Conductor de Entregas)</div>
          <div>Fuente: Schedule C</div>
        </div>
      </div>

      {/* QBI Calculation */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#d97706', 'margin-bottom': '1rem' }}>
          Cálculo del Ingreso Comercial Calificado (QBI)
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 1:</strong> Ingreso Comercial Calificado (QBI)
            <span style={formulaStyle}>
              Ganancia Neta del Schedule C - Deducción del SE Tax
            </span>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              ${props.netSelfEmploymentIncome.toLocaleString()} - ${props.selfEmploymentTaxDeduction.toLocaleString()} = ${line1.toLocaleString()}
            </div>
          </div>
          <div style={valueStyle}>${line1.toLocaleString()}</div>
        </div>

        <div style={{
          ...lineStyle,
          background: '#fffbeb',
          padding: '0.75rem',
          'border-radius': '0.5rem',
          'font-weight': '600',
          'border-bottom': 'none'
        }}>
          <div style={labelStyle}>
            <strong>Línea 2:</strong> Total de Ingreso Comercial Calificado
            <span style={formulaStyle}>
              Combine todas las líneas 1 (solo una en este caso)
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line2.toLocaleString()}</div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 3:</strong> Pérdida Neta Transferida del Año Anterior
            <span style={formulaStyle}>
              No aplica (no hay pérdidas del año anterior)
            </span>
          </div>
          <div style={valueStyle}>$({line3.toLocaleString()})</div>
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
            <strong>Línea 4:</strong> Total de Ingreso Comercial Calificado
            <span style={formulaStyle}>
              Combine líneas 2 y 3 (si cero o menos, ingrese -0-)
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              ${line2.toLocaleString()} + $0 = ${line4.toLocaleString()}
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line4.toLocaleString()}</div>
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
            <strong>Línea 5:</strong> Componente del Ingreso Comercial Calificado
            <span style={formulaStyle}>
              Multiplique línea 4 por 20% (0.20)
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              ${line4.toLocaleString()} × 0.20 = ${line5.toLocaleString()}
            </div>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              Este es el 20% de su ingreso comercial calificado
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line5.toLocaleString()}</div>
        </div>
      </div>

      {/* REIT and PTP Section */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#d97706', 'margin-bottom': '1rem' }}>
          Dividendos REIT y Ingresos PTP (No Aplicable)
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 6:</strong> Dividendos REIT Calificados e Ingresos PTP
            <span style={formulaStyle}>
              No aplica para este contribuyente
            </span>
          </div>
          <div style={valueStyle}>${line6.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 7:</strong> Pérdida REIT y PTP Transferida
          </div>
          <div style={valueStyle}>$({line7.toLocaleString()})</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 8:</strong> Total de Dividendos REIT e Ingresos PTP
          </div>
          <div style={valueStyle}>${line8.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 9:</strong> Componente REIT y PTP (20% de línea 8)
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
            <strong>Línea 10:</strong> Deducción QBI Antes de la Limitación de Ingresos
            <span style={formulaStyle}>
              Sume líneas 5 y 9 = ${line5.toLocaleString()} + ${line9.toLocaleString()}
            </span>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line10.toLocaleString()}</div>
        </div>
      </div>

      {/* Income Limitation */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#d97706', 'margin-bottom': '1rem' }}>
          Limitación Basada en Ingresos
        </h4>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 11:</strong> Ingreso Imponible Antes de la Deducción QBI
            <span style={formulaStyle}>
              AGI - Deducción Estándar
            </span>
            <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              ${props.adjustedGrossIncome.toLocaleString()} - ${props.standardDeduction.toLocaleString()} = ${line11.toLocaleString()}
            </div>
          </div>
          <div style={valueStyle}>${line11.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 12:</strong> Ganancia Neta de Capital
            <span style={formulaStyle}>
              No aplica para este contribuyente
            </span>
          </div>
          <div style={valueStyle}>${line12.toLocaleString()}</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 13:</strong> Reste línea 12 de línea 11
            <span style={formulaStyle}>
              ${line11.toLocaleString()} - ${line12.toLocaleString()}
            </span>
          </div>
          <div style={valueStyle}>${line13.toLocaleString()}</div>
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
            <strong>Línea 14:</strong> Limitación de Ingresos
            <span style={formulaStyle}>
              Multiplique línea 13 por 20% (0.20)
            </span>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              ${line13.toLocaleString()} × 0.20 = ${line14.toLocaleString()}
            </div>
            <div style={{ 'font-size': '0.75rem', 'font-weight': '400', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
              La deducción QBI no puede exceder el 20% del ingreso imponible
            </div>
          </div>
          <div style={{ ...valueStyle, color: '#d97706' }}>${line14.toLocaleString()}</div>
        </div>
      </div>

      {/* Final QBI Deduction */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#d97706', 'margin-bottom': '1rem' }}>
          Deducción QBI Final
        </h4>

        <div style={{
          ...lineStyle,
          background: '#d97706',
          color: 'white',
          padding: '1rem',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1.1rem',
          'border-bottom': 'none'
        }}>
          <div style={{ flex: '1' }}>
            <strong>Línea 15:</strong> Deducción del Ingreso Comercial Calificado (QBI)
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Menor de línea 10 (${line10.toLocaleString()}) o línea 14 (${line14.toLocaleString()})
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              ⮕ Ingrese esta cantidad en Form 1040, línea 13
            </div>
            <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
              Esta deducción reduce su ingreso imponible
            </div>
          </div>
          <div style={{ 'min-width': '120px', 'text-align': 'right', 'font-size': '1.25rem' }}>
            ${line15.toLocaleString()}
          </div>
        </div>

        <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
          <div style={labelStyle}>
            <strong>Línea 16:</strong> Pérdida Comercial Calificada Transferida
            <span style={formulaStyle}>
              Combine líneas 2 y 3 (si mayor que cero, ingrese -0-)
            </span>
          </div>
          <div style={valueStyle}>$({line16.toLocaleString()})</div>
        </div>

        <div style={lineStyle}>
          <div style={labelStyle}>
            <strong>Línea 17:</strong> Pérdida REIT y PTP Transferida
            <span style={formulaStyle}>
              Combine líneas 6 y 7 (si mayor que cero, ingrese -0-)
            </span>
          </div>
          <div style={valueStyle}>$({line17.toLocaleString()})</div>
        </div>
      </div>

      {/* Summary Box */}
      <div style={{
        background: '#fffbeb',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #f59e0b'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#d97706' }}>
          📋 Resumen del Form 8995
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Ganancia Neta del Negocio:</span>
            <strong>${props.netSelfEmploymentIncome.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Deducción del SE Tax:</span>
            <strong>-${props.selfEmploymentTaxDeduction.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Ingreso Comercial Calificado (QBI):</span>
            <strong>${line1.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>20% del QBI:</span>
            <strong>${line5.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>20% del Ingreso Imponible:</span>
            <strong>${line14.toLocaleString()}</strong>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'border-top': '2px solid #f59e0b',
            'margin-top': '0.5rem',
            'font-weight': '700',
            color: '#d97706'
          }}>
            <span>Deducción QBI (Menor de los dos):</span>
            <span>${line15.toLocaleString()}</span>
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
          💡 ¿Cómo Funciona la Deducción QBI?
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ 'margin-bottom': '0.5rem' }}>
            La deducción QBI permite a los dueños de negocios deducir hasta el 20% de su ingreso comercial calificado:
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            <strong>Paso 1:</strong> Calcule su QBI (ganancia neta del negocio - deducción del SE tax)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            <strong>Paso 2:</strong> Multiplique el QBI por 20%
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            <strong>Paso 3:</strong> Calcule el 20% de su ingreso imponible (antes de QBI)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            <strong>Paso 4:</strong> Tome el menor de los dos
          </div>
          <div style={{ 'margin-top': '0.5rem' }}>
            <strong>Beneficio:</strong> Esta deducción de ${line15.toLocaleString()} reduce su ingreso imponible de ${line11.toLocaleString()} a ${(line11 - line15).toLocaleString()}, resultando en ahorros fiscales significativos.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Form8995;
