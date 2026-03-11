/**
 * Receipt Generator Component
 * Generates printable and digital receipts for tax preparation payments
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { Button } from '../../ui';
import type { TaxPortal } from '../../drake-export/types/drakeTypes';
import type { PaymentRecord, Receipt, PaymentSettings } from '../types/paymentTypes';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_LABELS_ES } from '../types/paymentTypes';
import { formatCurrency, formatReceiptDate } from '../services/paymentService';
import { paymentStore } from '../stores/paymentStore';

interface ReceiptGeneratorProps {
  payment: PaymentRecord;
  client: TaxPortal;
  settings: PaymentSettings;
  receipt?: Receipt;
  onClose?: () => void;
}

const ReceiptGenerator: Component<ReceiptGeneratorProps> = (props) => {
  const [isSending, setIsSending] = createSignal(false);

  // Generate or use provided receipt
  const receipt = () => {
    if (props.receipt) return props.receipt;
    return paymentStore.generateReceipt(props.payment, props.client);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const r = receipt();
    if (!r || !props.client.phone) return;

    setIsSending(true);

    // Build WhatsApp message
    const message = buildWhatsAppMessage(r);
    const phone = props.client.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    setIsSending(false);
  };

  const handleDownloadPdf = () => {
    // Trigger print dialog which allows Save as PDF
    window.print();
  };

  const buildWhatsAppMessage = (r: Receipt): string => {
    let msg = '';
    msg += `${r.businessName}\n`;
    msg += `Receipt #${r.receiptNumber}\n`;
    msg += `---\n`;
    msg += `Client: ${r.clientName}\n`;
    msg += `Service: ${r.serviceDescription}\n`;
    msg += `Date: ${formatReceiptDate(r.paymentDate)}\n`;
    msg += `---\n`;
    msg += `Total Fee: ${formatCurrency(r.totalFee)}\n`;
    msg += `Payment: ${formatCurrency(r.paymentAmount)}\n`;
    msg += `Method: ${PAYMENT_METHOD_LABELS[r.paymentMethod]}\n`;
    if (r.balanceRemaining > 0) {
      msg += `Balance Due: ${formatCurrency(r.balanceRemaining)}\n`;
    } else {
      msg += `Status: PAID IN FULL\n`;
    }
    msg += `---\n`;
    msg += `${props.settings.receiptThankYouMessage}\n`;
    msg += `${props.settings.receiptThankYouMessageEs}\n`;
    return msg;
  };

  // Print-specific styles (embedded in component)
  const printStyles = `
    @media print {
      body * { visibility: hidden !important; }
      .receipt-printable, .receipt-printable * { visibility: visible !important; }
      .receipt-printable {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        max-width: 400px !important;
        margin: 0 auto !important;
        padding: 20px !important;
        border: none !important;
        box-shadow: none !important;
      }
      .no-print { display: none !important; }
    }
  `;

  // Styles
  const containerStyle = {
    background: 'var(--surface-color, #fff)',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    overflow: 'hidden',
    'max-width': '480px',
    margin: '0 auto',
  };

  const receiptStyle = {
    padding: '2rem',
    'font-family': "'Courier New', Courier, monospace",
    'font-size': '0.875rem',
    color: '#1f2937',
    background: '#fff',
  };

  const businessHeaderStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '1.5rem',
    'padding-bottom': '1rem',
    'border-bottom': '2px dashed #d1d5db',
  };

  const businessNameStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: '#1a73e8',
    'margin-bottom': '0.5rem',
    'font-family': 'Arial, sans-serif',
  };

  const businessInfoStyle = {
    'font-size': '0.8rem',
    color: '#6b7280',
    'line-height': '1.5',
  };

  const receiptTitleStyle = {
    'text-align': 'center' as const,
    'font-size': '1.125rem',
    'font-weight': '700',
    'margin-bottom': '1rem',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.1em',
  };

  const receiptNumberStyle = {
    'text-align': 'center' as const,
    'font-size': '0.8rem',
    color: '#6b7280',
    'margin-bottom': '1rem',
  };

  const sectionStyle = {
    'margin-bottom': '1rem',
    'padding-bottom': '1rem',
    'border-bottom': '1px dashed #d1d5db',
  };

  const rowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'flex-start',
    padding: '0.25rem 0',
  };

  const labelStyle = {
    color: '#6b7280',
    'font-size': '0.8rem',
  };

  const valueStyle = {
    'font-weight': '600',
    'text-align': 'right' as const,
  };

  const feeTableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
    'margin-bottom': '0.5rem',
  };

  const feeTdStyle = {
    padding: '0.25rem 0',
    'font-size': '0.8rem',
  };

  const feeTdRightStyle = {
    ...feeTdStyle,
    'text-align': 'right' as const,
    'font-weight': '500',
  };

  const totalSectionStyle = {
    'margin': '1rem 0',
    'padding': '0.75rem',
    background: '#f0fdf4',
    'border-radius': '4px',
    'border': '1px solid #86efac',
  };

  const totalRowStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'font-size': '1.25rem',
    'font-weight': '700',
  };

  const thankYouStyle = {
    'text-align': 'center' as const,
    'margin-top': '1.5rem',
    'padding-top': '1rem',
    'border-top': '2px dashed #d1d5db',
  };

  const thankYouTextStyle = {
    'font-size': '0.9rem',
    'font-weight': '600',
    color: '#1a73e8',
    'margin-bottom': '0.25rem',
    'font-family': 'Arial, sans-serif',
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    'border-top': '1px solid var(--border-color, #e5e7eb)',
    background: 'var(--background-color, #f9fafb)',
    'flex-wrap': 'wrap' as const,
    'justify-content': 'center',
  };

  const balanceDueStyle = {
    'margin-top': '0.75rem',
    padding: '0.75rem',
    background: '#fef3c7',
    'border-radius': '4px',
    'text-align': 'center' as const,
  };

  const paidInFullStyle = {
    'margin-top': '0.75rem',
    padding: '0.75rem',
    background: '#f0fdf4',
    'border-radius': '4px',
    'text-align': 'center' as const,
    'font-weight': '700',
    color: '#22c55e',
    'font-size': '1rem',
  };

  return (
    <div style={containerStyle}>
      {/* Inject print styles */}
      <style>{printStyles}</style>

      {/* Receipt Content (printable area) */}
      <div class="receipt-printable" style={receiptStyle}>
        <Show when={receipt()} fallback={
          <div style={{ 'text-align': 'center', padding: '2rem', color: '#6b7280' }}>
            Unable to generate receipt. Settings may not be loaded.
          </div>
        }>
          {/* Business Header */}
          <div style={businessHeaderStyle}>
            <div style={businessNameStyle}>{props.settings.businessName}</div>
            <div style={businessInfoStyle}>
              <Show when={props.settings.businessAddress}>
                <div>{props.settings.businessAddress}</div>
              </Show>
              <Show when={props.settings.businessCity}>
                <div>
                  {props.settings.businessCity}
                  {props.settings.businessState ? `, ${props.settings.businessState}` : ''}
                  {props.settings.businessZip ? ` ${props.settings.businessZip}` : ''}
                </div>
              </Show>
              <Show when={props.settings.businessPhone}>
                <div>Tel: {props.settings.businessPhone}</div>
              </Show>
              <Show when={props.settings.businessEin}>
                <div>EIN: {props.settings.businessEin}</div>
              </Show>
            </div>
          </div>

          {/* Receipt Title */}
          <div style={receiptTitleStyle}>RECEIPT / RECIBO</div>
          <div style={receiptNumberStyle}>#{receipt()!.receiptNumber}</div>

          {/* Client Info */}
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <span style={labelStyle}>Client / Cliente:</span>
              <span style={valueStyle}>{receipt()!.clientName}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Date / Fecha:</span>
              <span style={valueStyle}>{formatReceiptDate(receipt()!.paymentDate)}</span>
            </div>
          </div>

          {/* Service Description */}
          <div style={sectionStyle}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              {receipt()!.serviceDescription}
            </div>
            <div style={{ 'font-size': '0.8rem', color: '#6b7280', 'font-style': 'italic' }}>
              {receipt()!.serviceDescriptionEs}
            </div>
          </div>

          {/* Fee Breakdown */}
          <Show when={receipt()!.feeBreakdown.length > 0}>
            <div style={sectionStyle}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.85rem' }}>
                Fee Breakdown / Desglose de Tarifas
              </div>
              <table style={feeTableStyle}>
                <tbody>
                  <For each={receipt()!.feeBreakdown}>
                    {(item) => (
                      <tr>
                        <td style={feeTdStyle}>
                          {item.description}
                          {item.quantity > 1 ? ` x${item.quantity}` : ''}
                        </td>
                        <td style={feeTdRightStyle}>
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>

              {/* Subtotal */}
              <div style={{ ...rowStyle, 'border-top': '1px solid #e5e7eb', 'padding-top': '0.5rem' }}>
                <span style={{ 'font-size': '0.85rem' }}>Subtotal</span>
                <span style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>{formatCurrency(receipt()!.subtotal)}</span>
              </div>

              {/* Discount */}
              <Show when={receipt()!.discount > 0}>
                <div style={{ ...rowStyle, color: '#22c55e' }}>
                  <span style={{ 'font-size': '0.85rem' }}>Discount / Descuento</span>
                  <span style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>-{formatCurrency(receipt()!.discount)}</span>
                </div>
              </Show>
            </div>
          </Show>

          {/* Total Fee */}
          <div style={totalSectionStyle}>
            <div style={totalRowStyle}>
              <span>Total / Total</span>
              <span>{formatCurrency(receipt()!.totalFee)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div style={sectionStyle}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.85rem' }}>
              Payment / Pago
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Method / Metodo:</span>
              <span style={valueStyle}>
                {PAYMENT_METHOD_LABELS[receipt()!.paymentMethod]} / {PAYMENT_METHOD_LABELS_ES[receipt()!.paymentMethod]}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Amount / Monto:</span>
              <span style={{ ...valueStyle, color: '#22c55e', 'font-size': '1rem' }}>
                {formatCurrency(receipt()!.paymentAmount)}
              </span>
            </div>
            <Show when={receipt()!.checkNumber}>
              <div style={rowStyle}>
                <span style={labelStyle}>Check # / Cheque #:</span>
                <span style={valueStyle}>{receipt()!.checkNumber}</span>
              </div>
            </Show>
            <Show when={receipt()!.cardReference}>
              <div style={rowStyle}>
                <span style={labelStyle}>Reference / Ref:</span>
                <span style={valueStyle}>{receipt()!.cardReference}</span>
              </div>
            </Show>
            <Show when={receipt()!.previousPayments > 0}>
              <div style={rowStyle}>
                <span style={labelStyle}>Previous Payments / Pagos Anteriores:</span>
                <span style={valueStyle}>{formatCurrency(receipt()!.previousPayments)}</span>
              </div>
            </Show>
          </div>

          {/* Balance or Paid in Full */}
          <Show when={receipt()!.balanceRemaining > 0}>
            <div style={balanceDueStyle}>
              <div style={{ 'font-size': '0.85rem', color: '#92400e', 'margin-bottom': '0.25rem' }}>
                Balance Remaining / Saldo Pendiente
              </div>
              <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#ef4444' }}>
                {formatCurrency(receipt()!.balanceRemaining)}
              </div>
            </div>
          </Show>
          <Show when={receipt()!.balanceRemaining <= 0}>
            <div style={paidInFullStyle}>
              PAID IN FULL / PAGADO EN SU TOTALIDAD
            </div>
          </Show>

          {/* Thank You Message */}
          <div style={thankYouStyle}>
            <div style={thankYouTextStyle}>{props.settings.receiptThankYouMessage}</div>
            <div style={{ ...thankYouTextStyle, color: '#6b7280', 'font-weight': '400' }}>
              {props.settings.receiptThankYouMessageEs}
            </div>
            <Show when={props.settings.receiptFooterNote}>
              <div style={{ 'margin-top': '0.75rem', 'font-size': '0.75rem', color: '#9ca3af' }}>
                {props.settings.receiptFooterNote}
              </div>
            </Show>
            <Show when={props.settings.receiptFooterNoteEs}>
              <div style={{ 'font-size': '0.75rem', color: '#9ca3af' }}>
                {props.settings.receiptFooterNoteEs}
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Actions (hidden on print) */}
      <div class="no-print" style={actionsStyle}>
        <Button onClick={handlePrint}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </Button>

        <Show when={props.client.phone}>
          <Button variant="secondary" onClick={handleWhatsApp} disabled={isSending()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ 'margin-right': '0.5rem' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.35 0-4.534-.682-6.385-1.853l-.447-.274-2.927.981.981-2.927-.274-.447A9.957 9.957 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
            </svg>
            WhatsApp
          </Button>
        </Show>

        <Button variant="secondary" onClick={handleDownloadPdf}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '0.5rem' }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </Button>

        <Show when={props.onClose}>
          <Button variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        </Show>
      </div>
    </div>
  );
};

export default ReceiptGenerator;
