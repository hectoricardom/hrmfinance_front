/**
 * QRCodeViewer - Reusable QR code display component
 * Can be called from anywhere with qrText prop
 */

import { Component, createSignal, createEffect, on, Show } from 'solid-js';
import QRCode from 'qrcode';

interface QRCodeViewerProps {
  qrText: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  convertPipeToTab?: boolean; // Convert | to tab character
  toUpperCase?: boolean;
}

const QRCodeViewer: Component<QRCodeViewerProps> = (props) => {
  const [qrImage, setQrImage] = createSignal<string>('');
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

  // Generate QR code
  const generateQRCode = async () => {
    if (!props.qrText) {
      setQrImage('');
      return;
    }

    setLoading(true);
    try {
      const processedText = processText(props.qrText);
      const dataUrl = await QRCode.toDataURL(processedText, {
        width: 300,
        margin: 3,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrImage(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
      setQrImage('');
    }
    setLoading(false);
  };

  // Generate QR code when modal opens or text changes
  createEffect(on(() => [props.isOpen, props.qrText], ([isOpen]) => {
    if (isOpen) {
      generateQRCode();
    }
  }));

  // Download QR
  const downloadQR = () => {
    const url = qrImage();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_${Date.now()}.png`;
    link.click();
  };

  // Display text (show | instead of tabs for readability)
  const displayText = () => props.qrText || '';

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
              {props.title || 'QR Code'}
            </span>
            <button
              onClick={props.onClose}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', 'font-size': '1.5rem' }}
            >
              ×
            </button>
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
              <Show when={!loading() && qrImage()} fallback={
                <span style={{ color: '#999' }}>{loading() ? 'Generating...' : 'No data'}</span>
              }>
                <img src={qrImage()} alt="QR" style={{ width: '256px', height: '256px', 'border-radius': '8px' }} />
              </Show>
            </div>

            {/* Text Preview */}
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
              {displayText()}
            </pre>

            {/* Buttons */}
            <div style={{ 'margin-top': '1rem', display: 'flex', gap: '0.5rem', 'justify-content': 'center' }}>
              <button
                onClick={downloadQR}
                disabled={!qrImage()}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: qrImage() ? '#3b82f6' : '#ccc',
                  color: 'white',
                  border: 'none',
                  'border-radius': '6px',
                  cursor: qrImage() ? 'pointer' : 'not-allowed',
                }}
              >
                Download
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(displayText())}
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

export default QRCodeViewer;
