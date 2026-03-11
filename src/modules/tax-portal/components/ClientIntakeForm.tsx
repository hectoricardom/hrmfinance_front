import { Component, createSignal, For, Show } from 'solid-js';
import { devLog } from '../../../services/utils';
import { Button } from '../../ui';
import {
  TaxClientProfile,
  FilingStatus,
  IncomeSource,
  DeductionType,
  FILING_STATUS_LABELS,
  INCOME_SOURCE_LABELS,
  DEDUCTION_TYPE_LABELS,
  Dependent,
} from '../types';
import { taxPortalService } from '../services/taxPortalService';

interface ClientIntakeFormProps {
  onSubmit: (client: TaxClientProfile) => void;
  onCancel: () => void;
  initialData?: Partial<TaxClientProfile>;
}

const ClientIntakeForm: Component<ClientIntakeFormProps> = (props) => {
  const [step, setStep] = createSignal(1);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Form data
  const [firstName, setFirstName] = createSignal(props.initialData?.firstName || '');
  const [lastName, setLastName] = createSignal(props.initialData?.lastName || '');
  const [email, setEmail] = createSignal(props.initialData?.email || '');
  const [phone, setPhone] = createSignal(props.initialData?.phone || '');
  const [dateOfBirth, setDateOfBirth] = createSignal(props.initialData?.dateOfBirth || '');
  const [address, setAddress] = createSignal(props.initialData?.address || '');
  const [city, setCity] = createSignal(props.initialData?.city || '');
  const [state, setState] = createSignal(props.initialData?.state || '');
  const [zipCode, setZipCode] = createSignal(props.initialData?.zipCode || '');

  const [filingStatus, setFilingStatus] = createSignal<FilingStatus>(props.initialData?.filingStatus || 'single');
  const [hasDependents, setHasDependents] = createSignal(props.initialData?.hasDependents || false);
  const [dependents, setDependents] = createSignal<Dependent[]>(props.initialData?.dependents || []);

  const [incomeSources, setIncomeSources] = createSignal<IncomeSource[]>(props.initialData?.incomeSources || []);
  const [deductions, setDeductions] = createSignal<DeductionType[]>(props.initialData?.deductions || []);

  const [isHomeowner, setIsHomeowner] = createSignal(props.initialData?.isHomeowner || false);
  const [isStudent, setIsStudent] = createSignal(props.initialData?.isStudent || false);
  const [hasBusiness, setHasBusiness] = createSignal(props.initialData?.hasBusiness || false);
  const [hasInvestments, setHasInvestments] = createSignal(props.initialData?.hasInvestments || false);
  const [hasRentalProperty, setHasRentalProperty] = createSignal(props.initialData?.hasRentalProperty || false);

  const [notes, setNotes] = createSignal(props.initialData?.notes || '');

  // Toggle functions
  const toggleIncomeSource = (source: IncomeSource) => {
    setIncomeSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const toggleDeduction = (deduction: DeductionType) => {
    setDeductions(prev =>
      prev.includes(deduction)
        ? prev.filter(d => d !== deduction)
        : [...prev, deduction]
    );
  };

  // Add dependent
  const addDependent = () => {
    const newDependent: Dependent = {
      id: `dep-${Date.now()}`,
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      relationship: 'child',
      monthsLivedWithYou: 12,
      isStudent: false,
      isDisabled: false,
    };
    setDependents(prev => [...prev, newDependent]);
  };

  // Update dependent
  const updateDependent = (id: string, field: keyof Dependent, value: any) => {
    setDependents(prev =>
      prev.map(d => d.id === id ? { ...d, [field]: value } : d)
    );
  };

  // Remove dependent
  const removeDependent = (id: string) => {
    setDependents(prev => prev.filter(d => d.id !== id));
  };

  // Validate current step
  const validateStep = (): boolean => {
    setError(null);

    if (step() === 1) {
      if (!firstName().trim() || !lastName().trim()) {
        setError('First and last name are required');
        return false;
      }
      if (!email().trim() && !phone().trim()) {
        setError('Email or phone number is required');
        return false;
      }
    }

    return true;
  };

  // Handle next step
  const nextStep = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const clientData: Partial<TaxClientProfile> = {
        firstName: firstName(),
        lastName: lastName(),
        email: email(),
        phone: phone(),
        dateOfBirth: dateOfBirth(),
        address: address(),
        city: city(),
        state: state(),
        zipCode: zipCode(),
        filingStatus: filingStatus(),
        hasDependents: hasDependents(),
        dependents: dependents(),
        incomeSources: incomeSources(),
        deductions: deductions(),
        isHomeowner: isHomeowner(),
        isStudent: isStudent(),
        hasBusiness: hasBusiness(),
        hasInvestments: hasInvestments(),
        hasRentalProperty: hasRentalProperty(),
        notes: notes(),
      };

      const client = await taxPortalService.createClient(clientData);
      props.onSubmit(client);
    } catch (err) {
      devLog('Error creating client:', err);
      setError('Failed to create client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styles
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '6px',
    'font-size': '1rem',
  };

  const labelStyle = {
    display: 'block',
    'font-weight': '500',
    'margin-bottom': '0.5rem',
  };

  const fieldGroupStyle = {
    'margin-bottom': '1rem',
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(2, 1fr)',
    gap: '1rem',
  };

  const checkboxGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.75rem',
  };

  const checkboxLabelStyle = (isSelected: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
    'border-radius': '8px',
    cursor: 'pointer',
    background: isSelected ? 'var(--primary-color)10' : 'white',
    transition: 'all 0.2s ease',
  });

  const stepIndicatorStyle = (stepNum: number) => ({
    width: '32px',
    height: '32px',
    'border-radius': '50%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: step() >= stepNum ? 'var(--primary-color)' : 'var(--gray-200)',
    color: step() >= stepNum ? 'white' : 'var(--text-muted)',
    'font-weight': '600',
    'font-size': '0.875rem',
  });

  return (
    <div>
      {/* Step Indicator */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        gap: '0.5rem',
        'margin-bottom': '2rem',
      }}>
        <For each={[1, 2, 3, 4]}>
          {(stepNum) => (
            <>
              <div style={stepIndicatorStyle(stepNum)}>{stepNum}</div>
              <Show when={stepNum < 4}>
                <div style={{
                  width: '60px',
                  height: '2px',
                  background: step() > stepNum ? 'var(--primary-color)' : 'var(--gray-200)',
                }} />
              </Show>
            </>
          )}
        </For>
      </div>

      {/* Error Message */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          'border-radius': '8px',
          'margin-bottom': '1rem',
          color: '#dc2626',
        }}>
          {error()}
        </div>
      </Show>

      {/* Step 1: Personal Information */}
      <Show when={step() === 1}>
        <h3 style={{ margin: '0 0 1.5rem' }}>Personal Information</h3>

        <div style={gridStyle}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>First Name *</label>
            <input
              type="text"
              style={inputStyle}
              value={firstName()}
              onInput={(e) => setFirstName(e.currentTarget.value)}
              placeholder="John"
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Last Name *</label>
            <input
              type="text"
              style={inputStyle}
              value={lastName()}
              onInput={(e) => setLastName(e.currentTarget.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        <div style={gridStyle}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="john@example.com"
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              style={inputStyle}
              value={phone()}
              onInput={(e) => setPhone(e.currentTarget.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Date of Birth</label>
          <input
            type="date"
            style={inputStyle}
            value={dateOfBirth()}
            onInput={(e) => setDateOfBirth(e.currentTarget.value)}
          />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            style={inputStyle}
            value={address()}
            onInput={(e) => setAddress(e.currentTarget.value)}
            placeholder="123 Main Street"
          />
        </div>

        <div style={gridStyle}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              style={inputStyle}
              value={city()}
              onInput={(e) => setCity(e.currentTarget.value)}
              placeholder="New York"
            />
          </div>
          <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>State</label>
              <input
                type="text"
                style={inputStyle}
                value={state()}
                onInput={(e) => setState(e.currentTarget.value)}
                placeholder="NY"
                maxLength={2}
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>ZIP Code</label>
              <input
                type="text"
                style={inputStyle}
                value={zipCode()}
                onInput={(e) => setZipCode(e.currentTarget.value)}
                placeholder="10001"
              />
            </div>
          </div>
        </div>
      </Show>

      {/* Step 2: Filing Status & Dependents */}
      <Show when={step() === 2}>
        <h3 style={{ margin: '0 0 1.5rem' }}>Filing Status & Dependents</h3>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Filing Status</label>
          <div style={checkboxGroupStyle}>
            <For each={Object.entries(FILING_STATUS_LABELS) as [FilingStatus, string][]}>
              {([value, label]) => (
                <label style={checkboxLabelStyle(filingStatus() === value)}>
                  <input
                    type="radio"
                    name="filingStatus"
                    checked={filingStatus() === value}
                    onChange={() => setFilingStatus(value)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    'border-radius': '50%',
                    border: `2px solid ${filingStatus() === value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                  }}>
                    <Show when={filingStatus() === value}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        'border-radius': '50%',
                        background: 'var(--primary-color)',
                      }} />
                    </Show>
                  </div>
                  <span style={{ 'font-size': '0.875rem' }}>{label}</span>
                </label>
              )}
            </For>
          </div>
        </div>

        <div style={fieldGroupStyle}>
          <label style={checkboxLabelStyle(hasDependents())}>
            <input
              type="checkbox"
              checked={hasDependents()}
              onChange={(e) => setHasDependents(e.currentTarget.checked)}
            />
            <span>I have dependents (children, elderly parents, etc.)</span>
          </label>
        </div>

        <Show when={hasDependents()}>
          <div style={{ 'margin-top': '1rem', padding: '1rem', background: 'var(--gray-50)', 'border-radius': '8px' }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
              <h4 style={{ margin: 0 }}>Dependents</h4>
              <Button variant="outline" size="sm" onClick={addDependent}>
                + Add Dependent
              </Button>
            </div>

            <For each={dependents()}>
              {(dep) => (
                <div style={{
                  padding: '1rem',
                  background: 'white',
                  'border-radius': '8px',
                  'margin-bottom': '0.75rem',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
                    <strong>Dependent</strong>
                    <button
                      onClick={() => removeDependent(dep.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={gridStyle}>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="First Name"
                      value={dep.firstName}
                      onInput={(e) => updateDependent(dep.id, 'firstName', e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="Last Name"
                      value={dep.lastName}
                      onInput={(e) => updateDependent(dep.id, 'lastName', e.currentTarget.value)}
                    />
                  </div>
                  <div style={{ ...gridStyle, 'margin-top': '0.5rem' }}>
                    <input
                      type="date"
                      style={inputStyle}
                      value={dep.dateOfBirth}
                      onInput={(e) => updateDependent(dep.id, 'dateOfBirth', e.currentTarget.value)}
                    />
                    <select
                      style={inputStyle}
                      value={dep.relationship}
                      onChange={(e) => updateDependent(dep.id, 'relationship', e.currentTarget.value)}
                    >
                      <option value="child">Child</option>
                      <option value="parent">Parent</option>
                      <option value="relative">Other Relative</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </For>

            <Show when={dependents().length === 0}>
              <p style={{ 'text-align': 'center', color: 'var(--text-muted)' }}>
                Click "Add Dependent" to add dependents
              </p>
            </Show>
          </div>
        </Show>
      </Show>

      {/* Step 3: Income Sources */}
      <Show when={step() === 3}>
        <h3 style={{ margin: '0 0 1.5rem' }}>Income Sources</h3>
        <p style={{ color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
          Select all income sources that apply to you. This helps us know which documents you'll need.
        </p>

        <div style={checkboxGroupStyle}>
          <For each={Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][]}>
            {([value, label]) => (
              <label style={checkboxLabelStyle(incomeSources().includes(value))}>
                <input
                  type="checkbox"
                  checked={incomeSources().includes(value)}
                  onChange={() => toggleIncomeSource(value)}
                />
                <span style={{ 'font-size': '0.875rem' }}>{label}</span>
              </label>
            )}
          </For>
        </div>

        <h3 style={{ margin: '2rem 0 1rem' }}>Additional Situations</h3>

        <div style={checkboxGroupStyle}>
          <label style={checkboxLabelStyle(isHomeowner())}>
            <input type="checkbox" checked={isHomeowner()} onChange={(e) => setIsHomeowner(e.currentTarget.checked)} />
            <span>I own a home</span>
          </label>
          <label style={checkboxLabelStyle(hasRentalProperty())}>
            <input type="checkbox" checked={hasRentalProperty()} onChange={(e) => setHasRentalProperty(e.currentTarget.checked)} />
            <span>I have rental property</span>
          </label>
          <label style={checkboxLabelStyle(hasBusiness())}>
            <input type="checkbox" checked={hasBusiness()} onChange={(e) => setHasBusiness(e.currentTarget.checked)} />
            <span>I own a business</span>
          </label>
          <label style={checkboxLabelStyle(hasInvestments())}>
            <input type="checkbox" checked={hasInvestments()} onChange={(e) => setHasInvestments(e.currentTarget.checked)} />
            <span>I have investments</span>
          </label>
          <label style={checkboxLabelStyle(isStudent())}>
            <input type="checkbox" checked={isStudent()} onChange={(e) => setIsStudent(e.currentTarget.checked)} />
            <span>I am a student</span>
          </label>
        </div>
      </Show>

      {/* Step 4: Deductions */}
      <Show when={step() === 4}>
        <h3 style={{ margin: '0 0 1.5rem' }}>Potential Deductions</h3>
        <p style={{ color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
          Select any deductions you may have. This helps ensure we collect all necessary documents.
        </p>

        <div style={checkboxGroupStyle}>
          <For each={Object.entries(DEDUCTION_TYPE_LABELS) as [DeductionType, string][]}>
            {([value, label]) => (
              <label style={checkboxLabelStyle(deductions().includes(value))}>
                <input
                  type="checkbox"
                  checked={deductions().includes(value)}
                  onChange={() => toggleDeduction(value)}
                />
                <span style={{ 'font-size': '0.875rem' }}>{label}</span>
              </label>
            )}
          </For>
        </div>

        <div style={{ ...fieldGroupStyle, 'margin-top': '2rem' }}>
          <label style={labelStyle}>Additional Notes</label>
          <textarea
            style={{ ...inputStyle, 'min-height': '100px', resize: 'vertical' }}
            value={notes()}
            onInput={(e) => setNotes(e.currentTarget.value)}
            placeholder="Any additional information about the client's tax situation..."
          />
        </div>
      </Show>

      {/* Navigation Buttons */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'margin-top': '2rem',
        'padding-top': '1rem',
        'border-top': '1px solid var(--border-color)',
      }}>
        <div>
          <Show when={step() > 1}>
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          </Show>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Show when={step() < 4}>
            <Button variant="primary" onClick={nextStep}>
              Next
            </Button>
          </Show>
          <Show when={step() === 4}>
            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting()}>
              {isSubmitting() ? 'Creating...' : 'Create Client'}
            </Button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default ClientIntakeForm;
