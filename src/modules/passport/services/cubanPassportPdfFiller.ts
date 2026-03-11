import { CubanPassportForm } from '../types/cubanPassport';
import { devLog } from '../../../services/utils';

// This service requires pdf-lib to fill existing PDFs
declare const PDFLib: any; // Will be loaded dynamically

/**
 * Load pdf-lib library dynamically
 */
const loadPDFLib = async () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).PDFLib) {
      resolve((window as any).PDFLib);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    script.onload = () => {
      resolve((window as any).PDFLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Generate Cuban passport form PDF
 */
export const generateCubanPassportPDF = async (data: CubanPassportForm): Promise<Blob> => {
  const PDFLibrary = await loadPDFLib();
  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLibrary;
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add pages (2 pages for the form)
  const page1 = pdfDoc.addPage([612, 792]); // Letter size
  const page2 = pdfDoc.addPage([612, 792]);
  
  // Load fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Helper function to draw text
  const drawText = (
    page: any,
    text: string,
    x: number,
    y: number,
    options: any = {}
  ) => {
    page.drawText(text || '', {
      x,
      y,
      size: options.size || 10,
      font: options.bold ? helveticaBold : helvetica,
      color: options.color || rgb(0, 0, 0),
      ...options
    });
  };
  
  // Helper function to draw checkbox
  const drawCheckbox = (page: any, x: number, y: number, checked: boolean) => {
    if (checked) {
      drawText(page, 'X', x, y, { size: 12, bold: true });
    }
  };
  
  // Fill Page 1
  const fillPage1 = async () => {
    // Header
    drawText(page1, '(40498)', 540, 750, { size: 10 });
    
    // Title
    drawText(page1, 'SOLICITUD DE SERVICIO CONSULAR', 200, 720, { size: 14, bold: true });
    drawText(page1, 'Pasaporte por', 200, 700, { size: 11 });
    
    // Service type checkboxes
    drawCheckbox(page1, 280, 700, data.clasificacionMigratoria === 'PSE');
    drawText(page1, 'primera vez', 300, 700, { size: 10 });
    
    // Photo area
    drawText(page1, 'FOTO PEGADA', 80, 600, { size: 10, bold: true });
    drawText(page1, '(4 ½ X 4 ½)', 80, 580, { size: 8 });
    
    // Passport number box
    page1.drawRectangle({
      x: 420,
      y: 620,
      width: 150,
      height: 30,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    drawText(page1, 'No del Pasaporte', 430, 605, { size: 9 });
    if (data.pasaporteAnterior?.numero) {
      drawText(page1, data.pasaporteAnterior.numero, 430, 625, { size: 12, bold: true });
    }
    
    // Identity card
    drawText(page1, 'Carné de Identidad', 430, 580, { size: 9 });
    
    // Date fields
    const currentDate = new Date();
    drawText(page1, currentDate.getDate().toString(), 480, 550, { size: 11 });
    drawText(page1, (currentDate.getMonth() + 1).toString(), 510, 550, { size: 11 });
    drawText(page1, currentDate.getFullYear().toString(), 540, 550, { size: 11 });
    
    // Personal data section
    let yPos = 480;
    
    // Names
    drawText(page1, 'Primer Apellido', 50, yPos, { size: 9 });
    drawText(page1, data.primerApellido.toUpperCase(), 50, yPos - 15, { size: 11, bold: true });
    
    drawText(page1, 'Segundo Apellido', 200, yPos, { size: 9 });
    drawText(page1, data.segundoApellido.toUpperCase(), 200, yPos - 15, { size: 11, bold: true });
    
    yPos -= 40;
    
    drawText(page1, 'Primer Nombre', 50, yPos, { size: 9 });
    drawText(page1, data.primerNombre.toUpperCase(), 50, yPos - 15, { size: 11, bold: true });
    
    drawText(page1, 'Segundo Nombre', 350, yPos, { size: 9 });
    drawText(page1, (data.segundoNombre || '').toUpperCase(), 350, yPos - 15, { size: 11, bold: true });
    
    yPos -= 40;
    
    // Parents
    drawText(page1, 'Nombre', 50, yPos, { size: 9 });
    drawText(page1, data.nombre.toUpperCase(), 50, yPos - 15, { size: 11, bold: true });
    
    drawText(page1, 'Padre', 200, yPos, { size: 9 });
    drawText(page1, data.padre.toUpperCase(), 200, yPos - 15, { size: 11, bold: true });
    
    yPos -= 40;
    
    // Physical characteristics
    drawText(page1, 'Sexo', 50, yPos, { size: 9 });
    drawCheckbox(page1, 50, yPos - 20, data.sexo === 'M');
    drawText(page1, 'Masc', 70, yPos - 20, { size: 9 });
    drawCheckbox(page1, 110, yPos - 20, data.sexo === 'F');
    drawText(page1, 'Fem', 130, yPos - 20, { size: 9 });
    
    drawText(page1, 'Color Piel', 200, yPos, { size: 9 });
    drawText(page1, data.colorPiel, 200, yPos - 15, { size: 10 });
    
    drawText(page1, 'Color Cabello', 350, yPos, { size: 9 });
    drawText(page1, data.colorCabello, 350, yPos - 15, { size: 10 });
    
    drawText(page1, 'Color Ojos', 450, yPos, { size: 9 });
    drawText(page1, data.colorOjos, 450, yPos - 15, { size: 10 });
    
    yPos -= 40;
    
    // Height and characteristics
    drawText(page1, 'Estatura (cm)', 50, yPos, { size: 9 });
    drawText(page1, data.estatura, 50, yPos - 15, { size: 11, bold: true });
    
    drawText(page1, 'Características Especiales', 150, yPos, { size: 9 });
    drawText(page1, data.caracteristicasEspeciales || 'NINGUNA', 150, yPos - 15, { size: 10 });
    
    yPos -= 40;
    
    // Migration classification
    drawText(page1, 'Clasificación Migratoria al salir de Cuba', 50, yPos, { size: 9 });
    yPos -= 20;
    
    // Classification checkboxes
    const classifications = [
      { code: 'PSE', label: 'Permiso de Salida Indefinido (PSI)', x: 50 },
      { code: 'PVE', label: 'Permiso de Viaje al Exterior (PVE)', x: 200 },
      { code: 'PVT', label: 'Permiso de Viaje Temporal (PVT)', x: 350 },
      { code: 'PRE', label: 'Permiso de Residencia en el Exterior (PRE)', x: 450 }
    ];
    
    classifications.forEach(cls => {
      drawCheckbox(page1, cls.x, yPos, data.clasificacionMigratoria === cls.code);
      drawText(page1, cls.label, cls.x + 20, yPos, { size: 8 });
    });
    
    yPos -= 40;
    
    // Birth information
    drawText(page1, 'Lugar de Nacimiento', 50, yPos, { size: 9 });
    yPos -= 20;
    
    drawText(page1, 'País', 50, yPos, { size: 9 });
    drawText(page1, data.lugarNacimiento.pais.toUpperCase(), 50, yPos - 15, { size: 11, bold: true });
    
    drawText(page1, 'Provincia', 150, yPos, { size: 9 });
    drawText(page1, data.lugarNacimiento.provincia.toUpperCase(), 150, yPos - 15, { size: 11, bold: true });
    
    drawText(page1, 'Municipio', 350, yPos, { size: 9 });
    drawText(page1, data.lugarNacimiento.municipio.toUpperCase(), 350, yPos - 15, { size: 11, bold: true });
    
    yPos -= 40;
    
    // Birth date
    drawText(page1, 'Fecha Nacimiento', 450, yPos + 40, { size: 9 });
    drawText(page1, 'Día', 420, yPos + 20, { size: 9 });
    drawText(page1, data.lugarNacimiento.diaNacimiento, 450, yPos + 20, { size: 11, bold: true });
    drawText(page1, 'Mes', 480, yPos + 20, { size: 9 });
    drawText(page1, data.lugarNacimiento.mesNacimiento, 510, yPos + 20, { size: 11, bold: true });
    drawText(page1, 'Año', 540, yPos + 20, { size: 9 });
    drawText(page1, data.lugarNacimiento.anoNacimiento, 550, yPos + 20, { size: 11, bold: true });
    
    // Current address
    drawText(page1, 'Dirección de la Residencia Actual', 50, yPos, { size: 9 });
    yPos -= 20;
    
    drawText(page1, 'Dirección (calle, ave o apto, entre calles)', 50, yPos, { size: 8 });
    drawText(page1, data.direccionActual.calle.toUpperCase(), 50, yPos - 15, { size: 10, bold: true });
    
    yPos -= 40;
    
    drawText(page1, 'Provincia - Estado - Región', 50, yPos, { size: 9 });
    drawText(page1, data.direccionActual.provincia.toUpperCase(), 50, yPos - 15, { size: 10, bold: true });
    
    drawText(page1, 'País', 300, yPos, { size: 9 });
    drawText(page1, data.direccionActual.pais.toUpperCase(), 300, yPos - 15, { size: 10, bold: true });
    
    drawText(page1, 'Código Postal', 450, yPos, { size: 9 });
    drawText(page1, data.direccionActual.codigoPostal, 450, yPos - 15, { size: 10, bold: true });
    
    yPos -= 40;
    
    // Contact
    drawText(page1, 'Teléfono', 50, yPos, { size: 9 });
    drawText(page1, data.telefono, 50, yPos - 15, { size: 10, bold: true });
    
    drawText(page1, 'Fax', 200, yPos, { size: 9 });
    drawText(page1, data.fax || '', 200, yPos - 15, { size: 10 });
    
    drawText(page1, 'E-mail', 350, yPos, { size: 9 });
    drawText(page1, data.email, 350, yPos - 15, { size: 10 });
    
    yPos -= 40;
    
    // Work information
    drawText(page1, 'Datos Laborales o de Estudio Actual', 50, yPos, { size: 9, bold: true });
    yPos -= 20;
    
    drawText(page1, 'PROFESION', 50, yPos, { size: 9 });
    drawText(page1, data.datosLaborales.profesion.toUpperCase(), 50, yPos - 15, { size: 10, bold: true });
    
    drawText(page1, 'OBRERO', 200, yPos, { size: 9 });
    drawText(page1, data.datosLaborales.ocupacion.toUpperCase(), 200, yPos - 15, { size: 10, bold: true });
    
    drawText(page1, 'MECANICO', 350, yPos, { size: 9 });
    drawText(page1, 'Ocupación', 350, yPos + 10, { size: 8 });
    
    yPos -= 40;
    
    drawText(page1, 'Nombre del Centro de Trabajo / Estudio', 50, yPos, { size: 9 });
    drawText(page1, data.datosLaborales.nombreCentroTrabajo.toUpperCase(), 50, yPos - 15, { size: 10, bold: true });
    
    yPos -= 30;
    
    drawText(page1, 'Dirección (calle, ave, etc, entre calles)', 50, yPos, { size: 9 });
    drawText(page1, data.datosLaborales.direccionCentro.toUpperCase(), 50, yPos - 15, { size: 10, bold: true });
    
    drawText(page1, 'Teléfono', 400, yPos, { size: 9 });
    drawText(page1, data.datosLaborales.telefonoCentro, 400, yPos - 15, { size: 10 });
    
    yPos -= 40;
    
    // Additional information
    drawText(page1, 'Observaciones:', 50, yPos, { size: 9 });
    
    // Signature area at bottom
    if (data.firmaBase64) {
      page1.drawImage(await pdfDoc.embedPng(data.firmaBase64), {
        x: 350,
        y: 50,
        width: 150,
        height: 60
      });
    }
    
    page1.drawLine({
      start: { x: 350, y: 50 },
      end: { x: 500, y: 50 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    drawText(page1, 'Firma y Cuño del Funcionario', 375, 35, { size: 8 });
  };
  
  // Fill Page 2
  const fillPage2 = () => {
    // Header
    drawText(page2, '(40498)', 540, 750, { size: 10 });
    
    // Level of education
    drawText(page2, 'Nivel Escolar', 50, 700, { size: 9 });
    drawText(page2, data.datosLaborales.nivelEscolar.toUpperCase(), 50, 680, { size: 11, bold: true });
    
    // Reference in Cuba
    drawText(page2, 'Nombres y Apellidos de la referencia en Cuba', 50, 640, { size: 9 });
    drawText(page2, data.referenciaEnCuba.nombre.toUpperCase(), 50, 620, { size: 11, bold: true });
    
    drawText(page2, 'Parentesco', 350, 640, { size: 9 });
    drawText(page2, data.referenciaEnCuba.parentesco.toUpperCase(), 350, 620, { size: 11, bold: true });
    
    // Reference address
    drawText(page2, 'Dirección de la Referencia (incluir la provincia)', 50, 580, { size: 9 });
    drawText(page2, data.referenciaEnCuba.direccion.toUpperCase(), 50, 560, { size: 10 });
    
    // Residence in Cuba
    drawText(page2, 'Lugar de Residencia en Cuba (dos últimas direcciones)', 50, 500, { size: 9 });
    
    // Table for residence
    const tableY = 460;
    page2.drawLine({
      start: { x: 50, y: tableY + 20 },
      end: { x: 550, y: tableY + 20 },
      thickness: 1
    });
    
    page2.drawLine({
      start: { x: 50, y: tableY },
      end: { x: 550, y: tableY },
      thickness: 1
    });
    
    drawText(page2, 'Desde', 350, tableY + 5, { size: 9 });
    drawText(page2, 'Hasta', 450, tableY + 5, { size: 9 });
    
    // Other fields
    let yPos2 = 380;
    
    drawText(page2, 'Apellidos de soltera', 50, yPos2, { size: 9 });
    drawText(page2, data.apellidosSoltera || '', 50, yPos2 - 15, { size: 10 });
    
    drawText(page2, 'Otros nombres', 200, yPos2, { size: 9 });
    drawText(page2, data.otrosNombres || '', 200, yPos2 - 15, { size: 10 });
    
    drawText(page2, 'Número de residencia', 350, yPos2, { size: 9 });
    drawText(page2, data.numeroResidencia || '', 350, yPos2 - 15, { size: 10 });
    
    drawText(page2, 'Pasaporte extranjero', 480, yPos2, { size: 9 });
    drawText(page2, data.pasaporteExtranjero || '', 480, yPos2 - 15, { size: 10 });
    
    yPos2 -= 60;
    
    // Expired passport section
    drawText(page2, 'Para la confección del Pasaporte el titular presentó y se comprobó con:', 50, yPos2, { size: 9 });
    yPos2 -= 20;
    
    drawText(page2, 'Pasaporte vencido:', 50, yPos2, { size: 9 });
    
    yPos2 -= 30;
    
    if (data.pasaporteAnterior) {
      drawText(page2, 'Número', 50, yPos2, { size: 9 });
      drawText(page2, data.pasaporteAnterior.numero, 100, yPos2, { size: 10, bold: true });
      
      drawText(page2, 'Fecha de expedición', 250, yPos2, { size: 9 });
      drawText(page2, data.pasaporteAnterior.fechaExpedicion || '', 350, yPos2, { size: 10 });
      
      drawText(page2, 'Lugar', 450, yPos2, { size: 9 });
      drawText(page2, data.pasaporteAnterior.lugar || '', 480, yPos2, { size: 10 });
    }
    
    yPos2 -= 40;
    
    // Birth certificate
    drawText(page2, 'Certificación de Nacimiento:', 50, yPos2, { size: 9 });
    yPos2 -= 20;
    
    drawText(page2, 'Tomo', 50, yPos2, { size: 9 });
    drawText(page2, data.certificadoNacimiento.tomo || '', 100, yPos2, { size: 10 });
    
    drawText(page2, 'Folio', 200, yPos2, { size: 9 });
    drawText(page2, data.certificadoNacimiento.folio || '', 250, yPos2, { size: 10 });
    
    drawText(page2, 'Registro Civil', 350, yPos2, { size: 9 });
    drawText(page2, data.certificadoNacimiento.registroCivil || '', 430, yPos2, { size: 10 });
    
    yPos2 -= 40;
    
    // Consular registration
    drawText(page2, 'Inscripción Consular', 50, yPos2, { size: 9, bold: true });
    
    yPos2 -= 30;
    
    if (data.inscripcionConsular) {
      drawText(page2, 'Número', 50, yPos2, { size: 9 });
      drawText(page2, data.inscripcionConsular.numero, 100, yPos2, { size: 10 });
      
      drawText(page2, 'De Fecha', 250, yPos2, { size: 9 });
      drawText(page2, data.inscripcionConsular.fecha, 320, yPos2, { size: 10 });
    }
    
    drawText(page2, 'Arancel', 450, yPos2 + 30, { size: 9 });
    drawText(page2, '$', 490, yPos2 + 10, { size: 12 });
    drawText(page2, data.arancel || '', 500, yPos2 + 10, { size: 12, bold: true });
    
    yPos2 -= 40;
    
    // Consular valuation
    drawText(page2, 'Valoración Consular', 50, yPos2, { size: 10, bold: true });
    
    // Large text area for consular notes
    page2.drawRectangle({
      x: 50,
      y: 80,
      width: 500,
      height: yPos2 - 100,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    // Bottom signature line
    page2.drawLine({
      start: { x: 350, y: 50 },
      end: { x: 500, y: 50 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    drawText(page2, 'Firma y Cuño del Funcionario', 375, 35, { size: 8 });
  };
  
  // Fill both pages
  await fillPage1();
  fillPage2();
  
  // Save and return
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Fill an existing Cuban passport PDF template
 */
export const fillCubanPassportTemplate = async (
  templatePdfBytes: ArrayBuffer,
  data: CubanPassportForm
): Promise<Blob> => {
  const PDFLibrary = await loadPDFLib();
  const { PDFDocument } = PDFLibrary;
  
  // Load the existing PDF
  const pdfDoc = await PDFDocument.load(templatePdfBytes);
  const pages = pdfDoc.getPages();
  
  if (pages.length < 2) {
    throw new Error('Template PDF must have at least 2 pages');
  }
  
  // Get form fields (if the PDF has form fields)
  const form = pdfDoc.getForm();
  
  try {
    // Try to fill form fields if they exist
    const fields = form.getFields();
    
    // Map data to form fields
    const fieldMappings: Record<string, string | undefined> = {
      'primer_apellido': data.primerApellido,
      'segundo_apellido': data.segundoApellido,
      'primer_nombre': data.primerNombre,
      'segundo_nombre': data.segundoNombre,
      'nombre': data.nombre,
      'padre': data.padre,
      'telefono': data.telefono,
      'email': data.email,
      // Add more field mappings as needed
    };
    
    // Fill each field
    fields.forEach(field => {
      const fieldName = field.getName();
      const value = fieldMappings[fieldName];
      
      if (value && field.constructor.name === 'PDFTextField') {
        field.setText(value);
      }
    });
    
    // Flatten the form to make fields non-editable
    form.flatten();
  } catch (error) {
    devLog('No form fields found, using coordinate-based approach');
    // If no form fields, fall back to the coordinate-based approach
    return generateCubanPassportPDF(data);
  }
  
  // Add signature if provided
  if (data.firmaBase64) {
    try {
      const page1 = pages[0];
      const signatureImage = await pdfDoc.embedPng(data.firmaBase64);
      
      page1.drawImage(signatureImage, {
        x: 350,
        y: 50,
        width: 150,
        height: 60
      });
    } catch (error) {
      devLog('Error adding signature:', error);
    }
  }
  
  // Save and return
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};