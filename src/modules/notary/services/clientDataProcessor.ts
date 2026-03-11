import { NotaryCustomer, Residence, Employer, School, EntryRecord, PassportRecord } from '../types';

/**
 * Processed and organized client data optimized for form filling
 */
export interface ProcessedClientData {
  // Personal Information
  personal: {
    fullName: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth?: Date;
    age?: number;
    placeOfBirth?: {
      city?: string;
      state?: string;
      country?: string;
      formatted: string;
    };
    gender?: string;
    maritalStatus?: string;
    physicalCharacteristics: {
      height?: number;
      weight?: number;
      eyeColor?: string;
      hairColor?: string;
    };
  };

  // Identification
  identification: {
    alienNumber?: string;
    ssn?: string;
    uscisAccountNumber?: string;
    clientNotaryId?: string;
  };

  // Contact Information
  contact: {
    email?: string;
    phoneNumber?: string;
    currentLocation?: {
      state?: string;
      country?: string;
    };
  };

  // Immigration Status
  immigration: {
    countryOfCitizenship?: string;
    isInUSA: boolean;
    hasI94: boolean;
    hasLPR: boolean;
    dateOfAppI589?: Date;
  };

  // Residences (sorted chronologically, most recent first)
  residences: {
    all: SortedResidence[];
    byCountry: Map<string, SortedResidence[]>;
    inUSA: SortedResidence[];
    outsideUSA: SortedResidence[];
    last5Years: SortedResidence[];
    current?: SortedResidence;
  };

  // Employment (sorted chronologically, most recent first)
  employers: {
    all: SortedEmployer[];
    current?: SortedEmployer;
    last5Years: SortedEmployer[];
    byCountry: Map<string, SortedEmployer[]>;
  };

  // Education (sorted chronologically, most recent first)
  education: {
    all: SortedSchool[];
    byLevel: Map<string, SortedSchool[]>;
    highest?: SortedSchool;
    byCountry: Map<string, SortedSchool[]>;
  };

  // Travel History (sorted chronologically, most recent first)
  travelHistory: {
    all: SortedEntry[];
    entries: SortedEntry[];
    last5Years: SortedEntry[];
    byCountry: Map<string, SortedEntry[]>;
  };

  // Passport Information (sorted by expiration date)
  passports: {
    all: SortedPassport[];
    current?: SortedPassport;
    expired: SortedPassport[];
    valid: SortedPassport[];
    byCountry: Map<string, SortedPassport[]>;
  };

  // Marriage Information
  marriage?: {
    isMarried: boolean;
    date?: Date;
    place?: {
      city?: string;
      state?: string;
      country?: string;
      formatted: string;
    };
  };
}

export interface SortedResidence extends Residence {
  id: string;
  sortDate: Date;
  isCurrent: boolean;
  duration?: number; // in months
  formattedAddress: string;
  formattedPeriod: string;
}

export interface SortedEmployer extends Employer {
  id: string;
  sortDate: Date;
  isCurrent: boolean;
  duration?: number; // in months
  formattedAddress: string;
  formattedPeriod: string;
}

export interface SortedSchool extends School {
  id: string;
  sortDate: Date;
  duration?: number; // in months
  formattedPeriod: string;
  formattedLocation: string;
}

export interface SortedEntry extends EntryRecord {
  id: string;
  sortDate: Date;
  formattedDate: string;
  daysSinceEntry?: number;
}

export interface SortedPassport extends PassportRecord {
  id: string;
  isExpired: boolean;
  isValid: boolean;
  daysUntilExpiration?: number;
  formattedIssueDate: string;
  formattedExpirationDate: string;
}

/**
 * Parse date from various formats
 */
function parseDate(dateInput: any): Date | undefined {
  if (!dateInput) return undefined;

  if (dateInput instanceof Date) return dateInput;

  if (typeof dateInput === 'number') {
    return new Date(dateInput);
  }

  if (typeof dateInput === 'string') {
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Handle {month: X, year: Y} format
  if (typeof dateInput === 'object' && 'year' in dateInput) {
    const month = dateInput.month || 1;
    const year = dateInput.year;
    if (year && year !== 'Present') {
      return new Date(year, month - 1, 1);
    }
  }

  return undefined;
}

/**
 * Format date range
 */
function formatDateRange(fromDate: any, toDate: any): string {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);

  const formatMonthYear = (date?: Date) => {
    if (!date) return '?';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const fromStr = formatMonthYear(from);
  const toStr = toDate?.year === 'Present' || !to ? 'Present' : formatMonthYear(to);

  return `${fromStr} - ${toStr}`;
}

/**
 * Calculate duration in months between two dates
 */
function calculateDuration(fromDate: any, toDate: any): number | undefined {
  const from = parseDate(fromDate);
  const to = toDate?.year === 'Present' ? new Date() : parseDate(toDate);

  if (!from) return undefined;

  const end = to || new Date();
  const months = (end.getFullYear() - from.getFullYear()) * 12 + (end.getMonth() - from.getMonth());

  return Math.max(0, months);
}

/**
 * Process residences
 */
function processResidences(customer: NotaryCustomer): ProcessedClientData['residences'] {
  const residences = customer.residences || {};
  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

  const sorted: SortedResidence[] = Object.entries(residences)
    .map(([id, residence]) => {
      const fromDate = parseDate(residence.fromDate);
      const toDate = parseDate(residence.toDate);
      const isCurrent = residence.toDate?.year === 'Present' || !toDate;

      return {
        ...residence,
        id,
        sortDate: toDate || fromDate || new Date(0),
        isCurrent,
        duration: calculateDuration(residence.fromDate, residence.toDate),
        formattedAddress: [
          residence.addressLineOne,
          residence.addressLineTwo,
          residence.city,
          residence.state,
          residence.zipcode,
          residence.country
        ].filter(Boolean).join(', '),
        formattedPeriod: formatDateRange(residence.fromDate, residence.toDate)
      } as SortedResidence;
    })
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const byCountry = new Map<string, SortedResidence[]>();
  sorted.forEach(res => {
    const country = res.country || 'Unknown';
    if (!byCountry.has(country)) {
      byCountry.set(country, []);
    }
    byCountry.get(country)!.push(res);
  });

  const inUSA = sorted.filter(r => r.country?.toLowerCase().includes('united states') || r.country?.toLowerCase() === 'usa');
  const outsideUSA = sorted.filter(r => !r.country?.toLowerCase().includes('united states') && r.country?.toLowerCase() !== 'usa');
  const last5Years = sorted.filter(r => r.sortDate >= fiveYearsAgo);
  const current = sorted.find(r => r.isCurrent);

  return {
    all: sorted,
    byCountry,
    inUSA,
    outsideUSA,
    last5Years,
    current
  };
}

/**
 * Process employers
 */
function processEmployers(customer: NotaryCustomer): ProcessedClientData['employers'] {
  const employers = customer.employers || {};
  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

  const sorted: SortedEmployer[] = Object.entries(employers)
    .map(([id, employer]) => {
      const fromDate = parseDate(employer.fromDate);
      const toDate = parseDate(employer.toDate);
      const isCurrent = employer.toDate?.year === 'Present' || !toDate;

      return {
        ...employer,
        id,
        sortDate: toDate || fromDate || new Date(0),
        isCurrent,
        duration: calculateDuration(employer.fromDate, employer.toDate),
        formattedAddress: [
          employer.addressLineOne,
          employer.addressLineTwo,
          employer.city,
          employer.state,
          employer.zipcode,
          employer.country
        ].filter(Boolean).join(', '),
        formattedPeriod: formatDateRange(employer.fromDate, employer.toDate)
      } as SortedEmployer;
    })
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const byCountry = new Map<string, SortedEmployer[]>();
  sorted.forEach(emp => {
    const country = emp.country || 'Unknown';
    if (!byCountry.has(country)) {
      byCountry.set(country, []);
    }
    byCountry.get(country)!.push(emp);
  });

  const current = sorted.find(e => e.isCurrent);
  const last5Years = sorted.filter(e => e.sortDate >= fiveYearsAgo);

  return {
    all: sorted,
    current,
    last5Years,
    byCountry
  };
}

/**
 * Process education/schools
 */
function processEducation(customer: NotaryCustomer): ProcessedClientData['education'] {
  const schools = customer.schoolHistory || {};

  const sorted: SortedSchool[] = Object.entries(schools)
    .map(([id, school]) => {
      const fromDate = parseDate(school.fromDate);
      const toDate = parseDate(school.toDate);

      return {
        ...school,
        id,
        sortDate: toDate || fromDate || new Date(0),
        duration: calculateDuration(school.fromDate, school.toDate),
        formattedPeriod: formatDateRange(school.fromDate, school.toDate),
        formattedLocation: [school.city, school.state, school.country].filter(Boolean).join(', ')
      } as SortedSchool;
    })
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const byLevel = new Map<string, SortedSchool[]>();
  sorted.forEach(school => {
    const level = school.schoolType || 'Unknown';
    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }
    byLevel.get(level)!.push(school);
  });

  const byCountry = new Map<string, SortedSchool[]>();
  sorted.forEach(school => {
    const country = school.country || 'Unknown';
    if (!byCountry.has(country)) {
      byCountry.set(country, []);
    }
    byCountry.get(country)!.push(school);
  });

  // Determine highest education level
  const educationLevels = ['PhD', 'Doctorate', 'Master', 'Bachelor', 'Associate', 'High School', 'Elementary'];
  const highest = sorted.find(school =>
    educationLevels.some(level => school.schoolType?.toLowerCase().includes(level.toLowerCase()))
  );

  return {
    all: sorted,
    byLevel,
    highest,
    byCountry
  };
}

/**
 * Process travel history
 */
function processTravelHistory(customer: NotaryCustomer): ProcessedClientData['travelHistory'] {
  const entries = customer.entryRecord || {};
  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

  const sorted: SortedEntry[] = Object.entries(entries)
    .map(([id, entry]) => {
      const entryDate = parseDate(entry.dateOfEntry);
      const daysSince = entryDate ? Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

      return {
        ...entry,
        id,
        sortDate: entryDate || new Date(0),
        formattedDate: entryDate?.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }) || 'Unknown',
        daysSinceEntry: daysSince
      } as SortedEntry;
    })
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const byCountry = new Map<string, SortedEntry[]>();
  sorted.forEach(entry => {
    // Use the country they came from (lastLeftYourCountry) or placeOfEntry
    const country = entry.placeOfEntry || 'Unknown';
    if (!byCountry.has(country)) {
      byCountry.set(country, []);
    }
    byCountry.get(country)!.push(entry);
  });

  const last5Years = sorted.filter(e => e.sortDate >= fiveYearsAgo);

  return {
    all: sorted,
    entries: sorted,
    last5Years,
    byCountry
  };
}

/**
 * Process passports
 */
function processPassports(customer: NotaryCustomer): ProcessedClientData['passports'] {
  const passports = customer.passportRecord || {};
  const now = new Date();

  const sorted: SortedPassport[] = Object.entries(passports)
    .map(([id, passport]) => {
      const issueDate = parseDate(passport.issueDate);
      const expirationDate = parseDate(passport.expirationDate);
      const isExpired = expirationDate ? expirationDate < now : false;
      const isValid = !isExpired && expirationDate ? expirationDate > now : false;
      const daysUntilExpiration = expirationDate
        ? Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        ...passport,
        id,
        isExpired,
        isValid,
        daysUntilExpiration,
        formattedIssueDate: issueDate?.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }) || 'Unknown',
        formattedExpirationDate: expirationDate?.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }) || 'Unknown'
      } as SortedPassport;
    })
    .sort((a, b) => {
      // Sort by expiration date, most recent expiration first
      const aDate = parseDate(a.expirationDate) || new Date(0);
      const bDate = parseDate(b.expirationDate) || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });

  const byCountry = new Map<string, SortedPassport[]>();
  sorted.forEach(passport => {
    const country = passport.countryOfIssuance || 'Unknown';
    if (!byCountry.has(country)) {
      byCountry.set(country, []);
    }
    byCountry.get(country)!.push(passport);
  });

  const current = sorted.find(p => p.isValid);
  const expired = sorted.filter(p => p.isExpired);
  const valid = sorted.filter(p => p.isValid);

  return {
    all: sorted,
    current,
    expired,
    valid,
    byCountry
  };
}

/**
 * Main function to process all client data
 */
export function processClientData(customer: NotaryCustomer): ProcessedClientData {
  const dateOfBirth = parseDate(customer.dateOfBirth);
  const age = dateOfBirth
    ? Math.floor((new Date().getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : undefined;

  return {
    personal: {
      fullName: [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' '),
      firstName: customer.firstName || '',
      middleName: customer.middleName,
      lastName: customer.lastName || '',
      dateOfBirth,
      age,
      placeOfBirth: customer.placeOfBirth ? {
        city: customer.placeOfBirth.city,
        state: customer.placeOfBirth.state,
        country: customer.placeOfBirth.country,
        formatted: [
          customer.placeOfBirth.city,
          customer.placeOfBirth.state,
          customer.placeOfBirth.country
        ].filter(Boolean).join(', ')
      } : undefined,
      gender: customer.genre,
      maritalStatus: customer.maritalStatus,
      physicalCharacteristics: {
        height: customer.height,
        weight: customer.weight,
        eyeColor: customer.eyesColor,
        hairColor: customer.hairColor
      }
    },

    identification: {
      alienNumber: customer.alienNumber,
      ssn: customer.ss,
      uscisAccountNumber: customer.uscisOnlineAccountNumber,
      clientNotaryId: customer.clientNotaryId
    },

    contact: {
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      currentLocation: customer.currentLocation
    },

    immigration: {
      countryOfCitizenship: customer.countryOfCitizenship,
      isInUSA: customer.isInUSA || false,
      hasI94: customer.hasI94 || false,
      hasLPR: customer.hasLPR || false,
      dateOfAppI589: parseDate(customer.dateOfAppI589)
    },

    residences: processResidences(customer),
    employers: processEmployers(customer),
    education: processEducation(customer),
    travelHistory: processTravelHistory(customer),
    passports: processPassports(customer),

    marriage: customer.isMarriage ? {
      isMarried: true,
      date: parseDate(customer.marriage_date),
      place: {
        city: customer.marriage_city,
        state: customer.marriage_state,
        country: customer.marriage_country,
        formatted: [
          customer.marriage_city,
          customer.marriage_state,
          customer.marriage_country
        ].filter(Boolean).join(', ')
      }
    } : undefined
  };
}

/**
 * Get data for specific form sections
 */
export const FormDataExtractors = {
  /**
   * Get last N residences in USA
   */
  getLastUSAResidences: (data: ProcessedClientData, count: number = 5): SortedResidence[] => {
    return data.residences.inUSA.slice(0, count);
  },

  /**
   * Get employment history for last N years
   */
  getRecentEmployment: (data: ProcessedClientData, years: number = 5): SortedEmployer[] => {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
    return data.employers.all.filter(emp => emp.sortDate >= cutoffDate);
  },

  /**
   * Get trips outside USA in last N years
   */
  getRecentTrips: (data: ProcessedClientData, years: number = 5): SortedEntry[] => {
    return data.travelHistory.last5Years;
  },

  /**
   * Get current/most recent information
   */
  getCurrentInfo: (data: ProcessedClientData) => ({
    residence: data.residences.current,
    employer: data.employers.current,
    passport: data.passports.current
  })
};

/**
 * Create a merged data object that combines raw customer data with processed sorted arrays
 * This allows field paths like 'firstName' and 'residences[0].city' to work in conditionals
 */
export function createMergedCustomerData(customer: NotaryCustomer, processed: ProcessedClientData): any {
  return {
    // Include all raw customer fields
    ...customer,

    // Override array fields with processed sorted arrays
    residences: processed.residences.all,
    employers: processed.employers.all,
    schoolHistory: processed.education.all,
    entryRecord: processed.travelHistory.all,
    passportRecord: processed.passports.all,
  };
}
