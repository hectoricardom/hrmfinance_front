/**
 * Motion to Dismiss Types for Immigration Court (EOIR)
 * Supports CAA (Cuban Adjustment Act) and Already LPR cases
 */

export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface RespondentInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: number; // timestamp
  countryOfBirth: string;
  countryOfCitizenship?: string;
  address: Address;
  phone?: string;
  email?: string;
  aNumber: string;
}

// Family member for family cases
export interface FamilyMember {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: number;
  countryOfBirth: string;
  aNumber: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  relationshipDescription?: string; // for 'other'
  // CAA-specific for this family member
  i485FiledDate?: number;
  i485ReceiptNumber?: string;
  i485ApprovalDate?: number;
  isApproved?: boolean;
  // LPR-specific for this family member
  lprGrantDate?: number;
  greenCardNumber?: string;
}

export interface AttorneyInfo {
  name: string;
  barNumber: string;
  eoirId?: string;
  firmName?: string;
  address: Address;
  phone: string;
  fax?: string;
  email: string;
}

export type MotionType = 'dismiss' | 'terminate' | 'administrative_closure';

export type MotionBasis = 'caa' | 'already_lpr' | 'other';

export type ServiceMethod = 'mail' | 'hand_delivery' | 'electronic';

export type ReliefType = 'dismissal' | 'termination' | 'administrative_closure';

export interface CAADetails {
  i485FiledDate: number; // timestamp
  i485ReceiptNumber: string;
  i485ApprovalDate?: number; // timestamp if approved
  isApproved?: boolean;
}

export interface LPRDetails {
  lprGrantDate: number; // timestamp
  greenCardNumber: string;
  classOfAdmission?: string;
}

export interface CertificateOfService {
  serviceMethod: ServiceMethod;
  serviceDate: number; // timestamp
  dhsOfficeAddress: Address;
  dhsOfficeName?: string;
  servedParties: string[]; // List of parties served
}

export interface MotionToDismissData {
  id?: string;

  // Case Information
  aNumber: string;
  courtLocation: string;
  judgeName: string;
  nextHearingDate?: number; // timestamp
  caseStatus?: string;

  // Pro Se (self-represented, no attorney)
  isProSe: boolean;

  // Respondent Information (primary)
  respondent: RespondentInfo;

  // Family members (for family cases)
  familyMembers?: FamilyMember[];
  isFamilyCase?: boolean;

  // Attorney Information (optional - not used for pro se)
  attorney?: AttorneyInfo;

  // Motion Details
  motionType: MotionType;
  basis: MotionBasis;
  otherBasisDescription?: string; // When basis is 'other'

  // Basis-specific details
  caaDetails?: CAADetails;
  lprDetails?: LPRDetails;

  // Arguments
  supportingFacts: string;
  legalArguments: string;
  reliefRequested: ReliefType[];

  // Certificate of Service
  certificateOfService: CertificateOfService;

  // Link to NotaryCustomer (optional)
  clientNotaryId?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  status: 'draft' | 'completed' | 'filed';
}

// Immigration Court locations with legal advisor and court addresses
export interface CourtAddresses {
  legalAdvisor: {
    address: string;
    city: string;
  };
  court: {
    address: string;
    city: string;
  };
}

export const COURT_ADDRESSES: Record<string, CourtAddresses> = {
  MIAMI: {
    legalAdvisor: {
      address: "333 S. Miami Ave, Suite 200",
      city: "Miami, FL 33130"
    },
    court: {
      address: "333 S. Miami Ave, Suite 700",
      city: "Miami, FL 33130"
    }
  },
  MEMPHIS: {
    legalAdvisor: {
      address: "80 Monroe Ave, Suite 200",
      city: "Memphis, TN 38103"
    },
    court: {
      address: "80 Monroe Ave, Garden LVL G-10",
      city: "Memphis, TN 38103"
    }
  },
  LOUISVILLE: {
    legalAdvisor: {
      address: "601 W. Broadway, Basement Room 3",
      city: "Louisville, KY 40202"
    },
    court: {
      address: "601 W. Broadway, Basement Room 3",
      city: "Louisville, KY 40202"
    }
  },
  INDIANA: {
    legalAdvisor: {
      address: "575 N Pennsylvania Street, Suite 646",
      city: "Indianapolis, IN 46204"
    },
    court: {
      address: "575 N Pennsylvania Street, Suite 617",
      city: "Indianapolis, IN 46204"
    }
  },
  CHICAGO: {
    legalAdvisor: {
      address: "55 E Monroe St, Suite 1400",
      city: "Chicago, IL 60603"
    },
    court: {
      address: "55 E Monroe St, Suite 1500",
      city: "Chicago, IL 60603"
    }
  },
  ORLANDO: {
    legalAdvisor: {
      address: "500 N Orange Ave Ste 5000",
      city: "Orlando, FL 32801"
    },
    court: {
      address: "500 N Orange Ave Ste 1100",
      city: "Orlando, FL 32801"
    }
  },
  KANSAS_CITY: {
    legalAdvisor: {
      address: "2345 Grand Boulevard, Suite 500",
      city: "Kansas City, MO 64108"
    },
    court: {
      address: "2345 Grand Boulevard, Suite 525",
      city: "Kansas City, MO 64108"
    }
  },
  HOUSTON: {
    legalAdvisor: {
      address: "126 Northpoint Drive, Room 2020",
      city: "Houston, TX 77060"
    },
    court: {
      address: "8701 S Gessner Rd, 10th Floor",
      city: "Houston, TX 77074"
    }
  },
  BOSTON: {
    legalAdvisor: {
      address: "15 New Sudbury Street, Room 425",
      city: "Boston, MA 02203"
    },
    court: {
      address: "150 Apollo Dr Suite 100",
      city: "Chelmsford, MA 01824"
    }
  },
  OHIO: {
    legalAdvisor: {
      address: "925 Keynote Circle, Room 201",
      city: "Brooklyn Heights, OH 44131"
    },
    court: {
      address: "801 W Superior Avenue, Suite 13-100",
      city: "Cleveland, OH 44113"
    }
  },
  CHARLOTTE: {
    legalAdvisor: {
      address: "5701 Executive Center Dr, Suite 300",
      city: "Charlotte, NC 28212"
    },
    court: {
      address: "5701 Executive Center Dr, Suite 400",
      city: "Charlotte, NC 28212"
    }
  },
  SAN_ANTONIO: {
    legalAdvisor: {
      address: "1015 Jackson-Keller Road, Suite 100",
      city: "San Antonio, TX 78213"
    },
    court: {
      address: "800 Dolorosa St, Suite 300",
      city: "San Antonio, TX 78207"
    }
  },
  ATLANTA: {
    legalAdvisor: {
      address: "401 W Peachtree St NW, Ste 2850",
      city: "Atlanta, GA 30308"
    },
    court: {
      address: "401 W Peachtree St NW, Ste 2600",
      city: "Atlanta, GA 30308"
    }
  },
  DENVER: {
    legalAdvisor: {
      address: "12445 East Caley Avenue",
      city: "Centennial, CO 80111"
    },
    court: {
      address: "1961 Stout St, Ste 3101",
      city: "Denver, CO 80294"
    }
  },
  DALLAS: {
    legalAdvisor: {
      address: "125 E. John Carpenter Fwy, Suite 500",
      city: "Irving, TX 75062"
    },
    court: {
      address: "1100 Commerce St, Ste 1060",
      city: "Dallas, TX 75242"
    }
  }

  

};

// Immigration Court selection options
export const IMMIGRATION_COURTS = [
  { value: 'MIAMI', label: 'Miami Immigration Court' },
  { value: 'ORLANDO', label: 'Orlando Immigration Court' },
  { value: 'MEMPHIS', label: 'Memphis Immigration Court' },
  { value: 'LOUISVILLE', label: 'Louisville Immigration Court' },
  { value: 'INDIANA', label: 'Indiana Immigration Court' },
  { value: 'CHICAGO', label: 'Chicago Immigration Court' },
  { value: 'KANSAS_CITY', label: 'Kansas City Immigration Court' },
  { value: 'HOUSTON', label: 'Houston Immigration Court' },
  { value: 'BOSTON', label: 'Boston/Chelmsford Immigration Court' },
  { value: 'OHIO', label: 'Ohio/Cleveland Immigration Court' },
  { value: 'CHARLOTTE', label: 'Charlotte Immigration Court' },
  { value: 'SAN_ANTONIO', label: 'San Antonio Immigration Court' },
  { value: 'ATLANTA', label: 'Atlanta Immigration Court' },
  { value: 'DENVER', label: 'Denver Immigration Court' },
  { value: 'DALLAS', label: 'Dallas Immigration Court' },
  
  { value: 'OTHER', label: 'Other (specify)' }
] as const;

// Helper to get court addresses
export const getCourtAddresses = (courtKey: string): CourtAddresses | null => {
  return COURT_ADDRESSES[courtKey] || null;
};

// DHS/ICE Office addresses for Certificate of Service
export const DHS_OFFICES = [
  {
    value: 'miami_ice',
    label: 'ICE - Miami Field Office',
    address: {
      street: '865 SW 78th Ave',
      city: 'Plantation',
      state: 'FL',
      zipCode: '33324',
      country: 'USA'
    }
  },
  {
    value: 'orlando_ice',
    label: 'ICE - Orlando Field Office',
    address: {
      street: '5707 Dot Com Ct',
      city: 'Ocoee',
      state: 'FL',
      zipCode: '34761',
      country: 'USA'
    }
  },
  {
    value: 'other',
    label: 'Other (enter manually)',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    }
  }
] as const;

// Form validation helpers
export const validateANumber = (aNumber: string): boolean => {
  // A-Number format: XXX-XXX-XXX or XXXXXXXXX (9 digits)
  const cleaned = aNumber.replace(/[-\s]/g, '');
  return /^\d{9}$/.test(cleaned);
};

export const formatANumber = (aNumber: string): string => {
  const cleaned = aNumber.replace(/[-\s]/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return aNumber;
};

// Default empty motion data
export const getEmptyMotionData = (): Partial<MotionToDismissData> => ({
  motionType: 'dismiss',
  basis: 'caa',
  reliefRequested: ['dismissal'],
  status: 'draft',
  isProSe: true, // Default to pro se (self-represented)
  respondent: {
    firstName: '',
    lastName: '',
    dateOfBirth: 0,
    countryOfBirth: 'Cuba',
    aNumber: '',
    address: {
      street: '',
      city: '',
      state: 'FL',
      zipCode: '',
      country: 'USA'
    }
  },
  certificateOfService: {
    serviceMethod: 'mail',
    serviceDate: Date.now(),
    dhsOfficeAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    servedParties: ['DHS/ICE Office of Chief Counsel']
  },
  supportingFacts: '',
  legalArguments: '',
  createdAt: Date.now(),
  updatedAt: Date.now()
});



/// take all this and joint to make a decent well conformed motion