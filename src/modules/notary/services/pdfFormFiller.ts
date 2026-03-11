import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, rgb } from 'pdf-lib';
import { NotaryCustomer } from '../types';
import { PDFFormTemplate, PDFFillRequest, PDFFillResult } from '../types/pdfForms';
import { getNestedValue } from '../config/pdfFormTemplates';
import { devLog } from '../../../services/utils';

/**
 * Fill a PDF form with customer data
 */
export const fillPDFForm = async (request: PDFFillRequest): Promise<PDFFillResult> => {
  try {
    const { templateId, customer, options } = request;
    const { flatten = true, includeImages = true, includeDebugInfo = false } = options || {};

    // Get the PDF template
    const { getTemplateById } = await import('../config/pdfFormTemplates');
    const template = getTemplateById(templateId);

    if (!template) {
      return {
        success: false,
        error: `Template with ID "${templateId}" not found`
      };
    }

    // Load the PDF template
    let pdfBytes: ArrayBuffer;

    if (template.templateUrl) {
      const response = await fetch(template.templateUrl);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch PDF template: ${response.status} ${response.statusText}`
        };
      }
      pdfBytes = await response.arrayBuffer();
    } else {
      // Create a blank PDF if no template URL is provided
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      page.drawText('PDF Template not configured', { x: 50, y: 750, size: 12 });
      pdfBytes = await pdfDoc.save();
    }

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const filledFields: string[] = [];
    const skippedFields: string[] = [];

    // Fill text fields
    for (const mapping of template.fieldMappings) {
      try {
        // Get value from customer data
        let value = getNestedValue(customer, mapping.customerDataPath);

        // Apply transformation if provided
        if (mapping.transform && value !== undefined && value !== null) {
          value = mapping.transform(value);
        }

        // Use default value if no value found
        if ((value === undefined || value === null || value === '') && mapping.defaultValue) {
          value = mapping.defaultValue;
        }

        // Skip if still no value
        if (value === undefined || value === null || value === '') {
          skippedFields.push(mapping.pdfFieldName);
          continue;
        }

        // Convert value to string
        const stringValue = String(value);

        // Try to fill the field
        try {
          const field = form.getTextField(mapping.pdfFieldName);
          field.setText(stringValue);
          filledFields.push(mapping.pdfFieldName);

          if (includeDebugInfo) {
            devLog(`✓ Filled "${mapping.pdfFieldName}" with "${stringValue}"`);
          }
        } catch (fieldError) {
          // Field doesn't exist or wrong type
          skippedFields.push(mapping.pdfFieldName);
          if (includeDebugInfo) {
            devLog(`✗ Could not fill field "${mapping.pdfFieldName}"`);
          }
        }
      } catch (error) {
        skippedFields.push(mapping.pdfFieldName);
        if (includeDebugInfo) {
          devLog(`✗ Error processing field "${mapping.pdfFieldName}":`, error);
        }
      }
    }

    // Fill checkboxes
    if (template.checkboxFields) {
      for (const checkboxMapping of template.checkboxFields) {
        try {
          const shouldCheck = checkboxMapping.condition(customer);

          if (shouldCheck) {
            try {
              const field = form.getCheckBox(checkboxMapping.pdfFieldName);
              field.check();
              filledFields.push(checkboxMapping.pdfFieldName);

              if (includeDebugInfo) {
                devLog(`✓ Checked "${checkboxMapping.pdfFieldName}"`);
              }
            } catch (fieldError) {
              skippedFields.push(checkboxMapping.pdfFieldName);
              if (includeDebugInfo) {
                devLog(`✗ Could not check field "${checkboxMapping.pdfFieldName}"`);
              }
            }
          }
        } catch (error) {
          skippedFields.push(checkboxMapping.pdfFieldName);
          if (includeDebugInfo) {
            devLog(`✗ Error processing checkbox "${checkboxMapping.pdfFieldName}":`, error);
          }
        }
      }
    }

    // Add images
    if (includeImages && template.imageFields) {
      for (const imageMapping of template.imageFields) {
        try {
          const imageSource = getNestedValue(customer, imageMapping.customerDataPath);

          if (imageSource && imageMapping.position) {
            const imageBytes = await getImageBytes(imageSource);

            // Try to embed as JPG first, then PNG
            let image;
            try {
              image = await pdfDoc.embedJpg(imageBytes);
            } catch {
              try {
                image = await pdfDoc.embedPng(imageBytes);
              } catch {
                devLog(`Could not embed image for "${imageMapping.customerDataPath}"`);
                continue;
              }
            }

            const pages = pdfDoc.getPages();
            const page = pages[imageMapping.position.page];

            if (page) {
              page.drawImage(image, {
                x: imageMapping.position.x,
                y: imageMapping.position.y,
                width: imageMapping.position.width,
                height: imageMapping.position.height
              });

              filledFields.push(`IMAGE: ${imageMapping.customerDataPath}`);

              if (includeDebugInfo) {
                devLog(`✓ Added image from "${imageMapping.customerDataPath}"`);
              }
            }
          }
        } catch (error) {
          if (includeDebugInfo) {
            devLog(`✗ Error adding image from "${imageMapping.customerDataPath}":`, error);
          }
        }
      }
    }

    // Flatten the form if requested
    if (flatten) {
      form.flatten();
    }

    // Save the PDF
    const pdfBytesOutput = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytesOutput], { type: 'application/pdf' });

    return {
      success: true,
      pdfBlob,
      filledFields,
      skippedFields
    };

  } catch (error) {
    devLog('Error filling PDF form:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Helper function to get image bytes from URL or base64
 */
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

/**
 * Fill multiple PDF forms with the same customer data
 */
export const fillMultiplePDFForms = async (
  templateIds: string[],
  customer: NotaryCustomer,
  options?: PDFFillRequest['options']
): Promise<Record<string, PDFFillResult>> => {
  const results: Record<string, PDFFillResult> = {};

  for (const templateId of templateIds) {
    const result = await fillPDFForm({
      templateId,
      customer,
      options
    });

    results[templateId] = result;
  }

  return results;
};

/**
 * Download filled PDF
 */
export const downloadFilledPDF = (
  pdfBlob: Blob,
  customer: NotaryCustomer,
  templateName: string
): void => {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${templateName}_${customer.lastName}_${customer.firstName}_${Date.now()}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Preview PDF in new window
 */
export const previewPDF = (pdfBlob: Blob): void => {
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
};

/**
 * Discover form fields in a PDF (for debugging/mapping)
 */
export const discoverPDFFields = async (pdfUrl: string): Promise<{
  textFields: string[];
  checkboxes: string[];
  radioButtons: string[];
  dropdowns: string[];
}> => {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const textFields: string[] = [];
    const checkboxes: string[] = [];
    const radioButtons: string[] = [];
    const dropdowns: string[] = [];

    fields.forEach((field) => {
      const name = field.getName();
      const type = field.constructor.name;

      switch (type) {
        case 'PDFTextField':
          textFields.push(name);
          break;
        case 'PDFCheckBox':
          checkboxes.push(name);
          break;
        case 'PDFRadioGroup':
          radioButtons.push(name);
          break;
        case 'PDFDropdown':
          dropdowns.push(name);
          break;
      }
    });

    return {
      textFields,
      checkboxes,
      radioButtons,
      dropdowns
    };
  } catch (error) {
    devLog('Error discovering PDF fields:', error);
    throw error;
  }
};
