import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, rgb } from 'pdf-lib';
import { CubanPassportForm } from '../modules/passport/types/cubanPassport';

/**
 * Fill the official Cuban passport PDF form with application data
 */
export const fillCubanPassportPDF = async (data: CubanPassportForm): Promise<Blob> => {
  try {
    // Fetch the PDF template from the URL
    const templateUrl = 'https://qvamarkets.com/gql_api/getStatic?fileName=passportkva2.pdf';
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF template: ${response.status} ${response.statusText}`);
    }
    
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all form fields to understand the structure
    const fields = form.getFields();
  
    
    const textFields: any = [];
    const checkBoxes = [];
    

    fields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name;
      
      //console.log(`${index + 1}. "${name}" (${type})`);
      if (type === 'PDFTextField2') {
        textFields.push(name); 
      } else if (type === 'PDFCheckBox') {
        checkBoxes.push(name);
      }
    });

    
   //console.log('');
    //console.log('TEXT FIELDS:', textFields);
    //console.log('CHECKBOXES:', checkBoxes);
    //console.log('='.repeat(60));
    
    // DEBUGGING: Create a test version that fills fields with their own names
    if (data.primerApellido === 'DEBUG_MODE') {}
      //console.log('\n🔍 DEBUG MODE: Filling fields with their names for identification');
      const textFieldsList = form.getFields().filter(f => f.constructor.name === 'PDFTextField2');

     
      
      textFieldsList.forEach((field, index) => {
        try {
          const name = field.getName();
          //(field as any).setText(`${name}`);
          (field as any).setFontSize(9);

          //console.log(`✓ Debug filled field ${index}: "${name}"`);
        } catch (error) {
          console.warn(`✗ Could not debug fill field ${index}`);
        }
      });
      
      // Return early for debug mode
     // const pdfBytesOutput = await pdfDoc.save();
    //  return new Blob([pdfBytesOutput], { type: 'application/pdf' });
    
    
    // Helper function to safely fill text fields
    const fillTextField = (fieldName: string, value: string | undefined) => {
      try {
        if (value && value.trim()) {
          const field = form.getTextField(fieldName);
          field.setText(value);
          //console.log(`✓ Filled field "${fieldName}" with value: "${value}"`);
        }
      } catch (error) {
        console.warn(`✗ Could not fill field "${fieldName}":`, error);
      }
    };
    
    // Helper function to safely check checkboxes
    const checkBox = (fieldName: string, shouldCheck: boolean) => {
      try {
        if (shouldCheck) {
          const field = form.getCheckBox(fieldName);
          field.check();
          //console.log(`✓ Checked box "${fieldName}"`);
        }
      } catch (error) {
        console.warn(`✗ Could not check box "${fieldName}":`, error);
      }
    };
    
    // Helper function to try multiple field name variations
    const tryFillTextField = (fieldNames: string[], value: string | undefined, label: string = '') => {
      if (!value || !value.trim()) {
        //console.log(`⚠ Skipping empty value for ${label || 'field'}`);
        return false;
      }
      
      for (const fieldName of fieldNames) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(value);
          //console.log(`✓ SUCCESS: Filled "${fieldName}" with "${value}" (${label})`);
          return true;
        } catch (error) {
          // Continue to next field name variation
        }
      }
      console.warn(`✗ FAILED: Could not fill "${label}" with value "${value}". Tried fields: ${fieldNames.join(', ')}`);
      return false;
    };
    
    // Try to fill fields systematically by their position/index
    const tryFillByIndex = (index: number, value: string | undefined, label: string = '') => {
      if (!value || !value.trim()) return false;
      
      try {
        const fields = form.getFields().filter(f => f.constructor.name === 'PDFTextField');
        if (index < fields.length) {
          const field = fields[index] as any;
          field.setText(value);
          //console.log(`✓ SUCCESS: Filled field by index ${index} ("${field.getName()}") with "${value}" (${label})`);
          return true;
        }
      } catch (error) {
        console.warn(`✗ FAILED: Could not fill field by index ${index} for ${label}`);
      }
      return false;
    };
    
    //console.log('\n=== FILLING PERSONAL INFORMATION ===');
    // Use the actual field names from the PDF
    
    fillTextField('Primer apellido', data.primerApellido);
    fillTextField('Segundo apellido', data.segundoApellido);
    fillTextField('Primer nombre', data.primerNombre);
    fillTextField('Segundo nombre', data.segundoNombre);
    fillTextField('Padre', data.padre);
    fillTextField('Madre', data.nombre);
    fillTextField('Carné de Identidad', data.cid);
    
    //console.log('\n=== FILLING PHYSICAL CHARACTERISTICS ===');
    // Fill Physical Characteristics
    fillTextField('Estaturacm', data.estatura);
    fillTextField('Características especiales', data.caracteristicasEspeciales || 'NINGUNA');
    
    // Handle skin color checkboxes
    if (data.colorPiel) {
      if (data.colorPiel.toLowerCase().includes('blanca')) checkBox('Blanca', true);
      if (data.colorPiel.toLowerCase().includes('negra')) checkBox('Negra', true);
      if (data.colorPiel.toLowerCase().includes('amarilla')) checkBox('Amarilla', true);
      if (data.colorPiel.toLowerCase().includes('mestiza')) checkBox('Mestiza', true);
      if (data.colorPiel.toLowerCase().includes('albina')) checkBox('Albina', true);
    }
    
    // Handle hair color checkboxes
    if (data.colorCabello) {
      if (data.colorCabello.toLowerCase().includes('negro')) checkBox('Negro', true);
      if (data.colorCabello.toLowerCase().includes('rubio')) checkBox('Rubio', true);
      if (data.colorCabello.toLowerCase().includes('castaño')) checkBox('Castaño', true);
      if (data.colorCabello.toLowerCase().includes('canoso')) checkBox('Canoso', true);
      if (data.colorCabello.toLowerCase().includes('rojo')) checkBox('Rojo', true);
    }
    
    // Handle eye color checkboxes
    if (data.colorOjos) {
      if (data.colorOjos.toLowerCase().includes('claros')) checkBox('Claros', true);
      if (data.colorOjos.toLowerCase().includes('negros')) checkBox('Negros', true);
      if (data.colorOjos.toLowerCase().includes('pardos')) checkBox('Pardos', true);
    }
    
    //console.log('\n=== FILLING BIRTH INFORMATION ===');
    // Fill Birth Information
    if (data.lugarNacimiento) {
      fillTextField('País', data.lugarNacimiento.pais);
      fillTextField('Provincia', data.lugarNacimiento.provincia);
      fillTextField('Municipio Ciudad', data.lugarNacimiento.municipio);

      fillTextField('DíaRow1_3', data.lugarNacimiento.diaNacimiento);
      fillTextField('MesRow1_3', data.lugarNacimiento.mesNacimiento);
      fillTextField('AñoRow1_2', data.lugarNacimiento.anoNacimiento);
    }
    


    

    //console.log('\n=== FILLING CURRENT ADDRESS ===');
    // Fill Current Address
    if (data.direccionActual) {
      fillTextField('Lugar de Residencia actual Dirección Calle Ave Nr Apto entre calles', data.direccionActual.calle);
      fillTextField('Provincia  Estado  Región',data.direccionActual.municipio +", "+ data.direccionActual.provincia);
      fillTextField('País_2', data.direccionActual.pais);
      fillTextField('Código Postal', data.direccionActual.codigoPostal);
    }
    
    //console.log('\n=== FILLING CONTACT INFORMATION ===');
    // Fill Contact Information
    fillTextField('Teléfono', data.telefono);
    fillTextField('Fax', data.fax);
    fillTextField('Email', data.email);
    fillTextField('Estado Civil', data.civilStatus);

   
    fillTextField('undefined_4', "undefined_4");
       
    fillTextField('undefined_4', "undefined_4");

     checkBox('undefined_4', data.sexo==="M");
      checkBox('undefined_5', data.sexo==="F");
    
    
    //console.log('\n=== FILLING WORK INFORMATION ===');
    // Fill Work Information
    if (data.datosLaborales) {
      fillTextField('Datos Laborales o de Estudio actual Nombre de Centro de Trabajo Estudio', data.datosLaborales.nombreCentroTrabajo);
      fillTextField('Profesión', data.datosLaborales.profesion);
      fillTextField('Ocupación', data.datosLaborales.ocupacion);
      fillTextField('Nivel de escolaridad', data.datosLaborales.nivelEscolar);
      fillTextField('Dirección calle ave nr apto entre calles', data.datosLaborales.direccionCentro);
      fillTextField('Teléfono_2', data.datosLaborales.telefonoCentro);
    }
    
    //console.log('\n=== FILLING MIGRATION CLASSIFICATION ===');
    // Fill Migration Classification checkboxes based on the actual checkbox names
    if (data.clasificacionMigratoria) {
      // Based on the PDF fields, these seem to be the migration status options
      checkBox('Permiso de Emigración', data.clasificacionMigratoria === 'PSE');
      checkBox('Permiso de Viaje al', data.clasificacionMigratoria === 'PVE'); 
      checkBox('PVT', data.clasificacionMigratoria === 'PVT');
      checkBox('PREE', data.clasificacionMigratoria === 'PRE');
      checkBox('RE', data.clasificacionMigratoria === 'RE');
      checkBox('PSI', data.clasificacionMigratoria === 'PSI');
    }

  if (data.lastOutCubaDate) {

  
      fillTextField('DíaRow1_2', data.lastOutCubaDate.dd);
      fillTextField('MesRow1_2',data.lastOutCubaDate.mm);
      fillTextField('AñoRow', data.lastOutCubaDate.yyyy);
  
  
  }
    
   // fillTextField('De Fecha', data.lastTravelDate);
    
    // Fill date fields at the top of the form
    const today = new Date();
    fillTextField('DíaRow1', today.getDate().toString().padStart(2, '0'));
    fillTextField('MesRow1', (today.getMonth() + 1).toString().padStart(2, '0'));
    fillTextField('AñoRow1', today.getFullYear().toString());
    
    //console.log('\n=== FILLING REFERENCE IN CUBA ===');
    // Fill Reference in Cuba
    if (data.referenciaEnCuba) {
      fillTextField('Nombre y apellidos de la referencia en Cuba persona que puede ser contactada para verificar sus generales añadir de ser posible el número telefónico', 
        `${data.referenciaEnCuba.nombre}${data.referenciaEnCuba.telefono ? ' - Tel: ' + data.referenciaEnCuba.telefono : ''}${data.referenciaEnCuba.parentesco ? ' - ' + data.referenciaEnCuba.parentesco : ''}`);
      fillTextField('Dirección de la Referencia incluir la provincia', data.referenciaEnCuba.direccion);
    }
    
    //console.log('\n=== FILLING PREVIOUS PASSPORT ===');
    // Fill Previous Passport
    if (data.pasaporteAnterior?.numero) {
      fillTextField('Número', data.pasaporteAnterior.numero);
      fillTextField('Número de Pasaporte', data.pasaporteAnterior.numero);
      fillTextField('Fecha de expedición', data.pasaporteAnterior.fechaExpedicion);
      fillTextField('Lugar', data.pasaporteAnterior.lugar);
    }
    
    //console.log('\n=== FILLING BIRTH CERTIFICATE ===');
    // Fill Birth Certificate
    if (data.certificadoNacimiento) {
      fillTextField('Tomo', data.certificadoNacimiento.tomo);
      fillTextField('Folio', data.certificadoNacimiento.folio);
      fillTextField('Registro Civil', data.certificadoNacimiento.registroCivil);
    }
    
    // Helper function to get image data from URL or base64
    const getImageBytes = async (imageSource: string): Promise<Uint8Array> => {
      if (imageSource.startsWith('http')) {
        // It's a URL - fetch the image
        const response = await fetch(imageSource);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
      } else {
        // It's base64 data
        const base64Data = imageSource.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      }
    };

    // Add photo if available (support both URL and base64)
    const photoSource = null 
    //data.fotoUrl || data.fotoBase64;
    if (photoSource) {
      try {
        const imageBytes = await getImageBytes(photoSource);
        
        // Embed image in the PDF (try both JPG and PNG)
        let image;
        try {
          image = await pdfDoc.embedJpg(imageBytes);
        } catch {
          image = await pdfDoc.embedPng(imageBytes);
        }
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Position for passport photo (adjust based on the actual form)
        const photoX = 450;
        const photoY = 650;
        const photoWidth = 100;
        const photoHeight = 100;
        
        firstPage.drawImage(image, {
          x: photoX,
          y: photoY,
          width: photoWidth,
          height: photoHeight,
        });
        
        console.log(`✓ Added photo to PDF (source: ${data.fotoUrl ? 'URL' : 'base64'})`);
      } catch (error) {
        console.warn('Could not add photo to PDF:', error);
      }
    }
    
    // Add signature if available (support both URL and base64)
    const signatureSource = null
    //data.firmaUrl || data.firmaBase64;
    if (signatureSource) {
      try {
        const imageBytes = await getImageBytes(signatureSource);
        
        // Embed signature image in the PDF (try both PNG and JPG)
        let image;
        try {
          image = await pdfDoc.embedPng(imageBytes);
        } catch {
          image = await pdfDoc.embedJpg(imageBytes);
        }
        
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        
        // Position for signature (adjust based on the actual form)
        const sigX = 100;
        const sigY = 100;
        const sigWidth = 200;
        const sigHeight = 60;
        
        lastPage.drawImage(image, {
          x: sigX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
        
        console.log(`✓ Added signature to PDF (source: ${data.firmaUrl ? 'URL' : 'base64'})`);
      } catch (error) {
        console.warn('Could not add signature to PDF:', error);
      }
    }
    
    // Flatten the form to make fields non-editable
    form.flatten();
    
    // Save the PDF
    const pdfBytesOutput = await pdfDoc.save();
    
    return new Blob([pdfBytesOutput], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('Error filling Cuban passport PDF:', error);
    throw new Error('Failed to fill PDF form: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Generate and download the filled Cuban passport PDF
 */
export const generateCubanPassportPDF = async (data: CubanPassportForm): Promise<Blob> => {
  return fillCubanPassportPDF(data);
};

/**
 * Download the filled PDF
 */
export const downloadFilledCubanPassportPDF = async (data: CubanPassportForm, fileName?: string): Promise<void> => {
  try {
    const pdfBlob = await fillCubanPassportPDF(data);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `pasaporte_cubano_${data.primerApellido}_${Date.now()}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading filled PDF:', error);
    throw new Error('Error al descargar el PDF lleno');
  }
};