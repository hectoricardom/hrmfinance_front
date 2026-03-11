import { HBL } from '../types';

/**
 * Generates and prints 2.3x4 inch labels for multiple HBLs
 * Each label includes: QR code, HBL number, bag number, customer telephone, and consignee name
 */
export const printHBLLabels = (hbls: HBL[]) => {
  if (!hbls || hbls.length === 0) {
    alert('No hay HBLs seleccionados para imprimir');
    return;
  }

  // Generate QR code URL function
  const getQRCodeURL = (hblNumber: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(hblNumber)}&bgcolor=FFFFFF&color=000000&margin=2`;
  };

  // Generate label HTML for a single HBL
  const generateLabelHTML = (hbl: HBL) => {
    return `
      <div class="hbl-label" style="
        width: 2.3in;
        height: 4in;
        background: white;
        border: 0px solid #000;
        padding: 0.1in;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
        page-break-after: always;
        margin: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        font-size: 8pt;
        line-height: 1.1;
        float: left;
      ">
        <!-- Header with QR Code and HBL Number -->
        <div style="
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.08in;
          border-bottom: 1px solid #000;
          padding-bottom: 0.05in;
        ">
          <div style="
            width: 1.0in;
            height: 1.0in;
            padding: .03in;
            border: 1px solid #ccc;
            flex-shrink: 0;
          ">
            <img
              src="${getQRCodeURL(hbl.hbl)}"
              alt="QR: ${hbl.hbl}"
              style="width: 100%; height: 100%; display: block;"
            />
          </div>
          <div style="flex: 1; padding-left: 0.05in;">
            <div style="
              font-size: 11pt;
              font-weight: bold;
              letter-spacing: 0.5px;
              margin: 0;
              line-height: 1;
              text-align: center;
              padding-top: 0.05in;
            ">
              HBL<br/>${hbl.hbl}
              <div style="
              font-size: 11pt;
              font-weight: bold;
              letter-spacing: 0.5px;
              margin: .16in;
              line-height: 1;
              text-align: center;
              padding: .02in;
              border-radius: 15px;
              color: #090909;
              border: 1px solid #090909;
            ">
             
            </div>
            </div>
            
          </div>
        </div>

        <!-- Bag Number -->
        <div style="
          text-align: center;
          font-size: 12pt;
          font-weight: bold;
          border: 1px solid #000;
          padding: 3px;
          margin-bottom: 0.08in;
          background-color: #f5f5f5;
        ">
          BAG: ${hbl.bagnumber || 'N/A'}
        </div>

        <!-- Consignee Name -->
        <div style="margin-bottom: 0.08in;">
          <div style="
            font-weight: bold;
            font-size: 7pt;
            margin: 0 0 1px 0;
            color: #444;
          ">DESTINATARIO:</div>
          <div style="
            font-size: 9pt;
            font-weight: 600;
            margin: 0 0 3px 0;
            word-wrap: break-word;
            line-height: 1.1;
          ">${hbl.consigneeName}</div>
        </div>

        <!-- Customer Telephone -->
        <div style="margin-bottom: 0.08in;">
          <div style="
            font-weight: bold;
            font-size: 7pt;
            margin: 0 0 1px 0;
            color: #444;
          ">TELÉFONO:</div>
          <div style="
            font-size: 9pt;
            font-weight: 600;
            margin: 0 0 3px 0;
            word-wrap: break-word;
            line-height: 1.1;
          ">${hbl.ctelephone}</div>
        </div>

        <!-- Customer ID -->
        <div style="margin-bottom: 0.08in;">
          <div style="
            font-weight: bold;
            font-size: 7pt;
            margin: 0 0 1px 0;
            color: #444;
          ">CÉDULA:</div>
          <div style="
            font-size: 8pt;
            margin: 0 0 3px 0;
            word-wrap: break-word;
            line-height: 1.1;
          ">${hbl.cidentity}</div>
        </div>

        <!-- Address -->
        <div style="margin-bottom: 0.08in;">
          <div style="
            font-weight: bold;
            font-size: 7pt;
            margin: 0 0 1px 0;
            color: #444;
          ">DIRECCIÓN:</div>
          <div style="
            font-size: 7pt;
            margin: 0 0 3px 0;
            word-wrap: break-word;
            line-height: 1.1;
            max-height: 0.5in;
            overflow: hidden;
          ">${hbl.street || 'N/A'}</div>
        </div>

        <!-- Guide Number (Footer) -->
        <div style="
          margin-top: auto;
          padding-top: 0.05in;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 7pt;
          color: #666;
        ">
          Guía: ${hbl.idairguide || hbl.guia}
        </div>
      </div>
    `;
  };

  // Create print window with all labels
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión. Verifique que las ventanas emergentes estén habilitadas.');
    return;
  }

  const labelsHTML = hbls.map(hbl => generateLabelHTML(hbl)).join('\n');

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Etiquetas HBL - ${hbls.length} label(es)</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background: #f0f0f0;
          }

          .container {
            width: 100%;
            padding: 0.2in;
          }

          .hbl-label {
            background: white;
          }

          @media print {
            body {
              background: white;
              margin: 0;
              padding: 0;
            }

            .container {
              padding: 0;
            }

            .no-print {
              display: none !important;
            }

            .hbl-label {
              page-break-after: always;
              float: none;
              margin: 0;
            }

            @page {
              size: 2.3in 4in;
              margin: 0;
            }
          }

          @media screen {
            .print-controls {
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 1000;
              background: white;
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }

            .print-btn {
              padding: 10px 20px;
              font-size: 14px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              margin-right: 10px;
            }

            .print-btn:hover {
              background: #0056b3;
            }

            .close-btn {
              background: #6c757d;
            }

            .close-btn:hover {
              background: #545b62;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button class="print-btn" onclick="window.print()">
            🖨️ Imprimir ${hbls.length} Etiqueta(s)
          </button>
          <button class="print-btn close-btn" onclick="window.close()">
            ✕ Cerrar
          </button>
          <div style="margin-top: 10px; font-size: 12px; color: #666;">
            Total: ${hbls.length} etiquetas de 2.3x4 pulgadas
          </div>
        </div>

        <div class="container">
          ${labelsHTML}
        </div>

        <script>
          // Auto-print when the page loads (with a small delay to ensure images load)
          window.addEventListener('load', function() {
            setTimeout(function() {
              // Check if user wants to auto-print (can be disabled for preview)
              const autoPrint = true; // Set to false to disable auto-print
              if (autoPrint) {
                // Uncomment the next line to enable auto-print
                // window.print();
              }
            }, 500);
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
};

/**
 * Print labels for selected HBLs only
 */
export const printSelectedHBLLabels = (allHBLs: HBL[], selectedIds: Set<string>) => {
  const selectedHBLs = allHBLs.filter(hbl => selectedIds.has(hbl.referenceHId || ''));

  if (selectedHBLs.length === 0) {
    alert('No hay HBLs seleccionados. Por favor seleccione al menos un HBL para imprimir etiquetas.');
    return;
  }

  printHBLLabels(selectedHBLs);
};
