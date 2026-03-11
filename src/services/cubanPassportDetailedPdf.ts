import jsPDF from 'jspdf';
import { CubanPassportForm } from '../modules/passport/types/cubanPassport';

/**
 * Generate a detailed PDF document with all Cuban passport application data
 * This creates a comprehensive, printable document with all information
 */
export const generateDetailedCubanPassportPDF = async (data: CubanPassportForm): Promise<Blob> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Document settings
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;
  
  // Colors
  const primaryColor = '#2563eb';
  const secondaryColor = '#64748b';
  const borderColor = '#e2e8f0';
  
  // Helper functions
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    pdf.setFontSize(options.fontSize || 10);
    pdf.setTextColor(options.color || '#000000');
    pdf.setFont('helvetica', options.style || 'normal');
    
    if (options.maxWidth) {
      const lines = pdf.splitTextToSize(text, options.maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * (options.lineHeight || 5));
    } else {
      pdf.text(text, x, y);
      return y + (options.lineHeight || 5);
    }
  };
  
  const addSection = (title: string, y: number): number => {
    // Section background
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, y - 5, contentWidth, 12, 'F');
    
    // Section title
    pdf.setFontSize(14);
    pdf.setTextColor(primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 5, y + 5);
    
    // Underline
    pdf.setDrawColor(primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 5, y + 7, margin + 5 + pdf.getTextWidth(title), y + 7);
    
    return y + 20;
  };
  
  const addField = (label: string, value: string, x: number, y: number, width: number = 70): number => {
    // Label
    pdf.setFontSize(9);
    pdf.setTextColor(secondaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', x, y);
    
    // Value
    pdf.setFontSize(10);
    pdf.setTextColor('#000000');
    pdf.setFont('helvetica', 'normal');
    const displayValue = value || 'N/A';
    const lines = pdf.splitTextToSize(displayValue, width - 2);
    pdf.text(lines, x, y + 5);
    
    return y + Math.max(10, lines.length * 4);
  };
  
  const addTwoColumnFields = (leftLabel: string, leftValue: string, rightLabel: string, rightValue: string, y: number): number => {
    const leftY = addField(leftLabel, leftValue, margin, y, contentWidth / 2 - 5);
    const rightY = addField(rightLabel, rightValue, margin + contentWidth / 2, y, contentWidth / 2 - 5);
    return Math.max(leftY, rightY) + 5;
  };
  
  const addThreeColumnFields = (field1: any, field2: any, field3: any, y: number): number => {
    const colWidth = contentWidth / 3 - 5;
    const y1 = addField(field1.label, field1.value, margin, y, colWidth);
    const y2 = addField(field2.label, field2.value, margin + colWidth + 5, y, colWidth);
    const y3 = addField(field3.label, field3.value, margin + (colWidth + 5) * 2, y, colWidth);
    return Math.max(y1, y2, y3) + 5;
  };
  
  const checkPageBreak = (neededSpace: number): number => {
    if (currentY + neededSpace > pageHeight - margin) {
      pdf.addPage();
      return margin;
    }
    return currentY;
  };
  
  const formatDate = (day?: string, month?: string, year?: string): string => {
    if (!day || !month || !year) return 'N/A';
    return `${day}/${month}/${year}`;
  };
  
  // Document Header
  pdf.setFillColor(primaryColor);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setFontSize(20);
  pdf.setTextColor('#ffffff');
  pdf.setFont('helvetica', 'bold');
  pdf.text('SOLICITUD DE PASAPORTE CUBANO', pageWidth / 2, 15, { align: 'center' });
  
  // Subtitle
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Documento Detallado de Aplicación', pageWidth / 2, 20, { align: 'center' });
  
  currentY = 40;
  
  // Document info box
  pdf.setDrawColor(borderColor);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, currentY, contentWidth, 25);
  
  pdf.setFontSize(10);
  pdf.setTextColor('#000000');
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-ES')}`, margin + 5, currentY + 8);
  pdf.text(`Hora: ${new Date().toLocaleTimeString('es-ES')}`, margin + 5, currentY + 15);
  
  if (data.numeroFormulario) {
    pdf.text(`Número de Formulario: ${data.numeroFormulario}`, margin + 5, currentY + 22);
  }
  
  if (data.fechaSolicitud) {
    pdf.text(`Fecha de Solicitud: ${data.fechaSolicitud}`, margin + contentWidth - 80, currentY + 8);
  }
  
  if (data.storeId) {
    pdf.text(`Tienda: ${data.storeName || data.storeId}`, margin + contentWidth - 80, currentY + 15);
  }
  
  currentY += 35;


  
  // 1. DATOS PERSONALES
  currentY = checkPageBreak(80);
  currentY = addSection('1. DATOS PERSONALES', currentY);
  
  currentY = addTwoColumnFields('Primer Apellido', data.primerApellido, 'Segundo Apellido', data.segundoApellido, currentY);
  currentY = addTwoColumnFields('Primer Nombre', data.primerNombre, 'Segundo Nombre', data.segundoNombre, currentY);
  currentY = addTwoColumnFields('Nombre de la Madre', data.nombre, 'Nombre del Padre', data.padre, currentY);
  currentY = addField('CID (Cédula de Identidad)', data.cid, margin, currentY, contentWidth);
  
  currentY += 10;
  
  // 2. CARACTERÍSTICAS FÍSICAS
  currentY = checkPageBreak(60);
  currentY = addSection('2. CARACTERÍSTICAS FÍSICAS', currentY);
  
  currentY = addTwoColumnFields('Sexo', data.sexo === 'M' ? 'Masculino' : 'Femenino', 'Estatura', data.estatura ? `${data.estatura} cm` : '', currentY);
  currentY = addTwoColumnFields('Color de Piel', data.colorPiel, 'Color de Cabello', data.colorCabello, currentY);
  currentY = addTwoColumnFields('Color de Ojos', data.colorOjos, 'Características Especiales', data.caracteristicasEspeciales, currentY);
  
  currentY += 10;
  
  // 3. LUGAR DE NACIMIENTO
  currentY = checkPageBreak(60);
  currentY = addSection('3. LUGAR DE NACIMIENTO', currentY);
  
  currentY = addThreeColumnFields(
    { label: 'País', value: data.lugarNacimiento?.pais },
    { label: 'Provincia', value: data.lugarNacimiento?.provincia },
    { label: 'Municipio', value: data.lugarNacimiento?.municipio },
    currentY
  );
  
  currentY = addField('Fecha de Nacimiento', formatDate(
    data.lugarNacimiento?.diaNacimiento,
    data.lugarNacimiento?.mesNacimiento,
    data.lugarNacimiento?.anoNacimiento
  ), margin, currentY, contentWidth);
  
  currentY += 10;
  
  // 4. DIRECCIÓN ACTUAL
  currentY = checkPageBreak(70);
  currentY = addSection('4. DIRECCIÓN DE RESIDENCIA ACTUAL', currentY);
  
  currentY = addField('Dirección (Calle, Ave o Apto)', data.direccionActual?.calle, margin, currentY, contentWidth);
  currentY = addTwoColumnFields('Ciudad/Municipio', data.direccionActual?.municipio, 'Provincia/Estado', data.direccionActual?.provincia, currentY);
  currentY = addTwoColumnFields('País', data.direccionActual?.pais, 'Código Postal', data.direccionActual?.codigoPostal, currentY);
  
  currentY += 10;
  
  // 5. INFORMACIÓN DE CONTACTO
  currentY = checkPageBreak(50);
  currentY = addSection('5. INFORMACIÓN DE CONTACTO', currentY);
  
  currentY = addThreeColumnFields(
    { label: 'Teléfono', value: data.telefono },
    { label: 'Fax', value: data.fax },
    { label: 'Email', value: data.email },
    currentY
  );
  
  currentY += 10;
  
  // 6. DATOS LABORALES
  currentY = checkPageBreak(80);
  currentY = addSection('6. DATOS LABORALES O DE ESTUDIO ACTUAL', currentY);
  
  currentY = addThreeColumnFields(
    { label: 'Profesión', value: data.datosLaborales?.profesion },
    { label: 'Ocupación', value: data.datosLaborales?.ocupacion },
    { label: 'Nivel Escolar', value: data.datosLaborales?.nivelEscolar },
    currentY
  );
  
  currentY = addField('Centro de Trabajo', data.datosLaborales?.nombreCentroTrabajo, margin, currentY, contentWidth);
  currentY = addField('Dirección del Centro', data.datosLaborales?.direccionCentro, margin, currentY, contentWidth);
  currentY = addField('Teléfono del Centro', data.datosLaborales?.telefonoCentro, margin, currentY, contentWidth);
  
  currentY += 10;
  
  // 7. CLASIFICACIÓN MIGRATORIA
  currentY = checkPageBreak(50);
  currentY = addSection('7. CLASIFICACIÓN MIGRATORIA', currentY);
  
  const clasificacionLabels = {
    'PSE': 'Permiso de Salida Definitiva (PSD)',
    'PVE': 'Permiso de Viaje al Exterior (PVE)', 
    'PVT': 'Permiso de Viaje Temporal (PVT)',
    'PRE': 'Permiso de Residencia en el Exterior (PRE)'
  };
  
  currentY = addField('Clasificación al Salir de Cuba', clasificacionLabels[data.clasificacionMigratoria as keyof typeof clasificacionLabels] || data.clasificacionMigratoria, margin, currentY, contentWidth);
  currentY = addField('Fecha de Salida', data.lastTravelDate, margin, currentY, contentWidth);
  
  currentY += 10;
  
  // 8. REFERENCIA EN CUBA
  currentY = checkPageBreak(70);
  currentY = addSection('8. REFERENCIA EN CUBA', currentY);
  
  currentY = addTwoColumnFields('Nombre', data.referenciaEnCuba?.nombre, 'Parentesco', data.referenciaEnCuba?.parentesco, currentY);
  currentY = addTwoColumnFields('Teléfono', data.referenciaEnCuba?.telefono, '', '', currentY);
  currentY = addField('Dirección', data.referenciaEnCuba?.direccion, margin, currentY, contentWidth);
  
  currentY += 10;
  
  // 9. PASAPORTE ANTERIOR (si existe)
  if (data.pasaporteAnterior?.numero) {
    currentY = checkPageBreak(60);
    currentY = addSection('9. PASAPORTE ANTERIOR', currentY);
    
    currentY = addThreeColumnFields(
      { label: 'Número', value: data.pasaporteAnterior.numero },
      { label: 'Fecha Expedición', value: data.pasaporteAnterior.fechaExpedicion },
      { label: 'Lugar', value: data.pasaporteAnterior.lugar },
      currentY
    );
    
    currentY += 10;
  }
  
  // 10. CERTIFICADO DE NACIMIENTO
  currentY = checkPageBreak(50);
  currentY = addSection('10. CERTIFICACIÓN DE NACIMIENTO', currentY);
  
  currentY = addThreeColumnFields(
    { label: 'Tomo', value: data.certificadoNacimiento?.tomo },
    { label: 'Folio', value: data.certificadoNacimiento?.folio },
    { label: 'Registro Civil', value: data.certificadoNacimiento?.registroCivil },
    currentY
  );
  
  currentY += 10;
  
  // Add photograph if available (support both URL and base64)
  const photoSource = data.fotoUrl || data.fotoBase64;
  if (photoSource) {
    currentY = checkPageBreak(60);
    currentY = addSection('11. FOTOGRAFÍA PARA PASAPORTE', currentY);
    
    try {
      let imgData;
      if (data.fotoUrl && data.fotoUrl.startsWith('http')) {
        // For URL images, we need to fetch and convert to base64 for jsPDF
        const response = await fetch(data.fotoUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          imgData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          throw new Error('Failed to fetch image from URL');
        }
      } else {
        // Use base64 directly
        imgData = photoSource;
      }
      
      const imgWidth = 40; // 4cm
      const imgHeight = 40; // 4cm
      const imgX = margin + (contentWidth - imgWidth) / 2; // Center the image
      
      pdf.addImage(imgData, 'JPEG', imgX, currentY, imgWidth, imgHeight);
      
      // Photo border
      pdf.setDrawColor('#000000');
      pdf.setLineWidth(1);
      pdf.rect(imgX, currentY, imgWidth, imgHeight);
      
      // Photo caption
      pdf.setFontSize(9);
      pdf.setTextColor(secondaryColor);
      pdf.text('Fotografía tamaño pasaporte (4.5 x 4.5 cm)', pageWidth / 2, currentY + imgHeight + 8, { align: 'center' });
      
      currentY += imgHeight + 20;
    } catch (error) {
      console.warn('Error adding photo to PDF:', error);
      currentY = addField('Fotografía', 'Error al cargar la imagen', margin, currentY, contentWidth);
    }
  }
  
  // Add signature if available (support both URL and base64)
  const signatureSource = data.firmaUrl || data.firmaBase64;
  if (signatureSource) {
    currentY = checkPageBreak(50);
    currentY = addSection('12. FIRMA DEL SOLICITANTE', currentY);
    
    try {
      let sigData;
      if (data.firmaUrl && data.firmaUrl.startsWith('http')) {
        // For URL images, we need to fetch and convert to base64 for jsPDF
        const response = await fetch(data.firmaUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          sigData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          throw new Error('Failed to fetch signature from URL');
        }
      } else {
        // Use base64 directly
        sigData = signatureSource;
      }
      
      const sigWidth = 60;
      const sigHeight = 30;
      const sigX = margin + (contentWidth - sigWidth) / 2;
      
      pdf.addImage(sigData, 'PNG', sigX, currentY, sigWidth, sigHeight);
      
      // Signature border
      pdf.setDrawColor('#000000');
      pdf.setLineWidth(0.5);
      pdf.rect(sigX, currentY, sigWidth, sigHeight);
      
      currentY += sigHeight + 10;
    } catch (error) {
      console.warn('Error adding signature to PDF:', error);
      currentY = addField('Firma', 'Error al cargar la firma', margin, currentY, contentWidth);
    }
  }
  
  // Footer
  currentY = checkPageBreak(30);
  const footerY = pageHeight - 20;
  
  pdf.setDrawColor(borderColor);
  pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  pdf.setFontSize(8);
  pdf.setTextColor(secondaryColor);
  pdf.text('Documento generado automáticamente', margin, footerY - 3);
  pdf.text(`Página ${pdf.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 20, footerY - 3);
  pdf.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, footerY - 3, { align: 'center' });
  
  // Add page numbers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(secondaryColor);
    pdf.text(`${i} / ${totalPages}`, pageWidth - margin - 10, footerY - 3, { align: 'right' });
  }
  

    console.log("data")
     console.log(data)
    console.log(pdf)
  return pdf.output('blob');
};

/**
 * Download the detailed PDF
 */
export const downloadDetailedCubanPassportPDF = async (data: CubanPassportForm, fileName?: string): Promise<void> => {
  try {
    const pdfBlob = await generateDetailedCubanPassportPDF(data);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `pasaporte_cubano_detallado_${data.primerApellido}_${Date.now()}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating detailed PDF:', error);
    throw new Error('Error al generar el PDF detallado');
  }
};

/**
 * Print the detailed PDF directly
 */
export const printDetailedCubanPassportPDF = async (data: CubanPassportForm): Promise<void> => {
  try {

    console.log(data)
    const pdfBlob = await generateDetailedCubanPassportPDF(data);
    
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url);
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      throw new Error('No se pudo abrir la ventana de impresión');
    }
  } catch (error) {
    console.error('Error printing detailed PDF:', error);
    throw new Error('Error al imprimir el PDF detallado');
  }
};