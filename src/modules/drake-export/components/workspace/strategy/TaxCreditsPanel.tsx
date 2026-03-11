import { Component, createSignal, For, Show } from 'solid-js';
import ChecklistItemRow from './ChecklistItemRow';
import { ChecklistItem, TaxCreditsChecklist } from '../../../types/taxStrategyTypes';

interface TaxCreditsPanelProps {
  data: TaxCreditsChecklist;
  onChange: (updated: TaxCreditsChecklist) => void;
}

interface GroupConfig {
  key: string;
  label: string;
  dataKey: keyof TaxCreditsChecklist;
  items: { field: string; label: string }[];
}

const groups: GroupConfig[] = [
  {
    key: 'children',
    label: 'Children & Dependents',
    dataKey: 'children',
    items: [
      { field: 'childTaxCredit', label: 'Child tax credit' },
      { field: 'childCareExpenses', label: 'Child care expenses' },
      { field: 'adoptionCredit', label: 'Adoption credit' },
      { field: 'dependentCareCredit', label: 'Dependent care credit' },
    ],
  },
  {
    key: 'education',
    label: 'Education Credits',
    dataKey: 'education',
    items: [
      { field: 'americanOpportunity', label: 'American Opportunity credit' },
      { field: 'lifetimeLearning', label: 'Lifetime Learning credit' },
      { field: 'tuitionAndFees', label: 'Tuition and fees' },
      { field: 'studentLoanInterest', label: 'Student loan interest' },
      { field: 'education529Contributions', label: '529 plan contributions' },
    ],
  },
  {
    key: 'energy',
    label: 'Energy Credits',
    dataKey: 'energy',
    items: [
      { field: 'residentialCleanEnergy', label: 'Residential clean energy' },
      { field: 'energyEfficientHome', label: 'Energy efficient home' },
      { field: 'electricVehicle', label: 'Electric vehicle credit' },
      { field: 'solarPanels', label: 'Solar panels' },
    ],
  },
  {
    key: 'eitc',
    label: 'Earned Income',
    dataKey: 'eitc',
    items: [
      { field: 'earnedIncomeCredit', label: 'Earned Income Credit (EIC)' },
      { field: 'qualifyingChildren', label: 'Qualifying children for EIC' },
    ],
  },
  {
    key: 'housing',
    label: 'Housing Credits',
    dataKey: 'housing',
    items: [
      { field: 'mortgageInterestCredit', label: 'Mortgage Interest Credit (Form 8396/MCC)' },
      { field: 'firstTimeHomebuyerCredit', label: 'First-time homebuyer credit' },
    ],
  },
  {
    key: 'other',
    label: 'Other Credits',
    dataKey: 'other',
    items: [
      { field: 'elderlyDisabledCredit', label: 'Elderly/disabled credit' },
      { field: 'foreignTaxCredit', label: 'Foreign tax credit' },
      { field: 'retirementSaversCredit', label: 'Retirement saver\'s credit' },
      { field: 'healthCoverageCredit', label: 'Health coverage credit' },
      { field: 'excessSocialSecurity', label: 'Excess Social Security' },
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

const TaxCreditsPanel: Component<TaxCreditsPanelProps> = (props) => {
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getGroupData = (dataKey: keyof TaxCreditsChecklist) => {
    return props.data[dataKey] as Record<string, ChecklistItem>;
  };

  const getCheckedCount = (group: GroupConfig): number => {
    const groupData = getGroupData(group.dataKey);
    return group.items.filter((item) => groupData[item.field]?.checked).length;
  };

  const handleItemChange = (group: GroupConfig, field: string, updated: ChecklistItem) => {
    const updatedData: TaxCreditsChecklist = {
      ...props.data,
      [group.dataKey]: {
        ...props.data[group.dataKey],
        [field]: updated,
      },
    };
    props.onChange(updatedData);
  };

  return (
    <div>
      <For each={groups}>
        {(group) => (
          <div style={groupStyle}>
            <button
              type="button"
              style={headerStyle}
              onClick={() => toggleGroup(group.key)}
            >
              <span>
                {group.label} ({getCheckedCount(group)}/{group.items.length})
              </span>
              <span>{openGroups()[group.key] ? '\u25BC' : '\u25B6'}</span>
            </button>
            <Show when={openGroups()[group.key]}>
              <For each={group.items}>
                {(item) => (
                  <ChecklistItemRow
                    label={item.label}
                    item={getGroupData(group.dataKey)[item.field]}
                    onChange={(updated) => handleItemChange(group, item.field, updated)}
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

export default TaxCreditsPanel;
