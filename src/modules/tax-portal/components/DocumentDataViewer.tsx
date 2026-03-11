/**
 * Document Data Viewer Component
 *
 * Displays extracted data from analyzed tax documents for review.
 * Shows different layouts based on document type (W-2, 1099, 1098, etc.)
 */

import { Component, Show, For, createSignal } from 'solid-js';
import { TaxDocument } from '../types';
import { Card, Button } from '../../ui';
import { useTranslation } from '../../../translations';

interface DocumentDataViewerProps {
  document: TaxDocument;
  onClose: () => void;
  onApprove?: (doc: TaxDocument) => void;
  onReject?: (doc: TaxDocument, reason: string) => void;
  onEditField?: (doc: TaxDocument, field: string, value: any) => void;
  readOnly?: boolean;
}

// Field display configuration for different document types
const DOCUMENT_FIELD_CONFIG: Record<string, { label: string; fields: { key: string; label: string; type: 'text' | 'currency' | 'percent' | 'date' | 'ssn' }[] }> = {
  form_w2: {
    label: 'Form W-2 - Wage and Tax Statement',
    fields: [
      { key: 'employerName', label: 'Employer Name', type: 'text' },
      { key: 'employerEIN', label: 'Employer EIN', type: 'text' },
      { key: 'employerAddress', label: 'Employer Address', type: 'text' },
      { key: 'employeeName', label: 'Employee Name', type: 'text' },
      { key: 'employeeSSN', label: 'Employee SSN', type: 'ssn' },
      { key: 'wages', label: 'Box 1: Wages, Tips, Other Compensation', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 2: Federal Income Tax Withheld', type: 'currency' },
      { key: 'socialSecurityWages', label: 'Box 3: Social Security Wages', type: 'currency' },
      { key: 'socialSecurityTaxWithheld', label: 'Box 4: Social Security Tax Withheld', type: 'currency' },
      { key: 'medicareWages', label: 'Box 5: Medicare Wages and Tips', type: 'currency' },
      { key: 'medicareTaxWithheld', label: 'Box 6: Medicare Tax Withheld', type: 'currency' },
      { key: 'socialSecurityTips', label: 'Box 7: Social Security Tips', type: 'currency' },
      { key: 'allocatedTips', label: 'Box 8: Allocated Tips', type: 'currency' },
      { key: 'dependentCareBenefits', label: 'Box 10: Dependent Care Benefits', type: 'currency' },
      { key: 'nonqualifiedPlans', label: 'Box 11: Nonqualified Plans', type: 'currency' },
      { key: 'box12', label: 'Box 12: Codes', type: 'text' },
      { key: 'stateTaxWithheld', label: 'Box 17: State Income Tax', type: 'currency' },
      { key: 'stateWages', label: 'Box 16: State Wages', type: 'currency' },
      { key: 'localTaxWithheld', label: 'Box 19: Local Income Tax', type: 'currency' },
      { key: 'localWages', label: 'Box 18: Local Wages', type: 'currency' },
    ]
  },
  form_1099_nec: {
    label: 'Form 1099-NEC - Nonemployee Compensation',
    fields: [
      { key: 'payerName', label: 'Payer Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'payerAddress', label: 'Payer Address', type: 'text' },
      { key: 'recipientName', label: 'Recipient Name', type: 'text' },
      { key: 'recipientTIN', label: 'Recipient TIN', type: 'ssn' },
      { key: 'nonEmployeeCompensation', label: 'Box 1: Nonemployee Compensation', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'stateTaxWithheld', label: 'Box 5: State Tax Withheld', type: 'currency' },
      { key: 'statePayerNo', label: 'Box 6: State/Payer State No.', type: 'text' },
      { key: 'stateIncome', label: 'Box 7: State Income', type: 'currency' },
    ]
  },
  form_1099_misc: {
    label: 'Form 1099-MISC - Miscellaneous Income',
    fields: [
      { key: 'payerName', label: 'Payer Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'rents', label: 'Box 1: Rents', type: 'currency' },
      { key: 'royalties', label: 'Box 2: Royalties', type: 'currency' },
      { key: 'otherIncome', label: 'Box 3: Other Income', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'fishingBoatProceeds', label: 'Box 5: Fishing Boat Proceeds', type: 'currency' },
      { key: 'medicalPayments', label: 'Box 6: Medical and Health Care Payments', type: 'currency' },
      { key: 'substitutePayments', label: 'Box 8: Substitute Payments in Lieu of Dividends', type: 'currency' },
      { key: 'cropInsurance', label: 'Box 9: Crop Insurance Proceeds', type: 'currency' },
      { key: 'grossAttorney', label: 'Box 10: Gross Proceeds Paid to Attorney', type: 'currency' },
      { key: 'fishPurchased', label: 'Box 11: Fish Purchased for Resale', type: 'currency' },
      { key: 'section409ADeferrals', label: 'Box 12: Section 409A Deferrals', type: 'currency' },
      { key: 'excessGoldenParachute', label: 'Box 13: Excess Golden Parachute Payments', type: 'currency' },
      { key: 'nonqualifiedDeferred', label: 'Box 14: Nonqualified Deferred Compensation', type: 'currency' },
    ]
  },
  form_1099_int: {
    label: 'Form 1099-INT - Interest Income',
    fields: [
      { key: 'payerName', label: 'Payer Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'interestIncome', label: 'Box 1: Interest Income', type: 'currency' },
      { key: 'earlyWithdrawalPenalty', label: 'Box 2: Early Withdrawal Penalty', type: 'currency' },
      { key: 'usSavingsBondInterest', label: 'Box 3: Interest on U.S. Savings Bonds', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'investmentExpenses', label: 'Box 5: Investment Expenses', type: 'currency' },
      { key: 'foreignTaxPaid', label: 'Box 6: Foreign Tax Paid', type: 'currency' },
      { key: 'foreignCountry', label: 'Box 7: Foreign Country', type: 'text' },
      { key: 'taxExemptInterest', label: 'Box 8: Tax-Exempt Interest', type: 'currency' },
      { key: 'privateBondInterest', label: 'Box 9: Specified Private Activity Bond Interest', type: 'currency' },
      { key: 'marketDiscount', label: 'Box 10: Market Discount', type: 'currency' },
      { key: 'bondPremium', label: 'Box 11: Bond Premium', type: 'currency' },
    ]
  },
  form_1099_div: {
    label: 'Form 1099-DIV - Dividends and Distributions',
    fields: [
      { key: 'payerName', label: 'Payer Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'ordinaryDividends', label: 'Box 1a: Total Ordinary Dividends', type: 'currency' },
      { key: 'qualifiedDividends', label: 'Box 1b: Qualified Dividends', type: 'currency' },
      { key: 'totalCapitalGain', label: 'Box 2a: Total Capital Gain Distribution', type: 'currency' },
      { key: 'unrecaptured1250', label: 'Box 2b: Unrecap. Sec. 1250 Gain', type: 'currency' },
      { key: 'section1202Gain', label: 'Box 2c: Section 1202 Gain', type: 'currency' },
      { key: 'collectiblesGain', label: 'Box 2d: Collectibles (28%) Gain', type: 'currency' },
      { key: 'section897Dividends', label: 'Box 2e: Section 897 Ordinary Dividends', type: 'currency' },
      { key: 'section897CapitalGain', label: 'Box 2f: Section 897 Capital Gain', type: 'currency' },
      { key: 'nondividendDistributions', label: 'Box 3: Nondividend Distributions', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'section199ADividends', label: 'Box 5: Section 199A Dividends', type: 'currency' },
      { key: 'investmentExpenses', label: 'Box 6: Investment Expenses', type: 'currency' },
      { key: 'foreignTaxPaid', label: 'Box 7: Foreign Tax Paid', type: 'currency' },
      { key: 'foreignCountry', label: 'Box 8: Foreign Country', type: 'text' },
      { key: 'cashLiquidation', label: 'Box 9: Cash Liquidation Distributions', type: 'currency' },
      { key: 'noncashLiquidation', label: 'Box 10: Noncash Liquidation Distributions', type: 'currency' },
      { key: 'exemptInterestDividends', label: 'Box 12: Exempt-Interest Dividends', type: 'currency' },
      { key: 'privateActivityBondDividends', label: 'Box 13: Private Activity Bond Interest Dividends', type: 'currency' },
    ]
  },
  form_1099_b: {
    label: 'Form 1099-B - Proceeds From Broker Transactions',
    fields: [
      { key: 'payerName', label: 'Payer/Broker Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'description', label: 'Box 1a: Description of Property', type: 'text' },
      { key: 'dateAcquired', label: 'Box 1b: Date Acquired', type: 'date' },
      { key: 'dateSold', label: 'Box 1c: Date Sold or Disposed', type: 'date' },
      { key: 'proceeds', label: 'Box 1d: Proceeds', type: 'currency' },
      { key: 'costBasis', label: 'Box 1e: Cost or Other Basis', type: 'currency' },
      { key: 'accruedMarketDiscount', label: 'Box 1f: Accrued Market Discount', type: 'currency' },
      { key: 'washSaleLoss', label: 'Box 1g: Wash Sale Loss Disallowed', type: 'currency' },
      { key: 'shortTermGainLoss', label: 'Box 2: Short-term Gain or Loss', type: 'currency' },
      { key: 'longTermGainLoss', label: 'Box 3: Long-term Gain or Loss', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'basisReportedToIRS', label: 'Box 12: Basis Reported to IRS', type: 'text' },
    ]
  },
  form_1099_r: {
    label: 'Form 1099-R - Distributions From Pensions, Annuities, Retirement',
    fields: [
      { key: 'payerName', label: 'Payer Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'grossDistribution', label: 'Box 1: Gross Distribution', type: 'currency' },
      { key: 'taxableAmount', label: 'Box 2a: Taxable Amount', type: 'currency' },
      { key: 'taxableAmountNotDetermined', label: 'Box 2b: Taxable Amount Not Determined', type: 'text' },
      { key: 'capitalGain', label: 'Box 3: Capital Gain', type: 'currency' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'employeeContributions', label: 'Box 5: Employee Contributions', type: 'currency' },
      { key: 'netUnrealizedAppreciation', label: 'Box 6: Net Unrealized Appreciation', type: 'currency' },
      { key: 'distributionCode', label: 'Box 7: Distribution Code(s)', type: 'text' },
      { key: 'otherAmount', label: 'Box 8: Other', type: 'currency' },
      { key: 'yourPercentOfTotal', label: 'Box 9a: Your Percentage of Total', type: 'percent' },
      { key: 'totalEmployeeContributions', label: 'Box 9b: Total Employee Contributions', type: 'currency' },
      { key: 'stateTaxWithheld', label: 'Box 12: State Tax Withheld', type: 'currency' },
      { key: 'stateDistribution', label: 'Box 14: State Distribution', type: 'currency' },
      { key: 'localTaxWithheld', label: 'Box 15: Local Tax Withheld', type: 'currency' },
    ]
  },
  form_1099_g: {
    label: 'Form 1099-G - Government Payments',
    fields: [
      { key: 'payerName', label: 'Payer Name', type: 'text' },
      { key: 'payerTIN', label: 'Payer TIN', type: 'text' },
      { key: 'unemploymentCompensation', label: 'Box 1: Unemployment Compensation', type: 'currency' },
      { key: 'stateTaxRefund', label: 'Box 2: State or Local Income Tax Refunds', type: 'currency' },
      { key: 'taxYear', label: 'Box 3: Tax Year', type: 'text' },
      { key: 'federalTaxWithheld', label: 'Box 4: Federal Income Tax Withheld', type: 'currency' },
      { key: 'rtaaPayments', label: 'Box 5: RTAA Payments', type: 'currency' },
      { key: 'taxableGrants', label: 'Box 6: Taxable Grants', type: 'currency' },
      { key: 'agriculturePayments', label: 'Box 7: Agriculture Payments', type: 'currency' },
      { key: 'tradeOrBusinessIncome', label: 'Box 8: Check if Box 2 is Trade or Business Income', type: 'text' },
      { key: 'marketGain', label: 'Box 9: Market Gain', type: 'currency' },
      { key: 'stateTaxWithheld', label: 'Box 11: State Tax Withheld', type: 'currency' },
    ]
  },
  form_1098: {
    label: 'Form 1098 - Mortgage Interest Statement',
    fields: [
      { key: 'lenderName', label: 'Lender Name', type: 'text' },
      { key: 'lenderTIN', label: 'Lender TIN', type: 'text' },
      { key: 'lenderAddress', label: 'Lender Address', type: 'text' },
      { key: 'borrowerName', label: 'Borrower Name', type: 'text' },
      { key: 'borrowerSSN', label: 'Borrower SSN', type: 'ssn' },
      { key: 'mortgageInterest', label: 'Box 1: Mortgage Interest Received', type: 'currency' },
      { key: 'outstandingPrincipal', label: 'Box 2: Outstanding Mortgage Principal', type: 'currency' },
      { key: 'mortgageOriginationDate', label: 'Box 3: Mortgage Origination Date', type: 'date' },
      { key: 'refundOfOverpaidInterest', label: 'Box 4: Refund of Overpaid Interest', type: 'currency' },
      { key: 'mortgageInsurancePremiums', label: 'Box 5: Mortgage Insurance Premiums', type: 'currency' },
      { key: 'pointsPaid', label: 'Box 6: Points Paid on Purchase', type: 'currency' },
      { key: 'propertyAddress', label: 'Box 8: Property Address', type: 'text' },
      { key: 'numberOfProperties', label: 'Box 9: Number of Properties', type: 'text' },
      { key: 'propertyTaxes', label: 'Box 10: Property Taxes', type: 'currency' },
    ]
  },
  form_1098_e: {
    label: 'Form 1098-E - Student Loan Interest Statement',
    fields: [
      { key: 'lenderName', label: 'Lender Name', type: 'text' },
      { key: 'lenderTIN', label: 'Lender TIN', type: 'text' },
      { key: 'borrowerName', label: 'Borrower Name', type: 'text' },
      { key: 'borrowerSSN', label: 'Borrower SSN', type: 'ssn' },
      { key: 'studentLoanInterest', label: 'Box 1: Student Loan Interest Received', type: 'currency' },
      { key: 'loanOriginatedBefore2018', label: 'Box 2: Loan Originated Before 9/1/2004', type: 'text' },
    ]
  },
  form_1098_t: {
    label: 'Form 1098-T - Tuition Statement',
    fields: [
      { key: 'institutionName', label: 'Institution Name', type: 'text' },
      { key: 'institutionTIN', label: 'Institution TIN', type: 'text' },
      { key: 'studentName', label: 'Student Name', type: 'text' },
      { key: 'studentSSN', label: 'Student SSN', type: 'ssn' },
      { key: 'paymentsReceived', label: 'Box 1: Payments Received for Qualified Tuition', type: 'currency' },
      { key: 'scholarshipsGrants', label: 'Box 5: Scholarships or Grants', type: 'currency' },
      { key: 'adjustmentsPriorYear', label: 'Box 4: Adjustments Made for Prior Year', type: 'currency' },
      { key: 'scholarshipAdjustments', label: 'Box 6: Adjustments to Scholarships for Prior Year', type: 'currency' },
      { key: 'includesAmountsForPeriod', label: 'Box 7: Includes Amounts for Academic Period Beginning Jan-Mar', type: 'text' },
      { key: 'halfTimeStudent', label: 'Box 8: At Least Half-Time Student', type: 'text' },
      { key: 'graduateStudent', label: 'Box 9: Graduate Student', type: 'text' },
      { key: 'insuranceContractReimbursement', label: 'Box 10: Insurance Contract Reimbursement', type: 'currency' },
    ]
  },
  form_ssa_1099: {
    label: 'Form SSA-1099 - Social Security Benefit Statement',
    fields: [
      { key: 'beneficiaryName', label: 'Beneficiary Name', type: 'text' },
      { key: 'beneficiarySSN', label: 'Beneficiary SSN', type: 'ssn' },
      { key: 'totalBenefitsPaid', label: 'Box 3: Total Benefits Paid', type: 'currency' },
      { key: 'benefitsRepaid', label: 'Box 4: Benefits Repaid to SSA', type: 'currency' },
      { key: 'netBenefits', label: 'Box 5: Net Benefits', type: 'currency' },
      { key: 'voluntaryTaxWithheld', label: 'Box 6: Voluntary Federal Income Tax Withheld', type: 'currency' },
      { key: 'description', label: 'Description of Amount in Box 3', type: 'text' },
    ]
  },
};

// Default config for unknown document types
const DEFAULT_FIELD_CONFIG = {
  label: 'Document Data',
  fields: [] as { key: string; label: string; type: 'text' | 'currency' | 'percent' | 'date' | 'ssn' }[]
};

const DocumentDataViewer: Component<DocumentDataViewerProps> = (props) => {
  const { t } = useTranslation();
  const [rejectReason, setRejectReason] = createSignal('');
  const [showRejectModal, setShowRejectModal] = createSignal(false);
  const [editingField, setEditingField] = createSignal<string | null>(null);
  const [editValue, setEditValue] = createSignal('');

  const getFieldConfig = () => {
    const docType = props.document.detectedType || props.document.documentType;
    return DOCUMENT_FIELD_CONFIG[docType] || DEFAULT_FIELD_CONFIG;
  };

  const formatValue = (value: any, type: string): string => {
    if (value === undefined || value === null || value === '') return '-';

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
      case 'percent':
        return `${Number(value).toFixed(2)}%`;
      case 'date':
        if (typeof value === 'string') return value;
        return new Date(value).toLocaleDateString();
      case 'ssn':
        if (typeof value === 'string' && value.length >= 4) {
          return `***-**-${value.slice(-4)}`;
        }
        return value;
      default:
        return String(value);
    }
  };

  const handleApprove = () => {
    if (props.onApprove) {
      props.onApprove(props.document);
    }
  };

  const handleReject = () => {
    if (props.onReject && rejectReason()) {
      props.onReject(props.document, rejectReason());
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const startEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = (field: string) => {
    if (props.onEditField) {
      props.onEditField(props.document, field, editValue());
    }
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const extractedData = () => props.document.extractedData || {};
  const config = () => getFieldConfig();

  // Get all keys from extracted data for unknown document types
  const allDataKeys = () => {
    const data = extractedData();
    const configFields = config().fields.map(f => f.key);

    // If we have config fields, use those
    if (configFields.length > 0) {
      return config().fields;
    }

    // Otherwise, generate fields from the data
    return Object.keys(data).map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      type: typeof data[key] === 'number' ? 'currency' : 'text' as 'text' | 'currency'
    }));
  };

  const containerStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'z-index': 1000,
    padding: '1rem',
  };

  const modalStyle = {
    background: 'white',
    'border-radius': '12px',
    'max-width': '800px',
    width: '100%',
    'max-height': '90vh',
    overflow: 'hidden',
    display: 'flex',
    'flex-direction': 'column' as const,
  };

  const headerStyle = {
    padding: '1.5rem',
    'border-bottom': '1px solid var(--border-color)',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
  };

  const bodyStyle = {
    padding: '1.5rem',
    overflow: 'auto',
    flex: 1,
  };

  const footerStyle = {
    padding: '1rem 1.5rem',
    'border-top': '1px solid var(--border-color)',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    gap: '1rem',
  };

  const fieldRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 1rem',
    'border-bottom': '1px solid var(--border-color)',
  };

  const fieldLabelStyle = {
    color: 'var(--text-muted)',
    'font-size': '0.875rem',
    flex: '1',
  };

  const fieldValueStyle = {
    'font-weight': '600',
    'text-align': 'right' as const,
    flex: '1',
  };

  const confidenceBadgeStyle = (confidence: number) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.5rem',
    'border-radius': '999px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: confidence >= 0.9 ? '#dcfce7' : confidence >= 0.7 ? '#fef3c7' : '#fee2e2',
    color: confidence >= 0.9 ? '#166534' : confidence >= 0.7 ? '#92400e' : '#dc2626',
  });

  return (
    <div style={containerStyle} onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem', 'font-size': '1.25rem' }}>
              {config().label}
            </h2>
            <p style={{ margin: 0, 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              {props.document.originalFileName}
            </p>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
            <Show when={props.document.confidence}>
              <div style={confidenceBadgeStyle(props.document.confidence!)}>
                {t('taxPortal.confidence')}: {Math.round((props.document.confidence || 0) * 100)}%
              </div>
            </Show>
            <button
              onClick={props.onClose}
              style={{
                background: 'none',
                border: 'none',
                'font-size': '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--text-muted)',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <Show
            when={Object.keys(extractedData()).length > 0}
            fallback={
              <div style={{ 'text-align': 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p>{t('taxPortal.pendingAnalysis')}</p>
              </div>
            }
          >
            {/* Document Preview Link */}
            <Show when={props.document.fileUrl}>
              <div style={{
                'margin-bottom': '1.5rem',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': '8px',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.viewDocument')}</span>
                <a
                  href={props.document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--primary-color)',
                    'text-decoration': 'none',
                    'font-weight': '500',
                  }}
                >
                  {t('common.open')} →
                </a>
              </div>
            </Show>

            {/* Extracted Data Fields */}
            <div style={{ 'border': '1px solid var(--border-color)', 'border-radius': '8px', overflow: 'hidden' }}>
              <For each={allDataKeys()}>
                {(field) => {
                  const value = extractedData()[field.key];
                  const hasValue = value !== undefined && value !== null && value !== '';

                  return (
                    <Show when={hasValue}>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>{field.label}</div>
                        <Show
                          when={editingField() === field.key && !props.readOnly}
                          fallback={
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                              <span style={fieldValueStyle}>
                                {formatValue(value, field.type)}
                              </span>
                              <Show when={!props.readOnly && props.onEditField}>
                                <button
                                  onClick={() => startEdit(field.key, value)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--primary-color)',
                                    'font-size': '0.875rem',
                                  }}
                                >
                                  ✏️
                                </button>
                              </Show>
                            </div>
                          }
                        >
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                            <input
                              type={field.type === 'currency' ? 'number' : 'text'}
                              value={editValue()}
                              onInput={(e) => setEditValue(e.currentTarget.value)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': '4px',
                                width: '150px',
                              }}
                            />
                            <button
                              onClick={() => saveEdit(field.key)}
                              style={{
                                background: '#22c55e',
                                color: 'white',
                                border: 'none',
                                padding: '0.25rem 0.5rem',
                                'border-radius': '4px',
                                cursor: 'pointer',
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '0.25rem 0.5rem',
                                'border-radius': '4px',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </Show>
                      </div>
                    </Show>
                  );
                }}
              </For>
            </div>

            {/* Tax Year */}
            <Show when={props.document.taxYear || extractedData().taxYear}>
              <div style={{
                'margin-top': '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--gray-50)',
                'border-radius': '8px',
                display: 'flex',
                'justify-content': 'space-between',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('taxPortal.taxYear')}</span>
                <span style={{ 'font-weight': '600' }}>
                  {props.document.taxYear || extractedData().taxYear}
                </span>
              </div>
            </Show>
          </Show>
        </div>

        {/* Footer */}
        <Show when={!props.readOnly}>
          <div style={footerStyle}>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              {t('taxPortal.status')}:
              <span style={{
                'margin-left': '0.5rem',
                'font-weight': '600',
                color: props.document.status === 'approved' ? '#22c55e' :
                       props.document.status === 'rejected' ? '#ef4444' : '#f59e0b'
              }}>
                {props.document.status === 'approved' ? t('taxPortal.approved') :
                 props.document.status === 'rejected' ? t('taxPortal.rejected') :
                 props.document.status === 'analyzed' ? t('taxPortal.analyzed') :
                 t('taxPortal.pending')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Show when={props.onReject && props.document.status !== 'rejected'}>
                <Button variant="outline" onClick={() => setShowRejectModal(true)}>
                  {t('taxPortal.reject')}
                </Button>
              </Show>
              <Show when={props.onApprove && props.document.status !== 'approved'}>
                <Button variant="primary" onClick={handleApprove}>
                  {t('taxPortal.approve')}
                </Button>
              </Show>
              <Button variant="outline" onClick={props.onClose}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Show>

        {/* Read-only footer */}
        <Show when={props.readOnly}>
          <div style={footerStyle}>
            <div />
            <Button variant="outline" onClick={props.onClose}>
              {t('common.close')}
            </Button>
          </div>
        </Show>
      </div>

      {/* Reject Modal */}
      <Show when={showRejectModal()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1001,
        }}>
          <div style={{
            background: 'white',
            'border-radius': '12px',
            padding: '1.5rem',
            'max-width': '400px',
            width: '100%',
          }}>
            <h3 style={{ margin: '0 0 1rem' }}>{t('taxPortal.reject')} - {t('taxPortal.reviewNotes')}</h3>
            <textarea
              value={rejectReason()}
              onInput={(e) => setRejectReason(e.currentTarget.value)}
              placeholder="Enter reason for rejection..."
              style={{
                width: '100%',
                'min-height': '100px',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                'border-radius': '8px',
                resize: 'vertical',
                'margin-bottom': '1rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', 'justify-content': 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={handleReject} disabled={!rejectReason()}>
                {t('taxPortal.reject')}
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default DocumentDataViewer;
