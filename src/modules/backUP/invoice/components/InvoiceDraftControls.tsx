import { Component, createSignal, Show } from 'solid-js';
import { invoiceDraftsStore } from '../stores/invoiceDraftsStore';
import { invoiceFormStore } from '../stores/invoiceFormStore';
import InvoiceDraftsManager from './InvoiceDraftsManager';
import { devLog } from '../../../services/utils';

interface InvoiceDraftControlsProps {
  onDraftSaved?: () => void;
  onDraftLoaded?: () => void;
}

/**
 * Component that provides draft management controls for invoice forms
 * Add this component to your invoice form to enable multi-draft functionality
 */
const InvoiceDraftControls: Component<InvoiceDraftControlsProps> = (props) => {
  const [showDraftsModal, setShowDraftsModal] = createSignal(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = createSignal(false);

  const handleSaveDraft = () => {
    const formData = invoiceFormStore.getFormData();

    // Validate that there's some data to save
    if (!invoiceFormStore.hasData()) {
      alert('Cannot save an empty invoice as draft. Please add some data first.');
      return;
    }

    // Save the draft
    const draft = invoiceDraftsStore.saveDraft(formData);

    // Show confirmation
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 3000);

    // Call callback
    props.onDraftSaved?.();

    devLog('Draft saved:', draft);
  };

  const handleNewInvoice = () => {
    if (invoiceFormStore.hasData() && invoiceFormStore.isDirty) {
      if (confirm('Save current invoice as draft before starting a new one?')) {
        handleSaveDraft();
      }
    }

    // Clear the form for a new invoice
    invoiceFormStore.clearForm();
  };

  const containerStyle = {
    display: 'flex',
    gap: '0.75rem',
    'align-items': 'center',
    'flex-wrap': 'wrap'
  };

  const buttonBaseStyle = {
    padding: '0.625rem 1.25rem',
    border: 'none',
    'border-radius': '0.375rem',
    'font-weight': '500',
    'font-size': '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const saveDraftButtonStyle = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, #4caf50, #45a049)',
    color: 'white',
    'box-shadow': '0 2px 8px rgba(76, 175, 80, 0.3)'
  };

  const viewDraftsButtonStyle = {
    ...buttonBaseStyle,
    background: 'linear-gradient(135deg, var(--blue-ribbon-500), var(--blue-ribbon-700))',
    color: 'white',
    'box-shadow': '0 2px 8px rgba(108, 92, 231, 0.3)'
  };

  const newInvoiceButtonStyle = {
    ...buttonBaseStyle,
    background: 'white',
    color: 'var(--blue-ribbon-600)',
    border: '1px solid var(--blue-ribbon-300)',
    'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const badgeStyle = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '1.5rem',
    height: '1.5rem',
    padding: '0 0.375rem',
    'border-radius': '0.75rem',
    background: '#ff5722',
    color: 'white',
    'font-size': '0.75rem',
    'font-weight': '600',
    'margin-left': '0.25rem'
  };

  const confirmationStyle = {
    position: 'fixed' as const,
    top: '2rem',
    right: '2rem',
    padding: '1rem 1.5rem',
    background: '#4caf50',
    color: 'white',
    'border-radius': '0.5rem',
    'box-shadow': '0 4px 12px rgba(76, 175, 80, 0.4)',
    'z-index': '9999',
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    'font-weight': '500',
    animation: 'slideIn 0.3s ease-out'
  };

  return (
    <>
      <div style={containerStyle}>
        {/* Save as Draft button */}
        <button
          onClick={handleSaveDraft}
          style={saveDraftButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
          }}
          title="Save current invoice as draft"
        >
          <span>💾</span>
          <span>Save as Draft</span>
        </button>

        {/* View Drafts button with count badge */}
        <button
          onClick={() => setShowDraftsModal(true)}
          style={viewDraftsButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 92, 231, 0.3)';
          }}
          title="View and manage saved drafts"
        >
          <span>📋</span>
          <span>View Drafts</span>
          <Show when={invoiceDraftsStore.getCount() > 0}>
            <span style={badgeStyle}>
              {invoiceDraftsStore.getCount()}
            </span>
          </Show>
        </button>

        {/* New Invoice button */}
        <button
          onClick={handleNewInvoice}
          style={newInvoiceButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
          title="Start a new invoice (will prompt to save current)"
        >
          <span>➕</span>
          <span>New Invoice</span>
        </button>
      </div>

      {/* Drafts Manager Modal */}
      <InvoiceDraftsManager
        isOpen={showDraftsModal()}
        onClose={() => setShowDraftsModal(false)}
        onDraftLoaded={props.onDraftLoaded}
      />

      {/* Save confirmation toast */}
      <Show when={showSaveConfirmation()}>
        <div style={confirmationStyle}>
          <span style={{ 'font-size': '1.5rem' }}>✓</span>
          <span>Draft saved successfully!</span>
        </div>
      </Show>

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
};

export default InvoiceDraftControls;

/**
 * Utility function to clear draft after successful invoice submission
 * Call this after successfully submitting an invoice to the server
 *
 * @param invoiceNumber - The invoice number that was successfully submitted
 *
 * @example
 * // After successful invoice submission:
 * const response = await submitInvoice(invoiceData);
 * if (response.success) {
 *   clearDraftAfterSubmission(invoiceData.invoice);
 * }
 */
export const clearDraftAfterSubmission = (invoiceNumber: string) => {
  invoiceDraftsStore.deleteDraftByInvoiceNumber(invoiceNumber);
  invoiceFormStore.markCompleted();
};
