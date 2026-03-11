/**
 * ClientQRCodeGenerator
 * Simple QR code display with tabs - uses local QR library
 */

import { Component, createSignal, For, Show, createEffect, on } from 'solid-js';
import QRCode from 'qrcode';
import type { TaxPortal } from '../types/drakeTypes';
import { devLog, formatDateMMDDYYYY } from '../../../services/utils';

interface ClientQRCodeGeneratorProps {
  client: TaxPortal;
  isOpen: boolean;
  onClose: () => void;
}


const ClientQRCodeGenerator: Component<ClientQRCodeGeneratorProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal(0);
  const [qrImages, setQrImages] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);

  // Tab definitions - use | as separator, will be converted to tab char
  const getTabs = () => {
    const c = props.client;
    return [
      {
        label: 'Basic',
        text: [
          c.firstName, '|',
          c.middleName || "", '|',
          c.lastName, '|', '|',
           "123","43","4345", '|',
           '|',
          formatDateMMDDYYYY(c.dateOfBirth) || "", '|',
          "Laborer",'|',
          '|',
          "502",
          "356",
          "3456",
          '|', '|',
          
          '|', 
          '|', '|','|', 
          '|', '|','|', 
          c.address, '|', 
          '|', 
          '|', 
          c.zipCode,
          '|', '|','|',
          '|','|',
          //c.phone
        ].join('')
      },
      {
        label: 'CHILD',
        text: [
          c.firstName, '|',
          c.middleName || "", '|',
          c.lastName, '|', 
          '|',
          "123","43","4345", '|',
          '|', 
          '|', 
          '|', 
          'son','|', 
          '12','|', 
          formatDateMMDDYYYY(c.dateOfBirth) || "", '|',
          '|', 
          '|',
        ].filter(Boolean).join('')
      },
      {
        label: 'EIN',
        text: [
          "33", 
          "2334457", '|', 
          "emplorhsg",'|', 
          "address",'|', 
          '|', 
          "40215",'|', 
          '|', 
          '|', 
          '|', 
          '|', 
          "", '|',  //Box1 
          "", '|',  // Box1 Verify
          "", '|',  //Box2 
          "", '|',  // Box2 Verify
        ].filter(Boolean).join('')
      },
      {
        label: 'vCard',
        text: `BEGIN:VCARD\nVERSION:3.0\nFN:${c.firstName || ''} ${c.lastName || ''}\nTEL:${c.phone || ''}\nEMAIL:${c.email || ''}\nEND:VCARD`
      }
    ];
  };

  // Convert | to tab character for QR encoding
  const convertToTabular = (text: string): string => {
    return text.replace(/\|/g, '\t').toUpperCase();
  };

  // Generate all QR codes
  const generateQRCodes = async () => {
    setLoading(true);
    const tabs = getTabs();
    const images: string[] = [];

    for (const tab of tabs) {
      if (tab.text) {
        try {
          // Convert | to tab character for tabular data (except vCard)
          const qrText = tab.label === 'vCard' ? tab.text : convertToTabular( tab.text);

          devLog({qrText})
          const dataUrl = await QRCode.toDataURL(qrText, {
            width: 300,
            margin: 3,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
          });
          images.push(dataUrl);
        } catch (err) {
          devLog('QR generation error:', err);
          images.push('');
        }
      } else {
        images.push('');
      }
    }

    setQrImages(images);
    setLoading(false);
  };

  // Generate QR codes when modal opens
  createEffect(on(() => props.isOpen, (isOpen) => {
    if (isOpen) {
      setQrImages([]);
      generateQRCodes();
    }
  }));

  const tabs = () => getTabs();
  const currentText = () => tabs()[activeTab()]?.text || '';
  const currentQR = () => qrImages()[activeTab()] || '';

  // Download QR
  const downloadQR = () => {
    const url = currentQR();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.client.firstName}_${props.client.lastName}_QR.png`;
    link.click();
  };

  return (
    <Show when={props.isOpen}>
      <div
        style={{
          position: 'fixed',
          inset: '0',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': '9999',
        }}
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div style={{
          background: 'white',
          'border-radius': '12px',
          width: '380px',
          'max-width': '95vw',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: '#1e3a5f',
            color: 'white',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}>
            <span style={{ 'font-weight': '600' }}>
              QR - {props.client.firstName} {props.client.lastName}
            </span>
            <button
              onClick={props.onClose}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', 'font-size': '1.5rem' }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', 'border-bottom': '1px solid #e5e7eb' }}>
            <For each={tabs()}>
              {(tab, i) => (
                <button
                  style={{
                    flex: '1',
                    padding: '0.6rem',
                    border: 'none',
                    background: activeTab() === i() ? '#3b82f6' : '#f8fafc',
                    color: activeTab() === i() ? 'white' : '#64748b',
                    'font-weight': '500',
                    'font-size': '0.875rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab(i())}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          {/* Content */}
          <div style={{ padding: '1.25rem', 'text-align': 'center' }}>
            {/* QR Code */}
            <div style={{
              width: '256px',
              height: '256px',
              margin: '0 auto',
              background: '#f5f5f5',
              'border-radius': '8px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
            }}>
              <Show when={!loading() && currentQR()} fallback={
                <span style={{ color: '#999' }}>{loading() ? 'Generating...' : 'No data'}</span>
              }>
                <img src={currentQR()} alt="QR" style={{ width: '256px', height: '256px', 'border-radius': '8px' }} />
              </Show>
            </div>

            {/* Text */}
            <pre style={{
              'margin-top': '1rem',
              padding: '0.5rem',
              background: '#f8fafc',
              'border-radius': '6px',
              'font-size': '0.7rem',
              'text-align': 'left',
              'max-height': '70px',
              overflow: 'auto',
              'white-space': 'pre-wrap',
              'word-break': 'break-all',
            }}>
              {currentText()}
            </pre>

            {/* Buttons */}
            <div style={{ 'margin-top': '1rem', display: 'flex', gap: '0.5rem', 'justify-content': 'center' }}>
              <button
                onClick={downloadQR}
                disabled={!currentQR()}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: currentQR() ? '#3b82f6' : '#ccc',
                  color: 'white',
                  border: 'none',
                  'border-radius': '6px',
                  cursor: currentQR() ? 'pointer' : 'not-allowed',
                }}
              >
                Download
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(currentText())}
                style={{ padding: '0.5rem 1.25rem', background: '#f1f5f9', border: '1px solid #ddd', 'border-radius': '6px', cursor: 'pointer' }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ClientQRCodeGenerator;





