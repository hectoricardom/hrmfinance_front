/**
 * PreVisitForm Component
 * Mobile-friendly form accessed via QR code on a public route.
 * Collects client info before their office visit.
 * Supports English and Spanish.
 */

import { Component, createSignal, For, Show, Switch, Match } from 'solid-js';
import { checkinService } from '../services/checkinService';
import { devLog } from '../../../services/utils';
import type {
  PreVisitFormData,
  DependentInfo,
  FilingStatusOption,
  DocumentBrought,
  SupportedLanguage,
} from '../types/workflowTypes';
import {
  FILING_STATUS_LABELS,
  DOCUMENT_LABELS,
  UI_LABELS,
} from '../types/workflowTypes';

interface PreVisitFormProps {
  portalId: string;
  token: string;
}

const PreVisitForm: Component<PreVisitFormProps> = (props) => {
  // ============================================
  // State
  // ============================================

  const [lang, setLang] = createSignal<SupportedLanguage>('en');
  const [step, setStep] = createSignal<'form' | 'submitting' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = createSignal('');
  const [queuePosition, setQueuePosition] = createSignal(0);
  const [estimatedWait, setEstimatedWait] = createSignal(0);

  const [formData, setFormData] = createSignal<PreVisitFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    filingStatus: '',
    taxYear: new Date().getFullYear().toString(),
    ssn: '',
    hasDependents: false,
    dependents: [],
    documentsBrought: [],
    notes: '',
    language: 'en',
    portalId: props.portalId,
    token: props.token,
  });

  // ============================================
  // Helpers
  // ============================================

  const t = (key: string): string => {
    return UI_LABELS[key]?.[lang()] || key;
  };

  const updateField = <K extends keyof PreVisitFormData>(field: K, value: PreVisitFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDependent = () => {
    const newDep: DependentInfo = {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      relationship: '',
    };
    setFormData((prev) => ({
      ...prev,
      dependents: [...prev.dependents, newDep],
    }));
  };

  const updateDependent = (index: number, field: keyof DependentInfo, value: string) => {
    setFormData((prev) => {
      const deps = [...prev.dependents];
      deps[index] = { ...deps[index], [field]: value };
      return { ...prev, dependents: deps };
    });
  };

  const removeDependent = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      dependents: prev.dependents.filter((_, i) => i !== index),
    }));
  };

  const toggleDocument = (doc: DocumentBrought) => {
    setFormData((prev) => {
      const docs = prev.documentsBrought.includes(doc)
        ? prev.documentsBrought.filter((d) => d !== doc)
        : [...prev.documentsBrought, doc];
      return { ...prev, documentsBrought: docs };
    });
  };

  const isFormValid = (): boolean => {
    const data = formData();
    return !!(data.firstName.trim() && data.lastName.trim() && data.phone.trim());
  };

  // ============================================
  // Submit
  // ============================================

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setStep('submitting');
    try {
      const data = formData();
      data.language = lang();
      const result = await checkinService.submitPreVisitForm(props.portalId, props.token, data);
      setQueuePosition(result.queuePosition);
      setEstimatedWait(result.estimatedWaitMinutes);
      setStep('success');
    } catch (error: any) {
      devLog('PreVisitForm: submission error', error);
      setErrorMessage(error.message || 'An error occurred');
      setStep('error');
    }
  };

  // ============================================
  // Styles
  // ============================================

  const containerStyle = {
    'max-width': '480px',
    margin: '0 auto',
    padding: '16px',
    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#ffffff',
    'min-height': '100vh',
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '24px',
    'padding-bottom': '16px',
    'border-bottom': '2px solid #1a73e8',
  };

  const langToggleContainer = {
    display: 'flex',
    'justify-content': 'center',
    gap: '8px',
    'margin-bottom': '16px',
  };

  const langBtnBase = {
    padding: '12px 24px',
    'font-size': '16px',
    'font-weight': '600',
    border: '2px solid #1a73e8',
    'border-radius': '8px',
    cursor: 'pointer',
    'min-height': '48px',
    'min-width': '100px',
    transition: 'all 0.2s ease',
  };

  const sectionStyle = {
    'margin-bottom': '24px',
    'padding-bottom': '16px',
    'border-bottom': '1px solid #e5e7eb',
  };

  const sectionTitleStyle = {
    'font-size': '18px',
    'font-weight': '600',
    color: '#1a73e8',
    'margin-bottom': '16px',
  };

  const labelStyle = {
    display: 'block',
    'font-size': '15px',
    'font-weight': '500',
    color: '#374151',
    'margin-bottom': '6px',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 12px',
    'font-size': '16px',
    border: '2px solid #d1d5db',
    'border-radius': '8px',
    'box-sizing': 'border-box' as const,
    'min-height': '48px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    '-webkit-appearance': 'none' as any,
  };

  const fieldGroup = {
    'margin-bottom': '16px',
  };

  const radioGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '10px',
  };

  const radioLabelStyle = {
    display: 'flex',
    'align-items': 'center',
    padding: '14px 16px',
    'font-size': '15px',
    border: '2px solid #d1d5db',
    'border-radius': '8px',
    cursor: 'pointer',
    'min-height': '48px',
    transition: 'all 0.2s ease',
    'user-select': 'none' as const,
  };

  const radioLabelSelectedStyle = {
    ...radioLabelStyle,
    'border-color': '#1a73e8',
    background: '#eff6ff',
  };

  const checkboxLabelStyle = {
    display: 'flex',
    'align-items': 'center',
    padding: '12px 14px',
    'font-size': '15px',
    border: '2px solid #d1d5db',
    'border-radius': '8px',
    cursor: 'pointer',
    'min-height': '48px',
    'margin-bottom': '8px',
    transition: 'all 0.2s ease',
    'user-select': 'none' as const,
  };

  const checkboxLabelCheckedStyle = {
    ...checkboxLabelStyle,
    'border-color': '#1a73e8',
    background: '#eff6ff',
  };

  const toggleContainerStyle = {
    display: 'flex',
    gap: '12px',
  };

  const toggleBtnStyle = (active: boolean) => ({
    flex: '1',
    padding: '14px',
    'font-size': '16px',
    'font-weight': '600',
    border: active ? '2px solid #1a73e8' : '2px solid #d1d5db',
    'border-radius': '8px',
    background: active ? '#eff6ff' : '#ffffff',
    color: active ? '#1a73e8' : '#6b7280',
    cursor: 'pointer',
    'min-height': '48px',
    transition: 'all 0.2s ease',
  });

  const dependentCardStyle = {
    border: '1px solid #e5e7eb',
    'border-radius': '8px',
    padding: '16px',
    'margin-bottom': '12px',
    background: '#f9fafb',
  };

  const removeBtnStyle = {
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    'border-radius': '6px',
    padding: '8px 16px',
    'font-size': '14px',
    'font-weight': '500',
    cursor: 'pointer',
    'min-height': '40px',
  };

  const addBtnStyle = {
    background: '#ffffff',
    color: '#1a73e8',
    border: '2px dashed #1a73e8',
    'border-radius': '8px',
    padding: '12px',
    'font-size': '15px',
    'font-weight': '500',
    cursor: 'pointer',
    width: '100%',
    'min-height': '48px',
    transition: 'background 0.2s ease',
  };

  const submitBtnStyle = {
    width: '100%',
    padding: '16px',
    'font-size': '18px',
    'font-weight': '600',
    background: '#1a73e8',
    color: '#ffffff',
    border: 'none',
    'border-radius': '10px',
    cursor: 'pointer',
    'min-height': '56px',
    'margin-top': '24px',
    transition: 'background 0.2s ease',
  };

  const submitBtnDisabledStyle = {
    ...submitBtnStyle,
    background: '#9ca3af',
    cursor: 'not-allowed',
  };

  const textareaStyle = {
    ...inputStyle,
    'min-height': '100px',
    resize: 'vertical' as const,
  };

  const privacyNoticeStyle = {
    'font-size': '13px',
    color: '#6b7280',
    'margin-top': '6px',
    'font-style': 'italic' as const,
  };

  const successContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '60vh',
    'text-align': 'center' as const,
    padding: '24px',
  };

  const queueNumberStyle = {
    'font-size': '72px',
    'font-weight': '700',
    color: '#1a73e8',
    'line-height': '1',
    'margin': '16px 0',
  };

  const waitBadgeStyle = {
    background: '#f0f9ff',
    border: '2px solid #1a73e8',
    'border-radius': '12px',
    padding: '16px 24px',
    'margin-top': '16px',
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div style={containerStyle}>
      <Switch>
        {/* ============================================ */}
        {/* FORM VIEW */}
        {/* ============================================ */}
        <Match when={step() === 'form'}>
          {/* Language Toggle */}
          <div style={langToggleContainer}>
            <button
              style={{
                ...langBtnBase,
                background: lang() === 'en' ? '#1a73e8' : '#ffffff',
                color: lang() === 'en' ? '#ffffff' : '#1a73e8',
              }}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button
              style={{
                ...langBtnBase,
                background: lang() === 'es' ? '#1a73e8' : '#ffffff',
                color: lang() === 'es' ? '#ffffff' : '#1a73e8',
              }}
              onClick={() => setLang('es')}
            >
              Espanol
            </button>
          </div>

          {/* Header */}
          <div style={headerStyle}>
            <h1 style={{ 'font-size': '24px', color: '#111827', margin: '0 0 4px 0' }}>
              {lang() === 'en' ? 'Pre-Visit Information' : 'Informacion Pre-Visita'}
            </h1>
            <p style={{ 'font-size': '14px', color: '#6b7280', margin: '0' }}>
              {lang() === 'en'
                ? 'Please fill out this form to speed up your visit.'
                : 'Por favor complete este formulario para agilizar su visita.'}
            </p>
          </div>

          {/* SECTION 1: Personal Info */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>{t('personalInfo')}</h2>

            <div style={fieldGroup}>
              <label style={labelStyle}>
                {t('firstName')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                style={inputStyle}
                value={formData().firstName}
                onInput={(e) => updateField('firstName', e.currentTarget.value)}
                placeholder={t('firstName')}
                autocomplete="given-name"
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>
                {t('lastName')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                style={inputStyle}
                value={formData().lastName}
                onInput={(e) => updateField('lastName', e.currentTarget.value)}
                placeholder={t('lastName')}
                autocomplete="family-name"
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>
                {t('phone')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                style={inputStyle}
                value={formData().phone}
                onInput={(e) => updateField('phone', e.currentTarget.value)}
                placeholder="(555) 555-5555"
                autocomplete="tel"
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>{t('email')}</label>
              <input
                type="email"
                style={inputStyle}
                value={formData().email}
                onInput={(e) => updateField('email', e.currentTarget.value)}
                placeholder="email@example.com"
                autocomplete="email"
              />
            </div>
          </div>

          {/* SECTION 2: Tax Info */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>{t('taxInfo')}</h2>

            <div style={fieldGroup}>
              <label style={labelStyle}>{t('filingStatus')}</label>
              <div style={radioGroupStyle}>
                <For each={Object.entries(FILING_STATUS_LABELS) as [FilingStatusOption, Record<SupportedLanguage, string>][]}>
                  {([status, labels]) => (
                    <label
                      style={formData().filingStatus === status ? radioLabelSelectedStyle : radioLabelStyle}
                      onClick={() => updateField('filingStatus', status as FilingStatusOption)}
                    >
                      <input
                        type="radio"
                        name="filingStatus"
                        value={status}
                        checked={formData().filingStatus === status}
                        style={{ 'margin-right': '12px', width: '20px', height: '20px' }}
                      />
                      {labels[lang()]}
                    </label>
                  )}
                </For>
              </div>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>{t('taxYear')}</label>
              <select
                style={inputStyle}
                value={formData().taxYear}
                onChange={(e) => updateField('taxYear', e.currentTarget.value)}
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: SSN (Optional) */}
          <div style={sectionStyle}>
            <div style={fieldGroup}>
              <label style={labelStyle}>{t('ssnOptional')}</label>
              <input
                type="password"
                style={inputStyle}
                value={formData().ssn || ''}
                onInput={(e) => updateField('ssn', e.currentTarget.value)}
                placeholder="XXX-XX-XXXX"
                maxlength={11}
                autocomplete="off"
              />
              <p style={privacyNoticeStyle}>{t('ssnPrivacy')}</p>
            </div>
          </div>

          {/* SECTION 4: Dependents */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>{t('dependents')}</h2>

            <div style={fieldGroup}>
              <label style={labelStyle}>{t('hasDependents')}</label>
              <div style={toggleContainerStyle}>
                <button
                  style={toggleBtnStyle(formData().hasDependents)}
                  onClick={() => updateField('hasDependents', true)}
                >
                  {t('yes')}
                </button>
                <button
                  style={toggleBtnStyle(!formData().hasDependents)}
                  onClick={() => {
                    updateField('hasDependents', false);
                    setFormData((prev) => ({ ...prev, dependents: [] }));
                  }}
                >
                  {t('no')}
                </button>
              </div>
            </div>

            <Show when={formData().hasDependents}>
              <For each={formData().dependents}>
                {(dep, index) => (
                  <div style={dependentCardStyle}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '12px' }}>
                      <strong style={{ color: '#374151' }}>
                        {lang() === 'en' ? `Dependent ${index() + 1}` : `Dependiente ${index() + 1}`}
                      </strong>
                      <button style={removeBtnStyle} onClick={() => removeDependent(index())}>
                        {t('removeDependent')}
                      </button>
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>{t('firstName')}</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={dep.firstName}
                        onInput={(e) => updateDependent(index(), 'firstName', e.currentTarget.value)}
                      />
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>{t('lastName')}</label>
                      <input
                        type="text"
                        style={inputStyle}
                        value={dep.lastName}
                        onInput={(e) => updateDependent(index(), 'lastName', e.currentTarget.value)}
                      />
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>{t('dateOfBirth')}</label>
                      <input
                        type="date"
                        style={inputStyle}
                        value={dep.dateOfBirth}
                        onInput={(e) => updateDependent(index(), 'dateOfBirth', e.currentTarget.value)}
                      />
                    </div>

                    <div style={fieldGroup}>
                      <label style={labelStyle}>{t('relationship')}</label>
                      <select
                        style={inputStyle}
                        value={dep.relationship}
                        onChange={(e) => updateDependent(index(), 'relationship', e.currentTarget.value)}
                      >
                        <option value="">{lang() === 'en' ? 'Select...' : 'Seleccionar...'}</option>
                        <option value="child">{lang() === 'en' ? 'Child' : 'Hijo/a'}</option>
                        <option value="stepchild">{lang() === 'en' ? 'Stepchild' : 'Hijastro/a'}</option>
                        <option value="foster_child">{lang() === 'en' ? 'Foster Child' : 'Hijo/a de Crianza'}</option>
                        <option value="sibling">{lang() === 'en' ? 'Sibling' : 'Hermano/a'}</option>
                        <option value="parent">{lang() === 'en' ? 'Parent' : 'Padre/Madre'}</option>
                        <option value="other">{lang() === 'en' ? 'Other' : 'Otro'}</option>
                      </select>
                    </div>
                  </div>
                )}
              </For>

              <button style={addBtnStyle} onClick={addDependent}>
                + {t('addDependent')}
              </button>
            </Show>
          </div>

          {/* SECTION 5: Documents */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>{t('documents')}</h2>

            <For each={Object.entries(DOCUMENT_LABELS) as [DocumentBrought, Record<SupportedLanguage, string>][]}>
              {([docType, labels]) => (
                <label
                  style={
                    formData().documentsBrought.includes(docType as DocumentBrought)
                      ? checkboxLabelCheckedStyle
                      : checkboxLabelStyle
                  }
                  onClick={() => toggleDocument(docType as DocumentBrought)}
                >
                  <input
                    type="checkbox"
                    checked={formData().documentsBrought.includes(docType as DocumentBrought)}
                    style={{ 'margin-right': '12px', width: '20px', height: '20px' }}
                  />
                  {labels[lang()]}
                </label>
              )}
            </For>
          </div>

          {/* SECTION 6: Additional Notes */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>{t('additionalNotes')}</h2>
            <textarea
              style={textareaStyle}
              value={formData().notes}
              onInput={(e) => updateField('notes', e.currentTarget.value)}
              placeholder={t('notesPlaceholder')}
            />
          </div>

          {/* Submit Button */}
          <button
            style={isFormValid() ? submitBtnStyle : submitBtnDisabledStyle}
            onClick={handleSubmit}
            disabled={!isFormValid()}
          >
            {t('submit')}
          </button>
        </Match>

        {/* ============================================ */}
        {/* SUBMITTING VIEW */}
        {/* ============================================ */}
        <Match when={step() === 'submitting'}>
          <div style={successContainerStyle}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                'border-top-color': '#1a73e8',
                'border-radius': '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ 'font-size': '18px', color: '#6b7280', 'margin-top': '16px' }}>
              {t('loading')}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </Match>

        {/* ============================================ */}
        {/* SUCCESS VIEW */}
        {/* ============================================ */}
        <Match when={step() === 'success'}>
          <div style={successContainerStyle}>
            <div
              style={{
                width: '80px',
                height: '80px',
                'border-radius': '50%',
                background: '#22c55e',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'margin-bottom': '8px',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{ 'font-size': '24px', color: '#111827', 'margin-bottom': '4px' }}>
              {t('checkedIn')}
            </h2>

            <p style={{ 'font-size': '16px', color: '#6b7280' }}>
              {t('queueNumber')}
            </p>
            <div style={queueNumberStyle}>#{queuePosition()}</div>

            <div style={waitBadgeStyle}>
              <p style={{ 'font-size': '16px', color: '#374151', margin: '0' }}>
                {t('estimatedWait')}: <strong>{estimatedWait()} {t('minutes')}</strong>
              </p>
            </div>

            <p style={{ 'font-size': '18px', color: '#374151', 'margin-top': '24px', 'font-weight': '500' }}>
              {t('thankYou')}
            </p>
          </div>
        </Match>

        {/* ============================================ */}
        {/* ERROR VIEW */}
        {/* ============================================ */}
        <Match when={step() === 'error'}>
          <div style={successContainerStyle}>
            <div
              style={{
                width: '80px',
                height: '80px',
                'border-radius': '50%',
                background: '#ef4444',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'margin-bottom': '8px',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <h2 style={{ 'font-size': '24px', color: '#111827' }}>{t('error')}</h2>
            <p style={{ 'font-size': '16px', color: '#6b7280' }}>{errorMessage()}</p>

            <button
              style={{ ...submitBtnStyle, 'max-width': '300px', 'margin-top': '16px' }}
              onClick={() => setStep('form')}
            >
              {t('back')}
            </button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default PreVisitForm;
