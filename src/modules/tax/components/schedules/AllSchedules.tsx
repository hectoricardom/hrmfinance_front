import { Component } from 'solid-js';
import { TaxFormData, TaxCalculationResult } from '../../types/taxTypes';
import ScheduleA from './ScheduleA';
import ScheduleB from './ScheduleB';
import ScheduleC from './ScheduleC';
import ScheduleSE from './ScheduleSE';
import Schedule8812 from './Schedule8812';
import Form8863 from './Form8863';
import Form8995 from './Form8995';
import Form8880 from './Form8880';
import ScheduleE from './ScheduleE';

interface AllSchedulesProps {
  formData: TaxFormData;
  calculationResult: TaxCalculationResult;
}

const AllSchedules: Component<AllSchedulesProps> = (props) => {
  return (
    <div style={{
      'margin-top': '2rem',
      'margin-bottom': '2rem'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem',
        'border-radius': 'var(--border-radius-sm)',
        'margin-bottom': '2rem',
        'text-align': 'center'
      }}>
        <h2 style={{ 'margin-top': '0', 'margin-bottom': '0.5rem' }}>
          📑 Formularios y Anexos de la Declaración de Impuestos
        </h2>
        <p style={{ 'margin': '0', opacity: '0.9' }}>
          Desglose completo de todos los formularios utilizados en su declaración de impuestos
        </p>
      </div>

      {/* Navigation Index */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': 'var(--border-radius-sm)',
        'margin-bottom': '2rem',
        border: '2px solid var(--border-color)',
        'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 'margin-top': '0', 'margin-bottom': '1rem', color: 'var(--primary-color)' }}>
          📋 Índice de Formularios
        </h3>
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: '#fff7ed', 'border-radius': '0.5rem', border: '1px solid #f97316' }}>
            <div style={{ 'font-weight': '600', color: '#ea580c' }}>📋 Schedule A</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Deducciones Detalladas
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#f0fdf4', 'border-radius': '0.5rem', border: '1px solid #10b981' }}>
            <div style={{ 'font-weight': '600', color: '#059669' }}>💰 Schedule B</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Intereses y Dividendos
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#f0fdf4', 'border-radius': '0.5rem', border: '1px solid #10b981' }}>
            <div style={{ 'font-weight': '600', color: '#059669' }}>📊 Schedule C</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Ganancia o Pérdida del Negocio
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#faf5ff', 'border-radius': '0.5rem', border: '1px solid #8b5cf6' }}>
            <div style={{ 'font-weight': '600', color: '#7c3aed' }}>💼 Schedule SE</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Impuesto de Trabajo por Cuenta Propia
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#fdf2f8', 'border-radius': '0.5rem', border: '1px solid #ec4899' }}>
            <div style={{ 'font-weight': '600', color: '#db2777' }}>👨‍👩‍👧‍👦 Schedule 8812</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Créditos por Hijos y Dependientes
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#eff6ff', 'border-radius': '0.5rem', border: '1px solid #3b82f6' }}>
            <div style={{ 'font-weight': '600', color: '#2563eb' }}>🎓 Form 8863</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Créditos Educativos
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#ecfeff', 'border-radius': '0.5rem', border: '1px solid #06b6d4' }}>
            <div style={{ 'font-weight': '600', color: '#0891b2' }}>💰 Form 8880</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Crédito del Ahorrador (Retirement)
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#fffbeb', 'border-radius': '0.5rem', border: '1px solid #f59e0b' }}>
            <div style={{ 'font-weight': '600', color: '#d97706' }}>📊 Form 8995</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Deducción QBI (20% del Negocio)
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#eff6ff', 'border-radius': '0.5rem', border: '1px solid #3b82f6' }}>
            <div style={{ 'font-weight': '600', color: '#2563eb' }}>📝 Schedule 1</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Ingresos y Ajustes Adicionales
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#fef2f2', 'border-radius': '0.5rem', border: '1px solid #ef4444' }}>
            <div style={{ 'font-weight': '600', color: '#dc2626' }}>💰 Schedule 2</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Impuestos Adicionales (SE Tax)
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#ecfdf5', 'border-radius': '0.5rem', border: '1px solid #10b981' }}>
            <div style={{ 'font-weight': '600', color: '#059669' }}>✨ Schedule EIC</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Crédito por Ingreso Ganado
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: '#faf5ff', 'border-radius': '0.5rem', border: '1px solid #a855f7' }}>
            <div style={{ 'font-weight': '600', color: '#9333ea' }}>🏠 Schedule E</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Ingresos Suplementarios (Alquileres)
            </div>
          </div>
        </div>
      </div>

      {/* Schedule A - Itemized Deductions */}
      <ScheduleA
        form1098s={props.formData.form1098s || []}
        deductions={props.formData.deductions}
        mortgageInterestPaid={props.calculationResult.mortgageInterestPaid}
        propertyTaxesPaid={props.calculationResult.propertyTaxesPaid}
        standardDeduction={props.calculationResult.standardDeduction}
        totalItemizedDeductions={props.calculationResult.totalItemizedDeductions}
        deductionUsed={props.calculationResult.deductionUsed}
      />

      {/* Schedule B - Interest and Dividends */}
      <ScheduleB form1099s={props.formData.form1099s} />

      {/* Schedule C */}
      <ScheduleC formData={props.formData} />

      {/* Schedule SE */}
      <ScheduleSE
        netSelfEmploymentIncome={props.calculationResult.netSelfEmploymentIncome}
        w2SocialSecurityWages={props.formData.w2Forms.reduce((sum, w2) => sum + w2.socialSecurityWages, 0)}
      />

      {/* Form 8995 */}
      <Form8995
        netSelfEmploymentIncome={props.calculationResult.netSelfEmploymentIncome}
        selfEmploymentTaxDeduction={props.calculationResult.selfEmploymentTaxDeduction}
        adjustedGrossIncome={props.calculationResult.adjustedGrossIncome}
        standardDeduction={props.calculationResult.standardDeduction}
        filingStatus={props.formData.customerInfo.filingStatus}
        businessName="Delivery Driver"
      />

      {/* Schedule 8812 */}
      <Schedule8812
        adjustedGrossIncome={props.calculationResult.adjustedGrossIncome}
        filingStatus={props.formData.customerInfo.filingStatus}
        dependents={props.formData.customerInfo.dependents}
        earnedIncome={props.calculationResult.totalW2Income + props.calculationResult.netSelfEmploymentIncome}
        federalTaxLiability={props.calculationResult.federalTaxLiability}
        totalWithheld={props.calculationResult.totalWithheld}
        earnedIncomeCredit={props.calculationResult.earnedIncomeCredit}
      />

      {/* Form 8863 - Education Credits */}
      <Form8863
        form1098Ts={props.formData.form1098Ts || []}
        adjustedGrossIncome={props.calculationResult.adjustedGrossIncome}
        filingStatus={props.formData.customerInfo.filingStatus}
        americanOpportunityCredit={props.calculationResult.americanOpportunityCredit}
        americanOpportunityCreditRefundable={props.calculationResult.americanOpportunityCreditRefundable}
        lifetimeLearningCredit={props.calculationResult.lifetimeLearningCredit}
      />

      {/* Form 8880 - Retirement Savings Credit */}
      <Form8880
        adjustedGrossIncome={props.calculationResult.adjustedGrossIncome}
        filingStatus={props.formData.customerInfo.filingStatus}
        retirementContributions={
          props.formData.retirementContributions?.reduce((sum, rc) => sum + rc.amount, 0) || 0
        }
        spouseRetirementContributions={0}
        age={props.formData.customerInfo.age || 35}
        spouseAge={props.formData.customerInfo.filingStatus === 'married_joint' ? 35 : undefined}
        isFullTimeStudent={props.formData.customerInfo.isFullTimeStudent || false}
        spouseIsFullTimeStudent={false}
        isClaimedAsDependent={props.formData.customerInfo.isClaimedAsDependent || false}
      />

      {/* Schedule E - Supplemental Income */}
      <ScheduleE
        rentalProperties={props.formData.rentalProperties || []}
        partnershipIncomes={props.formData.partnershipIncomes || []}
        estateIncomes={props.formData.estateIncomes || []}
      />

      {/* Schedule 1 Summary */}
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
          📝 SCHEDULE 1 - Additional Income and Adjustments to Income
        </h3>

        <div style={{ 'margin-bottom': '1.5rem' }}>
          <h4 style={{ color: '#2563eb', 'margin-bottom': '1rem' }}>Parte I - Ingresos Adicionales</h4>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
            <div style={{ 'font-weight': '500' }}>
              <strong>Línea 3:</strong> Ingreso del Negocio (de Schedule C)
            </div>
            <div style={{ 'font-weight': '600', color: '#2563eb' }}>
              ${props.calculationResult.netSelfEmploymentIncome.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.75rem', background: '#eff6ff', 'border-radius': '0.5rem', 'margin-top': '0.5rem' }}>
            <div style={{ 'font-weight': '600' }}>
              <strong>Línea 10:</strong> Total de Ingresos Adicionales
            </div>
            <div style={{ 'font-weight': '700', color: '#2563eb' }}>
              ${props.calculationResult.netSelfEmploymentIncome.toLocaleString()}
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ color: '#2563eb', 'margin-bottom': '1rem' }}>Parte II - Ajustes al Ingreso</h4>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
            <div style={{ 'font-weight': '500' }}>
              <strong>Línea 15:</strong> Deducción del Impuesto de Trabajo por Cuenta Propia
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'font-style': 'italic', 'margin-left': '1rem' }}>
                50% del SE Tax de Schedule SE
              </div>
            </div>
            <div style={{ 'font-weight': '600', color: '#10b981' }}>
              ${props.calculationResult.selfEmploymentTaxDeduction.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.75rem', background: '#f0fdf4', 'border-radius': '0.5rem', 'margin-top': '0.5rem' }}>
            <div style={{ 'font-weight': '600' }}>
              <strong>Línea 26:</strong> Total de Ajustes al Ingreso
            </div>
            <div style={{ 'font-weight': '700', color: '#10b981' }}>
              ${props.calculationResult.selfEmploymentTaxDeduction.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ background: '#eff6ff', padding: '1rem', 'border-radius': '0.5rem', 'margin-top': '1rem', border: '1px solid #3b82f6' }}>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            <div><strong>Schedule 1</strong> reporta ingresos adicionales y ajustes que no están incluidos directamente en el Form 1040.</div>
            <div style={{ 'margin-top': '0.5rem' }}>• <strong>Parte I:</strong> Añade ingreso del negocio (${ props.calculationResult.netSelfEmploymentIncome.toLocaleString()}) al Form 1040, línea 8</div>
            <div>• <strong>Parte II:</strong> Reduce el AGI por ${props.calculationResult.selfEmploymentTaxDeduction.toLocaleString()} (deducción del SE tax)</div>
          </div>
        </div>
      </div>

      {/* Schedule 2 Summary */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': 'var(--border-radius-sm)',
        'margin-bottom': '1.5rem',
        border: '2px solid #ef4444'
      }}>
        <h3 style={{
          'margin-top': '0',
          'margin-bottom': '1rem',
          color: '#dc2626',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          💰 SCHEDULE 2 - Additional Taxes
        </h3>

        <div>
          <h4 style={{ color: '#dc2626', 'margin-bottom': '1rem' }}>Parte II - Otros Impuestos</h4>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
            <div style={{ 'font-weight': '500' }}>
              <strong>Línea 4:</strong> Impuesto de Trabajo por Cuenta Propia
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'font-style': 'italic', 'margin-left': '1rem' }}>
                De Schedule SE, línea 12
              </div>
            </div>
            <div style={{ 'font-weight': '600', color: '#dc2626' }}>
              ${props.calculationResult.selfEmploymentTax.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.75rem', background: '#fef2f2', 'border-radius': '0.5rem', 'margin-top': '0.5rem' }}>
            <div style={{ 'font-weight': '600' }}>
              <strong>Línea 21:</strong> Total de Otros Impuestos
              <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
                ⮕ Se suma al Form 1040, línea 23 (Total Tax)
              </div>
            </div>
            <div style={{ 'font-weight': '700', color: '#dc2626' }}>
              ${props.calculationResult.selfEmploymentTax.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ background: '#fef2f2', padding: '1rem', 'border-radius': '0.5rem', 'margin-top': '1rem', border: '1px solid #ef4444' }}>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            <div><strong>Schedule 2</strong> reporta impuestos adicionales que no están incluidos en el cálculo del impuesto sobre la renta.</div>
            <div style={{ 'margin-top': '0.5rem' }}>• El impuesto de trabajo por cuenta propia (${props.calculationResult.selfEmploymentTax.toLocaleString()}) se añade al impuesto federal</div>
            <div>• Este impuesto cubre Seguro Social (12.4%) y Medicare (2.9%) para trabajadores por cuenta propia</div>
          </div>
        </div>
      </div>

      {/* Schedule EIC Summary */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        'border-radius': 'var(--border-radius-sm)',
        'margin-bottom': '1.5rem',
        border: '2px solid #10b981'
      }}>
        <h3 style={{
          'margin-top': '0',
          'margin-bottom': '1rem',
          color: '#059669',
          display: 'flex',
          'align-items': 'center',
          gap: '0.5rem'
        }}>
          ✨ SCHEDULE EIC - Earned Income Credit
        </h3>

        <div style={{ 'margin-bottom': '1.5rem' }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
            <div style={{ 'font-weight': '500' }}>
              Número de Hijos Calificados
            </div>
            <div style={{ 'font-weight': '600', color: '#059669' }}>
              {props.formData.customerInfo.dependents}
            </div>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
            <div style={{ 'font-weight': '500' }}>
              Ingreso Ganado (Earned Income)
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                Salarios W-2 + Ganancia Neta del Negocio
              </div>
            </div>
            <div style={{ 'font-weight': '600', color: '#059669' }}>
              ${(props.calculationResult.totalW2Income + props.calculationResult.netSelfEmploymentIncome).toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
            <div style={{ 'font-weight': '500' }}>
              Ingreso Bruto Ajustado (AGI)
            </div>
            <div style={{ 'font-weight': '600', color: '#059669' }}>
              ${props.calculationResult.adjustedGrossIncome.toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', 'justify-content': 'space-between', padding: '0.75rem', background: '#ecfdf5', 'border-radius': '0.5rem', 'margin-top': '0.5rem' }}>
            <div style={{ 'font-weight': '600' }}>
              Crédito por Ingreso Ganado (EIC)
              <div style={{ 'font-size': '0.875rem', 'font-weight': '400', 'margin-top': '0.25rem' }}>
                ⮕ Ingrese en Form 1040, línea 27
              </div>
            </div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem', color: '#059669' }}>
              ${props.calculationResult.earnedIncomeCredit.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ background: '#ecfdf5', padding: '1rem', 'border-radius': '0.5rem', 'margin-top': '1rem', border: '1px solid #10b981' }}>
          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', color: '#059669' }}>
            💡 ¿Qué es el Crédito por Ingreso Ganado (EIC)?
          </div>
          <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            <div>El EIC es un crédito tributario <strong>REEMBOLSABLE</strong> para trabajadores de ingresos bajos a moderados.</div>
            <div style={{ 'margin-top': '0.5rem' }}>• Diseñado para reducir la pobreza y fomentar el trabajo</div>
            <div>• El monto aumenta con más hijos calificados</div>
            <div>• Con {props.formData.customerInfo.dependents} hijos calificados, su EIC es ${props.calculationResult.earnedIncomeCredit.toLocaleString()}</div>
            <div>• Este crédito se puede recibir como reembolso, incluso si no debe impuestos</div>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1.5rem',
        'border-radius': 'var(--border-radius-sm)',
        'margin-top': '2rem'
      }}>
        <h3 style={{ 'margin-top': '0', 'margin-bottom': '1rem' }}>
          📊 Resumen de Todos los Formularios
        </h3>
        <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Deducciones Detalladas (Sch A)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${props.calculationResult.totalItemizedDeductions.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Ingreso del Negocio (Sch C)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${props.calculationResult.netSelfEmploymentIncome.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Impuesto SE (Sch SE)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${props.calculationResult.selfEmploymentTax.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Deducción QBI (Form 8995)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${props.calculationResult.qbiDeduction.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Child Tax Credit (Sch 8812)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${(props.calculationResult.childTaxCredit + props.calculationResult.additionalChildTaxCredit).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Créditos Educativos (Form 8863)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${(props.calculationResult.americanOpportunityCredit + props.calculationResult.lifetimeLearningCredit).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>EIC (Sch EIC)</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.1rem' }}>
              ${props.calculationResult.earnedIncomeCredit.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ opacity: '0.9', 'font-size': '0.875rem' }}>Reembolso Total</div>
            <div style={{ 'font-weight': '700', 'font-size': '1.25rem' }}>
              ${props.calculationResult.refundAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllSchedules;
