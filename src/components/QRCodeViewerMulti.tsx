/**
 * MultiQRCodeViewer - Reusable component for displaying multiple QR codes
 * Can be called from anywhere with qrText array prop
 */

import { Component, createSignal, createEffect, on, Show, For } from 'solid-js';
import QRCode from 'qrcode';

interface QRCodeViewerProps {
  qrText: string[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  convertPipeToTab?: boolean; // Convert | to tab character
  toUpperCase?: boolean;
}

interface QRCodeItem {
  text: string;
  processedText: string;
  image: string;
}

const MultiQRCodeViewer: Component<QRCodeViewerProps> = (props) => {
  const [qrCodes, setQrCodes] = createSignal<QRCodeItem[]>([]);
  const [loading, setLoading] = createSignal(false);

  // Process text based on options
  const processText = (text: string): string => {
    let result = text;
    if (props.convertPipeToTab) {
      result = result.replace(/\|/g, '\t');
    }
    if (props.toUpperCase) {
      result = result.toUpperCase();
    }
    return result;
  };

  // Generate QR codes for all texts
  const generateQRCodes = async () => {
    if (!props.qrText || props.qrText.length === 0) {
      setQrCodes([]);
      return;
    }

    setLoading(true);
    try {
      const codes: QRCodeItem[] = [];

      for (const text of props.qrText) {
        const processedText = processText(text);
        const dataUrl = await QRCode.toDataURL(processedText, {
          width: 300,
          margin: 3,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' }
        });
        codes.push({
          text,
          processedText,
          image: dataUrl
        });
      }

      setQrCodes(codes);
    } catch (err) {
      console.error('QR generation error:', err);
      setQrCodes([]);
    }
    setLoading(false);
  };

  // Generate QR codes when modal opens or texts change
  createEffect(on(() => [props.isOpen, props.qrText], ([isOpen]) => {
    if (isOpen) {
      generateQRCodes();
    }
  }));

  // Download a single QR
  const downloadQR = (item: QRCodeItem, index: number) => {
    if (!item.image) return;
    const link = document.createElement('a');
    link.href = item.image;
    link.download = `QR_${index + 1}_${Date.now()}.png`;
    link.click();
  };

  // Download all QRs
  const downloadAllQRs = () => {
    qrCodes().forEach((item, index) => {
      setTimeout(() => downloadQR(item, index), index * 200);
    });
  };

  // Copy text to clipboard
  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
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
          width: qrCodes().length > 1 ? '90vw' : '380px',
          'max-width': '1200px',
          'max-height': '90vh',
          overflow: 'hidden',
          display: 'flex',
          'flex-direction': 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: '#1e3a5f',
            color: 'white',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'flex-shrink': '0',
          }}>
            <span style={{ 'font-weight': '600' }}>
              {props.title || 'QR Codes'} {qrCodes().length > 1 && `(${qrCodes().length})`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
              <Show when={qrCodes().length > 1}>
                <button
                  onClick={downloadAllQRs}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    'border-radius': '4px',
                    cursor: 'pointer',
                    'font-size': '0.875rem',
                  }}
                >
                  Download All
                </button>
              </Show>
              <button
                onClick={props.onClose}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', 'font-size': '1.5rem' }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '1.25rem',
            'overflow-y': 'auto',
            flex: '1',
          }}>
            <Show when={loading()}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: '#666' }}>
                Generating QR codes...
              </div>
            </Show>

            <Show when={!loading() && qrCodes().length === 0}>
              <div style={{ 'text-align': 'center', padding: '2rem', color: '#999' }}>
                No data to display
              </div>
            </Show>

            <Show when={!loading() && qrCodes().length > 0}>
              <div style={{
                display: 'grid',
                'grid-template-columns': qrCodes().length === 1
                  ? '1fr'
                  : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
                'justify-items': 'center',
              }}>
                <For each={qrCodes()}>
                  {(item, index) => (
                    <div style={{
                      background: '#f8fafc',
                      'border-radius': '12px',
                      padding: '1rem',
                      'text-align': 'center',
                      border: '1px solid #e2e8f0',
                      width: '100%',
                      'max-width': '320px',
                    }}>
                      {/* QR Code Number Badge */}
                      <Show when={qrCodes().length > 1}>
                        <div style={{
                          background: '#1e3a5f',
                          color: 'white',
                          'font-size': '0.75rem',
                          'font-weight': '600',
                          padding: '0.25rem 0.75rem',
                          'border-radius': '9999px',
                          display: 'inline-block',
                          'margin-bottom': '0.75rem',
                        }}>
                          QR {index() + 1} of {qrCodes().length}
                        </div>
                      </Show>

                      {/* QR Code Image */}
                      <div style={{
                        width: '200px',
                        height: '200px',
                        margin: '0 auto',
                        background: 'white',
                        'border-radius': '8px',
                        display: 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        border: '1px solid #e2e8f0',
                      }}>
                        <Show when={item.image} fallback={
                          <span style={{ color: '#999' }}>Error</span>
                        }>
                          <img
                            src={item.image}
                            alt={`QR ${index() + 1}`}
                            style={{ width: '200px', height: '200px', 'border-radius': '8px' }}
                          />
                        </Show>
                      </div>

                      {/* Text Preview */}
                      <pre style={{
                        'margin-top': '0.75rem',
                        padding: '0.5rem',
                        background: 'white',
                        'border-radius': '6px',
                        'font-size': '0.65rem',
                        'text-align': 'left',
                        'max-height': '60px',
                        overflow: 'auto',
                        'white-space': 'pre-wrap',
                        'word-break': 'break-all',
                        border: '1px solid #e2e8f0',
                      }}>
                        {item.text}
                      </pre>

                      {/* Buttons */}
                      <div style={{
                        'margin-top': '0.75rem',
                        display: 'flex',
                        gap: '0.5rem',
                        'justify-content': 'center'
                      }}>
                        <button
                          onClick={() => downloadQR(item, index())}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            'border-radius': '4px',
                            cursor: 'pointer',
                            'font-size': '0.75rem',
                          }}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => copyText(item.text)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: 'white',
                            border: '1px solid #ddd',
                            'border-radius': '4px',
                            cursor: 'pointer',
                            'font-size': '0.75rem',
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default MultiQRCodeViewer;
