import { Component, For } from 'solid-js';
import { FilingStatus, Form1098T } from '../../types/taxTypes';

interface Form8863Props {
  form1098Ts: Form1098T[];
  adjustedGrossIncome: number;
  filingStatus: FilingStatus;
  americanOpportunityCredit: number;
  americanOpportunityCreditRefundable: number;
  lifetimeLearningCredit: number;
}

const Form8863: Component<Form8863Props> = (props) => {
  // AGI Phase-out ranges for 2024
  const aocPhaseOutRanges = {
    married_joint: { start: 160000, end: 180000 },
    single: { start: 80000, end: 90000 },
    head_of_household: { start: 80000, end: 90000 },
    married_separate: { start: 0, end: 0 } // Not eligible if MFS
  };

  const llcPhaseOutRanges = {
    married_joint: { start: 160000, end: 180000 },
    single: { start: 80000, end: 90000 },
    head_of_household: { start: 80000, end: 90000 },
    married_separate: { start: 80000, end: 90000 }
  };

  // Calculate phase-out percentage
  const calculatePhaseOut = (range: { start: number; end: number }): number => {
    if (props.adjustedGrossIncome <= range.start) return 1.0; // No phase-out
    if (props.adjustedGrossIncome >= range.end) return 0.0; // Fully phased out
    const phaseOutRange = range.end - range.start;
    const excessAGI = props.adjustedGrossIncome - range.start;
    return 1 - (excessAGI / phaseOutRange);
  };

  // AOC eligible students (undergraduate, at least half-time)
  const aocEligibleStudents = () => {
    return props.form1098Ts.filter(form =>
      !form.isGraduateStudent && form.isAtLeastHalfTime
    );
  };

  // Calculate AOC for each student
  const calculateAOCPerStudent = (form: Form1098T): number => {
    const netExpenses = Math.max(0, form.qualifiedExpenses - form.scholarshipsGrants);
    // AOC: 100% of first $2,000 + 25% of next $2,000 = max $2,500
    const first2000 = Math.min(netExpenses, 2000);
    const next2000 = Math.min(Math.max(0, netExpenses - 2000), 2000);
    return first2000 + (next2000 * 0.25);
  };

  // Calculate LLC for each student
  const calculateLLCPerStudent = (form: Form1098T): number => {
    const netExpenses = Math.max(0, form.qualifiedExpenses - form.scholarshipsGrants);
    // LLC: 20% of qualified expenses, max $2,000 per return (not per student)
    return netExpenses * 0.20;
  };

  // Total tentative AOC
  const tentativeAOC = () => {
    return aocEligibleStudents().reduce((sum, form) => sum + calculateAOCPerStudent(form), 0);
  };

  // Total tentative LLC
  const tentativeLLC = () => {
    const total = props.form1098Ts.reduce((sum, form) => sum + calculateLLCPerStudent(form), 0);
    return Math.min(total, 2000); // Max $2,000 per return
  };

  // Apply phase-out to AOC
  const aocPhaseOut = calculatePhaseOut(aocPhaseOutRanges[props.filingStatus]);
  const totalAOC = Math.round(tentativeAOC() * aocPhaseOut);
  const aocRefundable = Math.round(totalAOC * 0.40); // 40% is refundable
  const aocNonRefundable = totalAOC - aocRefundable;

  // Apply phase-out to LLC
  const llcPhaseOut = calculatePhaseOut(llcPhaseOutRanges[props.filingStatus]);
  const totalLLC = Math.round(tentativeLLC() * llcPhaseOut);

  // Total education credits
  const totalNonRefundableCredits = aocNonRefundable + totalLLC;
  const totalRefundableCredits = aocRefundable;

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
    color: '#3b82f6',
    'min-width': '120px',
    'text-align': 'right'
  };

  const formulaStyle = {
    'font-size': '0.875rem',
    color: 'var(--text-muted)',
    'font-style': 'italic',
    'margin-left': '1rem'
  };

  const studentCardStyle = {
    background: '#eff6ff',
    padding: '1rem',
    'border-radius': '0.5rem',
    'margin-bottom': '1rem',
    border: '1px solid #3b82f6'
  };

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      'border-radius': 'var(--border-radius-sm)',
      'margin-bottom': '1.5rem',
      border: '2px solid #3b82f6'
    }}>
      <h3 style={{
        'margin-top': '0',
        'margin-bottom': '1rem',
        color: '#2563eb',
        display: 'flex',
        'align-items': 'center',
        gap: '0.5rem'
      }}>
        FORM 8863 - Education Credits (Créditos Educativos)
      </h3>

      {/* Educational Info Box */}
      <div style={{
        background: '#eff6ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-bottom': '1.5rem',
        border: '1px solid #3b82f6'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#2563eb' }}>
          ¿Qué son los Créditos Educativos? (What are Education Credits?)
        </div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ 'margin-bottom': '0.75rem' }}>
            <strong>American Opportunity Credit (AOC):</strong>
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Primeros 4 años de educación universitaria (First 4 years of undergraduate education)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Máximo $2,500 por estudiante (Maximum $2,500 per student)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • 40% es reembolsable (hasta $1,000) (40% is refundable, up to $1,000)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '1rem' }}>
            • Estudiante debe estar al menos medio tiempo (Student must be at least half-time)
          </div>

          <div style={{ 'margin-bottom': '0.75rem' }}>
            <strong>Lifetime Learning Credit (LLC):</strong>
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Cualquier año de educación (Any year of education)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Máximo $2,000 por declaración (Maximum $2,000 per return)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • NO es reembolsable (Non-refundable)
          </div>
          <div style={{ 'margin-left': '1rem', 'margin-bottom': '0.5rem' }}>
            • Incluye estudiantes de posgrado (Includes graduate students)
          </div>

          <div style={{ 'margin-top': '1rem', 'font-weight': '600', color: '#dc2626' }}>
            ⚠️ No puede reclamar ambos créditos para el mismo estudiante (Cannot claim both credits for the same student)
          </div>
        </div>
      </div>

      {/* Part I - American Opportunity Credit */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#2563eb', 'margin-bottom': '1rem' }}>
          Parte I - American Opportunity Credit (AOC)
        </h4>

        {aocEligibleStudents().length === 0 ? (
          <div style={{
            background: '#fef2f2',
            padding: '1rem',
            'border-radius': '0.5rem',
            border: '1px solid #ef4444',
            color: '#dc2626'
          }}>
            No hay estudiantes elegibles para AOC (No students eligible for AOC)
          </div>
        ) : (
          <>
            <For each={aocEligibleStudents()}>
              {(form) => {
                const netExpenses = Math.max(0, form.qualifiedExpenses - form.scholarshipsGrants);
                const credit = calculateAOCPerStudent(form);

                return (
                  <div style={studentCardStyle}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#2563eb' }}>
                      {form.studentName}
                    </div>
                    <div style={{ 'font-size': '0.875rem' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
                        <span>Institución (Institution):</span>
                        <span style={{ 'font-weight': '600' }}>{form.institution}</span>
                      </div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
                        <span>Gastos Calificados (Qualified Expenses):</span>
                        <span style={{ 'font-weight': '600' }}>${form.qualifiedExpenses.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
                        <span>Becas/Subvenciones (Scholarships/Grants):</span>
                        <span style={{ 'font-weight': '600' }}>-${form.scholarshipsGrants.toLocaleString()}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        padding: '0.5rem 0',
                        'border-top': '1px solid #3b82f6',
                        'margin-top': '0.5rem',
                        'font-weight': '700'
                      }}>
                        <span>Gastos Netos (Net Expenses):</span>
                        <span>${netExpenses.toLocaleString()}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        padding: '0.5rem',
                        background: '#dbeafe',
                        'border-radius': '0.25rem',
                        'margin-top': '0.5rem',
                        'font-weight': '700',
                        color: '#2563eb'
                      }}>
                        <span>Crédito Calculado (Credit):</span>
                        <span>${credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
                        100% de primeros $2,000 + 25% de próximos $2,000
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            {/* AOC Totals */}
            <div style={{ 'margin-top': '1.5rem' }}>
              <div style={lineStyle}>
                <div style={labelStyle}>
                  <strong>Total AOC Tentativo (Tentative AOC):</strong>
                  <span style={formulaStyle}>
                    Suma de todos los créditos por estudiante
                  </span>
                </div>
                <div style={valueStyle}>${tentativeAOC().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {aocPhaseOut < 1.0 && (
                <div style={{
                  background: '#fef3c7',
                  padding: '1rem',
                  'border-radius': '0.5rem',
                  'margin-top': '1rem',
                  border: '1px solid #f59e0b'
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#d97706' }}>
                    ⚠️ Reducción por AGI (Phase-out due to AGI)
                  </div>
                  <div style={{ 'font-size': '0.875rem' }}>
                    <div>AGI: ${props.adjustedGrossIncome.toLocaleString()}</div>
                    <div>Rango de reducción (Phase-out range): ${aocPhaseOutRanges[props.filingStatus].start.toLocaleString()} - ${aocPhaseOutRanges[props.filingStatus].end.toLocaleString()}</div>
                    <div>Porcentaje permitido (Percentage allowed): {(aocPhaseOut * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}

              <div style={{
                ...lineStyle,
                background: '#dbeafe',
                padding: '0.75rem',
                'border-radius': '0.5rem',
                'font-weight': '600',
                'border-bottom': 'none',
                'margin-top': '1rem'
              }}>
                <div style={labelStyle}>
                  <strong>Total AOC (después de reducción):</strong>
                </div>
                <div style={{ ...valueStyle, color: '#2563eb' }}>${totalAOC.toLocaleString()}</div>
              </div>

              <div style={{ ...lineStyle, 'margin-top': '1rem' }}>
                <div style={labelStyle}>
                  <strong>Porción Reembolsable (Refundable - 40%):</strong>
                  <span style={formulaStyle}>
                    Va a Form 1040, Línea 29
                  </span>
                </div>
                <div style={valueStyle}>${aocRefundable.toLocaleString()}</div>
              </div>

              <div style={lineStyle}>
                <div style={labelStyle}>
                  <strong>Porción NO Reembolsable (Non-refundable - 60%):</strong>
                  <span style={formulaStyle}>
                    Va a Form 1040, Línea 19
                  </span>
                </div>
                <div style={valueStyle}>${aocNonRefundable.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Part II - Lifetime Learning Credit */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#2563eb', 'margin-bottom': '1rem' }}>
          Parte II - Lifetime Learning Credit (LLC)
        </h4>

        {props.form1098Ts.length === 0 ? (
          <div style={{
            background: '#fef2f2',
            padding: '1rem',
            'border-radius': '0.5rem',
            border: '1px solid #ef4444',
            color: '#dc2626'
          }}>
            No hay estudiantes para LLC (No students for LLC)
          </div>
        ) : (
          <>
            <For each={props.form1098Ts}>
              {(form) => {
                const netExpenses = Math.max(0, form.qualifiedExpenses - form.scholarshipsGrants);
                const potentialCredit = calculateLLCPerStudent(form);

                return (
                  <div style={studentCardStyle}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', color: '#2563eb' }}>
                      {form.studentName} {form.isGraduateStudent ? '(Posgrado/Graduate)' : '(Pregrado/Undergraduate)'}
                    </div>
                    <div style={{ 'font-size': '0.875rem' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
                        <span>Institución (Institution):</span>
                        <span style={{ 'font-weight': '600' }}>{form.institution}</span>
                      </div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
                        <span>Gastos Netos (Net Expenses):</span>
                        <span style={{ 'font-weight': '600' }}>${netExpenses.toLocaleString()}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        padding: '0.5rem',
                        background: '#dbeafe',
                        'border-radius': '0.25rem',
                        'margin-top': '0.5rem',
                        'font-weight': '700',
                        color: '#2563eb'
                      }}>
                        <span>20% de Gastos (20% of Expenses):</span>
                        <span>${potentialCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            {/* LLC Totals */}
            <div style={{ 'margin-top': '1.5rem' }}>
              <div style={lineStyle}>
                <div style={labelStyle}>
                  <strong>Total LLC Tentativo (Tentative LLC):</strong>
                  <span style={formulaStyle}>
                    Máximo $2,000 por declaración
                  </span>
                </div>
                <div style={valueStyle}>${tentativeLLC().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {llcPhaseOut < 1.0 && (
                <div style={{
                  background: '#fef3c7',
                  padding: '1rem',
                  'border-radius': '0.5rem',
                  'margin-top': '1rem',
                  border: '1px solid #f59e0b'
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#d97706' }}>
                    ⚠️ Reducción por AGI (Phase-out due to AGI)
                  </div>
                  <div style={{ 'font-size': '0.875rem' }}>
                    <div>AGI: ${props.adjustedGrossIncome.toLocaleString()}</div>
                    <div>Rango de reducción (Phase-out range): ${llcPhaseOutRanges[props.filingStatus].start.toLocaleString()} - ${llcPhaseOutRanges[props.filingStatus].end.toLocaleString()}</div>
                    <div>Porcentaje permitido (Percentage allowed): {(llcPhaseOut * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}

              <div style={{
                ...lineStyle,
                background: '#dbeafe',
                padding: '0.75rem',
                'border-radius': '0.5rem',
                'font-weight': '600',
                'border-bottom': 'none',
                'margin-top': '1rem'
              }}>
                <div style={labelStyle}>
                  <strong>Total LLC (después de reducción):</strong>
                  <span style={formulaStyle}>
                    NO reembolsable - Va a Form 1040, Línea 19
                  </span>
                </div>
                <div style={{ ...valueStyle, color: '#2563eb' }}>${totalLLC.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Part III - Summary */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#2563eb', 'margin-bottom': '1rem' }}>
          Parte III - Resumen de Créditos Educativos (Education Credits Summary)
        </h4>

        <div style={{
          background: '#eff6ff',
          padding: '1rem',
          'border-radius': '0.5rem',
          border: '1px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'font-weight': '600' }}>
            <span>American Opportunity Credit (AOC) - No Reembolsable:</span>
            <span style={{ color: '#2563eb' }}>${aocNonRefundable.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'font-weight': '600' }}>
            <span>Lifetime Learning Credit (LLC):</span>
            <span style={{ color: '#2563eb' }}>${totalLLC.toLocaleString()}</span>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.75rem',
            'border-top': '2px solid #3b82f6',
            'margin-top': '0.5rem',
            'font-weight': '700',
            'font-size': '1.1rem',
            background: '#dbeafe',
            'border-radius': '0.25rem'
          }}>
            <span>Total Créditos NO Reembolsables (Total Non-Refundable):</span>
            <span style={{ color: '#2563eb' }}>${totalNonRefundableCredits.toLocaleString()}</span>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.75rem',
            'margin-top': '0.75rem',
            'font-weight': '700',
            'font-size': '1.1rem',
            background: '#22c55e',
            color: 'white',
            'border-radius': '0.25rem'
          }}>
            <span>AOC Reembolsable (Refundable AOC - 40%):</span>
            <span>${totalRefundableCredits.toLocaleString()}</span>
          </div>

          <div style={{
            'margin-top': '1rem',
            padding: '0.75rem',
            background: '#fef3c7',
            'border-radius': '0.25rem',
            'font-size': '0.875rem',
            border: '1px solid #f59e0b'
          }}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#d97706' }}>
              📋 Instrucciones para Form 1040:
            </div>
            <div style={{ 'margin-left': '1rem' }}>
              <div>• Créditos NO Reembolsables (${totalNonRefundableCredits.toLocaleString()}) → <strong>Form 1040, Línea 19</strong></div>
              <div>• AOC Reembolsable (${totalRefundableCredits.toLocaleString()}) → <strong>Form 1040, Línea 29</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Eligibility Warning for MFS */}
      {props.filingStatus === 'married_separate' && totalAOC > 0 && (
        <div style={{
          background: '#fef2f2',
          padding: '1rem',
          'border-radius': '0.5rem',
          'margin-top': '1rem',
          border: '1px solid #ef4444'
        }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#dc2626' }}>
            ⚠️ Advertencia (Warning):
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            El American Opportunity Credit NO está disponible para contribuyentes casados que presentan por separado.
            (The American Opportunity Credit is NOT available for married filing separately.)
          </div>
        </div>
      )}

      {/* Summary Information Box */}
      <div style={{
        background: '#eff6ff',
        padding: '1rem',
        'border-radius': '0.5rem',
        'margin-top': '1.5rem',
        border: '1px solid #3b82f6'
      }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#2563eb' }}>
          📊 Resumen del Form 8863
        </div>
        <div style={{ 'font-size': '0.875rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Estudiantes Elegibles AOC:</span>
            <strong>{aocEligibleStudents().length}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Total Estudiantes (Total Students):</span>
            <strong>{props.form1098Ts.length}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>AGI:</span>
            <strong>${props.adjustedGrossIncome.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.25rem 0' }}>
            <span>Estado Civil (Filing Status):</span>
            <strong>{props.filingStatus}</strong>
          </div>
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            padding: '0.5rem 0',
            'border-top': '2px solid #3b82f6',
            'margin-top': '0.5rem',
            'font-weight': '700',
            color: '#2563eb'
          }}>
            <span>Total Créditos Educativos:</span>
            <span>${(totalNonRefundableCredits + totalRefundableCredits).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Form8863;
