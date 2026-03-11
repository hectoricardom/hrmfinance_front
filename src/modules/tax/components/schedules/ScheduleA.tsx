import { Component, For, createMemo } from 'solid-js';
import { Form1098, TaxDeduction } from '../../types/taxTypes';

interface ScheduleAProps {
  form1098s: Form1098[];
  deductions: TaxDeduction[];
  mortgageInterestPaid: number;
  propertyTaxesPaid: number;
  standardDeduction: number;
  totalItemizedDeductions: number;
  deductionUsed: 'standard' | 'itemized';
}

/**
 * Schedule A - Itemized Deductions
 * Reports itemized deductions including mortgage interest, property taxes, charitable contributions
 */
const ScheduleA: Component<ScheduleAProps> = (props) => {
  // SALT CAP CONSTANTS
  const SALT_CAP = 10000;
  const SALT_CAP_MFS = 5000; // Married Filing Separately

  // Filter deductions by category
  const medicalDeductions = createMemo(() =>
    props.deductions.filter(d => d.category === 'medical')
  );

  const stateTaxDeductions = createMemo(() =>
    props.deductions.filter(d => d.category === 'state_tax')
  );

  const propertyTaxDeductions = createMemo(() =>
    props.deductions.filter(d => d.category === 'property_tax')
  );

  const charityDeductions = createMemo(() =>
    props.deductions.filter(d => d.category === 'charity')
  );

  const otherDeductions = createMemo(() =>
    props.deductions.filter(d => d.category === 'other')
  );

  // Calculate totals
  const totalMedical = createMemo(() =>
    medicalDeductions().reduce((sum, d) => sum + d.amount, 0)
  );

  const totalStateTax = createMemo(() =>
    stateTaxDeductions().reduce((sum, d) => sum + d.amount, 0)
  );

  const totalPropertyTax = createMemo(() =>
    propertyTaxDeductions().reduce((sum, d) => sum + d.amount, 0) + props.propertyTaxesPaid
  );

  const totalCharity = createMemo(() =>
    charityDeductions().reduce((sum, d) => sum + d.amount, 0)
  );

  const totalOther = createMemo(() =>
    otherDeductions().reduce((sum, d) => sum + d.amount, 0)
  );

  // SALT Calculation (State and Local Taxes)
  const totalSALT = createMemo(() =>
    totalStateTax() + totalPropertyTax()
  );

  const saltAfterCap = createMemo(() =>
    Math.min(totalSALT(), SALT_CAP)
  );

  const saltCapExceeded = createMemo(() =>
    totalSALT() > SALT_CAP
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Styles
  const containerStyle = {
    background: 'var(--surface-color)',
    border: '2px solid #f97316',
    'border-radius': '8px',
    padding: '1.5rem',
    'margin-bottom': '2rem',
    'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
  };

  const headerStyle = {
    'font-size': '1.5rem',
    'font-weight': 'bold',
    color: '#f97316',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid #f97316'
  };

  const sectionStyle = {
    'margin-bottom': '1.5rem'
  };

  const sectionTitleStyle = {
    'font-size': '1.1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '0.75rem',
    background: '#fed7aa',
    padding: '0.5rem',
    'border-radius': '4px'
  };

  const lineItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.5rem 0',
    'border-bottom': '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  };

  const subLineItemStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.4rem 0 0.4rem 1.5rem',
    'font-size': '0.95rem',
    color: 'var(--text-secondary)'
  };

  const totalLineStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    padding: '0.75rem',
    'font-weight': 'bold',
    background: '#fff7ed',
    'border': '2px solid #f97316',
    'border-radius': '4px',
    'margin-top': '0.5rem',
    color: 'var(--text-primary)'
  };

  const warningBoxStyle = {
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    'border-radius': '6px',
    padding: '1rem',
    'margin-bottom': '1rem',
    'font-size': '0.95rem',
    color: 'var(--text-primary)'
  };

  const infoBoxStyle = {
    background: '#dbeafe',
    border: '1px solid #3b82f6',
    'border-left': '4px solid #3b82f6',
    'border-radius': '4px',
    padding: '0.75rem',
    'margin-top': '0.5rem',
    'font-size': '0.85rem',
    color: 'var(--text-primary)'
  };

  const educationalBoxStyle = {
    background: '#f3e8ff',
    border: '1px solid #a855f7',
    'border-left': '4px solid #a855f7',
    'border-radius': '4px',
    padding: '0.75rem',
    'margin-top': '1rem',
    'font-size': '0.85rem',
    color: 'var(--text-primary)'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        Schedule A - Deducciones Detalladas (Itemized Deductions)
      </div>

      {/* Comparison Warning Box */}
      <div style={warningBoxStyle}>
        <strong>Comparación de Deducciones:</strong>
        <div style={{ 'margin-top': '0.5rem' }}>
          <div>Su deducción estándar es <strong>{formatCurrency(props.standardDeduction)}</strong></div>
          <div>Sus deducciones detalladas son <strong>{formatCurrency(props.totalItemizedDeductions)}</strong></div>
          <div style={{ 'margin-top': '0.5rem', 'font-size': '1.05rem' }}>
            Está usando: <strong style={{ color: '#ea580c' }}>
              {props.deductionUsed === 'itemized' ? 'Detalladas (Itemized)' : 'Estándar (Standard)'}
            </strong>
          </div>
        </div>
      </div>

      {/* Lines 1-4: Medical and Dental Expenses */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Líneas 1-4: Gastos Médicos y Dentales (Medical and Dental Expenses)
        </div>

        {medicalDeductions().length > 0 ? (
          <>
            <For each={medicalDeductions()}>
              {(deduction) => (
                <div style={subLineItemStyle}>
                  <span>{deduction.description}</span>
                  <span>{formatCurrency(deduction.amount)}</span>
                </div>
              )}
            </For>
            <div style={lineItemStyle}>
              <span><strong>Línea 1: Total de gastos médicos</strong></span>
              <span><strong>{formatCurrency(totalMedical())}</strong></span>
            </div>
          </>
        ) : (
          <div style={{ 'font-style': 'italic', color: 'var(--text-secondary)', padding: '0.5rem' }}>
            No hay gastos médicos reportados. Los gastos médicos deben exceder 7.5% del AGI para ser deducibles.
          </div>
        )}

        <div style={infoBoxStyle}>
          <strong>Nota:</strong> Solo puede deducir gastos médicos que excedan el 7.5% de su Ingreso Bruto Ajustado (AGI).
          Esta deducción no es comúnmente utilizada.
        </div>
      </div>

      {/* Lines 5-7: Taxes You Paid */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Líneas 5-7: Impuestos Pagados (Taxes You Paid)
        </div>

        {/* Line 5a: State and local income taxes */}
        <div style={lineItemStyle}>
          <span>Línea 5a: Impuestos estatales y locales sobre ingresos (State/Local Income Taxes)</span>
          <span>{formatCurrency(totalStateTax())}</span>
        </div>

        {/* Show state tax deductions */}
        {stateTaxDeductions().length > 0 && (
          <For each={stateTaxDeductions()}>
            {(deduction) => (
              <div style={subLineItemStyle}>
                <span>{deduction.description}</span>
                <span>{formatCurrency(deduction.amount)}</span>
              </div>
            )}
          </For>
        )}

        {/* Line 5b: Real estate taxes */}
        <div style={lineItemStyle}>
          <span>Línea 5b: Impuestos sobre bienes raíces (Real Estate Taxes)</span>
          <span>{formatCurrency(totalPropertyTax())}</span>
        </div>

        {/* Show property taxes from Form 1098 */}
        {props.form1098s.length > 0 && (
          <For each={props.form1098s}>
            {(form) => form.propertyTaxes > 0 && (
              <div style={subLineItemStyle}>
                <span>Form 1098 - {form.lender} ({form.propertyAddress})</span>
                <span>{formatCurrency(form.propertyTaxes)}</span>
              </div>
            )}
          </For>
        )}

        {/* Show other property tax deductions */}
        {propertyTaxDeductions().length > 0 && (
          <For each={propertyTaxDeductions()}>
            {(deduction) => (
              <div style={subLineItemStyle}>
                <span>{deduction.description}</span>
                <span>{formatCurrency(deduction.amount)}</span>
              </div>
            )}
          </For>
        )}

        {/* Line 5c: Personal property taxes */}
        <div style={lineItemStyle}>
          <span>Línea 5c: Impuestos sobre bienes personales (Personal Property Taxes)</span>
          <span>$0.00</span>
        </div>

        {/* Line 5d: Add lines 5a-5c */}
        <div style={lineItemStyle}>
          <span><strong>Línea 5d: Total de líneas 5a-5c</strong></span>
          <span><strong>{formatCurrency(totalSALT())}</strong></span>
        </div>

        {/* Line 5e: SALT CAP */}
        <div style={{...lineItemStyle, background: saltCapExceeded() ? '#fee2e2' : 'transparent'}}>
          <span>
            <strong>Línea 5e: Menor de línea 5d o $10,000 (SALT CAP)</strong>
            {saltCapExceeded() && <span style={{ color: '#dc2626', 'margin-left': '0.5rem' }}>⚠️ LÍMITE APLICADO</span>}
          </span>
          <span><strong>{formatCurrency(saltAfterCap())}</strong></span>
        </div>

        {/* SALT Cap Warning */}
        {saltCapExceeded() && (
          <div style={{...warningBoxStyle, 'margin-top': '0.5rem'}}>
            <strong>⚠️ Límite de Deducción SALT Excedido:</strong>
            <div style={{ 'margin-top': '0.5rem' }}>
              Sus impuestos estatales y locales totales son {formatCurrency(totalSALT())},
              pero la deducción está limitada a {formatCurrency(SALT_CAP)}.
              No puede deducir {formatCurrency(totalSALT() - SALT_CAP)}.
            </div>
          </div>
        )}

        {/* Line 6: Other taxes */}
        <div style={lineItemStyle}>
          <span>Línea 6: Otros impuestos (Other Taxes)</span>
          <span>$0.00</span>
        </div>

        {/* Line 7: Total taxes */}
        <div style={totalLineStyle}>
          <span>Línea 7: Total de Impuestos Pagados (Add lines 5e + 6)</span>
          <span>{formatCurrency(saltAfterCap())}</span>
        </div>

        {/* Educational box about SALT cap */}
        <div style={educationalBoxStyle}>
          <strong>Sobre el Límite SALT (SALT Cap):</strong>
          <div style={{ 'margin-top': '0.5rem' }}>
            La Ley de Reducción de Impuestos y Empleos (TCJA) de 2017 limitó la deducción de impuestos
            estatales y locales (SALT) a $10,000 por año ($5,000 si está casado declarando por separado).
            Esto incluye impuestos sobre ingresos, bienes raíces y propiedad personal combinados.
          </div>
        </div>
      </div>

      {/* Lines 8-15: Interest You Paid */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Líneas 8-15: Intereses Pagados (Interest You Paid)
        </div>

        {/* Line 8a: Home mortgage interest from Form 1098 */}
        <div style={lineItemStyle}>
          <span><strong>Línea 8a: Intereses hipotecarios de Form 1098</strong></span>
          <span><strong>{formatCurrency(props.mortgageInterestPaid)}</strong></span>
        </div>

        {/* List each Form 1098 */}
        {props.form1098s.length > 0 ? (
          <>
            <For each={props.form1098s}>
              {(form) => (
                <div style={{...subLineItemStyle, 'flex-direction': 'column', gap: '0.25rem'}}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span><strong>{form.lender}</strong></span>
                    <span><strong>{formatCurrency(form.mortgageInterest)}</strong></span>
                  </div>
                  <div style={{ 'font-size': '0.85rem', color: 'var(--text-secondary)' }}>
                    Propiedad: {form.propertyAddress}
                  </div>
                  <div style={{ 'font-size': '0.85rem', color: 'var(--text-secondary)' }}>
                    Principal pendiente: {formatCurrency(form.outstandingPrincipal)} |
                    Fecha de origen: {form.mortgageOriginationDate}
                  </div>
                  {form.pointsPaid > 0 && (
                    <div style={{ 'font-size': '0.85rem', color: 'var(--text-secondary)' }}>
                      Puntos pagados: {formatCurrency(form.pointsPaid)}
                    </div>
                  )}
                  {form.mortgageInsurancePremiums > 0 && (
                    <div style={{ 'font-size': '0.85rem', color: 'var(--text-secondary)' }}>
                      Primas de seguro hipotecario: {formatCurrency(form.mortgageInsurancePremiums)}
                    </div>
                  )}
                </div>
              )}
            </For>
          </>
        ) : (
          <div style={{ 'font-style': 'italic', color: 'var(--text-secondary)', padding: '0.5rem 0 0.5rem 1.5rem' }}>
            No hay Forms 1098 reportados
          </div>
        )}

        {/* Line 8b: Home mortgage interest not on Form 1098 */}
        <div style={lineItemStyle}>
          <span>Línea 8b: Intereses hipotecarios no en Form 1098</span>
          <span>$0.00</span>
        </div>

        {/* Line 8c: Points not reported on Form 1098 */}
        <div style={lineItemStyle}>
          <span>Línea 8c: Puntos no reportados en Form 1098</span>
          <span>$0.00</span>
        </div>

        {/* Line 8d: Mortgage insurance premiums */}
        <div style={lineItemStyle}>
          <span>Línea 8d: Primas de seguro hipotecario</span>
          <span>{formatCurrency(props.form1098s.reduce((sum, f) => sum + f.mortgageInsurancePremiums, 0))}</span>
        </div>

        {/* Line 8e: Total mortgage interest and points */}
        <div style={lineItemStyle}>
          <span><strong>Línea 8e: Total (Add lines 8a through 8d)</strong></span>
          <span><strong>
            {formatCurrency(
              props.mortgageInterestPaid +
              props.form1098s.reduce((sum, f) => sum + f.mortgageInsurancePremiums + f.pointsPaid, 0)
            )}
          </strong></span>
        </div>

        {/* Lines 9-10: Investment interest - not commonly used */}
        <div style={lineItemStyle}>
          <span>Línea 9: Intereses de inversión (Investment Interest)</span>
          <span>$0.00</span>
        </div>

        <div style={totalLineStyle}>
          <span>Línea 10: Total de Intereses Pagados</span>
          <span>
            {formatCurrency(
              props.mortgageInterestPaid +
              props.form1098s.reduce((sum, f) => sum + f.mortgageInsurancePremiums + f.pointsPaid, 0)
            )}
          </span>
        </div>

        {/* Educational box about mortgage interest limit */}
        <div style={educationalBoxStyle}>
          <strong>Sobre el Límite de Interés Hipotecario:</strong>
          <div style={{ 'margin-top': '0.5rem' }}>
            Para hipotecas originadas después del 15 de diciembre de 2017, el interés hipotecario es deducible
            solo en los primeros $750,000 de deuda hipotecaria ($375,000 si está casado declarando por separado).
            Para hipotecas anteriores, el límite es $1,000,000 ($500,000 MFS).
          </div>
        </div>
      </div>

      {/* Lines 11-15: Gifts to Charity */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Líneas 11-14: Contribuciones Caritativas (Gifts to Charity)
        </div>

        {charityDeductions().length > 0 ? (
          <>
            <For each={charityDeductions()}>
              {(deduction) => (
                <div style={subLineItemStyle}>
                  <span>{deduction.description}</span>
                  <span>{formatCurrency(deduction.amount)}</span>
                </div>
              )}
            </For>

            <div style={lineItemStyle}>
              <span>Línea 11: Contribuciones en efectivo (Cash Contributions)</span>
              <span>{formatCurrency(totalCharity())}</span>
            </div>

            <div style={lineItemStyle}>
              <span>Línea 12: Contribuciones no en efectivo (Non-Cash Contributions)</span>
              <span>$0.00</span>
            </div>

            <div style={lineItemStyle}>
              <span>Línea 13: Carryover de años anteriores (Carryover from Prior Years)</span>
              <span>$0.00</span>
            </div>

            <div style={totalLineStyle}>
              <span>Línea 14: Total de Contribuciones Caritativas</span>
              <span>{formatCurrency(totalCharity())}</span>
            </div>
          </>
        ) : (
          <div style={{ 'font-style': 'italic', color: 'var(--text-secondary)', padding: '0.5rem' }}>
            No hay contribuciones caritativas reportadas
          </div>
        )}

        <div style={infoBoxStyle}>
          <strong>Nota:</strong> Las contribuciones caritativas deben ser a organizaciones calificadas 501(c)(3).
          Contribuciones en efectivo de más de $250 requieren un recibo por escrito de la organización.
        </div>
      </div>

      {/* Lines 16-28: Other Itemized Deductions */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Líneas 16-28: Otras Deducciones Detalladas (Other Itemized Deductions)
        </div>

        {otherDeductions().length > 0 ? (
          <>
            <For each={otherDeductions()}>
              {(deduction) => (
                <div style={subLineItemStyle}>
                  <span>{deduction.description}</span>
                  <span>{formatCurrency(deduction.amount)}</span>
                </div>
              )}
            </For>

            <div style={totalLineStyle}>
              <span>Total de Otras Deducciones</span>
              <span>{formatCurrency(totalOther())}</span>
            </div>
          </>
        ) : (
          <div style={{ 'font-style': 'italic', color: 'var(--text-secondary)', padding: '0.5rem' }}>
            No hay otras deducciones reportadas. Pérdidas por robo y desastres calificados pueden ser deducibles aquí.
          </div>
        )}
      </div>

      {/* Line 29: Total Itemized Deductions */}
      <div style={{
        ...totalLineStyle,
        'font-size': '1.15rem',
        background: '#fff7ed',
        border: '3px solid #f97316'
      }}>
        <span>Línea 17: TOTAL DE DEDUCCIONES DETALLADAS</span>
        <span style={{ color: '#ea580c', 'font-size': '1.25rem' }}>
          {formatCurrency(props.totalItemizedDeductions)}
        </span>
      </div>

      {/* Educational box about when to itemize */}
      <div style={educationalBoxStyle}>
        <strong>¿Cuándo Detallar vs Tomar la Deducción Estándar?</strong>
        <div style={{ 'margin-top': '0.5rem' }}>
          <p><strong>Detalle</strong> si sus deducciones detalladas totales exceden su deducción estándar.</p>
          <p style={{ 'margin-top': '0.5rem' }}>
            <strong>Deducciones Comunes que Justifican Detallar:</strong>
          </p>
          <ul style={{ 'margin-left': '1.5rem', 'margin-top': '0.25rem' }}>
            <li>Intereses hipotecarios altos en una casa nueva o costosa</li>
            <li>Impuestos estatales y locales significativos (hasta el límite de $10,000)</li>
            <li>Grandes contribuciones caritativas</li>
            <li>Gastos médicos significativos (más del 7.5% del AGI)</li>
          </ul>
          <p style={{ 'margin-top': '0.5rem' }}>
            La mayoría de los contribuyentes toman la deducción estándar porque es más simple y a menudo resulta
            en una deducción mayor, especialmente después del aumento de la deducción estándar en 2018.
          </p>
        </div>
      </div>

      {/* Summary comparison */}
      <div style={{
        background: '#f0fdf4',
        padding: '1rem',
        'border-radius': '6px',
        border: '2px solid #10b981',
        'margin-top': '1rem'
      }}>
        <div style={{ 'font-size': '1.1rem', 'font-weight': 'bold', 'margin-bottom': '0.75rem', color: 'var(--text-primary)' }}>
          Resumen de Deducciones (Deduction Summary)
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem', color: 'var(--text-primary)' }}>
          <span>Gastos médicos y dentales:</span>
          <span>{formatCurrency(totalMedical())}</span>
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem', color: 'var(--text-primary)' }}>
          <span>Impuestos pagados (después del límite SALT):</span>
          <span>{formatCurrency(saltAfterCap())}</span>
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem', color: 'var(--text-primary)' }}>
          <span>Intereses pagados:</span>
          <span>
            {formatCurrency(
              props.mortgageInterestPaid +
              props.form1098s.reduce((sum, f) => sum + f.mortgageInsurancePremiums + f.pointsPaid, 0)
            )}
          </span>
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem', color: 'var(--text-primary)' }}>
          <span>Contribuciones caritativas:</span>
          <span>{formatCurrency(totalCharity())}</span>
        </div>

        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.5rem', color: 'var(--text-primary)' }}>
          <span>Otras deducciones:</span>
          <span>{formatCurrency(totalOther())}</span>
        </div>

        <div style={{
          'margin-top': '0.75rem',
          'padding-top': '0.75rem',
          'border-top': '2px solid #10b981',
          display: 'flex',
          'justify-content': 'space-between',
          'font-weight': 'bold',
          'font-size': '1.1rem',
          color: 'var(--text-primary)'
        }}>
          <span>Total de Deducciones Detalladas:</span>
          <span style={{ color: '#059669' }}>{formatCurrency(props.totalItemizedDeductions)}</span>
        </div>

        <div style={{
          'margin-top': '0.75rem',
          'padding-top': '0.75rem',
          'border-top': '2px solid #10b981',
          display: 'flex',
          'justify-content': 'space-between',
          'font-weight': 'bold',
          'font-size': '1.1rem',
          color: 'var(--text-primary)'
        }}>
          <span>Deducción Estándar Disponible:</span>
          <span style={{ color: '#3b82f6' }}>{formatCurrency(props.standardDeduction)}</span>
        </div>

        <div style={{
          'margin-top': '0.75rem',
          'padding-top': '0.75rem',
          'border-top': '2px solid #10b981',
          display: 'flex',
          'justify-content': 'space-between',
          'font-weight': 'bold',
          'font-size': '1.2rem',
          color: 'var(--text-primary)'
        }}>
          <span>Deducción Utilizada en Form 1040:</span>
          <span style={{ color: '#ea580c' }}>
            {formatCurrency(Math.max(props.standardDeduction, props.totalItemizedDeductions))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleA;
