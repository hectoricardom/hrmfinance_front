import { Component, createSignal, onMount, For, Show, createMemo } from 'solid-js';
import { Card, Button } from '../../ui';
import { NotaryCustomer, FormTemplate } from '../types';
import { extractPDFFormFields, PDFFormField } from '../services/pdfFormReader';
import { FormFieldMapping, CLIENT_FIELD_PATHS, getValueByPath, evaluateConditional, getConditionalDescription } from '../types/formMapping';
import { createFormTemplate, saveTemplateToServer, updateTemplateToServer } from '../services/formTemplateService';
import { processClientData, ProcessedClientData, createMergedCustomerData } from '../services/clientDataProcessor';
import { PDFDocument } from 'pdf-lib';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

interface PDFFieldMapperProps {
  pdfFile: File;
  customer: NotaryCustomer;
  existingTemplate?: FormTemplate; // For editing existing templates
  onClose?: () => void;
  onSave?: (template: FormTemplate) => void;
}

interface MappedField {
  pdfField: PDFFormField;
  customerField: string;
  customerValue: string | undefined;
  pdfValue: string; // Always converted to string
  matches: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  conditional?: FormFieldMapping['conditional'];
  // Checkbox-specific settings
  checkboxBehavior?: {
    type: 'always_true' | 'always_false' | 'based_on_field';
    fieldPath?: string; // For 'based_on_field' type
  };
  // Custom value support
  useCustomValue?: boolean; // If true, use customValue instead of customerField
  customValue?: string; // Static custom value to fill into the PDF field
  // Mapping approval status
  reviewed: boolean;
  approved: boolean;
  rejectionReason?: string;
}

const PDFFieldMapper: Component<PDFFieldMapperProps> = (props) => {
  const [pages, setPages] = createSignal<HTMLCanvasElement[]>([]);
  const [mappedFields, setMappedFields] = createSignal<MappedField[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedField, setSelectedField] = createSignal<MappedField | null>(null);
  const [showOverlays, setShowOverlays] = createSignal(true);
  const [scale, setScale] = createSignal(1.5);
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'matches' | 'mismatches' | 'empty'>('all');
  const [savingTemplate, setSavingTemplate] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const [editingFieldMapping, setEditingFieldMapping] = createSignal<string | null>(null);
  const [editingConditional, setEditingConditional] = createSignal<string | null>(null);
  const [editingCheckbox, setEditingCheckbox] = createSignal<string | null>(null);
  const [showReviewMode, setShowReviewMode] = createSignal(false);
  const [selectedArrayIndex, setSelectedArrayIndex] = createSignal<number>(0);
  const [showPreviewMode, setShowPreviewMode] = createSignal(false);
  const [fillingPDF, setFillingPDF] = createSignal(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = createSignal(false);

  // Field linking state - tracks which fields are linked together
  // Format: { groupId: [fieldName1, fieldName2, ...] }
  const [fieldLinks, setFieldLinks] = createSignal<Record<string, string[]>>({});

  // Process customer data - sorts residences, employers, etc. chronologically
  const processedData = createMemo(() => processClientData(props.customer));

  // Merged data for conditional evaluation - combines raw data with sorted arrays
  const mergedData = createMemo(() => createMergedCustomerData(props.customer, processedData()));

  // Map PDF field names to customer data
  const mapFieldToCustomerData = (fieldName: string): { field: string; value: string | undefined; confidence: 'high' | 'medium' | 'low' | 'none' } => {
    const customer = props.customer;
    const processed = processedData(); // Use processed/sorted data
    const lowerFieldName = fieldName.toLowerCase();

    // High confidence mappings (exact or very close matches)
    if (lowerFieldName.includes('pt1line1a_familyname') || lowerFieldName.includes('familyname') || lowerFieldName.includes('lastname')) {
      return { field: 'lastName', value: customer.lastName, confidence: 'high' };
    }
    if (lowerFieldName.includes('pt1line1b_givenname') || lowerFieldName.includes('givenname') || lowerFieldName.includes('firstname')) {
      return { field: 'firstName', value: customer.firstName, confidence: 'high' };
    }
    if (lowerFieldName.includes('pt1line1c_middlename') || lowerFieldName.includes('middlename')) {
      return { field: 'middleName', value: customer.middleName, confidence: 'high' };
    }
    if (lowerFieldName.includes('pt1line2_anumber') || (lowerFieldName.includes('alien') && lowerFieldName.includes('number'))) {
      return { field: 'alienNumber', value: customer.alienNumber, confidence: 'high' };
    }
    if (lowerFieldName.includes('pt1line3_usc') || lowerFieldName.includes('uscis') && lowerFieldName.includes('online') && lowerFieldName.includes('acct')) {
      return { field: 'uscisOnlineAccountNumber', value: customer.uscisOnlineAccountNumber, confidence: 'high' };
    }
    if (lowerFieldName.includes('pt1line4_ssn') || lowerFieldName.includes('socialsecurity')) {
      return { field: 'ss (SSN)', value: customer.ss, confidence: 'high' };
    }
    if (lowerFieldName.includes('dateofbirth') || lowerFieldName.includes('dob')) {
      if (customer.dateOfBirth) {
        const date = new Date(customer.dateOfBirth);
        return { field: 'dateOfBirth', value: date.toLocaleDateString('en-US'), confidence: 'high' };
      }
      return { field: 'dateOfBirth', value: undefined, confidence: 'high' };
    }
    if (lowerFieldName.includes('countryofbirth') || lowerFieldName.includes('birthcountry')) {
      return { field: 'placeOfBirth.country', value: customer.placeOfBirth?.country, confidence: 'high' };
    }
    if (lowerFieldName.includes('cityofbirth') || lowerFieldName.includes('birthcity')) {
      return { field: 'placeOfBirth.city', value: customer.placeOfBirth?.city, confidence: 'high' };
    }
    if (lowerFieldName.includes('stateofbirth') || lowerFieldName.includes('birthstate')) {
      return { field: 'placeOfBirth.state', value: customer.placeOfBirth?.state, confidence: 'medium' };
    }

    // Medium confidence (contextual matches)
    if (lowerFieldName.includes('gender') || lowerFieldName.includes('sex')) {
      return { field: 'genre (gender)', value: customer.genre, confidence: 'medium' };
    }
    if (lowerFieldName.includes('marital') && lowerFieldName.includes('status')) {
      return { field: 'maritalStatus', value: customer.maritalStatus, confidence: 'medium' };
    }
    if (lowerFieldName.includes('height')) {
      return { field: 'height', value: customer.height?.toString(), confidence: 'medium' };
    }
    if (lowerFieldName.includes('weight')) {
      return { field: 'weight', value: customer.weight?.toString(), confidence: 'medium' };
    }
    if (lowerFieldName.includes('eyecolor') || lowerFieldName.includes('eye_color')) {
      return { field: 'eyesColor', value: customer.eyesColor, confidence: 'medium' };
    }
    if (lowerFieldName.includes('haircolor') || lowerFieldName.includes('hair_color')) {
      return { field: 'hairColor', value: customer.hairColor, confidence: 'medium' };
    }
    if (lowerFieldName.includes('email')) {
      return { field: 'email', value: customer.email, confidence: 'high' };
    }
    if (lowerFieldName.includes('phone') || lowerFieldName.includes('daytime')) {
      return { field: 'phoneNumber', value: customer.phoneNumber, confidence: 'high' };
    }
    if (lowerFieldName.includes('street') || lowerFieldName.includes('address') && lowerFieldName.includes('line1')) {
      // Get most recent residence from processed data (already sorted)
      const residences = processed.residences.all;
      if (residences.length > 0) {
        return { field: 'residences[0].addressLineOne', value: residences[0].addressLineOne, confidence: 'medium' };
      }
    }
    if (lowerFieldName.includes('city') && !lowerFieldName.includes('birth')) {
      const residences = processed.residences.all;
      if (residences.length > 0) {
        return { field: 'residences[0].city', value: residences[0].city, confidence: 'medium' };
      }
    }
    if (lowerFieldName.includes('state') && !lowerFieldName.includes('birth') && !lowerFieldName.includes('marital')) {
      const residences = processed.residences.all;
      if (residences.length > 0) {
        return { field: 'residences[0].state', value: residences[0].state, confidence: 'medium' };
      }
    }
    if (lowerFieldName.includes('zipcode') || lowerFieldName.includes('zip_code') || lowerFieldName.includes('postalcode')) {
      const residences = processed.residences.all;
      if (residences.length > 0) {
        return { field: 'residences[0].zipcode', value: residences[0].zipcode, confidence: 'medium' };
      }
    }
    if (lowerFieldName.includes('passport') && lowerFieldName.includes('number')) {
      return { field: 'passportNumber', value: customer.passportNumber, confidence: 'high' };
    }
    if (lowerFieldName.includes('passport') && lowerFieldName.includes('expir')) {
      if (customer.passportExpire) {
        const date = new Date(customer.passportExpire);
        return { field: 'passportExpire', value: date.toLocaleDateString('en-US'), confidence: 'high' };
      }
    }
    if (lowerFieldName.includes('citizenship') || lowerFieldName.includes('countryofcitizenship')) {
      return { field: 'countryOfCitizenship', value: customer.countryOfCitizenship, confidence: 'high' };
    }

    // Low confidence or no mapping
    return { field: '(no mapping)', value: undefined, confidence: 'none' };
  };

  // Load and render PDF
  const loadPDF = async () => {
    setLoading(true);
    setError(null);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js library not loaded. Make sure to include it in your HTML.');
      }

      // Extract PDF fields first
      const pdfFields = await extractPDFFormFields(props.pdfFile);
      devLog('Extracted PDF fields:', pdfFields);

      // Load PDF for rendering
      const arrayBuffer = await props.pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const canvases: HTMLCanvasElement[] = [];
      const mapped: MappedField[] = [];

      // Render each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale() });

        // Create canvas for this page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page to canvas
        await page.render({
          canvasContext: context!,
          viewport: viewport
        }).promise;

        canvases.push(canvas);

        // Get annotations for field positioning
        const annotations = await page.getAnnotations();

        // Map fields from this page
        pdfFields
          .filter(field => field.page === pageNum)
          .forEach((pdfField) => {
            // Check if we have existing template data for this field
            const existingFieldMapping = props.existingTemplate?.fields?.find(
              f => f.pdfFieldName === pdfField.name
            );

            // If we have existing template data, use it; otherwise auto-map
            let mapping;
            let conditional;
            let checkboxBehavior;

            let useCustomValue = false;
            let customValue;

            if (existingFieldMapping) {
              // Load saved mapping from template
              const savedCustomerField = existingFieldMapping.clientFieldPath || '(no mapping)';

              // Check if this field uses a custom value
              if (existingFieldMapping.useCustomValue) {
                useCustomValue = true;
                customValue = existingFieldMapping.customValue;
                mapping = {
                  field: '(custom value)',
                  value: customValue,
                  confidence: 'high' as const
                };
              } else {
                const savedValue = getValueByPath(props.customer, savedCustomerField);
                mapping = {
                  field: savedCustomerField,
                  value: savedValue,
                  confidence: existingFieldMapping.confidence >= 0.8 ? 'high' as const :
                            existingFieldMapping.confidence >= 0.6 ? 'medium' as const :
                            existingFieldMapping.confidence >= 0.3 ? 'low' as const : 'none' as const
                };
              }

              conditional = existingFieldMapping.conditional;
              // checkboxBehavior would be restored here if saved in template
            } else {
              // Auto-map for new fields
              mapping = mapFieldToCustomerData(pdfField.name);
            }

            // Find annotation to get position
            const annotation = annotations.find((a: any) => a.fieldName === pdfField.name);

            if (annotation && annotation.rect) {
              const [x1, y1, x2, y2] = annotation.rect;
              const x = x1 * scale();
              const y = viewport.height - (y2 * scale());
              const width = (x2 - x1) * scale();
              const height = (y2 - y1) * scale();

              // Convert values to strings for comparison
              const customerValue = mapping.value ? String(mapping.value) : '';
              const pdfValue = pdfField.value ? String(pdfField.value) : '';
              const matches = customerValue.toLowerCase().trim() === pdfValue.toLowerCase().trim();

              mapped.push({
                pdfField,
                customerField: mapping.field,
                customerValue: mapping.value,
                pdfValue: pdfValue,
                matches: customerValue && matches,
                confidence: mapping.confidence,
                x,
                y,
                width,
                height,
                page: pageNum,
                conditional: conditional,
                checkboxBehavior: checkboxBehavior,
                useCustomValue: useCustomValue,
                customValue: customValue,
                reviewed: false,
                approved: false
              });
            }
          });
      }

      setPages(canvases);
      setMappedFields(mapped);

      devLog('Mapped fields:', mapped);

    } catch (err) {
      devLog('Error loading PDF:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error cargando PDF: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Get field color based on status
  const getFieldColor = (field: MappedField): string => {
    if (field.confidence === 'none') return 'rgba(156, 163, 175, 0.4)'; // Gray
    if (field.matches && field.customerValue) return 'rgba(34, 197, 94, 0.4)'; // Green
    if (field.customerValue && field.pdfValue && field.pdfValue.trim() !== '' && !field.matches) return 'rgba(239, 68, 68, 0.4)'; // Red
    if (field.customerValue && (!field.pdfValue || field.pdfValue.trim() === '')) return 'rgba(59, 130, 246, 0.4)'; // Blue - has suggestion
    return 'rgba(251, 191, 36, 0.4)'; // Yellow - empty
  };

  const getBorderColor = (field: MappedField): string => {
    if (field.confidence === 'none') return 'rgb(156, 163, 175)';
    if (field.matches && field.customerValue) return 'rgb(34, 197, 94)';
    if (field.customerValue && field.pdfValue && field.pdfValue.trim() !== '' && !field.matches) return 'rgb(239, 68, 68)';
    if (field.customerValue && (!field.pdfValue || field.pdfValue.trim() === '')) return 'rgb(59, 130, 246)';
    return 'rgb(251, 191, 36)';
  };

  // Filter fields based on status
  const filteredFields = () => {
    const filter = filterStatus();
    if (filter === 'all') return mappedFields();
    if (filter === 'matches') return mappedFields().filter(f => f.matches && f.customerValue);
    if (filter === 'mismatches') return mappedFields().filter(f => f.customerValue && f.pdfValue && f.pdfValue.trim() !== '' && !f.matches);
    if (filter === 'empty') return mappedFields().filter(f => (!f.pdfValue || f.pdfValue.trim() === '') && f.customerValue);
    return mappedFields();
  };

  // Get statistics
  const stats = () => {
    const fields = mappedFields();
    const total = fields.length;
    const matches = fields.filter(f => f.matches && f.customerValue).length;
    const mismatches = fields.filter(f => f.customerValue && f.pdfValue && f.pdfValue.trim() !== '' && !f.matches).length;
    const hasData = fields.filter(f => f.customerValue).length;
    const empty = fields.filter(f => !f.pdfValue || f.pdfValue.trim() === '').length;

    return { total, matches, mismatches, hasData, empty };
  };

  // Save current mappings as a template
  const handleSaveAsTemplate = async () => {
    setSavingTemplate(true);
    setSaveMessage(null);

    try {
      const isEditing = !!props.existingTemplate;

      // If editing, use existing template info; otherwise prompt for new
      const formName = isEditing
        ? props.existingTemplate!.formName
        : (prompt('Nombre del formulario (ej: I-485, I-539):') || props.pdfFile.name.replace('.pdf', ''));

      const formVersion = isEditing
        ? props.existingTemplate!.formVersion
        : (prompt('Versión del formulario (opcional):') || undefined);

      // Convert mapped fields to FormFieldMapping format
      const fieldMappings: FormFieldMapping[] = mappedFields().map(field => ({
        pdfFieldName: field.pdfField.name,
        pdfFieldType: field.pdfField.type || 'text',
        page: field.page,
        position: {
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height
        },
        clientFieldPath: field.customerField,
        mappingType: 'direct',
        mappingSource: 'ai',
        confidence: field.confidence === 'high' ? 0.9 :
                    field.confidence === 'medium' ? 0.7 :
                    field.confidence === 'low' ? 0.4 : 0.1,
        conditional: field.conditional,
        useCustomValue: field.useCustomValue,
        customValue: field.customValue,
        lastModified: Date.now()
      }));

      let template: FormTemplate;
      let result: { success: boolean; error?: string };

      if (isEditing) {
        // UPDATE existing template
        template = {
          id: props.existingTemplate!.id,
          fields: JSON.stringify(fieldMappings),
          totalPages: pages().length,
          totalFields: fieldMappings.length,
          updatedAt: Date.now(),
          updatedBy: authStore.currentUser?.uid,
          version: (props.existingTemplate!.version || 1) + 1
        };

        result = await updateTemplateToServer(template);
        devLog('Template updated:', template.id);
      } else {
        // CREATE new template
        template = createFormTemplate({
          templateName: formName,
          formType: formName,
          fields: fieldMappings,
          formName,
          formVersion,
          description: `Generated from ${props.pdfFile.name}`,
          totalPages: pages().length,
          totalFields: fieldMappings.length,
          createdBy: authStore.currentUser?.uid
        });

        result = await saveTemplateToServer(template);
        devLog('New template created:', template.id);
      }

      if (result.success) {
        const action = isEditing ? 'actualizado' : 'guardado';
        setSaveMessage(`✅ Template "${formName}" ${action} exitosamente! ID: ${template.id}`);

        // Clear unsaved changes flag
        setHasUnsavedChanges(false);

        // Call onSave callback if provided
        props.onSave?.(template);
      } else {
        setSaveMessage(`❌ Error guardando template: ${result.error}`);
      }

    } catch (err) {
      setSaveMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingTemplate(false);

      // Clear message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // Fill PDF with mapped values and download
  const handleFillAndDownloadPDF = async () => {
    try {
      setFillingPDF(true);
      setSaveMessage('📄 Llenando PDF...');

      // Load the PDF
      const arrayBuffer = await props.pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();

      // Get all fields
      const fields = mappedFields();
      let filledCount = 0;
      let skippedCount = 0;
      let unsupportedCount = 0;

      // Fill each field
      for (const field of fields) {
        try {
          // Determine the value to use
          let valueToFill: string | undefined;

          if (field.useCustomValue) {
            // Use custom value
            valueToFill = field.customValue;
          } else {
            // Use customer field value
            valueToFill = field.customerValue;

            // Skip if no mapping
            if (field.customerField === '(no mapping)' || !valueToFill) {
              skippedCount++;
              continue;
            }
          }

          // Check conditional rules (only for non-custom values)
          if (!field.useCustomValue && field.conditional?.enabled) {
            const evaluation = evaluateConditional(field.conditional, mergedData(), valueToFill);
            if (!evaluation.shouldFill) {
              skippedCount++;
              continue;
            }
          }

          // Try to get the PDF form field - this may fail for rich text fields
          let pdfField;
          try {
            pdfField = form.getField(field.pdfField.name);
          } catch (getFieldError) {
            // Check if it's a rich text field error
            const errorMsg = getFieldError instanceof Error ? getFieldError.message : String(getFieldError);
            if (errorMsg.includes('rich text')) {
              devLog(`⚠️ Omitiendo campo de texto enriquecido (no soportado): ${field.pdfField.name}`);
              unsupportedCount++;
              continue;
            }
            // Re-throw other errors
            throw getFieldError;
          }

          // Fill based on field type
          const fieldType = field.pdfField.type;
          const value = valueToFill; // Use valueToFill (which can be custom or customer value)

          if (fieldType === 'text') {
            const textField = pdfField;
            textField.setText(value);
            filledCount++;
          } else if (fieldType === 'checkbox') {
            const checkbox = pdfField;

            // Check if there's a custom checkbox behavior configured
            let shouldCheck = false;

            if (field.checkboxBehavior) {
              if (field.checkboxBehavior.type === 'always_true') {
                shouldCheck = true;
              } else if (field.checkboxBehavior.type === 'always_false') {
                shouldCheck = false;
              } else if (field.checkboxBehavior.type === 'based_on_field' && field.checkboxBehavior.fieldPath) {
                // Get the value from the specified field path
                const checkValue = getValueByPath(props.customer, field.checkboxBehavior.fieldPath);
                shouldCheck = checkValue && (
                  checkValue === true ||
                  String(checkValue).toLowerCase() === 'true' ||
                  String(checkValue).toLowerCase() === 'yes' ||
                  String(checkValue).toLowerCase() === 'si' ||
                  String(checkValue).toLowerCase() === 'sí' ||
                  String(checkValue) === '1' ||
                  String(checkValue).toLowerCase() === 'x'
                );
              }
            } else {
              // Default behavior: check if the mapped value is truthy
              shouldCheck = value && (
                value.toLowerCase() === 'true' ||
                value.toLowerCase() === 'yes' ||
                value.toLowerCase() === 'si' ||
                value.toLowerCase() === 'sí' ||
                value === '1' ||
                value === 'x'
              );
            }

            if (shouldCheck) {
              checkbox.check();
            } else {
              checkbox.uncheck();
            }
            filledCount++;
          } else if (fieldType === 'radio') {
            const radioGroup = pdfField;
            try {
              radioGroup.select(value);
              filledCount++;
            } catch {
              // Value might not match radio options, skip
              skippedCount++;
            }
          } else if (fieldType === 'dropdown') {
            const dropdown = pdfField;
            try {
              dropdown.select(value);
              filledCount++;
            } catch {
              // Value might not match dropdown options, skip
              skippedCount++;
            }
          }
        } catch (err) {
          devLog(`Error filling field ${field.pdfField.name}:`, err);
          skippedCount++;
        }
      }

      // Save the filled PDF
      const pdfBytes = await pdfDoc.save();

      // Download the PDF
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${props.pdfFile.name.replace('.pdf', '')}_filled_${props.customer.firstName}_${props.customer.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const message = unsupportedCount > 0
        ? `✅ PDF llenado! ${filledCount} campos llenados, ${skippedCount} omitidos, ${unsupportedCount} no soportados (texto enriquecido)`
        : `✅ PDF llenado! ${filledCount} campos llenados, ${skippedCount} omitidos`;
      setSaveMessage(message);
    } catch (err) {
      devLog('Error filling PDF:', err);
      setSaveMessage(`❌ Error llenando PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFillingPDF(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // Group client field paths by category
  const clientFieldsByCategory = createMemo(() => {
    const grouped = new Map<string, typeof CLIENT_FIELD_PATHS>();

    CLIENT_FIELD_PATHS.forEach(field => {
      if (!grouped.has(field.category)) {
        grouped.set(field.category, []);
      }
      grouped.get(field.category)!.push(field);
    });

    return grouped;
  });

  // Get unique base fields (without array indices) for array-type fields
  const getUniqueArrayFields = createMemo(() => {
    const uniqueFields = new Map<string, typeof CLIENT_FIELD_PATHS[0]>();

    CLIENT_FIELD_PATHS.forEach(field => {
      if (field.isArray) {
        // Extract base path without index (e.g., "residences[0].city" -> "residences.city")
        const basePathMatch = field.path.match(/^([^\[]+)\[\d+\]\.(.+)$/);
        if (basePathMatch) {
          const basePath = `${basePathMatch[1]}.${basePathMatch[2]}`;
          if (!uniqueFields.has(basePath)) {
            uniqueFields.set(basePath, {
              ...field,
              path: basePath
            });
          }
        }
      }
    });

    return uniqueFields;
  });

  // Helper to parse array path and extract base path and index
  const parseArrayPath = (path: string): { basePath: string; property: string; index: number | null } | null => {
    const match = path.match(/^(.+)\[(\d+)\]\.(.+)$/);
    if (match) {
      return {
        basePath: match[1], // e.g., "residences"
        property: match[3], // e.g., "city"
        index: parseInt(match[2]) // e.g., 0
      };
    }
    return null;
  };

  // Get available items for an array field
  const getArrayFieldItems = (basePath: string, property: string): Array<{ index: number; preview: string; value: any }> => {
    const processed = processedData();

    // Use processed/sorted data instead of raw customer data
    let items: any[] = [];

    if (basePath === 'residences') {
      items = processed.residences.all;
    } else if (basePath === 'employers') {
      items = processed.employers.all;
    } else if (basePath === 'schoolHistory') {
      items = processed.education.all;
    } else if (basePath === 'travelHistory') {
      items = processed.travelHistory.all;
    } else if (basePath === 'passports') {
      items = processed.passports.all;
    } else {
      // Fallback to raw data for other arrays
      const arrayData = getValueByPath(props.customer, basePath);
      if (!arrayData) return [];

      if (Array.isArray(arrayData)) {
        items = arrayData;
      } else if (typeof arrayData === 'object') {
        items = Object.values(arrayData);
      }
    }

    if (items.length === 0) return [];

    return items.map((item, index) => {
      const value = item[property];

      // Create a preview with multiple fields for context
      let preview = '';
      if (basePath === 'residences') {
        preview = [
          item.addressLineOne,
          item.city,
          item.state,
          item.country
        ].filter(Boolean).join(', ') || '(incomplete)';
      } else if (basePath === 'employers') {
        preview = [
          item.employerName,
          item.occupation,
          item.city
        ].filter(Boolean).join(' - ') || '(incomplete)';
      } else if (basePath === 'schoolHistory') {
        preview = [
          item.schoolName,
          item.schoolType,
          item.city
        ].filter(Boolean).join(' - ') || '(incomplete)';
      } else {
        preview = JSON.stringify(item).substring(0, 50);
      }

      return { index, preview, value };
    });
  };

  // Change field mapping manually
  const handleChangeFieldMapping = (pdfFieldName: string, newClientFieldPath: string) => {
    devLog(`🔄 Changing field mapping: ${pdfFieldName} -> ${newClientFieldPath}`);

    const updated = mappedFields().map(field => {
      if (field.pdfField.name === pdfFieldName) {
        // Use processed data for getting values (sorted arrays!)
        let newValue: any;
        const parsed = parseArrayPath(newClientFieldPath);

        if (parsed) {
          // For array paths, use processed data
          const processed = processedData();
          let arrayData: any[] = [];

          if (parsed.basePath === 'residences') {
            arrayData = processed.residences.all;
          } else if (parsed.basePath === 'employers') {
            arrayData = processed.employers.all;
          } else if (parsed.basePath === 'schoolHistory') {
            arrayData = processed.education.all;
          } else if (parsed.basePath === 'travelHistory') {
            arrayData = processed.travelHistory.all;
          } else if (parsed.basePath === 'passports') {
            arrayData = processed.passports.all;
          } else {
            // Fallback to raw data for other arrays
            newValue = getValueByPath(props.customer, newClientFieldPath);
          }

          if (arrayData.length > 0 && arrayData[parsed.index]) {
            newValue = arrayData[parsed.index][parsed.property];
          }
        } else {
          // For non-array paths, use raw customer data
          newValue = getValueByPath(props.customer, newClientFieldPath);
        }

        devLog(`✅ New mapping applied: ${newClientFieldPath} = ${newValue}`);

        return {
          ...field,
          customerField: newClientFieldPath,
          customerValue: newValue ? String(newValue) : undefined,
          confidence: 'high' as const,
          matches: String(field.pdfValue) === String(newValue),
          useCustomValue: false, // Clear custom value when switching to customer field
          customValue: undefined
        };
      }
      return field;
    });

    setMappedFields(updated);
    setEditingFieldMapping(null);

    // Update selectedField to point to the new object
    const updatedField = updated.find(f => f.pdfField.name === pdfFieldName);
    if (updatedField) {
      setSelectedField(updatedField);
    }

    // Show success message
    setSaveMessage('✅ Mapeo actualizado');
    setTimeout(() => setSaveMessage(null), 2000);

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  };

  // Get link group ID for a field
  const getLinkGroupId = (pdfFieldName: string): string | null => {
    const links = fieldLinks();
    for (const [groupId, fields] of Object.entries(links)) {
      if (fields.includes(pdfFieldName)) {
        return groupId;
      }
    }
    return null;
  };

  // Check if a field is linked
  const isFieldLinked = (pdfFieldName: string): boolean => {
    return getLinkGroupId(pdfFieldName) !== null;
  };

  // Get all fields in the same link group
  const getLinkedFields = (pdfFieldName: string): string[] => {
    const groupId = getLinkGroupId(pdfFieldName);
    if (!groupId) return [];
    return fieldLinks()[groupId] || [];
  };

  // Find fields that could be linked together (same basePath, different properties)
  const findRelatedFields = (pdfFieldName: string): MappedField[] => {
    const field = mappedFields().find(f => f.pdfField.name === pdfFieldName);
    if (!field) return [];

    const parsed = parseArrayPath(field.customerField);
    if (!parsed) return [];

    // Find all fields with same basePath and same index
    return mappedFields().filter(f => {
      const otherParsed = parseArrayPath(f.customerField);
      if (!otherParsed) return false;

      return otherParsed.basePath === parsed.basePath &&
             otherParsed.index === parsed.index &&
             f.pdfField.name !== pdfFieldName;
    });
  };

  // Link multiple fields together
  const linkFields = (fieldNames: string[]) => {
    if (fieldNames.length < 2) return;

    // Remove these fields from any existing groups
    const links = { ...fieldLinks() };
    for (const groupId in links) {
      links[groupId] = links[groupId].filter(f => !fieldNames.includes(f));
      if (links[groupId].length === 0) {
        delete links[groupId];
      }
    }

    // Create new group
    const groupId = `group_${Date.now()}`;
    links[groupId] = fieldNames;

    setFieldLinks(links);
  };

  // Unlink a field from its group
  const unlinkField = (pdfFieldName: string) => {
    const groupId = getLinkGroupId(pdfFieldName);
    if (!groupId) return;

    const links = { ...fieldLinks() };
    links[groupId] = links[groupId].filter(f => f !== pdfFieldName);

    if (links[groupId].length <= 1) {
      delete links[groupId];
    }

    setFieldLinks(links);
  };

  // Unlink all fields in a group
  const unlinkGroup = (groupId: string) => {
    const links = { ...fieldLinks() };
    delete links[groupId];
    setFieldLinks(links);
  };

  // Change array index for a field (and all linked fields)
  const handleChangeArrayIndex = (pdfFieldName: string, newIndex: number) => {
    const field = mappedFields().find(f => f.pdfField.name === pdfFieldName);
    if (!field) return;

    const parsed = parseArrayPath(field.customerField);
    if (!parsed) return;

    // Get linked fields
    const linkedFields = getLinkedFields(pdfFieldName);
    const fieldsToUpdate = [pdfFieldName, ...linkedFields];

    // Get processed data for array values
    const processed = processedData();

    // Update all linked fields to use the new index
    const updated = mappedFields().map(f => {
      if (fieldsToUpdate.includes(f.pdfField.name)) {
        const fieldParsed = parseArrayPath(f.customerField);
        if (fieldParsed) {
          const newPath = `${fieldParsed.basePath}[${newIndex}].${fieldParsed.property}`;

          // Use processed data for getting values (sorted arrays!)
          let newValue: any;
          let arrayData: any[] = [];

          if (fieldParsed.basePath === 'residences') {
            arrayData = processed.residences.all;
          } else if (fieldParsed.basePath === 'employers') {
            arrayData = processed.employers.all;
          } else if (fieldParsed.basePath === 'schoolHistory') {
            arrayData = processed.education.all;
          } else if (fieldParsed.basePath === 'travelHistory') {
            arrayData = processed.travelHistory.all;
          } else if (fieldParsed.basePath === 'passports') {
            arrayData = processed.passports.all;
          } else {
            // Fallback to raw data for other arrays
            newValue = getValueByPath(props.customer, newPath);
          }

          if (arrayData.length > 0 && arrayData[newIndex]) {
            newValue = arrayData[newIndex][fieldParsed.property];
          }

          return {
            ...f,
            customerField: newPath,
            customerValue: newValue ? String(newValue) : undefined,
            confidence: 'high' as const,
            matches: String(f.pdfValue) === String(newValue)
          };
        }
      }
      return f;
    });

    setMappedFields(updated);

    // Update selectedField to point to the new object
    const updatedField = updated.find(f => f.pdfField.name === pdfFieldName);
    if (updatedField) {
      setSelectedField(updatedField);
    }
  };

  // Set conditional rule for a field
  const setConditional = (pdfFieldName: string, conditional: FormFieldMapping['conditional']) => {
    const updated = mappedFields().map(f => {
      if (f.pdfField.name === pdfFieldName) {
        return { ...f, conditional };
      }
      return f;
    });
    setMappedFields(updated);
    setEditingConditional(null);

    // Update selectedField to point to the new object
    const updatedField = updated.find(f => f.pdfField.name === pdfFieldName);
    if (updatedField) {
      setSelectedField(updatedField);
    }
  };

  // Remove conditional from a field
  const removeConditional = (pdfFieldName: string) => {
    const updated = mappedFields().map(f => {
      if (f.pdfField.name === pdfFieldName) {
        return { ...f, conditional: undefined };
      }
      return f;
    });
    setMappedFields(updated);

    // Update selectedField to point to the new object
    const updatedField = updated.find(f => f.pdfField.name === pdfFieldName);
    if (updatedField) {
      setSelectedField(updatedField);
    }
  };

  // Set checkbox behavior for a field
  const setCheckboxBehavior = (pdfFieldName: string, behavior: MappedField['checkboxBehavior']) => {
    const updated = mappedFields().map(f => {
      if (f.pdfField.name === pdfFieldName) {
        return { ...f, checkboxBehavior: behavior };
      }
      return f;
    });
    setMappedFields(updated);
    setEditingCheckbox(null);

    // Update selectedField to point to the new object
    const updatedField = updated.find(f => f.pdfField.name === pdfFieldName);
    if (updatedField) {
      setSelectedField(updatedField);
    }
  };

  // Remove checkbox behavior from a field
  const removeCheckboxBehavior = (pdfFieldName: string) => {
    const updated = mappedFields().map(f => {
      if (f.pdfField.name === pdfFieldName) {
        return { ...f, checkboxBehavior: undefined };
      }
      return f;
    });
    setMappedFields(updated);

    // Update selectedField to point to the new object
    const updatedField = updated.find(f => f.pdfField.name === pdfFieldName);
    if (updatedField) {
      setSelectedField(updatedField);
    }
  };

  // Approve a mapping
  const approveMapping = (pdfFieldName: string) => {
    const updated = mappedFields().map(f => {
      if (f.pdfField.name === pdfFieldName) {
        return { ...f, reviewed: true, approved: true, rejectionReason: undefined };
      }
      return f;
    });
    setMappedFields(updated);
  };

  // Reject a mapping
  const rejectMapping = (pdfFieldName: string, reason?: string) => {
    const updated = mappedFields().map(f => {
      if (f.pdfField.name === pdfFieldName) {
        return { ...f, reviewed: true, approved: false, rejectionReason: reason };
      }
      return f;
    });
    setMappedFields(updated);
  };

  // Approve all mappings (optionally filter by confidence)
  const approveAll = (minConfidence?: 'high' | 'medium' | 'low') => {
    const updated = mappedFields().map(f => {
      const shouldApprove = !minConfidence ||
        (minConfidence === 'low' ||
         (minConfidence === 'medium' && (f.confidence === 'high' || f.confidence === 'medium')) ||
         (minConfidence === 'high' && f.confidence === 'high'));

      if (shouldApprove && f.customerField !== '(no mapping)') {
        return { ...f, reviewed: true, approved: true, rejectionReason: undefined };
      }
      return f;
    });
    setMappedFields(updated);
  };

  // Reject all unmapped fields
  const rejectAllUnmapped = () => {
    const updated = mappedFields().map(f => {
      if (f.customerField === '(no mapping)' || f.confidence === 'none') {
        return { ...f, reviewed: true, approved: false, rejectionReason: 'No mapping found' };
      }
      return f;
    });
    setMappedFields(updated);
  };

  // Reset all reviews
  const resetAllReviews = () => {
    const updated = mappedFields().map(f => ({
      ...f,
      reviewed: false,
      approved: false,
      rejectionReason: undefined
    }));
    setMappedFields(updated);
  };

  // Get review statistics
  const reviewStats = () => {
    const fields = mappedFields();
    const total = fields.length;
    const reviewed = fields.filter(f => f.reviewed).length;
    const approved = fields.filter(f => f.approved).length;
    const rejected = fields.filter(f => f.reviewed && !f.approved).length;
    const pending = fields.filter(f => !f.reviewed).length;

    return { total, reviewed, approved, rejected, pending };
  };

  onMount(() => {
    loadPDF();
  });

  return (
    <>
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>

    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
      {/* Toolbar */}
      <Card>
        <div style={{
          padding: '1rem',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'flex-wrap': 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ margin: 0, 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
              🔗 Mapeo de Campos PDF
            </h3>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Cliente: <strong>{props.customer.firstName} {props.customer.lastName}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
            {/* Zoom Controls */}
            <Button size="sm" variant="outline" onClick={() => setScale(Math.max(0.5, scale() - 0.25))}>
              🔍−
            </Button>
            <span style={{ 'font-size': '0.875rem', 'min-width': '60px', 'text-align': 'center' }}>
              {Math.round(scale() * 100)}%
            </span>
            <Button size="sm" variant="outline" onClick={() => setScale(Math.min(3, scale() + 0.25))}>
              🔍+
            </Button>

            <Button size="sm" variant="outline" onClick={() => setShowOverlays(!showOverlays())}>
              {showOverlays() ? '👁️ Ocultar' : '👁️ Mostrar'}
            </Button>

            <Button
              size="sm"
              variant={showReviewMode() ? 'primary' : 'outline'}
              onClick={() => setShowReviewMode(!showReviewMode())}
              style={{ background: showReviewMode() ? 'var(--warning-color)' : undefined }}
            >
              {showReviewMode() ? '✓ Modo Revisión' : '🔍 Revisar Mapeos'}
            </Button>

            <Button
              size="sm"
              variant={showPreviewMode() ? 'primary' : 'outline'}
              onClick={() => setShowPreviewMode(!showPreviewMode())}
              style={{ background: showPreviewMode() ? 'var(--info-color)' : undefined }}
            >
              {showPreviewMode() ? '✓ Vista Previa' : '👁️ Vista Previa'}
            </Button>

            <div style={{ position: 'relative' }}>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate() || mappedFields().length === 0}
                style={{
                  background: hasUnsavedChanges() ? '#f59e0b' : 'var(--success-color)',
                  animation: hasUnsavedChanges() ? 'pulse 2s infinite' : 'none'
                }}
              >
                {savingTemplate()
                  ? '💾 Guardando...'
                  : hasUnsavedChanges()
                    ? (props.existingTemplate ? '⚠️ Guardar Cambios' : '⚠️ Guardar Template')
                    : (props.existingTemplate ? '✏️ Actualizar Template' : '💾 Guardar Como Template')}
              </Button>
              <Show when={hasUnsavedChanges()}>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '16px',
                  height: '16px',
                  'border-radius': '50%',
                  background: '#ef4444',
                  border: '2px solid white',
                  animation: 'pulse 2s infinite'
                }} />
              </Show>
            </div>

            <Show when={hasUnsavedChanges()}>
              <div style={{
                'font-size': '0.75rem',
                color: '#f59e0b',
                'font-weight': '600',
                padding: '0.25rem 0.5rem',
                background: 'rgba(245, 158, 11, 0.1)',
                'border-radius': 'var(--border-radius-sm)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                ⚠️ Cambios sin guardar
              </div>
            </Show>

            <Button
              size="sm"
              variant="primary"
              onClick={handleFillAndDownloadPDF}
              disabled={fillingPDF() || mappedFields().length === 0}
              style={{ background: '#8b5cf6', 'border-color': '#8b5cf6' }}
            >
              {fillingPDF() ? '📥 Llenando...' : '📥 Descargar PDF Lleno'}
            </Button>

            <Show when={props.onClose}>
              <Button size="sm" variant="outline" onClick={props.onClose}>
                ✕ Cerrar
              </Button>
            </Show>
          </div>
        </div>

        {/* Save Message */}
        <Show when={saveMessage()}>
          <div style={{
            padding: '1rem',
            'border-top': '1px solid var(--border-color)',
            background: saveMessage()?.includes('✅') ? 'var(--success-light)' : 'var(--danger-light)',
            color: saveMessage()?.includes('✅') ? 'var(--success-color)' : 'var(--danger-color)',
            'font-size': '0.875rem'
          }}>
            {saveMessage()}
          </div>
        </Show>

        {/* Review Mode Panel */}
        <Show when={showReviewMode()}>
          <div style={{
            padding: '1rem',
            'border-top': '1px solid var(--border-color)',
            background: 'var(--warning-light)'
          }}>
            <div style={{ 'margin-bottom': '1rem' }}>
              <h4 style={{ margin: 0, 'margin-bottom': '0.5rem', 'font-size': '1rem', 'font-weight': '600' }}>
                📋 Revisión de Mapeos AI
              </h4>
              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                Revisa y aprueba los mapeos generados automáticamente antes de guardar
              </div>
            </div>

            {/* Review Statistics */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.75rem',
              'margin-bottom': '1rem'
            }}>
              <div style={{ 'text-align': 'center', padding: '0.5rem', background: 'white', 'border-radius': 'var(--border-radius-sm)' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>{reviewStats().total}</div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Total</div>
              </div>
              <div style={{ 'text-align': 'center', padding: '0.5rem', background: 'white', 'border-radius': 'var(--border-radius-sm)' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--success-color)' }}>
                  {reviewStats().approved}
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Aprobados</div>
              </div>
              <div style={{ 'text-align': 'center', padding: '0.5rem', background: 'white', 'border-radius': 'var(--border-radius-sm)' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--danger-color)' }}>
                  {reviewStats().rejected}
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Rechazados</div>
              </div>
              <div style={{ 'text-align': 'center', padding: '0.5rem', background: 'white', 'border-radius': 'var(--border-radius-sm)' }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--warning-color)' }}>
                  {reviewStats().pending}
                </div>
                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>Pendientes</div>
              </div>
            </div>

            {/* Bulk Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approveAll('high')}
                style={{ flex: 1, 'min-width': '150px' }}
              >
                ✓ Aprobar Alta Confianza
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approveAll('medium')}
                style={{ flex: 1, 'min-width': '150px' }}
              >
                ✓ Aprobar Media+
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approveAll()}
                style={{ flex: 1, 'min-width': '150px' }}
              >
                ✓ Aprobar Todos
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectAllUnmapped()}
                style={{ flex: 1, 'min-width': '150px' }}
              >
                ✗ Rechazar Sin Mapeo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetAllReviews()}
                style={{ flex: 1, 'min-width': '150px' }}
              >
                🔄 Reiniciar Revisiones
              </Button>
            </div>
          </div>
        </Show>

        {/* Statistics */}
        <div style={{
          padding: '1rem',
          background: 'var(--gray-50)',
          'border-top': '1px solid var(--border-color)',
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700' }}>{stats().total}</div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Total Campos</div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'rgb(34, 197, 94)' }}>
              {stats().matches}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Coinciden</div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'rgb(239, 68, 68)' }}>
              {stats().mismatches}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>No Coinciden</div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'rgb(59, 130, 246)' }}>
              {stats().hasData}
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Con Datos</div>
          </div>
        </div>

        {/* Filter */}
        <div style={{
          padding: '1rem',
          'border-top': '1px solid var(--border-color)',
          display: 'flex',
          gap: '0.5rem',
          'flex-wrap': 'wrap'
        }}>
          <Button
            size="sm"
            variant={filterStatus() === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilterStatus('all')}
          >
            Todos ({stats().total})
          </Button>
          <Button
            size="sm"
            variant={filterStatus() === 'matches' ? 'primary' : 'outline'}
            onClick={() => setFilterStatus('matches')}
          >
            ✅ Coinciden ({stats().matches})
          </Button>
          <Button
            size="sm"
            variant={filterStatus() === 'mismatches' ? 'primary' : 'outline'}
            onClick={() => setFilterStatus('mismatches')}
          >
            ❌ No Coinciden ({stats().mismatches})
          </Button>
          <Button
            size="sm"
            variant={filterStatus() === 'empty' ? 'primary' : 'outline'}
            onClick={() => setFilterStatus('empty')}
          >
            📝 Vacíos con Datos ({stats().empty})
          </Button>
        </div>

        {/* Legend */}
        <div style={{
          padding: '1rem',
          background: 'var(--gray-50)',
          'border-top': '1px solid var(--border-color)',
          display: 'flex',
          gap: '1.5rem',
          'font-size': '0.875rem',
          'flex-wrap': 'wrap'
        }}>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', background: 'rgba(34, 197, 94, 0.4)', border: '2px solid rgb(34, 197, 94)', 'border-radius': '4px' }} />
            <span>Coincide</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', background: 'rgba(59, 130, 246, 0.4)', border: '2px solid rgb(59, 130, 246)', 'border-radius': '4px' }} />
            <span>Tiene Datos</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', background: 'rgba(239, 68, 68, 0.4)', border: '2px solid rgb(239, 68, 68)', 'border-radius': '4px' }} />
            <span>No Coincide</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', background: 'rgba(251, 191, 36, 0.4)', border: '2px solid rgb(251, 191, 36)', 'border-radius': '4px' }} />
            <span>Vacío</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', background: 'rgba(156, 163, 175, 0.4)', border: '2px solid rgb(156, 163, 175)', 'border-radius': '4px' }} />
            <span>Sin Mapeo</span>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <div style={{
              position: 'relative',
              width: '20px',
              height: '20px',
              background: 'rgba(156, 163, 175, 0.4)',
              border: '2px solid rgb(156, 163, 175)',
              'border-radius': '4px',
              'box-shadow': '0 0 0 2px rgba(139, 92, 246, 0.3)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                width: '14px',
                height: '14px',
                background: 'rgb(139, 92, 246)',
                'border-radius': '50%',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '8px',
                border: '1px solid white'
              }}>
                🔗
              </div>
            </div>
            <span>Vinculado</span>
          </div>
        </div>
      </Card>

      <Show when={loading()}>
        <Card>
          <div style={{ padding: '3rem', 'text-align': 'center', color: 'var(--text-muted)' }}>
            <div style={{ 'font-size': '2rem', 'margin-bottom': '1rem' }}>⏳</div>
            <div>Cargando PDF y mapeando campos...</div>
          </div>
        </Card>
      </Show>

      <Show when={error()}>
        <Card>
          <div style={{ padding: '1rem', background: 'var(--danger-light)', color: 'var(--danger-color)' }}>
            {error()}
          </div>
        </Card>
      </Show>

      {/* PDF Viewer with Overlays */}
      <Show when={!loading() && pages().length > 0}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* PDF Pages */}
          <div style={{ flex: 1, 'overflow-y': 'auto', 'max-height': 'calc(100vh - 110px)' }}>
            <For each={pages()}>
              {(canvas, index) => {
                const pageNum = index() + 1;
                const pageFields = () => filteredFields().filter(f => f.page === pageNum);

                return (
                  <Card style={{ 'margin-bottom': '1rem' }}>
                    <div style={{
                      padding: '0.5rem',
                      background: 'var(--gray-100)',
                      'border-bottom': '1px solid var(--border-color)',
                      'font-weight': '600',
                      'font-size': '0.875rem'
                    }}>
                      Página {pageNum} ({pageFields().length} campos)
                    </div>

                    <div style={{ position: 'relative', display: 'inline-block', margin: '1rem' }}>
                      {/* Canvas */}
                      <div ref={(el) => { if (el && !el.querySelector('canvas')) el.appendChild(canvas); }} />

                      {/* Field Overlays */}
                      <Show when={showOverlays()}>
                        <For each={pageFields()}>
                          {(field) => {
                            const linked = isFieldLinked(field.pdfField.name);
                            const linkGroupId = getLinkGroupId(field.pdfField.name);

                            return (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${field.x}px`,
                                  top: `${field.y}px`,
                                  width: `${field.width}px`,
                                  height: `${field.height}px`,
                                  background: getFieldColor(field),
                                  border: `2px solid ${getBorderColor(field)}`,
                                  'border-radius': '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  'z-index': selectedField() === field ? 100 : 1,
                                  'box-shadow': linked ? `0 0 0 2px rgba(139, 92, 246, 0.3)` : 'none'
                                }}
                                onClick={() => setSelectedField(field)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                title={`${field.pdfField.name}\n→ ${field.customerField}\nValor: ${field.customerValue || '(vacío)'}${linked ? '\n🔗 Vinculado' : ''}${field.approved ? '\n✅ Aprobado' : field.reviewed ? '\n❌ Rechazado' : ''}`}
                              >
                                {/* Link indicator badge */}
                                <Show when={linked}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '20px',
                                    height: '20px',
                                    background: 'rgb(139, 92, 246)',
                                    color: 'white',
                                    'border-radius': '50%',
                                    display: 'flex',
                                    'align-items': 'center',
                                    'justify-content': 'center',
                                    'font-size': '10px',
                                    'font-weight': 'bold',
                                    border: '2px solid white',
                                    'box-shadow': '0 2px 4px rgba(0,0,0,0.2)'
                                  }}>
                                    🔗
                                  </div>
                                </Show>

                                {/* Approval status badge */}
                                <Show when={showReviewMode()}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    left: '-8px',
                                    width: '20px',
                                    height: '20px',
                                    background: field.approved ? 'var(--success-color)' :
                                                field.reviewed ? 'var(--danger-color)' :
                                                'var(--warning-color)',
                                    color: 'white',
                                    'border-radius': '50%',
                                    display: 'flex',
                                    'align-items': 'center',
                                    'justify-content': 'center',
                                    'font-size': '12px',
                                    'font-weight': 'bold',
                                    border: '2px solid white',
                                    'box-shadow': '0 2px 4px rgba(0,0,0,0.2)'
                                  }}>
                                    {field.approved ? '✓' : field.reviewed ? '✗' : '?'}
                                  </div>
                                </Show>

                                {/* Preview mode - show filled value */}
                                <Show when={showPreviewMode() && field.customerValue}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'white',
                                    padding: '2px 6px',
                                    'border-radius': '3px',
                                    'font-size': `${Math.max(8, Math.min(field.height * 0.6, 14))}px`,
                                    'font-weight': '600',
                                    color: '#1f2937',
                                    'box-shadow': '0 2px 4px rgba(0,0,0,0.3)',
                                    'white-space': 'nowrap',
                                    overflow: 'hidden',
                                    'text-overflow': 'ellipsis',
                                    'max-width': `${field.width - 8}px`,
                                    'pointer-events': 'none',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    {field.customerValue}
                                  </div>
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </Show>
                    </div>
                  </Card>
                );
              }}
            </For>
          </div>

          {/* Field Details Sidebar */}
          <Show when={selectedField()}>
            <Card style={{ width: '400px', 'max-height': 'calc(100vh - 400px)', 'overflow-y': 'auto', position: 'sticky', top: '1rem' }}>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '1rem' }}>
                  <h4 style={{ margin: 0, 'font-weight': '600' }}>Detalles del Campo</h4>
                  <button
                    style={{ background: 'transparent', border: 'none', 'font-size': '1.25rem', cursor: 'pointer' }}
                    onClick={() => setSelectedField(null)}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ 'margin-bottom': '1rem', padding: '1rem', background: 'var(--gray-50)', 'border-radius': 'var(--border-radius-sm)' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                    Campo PDF:
                  </div>
                  <div style={{ 'font-size': '0.875rem', 'word-break': 'break-word' }}>
                    {selectedField()?.pdfField.name}
                  </div>
                  <div style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                    Página {selectedField()?.page} • Tipo: {selectedField()?.pdfField.type}
                  </div>
                </div>

                {/* Field ID Mapping Link */}
                <div style={{
                  'margin-bottom': '1rem',
                  padding: '1rem',
                  background: selectedField()?.customerField !== '(no mapping)' ? 'var(--success-light)' : 'var(--warning-light)',
                  border: selectedField()?.customerField !== '(no mapping)' ? '2px solid var(--success-color)' : '2px solid var(--warning-color)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', 'font-size': '0.875rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                    {selectedField()?.customerField !== '(no mapping)' ? '🔗 Relación de Campo' : '⚠️ Campo Sin Vincular'}
                  </div>

                  <Show
                    when={selectedField()?.customerField !== '(no mapping)'}
                    fallback={
                      <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                        Este campo PDF no está vinculado a ningún dato del cliente. No se llenará automáticamente.
                      </div>
                    }
                  >
                    <div style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '0.5rem',
                      'font-size': '0.75rem'
                    }}>
                      {/* PDF Field ID */}
                      <div style={{
                        padding: '0.5rem',
                        background: 'white',
                        'border-radius': '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ 'font-weight': '600', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                          📄 ID del Campo PDF:
                        </div>
                        <div style={{ 'font-family': 'monospace', 'word-break': 'break-word' }}>
                          {selectedField()?.pdfField.name}
                        </div>
                      </div>

                      {/* Link Arrow */}
                      <div style={{ 'text-align': 'center', 'font-size': '1.25rem', color: 'var(--success-color)' }}>
                        ⬇️ vinculado con ⬇️
                      </div>

                      {/* Customer Field Path */}
                      <div style={{
                        padding: '0.5rem',
                        background: 'white',
                        'border-radius': '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ 'font-weight': '600', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                          {selectedField()?.useCustomValue ? '✏️ Valor Personalizado:' : '👤 Campo del Cliente:'}
                        </div>
                        <div style={{
                          'font-family': selectedField()?.useCustomValue ? 'inherit' : 'monospace',
                          'word-break': 'break-word',
                          color: 'var(--success-color)'
                        }}>
                          {selectedField()?.useCustomValue
                            ? `"${selectedField()?.customValue || ''}"`
                            : selectedField()?.customerField}
                        </div>
                      </div>

                      {/* Value Preview */}
                      <div style={{
                        padding: '0.5rem',
                        background: 'white',
                        'border-radius': '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ 'font-weight': '600', color: 'var(--text-muted)', 'margin-bottom': '0.25rem' }}>
                          💾 Valor que se usará:
                        </div>
                        <div style={{
                          'font-weight': '600',
                          color: selectedField()?.customerValue ? 'var(--success-color)' : 'var(--text-muted)'
                        }}>
                          {selectedField()?.customerValue || '(sin valor disponible)'}
                        </div>
                      </div>
                    </div>
                  </Show>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.75rem' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const text = `${selectedField()?.pdfField.name} → ${selectedField()?.customerField}`;
                        navigator.clipboard.writeText(text);
                        setSaveMessage('📋 Relación copiada al portapapeles');
                        setTimeout(() => setSaveMessage(null), 2000);
                      }}
                      style={{ flex: 1, 'font-size': '0.75rem' }}
                    >
                      📋 Copiar Relación
                    </Button>
                    <Show when={selectedField()?.customerField !== '(no mapping)'}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedField()?.customerField || '');
                          setSaveMessage('📋 Ruta copiada al portapapeles');
                          setTimeout(() => setSaveMessage(null), 2000);
                        }}
                        style={{ flex: 1, 'font-size': '0.75rem' }}
                      >
                        📝 Copiar Ruta
                      </Button>
                    </Show>
                  </div>
                </div>

                {/* Field Mapping Selection */}
                <div style={{ 'margin-bottom': '1rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                    🔗 Mapeo a Campo del Cliente:
                  </div>

                  <Show when={editingFieldMapping() !== selectedField()?.pdfField.name}>
                    <div style={{
                      padding: '0.75rem',
                      background: 'var(--primary-light)',
                      'border-radius': 'var(--border-radius-sm)',
                      'margin-bottom': '0.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'start',
                        gap: '0.5rem'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            'font-weight': '600',
                            'font-size': '0.875rem',
                            color: 'var(--primary-color)',
                            'word-break': 'break-word'
                          }}>
                            {selectedField()?.customerField}
                          </div>
                          <div style={{
                            'font-size': '0.75rem',
                            'margin-top': '0.25rem',
                            padding: '0.25rem 0.5rem',
                            background: 'white',
                            'border-radius': '4px',
                            display: 'inline-block'
                          }}>
                            {selectedField()?.confidence === 'high' ? '🟢 Alta' :
                             selectedField()?.confidence === 'medium' ? '🟡 Media' :
                             selectedField()?.confidence === 'low' ? '🟠 Baja' : '⚪ Ninguna'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingFieldMapping(selectedField()!.pdfField.name)}
                          style={{ 'flex-shrink': 0 }}
                        >
                          ✏️ Cambiar
                        </Button>
                      </div>
                    </div>
                  </Show>

                  <Show when={editingFieldMapping() === selectedField()?.pdfField.name}>
                    {() => {
                      const currentParsed = parseArrayPath(selectedField()?.customerField || '');
                      const [selectedBasePath, setSelectedBasePath] = createSignal(
                        currentParsed ? `${currentParsed.basePath}.${currentParsed.property}` : selectedField()?.customerField || ''
                      );
                      const [tempArrayIndex, setTempArrayIndex] = createSignal(currentParsed?.index ?? 0);

                      // Check if selected base path is an array field
                      const isArrayField = () => {
                        const basePath = selectedBasePath();
                        return Array.from(getUniqueArrayFields().keys()).includes(basePath);
                      };

                      const handleApplyMapping = () => {
                        const basePath = selectedBasePath();
                        let finalPath = basePath;

                        // If it's an array field, add the index
                        if (isArrayField()) {
                          const match = basePath.match(/^([^\.]+)\.(.+)$/);
                          if (match) {
                            finalPath = `${match[1]}[${tempArrayIndex()}].${match[2]}`;
                          }
                        }

                        handleChangeFieldMapping(selectedField()!.pdfField.name, finalPath);
                      };

                      const [mappingMode, setMappingMode] = createSignal<'field' | 'custom'>(
                        selectedField()?.useCustomValue ? 'custom' : 'field'
                      );
                      const [customValueInput, setCustomValueInput] = createSignal(
                        selectedField()?.customValue || ''
                      );

                      return (
                        <div style={{ 'margin-bottom': '0.5rem' }}>
                          {/* Mode Toggle */}
                          <div style={{ 'margin-bottom': '0.75rem' }}>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              padding: '0.25rem',
                              background: 'var(--gray-100)',
                              'border-radius': 'var(--border-radius-sm)'
                            }}>
                              <button
                                type="button"
                                style={{
                                  flex: 1,
                                  padding: '0.5rem',
                                  border: 'none',
                                  background: mappingMode() === 'field' ? 'white' : 'transparent',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-weight': mappingMode() === 'field' ? '600' : '400',
                                  cursor: 'pointer',
                                  'font-size': '0.8rem',
                                  color: mappingMode() === 'field' ? 'var(--primary-color)' : 'var(--text-muted)',
                                  'box-shadow': mappingMode() === 'field' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                                onClick={() => setMappingMode('field')}
                              >
                                🔗 Campo de Cliente
                              </button>
                              <button
                                type="button"
                                style={{
                                  flex: 1,
                                  padding: '0.5rem',
                                  border: 'none',
                                  background: mappingMode() === 'custom' ? 'white' : 'transparent',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-weight': mappingMode() === 'custom' ? '600' : '400',
                                  cursor: 'pointer',
                                  'font-size': '0.8rem',
                                  color: mappingMode() === 'custom' ? 'var(--primary-color)' : 'var(--text-muted)',
                                  'box-shadow': mappingMode() === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                                onClick={() => setMappingMode('custom')}
                              >
                                ✏️ Valor Personalizado
                              </button>
                            </div>
                          </div>

                          {/* Custom Value Input */}
                          <Show when={mappingMode() === 'custom'}>
                            <div style={{ 'margin-bottom': '0.75rem' }}>
                              <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                                Valor Personalizado:
                              </label>
                              <input
                                type="text"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem'
                                }}
                                value={customValueInput()}
                                onInput={(e) => setCustomValueInput(e.currentTarget.value)}
                                placeholder="Ingresa un valor estático (ej: United States, N/A, etc.)"
                              />
                              <div style={{
                                'font-size': '0.75rem',
                                color: 'var(--text-muted)',
                                'margin-top': '0.25rem'
                              }}>
                                Este valor se usará siempre para este campo, sin depender de los datos del cliente.
                              </div>
                            </div>
                          </Show>

                          {/* Step 1: Select Field */}
                          <Show when={mappingMode() === 'field'}>
                          <div style={{ 'margin-bottom': '0.75rem' }}>
                            <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                              1. Seleccionar Campo:
                            </label>
                            <select
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)',
                                'font-size': '0.875rem'
                              }}
                              value={selectedBasePath()}
                              onChange={(e) => {
                                setSelectedBasePath(e.currentTarget.value);
                                setTempArrayIndex(0); // Reset to first index when changing field
                              }}
                            >
                              <option value="(no mapping)">-- Sin mapear --</option>
                              <For each={Array.from(clientFieldsByCategory().entries())}>
                                {([category, fields]) => (
                                  <optgroup label={category.toUpperCase()}>
                                    <For each={fields}>
                                      {(field) => {
                                        // For array fields, show base path without index
                                        const displayPath = field.isArray && field.path.match(/^([^\[]+)\[\d+\]\.(.+)$/)
                                          ? `${field.path.match(/^([^\[]+)\[\d+\]\.(.+)$/)![1]}.${field.path.match(/^([^\[]+)\[\d+\]\.(.+)$/)![2]}`
                                          : field.path;

                                        // Check if we've already added this base path
                                        const alreadyAdded = field.isArray &&
                                          Array.from(getUniqueArrayFields().keys()).includes(displayPath) &&
                                          field.path !== CLIENT_FIELD_PATHS.find(f => f.path.startsWith(displayPath.replace('.', '[0].')))?. path;

                                        if (alreadyAdded) return null;

                                        return (
                                          <option value={displayPath}>
                                            {field.label} {field.isArray ? '📋' : ''} - Ej: {field.example}
                                          </option>
                                        );
                                      }}
                                    </For>
                                  </optgroup>
                                )}
                              </For>
                            </select>
                          </div>

                          {/* Step 2: Select Array Index (if applicable) */}
                          <Show when={isArrayField()}>
                            {() => {
                              const basePath = selectedBasePath();
                              const match = basePath.match(/^([^\.]+)\.(.+)$/);
                              const arrayName = match?.[1] || '';
                              const property = match?.[2] || '';
                              const items = getArrayFieldItems(arrayName, property);

                              return (
                                <div style={{ 'margin-bottom': '0.75rem' }}>
                                  <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                                    2. Seleccionar Índice (📋 {arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}):
                                  </label>
                                  <div style={{
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '0.5rem',
                                    'max-height': '200px',
                                    'overflow-y': 'auto',
                                    padding: '0.5rem',
                                    background: 'var(--gray-50)',
                                    'border': '1px solid var(--border-color)',
                                    'border-radius': 'var(--border-radius-sm)'
                                  }}>
                                    <For each={items}>
                                      {(item) => {
                                        const isSelected = () => item.index === tempArrayIndex();
                                        const label = item.index === 0 ? `[${item.index}] Más Reciente` :
                                                     item.index === items.length - 1 ? `[${item.index}] Más Antiguo` :
                                                     `[${item.index}]`;

                                        return (
                                          <button
                                            type="button"
                                            style={{
                                              padding: '0.75rem',
                                              'text-align': 'left',
                                              border: isSelected() ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                              background: isSelected() ? 'var(--primary-light)' : 'white',
                                              'border-radius': 'var(--border-radius-sm)',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s',
                                              'font-size': '0.875rem'
                                            }}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              devLog(item)
                                              setTempArrayIndex(item.index);
                                            }}
                                            onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'var(--gray-100)')}
                                            onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'white')}
                                          >
                                            <div style={{
                                              display: 'flex',
                                              'justify-content': 'space-between',
                                              'align-items': 'start',
                                              'margin-bottom': '0.25rem'
                                            }}>
                                              <span style={{
                                                'font-weight': '600',
                                                color: isSelected() ? 'var(--primary-color)' : 'inherit'
                                              }}>
                                                {isSelected() && '✓ '}{label}
                                              </span>
                                              <span style={{
                                                'font-size': '0.75rem',
                                                padding: '0.125rem 0.375rem',
                                                background: isSelected() ? 'var(--primary-color)' : 'var(--gray-300)',
                                                color: isSelected() ? 'white' : 'var(--text-muted)',
                                                'border-radius': '3px'
                                              }}>
                                                {property}
                                              </span>
                                            </div>
                                            <div style={{
                                              'font-size': '0.75rem',
                                              color: 'var(--text-muted)',
                                              'margin-bottom': '0.25rem'
                                            }}>
                                              {item.preview}
                                            </div>
                                            <div style={{
                                              'font-size': '0.75rem',
                                              'font-weight': '600',
                                              color: item.value ? 'var(--success-color)' : 'var(--text-muted)'
                                            }}>
                                              Valor: {item.value ? String(item.value) : '(vacío)'}
                                            </div>
                                          </button>
                                        );
                                      }}
                                    </For>
                                  </div>
                                </div>
                              );
                            }}
                          </Show>
                          </Show>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                if (mappingMode() === 'custom') {
                                  // Apply custom value
                                  devLog(`🔄 Applying custom value: "${customValueInput()}" to field ${selectedField()!.pdfField.name}`);

                                  const updated = mappedFields().map(field => {
                                    if (field.pdfField.name === selectedField()!.pdfField.name) {
                                      return {
                                        ...field,
                                        useCustomValue: true,
                                        customValue: customValueInput(),
                                        customerField: '(custom value)',
                                        customerValue: customValueInput(),
                                        confidence: 'high' as const,
                                        matches: field.pdfValue === customValueInput()
                                      };
                                    }
                                    return field;
                                  });

                                  devLog(`✅ Custom value applied successfully`);
                                  setMappedFields(updated);

                                  const updatedField = updated.find(f => f.pdfField.name === selectedField()!.pdfField.name);
                                  if (updatedField) {
                                    setSelectedField(updatedField);
                                  }

                                  setEditingFieldMapping(null);

                                  // Show success message
                                  setSaveMessage(`✅ Valor personalizado guardado: "${customValueInput()}"`);
                                  setTimeout(() => setSaveMessage(null), 2000);

                                  // Mark as having unsaved changes
                                  setHasUnsavedChanges(true);
                                } else {
                                  // Apply customer field mapping
                                  handleApplyMapping();
                                }
                              }}
                              style={{ flex: 1 }}
                            >
                              ✓ Aplicar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingFieldMapping(null)}
                              style={{ flex: 1 }}
                            >
                              ✕ Cancelar
                            </Button>
                          </div>
                        </div>
                      );
                    }}
                  </Show>
                </div>

                {/* Conditional Rules Manager */}
                <div style={{ 'margin-bottom': '1rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                    ⚙️ Regla Condicional:
                  </div>

                  <Show when={editingConditional() !== selectedField()?.pdfField.name}>
                    <Show
                      when={selectedField()?.conditional?.enabled}
                      fallback={
                        <div style={{
                          padding: '0.75rem',
                          background: 'var(--gray-50)',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.875rem'
                        }}>
                          <div style={{ color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                            Sin condiciones - siempre llenar
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingConditional(selectedField()!.pdfField.name)}
                            style={{ width: '100%' }}
                          >
                            ➕ Agregar Condición
                          </Button>
                        </div>
                      }
                    >
                      <div style={{
                        padding: '0.75rem',
                        background: 'var(--warning-light)',
                        'border-radius': 'var(--border-radius-sm)'
                      }}>
                        <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.5rem', color: 'var(--warning-color)' }}>
                          ⚠️ {getConditionalDescription(selectedField()?.conditional)}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.5rem' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingConditional(selectedField()!.pdfField.name)}
                            style={{ flex: 1 }}
                          >
                            ✏️ Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeConditional(selectedField()!.pdfField.name)}
                            style={{ flex: 1 }}
                          >
                            🗑️ Quitar
                          </Button>
                        </div>
                      </div>
                    </Show>
                  </Show>

                  {/* Conditional Editor */}
                  <Show when={editingConditional() === selectedField()?.pdfField.name}>
                    {() => {
                      const [condType, setCondType] = createSignal<FormFieldMapping['conditional']['type']>(
                        selectedField()?.conditional?.type || 'skip_if_empty'
                      );
                      const [checkPath, setCheckPath] = createSignal(
                        selectedField()?.conditional?.checkFieldPath || selectedField()?.customerField || ''
                      );
                      const [expectedVal, setExpectedVal] = createSignal(
                        selectedField()?.conditional?.expectedValue || ''
                      );
                      const [customDesc, setCustomDesc] = createSignal(
                        selectedField()?.conditional?.description || ''
                      );

                      return (
                        <div style={{
                          padding: '0.75rem',
                          background: 'var(--info-light)',
                          'border-radius': 'var(--border-radius-sm)'
                        }}>
                          <div style={{ 'margin-bottom': '0.75rem' }}>
                            <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                              Tipo de Condición:
                            </label>
                            <select
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                'border-radius': 'var(--border-radius-sm)',
                                'font-size': '0.875rem'
                              }}
                              value={condType()}
                              onChange={(e) => setCondType(e.currentTarget.value as any)}
                            >
                              <option value="always_fill">✅ Siempre llenar este campo</option>
                              <option value="never_fill">❌ Nunca llenar este campo</option>
                              <option value="skip_if_empty">No llenar si está vacío</option>
                              <option value="only_if_true">Solo llenar si es verdadero/sí</option>
                              <option value="only_if_false">Solo llenar si es falso/no</option>
                              <option value="only_if_equals">Solo llenar si es igual a...</option>
                              <option value="only_if_not_equals">Solo llenar si NO es igual a...</option>
                            </select>
                          </div>

                          <Show when={condType() !== 'skip_if_empty'}>
                            <div style={{ 'margin-bottom': '0.75rem' }}>
                              <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                                Campo a verificar:
                              </label>
                              <select
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem'
                                }}
                                value={checkPath()}
                                onChange={(e) => setCheckPath(e.currentTarget.value)}
                              >
                                <option value={selectedField()?.customerField}>
                                  Este campo ({selectedField()?.customerField})
                                </option>
                                <optgroup label="CAMPOS COMUNES">
                                  <option value="isMarriage">¿Está casado? (isMarriage)</option>
                                  <option value="isInUSA">¿Está en USA? (isInUSA)</option>
                                  <option value="hasI94">¿Tiene I-94? (hasI94)</option>
                                  <option value="hasLPR">¿Tiene LPR? (hasLPR)</option>
                                </optgroup>
                                <For each={Array.from(clientFieldsByCategory().entries())}>
                                  {([category, fields]) => (
                                    <optgroup label={category.toUpperCase()}>
                                      <For each={fields.slice(0, 10)}>
                                        {(field) => (
                                          <option value={field.path}>
                                            {field.label} ({field.path})
                                          </option>
                                        )}
                                      </For>
                                    </optgroup>
                                  )}
                                </For>
                              </select>
                            </div>
                          </Show>

                          <Show when={condType() === 'only_if_equals' || condType() === 'only_if_not_equals'}>
                            <div style={{ 'margin-bottom': '0.75rem' }}>
                              <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                                Valor esperado:
                              </label>
                              <input
                                type="text"
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem'
                                }}
                                value={expectedVal()}
                                onInput={(e) => setExpectedVal(e.currentTarget.value)}
                                placeholder="Ej: USA, true, 2020"
                              />
                            </div>
                          </Show>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setConditional(selectedField()!.pdfField.name, {
                                  enabled: true,
                                  type: condType(),
                                  checkFieldPath: condType() === 'skip_if_empty' ? undefined : checkPath(),
                                  expectedValue: (condType() === 'only_if_equals' || condType() === 'only_if_not_equals') ? expectedVal() : undefined,
                                  description: customDesc() || undefined
                                });
                              }}
                              style={{ flex: 1 }}
                            >
                              ✓ Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingConditional(null)}
                              style={{ flex: 1 }}
                            >
                              ✕ Cancelar
                            </Button>
                          </div>
                        </div>
                      );
                    }}
                  </Show>
                </div>

                {/* Checkbox Behavior Manager - Only show for checkbox fields */}
                <Show when={selectedField()?.pdfField.type === 'checkbox'}>
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                      ☑️ Comportamiento del Checkbox:
                    </div>

                    <Show when={editingCheckbox() !== selectedField()?.pdfField.name}>
                      <Show
                        when={selectedField()?.checkboxBehavior}
                        fallback={
                          <div style={{
                            padding: '0.75rem',
                            background: 'var(--gray-50)',
                            'border-radius': 'var(--border-radius-sm)',
                            'font-size': '0.875rem'
                          }}>
                            <div style={{ color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                              📝 Basado en valor del campo mapeado
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCheckbox(selectedField()!.pdfField.name)}
                              style={{ width: '100%' }}
                            >
                              ⚙️ Configurar Comportamiento
                            </Button>
                          </div>
                        }
                      >
                        {() => {
                          const behavior = selectedField()!.checkboxBehavior!;
                          const getBehaviorLabel = () => {
                            if (behavior.type === 'always_true') return '✅ Siempre marcado';
                            if (behavior.type === 'always_false') return '❌ Siempre desmarcado';
                            if (behavior.type === 'based_on_field') return `🔗 Basado en: ${behavior.fieldPath}`;
                            return 'Sin configurar';
                          };

                          return (
                            <div style={{
                              padding: '0.75rem',
                              background: 'var(--info-light)',
                              'border-radius': 'var(--border-radius-sm)'
                            }}>
                              <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.5rem', color: 'var(--info-color)' }}>
                                {getBehaviorLabel()}
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.5rem' }}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCheckbox(selectedField()!.pdfField.name)}
                                  style={{ flex: 1 }}
                                >
                                  ✏️ Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeCheckboxBehavior(selectedField()!.pdfField.name)}
                                  style={{ flex: 1 }}
                                >
                                  🗑️ Quitar
                                </Button>
                              </div>
                            </div>
                          );
                        }}
                      </Show>
                    </Show>

                    {/* Checkbox Behavior Editor */}
                    <Show when={editingCheckbox() === selectedField()?.pdfField.name}>
                      {() => {
                        const [behaviorType, setBehaviorType] = createSignal<'always_true' | 'always_false' | 'based_on_field'>(
                          selectedField()?.checkboxBehavior?.type || 'based_on_field'
                        );
                        const [fieldPath, setFieldPath] = createSignal(
                          selectedField()?.checkboxBehavior?.fieldPath || selectedField()?.customerField || ''
                        );

                        return (
                          <div style={{
                            padding: '0.75rem',
                            background: 'var(--info-light)',
                            'border-radius': 'var(--border-radius-sm)'
                          }}>
                            <div style={{ 'margin-bottom': '0.75rem' }}>
                              <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                                Comportamiento:
                              </label>
                              <select
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid var(--border-color)',
                                  'border-radius': 'var(--border-radius-sm)',
                                  'font-size': '0.875rem'
                                }}
                                value={behaviorType()}
                                onChange={(e) => setBehaviorType(e.currentTarget.value as any)}
                              >
                                <option value="based_on_field">🔗 Basado en valor de campo</option>
                                <option value="always_true">✅ Siempre marcado (checked)</option>
                                <option value="always_false">❌ Siempre desmarcado (unchecked)</option>
                              </select>
                            </div>

                            <Show when={behaviorType() === 'based_on_field'}>
                              <div style={{ 'margin-bottom': '0.75rem' }}>
                                <label style={{ 'font-size': '0.75rem', 'font-weight': '600', display: 'block', 'margin-bottom': '0.25rem' }}>
                                  Campo a verificar:
                                </label>
                                <select
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    'border-radius': 'var(--border-radius-sm)',
                                    'font-size': '0.875rem'
                                  }}
                                  value={fieldPath()}
                                  onChange={(e) => setFieldPath(e.currentTarget.value)}
                                >
                                  <option value={selectedField()?.customerField}>
                                    Campo mapeado actual ({selectedField()?.customerField})
                                  </option>
                                  <optgroup label="CAMPOS BOOLEANOS COMUNES">
                                    <option value="isMarriage">¿Está casado? (isMarriage)</option>
                                    <option value="isInUSA">¿Está en USA? (isInUSA)</option>
                                    <option value="hasI94">¿Tiene I-94? (hasI94)</option>
                                    <option value="hasLPR">¿Tiene LPR? (hasLPR)</option>
                                  </optgroup>
                                  <For each={Array.from(clientFieldsByCategory().entries())}>
                                    {([category, fields]) => (
                                      <optgroup label={category.toUpperCase()}>
                                        <For each={fields.slice(0, 10)}>
                                          {(field) => (
                                            <option value={field.path}>
                                              {field.label} ({field.path})
                                            </option>
                                          )}
                                        </For>
                                      </optgroup>
                                    )}
                                  </For>
                                </select>
                                <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                                  El checkbox se marcará si el valor es: true, yes, sí, 1, o x
                                </div>
                              </div>
                            </Show>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setCheckboxBehavior(selectedField()!.pdfField.name, {
                                    type: behaviorType(),
                                    fieldPath: behaviorType() === 'based_on_field' ? fieldPath() : undefined
                                  });
                                }}
                                style={{ flex: 1 }}
                              >
                                ✓ Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingCheckbox(null)}
                                style={{ flex: 1 }}
                              >
                                ✕ Cancelar
                              </Button>
                            </div>
                          </div>
                        );
                      }}
                    </Show>
                  </div>
                </Show>

                {/* Field Linking Manager */}
                <Show when={parseArrayPath(selectedField()?.customerField || '')}>
                  {(parsed) => {
                    const relatedFields = findRelatedFields(selectedField()!.pdfField.name);
                    const linkedFields = getLinkedFields(selectedField()!.pdfField.name);
                    const isLinked = isFieldLinked(selectedField()!.pdfField.name);
                    const linkGroupId = getLinkGroupId(selectedField()!.pdfField.name);

                    return (
                      <Show when={relatedFields.length > 0 || isLinked}>
                        <div style={{ 'margin-bottom': '1rem' }}>
                          <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                            🔗 Vincular Campos Relacionados:
                          </div>

                          {/* Show linked fields if already linked */}
                          <Show when={isLinked}>
                            <div style={{
                              padding: '0.75rem',
                              background: 'var(--success-light)',
                              'border-radius': 'var(--border-radius-sm)',
                              'margin-bottom': '0.5rem'
                            }}>
                              <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.5rem', color: 'var(--success-color)' }}>
                                ✓ Vinculado con {linkedFields.length} campo{linkedFields.length > 1 ? 's' : ''}
                              </div>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                                Al cambiar el índice, todos estos campos se actualizarán:
                              </div>
                              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
                                <For each={linkedFields}>
                                  {(fieldName) => {
                                    const linkedField = mappedFields().find(f => f.pdfField.name === fieldName);
                                    if (!linkedField) return null;

                                    const fieldParsed = parseArrayPath(linkedField.customerField);
                                    return (
                                      <div style={{
                                        'font-size': '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        background: 'white',
                                        'border-radius': '3px'
                                      }}>
                                        • {fieldParsed?.property || fieldName}
                                      </div>
                                    );
                                  }}
                                </For>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unlinkField(selectedField()!.pdfField.name)}
                                style={{ 'margin-top': '0.5rem', width: '100%' }}
                              >
                                🔓 Desvincular Este Campo
                              </Button>
                            </div>
                          </Show>

                          {/* Show related fields that can be linked */}
                          <Show when={!isLinked && relatedFields.length > 0}>
                            <div style={{
                              padding: '0.75rem',
                              background: 'var(--info-light)',
                              'border-radius': 'var(--border-radius-sm)',
                              'margin-bottom': '0.5rem'
                            }}>
                              <div style={{ 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
                                💡 Campos relacionados detectados ({relatedFields.length}):
                              </div>
                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                                Estos campos usan el mismo {parsed().basePath}[{parsed().index}]:
                              </div>
                              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem', 'margin-bottom': '0.5rem' }}>
                                <For each={relatedFields.slice(0, 5)}>
                                  {(field) => {
                                    const fieldParsed = parseArrayPath(field.customerField);
                                    return (
                                      <div style={{
                                        'font-size': '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        background: 'white',
                                        'border-radius': '3px'
                                      }}>
                                        • {fieldParsed?.property || field.pdfField.name}
                                      </div>
                                    );
                                  }}
                                </For>
                                <Show when={relatedFields.length > 5}>
                                  <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'padding-left': '0.5rem' }}>
                                    ... y {relatedFields.length - 5} más
                                  </div>
                                </Show>
                              </div>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  const allFields = [selectedField()!.pdfField.name, ...relatedFields.map(f => f.pdfField.name)];
                                  linkFields(allFields);
                                }}
                                style={{ width: '100%' }}
                              >
                                🔗 Vincular Todos ({relatedFields.length + 1} campos)
                              </Button>
                              <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)', 'margin-top': '0.5rem' }}>
                                Al vincular, cambiar el índice actualizará todos los campos
                              </div>
                            </div>
                          </Show>
                        </div>
                      </Show>
                    );
                  }}
                </Show>

                {/* Array Index Selector (for residences, employers, etc.) */}
                <Show when={parseArrayPath(selectedField()?.customerField || '')}>
                  {(parsed) => {
                    const items = getArrayFieldItems(parsed().basePath, parsed().property);
                    const isLinked = isFieldLinked(selectedField()!.pdfField.name);
                    const linkedCount = getLinkedFields(selectedField()!.pdfField.name).length;

                    return (
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                          📋 Seleccionar Item {parsed().basePath === 'residences' ? 'de Residencias' :
                                              parsed().basePath === 'employers' ? 'de Empleadores' :
                                              parsed().basePath === 'schoolHistory' ? 'de Escuelas' : ''}:
                        </div>
                        <Show when={isLinked}>
                          <div style={{
                            'font-size': '0.75rem',
                            padding: '0.5rem',
                            background: 'var(--warning-light)',
                            'border-radius': 'var(--border-radius-sm)',
                            'margin-bottom': '0.5rem',
                            color: 'var(--warning-color)'
                          }}>
                            ⚠️ Este campo está vinculado con {linkedCount} campo{linkedCount > 1 ? 's' : ''}. Cambiar el índice actualizará todos.
                          </div>
                        </Show>
                        <div style={{
                          display: 'flex',
                          'flex-direction': 'column',
                          gap: '0.5rem',
                          'max-height': '200px',
                          'overflow-y': 'auto',
                          padding: '0.5rem',
                          background: 'var(--gray-50)',
                          'border-radius': 'var(--border-radius-sm)'
                        }}>
                          <For each={items}>
                            {(item) => {
                              const isSelected = () => item.index === parsed().index;
                              const label = () => item.index === 0 ? `${item.index} (Más Reciente)` :
                                           item.index === items.length - 1 ? `${item.index} (Más Antiguo)` :
                                           `${item.index}`;

                              return (
                                <button
                                  style={{
                                    padding: '0.75rem',
                                    'text-align': 'left',
                                    border: isSelected() ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    background: isSelected() ? 'var(--primary-light)' : 'white',
                                    'border-radius': 'var(--border-radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    'font-size': '0.875rem'
                                  }}
                                  onClick={() => !isSelected() && handleChangeArrayIndex(selectedField()!.pdfField.name, item.index)}
                                  onMouseEnter={(e) => !isSelected() && (e.currentTarget.style.background = 'var(--gray-100)')}
                                  onMouseLeave={(e) => !isSelected() && (e.currentTarget.style.background = 'white')}
                                >
                                  <div style={{
                                    display: 'flex',
                                    'justify-content': 'space-between',
                                    'align-items': 'start',
                                    'margin-bottom': '0.25rem'
                                  }}>
                                    <span style={{
                                      'font-weight': '600',
                                      color: isSelected() ? 'var(--primary-color)' : 'inherit'
                                    }}>
                                      {isSelected() && '✓ '}#{label()}
                                    </span>
                                    <span style={{
                                      'font-size': '0.75rem',
                                      padding: '0.125rem 0.375rem',
                                      background: isSelected() ? 'var(--primary-color)' : 'var(--gray-300)',
                                      color: isSelected() ? 'white' : 'var(--text-muted)',
                                      'border-radius': '3px'
                                    }}>
                                      {parsed().property}
                                    </span>
                                  </div>
                                  <div style={{
                                    'font-size': '0.75rem',
                                    color: 'var(--text-muted)',
                                    'margin-bottom': '0.25rem'
                                  }}>
                                    {item.preview}
                                  </div>
                                  <div style={{
                                    'font-size': '0.75rem',
                                    'font-weight': '600',
                                    color: item.value ? 'var(--success-color)' : 'var(--text-muted)'
                                  }}>
                                    Valor: {item.value ? String(item.value) : '(vacío)'}
                                  </div>
                                </button>
                              );
                            }}
                          </For>
                        </div>
                        <div style={{
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)',
                          'margin-top': '0.5rem',
                          padding: '0.5rem',
                          background: 'var(--info-light)',
                          'border-radius': 'var(--border-radius-sm)'
                        }}>
                          💡 Tip: [0] es el más reciente, números mayores son más antiguos
                        </div>
                      </div>
                    );
                  }}
                </Show>

                <div style={{ 'margin-bottom': '1rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                    Valor en PDF:
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--gray-50)',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.875rem',
                    'min-height': '40px',
                    'word-break': 'break-word'
                  }}>
                    {selectedField()?.pdfValue || '(vacío)'}
                  </div>
                </div>

                <div style={{ 'margin-bottom': '1rem' }}>
                  <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem', 'font-size': '0.875rem' }}>
                    Valor del Cliente:
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: selectedField()?.customerValue ? 'var(--success-light)' : 'var(--gray-50)',
                    'border-radius': 'var(--border-radius-sm)',
                    'font-size': '0.875rem',
                    'min-height': '40px',
                    'word-break': 'break-word'
                  }}>
                    {selectedField()?.customerValue || '(no disponible)'}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: selectedField()?.matches ? 'var(--success-light)' :
                             selectedField()?.customerValue && selectedField()?.pdfValue ? 'var(--danger-light)' :
                             'var(--warning-light)',
                  'border-radius': 'var(--border-radius-sm)',
                  'font-size': '0.875rem'
                }}>
                  <strong>Estado:</strong>{' '}
                  {selectedField()?.matches ? '✅ Los valores coinciden' :
                   selectedField()?.customerValue && selectedField()?.pdfValue ? '❌ Los valores no coinciden' :
                   selectedField()?.customerValue ? '📝 Campo vacío, hay dato disponible' :
                   '❓ No hay dato del cliente'}
                </div>

                {/* Conditional Evaluation Result */}
                <Show when={selectedField()?.conditional?.enabled}>
                  {() => {
                    const evaluation = evaluateConditional(
                      selectedField()!.conditional,
                      mergedData(),
                      selectedField()!.customerValue
                    );

                    return (
                      <div style={{
                        padding: '1rem',
                        background: evaluation.shouldFill ? 'var(--success-light)' : 'var(--danger-light)',
                        'border-radius': 'var(--border-radius-sm)',
                        'font-size': '0.875rem',
                        'margin-top': '0.5rem'
                      }}>
                        <strong>Evaluación Condicional:</strong><br/>
                        {evaluation.shouldFill ? (
                          <span style={{ color: 'var(--success-color)' }}>
                            ✅ SE LLENARÁ - Condición cumplida
                          </span>
                        ) : (
                          <span style={{ color: 'var(--danger-color)' }}>
                            ⏭️ SE OMITIRÁ - {evaluation.reason}
                          </span>
                        )}
                      </div>
                    );
                  }}
                </Show>

                {/* Approval Actions (Review Mode) */}
                <Show when={showReviewMode()}>
                  <div style={{ 'margin-top': '1rem', 'padding-top': '1rem', 'border-top': '2px solid var(--border-color)' }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem', 'font-size': '0.875rem' }}>
                      📝 Revisión del Mapeo:
                    </div>

                    <Show
                      when={selectedField()?.reviewed}
                      fallback={
                        <div>
                          <div style={{
                            padding: '0.75rem',
                            background: 'var(--warning-light)',
                            'border-radius': 'var(--border-radius-sm)',
                            'margin-bottom': '0.75rem',
                            'font-size': '0.875rem'
                          }}>
                            ⚠️ Este mapeo aún no ha sido revisado
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => approveMapping(selectedField()!.pdfField.name)}
                              style={{ flex: 1, background: 'var(--success-color)' }}
                            >
                              ✓ Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMapping(selectedField()!.pdfField.name, 'Mapeo incorrecto')}
                              style={{ flex: 1, color: 'var(--danger-color)', 'border-color': 'var(--danger-color)' }}
                            >
                              ✗ Rechazar
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <div style={{
                        padding: '0.75rem',
                        background: selectedField()?.approved ? 'var(--success-light)' : 'var(--danger-light)',
                        'border-radius': 'var(--border-radius-sm)',
                        'margin-bottom': '0.75rem'
                      }}>
                        <div style={{
                          'font-size': '0.875rem',
                          'margin-bottom': '0.5rem',
                          color: selectedField()?.approved ? 'var(--success-color)' : 'var(--danger-color)',
                          'font-weight': '600'
                        }}>
                          {selectedField()?.approved ? '✅ APROBADO' : '❌ RECHAZADO'}
                        </div>
                        <Show when={selectedField()?.rejectionReason}>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            Razón: {selectedField()?.rejectionReason}
                          </div>
                        </Show>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Show when={!selectedField()?.approved}>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => approveMapping(selectedField()!.pdfField.name)}
                            style={{ flex: 1, background: 'var(--success-color)' }}
                          >
                            ✓ Aprobar
                          </Button>
                        </Show>
                        <Show when={selectedField()?.approved}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMapping(selectedField()!.pdfField.name, 'Mapeo incorrecto')}
                            style={{ flex: 1, color: 'var(--danger-color)', 'border-color': 'var(--danger-color)' }}
                          >
                            ✗ Rechazar
                          </Button>
                        </Show>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const updated = mappedFields().map(f => {
                              if (f.pdfField.name === selectedField()!.pdfField.name) {
                                return { ...f, reviewed: false, approved: false, rejectionReason: undefined };
                              }
                              return f;
                            });
                            setMappedFields(updated);
                          }}
                          style={{ flex: 1 }}
                        >
                          🔄 Reiniciar
                        </Button>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </Card>
          </Show>
        </div>
      </Show>
    </div>
    </>
  );
};

export default PDFFieldMapper;
