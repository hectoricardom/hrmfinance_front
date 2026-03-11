/**
 * Types for storing and managing PDF form field mappings
 */

export interface FormFieldMapping {
  // PDF Field Information
  pdfFieldName: string;
  pdfFieldType: string;
  page: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Client Data Mapping
  clientFieldPath: string; // e.g., "firstName", "residences[0].city", "dateOfBirth"
  mappingType: 'direct' | 'computed' | 'conditional' | 'manual';

  // Custom value support - allows static values instead of customer data
  useCustomValue?: boolean; // If true, use customValue instead of clientFieldPath
  customValue?: string; // Static custom value to fill into the PDF field

  // AI-generated or manual
  mappingSource: 'ai' | 'manual';
  confidence: number; // 0-1, confidence in the mapping

  // Transformation rules (optional)
  transformation?: {
    type: 'date' | 'uppercase' | 'lowercase' | 'format' | 'concat';
    format?: string; // e.g., "MM/DD/YYYY" for dates
    params?: Record<string, any>;
  };

  // Validation rules (optional)
  validation?: {
    required?: boolean;
    maxLength?: number;
    pattern?: string;
    customRule?: string;
  };

  // Conditional rules - determine if field should be filled
  conditional?: {
    enabled: boolean;
    type: 'skip_if_empty' | 'only_if_true' | 'only_if_false' | 'only_if_equals' | 'only_if_not_equals' | 'always_fill' | 'never_fill' | 'custom';
    // Field path to check (can be different from clientFieldPath)
    checkFieldPath?: string;
    // Expected value for comparison
    expectedValue?: any;
    // Custom condition expression
    customCondition?: string;
    // Description of the condition
    description?: string;
  };

  // Manual override settings
  manualOverride?: {
    enabled: boolean;
    value?: string;
    reason?: string;
    overriddenBy?: string;
    overriddenAt?: number;
  };

  // Metadata
  notes?: string;
  lastModified?: number;
}

export interface FormTemplate {
  id: string;
  formName: string; // e.g., "I-485", "I-539", "I-765"
  formVersion?: string; // e.g., "10/15/2019"
  description?: string;

  templateName: string;
  formType: string;
  fields :string;

  // Form metadata
  totalPages: number;
  totalFields: number;

  // Field mappings
  fieldMappings?: FormFieldMapping[];

  // Form-level settings
  settings?: {
    autoFill: boolean;
    validateBeforeFill: boolean;
    flattenAfterFill: boolean;
  };

  // Template metadata
  createdBy?: string;
  createdAt: number;
  updatedBy?: string;
  updatedAt: number;

  // Version control
  version: number;
  isActive: boolean;

  // Statistics
  stats?: {
    timesUsed: number;
    successRate: number;
    averageConfidence: number;
  };
}

export interface FormMappingSession {
  id: string;
  templateId: string;
  customerId: string;

  // Current state
  fieldMappings: FormFieldMapping[];
  overrides: Record<string, any>; // fieldName -> manual value

  // Session metadata
  startedAt: number;
  lastSavedAt?: number;
  completedAt?: number;
  status: 'draft' | 'in_progress' | 'completed' | 'error';

  // Validation results
  validationResults?: {
    totalFields: number;
    validFields: number;
    invalidFields: number;
    warnings: string[];
    errors: string[];
  };
}

export interface ClientFieldPath {
  path: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  example?: string;
  category: 'personal' | 'identification' | 'contact' | 'immigration' | 'residence' | 'employment' | 'education' | 'travel' | 'passport' | 'family';
  isArray?: boolean;
  arrayIndex?: number;
}

/**
 * Available client field paths with metadata
 */




export const CLIENT_FIELD_PATHS: ClientFieldPath[] = [
  // Personal
  { path: 'firstName', label: 'First Name', type: 'string', category: 'personal', example: 'John' },
  { path: 'middleName', label: 'Middle Name', type: 'string', category: 'personal', example: 'Michael' },
  { path: 'lastName', label: 'Last Name', type: 'string', category: 'personal', example: 'Doe' },
  { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', category: 'personal', example: '01/15/1990' },
  { path: 'placeOfBirth.city', label: 'Birth City', type: 'string', category: 'personal', example: 'New York' },
  { path: 'placeOfBirth.state', label: 'Birth State', type: 'string', category: 'personal', example: 'NY' },
  { path: 'placeOfBirth.country', label: 'Birth Country', type: 'string', category: 'personal', example: 'USA' },
  { path: 'genre', label: 'Gender', type: 'string', category: 'personal', example: 'Male' },
  { path: 'maritalStatus', label: 'Marital Status', type: 'string', category: 'personal', example: 'Married' },
  { path: 'height', label: 'Height (cm)', type: 'number', category: 'personal', example: '175' },
  { path: 'weight', label: 'Weight (lbs)', type: 'number', category: 'personal', example: '180' },
  { path: 'eyesColor', label: 'Eye Color', type: 'string', category: 'personal', example: 'Brown' },
  { path: 'hairColor', label: 'Hair Color', type: 'string', category: 'personal', example: 'Black' },
  { path: 'race', label: 'Race', type: 'string', category: 'personal', example: 'Hispanic' },
  { path: 'ethnicity', label: 'Ethnicity', type: 'string', category: 'personal', example: 'Latino' },

  // Identification
  { path: 'clientNotaryId', label: 'Client ID', type: 'string', category: 'identification', example: 'CN-12345' },
  { path: 'alienNumber', label: 'Alien Number', type: 'string', category: 'identification', example: 'A123456789' },
  { path: 'ss', label: 'Social Security Number', type: 'string', category: 'identification', example: '123-45-6789' },
  { path: 'uscisOnlineAccountNumber', label: 'USCIS Online Account', type: 'string', category: 'identification', example: 'ABC1234567890' },

  // Contact
  { path: 'email', label: 'Email', type: 'string', category: 'contact', example: 'john@example.com' },
  { path: 'phoneNumber', label: 'Phone Number', type: 'string', category: 'contact', example: '(555) 123-4567' },
  { path: 'currentLocation.state', label: 'Current State', type: 'string', category: 'contact', example: 'California' },
  { path: 'currentLocation.country', label: 'Current Country', type: 'string', category: 'contact', example: 'USA' },

  // Immigration
  { path: 'countryOfCitizenship', label: 'Country of Citizenship', type: 'string', category: 'immigration', example: 'Mexico' },
  { path: 'isInUSA', label: 'Currently in USA', type: 'boolean', category: 'immigration', example: 'true' },
  { path: 'hasI94', label: 'Has I-94', type: 'boolean', category: 'immigration', example: 'true' },
  { path: 'hasLPR', label: 'Has LPR', type: 'boolean', category: 'immigration', example: 'false' },
  { path: 'dateOfAppI589', label: 'I-589 Application Date', type: 'date', category: 'immigration', example: '06/01/2020' },

  // Residences (array - use [0] for most recent)
  { path: 'residences[0].addressLineOne', label: 'Current Address Line 1', type: 'string', category: 'residence', isArray: true, example: '123 Main St' },
  { path: 'residences[0].addressLineTwo', label: 'Current Address Line 2', type: 'string', category: 'residence', isArray: true, example: 'Apt 4B' },
  { path: 'residences[0].city', label: 'Current City', type: 'string', category: 'residence', isArray: true, example: 'Los Angeles' },
  { path: 'residences[0].state', label: 'Current State', type: 'string', category: 'residence', isArray: true, example: 'CA' },
  { path: 'residences[0].zipcode', label: 'Current ZIP Code', type: 'string', category: 'residence', isArray: true, example: '90001' },
  { path: 'residences[0].country', label: 'Current Country', type: 'string', category: 'residence', isArray: true, example: 'USA' },
  { path: 'residences[1].addressLineOne', label: 'Previous Address Line 1', type: 'string', category: 'residence', isArray: true, example: '456 Oak Ave' },
  { path: 'residences[1].city', label: 'Previous City', type: 'string', category: 'residence', isArray: true, example: 'New York' },

  // Employers (array - use [0] for most recent)
  { path: 'employers[0].employerName', label: 'Current Employer Name', type: 'string', category: 'employment', isArray: true, example: 'ABC Corp' },
  { path: 'employers[0].occupation', label: 'Current Occupation', type: 'string', category: 'employment', isArray: true, example: 'Software Engineer' },
  { path: 'employers[0].addressLineOne', label: 'Current Employer Address', type: 'string', category: 'employment', isArray: true, example: '789 Business Blvd' },
  { path: 'employers[0].city', label: 'Current Employer City', type: 'string', category: 'employment', isArray: true, example: 'San Francisco' },
  { path: 'employers[0].state', label: 'Current Employer State', type: 'string', category: 'employment', isArray: true, example: 'CA' },
  { path: 'employers[0].zipcode', label: 'Current Employer ZIP', type: 'string', category: 'employment', isArray: true, example: '94102' },

  // Passport
  { path: 'passportNumber', label: 'Passport Number', type: 'string', category: 'passport', example: 'X12345678' },
  { path: 'passportExpire', label: 'Passport Expiration Date', type: 'date', category: 'passport', example: '12/31/2025' },

  // Education
  { path: 'schoolHistory[0].schoolName', label: 'Most Recent School Name', type: 'string', category: 'education', isArray: true, example: 'State University' },
  { path: 'schoolHistory[0].schoolType', label: 'Most Recent School Type', type: 'string', category: 'education', isArray: true, example: 'University' },
  { path: 'schoolHistory[0].city', label: 'School City', type: 'string', category: 'education', isArray: true, example: 'Boston' },

  // Marriage/Family
  { path: 'isMarriage', label: 'Is Married', type: 'boolean', category: 'family', example: 'true' },
  { path: 'marriage_date', label: 'Marriage Date', type: 'date', category: 'family', example: '06/15/2018' },
  { path: 'marriage_city', label: 'Marriage City', type: 'string', category: 'family', example: 'Las Vegas' },
  { path: 'marriage_state', label: 'Marriage State', type: 'string', category: 'family', example: 'NV' },
  { path: 'marriage_country', label: 'Marriage Country', type: 'string', category: 'family', example: 'USA' },

  // Travel History / Entry Records
  { path: 'entryRecord[0].dateOfEntry', label: 'Most Recent Entry Date', type: 'date', category: 'travel', isArray: true, example: '03/15/2023' },
  { path: 'entryRecord[0].placeOfEntry', label: 'Most Recent Entry Place', type: 'string', category: 'travel', isArray: true, example: 'New York' },
  { path: 'entryRecord[0].state', label: 'Most Recent Entry State', type: 'string', category: 'travel', isArray: true, example: 'NY' },
  { path: 'entryRecord[0].status', label: 'Most Recent Entry Status', type: 'string', category: 'travel', isArray: true, example: 'B2' },
  { path: 'entryRecord[0].i94Number', label: 'Most Recent I-94 Number', type: 'string', category: 'travel', isArray: true, example: '12345678901' },
  { path: 'entryRecord[1].dateOfEntry', label: '2nd Most Recent Entry Date', type: 'date', category: 'travel', isArray: true, example: '01/10/2022' },
  { path: 'entryRecord[1].placeOfEntry', label: '2nd Most Recent Entry Place', type: 'string', category: 'travel', isArray: true, example: 'Los Angeles' },
  { path: 'entryRecord[1].state', label: '2nd Most Recent Entry State', type: 'string', category: 'travel', isArray: true, example: 'CA' },
  { path: 'entryRecord[1].status', label: '2nd Most Recent Entry Status', type: 'string', category: 'travel', isArray: true, example: 'B1/B2' },
  { path: 'entryRecord[2].dateOfEntry', label: '3rd Most Recent Entry Date', type: 'date', category: 'travel', isArray: true, example: '06/20/2021' },
  { path: 'entryRecord[2].placeOfEntry', label: '3rd Most Recent Entry Place', type: 'string', category: 'travel', isArray: true, example: 'Miami' },

  // Passport Records (from passportRecord collection)
  { path: 'passportRecord[0].passportNumber', label: 'Current Passport Number', type: 'string', category: 'passport', isArray: true, example: 'X12345678' },
  { path: 'passportRecord[0].issueDate', label: 'Current Passport Issue Date', type: 'date', category: 'passport', isArray: true, example: '01/01/2020' },
  { path: 'passportRecord[0].expirationDate', label: 'Current Passport Expiration', type: 'date', category: 'passport', isArray: true, example: '12/31/2030' },
  { path: 'passportRecord[0].countryOfIssuance', label: 'Current Passport Country', type: 'string', category: 'passport', isArray: true, example: 'Mexico' },
  { path: 'passportRecord[1].passportNumber', label: 'Previous Passport Number', type: 'string', category: 'passport', isArray: true, example: 'X87654321' },
  { path: 'passportRecord[1].issueDate', label: 'Previous Passport Issue Date', type: 'date', category: 'passport', isArray: true, example: '01/01/2010' },
  { path: 'passportRecord[1].expirationDate', label: 'Previous Passport Expiration', type: 'date', category: 'passport', isArray: true, example: '12/31/2020' },
  { path: 'passportRecord[1].countryOfIssuance', label: 'Previous Passport Country', type: 'string', category: 'passport', isArray: true, example: 'Mexico' },

  // Additional Residence Fields
  { path: 'residences[0].fromDate', label: 'Current Residence From Date', type: 'date', category: 'residence', isArray: true, example: '01/01/2020' },
  { path: 'residences[0].toDate', label: 'Current Residence To Date', type: 'date', category: 'residence', isArray: true, example: 'Present' },
  { path: 'residences[1].addressLineTwo', label: 'Previous Address Line 2', type: 'string', category: 'residence', isArray: true, example: 'Suite 100' },
  { path: 'residences[1].state', label: 'Previous State', type: 'string', category: 'residence', isArray: true, example: 'NY' },
  { path: 'residences[1].zipcode', label: 'Previous ZIP Code', type: 'string', category: 'residence', isArray: true, example: '10001' },
  { path: 'residences[1].country', label: 'Previous Country', type: 'string', category: 'residence', isArray: true, example: 'USA' },
  { path: 'residences[1].fromDate', label: 'Previous Residence From Date', type: 'date', category: 'residence', isArray: true, example: '01/01/2018' },
  { path: 'residences[1].toDate', label: 'Previous Residence To Date', type: 'date', category: 'residence', isArray: true, example: '12/31/2019' },
  { path: 'residences[2].addressLineOne', label: '3rd Previous Address Line 1', type: 'string', category: 'residence', isArray: true, example: '789 Third St' },
  { path: 'residences[2].city', label: '3rd Previous City', type: 'string', category: 'residence', isArray: true, example: 'Chicago' },
  { path: 'residences[2].state', label: '3rd Previous State', type: 'string', category: 'residence', isArray: true, example: 'IL' },
  { path: 'residences[2].zipcode', label: '3rd Previous ZIP Code', type: 'string', category: 'residence', isArray: true, example: '60601' },
  { path: 'residences[2].country', label: '3rd Previous Country', type: 'string', category: 'residence', isArray: true, example: 'USA' },

  // Additional Employer Fields
  { path: 'employers[0].fromDate', label: 'Current Employer From Date', type: 'date', category: 'employment', isArray: true, example: '06/01/2020' },
  { path: 'employers[0].toDate', label: 'Current Employer To Date', type: 'date', category: 'employment', isArray: true, example: 'Present' },
  { path: 'employers[0].country', label: 'Current Employer Country', type: 'string', category: 'employment', isArray: true, example: 'USA' },
  { path: 'employers[0].addressLineTwo', label: 'Current Employer Address Line 2', type: 'string', category: 'employment', isArray: true, example: 'Floor 3' },
  { path: 'employers[1].employerName', label: 'Previous Employer Name', type: 'string', category: 'employment', isArray: true, example: 'XYZ Inc' },
  { path: 'employers[1].occupation', label: 'Previous Occupation', type: 'string', category: 'employment', isArray: true, example: 'Analyst' },
  { path: 'employers[1].addressLineOne', label: 'Previous Employer Address', type: 'string', category: 'employment', isArray: true, example: '456 Old St' },
  { path: 'employers[1].city', label: 'Previous Employer City', type: 'string', category: 'employment', isArray: true, example: 'Boston' },
  { path: 'employers[1].state', label: 'Previous Employer State', type: 'string', category: 'employment', isArray: true, example: 'MA' },
  { path: 'employers[1].zipcode', label: 'Previous Employer ZIP', type: 'string', category: 'employment', isArray: true, example: '02101' },
  { path: 'employers[1].country', label: 'Previous Employer Country', type: 'string', category: 'employment', isArray: true, example: 'USA' },
  { path: 'employers[1].fromDate', label: 'Previous Employer From Date', type: 'date', category: 'employment', isArray: true, example: '01/01/2018' },
  { path: 'employers[1].toDate', label: 'Previous Employer To Date', type: 'date', category: 'employment', isArray: true, example: '05/31/2020' },
  { path: 'employers[2].employerName', label: '3rd Previous Employer Name', type: 'string', category: 'employment', isArray: true, example: 'Tech Corp' },
  { path: 'employers[2].occupation', label: '3rd Previous Occupation', type: 'string', category: 'employment', isArray: true, example: 'Developer' },

  // Additional Education Fields
  { path: 'schoolHistory[0].fromDate', label: 'Most Recent School From Date', type: 'date', category: 'education', isArray: true, example: '09/01/2015' },
  { path: 'schoolHistory[0].toDate', label: 'Most Recent School To Date', type: 'date', category: 'education', isArray: true, example: '05/31/2019' },
  { path: 'schoolHistory[0].state', label: 'Most Recent School State', type: 'string', category: 'education', isArray: true, example: 'MA' },
  { path: 'schoolHistory[0].country', label: 'Most Recent School Country', type: 'string', category: 'education', isArray: true, example: 'USA' },
  { path: 'schoolHistory[1].schoolName', label: 'Previous School Name', type: 'string', category: 'education', isArray: true, example: 'City College' },
  { path: 'schoolHistory[1].schoolType', label: 'Previous School Type', type: 'string', category: 'education', isArray: true, example: 'College' },
  { path: 'schoolHistory[1].city', label: 'Previous School City', type: 'string', category: 'education', isArray: true, example: 'Seattle' },
  { path: 'schoolHistory[1].state', label: 'Previous School State', type: 'string', category: 'education', isArray: true, example: 'WA' },
  { path: 'schoolHistory[1].country', label: 'Previous School Country', type: 'string', category: 'education', isArray: true, example: 'USA' },
  { path: 'schoolHistory[1].fromDate', label: 'Previous School From Date', type: 'date', category: 'education', isArray: true, example: '09/01/2011' },
  { path: 'schoolHistory[1].toDate', label: 'Previous School To Date', type: 'date', category: 'education', isArray: true, example: '05/31/2015' },
];

/**
 * Helper function to get value from client data using path
 */
export function getValueByPath(obj: any, path: string): any {
  // Handle array notation like residences[0].city
  const parts = path.split(/[\.\[\]]/).filter(Boolean);

  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }

    // Handle numeric indices
    if (!isNaN(Number(part))) {
      const index = Number(part);
      if (Array.isArray(current)) {
        current = current[index];
      } else if (typeof current === 'object') {
        // Convert object to array of values
        const values = Object.values(current);
        current = values[index];
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Helper function to set value in object using path
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split(/[\.\[\]]/).filter(Boolean);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (!isNaN(Number(part))) {
      const index = Number(part);
      if (!Array.isArray(current)) {
        current = [];
      }
      if (!current[index]) {
        current[index] = {};
      }
      current = current[index];
    } else {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  if (!isNaN(Number(lastPart))) {
    if (!Array.isArray(current)) {
      current = [];
    }
    current[Number(lastPart)] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * Evaluate if a conditional rule should allow field to be filled
 * @returns true if field should be filled, false if it should be skipped
 */
export function evaluateConditional(
  conditional: FormFieldMapping['conditional'],
  customerData: any,
  fieldValue: any
): { shouldFill: boolean; reason?: string } {
  if (!conditional || !conditional.enabled) {
    return { shouldFill: true };
  }

  const checkValue = conditional.checkFieldPath
    ? getValueByPath(customerData, conditional.checkFieldPath)
    : fieldValue;

  switch (conditional.type) {
    case 'always_fill':
      return { shouldFill: true, reason: 'Always fill (forced)' };

    case 'never_fill':
      return { shouldFill: false, reason: 'Never fill (forced)' };

    case 'skip_if_empty':
      if (!checkValue || checkValue === '' || checkValue === null || checkValue === undefined) {
        return { shouldFill: false, reason: 'Field is empty' };
      }
      return { shouldFill: true };

    case 'only_if_true':
      const isTrue = checkValue === true || checkValue === 'true' || checkValue === 'yes' || checkValue === 'Yes' || checkValue === 'YES' || checkValue === '1' || checkValue === 1;
      if (!isTrue) {
        return { shouldFill: false, reason: `Condition not met: ${conditional.checkFieldPath || 'value'} is not true` };
      }
      return { shouldFill: true };

    case 'only_if_false':
      const isFalse = checkValue === false || checkValue === 'false' || checkValue === 'no' || checkValue === 'No' || checkValue === 'NO' || checkValue === '0' || checkValue === 0;
      if (!isFalse) {
        return { shouldFill: false, reason: `Condition not met: ${conditional.checkFieldPath || 'value'} is not false` };
      }
      return { shouldFill: true };

    case 'only_if_equals':
      if (String(checkValue).toLowerCase() !== String(conditional.expectedValue).toLowerCase()) {
        return { shouldFill: false, reason: `Condition not met: ${checkValue} ≠ ${conditional.expectedValue}` };
      }
      return { shouldFill: true };

    case 'only_if_not_equals':
      if (String(checkValue).toLowerCase() === String(conditional.expectedValue).toLowerCase()) {
        return { shouldFill: false, reason: `Condition not met: ${checkValue} = ${conditional.expectedValue}` };
      }
      return { shouldFill: true };

    case 'custom':
      // For custom conditions, we'd need to implement a safe expression evaluator
      // For now, return true
      return { shouldFill: true, reason: 'Custom condition evaluation not implemented' };

    default:
      return { shouldFill: true };
  }
}

/**
 * Get human-readable description of a conditional rule
 */
export function getConditionalDescription(conditional: FormFieldMapping['conditional']): string {
  if (!conditional || !conditional.enabled) {
    return 'Always fill';
  }

  if (conditional.description) {
    return conditional.description;
  }

  const fieldLabel = conditional.checkFieldPath || 'value';

  switch (conditional.type) {
    case 'always_fill':
      return '✅ Siempre llenar este campo';
    case 'never_fill':
      return '❌ Nunca llenar este campo';
    case 'skip_if_empty':
      return `Skip if ${fieldLabel} is empty`;
    case 'only_if_true':
      return `Only if ${fieldLabel} is true/yes`;
    case 'only_if_false':
      return `Only if ${fieldLabel} is false/no`;
    case 'only_if_equals':
      return `Only if ${fieldLabel} = "${conditional.expectedValue}"`;
    case 'only_if_not_equals':
      return `Only if ${fieldLabel} ≠ "${conditional.expectedValue}"`;
    case 'custom':
      return conditional.customCondition || 'Custom condition';
    default:
      return 'Always fill';
  }
}
