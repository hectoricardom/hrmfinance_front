/**
 * TaxClientExplainer — Visual, bilingual (ES/EN) educational tax breakdown
 * Shows clients how their taxes work: income, deductions, brackets, credits,
 * Schedule C (when applicable), and final result.
 * Dark theme matching EICCurveChart.
 */

import { Component, Show, For, createMemo } from 'solid-js';
import type { TaxPortal, DrakeTaxDocument, FilingStatus } from '../../../types/drakeTypes';
import type { TaxStrategyData } from '../../../types/taxStrategyTypes';
import type { ACTCCalculationResult } from './creditCalculator';
import type { CreditCalculationResult, EICCalculationResult } from './creditCalculator';

// ---------- Props ----------

interface TaxClientExplainerProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  creditResults: {
    childCredit: CreditCalculationResult;
    eic: EICCalculationResult;
    actc: ACTCCalculationResult;
    agi: number;
  } | null;
  strategyData: TaxStrategyData;
}

// ---------- Self-contained helpers ----------

interface IncomeSource {
  type: string;
  payer: string;
  amount: number;
  withholding: number;
}

function computeIncomeBreakdown(docs: DrakeTaxDocument[], strategyData: TaxStrategyData) {
  const sources: IncomeSource[] = [];
  let totalWithholding = 0;

  for (const doc of docs) {
    if (!doc.extractedAmounts) continue;
    const payer = doc.payerInfo?.name || doc.originalFileName || 'Unknown';

    if (doc.drakeFormType === 'w2') {
      const amt = doc.extractedAmounts.wages ?? 0;
      const wh = doc.extractedAmounts.federalTaxWithheld ?? 0;
      if (amt > 0) sources.push({ type: 'W-2', payer, amount: amt, withholding: wh });
      totalWithholding += wh;
    } else if (doc.drakeFormType === '1099_nec') {
      const amt = doc.extractedAmounts.nonEmployeeCompensation ?? 0;
      if (amt > 0) sources.push({ type: '1099-NEC', payer, amount: amt, withholding: 0 });
    } else if (doc.drakeFormType === '1099_int') {
      const amt = doc.extractedAmounts.interestIncome ?? 0;
      if (amt > 0) sources.push({ type: '1099-INT', payer, amount: amt, withholding: 0 });
    } else if (doc.drakeFormType === '1099_div') {
      const amt = doc.extractedAmounts.ordinaryDividends ?? 0;
      if (amt > 0) sources.push({ type: '1099-DIV', payer, amount: amt, withholding: 0 });
    } else if (doc.drakeFormType === '1099_misc') {
      const misc = (doc.extractedAmounts as any).miscellaneousIncome ?? 0;
      const rents = doc.extractedAmounts.rents ?? 0;
      const royalties = doc.extractedAmounts.royalties ?? 0;
      const total = misc + rents + royalties;
      if (total > 0) sources.push({ type: '1099-MISC', payer, amount: total, withholding: 0 });
    }
  }

  // Other income from strategy checklist
  let otherTotal = 0;
  if (strategyData?.otherIncome?.additionalIncome) {
    const items = strategyData.otherIncome.additionalIncome;
    const labels: Record<string, string> = {
      socialSecurity: 'Social Security',
      pension: 'Pension',
      annuity: 'Annuity',
      ira: 'IRA Distribution',
      unemployment: 'Unemployment',
      alimony: 'Alimony',
      gambling: 'Gambling',
      juryDuty: 'Jury Duty',
      prizeAwards: 'Prizes/Awards',
      cryptoIncome: 'Crypto Income',
      stockSales: 'Stock Sales',
      rentalRoyalties: 'Rental/Royalties',
    };
    for (const [key, item] of Object.entries(items)) {
      if (item.checked && item.amount && item.amount > 0) {
        otherTotal += item.amount;
        sources.push({ type: 'Other', payer: labels[key] || key, amount: item.amount, withholding: 0 });
      }
    }
  }

  const docTotal = sources.reduce((s, src) => s + src.amount, 0);
  return { sources, totalIncome: docTotal, totalWithholding, otherTotal };
}

function getStandardDeduction(filingStatus: FilingStatus | undefined, taxYear: number): number {
  const year = taxYear || 2024;
  if (year === 2025) {
    switch (filingStatus) {
      case 'married_filing_jointly': case 'qualifying_widow': return 30000;
      case 'head_of_household': return 22500;
      case 'married_filing_separately': return 15000;
      default: return 15000;
    }
  }
  // 2024
  switch (filingStatus) {
    case 'married_filing_jointly': case 'qualifying_widow': return 29200;
    case 'head_of_household': return 21900;
    case 'married_filing_separately': return 14600;
    default: return 14600;
  }
}

interface BracketSegment {
  rate: number;
  rangeStart: number;
  rangeEnd: number;
  taxable: number;
  tax: number;
}

function computeTaxFromBrackets(taxableIncome: number, filingStatus: FilingStatus | undefined, taxYear: number): { segments: BracketSegment[]; totalTax: number } {
  // 2024 brackets
  const brackets2024: Record<string, [number, number][]> = {
    single: [[0.10, 11600], [0.12, 47150], [0.22, 100525], [0.24, 191950], [0.32, 243725], [0.35, 609350], [0.37, Infinity]],
    married_filing_jointly: [[0.10, 23200], [0.12, 94300], [0.22, 201050], [0.24, 383900], [0.32, 487450], [0.35, 731200], [0.37, Infinity]],
    married_filing_separately: [[0.10, 11600], [0.12, 47150], [0.22, 100525], [0.24, 191950], [0.32, 243725], [0.35, 365600], [0.37, Infinity]],
    head_of_household: [[0.10, 16550], [0.12, 63100], [0.22, 100500], [0.24, 191950], [0.32, 243700], [0.35, 609350], [0.37, Infinity]],
    qualifying_widow: [[0.10, 23200], [0.12, 94300], [0.22, 201050], [0.24, 383900], [0.32, 487450], [0.35, 731200], [0.37, Infinity]],
  };
  // 2025 brackets
  const brackets2025: Record<string, [number, number][]> = {
    single: [[0.10, 11925], [0.12, 48475], [0.22, 103350], [0.24, 197300], [0.32, 250525], [0.35, 626350], [0.37, Infinity]],
    married_filing_jointly: [[0.10, 23850], [0.12, 96950], [0.22, 206700], [0.24, 394600], [0.32, 501050], [0.35, 751600], [0.37, Infinity]],
    married_filing_separately: [[0.10, 11925], [0.12, 48475], [0.22, 103350], [0.24, 197300], [0.32, 250525], [0.35, 375800], [0.37, Infinity]],
    head_of_household: [[0.10, 17000], [0.12, 64850], [0.22, 103350], [0.24, 197300], [0.32, 250500], [0.35, 626350], [0.37, Infinity]],
    qualifying_widow: [[0.10, 23850], [0.12, 96950], [0.22, 206700], [0.24, 394600], [0.32, 501050], [0.35, 751600], [0.37, Infinity]],
  };

  const table = taxYear === 2025 ? brackets2025 : brackets2024;
  const key = filingStatus || 'single';
  const rows = table[key] || table['single'];

  const segments: BracketSegment[] = [];
  let remaining = Math.max(0, taxableIncome);
  let prev = 0;

  for (const [rate, ceiling] of rows) {
    if (remaining <= 0) break;
    const bracketSize = ceiling - prev;
    const taxable = Math.min(remaining, bracketSize);
    const tax = Math.round(taxable * rate);
    segments.push({ rate, rangeStart: prev, rangeEnd: prev + taxable, taxable, tax });
    remaining -= taxable;
    prev = ceiling;
  }

  const totalTax = segments.reduce((s, seg) => s + seg.tax, 0);
  return { segments, totalTax };
}

function getFilingStatusLabels(filingStatus: FilingStatus | undefined): { es: string; en: string } {
  switch (filingStatus) {
    case 'married_filing_jointly': return { es: 'Casado Declarando Juntos', en: 'Married Filing Jointly' };
    case 'married_filing_separately': return { es: 'Casado Declarando Separado', en: 'Married Filing Separately' };
    case 'head_of_household': return { es: 'Jefe de Familia', en: 'Head of Household' };
    case 'qualifying_widow': return { es: 'Viudo(a) Calificado(a)', en: 'Qualifying Widow(er)' };
    default: return { es: 'Soltero', en: 'Single' };
  }
}

function getBusinessExpenseSummary(strategyData: TaxStrategyData, taxYear: number) {
  const be = strategyData.businessExpenses;
  if (!be) return { items: [] as { label: string; labelEn: string; amount: number }[], total: 0 };

  const items: { label: string; labelEn: string; amount: number }[] = [];
  const mileageRate = taxYear === 2025 ? 0.70 : 0.67;

  // Vehicle mileage
  for (const v of be.vehicles || []) {
    if (v.businessMilesDriven > 0) {
      if (v.deductionMethod === 'standard_mileage') {
        const amt = Math.round(v.businessMilesDriven * mileageRate);
        items.push({
          label: `${v.businessMilesDriven.toLocaleString()} millas × $${mileageRate}`,
          labelEn: `${v.businessMilesDriven.toLocaleString()} miles × $${mileageRate}`,
          amount: amt,
        });
      }
    }
  }

  // Meals at 50%
  if (be.meals) {
    let mealTotal = 0;
    for (const item of Object.values(be.meals)) {
      if (item.checked && item.amount) mealTotal += item.amount;
    }
    if (mealTotal > 0) {
      items.push({ label: `Comidas de negocio (50%)`, labelEn: `Business meals (50%)`, amount: Math.round(mealTotal * 0.5) });
    }
  }

  // Home office
  if (be.homeOffice) {
    if (be.homeOffice.calculationMethod === 'simplified') {
      const sqft = Math.min(be.homeOffice.simplifiedSquareFootage || 0, 300);
      if (sqft > 0) {
        items.push({ label: `Oficina en casa: ${sqft} sqft × $5`, labelEn: `Home office: ${sqft} sqft × $5`, amount: sqft * 5 });
      }
    } else {
      let amt = 0;
      if (be.homeOffice.directExpenses) {
        for (const item of Object.values(be.homeOffice.directExpenses)) {
          if (item.checked && item.amount) amt += item.amount;
        }
      }
      if (be.homeOffice.indirectExpenses && be.homeOffice.businessUsePercentage) {
        let indirect = 0;
        for (const item of Object.values(be.homeOffice.indirectExpenses)) {
          if (item.checked && item.amount) indirect += item.amount;
        }
        amt += Math.round(indirect * (be.homeOffice.businessUsePercentage / 100));
      }
      if (amt > 0) items.push({ label: `Oficina en casa (método regular)`, labelEn: `Home office (regular method)`, amount: amt });
    }
  }

  // Other categories
  const categoryLabels: Record<string, { es: string; en: string }> = {
    operations: { es: 'Operaciones', en: 'Operations' },
    office: { es: 'Oficina', en: 'Office' },
    travel: { es: 'Viaje', en: 'Travel' },
    equipment: { es: 'Equipo', en: 'Equipment' },
    education: { es: 'Educación', en: 'Education' },
    labor: { es: 'Empleados', en: 'Labor' },
    facilityExpenses: { es: 'Local/Instalaciones', en: 'Facility' },
    marketing: { es: 'Marketing', en: 'Marketing' },
    insurance: { es: 'Seguros', en: 'Insurance' },
    other: { es: 'Otros', en: 'Other' },
  };

  const groups = ['operations', 'office', 'travel', 'equipment', 'education', 'labor', 'facilityExpenses', 'marketing', 'insurance', 'other'] as const;
  for (const gk of groups) {
    const group = (be as any)[gk];
    if (!group) continue;
    let sum = 0;
    for (const item of Object.values(group) as any[]) {
      if (item && item.checked && item.amount) sum += item.amount;
    }
    if (sum > 0) {
      const lbl = categoryLabels[gk] || { es: gk, en: gk };
      items.push({ label: lbl.es, labelEn: lbl.en, amount: sum });
    }
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { items, total };
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

// ---------- Styles (dark theme) ----------

const containerStyle = {
  background: 'linear-gradient(145deg, #0a0f1a 0%, #111827 50%, #0d1520 100%)',
  'border-radius': '12px',
  padding: '28px 24px',
  color: '#e2e8f0',
  'font-family': "'DM Sans', -apple-system, sans-serif",
};

const sectionStyle = {
  'margin-bottom': '28px',
};

const sectionTitleStyle = {
  'font-size': '13px',
  'font-weight': '700',
  'letter-spacing': '0.08em',
  'text-transform': 'uppercase' as const,
  color: '#63d297',
  'margin-bottom': '4px',
};

const sectionSubtitleStyle = {
  'font-size': '11px',
  color: '#64748b',
  'margin-bottom': '14px',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  'border-radius': '10px',
  padding: '16px',
};

const badgeStyle = (color: string) => ({
  display: 'inline-block',
  background: `linear-gradient(135deg, ${color}22, ${color}11)`,
  border: `1px solid ${color}44`,
  'border-radius': '20px',
  padding: '4px 12px',
  'font-size': '11px',
  'font-weight': '600',
  'letter-spacing': '0.06em',
  'text-transform': 'uppercase' as const,
  color,
});

// ---------- Component ----------

const TaxClientExplainer: Component<TaxClientExplainerProps> = (props) => {
  const taxYear = () => props.client.taxYear || 2024;
  const filingStatus = () => props.client.filingStatus || 'single' as FilingStatus;
  const statusLabels = createMemo(() => getFilingStatusLabels(filingStatus()));

  const income = createMemo(() => computeIncomeBreakdown(props.documents, props.strategyData));
  const maxSourceAmount = createMemo(() => {
    const max = Math.max(...income().sources.map(s => s.amount), 1);
    return max;
  });

  const standardDeduction = createMemo(() => getStandardDeduction(filingStatus(), taxYear()));
  const taxableIncome = createMemo(() => Math.max(0, income().totalIncome - standardDeduction()));

  const brackets = createMemo(() => computeTaxFromBrackets(taxableIncome(), filingStatus(), taxYear()));
  const maxBracketTax = createMemo(() => Math.max(...brackets().segments.map(s => s.tax), 1));

  // Schedule C visibility
  const has1099NEC = createMemo(() => props.documents.some(d => d.drakeFormType === '1099_nec' || d.drakeFormType === '1099_misc'));
  const hasBusinessExpenses = createMemo(() => {
    const be = props.strategyData?.businessExpenses;
    if (!be) return false;
    // Check if any vehicle has miles or any expense category is checked
    if (be.vehicles?.some(v => v.businessMilesDriven > 0)) return true;
    const groups = ['operations', 'office', 'travel', 'meals', 'equipment', 'education', 'labor', 'facilityExpenses', 'marketing', 'insurance', 'other'] as const;
    for (const gk of groups) {
      const group = (be as any)[gk];
      if (!group) continue;
      for (const item of Object.values(group) as any[]) {
        if (item && item.checked) return true;
      }
    }
    return false;
  });
  const showScheduleC = createMemo(() => has1099NEC() || hasBusinessExpenses());

  const scheduleCIncome = createMemo(() => {
    let total = 0;
    for (const doc of props.documents) {
      if (doc.drakeFormType === '1099_nec') total += doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
      if (doc.drakeFormType === '1099_misc') total += (doc.extractedAmounts as any)?.miscellaneousIncome ?? 0;
    }
    return total;
  });

  const businessExpenses = createMemo(() => getBusinessExpenseSummary(props.strategyData, taxYear()));
  const netProfit = createMemo(() => Math.max(0, scheduleCIncome() - businessExpenses().total));
  const seTax = createMemo(() => Math.round(netProfit() * 0.9235 * 0.153));
  const seDeduction = createMemo(() => Math.round(seTax() / 2));

  // Result
  const totalCredits = createMemo(() => {
    if (!props.creditResults) return 0;
    return props.creditResults.actc.nonRefundableCTC + props.creditResults.actc.refundableACTC + props.creditResults.eic.creditAmount;
  });

  const computedTax = createMemo(() => brackets().totalTax);
  const withholding = createMemo(() => income().totalWithholding);
  const resultAmount = createMemo(() => computedTax() - withholding() - totalCredits());

  // Dependents info
  const dependents = createMemo(() => props.client.dependents || []);
  const qualifyingChildrenNames = createMemo(() => {
    const endOfYear = new Date(taxYear(), 11, 31);
    return dependents().filter(d => {
      if (!['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 'grandchild'].includes(d.relationship)) return false;
      if (!d.dateOfBirth) return true;
      const dob = new Date(d.dateOfBirth);
      const age = endOfYear.getFullYear() - dob.getFullYear() - (endOfYear < new Date(endOfYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      return age < 17;
    }).map(d => {
      let age: number | null = null;
      if (d.dateOfBirth) {
        const dob = new Date(d.dateOfBirth);
        const endOfYear2 = new Date(taxYear(), 11, 31);
        age = endOfYear2.getFullYear() - dob.getFullYear() - (endOfYear2 < new Date(endOfYear2.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      }
      return { name: `${d.firstName} ${d.lastName}`, age };
    });
  });

  return (
    <div style={containerStyle}>
      {/* No-data guard */}
      <Show when={!props.creditResults}>
        <div style={{
          ...cardStyle,
          'text-align': 'center',
          padding: '40px 20px',
        }}>
          <div style={{ 'font-size': '36px', 'margin-bottom': '12px' }}>&#x1F4CA;</div>
          <div style={{ 'font-size': '16px', 'font-weight': '600', color: '#e2e8f0', 'margin-bottom': '8px' }}>
            Primero calcule los créditos
          </div>
          <div style={{ 'font-size': '13px', color: '#94a3b8' }}>
            Vaya a <span style={{ color: '#63d297', 'font-weight': '600' }}>Credits</span> y haga clic en <span style={{ color: '#22c55e', 'font-weight': '600' }}>Calculate Credits</span> para generar este reporte.
          </div>
          <div style={{ 'font-size': '11px', color: '#64748b', 'margin-top': '4px' }}>
            Go to Credits and click Calculate Credits to generate this report.
          </div>
        </div>
      </Show>

      <Show when={props.creditResults}>
        {/* Section 0: Header */}
        <div style={{ 'margin-bottom': '24px' }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'flex-wrap': 'wrap', 'margin-bottom': '8px' }}>
            <span style={badgeStyle('#63d297')}>Tax Year {taxYear()}</span>
            <span style={badgeStyle('#3b82f6')}>{statusLabels().es}</span>
          </div>
          <h2 style={{
            'font-size': 'clamp(24px, 4vw, 34px)',
            'font-weight': '700',
            margin: '8px 0 2px',
            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
            '-webkit-background-clip': 'text',
            '-webkit-text-fill-color': 'transparent',
            'line-height': '1.15',
          }}>
            {props.client.firstName} {props.client.lastName}
          </h2>
          <p style={{ color: '#64748b', 'font-size': '13px', margin: '0' }}>
            Explicación de su declaración de impuestos · Tax Return Explanation
          </p>
        </div>

        {/* Section 1: Income */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>SUS INGRESOS</div>
          <div style={sectionSubtitleStyle}>Your Income</div>
          <div style={cardStyle}>
            <For each={income().sources}>
              {(src) => (
                <div style={{ 'margin-bottom': '10px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '4px' }}>
                    <div>
                      <span style={{ 'font-size': '11px', 'font-weight': '600', color: '#3b82f6', 'margin-right': '8px' }}>{src.type}</span>
                      <span style={{ 'font-size': '13px', color: '#cbd5e1' }}>{src.payer}</span>
                    </div>
                    <span style={{ 'font-size': '14px', 'font-weight': '700', color: '#e2e8f0', 'font-family': 'monospace' }}>{fmt(src.amount)}</span>
                  </div>
                  {/* SVG bar */}
                  <svg width="100%" height="10" style={{ display: 'block' }}>
                    <rect x="0" y="0" width="100%" height="10" rx="5" fill="rgba(255,255,255,0.04)" />
                    <rect x="0" y="0" width={`${Math.max(2, (src.amount / maxSourceAmount()) * 100)}%`} height="10" rx="5" fill={src.type === 'W-2' ? '#3b82f6' : src.type.includes('1099') ? '#f59e0b' : '#8b5cf6'} opacity="0.7" />
                  </svg>
                </div>
              )}
            </For>

            <div style={{ 'border-top': '1px solid rgba(255,255,255,0.08)', 'padding-top': '10px', 'margin-top': '6px', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
              <span style={{ 'font-size': '13px', 'font-weight': '600', color: '#94a3b8' }}>Total de Ingresos / Total Income</span>
              <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#e2e8f0', 'font-family': 'monospace' }}>{fmt(income().totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Deduction */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>DEDUCCIÓN ESTÁNDAR</div>
          <div style={sectionSubtitleStyle}>Standard Deduction</div>
          <div style={{ display: 'grid', 'grid-template-columns': '1fr auto 1fr auto 1fr', 'align-items': 'center', gap: '8px' }}>
            {/* Total income box */}
            <div style={{ ...cardStyle, 'text-align': 'center' }}>
              <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Ingresos</div>
              <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#e2e8f0', 'font-family': 'monospace' }}>{fmt(income().totalIncome)}</div>
            </div>
            <div style={{ 'font-size': '22px', 'font-weight': '700', color: '#ef4444' }}>−</div>
            {/* Deduction box */}
            <div style={{ ...cardStyle, 'text-align': 'center', 'border-color': 'rgba(99,210,151,0.15)' }}>
              <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Deducción</div>
              <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#63d297', 'font-family': 'monospace' }}>{fmt(standardDeduction())}</div>
            </div>
            <div style={{ 'font-size': '22px', 'font-weight': '700', color: '#94a3b8' }}>=</div>
            {/* Taxable income box */}
            <div style={{ ...cardStyle, 'text-align': 'center', 'border-color': 'rgba(59,130,246,0.2)' }}>
              <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Gravable</div>
              <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#3b82f6', 'font-family': 'monospace' }}>{fmt(taxableIncome())}</div>
            </div>
          </div>
          <p style={{ 'font-size': '12px', color: '#94a3b8', 'margin-top': '10px', 'line-height': '1.6' }}>
            El gobierno le permite restar {fmt(standardDeduction())} antes de calcular impuestos.
            <br />
            <span style={{ color: '#64748b' }}>The government lets you subtract {fmt(standardDeduction())} before calculating taxes.</span>
          </p>
        </div>

        {/* Section 3: Tax Brackets */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>ESCALONES DE IMPUESTOS</div>
          <div style={sectionSubtitleStyle}>Tax Brackets</div>
          <div style={cardStyle}>
            <For each={brackets().segments}>
              {(seg) => (
                <div style={{ 'margin-bottom': '8px' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '3px' }}>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        'min-width': '42px',
                        'font-size': '12px',
                        'font-weight': '700',
                        color: seg.rate <= 0.12 ? '#63d297' : seg.rate <= 0.22 ? '#f59e0b' : '#ef4444',
                        'font-family': 'monospace',
                      }}>
                        {(seg.rate * 100).toFixed(0)}%
                      </span>
                      <span style={{ 'font-size': '11px', color: '#64748b' }}>
                        {fmt(seg.rangeStart)} – {fmt(seg.rangeEnd)}
                      </span>
                    </div>
                    <span style={{ 'font-size': '13px', 'font-weight': '600', color: '#e2e8f0', 'font-family': 'monospace' }}>
                      {fmt(seg.tax)}
                    </span>
                  </div>
                  <svg width="100%" height="8" style={{ display: 'block' }}>
                    <rect x="0" y="0" width="100%" height="8" rx="4" fill="rgba(255,255,255,0.03)" />
                    <rect x="0" y="0" width={`${Math.max(2, (seg.tax / maxBracketTax()) * 100)}%`} height="8" rx="4"
                      fill={seg.rate <= 0.12 ? '#63d297' : seg.rate <= 0.22 ? '#f59e0b' : '#ef4444'} opacity="0.6"
                    />
                  </svg>
                </div>
              )}
            </For>

            <div style={{ 'border-top': '1px solid rgba(255,255,255,0.08)', 'padding-top': '10px', 'margin-top': '6px', display: 'flex', 'justify-content': 'space-between' }}>
              <span style={{ 'font-size': '13px', 'font-weight': '600', color: '#94a3b8' }}>Total de Impuesto / Total Tax</span>
              <span style={{ 'font-size': '18px', 'font-weight': '700', color: '#e2e8f0', 'font-family': 'monospace' }}>{fmt(brackets().totalTax)}</span>
            </div>
          </div>
          <p style={{ 'font-size': '12px', color: '#94a3b8', 'margin-top': '10px', 'line-height': '1.6' }}>
            Los impuestos son progresivos — cada escalón aplica solo a la porción de ingresos dentro de ese rango, no al total.
            <br />
            <span style={{ color: '#64748b' }}>Taxes are progressive — each bracket only applies to the portion of income within that range, not your total.</span>
          </p>
        </div>

        {/* Section 4: Credits */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>CRÉDITOS</div>
          <div style={sectionSubtitleStyle}>Credits</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {/* Child Tax Credit */}
            <div style={{ ...cardStyle, 'border-left': `3px solid ${props.creditResults!.childCredit.creditAmount > 0 ? '#22c55e' : '#475569'}` }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '6px' }}>
                    <span style={{
                      width: '24px', height: '24px', 'border-radius': '50%',
                      background: props.creditResults!.childCredit.creditAmount > 0 ? '#22c55e' : '#475569',
                      display: 'flex', 'align-items': 'center', 'justify-content': 'center',
                      'font-size': '13px', color: 'white', 'font-weight': '700', 'flex-shrink': '0',
                    }}>
                      {props.creditResults!.childCredit.creditAmount > 0 ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0' }}>
                      Crédito por Hijos / Child Tax Credit
                    </span>
                  </div>
                  <Show when={qualifyingChildrenNames().length > 0}>
                    <div style={{ 'margin-left': '32px', 'font-size': '12px', color: '#94a3b8', 'line-height': '1.6' }}>
                      <For each={qualifyingChildrenNames()}>
                        {(child) => (
                          <div>
                            {child.name}{child.age !== null ? ` (${child.age} años)` : ''} — $2,000
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                  <Show when={qualifyingChildrenNames().length === 0}>
                    <div style={{ 'margin-left': '32px', 'font-size': '12px', color: '#64748b' }}>
                      No hay hijos calificados menores de 17 años.
                      <br /><span style={{ color: '#475569' }}>No qualifying children under 17.</span>
                    </div>
                  </Show>
                </div>
                <div style={{ 'text-align': 'right' }}>
                  <span style={{
                    'font-size': '20px', 'font-weight': '700', 'font-family': 'monospace',
                    color: props.creditResults!.childCredit.creditAmount > 0 ? '#22c55e' : '#475569',
                  }}>
                    {fmt(props.creditResults!.actc.nonRefundableCTC + props.creditResults!.actc.refundableACTC)}
                  </span>
                  <Show when={props.creditResults!.actc.refundableACTC > 0}>
                    <div style={{ 'font-size': '11px', color: '#94a3b8', 'margin-top': '2px' }}>
                      <div>CTC: {fmt(props.creditResults!.actc.nonRefundableCTC)}</div>
                      <div style={{ color: '#22c55e' }}>ACTC: {fmt(props.creditResults!.actc.refundableACTC)}</div>
                    </div>
                  </Show>
                </div>
              </div>
            </div>

            {/* EIC */}
            <div style={{ ...cardStyle, 'border-left': `3px solid ${props.creditResults!.eic.creditAmount > 0 ? '#22c55e' : '#475569'}` }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '6px' }}>
                    <span style={{
                      width: '24px', height: '24px', 'border-radius': '50%',
                      background: props.creditResults!.eic.creditAmount > 0 ? '#22c55e' : '#475569',
                      display: 'flex', 'align-items': 'center', 'justify-content': 'center',
                      'font-size': '13px', color: 'white', 'font-weight': '700', 'flex-shrink': '0',
                    }}>
                      {props.creditResults!.eic.creditAmount > 0 ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0' }}>
                      Crédito por Ingreso del Trabajo / Earned Income Credit
                    </span>
                  </div>
                  <div style={{ 'margin-left': '32px', 'font-size': '12px', color: '#94a3b8', 'line-height': '1.6' }}>
                    <Show when={props.creditResults!.eic.creditAmount > 0}>
                      Ingreso ganado: {fmt(props.creditResults!.eic.eligibility.earnedIncome)}, {props.creditResults!.eic.qualifyingChildren} hijo(s) calificado(s).
                      <br /><span style={{ color: '#64748b' }}>Vea la curva EIC en la pestaña Credits. / See the EIC curve in Credits tab.</span>
                    </Show>
                    <Show when={props.creditResults!.eic.creditAmount === 0}>
                      {props.creditResults!.eic.eligibility.reason || 'No califica para este crédito.'}
                      <br /><span style={{ color: '#475569' }}>Does not qualify for this credit.</span>
                    </Show>
                  </div>
                </div>
                <span style={{
                  'font-size': '20px', 'font-weight': '700', 'font-family': 'monospace',
                  color: props.creditResults!.eic.creditAmount > 0 ? '#22c55e' : '#475569',
                }}>
                  {fmt(props.creditResults!.eic.creditAmount)}
                </span>
              </div>
            </div>

            {/* Withholding */}
            <div style={{ ...cardStyle, 'border-left': `3px solid ${withholding() > 0 ? '#3b82f6' : '#475569'}` }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '6px' }}>
                    <span style={{
                      width: '24px', height: '24px', 'border-radius': '50%',
                      background: withholding() > 0 ? '#3b82f6' : '#475569',
                      display: 'flex', 'align-items': 'center', 'justify-content': 'center',
                      'font-size': '13px', color: 'white', 'font-weight': '700', 'flex-shrink': '0',
                    }}>
                      {withholding() > 0 ? '\u2713' : '—'}
                    </span>
                    <span style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0' }}>
                      Retenciones / Withholding
                    </span>
                  </div>
                  <div style={{ 'margin-left': '32px', 'font-size': '12px', color: '#94a3b8', 'line-height': '1.6' }}>
                    <Show when={withholding() > 0}>
                      Sus empleadores ya retuvieron {fmt(withholding())} de sus cheques de pago.
                      <br /><span style={{ color: '#64748b' }}>Your employers already withheld {fmt(withholding())} from your paychecks.</span>
                    </Show>
                    <Show when={withholding() === 0}>
                      No se encontraron retenciones federales.
                      <br /><span style={{ color: '#475569' }}>No federal withholding found.</span>
                    </Show>
                  </div>
                </div>
                <span style={{
                  'font-size': '20px', 'font-weight': '700', 'font-family': 'monospace',
                  color: withholding() > 0 ? '#3b82f6' : '#475569',
                }}>
                  {fmt(withholding())}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Schedule C (conditional) */}
        <Show when={showScheduleC()}>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>TRABAJO INDEPENDIENTE / SCHEDULE C</div>
            <div style={sectionSubtitleStyle}>Self-Employment</div>

            {/* SE Income */}
            <Show when={scheduleCIncome() > 0}>
              <div style={{ ...cardStyle, 'margin-bottom': '12px' }}>
                <div style={{ 'font-size': '12px', 'font-weight': '600', color: '#f59e0b', 'margin-bottom': '8px', 'text-transform': 'uppercase', 'letter-spacing': '0.06em' }}>
                  Ingresos 1099 / Self-Employment Income
                </div>
                <For each={props.documents.filter(d => d.drakeFormType === '1099_nec' || d.drakeFormType === '1099_misc')}>
                  {(doc) => {
                    const amt = doc.drakeFormType === '1099_nec'
                      ? (doc.extractedAmounts?.nonEmployeeCompensation ?? 0)
                      : ((doc.extractedAmounts as any)?.miscellaneousIncome ?? 0) + (doc.extractedAmounts?.rents ?? 0) + (doc.extractedAmounts?.royalties ?? 0);
                    return (
                      <Show when={amt > 0}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '4px' }}>
                          <span style={{ 'font-size': '13px', color: '#cbd5e1' }}>{doc.payerInfo?.name || doc.originalFileName}</span>
                          <span style={{ 'font-size': '14px', 'font-weight': '600', color: '#e2e8f0', 'font-family': 'monospace' }}>{fmt(amt)}</span>
                        </div>
                      </Show>
                    );
                  }}
                </For>
                <div style={{ 'border-top': '1px solid rgba(255,255,255,0.08)', 'padding-top': '8px', 'margin-top': '6px', display: 'flex', 'justify-content': 'space-between' }}>
                  <span style={{ 'font-size': '13px', 'font-weight': '600', color: '#94a3b8' }}>Ingreso Bruto / Gross Income</span>
                  <span style={{ 'font-size': '16px', 'font-weight': '700', color: '#f59e0b', 'font-family': 'monospace' }}>{fmt(scheduleCIncome())}</span>
                </div>
              </div>
            </Show>

            {/* Business Expenses */}
            <Show when={businessExpenses().items.length > 0}>
              <div style={{ ...cardStyle, 'margin-bottom': '12px' }}>
                <div style={{ 'font-size': '12px', 'font-weight': '600', color: '#63d297', 'margin-bottom': '10px', 'text-transform': 'uppercase', 'letter-spacing': '0.06em' }}>
                  Gastos de Negocio / Business Expenses
                </div>
                <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  <For each={businessExpenses().items}>
                    {(item) => (
                      <div style={{
                        background: 'rgba(99,210,151,0.06)',
                        border: '1px solid rgba(99,210,151,0.12)',
                        'border-radius': '8px',
                        padding: '10px 12px',
                      }}>
                        <div style={{ 'font-size': '12px', color: '#94a3b8', 'margin-bottom': '2px' }}>{item.label}</div>
                        <div style={{ 'font-size': '11px', color: '#64748b', 'margin-bottom': '4px' }}>{item.labelEn}</div>
                        <div style={{ 'font-size': '16px', 'font-weight': '700', color: '#63d297', 'font-family': 'monospace' }}>{fmt(item.amount)}</div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Net Profit */}
            <Show when={scheduleCIncome() > 0}>
              <div style={{ display: 'grid', 'grid-template-columns': '1fr auto 1fr auto 1fr', 'align-items': 'center', gap: '8px', 'margin-bottom': '12px' }}>
                <div style={{ ...cardStyle, 'text-align': 'center' }}>
                  <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Ingreso Bruto</div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: '#f59e0b', 'font-family': 'monospace' }}>{fmt(scheduleCIncome())}</div>
                </div>
                <div style={{ 'font-size': '22px', 'font-weight': '700', color: '#ef4444' }}>−</div>
                <div style={{ ...cardStyle, 'text-align': 'center' }}>
                  <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Gastos</div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: '#63d297', 'font-family': 'monospace' }}>{fmt(businessExpenses().total)}</div>
                </div>
                <div style={{ 'font-size': '22px', 'font-weight': '700', color: '#94a3b8' }}>=</div>
                <div style={{ ...cardStyle, 'text-align': 'center', 'border-color': 'rgba(59,130,246,0.2)' }}>
                  <div style={{ 'font-size': '10px', color: '#64748b', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '4px' }}>Ganancia Neta</div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: '#3b82f6', 'font-family': 'monospace' }}>{fmt(netProfit())}</div>
                </div>
              </div>
            </Show>

            {/* SE Tax explanation */}
            <Show when={netProfit() > 0}>
              <div style={{
                ...cardStyle,
                'border-left': '3px solid #f59e0b',
              }}>
                <div style={{ 'font-size': '12px', 'font-weight': '600', color: '#f59e0b', 'margin-bottom': '8px', 'text-transform': 'uppercase', 'letter-spacing': '0.06em' }}>
                  Impuesto de Seguro Social y Medicare / Self-Employment Tax
                </div>
                <div style={{ 'font-size': '13px', color: '#cbd5e1', 'line-height': '1.8', 'font-family': 'monospace' }}>
                  {fmt(netProfit())} × 92.35% × 15.3% = <span style={{ color: '#f59e0b', 'font-weight': '700' }}>{fmt(seTax())}</span>
                </div>
                <div style={{ 'font-size': '12px', color: '#94a3b8', 'margin-top': '6px', 'line-height': '1.6' }}>
                  La mitad ({fmt(seDeduction())}) se descuenta de sus ingresos brutos.
                  <br />
                  <span style={{ color: '#64748b' }}>Half ({fmt(seDeduction())}) is deducted from your gross income.</span>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        {/* Section 6: Result */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>RESULTADO</div>
          <div style={sectionSubtitleStyle}>Result</div>

          {/* Equation */}
          <div style={{ ...cardStyle, 'margin-bottom': '12px' }}>
            <div style={{ display: 'flex', 'flex-wrap': 'wrap', 'align-items': 'center', 'justify-content': 'center', gap: '6px', 'font-family': 'monospace', 'font-size': '14px', 'line-height': '2' }}>
              <span style={{ color: '#94a3b8' }}>Impuesto</span>
              <span style={{ color: '#e2e8f0', 'font-weight': '600' }}>{fmt(computedTax())}</span>
              <span style={{ color: '#ef4444', 'font-weight': '700' }}>−</span>
              <span style={{ color: '#94a3b8' }}>Retenciones</span>
              <span style={{ color: '#3b82f6', 'font-weight': '600' }}>{fmt(withholding())}</span>
              <span style={{ color: '#ef4444', 'font-weight': '700' }}>−</span>
              <span style={{ color: '#94a3b8' }}>Créditos</span>
              <span style={{ color: '#22c55e', 'font-weight': '600' }}>{fmt(totalCredits())}</span>
              <span style={{ color: '#94a3b8' }}>=</span>
            </div>
          </div>

          {/* Big result number */}
          <div style={{
            'text-align': 'center',
            padding: '24px 16px',
            background: resultAmount() <= 0
              ? 'rgba(34,197,94,0.08)'
              : 'rgba(239,68,68,0.08)',
            border: `1px solid ${resultAmount() <= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            'border-radius': '12px',
          }}>
            <div style={{ 'font-size': '13px', color: '#94a3b8', 'margin-bottom': '8px' }}>
              {resultAmount() <= 0 ? 'REEMBOLSO ESTIMADO / ESTIMATED REFUND' : 'DEBE / AMOUNT OWED'}
            </div>
            <div style={{
              'font-size': 'clamp(32px, 6vw, 48px)',
              'font-weight': '700',
              'font-family': 'monospace',
              color: resultAmount() <= 0 ? '#22c55e' : '#ef4444',
            }}>
              {resultAmount() <= 0 ? '+' : ''}{fmt(Math.abs(resultAmount()))}
            </div>
            <p style={{ 'font-size': '12px', color: '#64748b', 'margin-top': '8px', 'margin-bottom': '0' }}>
              {resultAmount() <= 0
                ? 'El gobierno le debe dinero porque pagó más de lo necesario.'
                : 'Usted debe dinero porque no se retuvo suficiente durante el año.'
              }
              <br />
              <span style={{ color: '#475569' }}>
                {resultAmount() <= 0
                  ? 'The government owes you money because you overpaid.'
                  : 'You owe money because not enough was withheld during the year.'
                }
              </span>
            </p>
          </div>

          {/* Drake comparison (if available) */}
          <Show when={props.client.federalRefund || props.client.federalOwe}>
            <div style={{
              ...cardStyle,
              'margin-top': '12px',
              'border-left': '3px solid #8b5cf6',
            }}>
              <div style={{ 'font-size': '11px', 'font-weight': '600', color: '#8b5cf6', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'margin-bottom': '6px' }}>
                Comparación con Drake / Drake Comparison
              </div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <span style={{ 'font-size': '13px', color: '#94a3b8' }}>
                  {props.client.federalRefund ? 'Federal Refund (Drake)' : 'Federal Owed (Drake)'}
                </span>
                <span style={{
                  'font-size': '18px', 'font-weight': '700', 'font-family': 'monospace',
                  color: props.client.federalRefund ? '#22c55e' : '#ef4444',
                }}>
                  {fmt(props.client.federalRefund || props.client.federalOwe || 0)}
                </span>
              </div>
            </div>
          </Show>
        </div>

        {/* Footer */}
        <p style={{ color: '#475569', 'font-size': '10px', 'text-align': 'center', 'margin-top': '8px', 'margin-bottom': '0' }}>
          Estimación basada en documentos y datos del cuestionario. Puede variar del cálculo final.
          <br />
          Estimate based on documents and questionnaire data. May differ from final calculation.
        </p>
      </Show>
    </div>
  );
};

export default TaxClientExplainer;
