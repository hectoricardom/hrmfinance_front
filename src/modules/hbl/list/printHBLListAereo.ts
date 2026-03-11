import { HBL } from '../types';
import { convertToCSV, downloadCSV } from '../../../utils/csvUtils';

export const printHBLList = (hbls: HBL[], title: string = 'Reporte de Lista HBL') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Group HBLs by Air Guide
  const groupedByAirGuide = hbls.reduce((groups, hbl) => {
    const airGuide = hbl.idairguide || hbl.idairnumber || 'Sin Guía';
    if (!groups[airGuide]) {
      groups[airGuide] = [];
    }
    groups[airGuide].push(hbl);
    return groups;
  }, {} as Record<string, HBL[]>);

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #222;
            font-size: 24px;
            margin-bottom: 10px;
            text-align: center;
          }
          .report-info {
            text-align: center;
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .hbl-number {
            font-weight: bold;
            color: #0066cc;
          }
          .status {
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
          }
          .status-pending { background-color: #fff3cd; color: #856404; }
          .status-enviado { background-color: #cce5ff; color: #004085; }
          .status-en-bodega { background-color: #d4edda; color: #155724; }
          .status-entregado { background-color: #d1ecf1; color: #0c5460; }
          .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .summary h3 {
            margin-top: 0;
            font-size: 16px;
          }
          .summary-item {
            display: inline-block;
            margin-right: 30px;
            margin-bottom: 10px;
          }
          .summary-label {
            font-weight: bold;
            color: #555;
          }
          .summary-value {
            color: #333;
            font-size: 18px;
          }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
          }
          .page-break {
            page-break-after: always;
          }
          .air-guide-group {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .air-guide-header {
            background: linear-gradient(135deg, #6c5ce7, #a855f7);
            color: white;
            padding: 12px 20px;
            border-radius: 8px 8px 0 0;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .air-guide-stats {
            font-size: 14px;
            font-weight: normal;
          }
          .group-table {
            margin-top: 0;
            border-radius: 0 0 8px 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .group-summary {
            background-color: #f8f9fa;
            padding: 8px 15px;
            border-top: 2px solid #e9ecef;
            font-size: 11px;
            color: #6c757d;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="report-info">
          <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
          <p>Total HBLs: ${hbls.length} | Guías Aéreas: ${Object.keys(groupedByAirGuide).length}</p>
        </div>
        
        ${Object.entries(groupedByAirGuide).map(([airGuide, groupHbls]) => {
          const groupWeight = groupHbls.reduce((sum, hbl) => sum + parseFloat(hbl.weight || '0'), 0);
          const groupQuantity = groupHbls.reduce((sum, hbl) => sum + parseInt(hbl.quantity || '0'), 0);
          
          return `
            <div class="air-guide-group">
              <div class="air-guide-header">
                <span>✈️ Guía Aérea: ${airGuide}</span>
                <span class="air-guide-stats">${groupHbls.length} HBLs | ${groupWeight.toFixed(2)} kg | ${groupQuantity} paquetes</span>
              </div>
              
              <table class="group-table">
                <thead>
                  <tr>
                    <th style="width: 100px;">HBL #</th>
                    <th>Consignatario</th>\
                    <th>Dirección</th>
                    <th>Articulos</th>
                    <th style="width: 80px;">Peso (kg)</th>
                    <th style="width: 90px;">Bulto</th>
                  </tr>
                </thead>
                <tbody>
                  ${groupHbls.map(hbl => `
                    <tr>
                      <td class="hbl-number">${hbl.hbl}</td>
                      <td>
                        <strong>${hbl.nameconsignee}</strong><br/>
                        ID: ${hbl.cidentity}<br/>
                        Tel: ${hbl.ctelephone}
                      </td>
                      <td>${hbl.street || ''}</td>
                      <td>${hbl.namegood || ''}</td>
                      <td style="text-align: right;">${hbl.weight || '0'}</td>
                      <td>${hbl.bagnumber}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="group-summary">
                <strong>Subtotal Guía ${airGuide}:</strong> ${groupHbls.length} HBLs • ${groupWeight.toFixed(2)} kg • ${groupQuantity} paquetes
              </div>
            </div>
          `;
        }).join('')}
        
        <div class="summary">
          <h3>Resumen General</h3>
          <div class="summary-item">
            <span class="summary-label">Total Guías Aéreas:</span>
            <span class="summary-value">${Object.keys(groupedByAirGuide).length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total HBLs:</span>
            <span class="summary-value">${hbls.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Peso Total:</span>
            <span class="summary-value">${hbls.reduce((sum, hbl) => sum + parseFloat(hbl.weight || '0'), 0).toFixed(2)} kg</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Paquetes:</span>
            <span class="summary-value">${hbls.reduce((sum, hbl) => sum + parseInt(hbl.quantity || '0'), 0)}</span>
          </div>
          <br/>
          <div>
            <strong>Resumen por Guía Aérea:</strong><br/>
            ${Object.entries(groupedByAirGuide).map(([airGuide, groupHbls]) => {
              const weight = groupHbls.reduce((sum, hbl) => sum + parseFloat(hbl.weight || '0'), 0);
              const quantity = groupHbls.reduce((sum, hbl) => sum + parseInt(hbl.quantity || '0'), 0);
              return `
                <div class="summary-item">
                  <span class="summary-label">${airGuide}:</span>
                  <span class="summary-value">${groupHbls.length} HBLs (${weight.toFixed(2)} kg, ${quantity} paquetes)</span>
                </div>
              `;
            }).join('')}
          </div>
          <br/>
          <div>
            <strong>Desglose por Estado:</strong><br/>
            ${Object.entries(
              hbls.reduce((acc, hbl) => {
                acc[hbl.idguidestate] = (acc[hbl.idguidestate] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([status, count]) => `
              <div class="summary-item">
                <span class="summary-label">${status}:</span>
                <span class="summary-value">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
};

export const exportHBLListToCSV = (hbls: HBL[], filename: string = 'hbl_list.csv') => {
  const headers = [
    'Guía Aérea',
    'Número HBL',
    'Número Aéreo',
    'Nombre Consignatario',
    'ID Consignatario',
    'Teléfono Consignatario',
    'Nombre Remitente',
    'Dirección',
    'Peso (kg)',
    'Cantidad',
    'Estado',
    'Mercancía',
    'Número de Bolsa',
    'Agencia',
    'Guía',
    'Fecha'
  ];

  // Group HBLs by Air Guide for sorted export
  const groupedByAirGuide = hbls.reduce((groups, hbl) => {
    const airGuide = hbl.idairguide || hbl.idairnumber || 'Sin Guía';
    if (!groups[airGuide]) {
      groups[airGuide] = [];
    }
    groups[airGuide].push(hbl);
    return groups;
  }, {} as Record<string, HBL[]>);

  //  <td>${new Date(hbl.datereserve).toLocaleDateString('es-ES')}</td>
  // Convert grouped HBL data to array format for CSV export (sorted by air guide)
  const data: any[] = [];
  
  Object.entries(groupedByAirGuide)
    .sort(([a], [b]) => a.localeCompare(b)) // Sort air guides alphabetically
    .forEach(([airGuide, groupHbls]) => {
      groupHbls.forEach(hbl => {
        data.push([
          airGuide,
          hbl.hbl,
          hbl.idairnumber,
          hbl.consigneeName,
          hbl.cidentity,
          hbl.ctelephone,
          hbl.nameshipper,
          hbl.street,
          hbl.weight,
          hbl.quantity,
          hbl.idguidestate,
          hbl.namegood,
          hbl.bagnumber,
          hbl.agency,
          hbl.guia,
          new Date(hbl.datereserve).toLocaleDateString('es-ES')
        ]);
      });
    });

  // Use the improved CSV utility that properly handles commas in strings
  const csvContent = convertToCSV(data, headers);
  
  // Download the CSV file with proper UTF-8 encoding
  downloadCSV(csvContent, filename);
};