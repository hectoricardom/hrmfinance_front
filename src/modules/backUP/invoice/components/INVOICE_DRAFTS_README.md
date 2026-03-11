# Invoice Multi-Draft System

This feature allows you to save multiple invoice drafts and switch between them easily. Perfect for managing multiple customers who need to complete their information or payment at different times.

## Features

- ✅ Save unlimited draft invoices
- ✅ Each draft is stored independently
- ✅ Auto-save current work before loading another draft
- ✅ Search and filter drafts by customer name or invoice number
- ✅ Automatic cleanup when invoice is successfully submitted
- ✅ Visual indicators showing number of saved drafts
- ✅ Metadata tracking (customer name, invoice #, total amount, last updated)

## How to Use

### 1. Add Draft Controls to Your Invoice Form

Import and add the `InvoiceDraftControls` component to your invoice form:

```tsx
import InvoiceDraftControls from './InvoiceDraftControls';

const YourInvoiceForm = () => {
  return (
    <div>
      {/* Your form header */}
      <h1>Create Invoice</h1>

      {/* Add the draft controls */}
      <InvoiceDraftControls />

      {/* Rest of your invoice form */}
      <YourFormFields />
    </div>
  );
};
```

### 2. Clear Drafts After Successful Submission

After successfully submitting an invoice to the server, call `clearDraftAfterSubmission` to remove it from drafts:

```tsx
import { clearDraftAfterSubmission } from './InvoiceDraftControls';

const handleSubmitInvoice = async () => {
  try {
    const invoiceData = invoiceFormStore.getFormData();

    // Submit to server
    const response = await submitInvoice(invoiceData);

    if (response.success) {
      // Clear the draft for this invoice number
      clearDraftAfterSubmission(invoiceData.invoice);

      // Show success message
      alert('Invoice submitted successfully!');

      // Clear the form
      invoiceFormStore.clearForm();
    }
  } catch (error) {
    console.error('Error submitting invoice:', error);
    alert('Failed to submit invoice');
  }
};
```

## User Workflow

### Scenario: Customer needs to complete payment tomorrow

1. **Start creating an invoice** for Customer A
   - Fill in customer details
   - Add products/reservas
   - Notice customer needs to bring more information tomorrow

2. **Click "Save as Draft"**
   - Current invoice is saved with all data
   - A success notification appears
   - Draft counter badge shows "1"

3. **Click "New Invoice"** to start fresh
   - System asks: "Save current invoice as draft before starting a new one?"
   - Click "Yes" if you forgot to save, or "No" if already saved
   - Form is cleared for next customer

4. **Work with Customer B**
   - Fill in their information
   - Complete or save as another draft

5. **When Customer A returns:**
   - Click "View Drafts" button
   - See all saved drafts with customer names and invoice numbers
   - Click on Customer A's draft
   - All their data is restored
   - Complete and submit the invoice

6. **After successful submission:**
   - Draft is automatically removed from the list
   - Only pending/incomplete invoices remain in drafts

## Draft Manager Features

The Draft Manager modal provides:

- **Search**: Find drafts by customer name, invoice number, or description
- **Draft Cards**: Show preview with:
  - Customer name
  - Invoice number
  - Description
  - Number of products and reservas
  - Total amount
  - Last updated time (e.g., "2h ago")

- **Actions per draft**:
  - **Load**: Restore draft to form
  - **Delete**: Remove draft permanently

- **Bulk action**:
  - **Clear All Drafts**: Remove all saved drafts at once

## API Reference

### Components

#### `InvoiceDraftControls`

Props:
- `onDraftSaved?: () => void` - Callback when a draft is saved
- `onDraftLoaded?: () => void` - Callback when a draft is loaded

#### `InvoiceDraftsManager`

Props:
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed
- `onDraftLoaded?: () => void` - Callback when a draft is loaded

### Store Functions

#### `invoiceDraftsStore`

```typescript
// Get all drafts
getDrafts(): InvoiceDraft[]

// Get draft count
getCount(): number

// Save new draft
saveDraft(formData: InvoiceFormData): InvoiceDraft

// Update existing draft
updateDraft(draftId: string, formData: InvoiceFormData): void

// Delete a draft
deleteDraft(draftId: string): void

// Get specific draft
getDraft(draftId: string): InvoiceDraft | undefined

// Clear all drafts
clearAllDrafts(): void

// Delete by invoice number (after submission)
deleteDraftByInvoiceNumber(invoiceNumber: string): void

// Get drafts sorted by most recent
getDraftsSorted(): InvoiceDraft[]

// Search drafts
searchDrafts(query: string): InvoiceDraft[]
```

#### Utility Function

```typescript
// Clear draft after successful submission
clearDraftAfterSubmission(invoiceNumber: string): void
```

## Data Structure

### InvoiceDraft

```typescript
interface InvoiceDraft {
  id: string;                    // Unique identifier
  data: InvoiceFormData;         // Full invoice form data
  metadata: {
    createdAt: Date;             // When draft was created
    updatedAt: Date;             // Last modification time
    customerName: string;        // For display in list
    invoiceNumber: string;       // Invoice number
    description: string;         // Invoice description
    totalAmount?: number;        // Calculated total
  };
}
```

## Storage

- Drafts are stored in **localStorage** under the key `invoice_drafts`
- Each draft is independent and doesn't interfere with others
- Drafts persist across browser sessions
- Automatic serialization/deserialization of dates

## Best Practices

1. **Save frequently**: Click "Save as Draft" whenever you need to pause work on an invoice

2. **Use descriptive invoice numbers**: Makes it easier to find drafts later

3. **Clean up regularly**: Delete or submit old drafts to keep the list manageable

4. **Search feature**: Use the search bar when you have many drafts

5. **New Invoice workflow**:
   - Always use "New Invoice" button to start fresh
   - Don't just clear fields manually
   - Let the system prompt you to save current work

## Examples

### Complete Integration Example

```tsx
import { Component, createSignal } from 'solid-js';
import { invoiceFormStore } from './stores/invoiceFormStore';
import InvoiceDraftControls, { clearDraftAfterSubmission } from './components/InvoiceDraftControls';

const InvoiceForm: Component = () => {
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const handleSubmit = async () => {
    if (!invoiceFormStore.isValid()) {
      alert('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = invoiceFormStore.getFormData();

      // Submit to API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Clear the draft for this invoice
        clearDraftAfterSubmission(formData.invoice);

        // Clear the form
        invoiceFormStore.clearForm();

        alert('Invoice submitted successfully!');
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error:', error);
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
          onDraftSaved={() => console.log('Draft saved!')}
          onDraftLoaded={() => console.log('Draft loaded!')}
        />
      </div>

      {/* Your form fields here */}
      <div class="form-body">
        {/* ... form fields ... */}
      </div>

      <div class="form-footer">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting() || !invoiceFormStore.isValid()}
        >
          {isSubmitting() ? 'Submitting...' : 'Submit Invoice'}
        </button>
      </div>
    </div>
  );
};

export default InvoiceForm;
```

## Troubleshooting

### Drafts not saving
- Check browser console for localStorage errors
- Ensure you have enough localStorage space (usually 5-10MB limit)
- Try clearing old drafts

### Can't find a draft
- Use the search feature in Draft Manager
- Check if draft was accidentally deleted
- Verify invoice number or customer name

### Draft not loading correctly
- Ensure invoice form structure matches draft data
- Check browser console for errors
- Try refreshing the page

## Support

For issues or questions about the draft system, check:
1. Browser console for error messages
2. LocalStorage inspector in DevTools
3. Network tab for API submission errors

---

**Created**: 2025
**Version**: 1.0.0
