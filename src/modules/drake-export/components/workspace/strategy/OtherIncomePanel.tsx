import { Component, createSignal, For, Show } from 'solid-js';
import ChecklistItemRow from './ChecklistItemRow';
import { ChecklistItem, OtherIncomeChecklist, HealthInsuranceMarketplaceData } from '../../../types/taxStrategyTypes';

interface OtherIncomePanelProps {
  data: OtherIncomeChecklist;
  onChange: (updated: OtherIncomeChecklist) => void;
}

interface GroupConfig {
  key: string;
  label: string;
  items: { field: string; label: string }[];
}

const groups: GroupConfig[] = [
  {
    key: 'additionalIncome',
    label: 'Additional Income',
    items: [
      { field: 'socialSecurity', label: 'Social Security benefits' },
      { field: 'pension', label: 'Pension income' },
      { field: 'annuity', label: 'Annuity income' },
      { field: 'ira', label: 'IRA distributions' },
      { field: 'unemployment', label: 'Unemployment compensation' },
      { field: 'alimony', label: 'Alimony received' },
      { field: 'gambling', label: 'Gambling winnings' },
      { field: 'juryDuty', label: 'Jury duty pay' },
      { field: 'prizeAwards', label: 'Prizes & awards' },
      { field: 'cryptoIncome', label: 'Cryptocurrency income' },
      { field: 'stockSales', label: 'Stock sales/capital gains' },
      { field: 'rentalRoyalties', label: 'Rental royalties' },
    ],
  },
  {
    key: 'adjustments',
    label: 'Above-the-Line Adjustments (Schedule 1-A)',
    items: [
      { field: 'qbid', label: 'QBID - Qualified Business Income Deduction (Line 13a)' },
      { field: 'schedule1ADeductions', label: 'Schedule 1-A Additional Deductions (Line 13b)' },
      { field: 'iraContributions', label: 'IRA contributions' },
      { field: 'hsaContributions', label: 'HSA contributions' },
      { field: 'selfEmploymentTax', label: 'Self-employment tax deduction (50%)' },
      { field: 'healthInsuranceDeduction', label: 'Self-employed health insurance' },
      { field: 'retirementContributions', label: 'Retirement plan contributions' },
      { field: 'alimonyPaid', label: 'Alimony paid' },
      { field: 'educatorExpenses', label: 'Educator expenses' },
      { field: 'movingExpenses', label: 'Moving expenses (military)' },
      { field: 'studentLoanInterest', label: 'Student loan interest' },
      { field: 'tuitionFees', label: 'Tuition & fees' },
    ],
  },
  {
    key: 'schedule2Taxes',
    label: 'Schedule 2 - Additional Taxes (Line 17)',
    items: [
      { field: 'excessPtcRepayment', label: 'Excess advance premium tax credit repayment (Form 8962, Line 29)' },
      { field: 'selfEmploymentTax', label: 'Self-employment tax (Schedule SE)' },
      { field: 'unreportedSocialSecurityTax', label: 'Unreported Social Security/Medicare tax' },
      { field: 'additionalTaxOnIra', label: 'Additional tax on IRAs/retirement plans' },
      { field: 'householdEmploymentTax', label: 'Household employment taxes (Schedule H)' },
      { field: 'netInvestmentIncomeTax', label: 'Net Investment Income Tax (3.8%)' },
    ],
  },
];

const headerStyle: Record<string, string> = {
  display: 'flex',
  width: '100%',
  background: 'var(--surface-alt, #f9fafb)',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  padding: '0.75rem 1rem',
  cursor: 'pointer',
  'font-weight': '600',
  'font-size': '0.875rem',
  'justify-content': 'space-between',
  'align-items': 'center',
  'margin-bottom': '0.5rem',
};

const groupStyle: Record<string, string> = {
  'margin-bottom': '1rem',
};

const inputRowStyle: Record<string, string> = {
  display: 'flex',
  'align-items': 'center',
  gap: '1rem',
  padding: '0.5rem 0',
  'border-bottom': '1px solid var(--border-color-light, #e5e7eb)',
};

const labelStyle: Record<string, string> = {
  flex: '1',
  'font-size': '0.875rem',
  color: 'var(--text-color)',
};

const inputStyle: Record<string, string> = {
  width: '120px',
  padding: '0.375rem 0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-sm)',
  'font-size': '0.875rem',
  'text-align': 'right',
};

const marketplaceBoxStyle: Record<string, string> = {
  background: 'var(--surface-color, #fff)',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  padding: '1rem',
  'margin-bottom': '0.5rem',
};

const infoTextStyle: Record<string, string> = {
  'font-size': '0.75rem',
  color: 'var(--text-muted, #6b7280)',
  'margin-bottom': '1rem',
};

const OtherIncomePanel: Component<OtherIncomePanelProps> = (props) => {
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getGroupData = (groupKey: string): Record<string, ChecklistItem> => {
    return props.data[groupKey as keyof OtherIncomeChecklist] as Record<string, ChecklistItem>;
  };

  const getCheckedCount = (groupKey: string, items: { field: string }[]): number => {
    const groupData = getGroupData(groupKey);
    return items.filter((item) => groupData?.[item?.field]?.checked)?.length;
  };

  const handleItemChange = (groupKey: string, field: string, updated: ChecklistItem) => {
    const currentGroupData = getGroupData(groupKey);
    const newGroupData = { ...currentGroupData, [field]: updated };
    const newData: OtherIncomeChecklist = {
      ...props.data,
      [groupKey]: newGroupData,
    };
    props.onChange(newData);
  };

  // Health Insurance Marketplace handlers
  const getMarketplaceData = (): HealthInsuranceMarketplaceData => {
    return props.data.healthInsuranceMarketplace || {
      hasMarketplaceCoverage: false,
      monthlyPremium: 0,
      monthlySlcsp: 0,
      monthlyAptc: 0,
      coverageMonths: 0,
    };
  };

  const handleMarketplaceChange = (field: keyof HealthInsuranceMarketplaceData, value: any) => {
    const current = getMarketplaceData();
    const updated: HealthInsuranceMarketplaceData = {
      ...current,
      [field]: value,
    };
    // Auto-set hasMarketplaceCoverage if any value is entered
    if (field !== 'hasMarketplaceCoverage' && (updated.monthlyPremium > 0 || updated.coverageMonths > 0)) {
      updated.hasMarketplaceCoverage = true;
    }
    props.onChange({
      ...props.data,
      healthInsuranceMarketplace: updated,
    });
  };

  // Calculate annual totals for display
  const getAnnualTotals = () => {
    const data = getMarketplaceData();
    const months = data.coverageMonths || 0;
    return {
      annualPremium: (data.monthlyPremium || 0) * months,
      annualSlcsp: (data.monthlySlcsp || 0) * months,
      annualAptc: (data.monthlyAptc || 0) * months,
    };
  };

  return (
    <div>
      {/* Health Insurance Marketplace Section (1095-A) */}
      <div style={groupStyle}>
        <button
          type="button"
          style={{
            ...headerStyle,
            background: getMarketplaceData().hasMarketplaceCoverage
              ? 'var(--success-bg, #dcfce7)'
              : 'var(--surface-alt, #f9fafb)',
          }}
          onClick={() => toggleGroup('healthInsurance')}
        >
          <span>
            Health Insurance Marketplace (1095-A){' '}
            {getMarketplaceData().hasMarketplaceCoverage ? '✓' : ''}
          </span>
          <span>{openGroups()['healthInsurance'] ? '▼' : '▶'}</span>
        </button>
        <Show when={openGroups()['healthInsurance']}>
          <div style={marketplaceBoxStyle}>
            <div style={infoTextStyle}>
              Enter the values from your Form 1095-A. This will automatically calculate
              Form 8962 (Premium Tax Credit) and any excess advance PTC repayment.
            </div>

            <div style={inputRowStyle}>
              <label style={{ ...labelStyle, 'font-weight': '600' }}>
                <input
                  type="checkbox"
                  checked={getMarketplaceData().hasMarketplaceCoverage}
                  onChange={(e) => handleMarketplaceChange('hasMarketplaceCoverage', e.target.checked)}
                  style={{ 'margin-right': '0.5rem' }}
                />
                Had Marketplace health insurance coverage
              </label>
            </div>

            <Show when={getMarketplaceData().hasMarketplaceCoverage}>
              <div style={inputRowStyle}>
                <span style={labelStyle}>Months of coverage (1-12)</span>
                <input
                  type="number"
                  min="0"
                  max="12"
                  style={inputStyle}
                  value={getMarketplaceData().coverageMonths || ''}
                  onInput={(e) => handleMarketplaceChange('coverageMonths', parseInt(e.target.value) || 0)}
                />
              </div>

              <div style={inputRowStyle}>
                <span style={labelStyle}>Monthly Premium (Column A)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={getMarketplaceData().monthlyPremium || ''}
                  onInput={(e) => handleMarketplaceChange('monthlyPremium', parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                />
              </div>

              <div style={inputRowStyle}>
                <span style={labelStyle}>Monthly SLCSP (Column B) - Benchmark Plan</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={getMarketplaceData().monthlySlcsp || ''}
                  onInput={(e) => handleMarketplaceChange('monthlySlcsp', parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                />
              </div>

              <div style={inputRowStyle}>
                <span style={labelStyle}>Monthly Advance PTC (Column C)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={getMarketplaceData().monthlyAptc || ''}
                  onInput={(e) => handleMarketplaceChange('monthlyAptc', parseFloat(e.target.value) || 0)}
                  placeholder="$0.00"
                />
              </div>

              {/* Annual totals display */}
              <div style={{ 'margin-top': '1rem', padding: '0.75rem', background: 'var(--surface-alt)', 'border-radius': 'var(--border-radius-sm)' }}>
                <div style={{ 'font-size': '0.75rem', 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                  Annual Totals (calculated)
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', 'font-size': '0.8125rem' }}>
                  <span>Premium: ${getAnnualTotals().annualPremium.toFixed(2)}</span>
                  <span>SLCSP: ${getAnnualTotals().annualSlcsp.toFixed(2)}</span>
                  <span>Advance PTC: ${getAnnualTotals().annualAptc.toFixed(2)}</span>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <For each={groups}>
        {(group) => (
          <div style={groupStyle}>
            <button
              type="button"
              style={headerStyle}
              onClick={() => toggleGroup(group?.key)}
            >
              <span>
                {group?.label} ({getCheckedCount(group?.key, group?.items)}/{group?.items?.length})
              </span>
              <span>{openGroups()[group?.key] ? '▼' : '▶'}</span>
            </button>
            <Show when={openGroups()[group?.key]}>
              <For each={group.items}>
                {(item) => (
                  <ChecklistItemRow
                    label={item?.label}
                    item={getGroupData(group?.key)?.[item?.field]}
                    onChange={(updated) => handleItemChange(group?.key, item?.field, updated)}
                  />
                )}
              </For>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};

export default OtherIncomePanel;
