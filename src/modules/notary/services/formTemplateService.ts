import { FormTemplate, FormFieldMapping, FormMappingSession } from '../types/formMapping';
import { fetchGraphQLSS, devLog } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';

/**
 * Service to manage form templates and field mappings
 */

// In-memory cache of form templates
let templateCache: Map<string, FormTemplate> = new Map();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new form template
 */
export function createFormTemplate(params: {
  formName: string;
  formVersion?: string;
  description?: string;
  totalPages: number;
  totalFields: number;
  fields: FormFieldMapping[];
  createdBy?: string;
}): FormTemplate {
  const now = Date.now();

  const template: FormTemplate = {
    id: generateId(),
    templateName:params.formName ,
    formType: params.formName,
    fields : JSON.stringify(params.fields),
    formName: params.formName,
    formVersion: params.formVersion,
    description: params.description,
    totalPages: params.totalPages,
    totalFields: params.totalFields,
    settings: {
      autoFill: true,
      validateBeforeFill: true,
      flattenAfterFill: true
    },
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isActive: true,
    stats: {
      timesUsed: 0,
      successRate: 0,
      averageConfidence: calculateAverageConfidence(params.fields)
    }
  };

  templateCache.set(template.id, template);
  return template;
}

/**
 * Update an existing form template
 */
export function updateFormTemplate(
  templateId: string,
  updates: Partial<FormTemplate>,
  updatedBy?: string
): FormTemplate | null {
  const template = templateCache.get(templateId);
  if (!template) return null;

  const updatedTemplate: FormTemplate = {
    ...template,
    ...updates,
    id: template.id, // Preserve ID
    version: template.version + 1,
    updatedBy,
    updatedAt: Date.now()
  };

  // Recalculate stats if fields changed
  if (updates.fields) {
    updatedTemplate.stats = {
      ...template.stats!,
      averageConfidence: calculateAverageConfidence(updates.fields)
    };
  }

  templateCache.set(templateId, updatedTemplate);
  return updatedTemplate;
}

/**
 * Get a form template by ID
 */
export function getFormTemplate(templateId: string): FormTemplate | null {
  return templateCache.get(templateId) || null;
}

/**
 * Get all form templates
 */
export function getAllFormTemplates(): FormTemplate[] {
  return Array.from(templateCache.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get form templates by form name
 */
export function getFormTemplatesByName(formName: string): FormTemplate[] {
  return Array.from(templateCache.values())
    .filter(t => t.formName.toLowerCase().includes(formName.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Delete a form template
 */
export function deleteFormTemplate(templateId: string): boolean {
  return templateCache.delete(templateId);
}

/**
 * Update a specific field mapping in a template
 */
export function updateFieldMapping(
  templateId: string,
  pdfFieldName: string,
  updates: Partial<FormFieldMapping>,
  updatedBy?: string
): FormTemplate | null {
  const template = templateCache.get(templateId);
  if (!template) return null;

  const updatedMappings = template.fields.map(mapping => {
    if (mapping.pdfFieldName === pdfFieldName) {
      return {
        ...mapping,
        ...updates,
        lastModified: Date.now()
      };
    }
    return mapping;
  });

  return updateFormTemplate(
    templateId,
    { fields: updatedMappings },
    updatedBy
  );
}

/**
 * Add or update manual override for a field
 */
export function setFieldOverride(
  templateId: string,
  pdfFieldName: string,
  overrideValue: string,
  reason?: string,
  overriddenBy?: string
): FormTemplate | null {
  return updateFieldMapping(templateId, pdfFieldName, {
    manualOverride: {
      enabled: true,
      value: overrideValue,
      reason,
      overriddenBy,
      overriddenAt: Date.now()
    },
    mappingSource: 'manual'
  });
}

/**
 * Remove manual override from a field
 */
export function removeFieldOverride(
  templateId: string,
  pdfFieldName: string
): FormTemplate | null {
  return updateFieldMapping(templateId, pdfFieldName, {
    manualOverride: undefined
  });
}

/**
 * Update client field path mapping
 */
export function updateClientFieldPath(
  templateId: string,
  pdfFieldName: string,
  newClientFieldPath: string,
  updatedBy?: string
): FormTemplate | null {
  return updateFieldMapping(
    templateId,
    pdfFieldName,
    {
      clientFieldPath: newClientFieldPath,
      mappingSource: 'manual',
      lastModified: Date.now()
    },
    updatedBy
  );
}

/**
 * Calculate average confidence of all mappings
 */
function calculateAverageConfidence(mappings: FormFieldMapping[]): number {
  if (mappings.length === 0) return 0;

  const sum = mappings.reduce((acc, m) => acc + m.confidence, 0);
  return sum / mappings.length;
}

/**
 * Create a mapping session for filling a form
 */
export function createMappingSession(
  templateId: string,
  customerId: string
): FormMappingSession {
  const template = templateCache.get(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  return {
    id: generateId(),
    templateId,
    customerId,
    fields: [...template.fields], // Clone mappings
    overrides: {},
    startedAt: Date.now(),
    status: 'draft'
  };
}

/**
 * Update a mapping session
 */
export function updateMappingSession(
  session: FormMappingSession,
  updates: Partial<FormMappingSession>
): FormMappingSession {
  return {
    ...session,
    ...updates,
    lastSavedAt: Date.now()
  };
}

/**
 * Save form template to server via GraphQL API (create new)
 * templateName,
      formType,
      fields,
 */
export async function saveTemplateToServer(template: FormTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

  
    const bdyq2 = {
      query: "savePdfFormStructure",
      params,
      form: {
        ...template,
        createdAt: template.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    };

      devLog({bdyq2})
    const response = await fetchGraphQLSS(bdyq2);

    // Update cache
    templateCache.set(template.id, template);

    devLog('Template saved to server:', template.id);
    return { success: true };
  } catch (error) {
    devLog('Error saving template to server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update form template on server via GraphQL API
 */
export async function updateTemplateToServer(template: FormTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: template.id,
      userId: authStore.state?.user?.uid,
      timestamp: new Date().getTime()
    };

    const bdyq2 = {
      query: "updatePdfFormStructure",
      params,
      form: {
        ...template,
        updatedAt: Date.now()
      }
    };

    devLog('Updating template:', bdyq2);
    const response = await fetchGraphQLSS(bdyq2);

    // Update cache
    templateCache.set(template.id, template);

    devLog('Template updated on server:', template.id);
    return { success: true };
  } catch (error) {
    devLog('Error updating template on server:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Load form template from server via GraphQL API
 */
export async function loadTemplateFromServer(templateId: string): Promise<FormTemplate | null> {
  try {
    // Check cache first
    if (templateCache.has(templateId)) {
      return templateCache.get(templateId)!;
    }

    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: templateId
    };

    const bdyq2 = {
      query: "getPdfFormStructure",
      params
    };

    devLog('Loading template:', bdyq2);
    const response = await fetchGraphQLSS(bdyq2);

    if (!response || !response.data) {
      devLog('Template not found:', templateId);
      return null;
    }

    const template = response.data as FormTemplate;

    // Update cache
    templateCache.set(templateId, template);

    devLog('Template loaded from server:', templateId);
    return template;
  } catch (error) {
    devLog('Error loading template from server:', error);
    return null;
  }
}

/**
 * Load all form templates from server via GraphQL API
 */
export async function loadAllTemplatesFromServer(): Promise<FormTemplate[]> {
  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId()
    };

    const bdyq2 = {
      query: "listPdfFormStructures",
      params
    };

    devLog('Loading all templates:', bdyq2);
    const response = await fetchGraphQLSS(bdyq2);

    const templates: FormTemplate[] = response.data || [];

    // Update cache for each template
    let templ = templates.map((template) => {
    

      let data = JSON.parse(template.data);
      let {fields, ...cus } = data
     let newTemplate = {
        id: template.id,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
       ...cus,
       fields: JSON.parse(fields)
      } 
      
      templateCache.set(template.id, newTemplate);
      return newTemplate;
    });

    // Sort by updatedAt desc
    templ.sort((a, b) => b.updatedAt - a.updatedAt);

  
    devLog(`Loaded ${templ.length} templates from server`);
    return templ;
  } catch (error) {
    devLog('Error loading templates from server:', error);
    // Return cached templates as fallback
    return getAllFormTemplates();
  }
}

/**
 * Export template as JSON
 */
export function exportTemplateAsJSON(template: FormTemplate): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Import template from JSON
 */
export function importTemplateFromJSON(json: string): FormTemplate {
  const template = JSON.parse(json) as FormTemplate;

  // Generate new ID to avoid conflicts
  template.id = generateId();
  template.createdAt = Date.now();
  template.updatedAt = Date.now();

  templateCache.set(template.id, template);
  return template;
}

/**
 * Duplicate a template
 */
export function duplicateTemplate(templateId: string, newName?: string): FormTemplate | null {
  const original = templateCache.get(templateId);
  if (!original) return null;

  const duplicate: FormTemplate = {
    ...original,
    id: generateId(),
    formName: newName || `${original.formName} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    stats: {
      timesUsed: 0,
      successRate: 0,
      averageConfidence: original.stats?.averageConfidence || 0
    }
  };

  templateCache.set(duplicate.id, duplicate);
  return duplicate;
}

/**
 * Get statistics for a template
 */
export function getTemplateStats(templateId: string): {
  totalFields: number;
  mappedFields: number;
  unmappedFields: number;
  manualMappings: number;
  aiMappings: number;
  averageConfidence: number;
  highConfidenceFields: number;
  lowConfidenceFields: number;
} | null {
  const template = templateCache.get(templateId);
  if (!template) return null;

  const totalFields = template.fields.length;
  const mappedFields = template.fields?.filter(m => m.clientFieldPath !== '(no mapping)').length;
  const unmappedFields = totalFields - mappedFields;
  const manualMappings = template.fields?.filter(m => m.mappingSource === 'manual').length;
  const aiMappings = template.fields?.filter(m => m.mappingSource === 'ai').length;
  const averageConfidence = template?.fields? calculateAverageConfidence(template?.fields) : {};
  const highConfidenceFields = template.fields?.filter(m => m.confidence >= 0.8).length;
  const lowConfidenceFields = template.fields?.filter(m => m.confidence < 0.5).length;

  return {
    totalFields,
    mappedFields,
    unmappedFields,
    manualMappings,
    aiMappings,
    averageConfidence,
    highConfidenceFields,
    lowConfidenceFields
  };
}

// ============================================================================
// PDF Form Structure API Functions
// ============================================================================

/**
 * Save PDF form structure to Firestore
 */
export async function savePdfFormStructure(template: FormTemplate): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
  try {
    const result = await saveTemplateToServer(template);
    if (result.success) {
      return { success: true, data: template };
    }
    return result;
  } catch (error) {
    devLog('Error in savePdfFormStructure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get a specific PDF form structure by ID
 */
export async function getPdfFormStructure(templateId: string): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
  try {
    const template = await loadTemplateFromServer(templateId);
    if (template) {
      return { success: true, data: template };
    }
    return { success: false, error: 'Template not found' };
  } catch (error) {
    devLog('Error in getPdfFormStructure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * List all PDF form structures
 */
export async function listPdfFormStructures(filters?: {
  formName?: string;
  isActive?: boolean;
  limit?: number;
}): Promise<{ success: boolean; data?: FormTemplate[]; error?: string }> {
  try {
    let templates = await loadAllTemplatesFromServer();
    devLog(templates)
    // Apply filters
    if (filters?.formName) {
      templates = templates.filter(t =>
        t.formName.toLowerCase().includes(filters.formName!.toLowerCase())
      );
    }

    if (filters?.isActive !== undefined) {
      templates = templates.filter(t => t.isActive === filters.isActive);
    }

    if (filters?.limit) {
      templates = templates.slice(0, filters.limit);
    }

    return { success: true, data: templates };
  } catch (error) {
    devLog('Error in listPdfFormStructures:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update an existing PDF form structure
 */
export async function updatePdfFormStructure(
  templateId: string,
  updates: Partial<FormTemplate>,
  updatedBy?: string
): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
  try {
    const updatedTemplate = updateFormTemplate(templateId, updates, updatedBy);

    if (!updatedTemplate) {
      return { success: false, error: 'Template not found' };
    }

    // Update on server using update query
    const result = await updateTemplateToServer(updatedTemplate);

    if (result.success) {
      return { success: true, data: updatedTemplate };
    }

    return result;
  } catch (error) {
    devLog('Error in updatePdfFormStructure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a PDF form structure
 */
export async function deletePdfFormStructure(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const params: Record<string, any> = {
      businessId: authStore.getBusinessId(),
      id: templateId,
      userId: authStore.state?.user?.uid
    };

    const bdyq2 = {
      query: "deletePdfFormStructure",
      params
    };

    devLog('Deleting template:', bdyq2);
    await fetchGraphQLSS(bdyq2);

    // Remove from cache
    templateCache.delete(templateId);

    devLog('Template deleted from server:', templateId);
    return { success: true };
  } catch (error) {
    devLog('Error in deletePdfFormStructure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clone/duplicate a PDF form structure
 */
export async function clonePdfFormStructure(
  templateId: string,
  newName?: string
): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
  try {
    const duplicate = duplicateTemplate(templateId, newName);

    if (!duplicate) {
      return { success: false, error: 'Template not found' };
    }

    // Save the cloned template to server
    const result = await saveTemplateToServer(duplicate);

    if (result.success) {
      devLog('Template cloned successfully:', duplicate.id);
      return { success: true, data: duplicate };
    }

    return result;
  } catch (error) {
    devLog('Error in clonePdfFormStructure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get available form types
 */
export async function getFormTypes(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const templates = await loadAllTemplatesFromServer();
    const formTypes = [...new Set(templates.map(t => t.formName))].sort();

    return { success: true, data: formTypes };
  } catch (error) {
    devLog('Error in getFormTypes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate a PDF form structure
 */
export function validatePdfFormStructure(template: Partial<FormTemplate>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!template.formName || template.formName.trim() === '') {
    errors.push('Form name is required');
  }

  if (!template.fields || template.fields.length === 0) {
    errors.push('At least one field mapping is required');
  }

  if (template.totalFields === undefined || template.totalFields < 1) {
    errors.push('Total fields must be at least 1');
  }

  if (template.totalPages === undefined || template.totalPages < 1) {
    errors.push('Total pages must be at least 1');
  }

  // Warnings for best practices
  if (template.fields) {
    const unmappedCount = template.fields.filter(m => m.clientFieldPath === '(no mapping)').length;
    const mappedCount = template.fields.length - unmappedCount;

    if (unmappedCount > mappedCount) {
      warnings.push(`More fields unmapped (${unmappedCount}) than mapped (${mappedCount})`);
    }

    const lowConfidenceCount = template.fields.filter(m => m.confidence < 0.5).length;
    if (lowConfidenceCount > template.fields.length * 0.3) {
      warnings.push(`${lowConfidenceCount} fields have low confidence (<50%)`);
    }
  }

  if (!template.description || template.description.trim() === '') {
    warnings.push('Template description is recommended for better organization');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
