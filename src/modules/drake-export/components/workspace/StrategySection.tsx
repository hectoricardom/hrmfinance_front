/**
 * StrategySection - Tax Strategy Checklist Container
 * Main container with internal sub-tabs for: Deductions, Business, Rental, Credits, Other
 */

import { Component, createSignal, createMemo, Show } from 'solid-js';
import type { TaxPortal, DrakeTaxDocument } from '../../types/drakeTypes';
import type { TaxStrategyData, StrategySubSection, PreparerNote } from '../../types/taxStrategyTypes';
import { createDefaultTaxStrategy } from './strategy/strategyDefaults';
import { autoFillFromDocuments, getAutoFillSummary } from './strategy/strategyAutoFill';
import { applyCalculatedCredits, getStrategyOtherIncome, getStrategyAdjustments, getBusinessExpenseTotal } from './strategy/creditCalculator';
import type { CreditCalculationResult, EICCalculationResult, ACTCCalculationResult } from './strategy/creditCalculator';
import DeductionsPanel from './strategy/DeductionsPanel';
import BusinessExpensesPanel from './strategy/BusinessExpensesPanel';
import RentalPropertiesPanel from './strategy/RentalPropertiesPanel';
import TaxCreditsPanel from './strategy/TaxCreditsPanel';
import OtherIncomePanel from './strategy/OtherIncomePanel';
import NotesSection from './strategy/NotesSection';
import AutoRecommendations from './strategy/AutoRecommendations';
import MultiYearPlanning from './strategy/MultiYearPlanning';
import EICCurveChart from './strategy/EICCurveChart';
import CTCVisualizer from './strategy/CTCVisualizer';
import TaxClientExplainer from './strategy/TaxClientExplainer';
import type { PreviousYearData } from '../../services/recurringClientService';
import { devLog } from '../../../../services/utils';

interface StrategySectionProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  onClientChange: (updates: Partial<TaxPortal>) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  previousYearData?: PreviousYearData | null;
}

const StrategySection: Component<StrategySectionProps> = (props) => {
  const [activeSubSection, setActiveSubSection] = createSignal<StrategySubSection>('deductions');
  const [hasChanges, setHasChanges] = createSignal(false);
  const [creditResults, setCreditResults] = createSignal<{
    childCredit: CreditCalculationResult;
    eic: EICCalculationResult;
    actc: ACTCCalculationResult;
    agi: number;
  } | null>(null);

  // Get or initialize strategy data
  const strategyData = createMemo((): TaxStrategyData => {
    return (props.client as any).taxStrategy || createDefaultTaxStrategy();
  });

  // Calculate completion percentage
  const completionPercentage = createMemo(() => {
    const data = strategyData();
    let total = 0;
    let checked = 0;

    const countItems = (obj: any) => {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val && typeof val === 'object' && 'checked' in val) {
          total++;
          if (val.checked) checked++;
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          countItems(val);
        }
      }
    };

    countItems(data.deductions);
    countItems(data.businessExpenses);
    countItems(data.taxCredits);
    countItems(data.otherIncome);

    // Count rental properties
    for (const prop of data.rentalProperties.properties) {
      countItems(prop.expenses);
      countItems(prop.capitalImprovements);
      total++;
      if (prop.rentalIncome.checked) checked++;
    }

    return total === 0 ? 0 : Math.round((checked / total) * 100);
  });

  const handleStrategyUpdate = (updated: Partial<TaxStrategyData>) => {
    const newData: TaxStrategyData = {
      ...strategyData(),
      ...updated,
      lastUpdated: Date.now()
    };
    props.onClientChange({ taxStrategy: newData } as any);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await props.onSave();
    setHasChanges(false);
  };

  // Auto-fill from analyzed documents
  const autoFillSummary = createMemo(() => getAutoFillSummary(props.documents));

  const handleAutoFill = () => {
    devLog(props.documents);

    const filled = autoFillFromDocuments(strategyData(), props.documents );
    props.onClientChange({ taxStrategy: filled } as any);
    setHasChanges(true);
  };

  // Calculate credits on demand
  const handleCalculateCredits = () => {
    devLog('[STRATEGY] ===== CALCULATE CREDITS TRIGGERED =====');
    devLog('[STRATEGY] Client data:', JSON.stringify({
      id: props.client.id,
      name: `${props.client.firstName} ${props.client.lastName}`,
      filingStatus: props.client.filingStatus,
      taxYear: props.client.taxYear,
      dependents: props.client.dependents,
    }, null, 2));
    devLog('[STRATEGY] Documents passed:', props.documents.length);
    devLog('[STRATEGY] Documents detail:', JSON.stringify(props.documents.map(d => ({
      id: d.id,
      type: d.drakeFormType,
      docType: d.documentType,
      status: d.uploadStatus,
      fileName: d.originalFileName,
      hasExtracted: !!d.extractedAmounts,
      extractedAmounts: d.extractedAmounts,
      payerInfo: d.payerInfo,
    })), null, 2));

    const { updatedCredits, childCredit, eic, actc } = applyCalculatedCredits(
      strategyData().taxCredits,
      props.client,
      props.documents,
      strategyData()
    );

    // Sum AGI from documents + strategy data for display
    let agi = 0;
    for (const doc of props.documents) {
      if (doc.drakeFormType === 'w2') agi += doc.extractedAmounts?.wages ?? 0;
      else if (doc.drakeFormType === '1099_nec') agi += doc.extractedAmounts?.nonEmployeeCompensation ?? 0;
      else if (doc.drakeFormType === '1099_int') agi += doc.extractedAmounts?.interestIncome ?? 0;
      else if (doc.drakeFormType === '1099_div') agi += doc.extractedAmounts?.ordinaryDividends ?? 0;
      else if (doc.drakeFormType === '1099_misc') {
        agi += doc.extractedAmounts?.miscellaneousIncome ?? 0;
        agi += doc.extractedAmounts?.rents ?? 0;
        agi += doc.extractedAmounts?.royalties ?? 0;
      }
    }
    // Include strategy checklist data in displayed AGI
    const sd = strategyData();
    agi += getStrategyOtherIncome(sd);
    agi -= getBusinessExpenseTotal(sd, props.client.taxYear || 2024);
    agi -= getStrategyAdjustments(sd);
    agi = Math.max(0, agi);

    setCreditResults({ childCredit, eic, actc, agi });
    handleStrategyUpdate({ taxCredits: updatedCredits });
  };

  const handleNotesChange = (notes: PreparerNote[]) => {
    const updated = {
      ...props.client.taxStrategy,
      preparerNotes: notes,
      lastUpdated: Date.now()
    };
    props.onClientChange({ taxStrategy: updated });
  };

  const subTabs: { id: StrategySubSection; label: string }[] = [
    { id: 'deductions', label: 'Deductions' },
    { id: 'business', label: 'Business' },
    { id: 'rental', label: 'Rental' },
    { id: 'credits', label: 'Credits' },
    { id: 'other', label: 'Other Income' },
    { id: 'notes', label: 'Notes' },
    { id: 'explain', label: 'Explicar' },
    { id: 'recommendations', label: 'AI Recs' },
    { id: 'multi-year', label: 'Multi-Year' },
  ];

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1rem'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    'margin-bottom': '0.5rem'
  };

  const tabsContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    'flex-wrap': 'wrap' as const
  };

  const getTabStyle = (isActive: boolean) => ({
    padding: '0.625rem 1.25rem',
    border: 'none',
    background: isActive ? '#06b6d4' : 'var(--surface-alt, #f3f4f6)',
    color: isActive ? 'white' : 'var(--text-primary)',
    'border-radius': '9999px',
    cursor: 'pointer',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s'
  });

  const progressContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem'
  };

  const progressBarOuterStyle = {
    width: '120px',
    height: '8px',
    background: 'var(--surface-alt, #e5e7eb)',
    'border-radius': '4px',
    overflow: 'hidden'
  };

  const progressBarInnerStyle = () => ({
    height: '100%',
    width: `${completionPercentage()}%`,
    background: completionPercentage() >= 75 ? '#22c55e' : completionPercentage() >= 40 ? '#f59e0b' : '#06b6d4',
    'border-radius': '4px',
    transition: 'width 0.3s ease'
  });

  const progressLabelStyle = {
    'font-size': '0.8125rem',
    'font-weight': '600',
    color: 'var(--text-secondary)'
  };

  const saveButtonStyle = () => ({
    padding: '0.5rem 1.25rem',
    background: hasChanges() ? '#06b6d4' : 'var(--surface-alt, #e5e7eb)',
    color: hasChanges() ? 'white' : 'var(--text-muted)',
    border: 'none',
    'border-radius': 'var(--border-radius-md)',
    cursor: hasChanges() ? 'pointer' : 'default',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s',
    opacity: props.isSaving ? '0.7' : '1'
  });

  const panelContainerStyle = {
    'margin-top': '1rem',
    'max-height': '600px',
    'overflow-y': 'auto' as const,
    padding: '0.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header with tabs and progress */}
      <div style={headerStyle}>
        <div style={tabsContainerStyle}>
          {subTabs.map(tab => (
            <button
              style={getTabStyle(activeSubSection() === tab.id)}
              onClick={() => setActiveSubSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={progressContainerStyle}>
          <Show when={autoFillSummary().documentCount > 0}>
            <button
              style={{
                padding: '0.5rem 1rem',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-md)',
                cursor: 'pointer',
                'font-weight': '600',
                'font-size': '0.8125rem',
                transition: 'all 0.2s'
              }}
              onClick={handleAutoFill}
              title={`Fill from ${autoFillSummary().documentCount} document(s): ${autoFillSummary().formTypes.join(', ')}`}
            >
              Auto-fill ({autoFillSummary().documentCount})
            </button>
          </Show>
          <div style={progressBarOuterStyle}>
            <div style={progressBarInnerStyle()} />
          </div>
          <span style={progressLabelStyle}>{completionPercentage()}%</span>
          <button
            style={saveButtonStyle()}
            onClick={handleSave}
            disabled={!hasChanges() || props.isSaving}
          >
            {props.isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Active panel */}
      <div style={panelContainerStyle}>
        <Show when={activeSubSection() === 'deductions'}>
          <DeductionsPanel
            data={strategyData().deductions}
            onChange={(deductions) => handleStrategyUpdate({ deductions })}
          />
        </Show>

        <Show when={activeSubSection() === 'business'}>
          <BusinessExpensesPanel
            data={strategyData().businessExpenses}
            onChange={(businessExpenses) => handleStrategyUpdate({ businessExpenses })}
          />
        </Show>

        <Show when={activeSubSection() === 'rental'}>
          <RentalPropertiesPanel
            data={strategyData().rentalProperties}
            onChange={(rentalProperties) => handleStrategyUpdate({ rentalProperties })}
          />
        </Show>

        <Show when={activeSubSection() === 'credits'}>
          {/* Calculate Credits Button */}
          <div style={{ 'margin-bottom': '1rem' }}>
            <button
              style={{
                padding: '0.625rem 1.5rem',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-md)',
                cursor: 'pointer',
                'font-weight': '700',
                'font-size': '0.9375rem',
                transition: 'all 0.2s',
                'box-shadow': '0 2px 8px rgba(34, 197, 94, 0.3)'
              }}
              onClick={handleCalculateCredits}
            >
              Calculate Credits
            </button>
          </div>

          {/* Credit Calculation Results Card */}
          <Show when={creditResults()}>
            <div style={{
              background: 'var(--surface-alt, #f9fafb)',
              border: '1px solid var(--border-color)',
              'border-radius': 'var(--border-radius-lg, 12px)',
              padding: '1.25rem',
              'margin-bottom': '1.25rem'
            }}>
              <div style={{ 'font-weight': '700', 'font-size': '0.9375rem', 'margin-bottom': '1rem', color: 'var(--text-primary)' }}>
                Credit Calculation Results
              </div>

              {/* AGI Row */}
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', padding: '0.5rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
                <span style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)' }}>Estimated AGI (from documents)</span>
                <span style={{ 'font-weight': '600', 'font-size': '0.9375rem', color: 'var(--text-primary)' }}>
                  ${creditResults()!.agi.toLocaleString()}
                </span>
              </div>

              {/* Dependents Check */}
              <div style={{ padding: '0.75rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.375rem' }}>
                  <span style={{ color: creditResults()!.childCredit.eligibility.hasDependents ? '#22c55e' : '#ef4444', 'font-size': '1rem' }}>
                    {creditResults()!.childCredit.eligibility.hasDependents ? '\u2713' : '\u2717'}
                  </span>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-primary)' }}>
                    Dependents on return: {creditResults()!.childCredit.eligibility.totalDependents}
                  </span>
                </div>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span style={{ color: creditResults()!.childCredit.eligibility.hasQualifyingChildren ? '#22c55e' : '#ef4444', 'font-size': '1rem' }}>
                    {creditResults()!.childCredit.eligibility.hasQualifyingChildren ? '\u2713' : '\u2717'}
                  </span>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-primary)' }}>
                    Qualifying children (under 17): {creditResults()!.childCredit.qualifyingChildren}
                  </span>
                </div>
                <Show when={creditResults()!.childCredit.eligibility.nonQualifyingReason}>
                  <div style={{ 'margin-top': '0.375rem', 'margin-left': '1.5rem', 'font-size': '0.8125rem', color: '#f59e0b' }}>
                    {creditResults()!.childCredit.eligibility.nonQualifyingReason}
                  </div>
                </Show>
              </div>

              {/* Child Tax Credit Row */}
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', padding: '0.75rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <span style={{ color: creditResults()!.childCredit.creditAmount > 0 ? '#22c55e' : '#ef4444', 'font-size': '1rem' }}>
                      {creditResults()!.childCredit.creditAmount > 0 ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ 'font-size': '0.9375rem', 'font-weight': '600', color: 'var(--text-primary)' }}>Child Tax Credit</span>
                  </div>
                  <div style={{ 'font-size': '0.8125rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem', 'margin-left': '1.5rem' }}>
                    {creditResults()!.childCredit.qualifyingChildren > 0
                      ? `${creditResults()!.childCredit.qualifyingChildren} child${creditResults()!.childCredit.qualifyingChildren !== 1 ? 'ren' : ''} x $2,000 = $${(creditResults()!.childCredit.qualifyingChildren * 2000).toLocaleString()}`
                      : 'No qualifying children — credit does not apply'
                    }
                  </div>
                  {/* CTC / ACTC split detail */}
                  <Show when={creditResults()!.childCredit.creditAmount > 0}>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem', 'margin-left': '1.5rem', display: 'flex', 'flex-direction': 'column', gap: '0.125rem' }}>
                      <span>Line 19 Non-refundable CTC: <b style={{ color: 'var(--text-primary)' }}>${creditResults()!.actc.nonRefundableCTC.toLocaleString()}</b></span>
                      <span>Line 28 ACTC (refundable): <b style={{ color: '#22c55e' }}>${creditResults()!.actc.refundableACTC.toLocaleString()}</b></span>
                    </div>
                  </Show>
                </div>
                <span style={{
                  'font-weight': '700',
                  'font-size': '1.125rem',
                  color: creditResults()!.childCredit.creditAmount > 0 ? '#22c55e' : 'var(--text-muted)'
                }}>
                  ${(creditResults()!.actc.nonRefundableCTC + creditResults()!.actc.refundableACTC).toLocaleString()}
                </span>
              </div>

              {/* Phase-out detail */}
              <Show when={creditResults()!.childCredit.isPhasedOut}>
                <div style={{ padding: '0.375rem 0 0.375rem 2rem', 'font-size': '0.8125rem', color: '#f59e0b' }}>
                  Phase-out: -${creditResults()!.childCredit.phaseOutReduction.toLocaleString()} (AGI exceeds threshold)
                </div>
              </Show>

              {/* CTC Visualizer */}
              <Show when={creditResults()!.childCredit.qualifyingChildren > 0}>
                <div style={{ 'margin-top': '1rem' }}>
                  <CTCVisualizer
                    qualifyingChildren={creditResults()!.childCredit.qualifyingChildren}
                    childNames={(() => {
                      const taxYear = props.client.taxYear || 2024;
                      const endOfYear = new Date(taxYear, 11, 31);
                      const qualRels = ['son', 'daughter', 'stepson', 'stepdaughter', 'foster_child', 'grandchild'];
                      return (props.client.dependents || [])
                        .filter(d => {
                          if (!qualRels.includes(d.relationship)) return false;
                          if (!d.dateOfBirth) return true;
                          const dob = new Date(d.dateOfBirth);
                          const age = endOfYear.getFullYear() - dob.getFullYear() - (endOfYear < new Date(endOfYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
                          return age < 17;
                        })
                        .map(d => {
                          let age: number | null = null;
                          if (d.dateOfBirth) {
                            const dob = new Date(d.dateOfBirth);
                            age = endOfYear.getFullYear() - dob.getFullYear() - (endOfYear < new Date(endOfYear.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
                          }
                          return { name: `${d.firstName || ''} ${d.lastName || ''}`.trim(), age };
                        });
                    })()}
                    totalCTC={creditResults()!.childCredit.creditAmount}
                    taxLiability={creditResults()!.actc.estimatedTaxLiability}
                    nonRefundableCTC={creditResults()!.actc.nonRefundableCTC}
                    refundableACTC={creditResults()!.actc.refundableACTC}
                    earnedIncome={creditResults()!.actc.earnedIncome}
                    agi={creditResults()!.agi}
                    filingStatus={props.client.filingStatus || 'single'}
                    taxYear={props.client.taxYear || 2024}
                    isPhasedOut={creditResults()!.childCredit.isPhasedOut}
                    phaseOutReduction={creditResults()!.childCredit.phaseOutReduction}
                  />
                </div>
              </Show>

              {/* EIC Eligibility Checks */}
              <div style={{ padding: '0.75rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.375rem' }}>
                  <span style={{ color: creditResults()!.eic.eligibility.hasEarnedIncome ? '#22c55e' : '#ef4444', 'font-size': '1rem' }}>
                    {creditResults()!.eic.eligibility.hasEarnedIncome ? '\u2713' : '\u2717'}
                  </span>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-primary)' }}>
                    Earned income: ${creditResults()!.eic.eligibility.earnedIncome.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                  <span style={{ color: creditResults()!.eic.eligibility.isWithinLimit ? '#22c55e' : '#ef4444', 'font-size': '1rem' }}>
                    {creditResults()!.eic.eligibility.isWithinLimit ? '\u2713' : '\u2717'}
                  </span>
                  <span style={{ 'font-size': '0.875rem', color: 'var(--text-primary)' }}>
                    Income within EIC limit: ${creditResults()!.eic.eligibility.incomeLimit.toLocaleString()}
                  </span>
                </div>
                <Show when={creditResults()!.eic.eligibility.reason}>
                  <div style={{ 'margin-top': '0.375rem', 'margin-left': '1.5rem', 'font-size': '0.8125rem', color: '#f59e0b' }}>
                    {creditResults()!.eic.eligibility.reason}
                  </div>
                </Show>
              </div>

              {/* Earned Income Credit Row */}
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', padding: '0.75rem 0', 'border-bottom': '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    <span style={{ color: creditResults()!.eic.creditAmount > 0 ? '#22c55e' : '#ef4444', 'font-size': '1rem' }}>
                      {creditResults()!.eic.creditAmount > 0 ? '\u2713' : '\u2717'}
                    </span>
                    <span style={{ 'font-size': '0.9375rem', 'font-weight': '600', color: 'var(--text-primary)' }}>Earned Income Credit (EIC)</span>
                  </div>
                  <div style={{ 'font-size': '0.8125rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem', 'margin-left': '1.5rem' }}>
                    {creditResults()!.eic.creditAmount > 0
                      ? `${creditResults()!.eic.qualifyingChildren} qualifying child${creditResults()!.eic.qualifyingChildren !== 1 ? 'ren' : ''} bracket`
                      : creditResults()!.eic.eligibility.reason || 'Does not qualify'
                    }
                  </div>
                </div>
                <span style={{
                  'font-weight': '700',
                  'font-size': '1.125rem',
                  color: creditResults()!.eic.creditAmount > 0 ? '#22c55e' : 'var(--text-muted)'
                }}>
                  ${creditResults()!.eic.creditAmount.toLocaleString()}
                </span>
              </div>

              {/* EIC Curve Chart */}
              <Show when={creditResults()!.eic.eligibility.hasEarnedIncome}>
                <div style={{ 'margin-top': '1rem' }}>
                  <EICCurveChart
                    earnedIncome={creditResults()!.eic.eligibility.earnedIncome}
                    creditAmount={creditResults()!.eic.creditAmount}
                    qualifyingChildren={creditResults()!.eic.qualifyingChildren}
                    filingStatus={props.client.filingStatus || 'single'}
                    taxYear={props.client.taxYear || 2024}
                    agi={creditResults()!.agi}
                  />
                </div>
              </Show>

              {/* Total */}
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', padding: '0.75rem 0', 'border-top': '2px solid var(--border-color)', 'margin-top': '0.5rem' }}>
                <span style={{ 'font-weight': '700', 'font-size': '0.9375rem', color: 'var(--text-primary)' }}>Total Estimated Credits</span>
                <span style={{ 'font-weight': '700', 'font-size': '1.25rem', color: '#06b6d4' }}>
                  ${(creditResults()!.actc.nonRefundableCTC + creditResults()!.actc.refundableACTC + creditResults()!.eic.creditAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </Show>

          <TaxCreditsPanel
            data={strategyData().taxCredits}
            onChange={(taxCredits) => handleStrategyUpdate({ taxCredits })}
          />
        </Show>

        <Show when={activeSubSection() === 'other'}>
          <OtherIncomePanel
            data={strategyData().otherIncome}
            onChange={(otherIncome) => handleStrategyUpdate({ otherIncome })}
          />
        </Show>

        <Show when={activeSubSection() === 'explain'}>
          <TaxClientExplainer
            client={props.client}
            documents={props.documents}
            creditResults={creditResults()}
            strategyData={strategyData()}
          />
        </Show>

        <Show when={activeSubSection() === 'notes'}>
          <NotesSection
            notes={props.client.taxStrategy?.preparerNotes || []}
            onChange={handleNotesChange}
            title="Preparer Notes & Questions"
          />
        </Show>

        <Show when={activeSubSection() === 'recommendations'}>
          <AutoRecommendations
            client={props.client}
            documents={props.documents}
            strategyData={strategyData()}
            onApplyRecommendation={(recommendation) => {
              devLog('[STRATEGY] Applied recommendation:', recommendation);
              setHasChanges(true);
            }}
          />
        </Show>

        <Show when={activeSubSection() === 'multi-year'}>
          <MultiYearPlanning
            client={props.client}
            currentYearCalc={null}
            previousYearData={null}
          />
        </Show>
      </div>
    </div>
  );
};

export default StrategySection;
