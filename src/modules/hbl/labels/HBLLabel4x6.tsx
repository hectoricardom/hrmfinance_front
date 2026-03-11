import { Component, Show, createSignal, onMount, createEffect } from 'solid-js';
import { devLog } from '../../../services/utils';

interface CustomerInfo {
  fullname: string;
  phoneNumber: string;
  cid: string;
  address: string;
}

interface HBLInfo {
  hbl: string;
  guideNumber: string;
  weight?: string;
  pieces?: number;
  destination?: string;
  origin?: string;
  date?: string;
}

interface HBLLabel4x6Props {
  customer: CustomerInfo;
  hblInfo: HBLInfo;
  onPrint?: () => void;
}

const HBLLabel4x6: Component<HBLLabel4x6Props> = (props) => {
  const [qrCodeDataURL, setQrCodeDataURL] = createSignal<string>('');

  // Generate QR code using QR Server API
  createEffect(() => {
    const hblNumber = props.hblInfo.hbl;
    if (hblNumber) {
      devLog('Generating QR code for HBL:', hblNumber);
      
      // Using qr-server.com API to generate QR code
      const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(hblNumber)}&bgcolor=FFFFFF&color=000000&margin=5`;
      
      setQrCodeDataURL(qrCodeURL);
      devLog('QR Code URL generated:', qrCodeURL);
    }
  });
  
  // 4x6 inch label dimensions (288pt x 432pt at 72 DPI)
  const labelStyle = {
    width: '4in',
    height: '6in',
    background: 'white',
    border: '2px solid #000',
    padding: '0.2in',
    'font-family': 'Arial, sans-serif',
    'font-size': '11pt',
    'line-height': '1.2',
    'box-sizing': 'border-box',
    position: 'relative' as const,
    'page-break-after': 'always',
    margin: '0',
    display: 'flex',
    'flex-direction': 'column',
    'justify-content': 'space-between'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'border-bottom': '2px solid #000',
    'padding-bottom': '0.1in',
    'margin-bottom': '0.1in',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between'
  };

  const qrCodeStyle = {
    width: '0.8in',
    height: '0.8in',
    border: '1px solid #000',
    'border-radius': '4px',
    padding: '2px'
  };

  const hblNumberStyle = {
    'font-size': '16pt',
    'font-weight': 'bold',
    'letter-spacing': '2px',
    margin: '0'
  };

  const sectionStyle = {
    'margin-bottom': '0.15in'
  };

  const labelTextStyle = {
    'font-weight': 'bold',
    'font-size': '9pt',
    margin: '0 0 2px 0'
  };

  const valueTextStyle = {
    'font-size': '10pt',
    margin: '0 0 4px 0',
    'word-wrap': 'break-word'
  };

  const guideNumberStyle = {
    'text-align': 'center' as const,
    'font-size': '14pt',
    'font-weight': 'bold',
    'border': '1px solid #000',
    padding: '4px',
    'margin-bottom': '0.1in'
  };


  const destinationStyle = {
    'text-align': 'center' as const,
    'font-size': '14pt',
    'font-weight': 'bold',
    padding: '4px',
    'margin-bottom': '0.1in'
  };

  const footerStyle = {
    'border-top': '1px solid #000',
    'padding-top': '0.1in',
    'text-align': 'center' as const,
    'font-size': '8pt'
  };

  const printStyle = `
    @media print {
      body * {
        visibility: hidden;
      }
      .hbl-label-container, .hbl-label-container * {
        visibility: visible;
      }
      .hbl-label-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 4in;
        height: 6in;
      }
      @page {
        size: 4in 6in;
        margin: 0;
      }
    }
  `;

  const handlePrint = () => {
    if (props.onPrint) {
      props.onPrint();
    }
    window.print();
  };

  return (
    <div>
      <style>{printStyle}</style>
      
      {/* Print Controls */}
      <div style={{ 
        'margin-bottom': '1rem', 
        'text-align': 'center',
        '@media print': { display: 'none' }
      }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '0.5rem 1rem',
            'background-color': '#007bff',
            color: 'white',
            border: 'none',
            'border-radius': '4px',
            cursor: 'pointer',
            'font-size': '14px',
            'margin-right': '1rem'
          }}
        >
          🖨️ Imprimir Etiqueta 4x6
        </button>
        
        <button
          onClick={() => {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>HBL Label ${props.hblInfo.hbl}</title>
                  <style>
                    ${printStyle}
                    body { margin: 0; padding: 0; }
                  </style>
                </head>
                <body>
                  ${document.querySelector('.hbl-label-container')?.outerHTML}
                </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }
          }}
          style={{
            padding: '0.5rem 1rem',
            'background-color': '#28a745',
            color: 'white',
            border: 'none',
            'border-radius': '4px',
            cursor: 'pointer',
            'font-size': '14px'
          }}
        >
          🚀 Vista Previa
        </button>
      </div>

      {/* 4x6 Label */}
      <div class="hbl-label-container" style={labelStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ flex: '1', 'text-align': 'left' }}>
            <Show when={qrCodeDataURL()}>
              <img 
                src={qrCodeDataURL()} 
                alt={`QR Code: ${props.hblInfo.hbl}`}
                style={qrCodeStyle}
                title={`Escaneame: ${props.hblInfo.hbl}`}
              />
            </Show>
          </div>
          
          <div style={{ flex: '2', 'text-align': 'center' }}>
            <h1 style={hblNumberStyle}>HBL: {props.hblInfo.hbl}</h1>
          </div>
        </div>

        {/* Guide Number */}
        <Show when={props.hblInfo.guideNumber}>
          <div style={guideNumberStyle}>
            GUÍA: {props.hblInfo.guideNumber}
          </div>
        </Show>

        <Show when={props.hblInfo.guideNumber}>
          <div style={destinationStyle}>
             {props.hblInfo.destination}
          </div>
        </Show>

        {/* Customer Information */}
        <div style={sectionStyle}>
          <div style={labelTextStyle}>DESTINATARIO:</div>
          <div style={valueTextStyle}>{props.customer.fullname}</div>
          
          <div style={labelTextStyle}>TELÉFONO:</div>
          <div style={valueTextStyle}>{props.customer.phoneNumber}</div>
          
          <div style={labelTextStyle}>CÉDULA:</div>
          <div style={valueTextStyle}>{props.customer.cid}</div>
        </div>

        {/* Address */}
        <div style={sectionStyle}>
          <div style={labelTextStyle}>DIRECCIÓN:</div>
          <div style={{
            ...valueTextStyle,
            'font-size': '9pt',
            'line-height': '1.1',
            'max-height': '0.8in',
            overflow: 'hidden'
          }}>
            {props.customer.address}
          </div>
        </div>




        {/* Shipping Details */}
        <Show when={props.hblInfo.weight || props.hblInfo.pieces}>
          <div style={sectionStyle}>
            <Show when={props.hblInfo.pieces}>
              <div>
                <span style={labelTextStyle}>PIEZAS: </span>
                <span style={valueTextStyle}>{props.hblInfo.pieces}</span>
              </div>
            </Show>
            <Show when={props.hblInfo.weight}>
              <div>
                <span style={labelTextStyle}>PESO: </span>
                <span style={valueTextStyle}>{props.hblInfo.weight}</span>
              </div>
            </Show>
          </div>
        </Show>



        {/* Footer */}
        <div style={footerStyle}>
          <Show when={props.hblInfo.date}>
            <div>Fecha: {props.hblInfo.date}</div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default HBLLabel4x6;