/**
 * G1650Form - USCIS Authorization for ACH Transactions
 *
 * Form G-1650 allows applicants to authorize USCIS to withdraw funds
 * from their bank account for immigration application fees.
 */

import { Component, createSignal, Show, createEffect } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import CustomerSearchDropdown from './CustomerSearchDropdown';
import { NotaryCustomer } from '../types';
import { PDFDocument } from 'pdf-lib';
import { devLog } from '../../../services/utils';

interface G1650FormData {
  // Applicant's/Petitioner's/Requester's Information
  applicantFirstName: string;
  applicantMiddleName: string;
  applicantLastName: string;

  // Bank Account Holder Information
  accountType: 'business' | 'personal';
  holderFirstName: string;
  holderMiddleName: string;
  holderLastName: string;
  businessName: string;

  // Bank Account Information
  accountCategory: 'checking' | 'savings';
  authorizedAmount: string;
  routingNumber: string;
  accountNumber: string;
  bankName: string;
}

interface G1650FormProps {
  initialData?: Partial<G1650FormData>;
  onSave?: (data: G1650FormData) => void;
  onCancel?: () => void;
}

const getEmptyFormData = (): G1650FormData => ({
  applicantFirstName: '',
  applicantMiddleName: '',
  applicantLastName: '',
  accountType: 'personal',
  holderFirstName: '',
  holderMiddleName: '',
  holderLastName: '',
  businessName: '',
  accountCategory: 'checking',
  authorizedAmount: '',
  routingNumber: '',
  accountNumber: '',
  bankName: ''
});

const G1650Form: Component<G1650FormProps> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal<string | null>(null);
  const [linkedCustomer, setLinkedCustomer] = createSignal<NotaryCustomer | null>(null);
  const [sameAsApplicant, setSameAsApplicant] = createSignal(true);

  // Form fields
  const initialData = props.initialData || getEmptyFormData();

  // Applicant Information
  const [applicantFirstName, setApplicantFirstName] = createSignal(initialData.applicantFirstName || '');
  const [applicantMiddleName, setApplicantMiddleName] = createSignal(initialData.applicantMiddleName || '');
  const [applicantLastName, setApplicantLastName] = createSignal(initialData.applicantLastName || '');

  // Bank Account Holder Information
  const [accountType, setAccountType] = createSignal<'business' | 'personal'>(initialData.accountType || 'personal');
  const [holderFirstName, setHolderFirstName] = createSignal(initialData.holderFirstName || '');
  const [holderMiddleName, setHolderMiddleName] = createSignal(initialData.holderMiddleName || '');
  const [holderLastName, setHolderLastName] = createSignal(initialData.holderLastName || '');
  const [businessName, setBusinessName] = createSignal(initialData.businessName || '');

  // Bank Account Information
  const [accountCategory, setAccountCategory] = createSignal<'checking' | 'savings'>(initialData.accountCategory || 'checking');
  const [authorizedAmount, setAuthorizedAmount] = createSignal(initialData.authorizedAmount || '');
  const [routingNumber, setRoutingNumber] = createSignal(initialData.routingNumber || '');
  const [accountNumber, setAccountNumber] = createSignal(initialData.accountNumber || '');
  const [bankName, setBankName] = createSignal(initialData.bankName || '');

  // Auto-fill holder info when sameAsApplicant is checked
  createEffect(() => {
    if (sameAsApplicant()) {
      setHolderFirstName(applicantFirstName());
      setHolderMiddleName(applicantMiddleName());
      setHolderLastName(applicantLastName());
    }
  });

  // Handle customer selection
  const handleCustomerSelect = (customer: NotaryCustomer) => {
    setLinkedCustomer(customer);
    setApplicantFirstName(customer.firstName || '');
    setApplicantMiddleName(customer.middleName || '');
    setApplicantLastName(customer.lastName || '');

    if (sameAsApplicant()) {
      setHolderFirstName(customer.firstName || '');
      setHolderMiddleName(customer.middleName || '');
      setHolderLastName(customer.lastName || '');
    }
  };

  const getFormData = (): G1650FormData => ({
    applicantFirstName: applicantFirstName(),
    applicantMiddleName: applicantMiddleName(),
    applicantLastName: applicantLastName(),
    accountType: accountType(),
    holderFirstName: holderFirstName(),
    holderMiddleName: holderMiddleName(),
    holderLastName: holderLastName(),
    businessName: businessName(),
    accountCategory: accountCategory(),
    authorizedAmount: authorizedAmount(),
    routingNumber: routingNumber(),
    accountNumber: accountNumber(),
    bankName: bankName()
  });

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!applicantFirstName()) errors.push('Applicant First Name is required');
    if (!applicantLastName()) errors.push('Applicant Last Name is required');
    if (!holderFirstName()) errors.push('Account Holder First Name is required');
    if (!holderLastName()) errors.push('Account Holder Last Name is required');
    if (accountType() === 'business' && !businessName()) errors.push('Business Name is required for business accounts');
    if (!authorizedAmount()) errors.push('Authorized Payment Amount is required');
    if (!routingNumber()) errors.push('Routing Number is required');
    if (routingNumber() && routingNumber().length !== 9) errors.push('Routing Number must be 9 digits');
    if (!accountNumber()) errors.push('Account Number is required');
    if (!bankName()) errors.push('Bank Name is required');

    return errors;
  };

  const generateAndDownloadPDF = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Load the original G-1650 PDF template
      const response = await fetch('/forms/G1650.pdf');
      if (!response.ok) {
        throw new Error('Could not load G-1650 PDF template. Please ensure the file exists at /public/forms/G1650.pdf');
      }

      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Fill text fields with exact field names from the PDF
      // Applicant/Petitioner Name
      const applicantGivenName = form.getTextField('form1[0].PG1[0].sfApplicantPetitionerName[0].GivenName[0]');
      applicantGivenName.setText(applicantFirstName());

      const applicantMiddleNameField = form.getTextField('form1[0].PG1[0].sfApplicantPetitionerName[0].MiddleName[0]');
      applicantMiddleNameField.setText(applicantMiddleName());

      const applicantFamilyName = form.getTextField('form1[0].PG1[0].sfApplicantPetitionerName[0].FamilyName[0]');
      applicantFamilyName.setText(applicantLastName());

      // Bank Account Holder Information
      const holderGivenName = form.getTextField('form1[0].PG1[0].sfBankAccountHolderInfo[0].GivenName[0]');
      holderGivenName.setText(holderFirstName());

      const holderMiddleNameField = form.getTextField('form1[0].PG1[0].sfBankAccountHolderInfo[0].MiddleName[0]');
      holderMiddleNameField.setText(holderMiddleName());

      const holderFamilyName = form.getTextField('form1[0].PG1[0].sfBankAccountHolderInfo[0].FamilyName[0]');
      holderFamilyName.setText(holderLastName());

      // Account Type checkboxes (Business = [0], Personal = [1])
      const businessAccountCb = form.getCheckBox('form1[0].PG1[0].sfBankAccountHolderInfo[0].CB_AccountType[0]');
      const personalAccountCb = form.getCheckBox('form1[0].PG1[0].sfBankAccountHolderInfo[0].CB_AccountType[1]');
      if (accountType() === 'business') {
        businessAccountCb.check();
        personalAccountCb.uncheck();
      } else {
        personalAccountCb.check();
        businessAccountCb.uncheck();
      }

      // Bank Account Information
      // Account Category checkboxes (Checking = [0], Savings = [1])
      const checkingCb = form.getCheckBox('form1[0].PG1[0].sfBankAccountInformation[0].CB_CreditCardType[0]');
      const savingsCb = form.getCheckBox('form1[0].PG1[0].sfBankAccountInformation[0].CB_CreditCardType[1]');
      if (accountCategory() === 'checking') {
        checkingCb.check();
        savingsCb.uncheck();
      } else {
        savingsCb.check();
        checkingCb.uncheck();
      }

      // Payment Amount
      const authorizedPaymentAmt = form.getTextField('form1[0].PG1[0].sfBankAccountInformation[0].AuthorizedPaymentAmt[0]');
      authorizedPaymentAmt.setText(authorizedAmount());

      // Bank Name
      const bankNameField = form.getTextField('form1[0].PG1[0].sfBankAccountInformation[0].BankName[0]');
      bankNameField.setText(bankName());

      // Routing Number
      const routingNumberField = form.getTextField('form1[0].PG1[0].sfBankAccountInformation[0].RoutingNumber[0]');
      routingNumberField.setText(routingNumber());

      // Account Number
      const accountNumberField = form.getTextField('form1[0].PG1[0].sfBankAccountInformation[0].AccountNumber[0]');
      accountNumberField.setText(accountNumber());

      // Business Name (if business account)
      if (accountType() === 'business' && businessName()) {
        const businessNameField = form.getTextField('form1[0].PG1[0].sfBankAccountInformation[0].BusinessName[0]');
        businessNameField.setText(businessName());
      }

      // Flatten form to make it non-editable (optional - comment out if you want editable PDF)
      // form.flatten();

      // Save and download
      const filledPdfBytes = await pdfDoc.save();
      const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `G-1650_${applicantLastName()}_${applicantFirstName()}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('PDF filled and downloaded successfully!');

      if (props.onSave) {
        props.onSave(getFormData());
      }

    } catch (err) {
      devLog('Error filling PDF:', err);
      setError(`Failed to fill PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const sectionStyle = {
    'margin-bottom': '1.5rem',
    padding: '1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    'margin-bottom': '1rem',
    'padding-bottom': '0.5rem',
    'border-bottom': '2px solid var(--primary-color)',
    color: 'var(--text-primary)'
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  };

  const checkboxGroupStyle = {
    display: 'flex',
    gap: '1.5rem',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const checkboxLabelStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    cursor: 'pointer'
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'margin-bottom': '1.5rem'
        }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Form G-1650</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Authorization for ACH Transactions - USCIS
            </p>
          </div>
          <Show when={props.onCancel}>
            <Button variant="secondary" onClick={props.onCancel}>
              Cancel
            </Button>
          </Show>
        </div>

        {/* Link Customer */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Link to Client (Optional)</h3>
          <CustomerSearchDropdown
            onSelect={handleCustomerSelect}
            placeholder="Search for a client to auto-fill information..."
          />
          <Show when={linkedCustomer()}>
            <div style={{
              'margin-top': '0.75rem',
              padding: '0.5rem',
              background: '#e8f5e9',
              'border-radius': 'var(--border-radius-sm)',
              color: '#2e7d32'
            }}>
              Linked to: {linkedCustomer()!.firstName} {linkedCustomer()!.lastName}
            </div>
          </Show>
        </div>

        {/* Section 1: Applicant Information */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Applicant's/Petitioner's/Requester's Information (Full Legal Name)</h3>
          <div style={gridStyle}>
            <FormInput
              label="Given Name (First Name)"
              type="text"
              value={applicantFirstName()}
              onChange={setApplicantFirstName}
              required
            />
            <FormInput
              label="Middle Name (if any)"
              type="text"
              value={applicantMiddleName()}
              onChange={setApplicantMiddleName}
            />
            <FormInput
              label="Family Name (Last Name)"
              type="text"
              value={applicantLastName()}
              onChange={setApplicantLastName}
              required
            />
          </div>
        </div>

        {/* Section 2: Bank Account Holder Information */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Bank Account Holder Information</h3>

          {/* Account Type */}
          <div style={checkboxGroupStyle}>
            <label style={checkboxLabelStyle}>
              <input
                type="radio"
                name="accountType"
                checked={accountType() === 'business'}
                onChange={() => setAccountType('business')}
              />
              Business Account
            </label>
            <label style={checkboxLabelStyle}>
              <input
                type="radio"
                name="accountType"
                checked={accountType() === 'personal'}
                onChange={() => setAccountType('personal')}
              />
              Personal Account
            </label>
          </div>

          <p style={{ 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
            Account Holder's Name as it Appears on the Account
          </p>

          {/* Same as Applicant checkbox */}
          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={sameAsApplicant()}
                onChange={(e) => setSameAsApplicant(e.target.checked)}
              />
              Same as Applicant
            </label>
          </div>

          <div style={gridStyle}>
            <FormInput
              label="Given Name (First Name)"
              type="text"
              value={holderFirstName()}
              onChange={setHolderFirstName}
              disabled={sameAsApplicant()}
              required
            />
            <FormInput
              label="Middle Name (if any)"
              type="text"
              value={holderMiddleName()}
              onChange={setHolderMiddleName}
              disabled={sameAsApplicant()}
            />
            <FormInput
              label="Family Name (Last Name)"
              type="text"
              value={holderLastName()}
              onChange={setHolderLastName}
              disabled={sameAsApplicant()}
              required
            />
          </div>

          <Show when={accountType() === 'business'}>
            <div style={{ 'margin-top': '1rem' }}>
              <FormInput
                label="Business Name"
                type="text"
                value={businessName()}
                onChange={setBusinessName}
                required
              />
            </div>
          </Show>
        </div>

        {/* Section 3: Bank Account Information */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Bank Account Information</h3>

          <div style={{ display: 'flex', gap: '2rem', 'flex-wrap': 'wrap', 'margin-bottom': '1rem' }}>
            {/* Account Category */}
            <div style={checkboxGroupStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="radio"
                  name="accountCategory"
                  checked={accountCategory() === 'checking'}
                  onChange={() => setAccountCategory('checking')}
                />
                Checking Account
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="radio"
                  name="accountCategory"
                  checked={accountCategory() === 'savings'}
                  onChange={() => setAccountCategory('savings')}
                />
                Savings Account
              </label>
            </div>

            {/* Authorized Amount */}
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <span style={{ 'font-weight': '500' }}>Authorized Payment Amount:</span>
              <span style={{ 'font-size': '1.25rem' }}>$</span>
              <input
                type="number"
                value={authorizedAmount()}
                onInput={(e) => setAuthorizedAmount(e.currentTarget.value)}
                style={{
                  width: '120px',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '1rem'
                }}
                min="0"
                step="1"
                required
              />
              <span>.00</span>
            </div>
          </div>

          <div style={gridStyle}>
            <FormInput
              label="Routing Number (9 digits)"
              type="text"
              value={routingNumber()}
              onChange={(val) => setRoutingNumber(val.replace(/\D/g, '').slice(0, 9))}
              placeholder="123456789"
              required
            />
            <FormInput
              label="Account Number"
              type="text"
              value={accountNumber()}
              onChange={(val) => setAccountNumber(val.replace(/\D/g, ''))}
              placeholder="Account Number"
              required
            />
          </div>

          <div style={{ 'margin-top': '1rem' }}>
            <FormInput
              label="Bank Name"
              type="text"
              value={bankName()}
              onChange={setBankName}
              placeholder="Enter your bank name"
              required
            />
          </div>
        </div>

        {/* Section 4: Authorization Notice */}
        <div style={{
          ...sectionStyle,
          background: '#fff8e1',
          'border-color': '#ffc107'
        }}>
          <h3 style={{ ...sectionTitleStyle, 'border-bottom-color': '#ffc107' }}>Authorization and Signature</h3>
          <p style={{ 'font-size': '0.875rem', color: '#5d4037', 'line-height': '1.5' }}>
            By completing this transaction, you agree that you have paid for a government service and that the fees
            and all related financial transactions are final and not refundable, regardless of any action USCIS takes
            on an application, petition, or request. You must submit all fees in the exact amounts. USCIS will transfer
            from your account the amount you authorize above.
          </p>
          <p style={{ 'font-size': '0.875rem', color: '#5d4037', 'margin-top': '0.5rem' }}>
            <strong>Note:</strong> The account must be with a U.S. bank. You may need to contact your bank to permit
            the Department of Homeland Security to debit funds by ACH from your account.
          </p>
        </div>

        {/* Error/Success Messages */}
        <Show when={error()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: '#ffebee',
            border: '1px solid #f44336',
            'border-radius': 'var(--border-radius-sm)',
            color: '#c62828',
            'white-space': 'pre-line'
          }}>
            {error()}
          </div>
        </Show>

        <Show when={success()}>
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: '#e8f5e9',
            border: '1px solid #4caf50',
            'border-radius': 'var(--border-radius-sm)',
            color: '#2e7d32'
          }}>
            {success()}
          </div>
        </Show>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'justify-content': 'flex-end',
          'margin-top': '1.5rem'
        }}>
          <Button
            variant="primary"
            onClick={generateAndDownloadPDF}
            disabled={loading()}
          >
            {loading() ? 'Generating PDF...' : 'Generate & Download PDF'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default G1650Form;
