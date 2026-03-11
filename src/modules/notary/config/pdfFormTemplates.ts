import { PDFFormTemplate } from '../types/pdfForms';
import { NotaryCustomer } from '../types';

/**
 * Helper function to get nested property from object using path string
 */
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
};

/**
 * Helper function to format date from timestamp
 */
export const formatDate = (timestamp?: number, format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' = 'MM/DD/YYYY'): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

/**
 * Predefined PDF Form Templates
 */
export const PDF_FORM_TEMPLATES: Record<string, PDFFormTemplate> = {
  // I-589 Application for Asylum
  'i589': {
    id: 'i589',
    name: 'Form I-589 - Application for Asylum',
    description: 'Application for Asylum and for Withholding of Removal',
    category: 'immigration',
    templateUrl: '', // Add your template URL here
    fieldMappings: [
      // Part A.I - Information About You
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line1a_FamilyName[0]', customerDataPath: 'lastName', label: 'Family Name (Last Name)' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line1b_GivenName[0]', customerDataPath: 'firstName', label: 'Given Name (First Name)' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line1c_MiddleName[0]', customerDataPath: 'middleName', label: 'Middle Name' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line2_AlienNumber[0]', customerDataPath: 'alienNumber', label: 'Alien Registration Number (A-Number)' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line3_SSN[0]', customerDataPath: 'ss', label: 'U.S. Social Security Number' },

      // Date of Birth
      {
        pdfFieldName: 'form1[0].#subform[2].Pt1Line4_DOB[0]',
        customerDataPath: 'dateOfBirth',
        transform: (timestamp: number) => formatDate(timestamp, 'MM/DD/YYYY'),
        label: 'Date of Birth'
      },

      // Place of Birth
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line5_CityTownOfBirth[0]', customerDataPath: 'placeOfBirth.city', label: 'City/Town of Birth' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line6_CountryOfBirth[0]', customerDataPath: 'placeOfBirth.country', label: 'Country of Birth' },

      // Current Nationality
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line7_PresentNationality[0]', customerDataPath: 'countryOfCitizenship', label: 'Present Nationality/Citizenship' },

      // Race, Ethnicity
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line8_Race[0]', customerDataPath: 'race', label: 'Race' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line9_Religion[0]', customerDataPath: 'ethnicity', label: 'Religion' },

      // Gender
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line10_Sex[0]', customerDataPath: 'genre', label: 'Sex' },

      // Marital Status
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line11_MaritalStatus[0]', customerDataPath: 'maritalStatus', label: 'Marital Status' },

      // Current Address
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line12_StreetNumberName[0]', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.addressLineOne || '';
      }, label: 'Street Number and Name' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line12_City[0]', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.city || '';
      }, label: 'City' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line12_State[0]', customerDataPath: 'currentLocation.state', label: 'State' },
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line12_ZipCode[0]', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.zipcode || '';
      }, label: 'ZIP Code' },

      // Contact
      { pdfFieldName: 'form1[0].#subform[2].Pt1Line13_Phone[0]', customerDataPath: 'phoneNumber', label: 'Telephone Number' },

      // Spouse Information (if married)
      { pdfFieldName: 'form1[0].#subform[3].Pt1Line14_SpouseFamilyName[0]', customerDataPath: 'spouse', label: 'Spouse Family Name' },
    ],
    checkboxFields: [
      {
        pdfFieldName: 'form1[0].#subform[2].Pt1Line10_Male[0]',
        condition: (customer) => customer.genre?.toLowerCase() === 'male',
        label: 'Male'
      },
      {
        pdfFieldName: 'form1[0].#subform[2].Pt1Line10_Female[0]',
        condition: (customer) => customer.genre?.toLowerCase() === 'female',
        label: 'Female'
      },
    ],
    imageFields: [
      {
        customerDataPath: 'passportImage',
        position: {
          page: 0,
          x: 450,
          y: 650,
          width: 100,
          height: 100
        },
        label: 'Passport Photo'
      }
    ]
  },

  // I-765 Application for Employment Authorization
  'i765': {
    id: 'i765',
    name: 'Form I-765 - Application for Employment Authorization',
    description: 'Application for Employment Authorization Document',
    category: 'work_permit',
    templateUrl: '', // Add your template URL here
    fieldMappings: [
      { pdfFieldName: 'LastName', customerDataPath: 'lastName', label: 'Family Name' },
      { pdfFieldName: 'FirstName', customerDataPath: 'firstName', label: 'Given Name' },
      { pdfFieldName: 'MiddleName', customerDataPath: 'middleName', label: 'Middle Name' },
      { pdfFieldName: 'AlienNumber', customerDataPath: 'alienNumber', label: 'A-Number' },
      { pdfFieldName: 'SSN', customerDataPath: 'ss', label: 'Social Security Number' },
      {
        pdfFieldName: 'DateOfBirth',
        customerDataPath: 'dateOfBirth',
        transform: (timestamp: number) => formatDate(timestamp, 'MM/DD/YYYY'),
        label: 'Date of Birth'
      },
      { pdfFieldName: 'CountryOfBirth', customerDataPath: 'placeOfBirth.country', label: 'Country of Birth' },
      { pdfFieldName: 'CountryOfCitizenship', customerDataPath: 'countryOfCitizenship', label: 'Country of Citizenship' },
      { pdfFieldName: 'MailingAddress', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.addressLineOne || '';
      }, label: 'Mailing Address' },
      { pdfFieldName: 'City', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.city || '';
      }, label: 'City' },
      { pdfFieldName: 'State', customerDataPath: 'currentLocation.state', label: 'State' },
      { pdfFieldName: 'ZipCode', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.zipcode || '';
      }, label: 'ZIP Code' },
      { pdfFieldName: 'PhoneNumber', customerDataPath: 'phoneNumber', label: 'Daytime Phone Number' },
    ]
  },

  // Generic Immigration Form Template
  'generic_immigration': {
    id: 'generic_immigration',
    name: 'Generic Immigration Form',
    description: 'General purpose immigration form with basic customer information',
    category: 'immigration',
    fieldMappings: [
      // Basic Info
      { pdfFieldName: 'LastName', customerDataPath: 'lastName', label: 'Last Name' },
      { pdfFieldName: 'FirstName', customerDataPath: 'firstName', label: 'First Name' },
      { pdfFieldName: 'MiddleName', customerDataPath: 'middleName', label: 'Middle Name' },
      { pdfFieldName: 'Email', customerDataPath: 'email', label: 'Email Address' },
      { pdfFieldName: 'Phone', customerDataPath: 'phoneNumber', label: 'Phone Number' },
      { pdfFieldName: 'SSN', customerDataPath: 'ss', label: 'Social Security Number' },
      { pdfFieldName: 'AlienNumber', customerDataPath: 'alienNumber', label: 'Alien Number' },

      // Birth Information
      {
        pdfFieldName: 'DateOfBirth',
        customerDataPath: 'dateOfBirth',
        transform: (timestamp: number) => formatDate(timestamp, 'MM/DD/YYYY'),
        label: 'Date of Birth'
      },
      { pdfFieldName: 'BirthCity', customerDataPath: 'placeOfBirth.city', label: 'City of Birth' },
      { pdfFieldName: 'BirthState', customerDataPath: 'placeOfBirth.state', label: 'State/Province of Birth' },
      { pdfFieldName: 'BirthCountry', customerDataPath: 'placeOfBirth.country', label: 'Country of Birth' },

      // Current Address
      { pdfFieldName: 'Address', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.addressLineOne || '';
      }, label: 'Street Address' },
      { pdfFieldName: 'Address2', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.addressLineTwo || '';
      }, label: 'Address Line 2' },
      { pdfFieldName: 'City', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.city || '';
      }, label: 'City' },
      { pdfFieldName: 'State', customerDataPath: 'currentLocation.state', label: 'State' },
      { pdfFieldName: 'ZipCode', customerDataPath: 'residences', transform: (residences: any) => {
        if (!residences) return '';
        const latest = Object.values(residences)[0] as any;
        return latest?.zipcode || '';
      }, label: 'ZIP Code' },
      { pdfFieldName: 'Country', customerDataPath: 'currentLocation.country', label: 'Country' },

      // Physical Characteristics
      { pdfFieldName: 'Height', customerDataPath: 'height', label: 'Height' },
      { pdfFieldName: 'Weight', customerDataPath: 'weight', label: 'Weight' },
      { pdfFieldName: 'HairColor', customerDataPath: 'hairColor', label: 'Hair Color' },
      { pdfFieldName: 'EyeColor', customerDataPath: 'eyesColor', label: 'Eye Color' },
      { pdfFieldName: 'Race', customerDataPath: 'race', label: 'Race' },
      { pdfFieldName: 'Ethnicity', customerDataPath: 'ethnicity', label: 'Ethnicity' },

      // Citizenship & Immigration
      { pdfFieldName: 'Citizenship', customerDataPath: 'countryOfCitizenship', label: 'Country of Citizenship' },
      { pdfFieldName: 'PassportNumber', customerDataPath: 'passportNumber', label: 'Passport Number' },
      {
        pdfFieldName: 'PassportExpiration',
        customerDataPath: 'passportExpire',
        transform: (timestamp: number) => formatDate(timestamp, 'MM/DD/YYYY'),
        label: 'Passport Expiration Date'
      },

      // Family
      { pdfFieldName: 'Father', customerDataPath: 'father', label: 'Father (Client ID)' },
      { pdfFieldName: 'Mother', customerDataPath: 'mother', label: 'Mother (Client ID)' },
      { pdfFieldName: 'Spouse', customerDataPath: 'spouse', label: 'Spouse (Client ID)' },
      { pdfFieldName: 'MaritalStatus', customerDataPath: 'maritalStatus', label: 'Marital Status' },
      {
        pdfFieldName: 'MarriageDate',
        customerDataPath: 'marriage_date',
        transform: (timestamp: number) => formatDate(timestamp, 'MM/DD/YYYY'),
        label: 'Marriage Date'
      },
    ],
    checkboxFields: [
      {
        pdfFieldName: 'InUSA',
        condition: (customer) => customer.isInUSA === true,
        label: 'Currently in USA'
      },
      {
        pdfFieldName: 'HasI94',
        condition: (customer) => customer.hasI94 === true,
        label: 'Has I-94'
      },
      {
        pdfFieldName: 'HasLPR',
        condition: (customer) => customer.hasLPR === true,
        label: 'Has Legal Permanent Resident Status'
      },
    ]
  }
};

/**
 * Get all available PDF form templates
 */
export const getAllTemplates = (): PDFFormTemplate[] => {
  return Object.values(PDF_FORM_TEMPLATES);
};

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): PDFFormTemplate | undefined => {
  return PDF_FORM_TEMPLATES[id];
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: string): PDFFormTemplate[] => {
  return getAllTemplates().filter(template => template.category === category);
};
