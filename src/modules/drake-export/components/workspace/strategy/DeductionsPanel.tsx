import { Component, createSignal, For, Show } from 'solid-js';
import ChecklistItemRow from './ChecklistItemRow';
import { ChecklistItem, DeductionsChecklist } from '../../../types/taxStrategyTypes';

interface DeductionsPanelProps {
  data: DeductionsChecklist;
  onChange: (updated: DeductionsChecklist) => void;
}

interface GroupConfig {
  key: string;
  title: string;
  sectionKey: keyof DeductionsChecklist;
  items: { field: string; label: string }[];
}

const GROUPS: GroupConfig[] = [
  {
    key: 'medical',
    title: 'Medical & Dental',
    sectionKey: 'medical',
    items: [
      { field: 'medicalExpenses', label: 'Medical expenses' },
      { field: 'dentalExpenses', label: 'Dental expenses' },
      { field: 'visionExpenses', label: 'Vision expenses' },
      { field: 'healthInsurancePremiums', label: 'Health insurance premiums' },
      { field: 'prescriptionMedications', label: 'Prescription medications' },
      { field: 'medicalMileage', label: 'Medical mileage' },
    ],
  },
  {
    key: 'taxesPaid',
    title: 'Taxes Paid',
    sectionKey: 'taxesPaid',
    items: [
      { field: 'stateIncomeTax', label: 'State income tax' },
      { field: 'localIncomeTax', label: 'Local income tax' },
      { field: 'realEstateTax', label: 'Real estate tax' },
      { field: 'personalPropertyTax', label: 'Personal property tax' },
      { field: 'foreignTaxesPaid', label: 'Foreign taxes paid' },
    ],
  },
  {
    key: 'interest',
    title: 'Interest Paid',
    sectionKey: 'interest',
    items: [
      { field: 'mortgageInterest', label: 'Mortgage interest' },
      { field: 'mortgageInsurancePremiums', label: 'Mortgage insurance premiums' },
      { field: 'investmentInterest', label: 'Investment interest' },
      { field: 'studentLoanInterest', label: 'Student loan interest' },
    ],
  },
  {
    key: 'donations',
    title: 'Charitable Donations',
    sectionKey: 'donations',
    items: [
      { field: 'cashDonations', label: 'Cash donations' },
      { field: 'nonCashDonations', label: 'Non-cash donations' },
      { field: 'volunteerMileage', label: 'Volunteer mileage' },
      { field: 'charitableCarryover', label: 'Charitable carryover' },
    ],
  },
  {
    key: 'casualty',
    title: 'Casualty & Theft',
    sectionKey: 'casualty',
    items: [
      { field: 'federalDisasterLoss', label: 'Federal disaster loss' },
      { field: 'theftLoss', label: 'Theft loss' },
    ],
  },
  {
    key: 'other',
    title: 'Other Deductions',
    sectionKey: 'other',
    items: [
      { field: 'gamblingLosses', label: 'Gambling losses' },
      { field: 'unreimbursedExpenses', label: 'Unreimbursed expenses' },
      { field: 'taxPrepFees', label: 'Tax preparation fees' },
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
  color: 'var(--text-primary)',
  'justify-content': 'space-between',
  'align-items': 'center',
  'margin-bottom': '0.5rem',
};

const groupStyle: Record<string, string> = {
  'margin-bottom': '1rem',
};

const headerRightStyle: Record<string, string> = {
  display: 'flex',
  'align-items': 'center',
  gap: '0.5rem',
  'font-size': '0.8rem',
  'font-weight': '400',
  color: 'var(--text-secondary, #6b7280)',
};

const DeductionsPanel: Component<DeductionsPanelProps> = (props) => {
  const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getSection = (sectionKey: keyof DeductionsChecklist) => {
    return props.data[sectionKey] as Record<string, ChecklistItem>;
  };

  const getCheckedCount = (sectionKey: keyof DeductionsChecklist, items: { field: string }[]) => {
    const section = getSection(sectionKey);
    return items.filter((item) => section[item.field]?.checked).length;
  };

  const handleItemChange = (sectionKey: keyof DeductionsChecklist, field: string, updated: ChecklistItem) => {
    const currentSection = { ...props.data[sectionKey] };
    (currentSection as Record<string, ChecklistItem>)[field] = updated;
    const newData: DeductionsChecklist = {
      ...props.data,
      [sectionKey]: currentSection,
    };
    props.onChange(newData);
  };

  const chevronStyle = (isOpen: boolean): Record<string, string> => ({
    transition: 'transform 0.2s',
    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
    'font-size': '0.75rem',
  });

  return (
    <div>
      <For each={GROUPS}>
        {(group) => (
          <div style={groupStyle}>
            <button
              type="button"
              style={headerStyle}
              onClick={() => toggleGroup(group.key)}
            >
              <span>{group.title}</span>
              <span style={headerRightStyle}>
                <span>{getCheckedCount(group.sectionKey, group.items)}/{group.items.length}</span>
                <span style={chevronStyle(!!openGroups()[group.key])}>&#9654;</span>
              </span>
            </button>
            <Show when={openGroups()[group.key]}>
              <For each={group.items}>
                {(item) => (
                  <ChecklistItemRow
                    label={item.label}
                    item={getSection(group.sectionKey)[item.field]}
                    onChange={(updated) => handleItemChange(group.sectionKey, item.field, updated)}
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

export default DeductionsPanel;
