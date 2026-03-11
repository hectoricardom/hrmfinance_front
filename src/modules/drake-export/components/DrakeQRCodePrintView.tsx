/**
 * DrakeQRCodePrintView
 * Printable view with all QR codes organized in sections for Drake Tax export
 */

import { Component, createSignal, For, Show, createEffect, on } from 'solid-js';
import QRCode from 'qrcode';
import type { TaxPortal, DrakeTaxDocument, TaxDependent, DRAKE_FORM_LABELS } from '../types/drakeTypes';
import { formatDateMMDDYYYY, ssnForQR, devLog } from '../../../services/utils';

interface DrakeQRCodePrintViewProps {
  client: TaxPortal;
  documents: DrakeTaxDocument[];
  dependents: TaxDependent[];
  isOpen: boolean;
  onClose: () => void;
}

interface QRCodeItem {
  label: string;
  sublabel?: string;
  dataUrl: string;
  section: 'taxpayer' | 'dependent' | 'document';
}

const DrakeQRCodePrintView: Component<DrakeQRCodePrintViewProps> = (props) => {
  const [qrCodes, setQrCodes] = createSignal<QRCodeItem[]>([]);
  const [loading, setLoading] = createSignal(false);

  // Convert | to tab character for QR encoding
  const convertToTabular = (text: string): string => {
    return text.replace(/\|/g, '\t').toUpperCase();
  };

  // Generate taxpayer info QR text (Basic tab format from ClientQRCodeGenerator)
  const getTaxpayerQRText = (): string => {
    const c = props.client;
    const text = [
      c.firstName, '|',
      c.middleName || "", '|',
      c.lastName, '|', '|',
      ssnForQR(c.ssn || ""), '|',
      '|',
      formatDateMMDDYYYY(c.dateOfBirth) || "", '|',
      c.occupation || "", '|',
      '|',
      c.phone ? c.phone : "", '|', '|',
      '|',
      '|', '|', '|',
      '|', '|', '|',
      c.address || "", '|',
      c.city || "", '|',
      c.state || "", '|',
      c.zipCode || "",
      '|', '|', '|',
      '|', '|',
    ].join('');
    return convertToTabular(text);
  };
  


  const getInitTaxpayerQRText = (): string => {
    const c = props.client;
    const text = [
    ssnForQR(c.ssn || ""), '|',
    ssnForQR(c.ssn || ""), '|',
    c.firstName, '|',
    c.lastName, '|', '|',
     
    ].join('');
    return convertToTabular(text);
  };

  const getFullNameTaxpayerQRText = (): string => {
    const c = props.client;
    const text = [
    (c.firstName +( props.client.middleName ? " "+props.client.middleName +" ":' ')+ props.client.lastName) || ''
    , '|',
    ].join('');
    return convertToTabular(text);
  };

  const getTaxpayerPQRText = (): string => {
    const c = props.client;
    const text = [
      c.firstName, '|',
      c.middleName || "", '|',
      c.lastName, '|', '|',
      ssnForQR(c.ssn || ""), '|',
      '|',
      formatDateMMDDYYYY(c.dateOfBirth) || "", '|',
      c.occupation || "", '|',
      '|',
      c.phone ? c.phone : "", '|', '|',
      '|',
     
    ].join('');
    return convertToTabular(text);
  };

  const getSpouseTaxpayerQRText = (): string => {
    const c = props.client;
    const text = [
        c.spouse?.firstName, '|',
        c.spouse?.middleName || "", '|',
        c.spouse?.lastName, '|', '|',
        ssnForQR(c?.spouse?.ssn), '|',
        '|',
        formatDateMMDDYYYY(c.spouse?.dateOfBirth) || "", '|',
        c.spouse?.occupation || "",'|',
        '|',
        c.spouse?.phone, '|', 
      ].join('')
    return convertToTabular(text);
  };

  const getTaxpayerAddressQRText = (): string => {
    const c = props.client;
    const text = [
      c.address || "", '|',
      '|',
      '|',
      c.zipCode || "",
    ].join('');
    return convertToTabular(text);
  };
  

  // Generate dependent QR text (CHILD tab format from ClientQRCodeGenerator)
  const getDependentQRText = (dependent: TaxDependent): string => {
    const text = [
      dependent.firstName, '|',
      dependent.middleName || "", '|',
      dependent.lastName, '|',
      '|',
      ssnForQR(dependent.ssn || ""), '|',
      '|',
      '|',
      '|',
      dependent.relationship || "", '|',
      dependent.monthsLivedWithYou?.toString() || "12", '|',
      formatDateMMDDYYYY(dependent.dateOfBirth) || "", '|',
      '|',
      '|',
    ].filter(Boolean).join('');
    return convertToTabular(text);
  };

  // Generate document QR text based on document type
  const getDocumentQRText = (doc: DrakeTaxDocument): string => {
    const payer = doc.payerInfo;
    const amounts = doc.extractedAmounts;

    switch (doc.drakeFormType) {
      case 'w2': {
        // W-2 format: EIN | Employer Name | Address | City/State | Zip | Box 1 | Box 2 | etc.
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|', '|', '|', '|',
          amounts?.wages?.toString() || "", '|',
          amounts?.wages?.toString() || "", '|', // verify
          amounts?.federalTaxWithheld?.toString() || "", '|',
          amounts?.federalTaxWithheld?.toString() || "", '|', // verify
        ].join('');
        return convertToTabular(text);
      }

      case '1099_nec': {
        // 1099-NEC format
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.nonEmployeeCompensation?.toString() || "", '|',
          amounts?.nonEmployeeCompensation?.toString() || "", '|', // verify
          amounts?.federalTaxWithheld1099?.toString() || "", '|',
        ].join('');
        return convertToTabular(text);
      }

      case '1099_misc': {
        // 1099-MISC format
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.rents?.toString() || "", '|',
          amounts?.royalties?.toString() || "", '|',
          amounts?.otherIncome?.toString() || "", '|',
          amounts?.federalTaxWithheld1099?.toString() || "", '|',
        ].join('');
        return convertToTabular(text);
      }

      case '1099_int': {
        // 1099-INT format
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.interestIncome?.toString() || "", '|',
          amounts?.interestIncome?.toString() || "", '|', // verify
        ].join('');
        return convertToTabular(text);
      }

      case '1099_div': {
        // 1099-DIV format
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.ordinaryDividends?.toString() || "", '|',
          amounts?.qualifiedDividends?.toString() || "", '|',
          amounts?.capitalGainDistributions?.toString() || "", '|',
        ].join('');
        return convertToTabular(text);
      }

      case '1098': {
        // 1098 Mortgage Interest format
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.mortgageInterest?.toString() || "", '|',
          amounts?.outstandingPrincipal?.toString() || "", '|',
          amounts?.pointsPaid?.toString() || "", '|',
        ].join('');
        return convertToTabular(text);
      }

      case '1098_t': {
        // 1098-T Tuition format
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.paymentsReceived?.toString() || "", '|',
          amounts?.scholarshipsGrants?.toString() || "", '|',
        ].join('');
        return convertToTabular(text);
      }

      default: {
        // Generic format for other documents
        const text = [
          payer?.ein?.replace(/\D/g, '') || "", '|',
          payer?.name || "", '|',
          payer?.address || "", '|',
          (payer?.city || "") + " " + (payer?.state || ""), '|',
          payer?.zip || "", '|',
          '|',
          amounts?.totalAmount?.toString() || "", '|',
        ].join('');
        return convertToTabular(text);
      }
    }
  };

  // Get document label based on type and payer info
  const getDocumentLabel = (doc: DrakeTaxDocument): string => {
    const typeLabels: Record<string, string> = {
      'w2': 'W-2',
      '1099_nec': '1099-NEC',
      '1099_misc': '1099-MISC',
      '1099_int': '1099-INT',
      '1099_div': '1099-DIV',
      '1098': '1098',
      '1098_t': '1098-T',
      'schedule_k1': 'Schedule K-1',
      'receipt': 'Receipt',
      'other': 'Document',
    };
    return typeLabels[doc.drakeFormType || 'other'] || 'Document';
  };

  // Generate all QR codes
  const generateAllQRCodes = async () => {
    setLoading(true);
    const codes: QRCodeItem[] = [];

    try {
      // Section 1: Taxpayer Info QR
      /**
      const taxpayerText = getTaxpayerQRText();
      const taxpayerDataUrl = await QRCode.toDataURL(taxpayerText, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      codes.push({
        label: 'Taxpayer Info Page',
        sublabel: `${props.client.firstName} ${props.client.lastName}`,
        dataUrl: taxpayerDataUrl,
        section: 'taxpayer'
      });
      */

      const inittaxpayerText = getInitTaxpayerQRText();
      const inittaxpayerPDataUrl = await QRCode.toDataURL(inittaxpayerText, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      codes.push({
        label: 'Taxpayer Init',
        sublabel: `SS, ${props.client.firstName},  ${props.client.lastName}`,
        dataUrl:inittaxpayerPDataUrl,
        section: 'taxpayer'
      });


      const fullNameText = getFullNameTaxpayerQRText();
      const fullNamePDataUrl = await QRCode.toDataURL(fullNameText, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      codes.push({
        label: 'Taxpayer Full Name',
        sublabel: `${props.client.firstName} ${props.client.lastName}`,
        dataUrl: fullNamePDataUrl,
        section: 'taxpayer'
      });

      const taxpayerPText = getTaxpayerPQRText();
      const taxpayerPDataUrl = await QRCode.toDataURL(taxpayerPText, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      codes.push({
        label: 'Taxpayer Info session',
        sublabel: `${props.client.firstName} ${props.client.lastName}`,
        dataUrl: taxpayerPDataUrl,
        section: 'taxpayer'
      });

        if(props.client.filingStatus==="married_filing_jointly"){
      const taxpayerSpouseText = getSpouseTaxpayerQRText();
      const taxpayerSpouseDataUrl = await QRCode.toDataURL(taxpayerSpouseText, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      codes.push({
        label: 'Spouse session',
        sublabel: `${props.client?.spouse?.firstName} ${props.client.spouse?.lastName}`,
        dataUrl: taxpayerSpouseDataUrl,
        section: 'taxpayer'
      });
    }

      const taxpayerAText = getTaxpayerAddressQRText();
      const taxpayerAddressDataUrl = await QRCode.toDataURL(taxpayerAText, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      codes.push({
        label: 'Taxpayer Address session',
        sublabel: `${props.client.address}, ${props.client.zipCode}`,
        dataUrl: taxpayerAddressDataUrl,
        section: 'taxpayer'
      });
      

      // Section 2: Dependents QRs
      for (const dependent of props.dependents) {
        const dependentText = getDependentQRText(dependent);
        const dependentDataUrl = await QRCode.toDataURL(dependentText, {
          width: 140,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' }
        });
        codes.push({
          label: 'Dependent',
          sublabel: `${dependent.firstName} ${dependent.lastName}`,
          dataUrl: dependentDataUrl,
          section: 'dependent'
        });
      }

      // Section 3: Document QRs
      for (const doc of props.documents) {
        const docText = getDocumentQRText(doc);
        const docDataUrl = await QRCode.toDataURL(docText, {
          width: 140,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' }
        });
        codes.push({
          label: getDocumentLabel(doc),
          sublabel: doc.payerInfo?.name || doc.originalFileName,
          dataUrl: docDataUrl,
          section: 'document'
        });
      }

      setQrCodes(codes);
    } catch (err) {
      devLog('QR generation error:', err);
    }

    setLoading(false);
  };

  // Generate QR codes when modal opens
  createEffect(on(() => props.isOpen, (isOpen) => {
    if (isOpen) {
      setQrCodes([]);
      generateAllQRCodes();
    }
  }));

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Get QR codes by section
  const taxpayerQRs = () => qrCodes().filter(q => q.section === 'taxpayer');
  const dependentQRs = () => qrCodes().filter(q => q.section === 'dependent');
  const documentQRs = () => qrCodes().filter(q => q.section === 'document');

  return (
    <Show when={props.isOpen}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .drake-print-view,
          .drake-print-view * {
            visibility: visible !important;
          }
          .drake-print-view {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          .modal-overlay {
            display: none !important;
          }
          .qr-section {
            page-break-inside: avoid;
          }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
          .qr-item {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Modal overlay - only visible on screen */}
      <div
        class="no-print modal-overlay"
        style={{
          position: 'fixed',
          inset: '0',
          background: 'rgba(0,0,0,0.5)',
          'z-index': '9998',
        }}
        onClick={props.onClose}
      />

      {/* Content container - visible on both screen and print */}
      <div
        class="drake-print-view"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          'border-radius': '12px',
          width: '90vw',
          'max-width': '90vw',
          'max-height': '90vh',
          overflow: 'auto',
          'z-index': '9999',
        }}
      >
          {/* Header */}
          <div
            class="no-print"
            style={{
              padding: '1rem 1.5rem',
              background: '#1e3a5f',
              color: 'white',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              position: 'sticky',
              top: '0',
              'z-index': '10',
            }}
          >
            <span style={{ 'font-weight': '600', 'font-size': '1.125rem' }}>
              QR Codes - {props.client.firstName} {props.client.lastName}
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handlePrint}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  'border-radius': '6px',
                  cursor: 'pointer',
                  'font-weight': '500',
                }}
              >
                Print
              </button>
              <button
                onClick={props.onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  'font-size': '1.5rem',
                  'line-height': '1',
                }}
              >
                x
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem' }}>
            <Show when={loading()}>
              <div style={{ 'text-align': 'center', padding: '3rem', color: '#666' }}>
                Generating QR codes...
              </div>
            </Show>

            <Show when={!loading()}>
              {/* Print Header */}
              <div style={{ 'text-align': 'center', 'margin-bottom': '1.5rem' }}>
                <h1 style={{ margin: '0', 'font-size': '1.5rem', color: '#1e3a5f' }}>
                  Drake Tax QR Codes
                </h1>
                <p style={{ margin: '0.5rem 0 0', color: '#666' }}>
                  {props.client.firstName} {props.client.lastName} - Tax Year {props.client.taxYear || new Date().getFullYear()}
                </p>
              </div>

              {/* Section 1: Taxpayer Info */}
              <Show when={taxpayerQRs().length > 0}>
                <div class="qr-section" style={{ 'margin-bottom': '2rem' }}>
                  <h2 style={{
                    'font-size': '1rem',
                    'font-weight': '600',
                    color: '#374151',
                    'border-bottom': '2px solid #e5e7eb',
                    'padding-bottom': '0.5rem',
                    'margin-bottom': '1rem',
                  }}>
                    Section 1: Taxpayer Information
                  </h2>
                  <div class="qr-grid" style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '1.5rem',
                  }}>
                    <For each={taxpayerQRs()}>
                      {(qr) => (
                        <div class="qr-item" style={{
                          'text-align': 'center',
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          'border-radius': '8px',
                          background: '#fafafa',
                        }}>
                          <img
                            src={qr.dataUrl}
                            alt={qr.label}
                            style={{ width: '140px', height: '140px' }}
                          />
                          <div style={{
                            'margin-top': '0.75rem',
                            'font-weight': '600',
                            'font-size': '0.875rem',
                            color: '#1e3a5f',
                          }}>
                            {qr.label}
                          </div>
                          <Show when={qr.sublabel}>
                            <div style={{
                              'font-size': '0.75rem',
                              color: '#6b7280',
                              'margin-top': '0.25rem',
                            }}>
                              {qr.sublabel}
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Section 2: Dependents */}
              <Show when={dependentQRs().length > 0}>
                <div class="qr-section" style={{ 'margin-bottom': '2rem' }}>
                  <h2 style={{
                    'font-size': '1rem',
                    'font-weight': '600',
                    color: '#374151',
                    'border-bottom': '2px solid #e5e7eb',
                    'padding-bottom': '0.5rem',
                    'margin-bottom': '1rem',
                  }}>
                    Section 2: Dependents ({dependentQRs().length})
                  </h2>
                  <div class="qr-grid" style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '1.5rem',
                  }}>
                    <For each={dependentQRs()}>
                      {(qr) => (
                        <div class="qr-item" style={{
                          'text-align': 'center',
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          'border-radius': '8px',
                          background: '#fafafa',
                        }}>
                          <img
                            src={qr.dataUrl}
                            alt={qr.label}
                            style={{ width: '140px', height: '140px' }}
                          />
                          <div style={{
                            'margin-top': '0.75rem',
                            'font-weight': '600',
                            'font-size': '0.875rem',
                            color: '#1e3a5f',
                          }}>
                            {qr.label}
                          </div>
                          <Show when={qr.sublabel}>
                            <div style={{
                              'font-size': '0.75rem',
                              color: '#6b7280',
                              'margin-top': '0.25rem',
                            }}>
                              {qr.sublabel}
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Section 3: Documents */}
              <Show when={documentQRs().length > 0}>
                <div class="qr-section" style={{ 'margin-bottom': '2rem' }}>
                  <h2 style={{
                    'font-size': '1rem',
                    'font-weight': '600',
                    color: '#374151',
                    'border-bottom': '2px solid #e5e7eb',
                    'padding-bottom': '0.5rem',
                    'margin-bottom': '1rem',
                  }}>
                    Section 3: Tax Documents ({documentQRs().length})
                  </h2>
                  <div class="qr-grid" style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '1.5rem',
                  }}>
                    <For each={documentQRs()}>
                      {(qr) => (
                        <div class="qr-item" style={{
                          'text-align': 'center',
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          'border-radius': '8px',
                          background: '#fafafa',
                        }}>
                          <img
                            src={qr.dataUrl}
                            alt={qr.label}
                            style={{ width: '140px', height: '140px' }}
                          />
                          <div style={{
                            'margin-top': '0.75rem',
                            'font-weight': '600',
                            'font-size': '0.875rem',
                            color: '#1e3a5f',
                          }}>
                            {qr.label}
                          </div>
                          <Show when={qr.sublabel}>
                            <div style={{
                              'font-size': '0.75rem',
                              color: '#6b7280',
                              'margin-top': '0.25rem',
                              'max-width': '180px',
                              overflow: 'hidden',
                              'text-overflow': 'ellipsis',
                              'white-space': 'nowrap',
                              margin: '0.25rem auto 0',
                            }}>
                              {qr.sublabel}
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Empty state */}
              <Show when={qrCodes().length === 0 && !loading()}>
                <div style={{
                  'text-align': 'center',
                  padding: '3rem',
                  color: '#666',
                }}>
                  No QR codes to display. Add taxpayer info, dependents, or documents first.
                </div>
              </Show>

              {/* Summary */}
              <Show when={qrCodes().length > 0}>
                <div style={{
                  'margin-top': '2rem',
                  padding: '1rem',
                  background: '#f8fafc',
                  'border-radius': '8px',
                  'font-size': '0.875rem',
                  color: '#64748b',
                }}>
                  <strong>Summary:</strong> {taxpayerQRs().length} taxpayer, {dependentQRs().length} dependent(s), {documentQRs().length} document(s)
                </div>
              </Show>
            </Show>
          </div>
        </div>
    </Show>
  );
};

export default DrakeQRCodePrintView;
