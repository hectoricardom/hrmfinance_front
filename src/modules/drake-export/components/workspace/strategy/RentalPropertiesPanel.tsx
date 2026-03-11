import { Component, createSignal, For, Show } from 'solid-js';
import ChecklistItemRow from './ChecklistItemRow';
import { ChecklistItem, RentalPropertiesChecklist, RentalPropertyEntry } from '../../../types/taxStrategyTypes';
import { createDefaultRentalProperty } from './strategyDefaults';

interface RentalPropertiesPanelProps {
  data: RentalPropertiesChecklist;
  onChange: (updated: RentalPropertiesChecklist) => void;
}

const propertyTypeOptions: { value: RentalPropertyEntry['propertyType']; label: string }[] = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'other', label: 'Other' },
];

const expenseLabels: { key: keyof RentalPropertyEntry['expenses']; label: string }[] = [
  { key: 'mortgage', label: 'Mortgage/interest' },
  { key: 'propertyTax', label: 'Property tax' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'repairs', label: 'Repairs' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'management', label: 'Property management' },
  { key: 'advertising', label: 'Advertising' },
  { key: 'legal', label: 'Legal fees' },
  { key: 'hoa', label: 'HOA fees' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'supplies', label: 'Supplies' },
];

const capitalImprovementLabels: { key: keyof RentalPropertyEntry['capitalImprovements']; label: string }[] = [
  { key: 'roofing', label: 'Roofing' },
  { key: 'hvac', label: 'HVAC' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'appliances', label: 'Appliances' },
  { key: 'flooring', label: 'Flooring' },
  { key: 'otherImprovements', label: 'Other improvements' },
];

const addButtonStyle: Record<string, string> = {
  background: '#06b6d4',
  color: 'white',
  border: 'none',
  'border-radius': 'var(--border-radius-md)',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  'font-weight': '600',
  'font-size': '0.875rem',
};

const cardStyle: Record<string, string> = {
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-lg)',
  padding: '1rem',
  'margin-bottom': '1rem',
  background: 'var(--surface-color)',
};

const headerStyle: Record<string, string> = {
  display: 'flex',
  gap: '0.75rem',
  'align-items': 'center',
  'margin-bottom': '1rem',
};

const addressInputStyle: Record<string, string> = {
  flex: '1',
  padding: '0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  'font-size': '0.875rem',
};

const selectStyle: Record<string, string> = {
  padding: '0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  'font-size': '0.875rem',
  width: 'auto',
};

const removeButtonStyle: Record<string, string> = {
  background: '#ef4444',
  color: 'white',
  border: 'none',
  'border-radius': 'var(--border-radius-md)',
  padding: '0.375rem 0.75rem',
  cursor: 'pointer',
  'font-size': '0.75rem',
};

const daysGridStyle: Record<string, string> = {
  display: 'grid',
  'grid-template-columns': '1fr 1fr',
  gap: '0.75rem',
  'margin-bottom': '0.75rem',
};

const dayLabelStyle: Record<string, string> = {
  'font-size': '0.75rem',
  color: 'var(--text-secondary)',
  'margin-bottom': '0.25rem',
};

const dayInputStyle: Record<string, string> = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  'font-size': '0.875rem',
  'box-sizing': 'border-box',
};

const RentalPropertiesPanel: Component<RentalPropertiesPanelProps> = (props) => {
  const [collapsed, setCollapsed] = createSignal<Record<string, boolean>>({});

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isCollapsed = (key: string): boolean => {
    return !!collapsed()[key];
  };

  const handleAddProperty = () => {
    const newProperty = createDefaultRentalProperty();
    props.onChange({
      properties: [...props.data.properties, newProperty],
    });
  };

  const handleRemoveProperty = (propertyId: string) => {
    props.onChange({
      properties: props.data.properties.filter((p) => p.id !== propertyId),
    });
  };

  const updateProperty = (propertyId: string, updates: Partial<RentalPropertyEntry>) => {
    const updatedProperties = props.data.properties.map((p) =>
      p.id === propertyId ? { ...p, ...updates } : p
    );
    props.onChange({ properties: updatedProperties });
  };

  const handleAddressChange = (propertyId: string, address: string) => {
    updateProperty(propertyId, { propertyAddress: address });
  };

  const handlePropertyTypeChange = (propertyId: string, type: RentalPropertyEntry['propertyType']) => {
    updateProperty(propertyId, { propertyType: type });
  };

  const handleDaysRentedChange = (propertyId: string, value: number) => {
    updateProperty(propertyId, { daysRented: value });
  };

  const handlePersonalUseDaysChange = (propertyId: string, value: number) => {
    updateProperty(propertyId, { personalUseDays: value });
  };

  const handleRentalIncomeChange = (propertyId: string, updated: ChecklistItem) => {
    updateProperty(propertyId, { rentalIncome: updated });
  };

  const handleExpenseChange = (propertyId: string, key: keyof RentalPropertyEntry['expenses'], updated: ChecklistItem) => {
    const property = props.data.properties.find((p) => p.id === propertyId);
    if (!property) return;
    updateProperty(propertyId, {
      expenses: { ...property.expenses, [key]: updated },
    });
  };

  const handleImprovementChange = (propertyId: string, key: keyof RentalPropertyEntry['capitalImprovements'], updated: ChecklistItem) => {
    const property = props.data.properties.find((p) => p.id === propertyId);
    if (!property) return;
    updateProperty(propertyId, {
      capitalImprovements: { ...property.capitalImprovements, [key]: updated },
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-bottom': '1rem' }}>
        <button style={addButtonStyle} onClick={handleAddProperty}>
          Add Property
        </button>
      </div>

      <For each={props.data.properties}>
        {(property, index) => (
          <div style={cardStyle}>
            <div style={headerStyle}>
              <span style={{ 'font-weight': '600', 'font-size': '0.875rem', 'white-space': 'nowrap' }}>
                Property #{index() + 1}
              </span>
              <input
                type="text"
                style={addressInputStyle}
                value={property.propertyAddress}
                placeholder="Property address"
                onInput={(e) => handleAddressChange(property.id, (e.target as HTMLInputElement).value)}
              />
              <select
                style={selectStyle}
                value={property.propertyType}
                onChange={(e) => handlePropertyTypeChange(property.id, (e.target as HTMLSelectElement).value as RentalPropertyEntry['propertyType'])}
              >
                <For each={propertyTypeOptions}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
              <button style={removeButtonStyle} onClick={() => handleRemoveProperty(property.id)}>
                Remove
              </button>
            </div>

            <div style={daysGridStyle}>
              <div>
                <div style={dayLabelStyle}>Days rented</div>
                <input
                  type="number"
                  style={dayInputStyle}
                  value={property.daysRented}
                  min="0"
                  onInput={(e) => handleDaysRentedChange(property.id, parseInt((e.target as HTMLInputElement).value) || 0)}
                />
              </div>
              <div>
                <div style={dayLabelStyle}>Personal use days</div>
                <input
                  type="number"
                  style={dayInputStyle}
                  value={property.personalUseDays}
                  min="0"
                  onInput={(e) => handlePersonalUseDaysChange(property.id, parseInt((e.target as HTMLInputElement).value) || 0)}
                />
              </div>
            </div>

            <ChecklistItemRow
              label="Rental income"
              item={property.rentalIncome}
              onChange={(updated) => handleRentalIncomeChange(property.id, updated)}
            />

            <div style={{ 'margin-top': '0.75rem' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  'font-weight': '600',
                  'font-size': '0.875rem',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 0',
                }}
                onClick={() => toggleCollapse(`${property.id}-expenses`)}
              >
                {isCollapsed(`${property.id}-expenses`) ? '+ ' : '- '}Expenses
              </button>
              <Show when={!isCollapsed(`${property.id}-expenses`)}>
                <div>
                  <For each={expenseLabels}>
                    {(expense) => (
                      <ChecklistItemRow
                        label={expense.label}
                        item={property.expenses[expense.key]}
                        onChange={(updated) => handleExpenseChange(property.id, expense.key, updated)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div style={{ 'margin-top': '0.75rem' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  'font-weight': '600',
                  'font-size': '0.875rem',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 0',
                }}
                onClick={() => toggleCollapse(`${property.id}-improvements`)}
              >
                {isCollapsed(`${property.id}-improvements`) ? '+ ' : '- '}Capital Improvements
              </button>
              <Show when={!isCollapsed(`${property.id}-improvements`)}>
                <div>
                  <For each={capitalImprovementLabels}>
                    {(improvement) => (
                      <ChecklistItemRow
                        label={improvement.label}
                        item={property.capitalImprovements[improvement.key]}
                        onChange={(updated) => handleImprovementChange(property.id, improvement.key, updated)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

export default RentalPropertiesPanel;
