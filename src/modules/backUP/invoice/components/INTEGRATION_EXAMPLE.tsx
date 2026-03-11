/**
 * INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the multi-draft system into your invoice form.
 * Copy the relevant parts to your actual invoice form component.
 */

import { Component, createSignal } from 'solid-js';
import { invoiceFormStore } from '../stores/invoiceFormStore';
import InvoiceDraftControls, { clearDraftAfterSubmission } from './InvoiceDraftControls';
import { devLog } from '../../../services/utils';

/**
 * Example 1: Minimal Integration
 * Just add the draft controls component to your form
 */
export const MinimalExample: Component = () => {
  return (
    <div class="invoice-form">
      <h1>Create Invoice</h1>

      {/* ADD THIS: Draft controls with save, view, and new invoice buttons */}
      <InvoiceDraftControls />

      {/* Your existing form content */}
      <div>
        {/* ... your form fields ... */}
      </div>
    </div>
  );
};

/**
 * Example 2: With Submit Handler
 * Integrate draft cleanup after successful submission
 */
export const WithSubmitExample: Component = () => {
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const handleSubmit = async () => {
    // Validate form
    if (!invoiceFormStore.isValid()) {
      alert('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = invoiceFormStore.getFormData();

      // Submit to your API endpoint
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();

      // IMPORTANT: Clear draft after successful submission
      clearDraftAfterSubmission(formData.invoice);

      // Clear form for next invoice
      invoiceFormStore.clearForm();

      alert('Invoice submitted successfully!');

    } catch (error) {
      devLog('Submission error:', error);
      alert('Failed to submit invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="invoice-form">
      <div class="form-header">
        <h1>Create Invoice</h1>

        {/* Draft controls */}
        <InvoiceDraftControls
          onDraftSaved={() => {
            devLog('Draft saved successfully');
            // Optional: Show custom notification
          }}
          onDraftLoaded={() => {
            devLog('Draft loaded successfully');
            // Optional: Show custom notification
          }}
        />
      </div>

      {/* Your form content */}
      <div class="form-body">
        {/* ... your form fields ... */}
      </div>

      <div class="form-actions">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting() || !invoiceFormStore.isValid()}
          class="submit-button"
        >
          {isSubmitting() ? 'Submitting...' : 'Submit Invoice'}
        </button>
      </div>
    </div>
  );
};

/**
 * Example 3: Custom Styled Integration
 * With custom styling and layout
 */
export const StyledExample: Component = () => {
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem',
    padding: '1.5rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius)',
    'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.1)'
  };

  const titleStyle = {
    margin: '0',
    'font-size': '1.5rem',
    'font-weight': '600',
    color: 'var(--text-primary)'
  };

  const handleSubmit = async () => {
    if (!invoiceFormStore.isValid()) {
      alert('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = invoiceFormStore.getFormData();

      // Your API call here
      const response = await submitInvoiceToServer(formData);

      if (response.success) {
        // Clear draft after success
        clearDraftAfterSubmission(formData.invoice);
        invoiceFormStore.clearForm();
        alert('Invoice submitted successfully!');
      }
    } catch (error) {
      devLog('Error:', error);
      alert('Failed to submit invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="invoice-form-container">
      {/* Header with title and draft controls */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>📝 Create New Invoice</h1>

        {/* Draft controls */}
        <InvoiceDraftControls />
      </div>

      {/* Form content */}
      <div class="form-content">
        {/* Your form fields */}
      </div>

      {/* Footer with submit */}
      <div class="form-footer">
        <button onClick={handleSubmit} disabled={isSubmitting()}>
          {isSubmitting() ? 'Submitting...' : 'Submit Invoice'}
        </button>
      </div>
    </div>
  );
};

/**
 * Helper function for API submission (replace with your actual implementation)
 */
async function submitInvoiceToServer(formData: any) {
  // Replace this with your actual API call
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add your auth headers here
    },
    body: JSON.stringify(formData)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * QUICK COPY-PASTE SNIPPET
 *
 * 1. Import the controls:
 */
// import InvoiceDraftControls, { clearDraftAfterSubmission } from './InvoiceDraftControls';

/**
 * 2. Add to your JSX (in the form header):
 */
// <InvoiceDraftControls />

/**
 * 3. After successful submission (in your submit handler):
 */
// if (response.ok) {
//   clearDraftAfterSubmission(formData.invoice);
//   invoiceFormStore.clearForm();
//   alert('Invoice submitted successfully!');
// }

/**
 * That's it! Your invoice form now supports multiple drafts.
 */
