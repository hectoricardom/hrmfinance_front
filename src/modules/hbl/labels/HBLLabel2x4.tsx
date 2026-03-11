import { Component, createEffect, createSignal } from 'solid-js';
import { HBL } from '../types';

interface HBLLabel2x4Props {
  hbl: HBL;
  showControls?: boolean;
}

const HBLLabel2x4: Component<HBLLabel2x4Props> = (props) => {
  const [qrCodeDataURL, setQrCodeDataURL] = createSignal<string>('');

  // Generate QR code using QR Server API
  createEffect(() => {
    const hblNumber = props.hbl.hbl;
    if (hblNumber) {
      // Using qr-server.com API to generate QR code
      const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(hblNumber)}&bgcolor=FFFFFF&color=000000&margin=2`;
      setQrCodeDataURL(qrCodeURL);
    }
  });

  // 2.3x4 inch label dimensions at 72 DPI
  const labelStyle = {
    width: '2.3in',
    height: '4in',
    background: 'white',
    border: '1px solid #000',
    padding: '0.1in',
    'font-family': 'Arial, sans-serif',
    'box-sizing': 'border-box',
    position: 'relative' as const,
    'page-break-after': 'always',
    margin: '0 auto',
    display: 'flex',
    'flex-direction': 'column',
    'justify-content': 'flex-start',
    'font-size': '8pt',
    'line-height': '1.1'
  };

  const headerStyle = {
    display: 'flex',
    'align-items': 'flex-start',
    'justify-content': 'space-between',
    'margin-bottom': '0.08in',
    'border-bottom': '1px solid #000',
    'padding-bottom': '0.05in'
  };

  const qrCodeStyle = {
    width: '1.16in',
    height: '1.16in',
    border: '1px solid #ccc',
    'flex-shrink': '0'
  };

  const hblNumberStyle = {
    'font-size': '11pt',
    'font-weight': 'bold',
    'letter-spacing': '0.5px',
    margin: '0',
    'line-height': '1',
    'text-align': 'center' as const,
    flex: '1',
    'padding-top': '0.05in'
  };

  const sectionStyle = {
    'margin-bottom': '0.08in'
  };

  const labelTextStyle = {
    'font-weight': 'bold',
    'font-size': '7pt',
    margin: '0 0 1px 0',
    color: '#444'
  };

  const valueTextStyle = {
    'font-size': '8pt',
    margin: '0 0 3px 0',
    'word-wrap': 'break-word' as const,
    'line-height': '1.1'
  };

  const bagNumberStyle = {
    'text-align': 'center' as const,
    'font-size': '12pt',
    'font-weight': 'bold',
    'border': '1px solid #000',
    padding: '3px',
    'margin-bottom': '0.08in',
    'background-color': '#f5f5f5'
  };

  return (
    <div class="hbl-label-2x4-container" style={labelStyle}>
      {/* Header with QR Code and HBL Number */}
      <div style={headerStyle}>
        <div style={qrCodeStyle}>
          {qrCodeDataURL() && (
            <img
              src={qrCodeDataURL()}
              alt={`QR: ${props.hbl.hbl}`}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          )}
        </div>
        <div style={{ flex: '1', 'padding-left': '1.15in' }}>
          <div style={hblNumberStyle}>
            HBL<br/>{props.hbl.hbl}
          </div>
        </div>
      </div>

      {/* Bag Number */}
      <div style={bagNumberStyle}>
        BAG: {props.hbl.bagnumber || 'N/A'}
      </div>

      {/* Consignee Name */}
      <div style={sectionStyle}>
        <div style={labelTextStyle}>DESTINATARIO:</div>
        <div style={{
          ...valueTextStyle,
          'font-size': '9pt',
          'font-weight': '600'
        }}>
          {props.hbl.consigneeName}
        </div>
      </div>

      {/* Customer Telephone */}
      <div style={sectionStyle}>
        <div style={labelTextStyle}>TELÉFONO:</div>
        <div style={{
          ...valueTextStyle,
          'font-size': '9pt',
          'font-weight': '600'
        }}>
          {props.hbl.ctelephone}
        </div>
      </div>

      {/* Customer ID */}
      <div style={sectionStyle}>
        <div style={labelTextStyle}>CÉDULA:</div>
        <div style={valueTextStyle}>
          {props.hbl.cidentity}
        </div>
      </div>

      {/* Address (compact) */}
      <div style={sectionStyle}>
        <div style={labelTextStyle}>DIRECCIÓN:</div>
        <div style={{
          ...valueTextStyle,
          'font-size': '7pt',
          'max-height': '0.5in',
          overflow: 'hidden'
        }}>
          {props.hbl.street || 'N/A'}
        </div>
      </div>

      {/* Guide Number */}
      <div style={{
        'margin-top': 'auto',
        'padding-top': '0.05in',
        'border-top': '1px solid #ccc',
        'text-align': 'center' as const,
        'font-size': '7pt',
        color: '#666'
      }}>
        Guía: {props.hbl.idairguide || props.hbl.guia}
      </div>
    </div>
  );
};

export default HBLLabel2x4;
