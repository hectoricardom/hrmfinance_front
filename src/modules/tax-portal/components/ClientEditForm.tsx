import { Component, createSignal, For, Show } from 'solid-js';
import { Button } from '../../ui';
import {
  TaxClientProfile,
  FilingStatus,
  IncomeSource,
  DeductionType,
  FILING_STATUS_LABELS,
  INCOME_SOURCE_LABELS,
  DEDUCTION_TYPE_LABELS,
  REQUIRED_DOCUMENTS,
} from '../types';
import { useTranslation } from '../../../translations';

interface ClientEditFormProps {
  client: TaxClientProfile;
  onSave: (updates: Partial<TaxClientProfile>) => Promise<void>;
  onCancel: () => void;
}

const ClientEditForm: Component<ClientEditFormProps> = (props) => {
  const { t } = useTranslation();

  // Personal Info
  const [firstName, setFirstName] = createSignal(props.client.firstName);
  const [lastName, setLastName] = createSignal(props.client.lastName);
  const [email, setEmail] = createSignal(props.client.email);
  const [phone, setPhone] = createSignal(props.client.phone);
  const [ssn, setSsn] = createSignal(props.client.ssn || '');
  const [dateOfBirth, setDateOfBirth] = createSignal(props.client.dateOfBirth || '');

  // Address
  const [address, setAddress] = createSignal(props.client.address || '');
  const [city, setCity] = createSignal(props.client.city || '');
  const [state, setState] = createSignal(props.client.state || '');
  const [zipCode, setZipCode] = createSignal(props.client.zipCode || '');

  // Filing Info
  const [taxYear, setTaxYear] = createSignal(props.client.taxYear);
  const [filingStatus, setFilingStatus] = createSignal<FilingStatus>(props.client.filingStatus);

  // Situations (affects required documents)
  const [hasDependents, setHasDependents] = createSignal(props.client.hasDependents);
  const [isHomeowner, setIsHomeowner] = createSignal(props.client.isHomeowner);
  const [isStudent, setIsStudent] = createSignal(props.client.isStudent);
  const [hasBusiness, setHasBusiness] = createSignal(props.client.hasBusiness);
  const [hasInvestments, setHasInvestments] = createSignal(props.client.hasInvestments);
  const [hasRentalProperty, setHasRentalProperty] = createSignal(props.client.hasRentalProperty);
  const [receivedHealthInsurance, setReceivedHealthInsurance] = createSignal(props.client.receivedHealthInsurance);

  // Income Sources
  const [incomeSources, setIncomeSources] = createSignal<IncomeSource[]>(props.client?.incomeSources);

  // Deductions
  const [deductions, setDeductions] = createSignal<DeductionType[]>(props?.client?.deductions);

  // Notes
  const [notes, setNotes] = createSignal(props?.client?.notes || '');

  // UI State
  const [saving, setSaving] = createSignal(false);
  const [activeSection, setActiveSection] = createSignal<'personal' | 'filing' | 'income' | 'deductions' | 'situations'>('personal');

  const toggleIncomeSource = (source: IncomeSource) => {
    const current = incomeSources();
    if (current?.includes?.(source)) {
      setIncomeSources(current.filter(s => s !== source));
    } else {
      setIncomeSources([...current, source]);
    }
  };

  const toggleDeduction = (deduction: DeductionType) => {
    const current = deductions();
    if (current?.includes?.(deduction)) {
      setDeductions(current.filter(d => d !== deduction));
    } else {
      let cur = current || []
      setDeductions([...cur , deduction]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await props.onSave({
        firstName: firstName(),
        lastName: lastName(),
        email: email(),
        phone: phone(),
        ssn: ssn() || undefined,
        dateOfBirth: dateOfBirth() || undefined,
        address: address() || undefined,
        city: city() || undefined,
        state: state() || undefined,
        zipCode: zipCode() || undefined,
        taxYear: taxYear(),
        filingStatus: filingStatus(),
        hasDependents: hasDependents(),
        isHomeowner: isHomeowner(),
        isStudent: isStudent(),
        hasBusiness: hasBusiness(),
        hasInvestments: hasInvestments(),
        hasRentalProperty: hasRentalProperty(),
        receivedHealthInsurance: receivedHealthInsurance(),
        incomeSources: incomeSources(),
        deductions: deductions(),
        notes: notes() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  // Get affected documents based on current selections
  const getAffectedDocuments = () => {
    const mockProfile: Partial<TaxClientProfile> = {
      incomeSources: incomeSources(),
      deductions: deductions(),
      hasDependents: hasDependents(),
      isHomeowner: isHomeowner(),
      isStudent: isStudent(),
      hasBusiness: hasBusiness(),
      hasInvestments: hasInvestments(),
    };

    return REQUIRED_DOCUMENTS.filter(doc => {
      if (!doc.conditions) return true;

      const c = doc.conditions;

      if (c?.incomeSources && !c?.incomeSources?.some(src => incomeSources()?.includes?.(src))) {
        return false;
      }
      if (c?.deductions && !c.deductions.some(ded => deductions()?.includes?.(ded))) {
        return false;
      }
      if (c?.hasChildren !== undefined && hasDependents() !== c?.hasChildren) {
        return false;
      }
      if (c?.isHomeowner !== undefined && isHomeowner() !== c?.isHomeowner) {
        return false;
      }
      if (c?.isStudent !== undefined && isStudent() !== c?.isStudent) {
        return false;
      }
      if (c?.hasBusiness !== undefined && hasBusiness() !== c?.hasBusiness) {
        return false;
      }

      return true;
    });
  };

  // Styles
  const sectionStyle = {
    'margin-bottom': '1.5rem',
  };

  const sectionHeaderStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.75rem 1rem',
    background: 'var(--gray-100)',
    'border-radius': '8px',
    cursor: 'pointer',
    'margin-bottom': '1rem',
  };

  const fieldGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(2, 1fr)',
    gap: '1rem',
    'margin-bottom': '1rem',
  };

  const fieldStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.25rem',
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-muted)',
  };

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': '6px',
    'font-size': '0.875rem',
  };

  const checkboxGroupStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(2, 1fr)',
    gap: '0.75rem',
  };

  const checkboxItemStyle = (isChecked: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: isChecked ? '#dbeafe' : 'var(--gray-50)',
    border: `1px solid ${isChecked ? '#3b82f6' : 'var(--border-color)'}`,
    'border-radius': '6px',
    cursor: 'pointer',
    'font-size': '0.875rem',
    transition: 'all 0.2s ease',
  });

  const docPreviewStyle = {
    padding: '0.5rem 0.75rem',
    background: 'var(--gray-50)',
    'border-radius': '6px',
    'font-size': '0.75rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  };

  return (
    <div>
      {/* Section Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        'margin-bottom': '1.5rem',
        'flex-wrap': 'wrap',
      }}>
        <Button
          variant={activeSection() === 'personal' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('personal')}
        >
          {t('taxPortal.personalInfo')}
        </Button>
        <Button
          variant={activeSection() === 'filing' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('filing')}
        >
          {t('taxPortal.filingInfo')}
        </Button>
        <Button
          variant={activeSection() === 'income' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('income')}
        >
          {t('taxPortal.incomeSources')}
        </Button>
        <Button
          variant={activeSection() === 'deductions' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('deductions')}
        >
          {t('taxPortal.deductions')}
        </Button>
        <Button
          variant={activeSection() === 'situations' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('situations')}
        >
          {t('taxPortal.situations')}
        </Button>
      </div>

      {/* Personal Info Section */}
      <Show when={activeSection() === 'personal'}>
        <div style={sectionStyle}>
          <h4 style={{ margin: '0 0 1rem' }}>{t('taxPortal.personalInfo')}</h4>

          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.firstName')} *</label>
              <input
                type="text"
                value={firstName()}
                onInput={(e) => setFirstName(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.lastName')} *</label>
              <input
                type="text"
                value={lastName()}
                onInput={(e) => setLastName(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.email')} *</label>
              <input
                type="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.phone')}</label>
              <input
                type="tel"
                value={phone()}
                onInput={(e) => setPhone(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.ssn')}</label>
              <input
                type="text"
                value={ssn()}
                onInput={(e) => setSsn(e.currentTarget.value)}
                placeholder="XXX-XX-XXXX"
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.dateOfBirth')}</label>
              <input
                type="date"
                value={dateOfBirth()}
                onInput={(e) => setDateOfBirth(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <h5 style={{ margin: '1.5rem 0 1rem' }}>{t('taxPortal.address')}</h5>

          <div style={{ ...fieldStyle, 'margin-bottom': '1rem' }}>
            <label style={labelStyle}>{t('taxPortal.streetAddress')}</label>
            <input
              type="text"
              value={address()}
              onInput={(e) => setAddress(e.currentTarget.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': '2fr 1fr 1fr', gap: '1rem' }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.city')}</label>
              <input
                type="text"
                value={city()}
                onInput={(e) => setCity(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.state')}</label>
              <input
                type="text"
                value={state()}
                onInput={(e) => setState(e.currentTarget.value)}
                maxLength={2}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.zipCode')}</label>
              <input
                type="text"
                value={zipCode()}
                onInput={(e) => setZipCode(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </Show>

      {/* Filing Info Section */}
      <Show when={activeSection() === 'filing'}>
        <div style={sectionStyle}>
          <h4 style={{ margin: '0 0 1rem' }}>{t('taxPortal.filingInfo')}</h4>

          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.taxYear')} *</label>
              <select
                value={taxYear()}
                onChange={(e) => setTaxYear(parseInt(e.currentTarget.value))}
                style={inputStyle}
              >
                <For each={[2024, 2023, 2022, 2021, 2020]}>
                  {(year) => <option value={year}>{year}</option>}
                </For>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('taxPortal.filingStatus')} *</label>
              <select
                value={filingStatus()}
                onChange={(e) => setFilingStatus(e.currentTarget.value as FilingStatus)}
                style={inputStyle}
              >
                <For each={Object.entries(FILING_STATUS_LABELS)}>
                  {([value, label]) => <option value={value}>{label}</option>}
                </For>
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>{t('taxPortal.notes')}</label>
            <textarea
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' as const }}
              placeholder={t('taxPortal.notesPlaceholder')}
            />
          </div>
        </div>
      </Show>

      {/* Income Sources Section */}
      <Show when={activeSection() === 'income'}>
        <div style={sectionStyle}>
          <h4 style={{ margin: '0 0 0.5rem' }}>{t('taxPortal.incomeSources')}</h4>
          <p style={{ margin: '0 0 1rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {t('taxPortal.selectIncomeSourcesHint')}
          </p>

          <div style={checkboxGroupStyle}>
            <For each={Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][]}>
              {([source, label]) => (
                <div
                  style={checkboxItemStyle(incomeSources()?.includes?.(source))}
                  onClick={() => toggleIncomeSource(source)}
                >
                  <input
                    type="checkbox"
                    checked={incomeSources()?.includes?.(source)}
                    onChange={() => toggleIncomeSource(source)}
                  />
                  <span>{label}</span>
                </div>
              )}
            </For>
          </div>

          {/* Show required docs for selected income sources */}
          <Show when={incomeSources()?.length > 0}>
            <div style={{ 'margin-top': '1.5rem' }}>
              <h5 style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)' }}>
                {t('taxPortal.requiredDocumentsForIncome')}
              </h5>
              <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                <For each={getAffectedDocuments().filter(d => d.category === 'income')}>
                  {(doc) => (
                    <div style={docPreviewStyle}>
                      <span style={{ color: doc.required ? '#ef4444' : 'var(--text-muted)' }}>
                        {doc.required ? '*' : ''}
                      </span>
                      {doc.name}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Deductions Section */}
      <Show when={activeSection() === 'deductions'}>
        <div style={sectionStyle}>
          <h4 style={{ margin: '0 0 0.5rem' }}>{t('taxPortal.deductions')}</h4>
          <p style={{ margin: '0 0 1rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {t('taxPortal.selectDeductionsHint')}
          </p>

          <div style={checkboxGroupStyle}>
            <For each={Object.entries(DEDUCTION_TYPE_LABELS) as [DeductionType, string][]}>
              {([deduction, label]) => (
                <div
                  style={checkboxItemStyle(deductions()?.includes?.(deduction))}
                  onClick={() => toggleDeduction(deduction)}
                >
                  <input
                    type="checkbox"
                    checked={deductions()?.includes?.(deduction)}
                    onChange={() => toggleDeduction(deduction)}
                  />
                  <span>{label}</span>
                </div>
              )}
            </For>
          </div>

          {/* Show required docs for selected deductions */}
          <Show when={deductions()?.length > 0}>
            <div style={{ 'margin-top': '1.5rem' }}>
              <h5 style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)' }}>
                {t('taxPortal.requiredDocumentsForDeductions')}
              </h5>
              <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                <For each={getAffectedDocuments().filter(d => d.category === 'deductions')}>
                  {(doc) => (
                    <div style={docPreviewStyle}>
                      <span style={{ color: doc.required ? '#ef4444' : 'var(--text-muted)' }}>
                        {doc.required ? '*' : ''}
                      </span>
                      {doc.name}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Situations Section */}
      <Show when={activeSection() === 'situations'}>
        <div style={sectionStyle}>
          <h4 style={{ margin: '0 0 0.5rem' }}>{t('taxPortal.situations')}</h4>
          <p style={{ margin: '0 0 1rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
            {t('taxPortal.selectSituationsHint')}
          </p>

          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
            <div
              style={checkboxItemStyle(hasDependents())}
              onClick={() => setHasDependents(!hasDependents())}
            >
              <input
                type="checkbox"
                checked={hasDependents()}
                onChange={() => setHasDependents(!hasDependents())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.hasDependents')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.hasDependentsHint')}
                </div>
              </div>
            </div>

            <div
              style={checkboxItemStyle(isHomeowner())}
              onClick={() => setIsHomeowner(!isHomeowner())}
            >
              <input
                type="checkbox"
                checked={isHomeowner()}
                onChange={() => setIsHomeowner(!isHomeowner())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.isHomeowner')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.isHomeownerHint')}
                </div>
              </div>
            </div>

            <div
              style={checkboxItemStyle(isStudent())}
              onClick={() => setIsStudent(!isStudent())}
            >
              <input
                type="checkbox"
                checked={isStudent()}
                onChange={() => setIsStudent(!isStudent())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.isStudent')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.isStudentHint')}
                </div>
              </div>
            </div>

            <div
              style={checkboxItemStyle(hasBusiness())}
              onClick={() => setHasBusiness(!hasBusiness())}
            >
              <input
                type="checkbox"
                checked={hasBusiness()}
                onChange={() => setHasBusiness(!hasBusiness())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.hasBusiness')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.hasBusinessHint')}
                </div>
              </div>
            </div>

            <div
              style={checkboxItemStyle(hasInvestments())}
              onClick={() => setHasInvestments(!hasInvestments())}
            >
              <input
                type="checkbox"
                checked={hasInvestments()}
                onChange={() => setHasInvestments(!hasInvestments())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.hasInvestments')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.hasInvestmentsHint')}
                </div>
              </div>
            </div>

            <div
              style={checkboxItemStyle(hasRentalProperty())}
              onClick={() => setHasRentalProperty(!hasRentalProperty())}
            >
              <input
                type="checkbox"
                checked={hasRentalProperty()}
                onChange={() => setHasRentalProperty(!hasRentalProperty())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.hasRentalProperty')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.hasRentalPropertyHint')}
                </div>
              </div>
            </div>

            <div
              style={checkboxItemStyle(receivedHealthInsurance())}
              onClick={() => setReceivedHealthInsurance(!receivedHealthInsurance())}
            >
              <input
                type="checkbox"
                checked={receivedHealthInsurance()}
                onChange={() => setReceivedHealthInsurance(!receivedHealthInsurance())}
              />
              <div>
                <div style={{ 'font-weight': '500' }}>{t('taxPortal.receivedHealthInsurance')}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                  {t('taxPortal.receivedHealthInsuranceHint')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Required Documents Preview */}
      <div style={{
        padding: '1rem',
        background: 'var(--gray-50)',
        'border-radius': '8px',
        'margin-bottom': '1.5rem',
      }}>
        <h5 style={{ margin: '0 0 0.75rem', display: 'flex', 'justify-content': 'space-between' }}>
          <span>{t('taxPortal.requiredDocuments')}</span>
          <span style={{ 'font-weight': 'normal', color: 'var(--text-muted)' }}>
            {getAffectedDocuments().filter(d => d.required).length} {t('common.required').toLowerCase()}
          </span>
        </h5>
        <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap', 'max-height': '150px', 'overflow-y': 'auto' }}>
          <For each={getAffectedDocuments()}>
            {(doc) => (
              <div style={{
                padding: '0.25rem 0.5rem',
                background: doc.required ? '#fee2e2' : 'white',
                color: doc.required ? '#991b1b' : 'var(--text-color)',
                border: '1px solid',
                'border-color': doc.required ? '#fecaca' : 'var(--border-color)',
                'border-radius': '4px',
                'font-size': '0.75rem',
              }}>
                {doc.name}
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', 'justify-content': 'flex-end' }}>
        <Button variant="outline" onClick={props.onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving()}>
          {saving() ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );
};

export default ClientEditForm;
