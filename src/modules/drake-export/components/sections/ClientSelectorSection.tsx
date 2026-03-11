/**
 * ClientSelectorSection
 * SolidJS component for client selection in Drake Tax Export
 */

import { Component, createSignal, Show, For } from 'solid-js';
import CustomerSearchDropdown from '../../../notary/components/CustomerSearchDropdown';
import { NotaryCustomer } from '../../../notary/types';
import { drakeExportStore, drakeExportActions } from '../../stores/drakeExportStore';
import { FILING_STATUS_LABELS, FilingStatus, TaxYear } from '../../types/drakeTypes';

interface ClientSelectorSectionProps {
  onClientSelected?: (customer: NotaryCustomer) => void;
}

const TAX_YEARS: TaxYear[] = [2023, 2024, 2025, 2026];

const ClientSelectorSection: Component<ClientSelectorSectionProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(true);

  // Mask SSN to show only last 4 digits
  const maskSSN = (ssn?: string): string => {
    if (!ssn) return 'N/A';
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `***-**-${cleaned.slice(-4)}`;
    }
    return '***-**-****';
  };

  // Get primary address from residences
  const getPrimaryAddress = (customer: NotaryCustomer): string => {
    if (!customer.residences) return 'No address on file';

    const residenceKeys = Object.keys(customer.residences);
    if (residenceKeys.length === 0) return 'No address on file';

    const primaryResidence = customer.residences[residenceKeys[0]];
    const parts = [
      primaryResidence.addressLineOne,
      primaryResidence.addressLineTwo,
      primaryResidence.city,
      primaryResidence.state,
      primaryResidence.zipcode
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'No address on file';
  };

  // Handle client selection
  const handleClientSelected = (customer: NotaryCustomer) => {
    drakeExportActions.selectClient(customer);
    if (props.onClientSelected) {
      props.onClientSelected(customer);
    }
  };

  // Handle clear selection
  const handleClearSelection = () => {
    drakeExportActions.selectClient(null);
  };

  // Handle tax year change
  const handleTaxYearChange = (year: TaxYear) => {
    drakeExportActions.setTaxYear(year);
  };

  // Handle filing status change
  const handleFilingStatusChange = (status: FilingStatus) => {
    drakeExportActions.setFilingStatus(status);
  };

  // Styles
  const sectionStyle = {
    background: 'var(--card-bg, #ffffff)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--border-color, #e2e8f0)',
    'margin-bottom': '1rem',
    overflow: 'hidden'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '1rem 1.5rem',
    background: 'var(--section-header-bg, #f8fafc)',
    'border-bottom': isExpanded() ? '1px solid var(--border-color, #e2e8f0)' : 'none',
    cursor: 'pointer'
  };

  const headerTitleStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'font-weight': '600',
    'font-size': '1.125rem',
    color: 'var(--text-primary, #1e293b)'
  };

  const contentStyle = {
    padding: '1.5rem'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    'margin-bottom': '1.5rem'
  };

  const fieldGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary, #64748b)'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid var(--border-color, #e2e8f0)',
    'border-radius': 'var(--border-radius, 8px)',
    'font-size': '1rem',
    'font-family': 'inherit',
    background: 'white',
    cursor: 'pointer'
  };

  const summaryCardStyle = {
    background: 'var(--success-light, #f0fdf4)',
    'border-radius': 'var(--border-radius, 8px)',
    border: '1px solid var(--success-border, #86efac)',
    padding: '1.5rem',
    'margin-top': '1rem'
  };

  const summaryHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    'margin-bottom': '1rem'
  };

  const summaryTitleStyle = {
    'font-weight': '600',
    'font-size': '1.125rem',
    color: 'var(--success-dark, #166534)'
  };

  const clearButtonStyle = {
    padding: '0.5rem 1rem',
    background: 'var(--danger-color, #ef4444)',
    color: 'white',
    border: 'none',
    'border-radius': 'var(--border-radius, 6px)',
    cursor: 'pointer',
    'font-size': '0.875rem',
    'font-weight': '500'
  };

  const infoRowStyle = {
    display: 'flex',
    'margin-bottom': '0.5rem',
    'font-size': '0.9375rem'
  };

  const infoLabelStyle = {
    'font-weight': '500',
    color: 'var(--text-secondary, #64748b)',
    'min-width': '100px'
  };

  const infoValueStyle = {
    color: 'var(--text-primary, #1e293b)'
  };

  const iconStyle = {
    'font-size': '1.25rem'
  };

  return (
    <div style={sectionStyle}>
      {/* Section Header */}
      <div style={headerStyle} onClick={() => setIsExpanded(!isExpanded())}>
        <div style={headerTitleStyle}>
          <span style={iconStyle}>1.</span>
          <span>Client Selection</span>
          <Show when={drakeExportStore.selectedClient}>
            <span style={{
              background: 'var(--success-color, #22c55e)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              'border-radius': '9999px',
              'font-size': '0.75rem',
              'font-weight': '500'
            }}>
              Selected
            </span>
          </Show>
        </div>
        <span style={{
          transform: isExpanded() ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </div>

      {/* Section Content */}
      <Show when={isExpanded()}>
        <div style={contentStyle}>
          {/* Search and Configuration Grid */}
          <div style={gridStyle}>
            {/* Customer Search */}
            <div style={{ ...fieldGroupStyle, 'grid-column': 'span 2' }}>
              <label style={labelStyle}>Search Client</label>
              <CustomerSearchDropdown
                placeholder="Search by name, email, or ID..."
                onSelect={handleClientSelected}
              />
            </div>

            {/* Tax Year Selector */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Tax Year</label>
              <select
                style={selectStyle}
                value={drakeExportStore.taxYear}
                onChange={(e) => handleTaxYearChange(parseInt(e.currentTarget.value) as TaxYear)}
              >
                <For each={TAX_YEARS}>
                  {(year) => (
                    <option value={year}>{year}</option>
                  )}
                </For>
              </select>
            </div>

            {/* Filing Status Selector */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Filing Status</label>
              <select
                style={selectStyle}
                value={drakeExportStore.filingStatus || ''}
                onChange={(e) => handleFilingStatusChange(e.currentTarget.value as FilingStatus)}
              >
                <option value="">Select filing status...</option>
                <For each={Object.entries(FILING_STATUS_LABELS)}>
                  {([value, label]) => (
                    <option value={value}>{label}</option>
                  )}
                </For>
              </select>
            </div>
          </div>

          {/* Selected Client Summary Card */}
          <Show when={drakeExportStore.selectedClient}>
            {(client) => (
              <div style={summaryCardStyle}>
                <div style={summaryHeaderStyle}>
                  <div style={summaryTitleStyle}>
                    {client().firstName} {client().middleName ? `${client().middleName} ` : ''}{client().lastName}
                  </div>
                  <button
                    style={clearButtonStyle}
                    onClick={handleClearSelection}
                    type="button"
                  >
                    Clear Selection
                  </button>
                </div>

                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>SSN:</span>
                  <span style={infoValueStyle}>{maskSSN(client().ss)}</span>
                </div>

                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Address:</span>
                  <span style={infoValueStyle}>{getPrimaryAddress(client())}</span>
                </div>

                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Email:</span>
                  <span style={infoValueStyle}>{client().email || 'N/A'}</span>
                </div>

                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Phone:</span>
                  <span style={infoValueStyle}>{client().phoneNumber || 'N/A'}</span>
                </div>

                <Show when={client().alienNumber}>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>A-Number:</span>
                    <span style={infoValueStyle}>{client().alienNumber}</span>
                  </div>
                </Show>

                <Show when={client().clientNotaryId}>
                  <div style={{ ...infoRowStyle, 'margin-top': '0.5rem', 'padding-top': '0.5rem', 'border-top': '1px dashed var(--border-color, #e2e8f0)' }}>
                    <span style={infoLabelStyle}>Client ID:</span>
                    <span style={{ ...infoValueStyle, 'font-family': 'monospace', 'font-size': '0.875rem' }}>{client().clientNotaryId}</span>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default ClientSelectorSection;
