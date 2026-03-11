/**
 * BankDocViewer
 * Renders bank statement / voided check details with masked account info.
 * Data can arrive from multiple server paths with varying field names.
 */
import { Component, Show } from 'solid-js';
import type { DrakeTaxDocument } from '../../../types/drakeTypes';

interface BankDocViewerProps {
  document: DrakeTaxDocument;
}

const maskAccount = (acct: string): string => {
  if (!acct) return '';
  const digits = acct.replace(/\D/g, '');
  if (digits.length > 4) {
    return '****' + digits.slice(-4);
  }
  return acct;
};

/**
 * Extract best-available bank data from a document.
 * Server may return fields under different names depending on AI model / doc type:
 *   - extractedData (raw server extraction, [key:string]:any)
 *   - aiAnalysis.extractedData (AI classification result)
 *   - extractedAmounts (mapped amounts — rarely used for bank docs)
 */
const getBankData = (doc: DrakeTaxDocument) => {
  const ed = doc.extractedData || {} as any;
  const ai = doc.aiAnalysis?.extractedData || {} as any;
  const ea = doc.extractedAmounts || {} as any;

  const bankName =
    ed.bankName || ed.bank_name || ed.institutionName || ed.financial_institution ||
    ai.bankName || ai.bank_name || ai.institutionName ||
    ea.bankName ||
    '';

  const routingNumber =
    ed.routingNumber || ed.routing_number || ed.routingTransitNumber || ed.abaNumber ||
    ai.routingNumber || ai.routing_number ||
    ea.routingNumber ||
    '';

  const accountNumber =
    ed.accountNumber || ed.account_number || ed.acctNumber ||
    ai.accountNumber || ai.account_number ||
    ea.accountNumber ||
    '';

  const accountType =
    ed.accountType || ed.account_type ||
    ai.accountType || ai.account_type ||
    ea.accountType ||
    '';

  const accountHolderName =
    ed.accountHolderName || ed.account_holder || ed.accountHolder ||
    ed.recipientName || ed.name ||
    ai.accountHolderName || ai.recipientName ||
    [ed.firstName, ed.lastName].filter(Boolean).join(' ') ||
    [ai.firstName, ai.lastName].filter(Boolean).join(' ') ||
    '';

  return { bankName, routingNumber, accountNumber, accountType, accountHolderName };
};

const BankDocViewer: Component<BankDocViewerProps> = (props) => {
  const data = () => getBankData(props.document);

  const hasBankInfo = () =>
    data().bankName || data().routingNumber || data().accountNumber;

  return (
    <Show when={hasBankInfo()}>
      <div style={{ 'margin-bottom': '1.5rem' }}>
        <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <span style={{ background: '#10b981', color: 'white', padding: '0.125rem 0.5rem', 'border-radius': '4px', 'font-size': '0.75rem' }}>Bank</span>
          Bank Information
        </div>
        <div style={{
          padding: '1rem',
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          'border-radius': '8px',
        }}>
          <Show when={data().bankName}>
            <div style={{ 'font-weight': '600', 'font-size': '1rem', 'margin-bottom': '0.75rem' }}>
              {data().bankName}
            </div>
          </Show>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            gap: '0.5rem',
          }}>
            <Show when={data().routingNumber}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Routing Number</div>
                <div style={{ 'font-weight': '600', 'font-family': 'monospace', 'font-size': '1rem' }}>
                  {data().routingNumber}
                </div>
              </div>
            </Show>
            <Show when={data().accountNumber}>
              <div style={{ padding: '0.75rem', background: 'var(--surface-alt, #f9fafb)', 'border-radius': '6px' }}>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>Account Number</div>
                <div style={{ 'font-weight': '600', 'font-family': 'monospace', 'font-size': '1rem' }}>
                  {maskAccount(data().accountNumber)}
                </div>
              </div>
            </Show>
          </div>
          <Show when={data().accountType || data().accountHolderName}>
            <div style={{ 'margin-top': '0.5rem', display: 'flex', gap: '1.5rem', 'font-size': '0.8125rem', color: 'var(--text-secondary)' }}>
              <Show when={data().accountType}>
                <div>
                  Account Type: <span style={{ 'font-weight': '500', color: 'var(--text-primary)', 'text-transform': 'capitalize' }}>{data().accountType}</span>
                </div>
              </Show>
              <Show when={data().accountHolderName}>
                <div>
                  Holder: <span style={{ 'font-weight': '500', color: 'var(--text-primary)' }}>{data().accountHolderName}</span>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default BankDocViewer;
