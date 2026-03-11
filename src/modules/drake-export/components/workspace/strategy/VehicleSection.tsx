import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { BusinessVehicleEntry, ChecklistItem, createDefaultChecklistItem } from '../../../types/taxStrategyTypes';
import { generateRandomId } from '../../../../../services/utils';
import ChecklistItemRow from './ChecklistItemRow';
import { FormInput } from '../../../../ui';

interface VehicleSectionProps {
  vehicles: BusinessVehicleEntry[];
  onChange: (vehicles: BusinessVehicleEntry[]) => void;
}

const ownershipTypeOptions: { value: BusinessVehicleEntry['ownershipType']; label: string }[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'financed', label: 'Financed' },
];

const deductionMethodOptions: { value: BusinessVehicleEntry['deductionMethod']; label: string }[] = [
  { value: 'standard_mileage', label: 'Standard Mileage Rate' },
  { value: 'actual_expenses', label: 'Actual Expenses' },
];

const actualExpenseLabels: { key: keyof NonNullable<BusinessVehicleEntry['actualExpenses']>; label: string }[] = [
  { key: 'gasAndOil', label: 'Gas & Oil' },
  { key: 'repairs', label: 'Repairs & Maintenance' },
  { key: 'tires', label: 'Tires' },
  { key: 'insurance', label: 'Vehicle Insurance' },
  { key: 'registration', label: 'Registration Fees' },
  { key: 'leasePayments', label: 'Lease Payments' },
  { key: 'loanInterest', label: 'Loan Interest' },
  { key: 'depreciation', label: 'Depreciation' },
  { key: 'carWash', label: 'Car Wash' },
  { key: 'parking', label: 'Parking Fees' },
  { key: 'tolls', label: 'Tolls' },
];

// Styles
const addButtonStyle: Record<string, string> = {
  background: '#0891b2',
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
  'flex-wrap': 'wrap',
};

const inputStyle: Record<string, string> = {
  padding: '0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  'font-size': '0.875rem',
  'box-sizing': 'border-box',
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

const labelStyle: Record<string, string> = {
  'font-size': '0.75rem',
  color: 'var(--text-secondary)',
  'margin-bottom': '0.25rem',
};

const gridStyle: Record<string, string> = {
  display: 'grid',
  'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '0.75rem',
  'margin-bottom': '0.75rem',
};

const sectionTitleStyle: Record<string, string> = {
  'font-weight': '600',
  'font-size': '0.875rem',
  color: '#0891b2',
  'margin-top': '1rem',
  'margin-bottom': '0.5rem',
  'border-bottom': '1px solid #0891b2',
  'padding-bottom': '0.25rem',
};

const checkboxContainerStyle: Record<string, string> = {
  display: 'flex',
  'align-items': 'center',
  gap: '0.5rem',
  'margin-bottom': '0.5rem',
  'font-size': '0.875rem',
};

const percentageBadgeStyle: Record<string, string> = {
  background: '#0891b2',
  color: 'white',
  padding: '0.25rem 0.5rem',
  'border-radius': 'var(--border-radius-md)',
  'font-size': '0.75rem',
  'font-weight': '600',
};

const collapsibleButtonStyle: Record<string, string> = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  'font-weight': '600',
  'font-size': '0.875rem',
  color: 'var(--text-primary)',
  padding: '0.5rem 0',
};

const notesTextareaStyle: Record<string, string> = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--border-color)',
  'border-radius': 'var(--border-radius-md)',
  'font-size': '0.875rem',
  'min-height': '60px',
  resize: 'vertical',
  'box-sizing': 'border-box',
};

function createDefaultVehicle(): BusinessVehicleEntry {
  const id = generateRandomId();
  return {
    id,
    year: new Date().getFullYear(),
    make: '',
    model: '',
    vin: '',
    licensePlate: '',
    dateAcquired: '',
    datePlacedInService: '',
    ownershipType: 'owned',
    purchasePrice: undefined,
    leasePaymentMonthly: undefined,
    loanPaymentMonthly: undefined,
    totalMilesDriven: 0,
    businessMilesDriven: 0,
    commutingMiles: 0,
    personalMiles: 0,
    businessUsePercentage: 0,
    availableForPersonalUse: false,
    anotherVehicleForPersonal: false,
    hasWrittenEvidence: false,
    isEvidenceWritten: false,
    deductionMethod: 'standard_mileage',
    standardMileageRate: 0.67, // 2024 rate
    actualExpenses: {
      gasAndOil: createDefaultChecklistItem(`${id}-gasAndOil`),
      repairs: createDefaultChecklistItem(`${id}-repairs`),
      tires: createDefaultChecklistItem(`${id}-tires`),
      insurance: createDefaultChecklistItem(`${id}-insurance`),
      registration: createDefaultChecklistItem(`${id}-registration`),
      leasePayments: createDefaultChecklistItem(`${id}-leasePayments`),
      loanInterest: createDefaultChecklistItem(`${id}-loanInterest`),
      depreciation: createDefaultChecklistItem(`${id}-depreciation`),
      carWash: createDefaultChecklistItem(`${id}-carWash`),
      parking: createDefaultChecklistItem(`${id}-parking`),
      tolls: createDefaultChecklistItem(`${id}-tolls`),
    },
    notes: '',
  };
}

const VehicleSection: Component<VehicleSectionProps> = (props) => {
  const [collapsed, setCollapsed] = createSignal<Record<string, boolean>>({});

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isCollapsed = (key: string): boolean => {
    return !!collapsed()[key];
  };

  const handleAddVehicle = () => {
    const newVehicle = createDefaultVehicle();
    props.onChange([...props.vehicles, newVehicle]);
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    props.onChange(props.vehicles.filter((v) => v.id !== vehicleId));
  };

  const updateVehicle = (vehicleId: string, updates: Partial<BusinessVehicleEntry>) => {
    const updatedVehicles = props.vehicles.map((v) =>
      v.id === vehicleId ? { ...v, ...updates } : v
    );
    props.onChange(updatedVehicles);
  };

  const calculateBusinessUsePercentage = (vehicle: BusinessVehicleEntry): number => {
    if (vehicle.totalMilesDriven === 0) return 0;
    return Math.round((vehicle.businessMilesDriven / vehicle.totalMilesDriven) * 100);
  };

  const handleMileageChange = (vehicleId: string, field: string, value: number) => {
    const vehicle = props.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const updates: Partial<BusinessVehicleEntry> = { [field]: value };

    // Recalculate business use percentage
    const totalMiles = field === 'totalMilesDriven' ? value : vehicle.totalMilesDriven;
    const businessMiles = field === 'businessMilesDriven' ? value : vehicle.businessMilesDriven;

    if (totalMiles > 0) {
      updates.businessUsePercentage = Math.round((businessMiles / totalMiles) * 100);
    } else {
      updates.businessUsePercentage = 0;
    }

    updateVehicle(vehicleId, updates);
  };

  const handleExpenseChange = (
    vehicleId: string,
    key: keyof NonNullable<BusinessVehicleEntry['actualExpenses']>,
    updated: ChecklistItem
  ) => {
    const vehicle = props.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle || !vehicle.actualExpenses) return;

    updateVehicle(vehicleId, {
      actualExpenses: { ...vehicle.actualExpenses, [key]: updated },
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-bottom': '1rem' }}>
        <button style={addButtonStyle} onClick={handleAddVehicle}>
          Add Vehicle
        </button>
      </div>

      <For each={props.vehicles}>
        {(vehicle, index) => (
          <div style={cardStyle}>
            {/* Header with Vehicle Number and Remove Button */}
            <div style={headerStyle}>
              <span style={{ 'font-weight': '600', 'font-size': '0.875rem', 'white-space': 'nowrap', color: '#0891b2' }}>
                Vehicle #{index() + 1}
              </span>
              <span style={{ flex: '1' }}></span>
              <Show when={vehicle.businessUsePercentage !== undefined && vehicle.businessUsePercentage > 0}>
                <span style={percentageBadgeStyle}>
                  {vehicle.businessUsePercentage}% Business Use
                </span>
              </Show>
              <button style={removeButtonStyle} onClick={() => handleRemoveVehicle(vehicle.id)}>
                Remove
              </button>
            </div>

            {/* Vehicle Identification */}
            <div style={sectionTitleStyle}>Vehicle Identification</div>
            <div style={gridStyle}>
              <div>
                <div style={labelStyle}>Year *</div>
                <FormInput
                  type="number"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.year}
                  min="1900"
                  max="2100"
                  onChange={(e) => updateVehicle(vehicle.id, { year: parseInt(e) })}
                />
              </div>
              <div>
                <div style={labelStyle}>Make *</div>
                <FormInput
                  type="text"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.make}
                  placeholder="e.g., Toyota"
                  onChange={(e) => updateVehicle(vehicle.id, { make: e })}
                />
              </div>
              <div>
                <div style={labelStyle}>Model *</div>
                <FormInput
                  type="text"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.model}
                  placeholder="e.g., Camry"
                  onChange={(e) => updateVehicle(vehicle.id, { model: e })}
                />
              </div>
              <div>
                <div style={labelStyle}>VIN</div>
                <FormInput
                  type="text"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.vin || ''}
                  placeholder="Optional"
                  onChange={(e) => updateVehicle(vehicle.id, { vin: e })}
                />
              </div>
              <div>
                <div style={labelStyle}>License Plate</div>
                <FormInput
                  type="text"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.licensePlate || ''}
                  placeholder="Optional"
                  onChange={(e) => updateVehicle(vehicle.id, { licensePlate: e})}
                />
              </div>
            </div>

            {/* Service Information */}
            <div style={sectionTitleStyle}>Service Information</div>
            <div style={gridStyle}>
              <div>
                <div style={labelStyle}>Date Acquired</div>
                <FormInput
                  type="date"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.dateAcquired}
                  onChange={(e) => updateVehicle(vehicle.id, { dateAcquired: e })}
                />
              </div>
              <div>
                <div style={labelStyle}>Date Placed in Service</div>
                <FormInput
                  type="date"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.datePlacedInService}
                  onChange={(e) => updateVehicle(vehicle.id, { datePlacedInService: e})}
                />
              </div>
            </div>

            {/* Ownership Information */}
            <div style={sectionTitleStyle}>Ownership Information</div>
            <div style={gridStyle}>
              <div>
                <div style={labelStyle}>Ownership Type</div>
                <select
                  style={{ ...selectStyle, width: '100%' }}
                  value={vehicle.ownershipType}
                  onChange={(e) => updateVehicle(vehicle.id, { ownershipType: (e.target as HTMLSelectElement).value as BusinessVehicleEntry['ownershipType'] })}
                >
                  <For each={ownershipTypeOptions}>
                    {(option) => (
                      <option value={option.value}>{option.label}</option>
                    )}
                  </For>
                </select>
              </div>
              <Show when={vehicle.ownershipType === 'owned'}>
                <div>
                  <div style={labelStyle}>Purchase Price ($)</div>
                 <FormInput
                    type="number"
                    style={{ ...inputStyle, width: '100%' }}
                    value={vehicle.purchasePrice || ''}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    onChange={(e) => updateVehicle(vehicle.id, { purchasePrice: parseFloat(e)})}
                  />
                </div>
              </Show>
              <Show when={vehicle.ownershipType === 'leased'}>
                <div>
                  <div style={labelStyle}>Monthly Lease Payment ($)</div>
                  <FormInput
                    type="number"
                    style={{ ...inputStyle, width: '100%' }}
                    value={vehicle.leasePaymentMonthly || ''}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    onChange={(e) => updateVehicle(vehicle.id, { leasePaymentMonthly: parseFloat(e)})}
                  />
                </div>
              </Show>
              <Show when={vehicle.ownershipType === 'financed'}>
                <div>
                  <div style={labelStyle}>Monthly Loan Payment ($)</div>
                 <FormInput
                    type="number"
                    style={{ ...inputStyle, width: '100%' }}
                    value={vehicle.loanPaymentMonthly || ''}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    onChange={(e) => updateVehicle(vehicle.id, { loanPaymentMonthly: parseFloat(e)})}
                  />
                </div>
              </Show>
            </div>

            {/* Mileage Tracking */}
            <div style={sectionTitleStyle}>Mileage Tracking</div>
            <div style={gridStyle}>
              <div>
                <div style={labelStyle}>Total Miles Driven</div>
                <FormInput
                  type="number"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.totalMilesDriven}
                  min="0"
                  onChange={(e) => handleMileageChange(vehicle.id, 'totalMilesDriven', parseInt(e))}
                />
              </div>
              <div>
                <div style={labelStyle}>Business Miles</div>
                <FormInput
                  type="number"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.businessMilesDriven}
                  min="0"
                  onChange={(e) => handleMileageChange(vehicle.id, 'businessMilesDriven', parseInt(e) )}
                />
              </div>
              <div>
                <div style={labelStyle}>Commuting Miles</div>
                <FormInput
                  type="number"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.commutingMiles || 0}
                  min="0"
                  onChange={(e) => updateVehicle(vehicle.id, { commutingMiles: parseInt(e) })}
                />
              </div>
              <div>
                <div style={labelStyle}>Personal Miles</div>
                <FormInput
                  type="number"
                  style={{ ...inputStyle, width: '100%' }}
                  value={vehicle.personalMiles || 0}
                  min="0"
                  onChange={(e) => updateVehicle(vehicle.id, { personalMiles: parseInt(e) })}
                />
              </div>
              <div>
                <div style={labelStyle}>Business Use %</div>
                <div style={{ ...inputStyle, width: '100%', background: '#f0fdfa', color: '#0891b2', 'font-weight': '600', 'text-align': 'center' }}>
                  {calculateBusinessUsePercentage(vehicle)}%
                </div>
              </div>
            </div>

            {/* IRS Questions */}
            <div style={sectionTitleStyle}>IRS Questions (Form 4562 Part V)</div>
            <div style={{ 'margin-bottom': '0.75rem' }}>
              <label style={checkboxContainerStyle}>
                <input
                  type="checkbox"
                  checked={vehicle.availableForPersonalUse}
                  onChange={(e) => updateVehicle(vehicle.id, { availableForPersonalUse: (e.target as HTMLInputElement).checked })}
                />
                Was the vehicle available for personal use during off-duty hours?
              </label>
              <label style={checkboxContainerStyle}>
                <input
                  type="checkbox"
                  checked={vehicle.anotherVehicleForPersonal}
                  onChange={(e) => updateVehicle(vehicle.id, { anotherVehicleForPersonal: (e.target as HTMLInputElement).checked })}
                />
                Do you have another vehicle available for personal use?
              </label>
              <label style={checkboxContainerStyle}>
                <input
                  type="checkbox"
                  checked={vehicle.hasWrittenEvidence}
                  onChange={(e) => updateVehicle(vehicle.id, { hasWrittenEvidence: (e.target as HTMLInputElement).checked })}
                />
                Do you have written evidence to support your deduction?
              </label>
              <Show when={vehicle.hasWrittenEvidence}>
                <label style={{ ...checkboxContainerStyle, 'margin-left': '1.5rem' }}>
                  <input
                    type="checkbox"
                    checked={vehicle.isEvidenceWritten}
                    onChange={(e) => updateVehicle(vehicle.id, { isEvidenceWritten: (e.target as HTMLInputElement).checked })}
                  />
                  Is the evidence written (vs. electronic/app)?
                </label>
              </Show>
            </div>

            {/* Deduction Method */}
            <div style={sectionTitleStyle}>Deduction Method</div>
            <div style={gridStyle}>
              <div>
                <div style={labelStyle}>Method</div>
                <select
                  style={{ ...selectStyle, width: '100%' }}
                  value={vehicle.deductionMethod}
                  onChange={(e) => updateVehicle(vehicle.id, { deductionMethod: (e.target as HTMLSelectElement).value as BusinessVehicleEntry['deductionMethod'] })}
                >
                  <For each={deductionMethodOptions}>
                    {(option) => (
                      <option value={option.value}>{option.label}</option>
                    )}
                  </For>
                </select>
              </div>
              <Show when={vehicle.deductionMethod === 'standard_mileage'}>
                <div>
                  <div style={labelStyle}>IRS Mileage Rate ($/mile)</div>
                  <input
                    type="number"
                    style={{ ...inputStyle, width: '100%' }}
                    value={vehicle.standardMileageRate || 0.67}
                    min="0"
                    step="0.01"
                    onInput={(e) => updateVehicle(vehicle.id, { standardMileageRate: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                </div>
              </Show>
            </div>

            {/* Actual Expenses Section (Collapsible) */}
            <Show when={vehicle.deductionMethod === 'actual_expenses'}>
              <div style={{ 'margin-top': '0.75rem' }}>
                <button
                  style={collapsibleButtonStyle}
                  onClick={() => toggleCollapse(`${vehicle.id}-expenses`)}
                >
                  {isCollapsed(`${vehicle.id}-expenses`) ? '+ ' : '- '}Actual Expenses
                </button>
                <Show when={!isCollapsed(`${vehicle.id}-expenses`)}>
                  <div>
                    <For each={actualExpenseLabels}>
                      {(expense) => (
                        <ChecklistItemRow
                          label={expense.label}
                          item={vehicle.actualExpenses?.[expense.key] || createDefaultChecklistItem(`${vehicle.id}-${expense.key}`)}
                          onChange={(updated) => handleExpenseChange(vehicle.id, expense.key, updated)}
                        />
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Notes Section (Collapsible) */}
            <div style={{ 'margin-top': '0.75rem' }}>
              <button
                style={collapsibleButtonStyle}
                onClick={() => toggleCollapse(`${vehicle.id}-notes`)}
              >
                {isCollapsed(`${vehicle.id}-notes`) ? '+ ' : '- '}Notes for Preparer
              </button>
              <Show when={!isCollapsed(`${vehicle.id}-notes`)}>
                <div style={{ 'margin-top': '0.5rem' }}>
                  <textarea
                    style={notesTextareaStyle}
                    value={vehicle.notes || ''}
                    placeholder="Add any additional notes or documentation for the tax preparer..."
                    onInput={(e) => updateVehicle(vehicle.id, { notes: (e.target as HTMLTextAreaElement).value })}
                  />
                </div>
              </Show>
            </div>
          </div>
        )}
      </For>

      <Show when={props.vehicles.length === 0}>
        <div style={{
          'text-align': 'center',
          padding: '2rem',
          color: 'var(--text-secondary)',
          border: '2px dashed var(--border-color)',
          'border-radius': 'var(--border-radius-lg)',
        }}>
          <p style={{ 'margin-bottom': '1rem' }}>No vehicles added yet.</p>
          <button style={addButtonStyle} onClick={handleAddVehicle}>
            Add Your First Vehicle
          </button>
        </div>
      </Show>
    </div>
  );
};

export default VehicleSection;
