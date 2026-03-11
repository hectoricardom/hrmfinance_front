/**
 * PDF Form Reader Service
 * Reads PDF form fields and extracts data for comparison with client data
 */

import { NotaryCustomer } from '../types';
import { devLog } from '../../../services/utils';

export interface PDFFormField {
  name: string;
  value: any;
  type: string;
  page?: number;
}

export interface I485FormData {
  // Part 1: Information About You
  familyName?: string;
  givenName?: string;
  middleName?: string;

  // Other names used
  otherFamilyNames?: string[];
  otherGivenNames?: string[];

  // Address
  inCareOfName?: string;
  streetNumberAndName?: string;
  apt?: string;
  ste?: string;
  flr?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  province?: string;
  postalCode?: string;
  country?: string;

  // Contact
  daytimePhoneNumber?: string;
  mobilePhoneNumber?: string;
  emailAddress?: string;

  // Biographical Information
  alienRegistrationNumber?: string;
  uscisOnlineAccountNumber?: string;
  dateOfBirth?: string;
  cityOfBirth?: string;
  countryOfBirth?: string;

  // Physical Description
  gender?: 'Male' | 'Female';
  height?: {
    feet?: string;
    inches?: string;
  };
  weight?: {
    pounds?: string;
  };
  eyeColor?: string;
  hairColor?: string;

  // Other Information
  ethnicity?: string;
  race?: string[];

  // Social Security Number
  socialSecurityNumber?: string;

  // Parents
  fatherFamilyName?: string;
  fatherGivenName?: string;
  fatherDateOfBirth?: string;
  fatherCountryOfBirth?: string;

  motherFamilyName?: string;
  motherGivenName?: string;
  motherDateOfBirth?: string;
  motherCountryOfBirth?: string;

  // Current Immigration Status
  currentImmigrationStatus?: string;

  // Entry Information
  dateOfLastEntry?: string;
  placeOfLastEntry?: string;

  // All other fields from the form
  [key: string]: any;
}

export interface FieldComparison {
  fieldName: string;
  formValue: any;
  clientValue: any;
  matches: boolean;
  confidence?: number;
  notes?: string;
}

export interface ComparisonResult {
  totalFields: number;
  matchingFields: number;
  mismatchingFields: number;
  missingInForm: number;
  missingInClient: number;
  matchPercentage: number;
  comparisons: FieldComparison[];
  warnings: string[];
  errors: string[];
}

/**
 * Extract form fields from PDF using browser's File API
 */
export async function extractPDFFormFields(file: File): Promise<PDFFormField[]> {
  try {
    // This would typically use pdf.js or similar library
    // For now, we'll return a placeholder that shows how it would work

    // Load PDF.js library (assuming it's available)
    const pdfjsLib = (window as any).pdfjsLib;

    if (!pdfjsLib) {
      throw new Error('PDF.js library not loaded. Please ensure pdf.js is included in your project.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const fields: PDFFormField[] = [];

    // Iterate through pages to find form fields
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const annotations = await page.getAnnotations();

      for (const annotation of annotations) {
        if (annotation.fieldType) {
          fields.push({
            name: annotation.fieldName || '',
            value: annotation.fieldValue || annotation.buttonValue || '',
            type: annotation.fieldType,
            page: pageNum
          });
        }
      }
    }

    return fields;
  } catch (error) {
    devLog('Error extracting PDF form fields:', error);
    throw error;
  }
}

/**
 * Parse raw PDF fields into structured I-485 form data
 */
export function parseI485Fields(fields: PDFFormField[]): I485FormData {
  const formData: I485FormData = {};

  // Map common field names to our structure
  const fieldMapping: Record<string, string> = {
    // Part 1 - Information About You
    'Pt1Line1a_FamilyName': 'familyName',
    'Pt1Line1b_GivenName': 'givenName',
    'Pt1Line1c_MiddleName': 'middleName',

    // Address
    'Pt1Line2_InCareofName': 'inCareOfName',
    'Pt1Line2_StreetNumberName': 'streetNumberAndName',
    'Pt1Line2_Unit': 'apt',
    'Pt1Line2_CityOrTown': 'city',
    'Pt1Line2_State': 'state',
    'Pt1Line2_ZipCode': 'zipCode',
    'Pt1Line2_Country': 'country',

    // Contact
    'Pt1Line3_DaytimePhoneNumber': 'daytimePhoneNumber',
    'Pt1Line4_MobilePhoneNumber': 'mobilePhoneNumber',
    'Pt1Line5_Email': 'emailAddress',

    // Alien Number
    'Pt1Line6_AlienNumber': 'alienRegistrationNumber',
    'Pt1Line7_USCISOnlineAcctNumber': 'uscisOnlineAccountNumber',

    // Date of Birth
    'Pt1Line8_DateOfBirth': 'dateOfBirth',
    'Pt1Line9_CityTownOfBirth': 'cityOfBirth',
    'Pt1Line10_CountryOfBirth': 'countryOfBirth',

    // Gender
    'Pt1Line11a_Gender': 'gender',

    // Physical Description
    'Pt1Line12_HeightFeet': 'height.feet',
    'Pt1Line12_HeightInches': 'height.inches',
    'Pt1Line13_WeightPounds': 'weight.pounds',
    'Pt1Line14_EyeColor': 'eyeColor',
    'Pt1Line15_HairColor': 'hairColor',

    // SSN
    'Pt1Line16_SSN': 'socialSecurityNumber',

    // Parents
    'Pt1Line17a_FatherFamilyName': 'fatherFamilyName',
    'Pt1Line17b_FatherGivenName': 'fatherGivenName',
    'Pt1Line18_FatherDateOfBirth': 'fatherDateOfBirth',
    'Pt1Line19_FatherCountryOfBirth': 'fatherCountryOfBirth',

    'Pt1Line20a_MotherFamilyName': 'motherFamilyName',
    'Pt1Line20b_MotherGivenName': 'motherGivenName',
    'Pt1Line21_MotherDateOfBirth': 'motherDateOfBirth',
    'Pt1Line22_MotherCountryOfBirth': 'motherCountryOfBirth',
  };

  // Process each field
  for (const field of fields) {
    const mappedKey = fieldMapping[field.name];

    if (mappedKey) {
      // Handle nested properties
      if (mappedKey.includes('.')) {
        const parts = mappedKey.split('.');
        let obj: any = formData;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!obj[parts[i]]) {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = field.value;
      } else {
        formData[mappedKey] = field.value;
      }
    } else {
      // Store unmapped fields with their original names
      formData[field.name] = field.value;
    }
  }

  return formData;
}

/**
 * Compare I-485 form data with client notary data
 */
export function compareI485WithClient(
  formData: I485FormData,
  client: NotaryCustomer
): ComparisonResult {
  const comparisons: FieldComparison[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Helper function to normalize strings for comparison
  const normalize = (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  };

  // Helper function to compare values
  const compareValues = (val1: any, val2: any): boolean => {
    return normalize(val1) === normalize(val2);
  };

  // Compare Name
  if (formData.familyName || client.lastName) {
    const matches = compareValues(formData.familyName, client.lastName);
    comparisons.push({
      fieldName: 'Last Name (Family Name)',
      formValue: formData.familyName,
      clientValue: client.lastName,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
    if (!matches && formData.familyName && client.lastName) {
      warnings.push(`Last name mismatch: Form="${formData.familyName}" vs Client="${client.lastName}"`);
    }
  }

  if (formData.givenName || client.firstName) {
    const matches = compareValues(formData.givenName, client.firstName);
    comparisons.push({
      fieldName: 'First Name (Given Name)',
      formValue: formData.givenName,
      clientValue: client.firstName,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
    if (!matches && formData.givenName && client.firstName) {
      warnings.push(`First name mismatch: Form="${formData.givenName}" vs Client="${client.firstName}"`);
    }
  }

  if (formData.middleName || client.middleName) {
    const matches = compareValues(formData.middleName, client.middleName);
    comparisons.push({
      fieldName: 'Middle Name',
      formValue: formData.middleName,
      clientValue: client.middleName,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Date of Birth
  if (formData.dateOfBirth || client.dateOfBirth) {
    const formDOB = formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : '';
    const clientDOB = client.dateOfBirth ? new Date(client.dateOfBirth).toISOString().split('T')[0] : '';
    const matches = formDOB === clientDOB;

    comparisons.push({
      fieldName: 'Date of Birth',
      formValue: formDOB,
      clientValue: clientDOB,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
    if (!matches && formDOB && clientDOB) {
      errors.push(`Date of birth mismatch: Form="${formDOB}" vs Client="${clientDOB}"`);
    }
  }

  // Compare Gender
  if (formData.gender || client.genre) {
    const matches = compareValues(formData.gender, client.genre);
    comparisons.push({
      fieldName: 'Gender',
      formValue: formData.gender,
      clientValue: client.genre,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Place of Birth
  if (formData.cityOfBirth || client.placeOfBirth?.city) {
    const matches = compareValues(formData.cityOfBirth, client.placeOfBirth?.city);
    comparisons.push({
      fieldName: 'City of Birth',
      formValue: formData.cityOfBirth,
      clientValue: client.placeOfBirth?.city,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  if (formData.countryOfBirth || client.placeOfBirth?.country) {
    const matches = compareValues(formData.countryOfBirth, client.placeOfBirth?.country);
    comparisons.push({
      fieldName: 'Country of Birth',
      formValue: formData.countryOfBirth,
      clientValue: client.placeOfBirth?.country,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Address
  if (formData.streetNumberAndName || client.currentLocation) {
    comparisons.push({
      fieldName: 'Street Address',
      formValue: formData.streetNumberAndName,
      clientValue: 'N/A',
      matches: false,
      confidence: 0.0,
      notes: 'Address comparison not available in client data structure'
    });
  }

  if (formData.city) {
    comparisons.push({
      fieldName: 'City',
      formValue: formData.city,
      clientValue: 'N/A',
      matches: false,
      confidence: 0.0
    });
  }

  if (formData.state || client.currentLocation?.state) {
    const matches = compareValues(formData.state, client.currentLocation?.state);
    comparisons.push({
      fieldName: 'State',
      formValue: formData.state,
      clientValue: client.currentLocation?.state,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Phone Numbers
  if (formData.daytimePhoneNumber || formData.mobilePhoneNumber || client.phoneNumber) {
    const formPhone = formData.mobilePhoneNumber || formData.daytimePhoneNumber;
    const matches = compareValues(formPhone, client.phoneNumber);
    comparisons.push({
      fieldName: 'Phone Number',
      formValue: formPhone,
      clientValue: client.phoneNumber,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Email
  if (formData.emailAddress || client.email) {
    const matches = compareValues(formData.emailAddress, client.email);
    comparisons.push({
      fieldName: 'Email Address',
      formValue: formData.emailAddress,
      clientValue: client.email,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Alien Number
  if (formData.alienRegistrationNumber || client.alienNumber) {
    const matches = compareValues(formData.alienRegistrationNumber, client.alienNumber);
    comparisons.push({
      fieldName: 'Alien Registration Number (A-Number)',
      formValue: formData.alienRegistrationNumber,
      clientValue: client.alienNumber,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
    if (!matches && formData.alienRegistrationNumber && client.alienNumber) {
      errors.push(`A-Number mismatch: Form="${formData.alienRegistrationNumber}" vs Client="${client.alienNumber}"`);
    }
  }

  // Compare SSN
  if (formData.socialSecurityNumber || client.ss) {
    const matches = compareValues(formData.socialSecurityNumber, client.ss);
    comparisons.push({
      fieldName: 'Social Security Number',
      formValue: formData.socialSecurityNumber ? '***-**-****' : '',
      clientValue: client.ss ? '***-**-****' : '',
      matches,
      confidence: matches ? 1.0 : 0.0,
      notes: 'Actual values hidden for security'
    });
    if (!matches && formData.socialSecurityNumber && client.ss) {
      errors.push('Social Security Number mismatch');
    }
  }

  // Compare Physical Description
  if (formData.height?.feet || formData.height?.inches || client.height) {
    const formHeight = formData.height?.feet && formData.height?.inches
      ? `${formData.height.feet}'${formData.height.inches}"`
      : '';
    comparisons.push({
      fieldName: 'Height',
      formValue: formHeight,
      clientValue: client.height,
      matches: compareValues(formHeight, client.height),
      confidence: 0.5
    });
  }

  if (formData.weight?.pounds || client.weight) {
    const matches = compareValues(formData.weight?.pounds, client.weight);
    comparisons.push({
      fieldName: 'Weight',
      formValue: formData.weight?.pounds ? `${formData.weight.pounds} lbs` : '',
      clientValue: client.weight ? `${client.weight} lbs` : '',
      matches,
      confidence: 0.5
    });
  }

  if (formData.eyeColor || client.eyesColor) {
    const matches = compareValues(formData.eyeColor, client.eyesColor);
    comparisons.push({
      fieldName: 'Eye Color',
      formValue: formData.eyeColor,
      clientValue: client.eyesColor,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  if (formData.hairColor || client.hairColor) {
    const matches = compareValues(formData.hairColor, client.hairColor);
    comparisons.push({
      fieldName: 'Hair Color',
      formValue: formData.hairColor,
      clientValue: client.hairColor,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Compare Race and Ethnicity
  if (formData.ethnicity || client.ethnicity) {
    const matches = compareValues(formData.ethnicity, client.ethnicity);
    comparisons.push({
      fieldName: 'Ethnicity',
      formValue: formData.ethnicity,
      clientValue: client.ethnicity,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  if (formData.race || client.race) {
    const formRace = Array.isArray(formData.race) ? formData.race.join(', ') : formData.race;
    const matches = compareValues(formRace, client.race);
    comparisons.push({
      fieldName: 'Race',
      formValue: formRace,
      clientValue: client.race,
      matches,
      confidence: matches ? 1.0 : 0.0
    });
  }

  // Calculate statistics
  const totalFields = comparisons.length;
  const matchingFields = comparisons.filter(c => c.matches).length;
  const mismatchingFields = comparisons.filter(c => !c.matches && c.formValue && c.clientValue).length;
  const missingInForm = comparisons.filter(c => !c.formValue && c.clientValue).length;
  const missingInClient = comparisons.filter(c => c.formValue && !c.clientValue).length;
  const matchPercentage = totalFields > 0 ? (matchingFields / totalFields) * 100 : 0;

  return {
    totalFields,
    matchingFields,
    mismatchingFields,
    missingInForm,
    missingInClient,
    matchPercentage,
    comparisons,
    warnings,
    errors
  };
}
