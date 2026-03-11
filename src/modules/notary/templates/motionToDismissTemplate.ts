/**
 * Motion to Dismiss Document Templates for Immigration Court
 * These templates follow EOIR format requirements
 */

import { MotionToDismissData, formatANumber } from '../types/motionToDismiss';

// Helper to format dates - timezone safe
const formatDate = (timestamp: number): string => {
  if (!timestamp) return '_______________';
  const date = new Date(timestamp);
  // Use UTC methods to avoid timezone shift when displaying dates
  const year = date.getFullYear();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${month} ${day}, ${year}`;
};

const formatShortDate = (timestamp: number): string => {
  if (!timestamp) return '__/__/____';
  const date = new Date(timestamp);
  // Use local date components to avoid timezone shift
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Get motion type text
const getMotionTypeText = (type: string): string => {
  switch (type) {
    case 'dismiss': return 'MOTION TO DISMISS';
    case 'terminate': return 'MOTION TO TERMINATE';
    case 'administrative_closure': return 'MOTION FOR ADMINISTRATIVE CLOSURE';
    default: return 'MOTION TO DISMISS';
  }
};

// Get basis description
const getBasisDescription = (data: MotionToDismissData): string => {
  switch (data.basis) {
    case 'caa':
      return `Respondent is eligible for adjustment of status under the Cuban Adjustment Act (CAA), Public Law 89-732, and has a pending or approved Form I-485 Application to Register Permanent Residence.`;
    case 'already_lpr':
      return `Respondent is already a Lawful Permanent Resident of the United States and is not subject to removal proceedings.`;
    case 'other':
      return data.otherBasisDescription || '';
    default:
      return '';
  }
};

// Get relief text
const getReliefText = (reliefRequested: string[]): string => {
  const reliefMap: Record<string, string> = {
    'dismissal': 'dismissal of removal proceedings',
    'termination': 'termination of removal proceedings',
    'administrative_closure': 'administrative closure of the case'
  };

  return reliefRequested
    .map(r => reliefMap[r] || r)
    .join(', ');
};

/**
 * Generate the main Motion to Dismiss document text
 */
export const generateMotionText = (data: MotionToDismissData): string => {
  const respondentName = `${data.respondent.firstName}${data.respondent.middleName ? ' ' + data.respondent.middleName : ''} ${data.respondent.lastName}`.toUpperCase();
  const aNumber = formatANumber(data.aNumber);
  const isProSe = data.isProSe !== false;

  return `UNITED STATES DEPARTMENT OF JUSTICE
EXECUTIVE OFFICE FOR IMMIGRATION REVIEW
IMMIGRATION COURT
${data.courtLocation.toUpperCase()}

In the Matter of:                    )
                                     )
${respondentName.padEnd(35, ' ')}    )    A# ${aNumber}
                                     )
     Respondent                      )    In Removal Proceedings

${getMotionTypeText(data.motionType)}

     ${isProSe
      ? `I, ${data.respondent.firstName} ${data.respondent.lastName}, appearing Pro Se, respectfully move this Honorable Court to ${getReliefText(data.reliefRequested)}, and in support thereof state as follows:`
      : `Respondent, ${data.respondent.firstName} ${data.respondent.lastName}, by and through undersigned counsel, respectfully moves this Honorable Court to ${getReliefText(data.reliefRequested)}, and in support thereof states as follows:`}

I. INTRODUCTION

     ${data.respondent.firstName} ${data.respondent.lastName} ("Respondent") is a native and citizen of ${data.respondent.countryOfBirth}. Respondent is currently in removal proceedings before this Court.

II. FACTUAL BACKGROUND

${data.supportingFacts || '     [Supporting facts to be provided]'}

III. LEGAL ARGUMENT

     ${getBasisDescription(data)}

${data.legalArguments || '     [Legal arguments to be provided]'}

${data.basis === 'caa' && data.caaDetails ? `
     Respondent filed Form I-485, Application to Register Permanent Residence or Adjust Status, on ${formatDate(data.caaDetails.i485FiledDate)}. The USCIS receipt number is ${data.caaDetails.i485ReceiptNumber}.${data.caaDetails.isApproved ? ` The application was approved on ${formatDate(data.caaDetails.i485ApprovalDate)}.` : ' The application is currently pending adjudication by USCIS.'}

     Under the Cuban Adjustment Act of 1966, as amended, Cubans who have been physically present in the United States for at least one year are eligible to adjust their status to lawful permanent resident. The regulations at 8 C.F.R. § 245.2(a)(1) provide that removal proceedings should be terminated when an applicant has established prima facie eligibility for adjustment.
` : ''}

${data.basis === 'already_lpr' && data.lprDetails ? `
     Respondent was granted Lawful Permanent Resident status on ${formatDate(data.lprDetails.lprGrantDate)}. Respondent's Permanent Resident Card (Green Card) number is ${data.lprDetails.greenCardNumber}${data.lprDetails.classOfAdmission ? `, class of admission: ${data.lprDetails.classOfAdmission}` : ''}.

     As a Lawful Permanent Resident, Respondent is not removable under the grounds alleged in the Notice to Appear. These proceedings were initiated in error and should be terminated.
` : ''}

IV. CONCLUSION

     For the foregoing reasons, ${isProSe ? 'I respectfully request' : 'Respondent respectfully requests'} that this Honorable Court grant this Motion and order the ${getReliefText(data.reliefRequested)}.

Respectfully submitted,

_______________________________
${isProSe
  ? `${data.respondent.firstName} ${data.respondent.lastName}
${data.respondent.address.street}${data.respondent.address.street2 ? '\n' + data.respondent.address.street2 : ''}
${data.respondent.address.city}, ${data.respondent.address.state} ${data.respondent.address.zipCode}
${data.respondent.phone ? 'Tel: ' + data.respondent.phone : ''}
${data.respondent.email ? 'Email: ' + data.respondent.email : ''}
A# ${formatANumber(data.aNumber)}

Pro Se Respondent`
  : `${data.attorney?.name || ''}
${data.attorney?.firmName || ''}
${data.attorney?.address?.street || ''}${data.attorney?.address?.street2 ? '\n' + data.attorney.address.street2 : ''}
${data.attorney?.address?.city || ''}, ${data.attorney?.address?.state || ''} ${data.attorney?.address?.zipCode || ''}
Tel: ${data.attorney?.phone || ''}${data.attorney?.fax ? '  Fax: ' + data.attorney.fax : ''}
Email: ${data.attorney?.email || ''}
Bar Number: ${data.attorney?.barNumber || ''}${data.attorney?.eoirId ? '  EOIR ID: ' + data.attorney.eoirId : ''}

Attorney for Respondent`}

Date: ${formatDate(Date.now())}
`;
};

/**
 * Generate Certificate of Service text
 */
export const generateCertificateOfService = (data: MotionToDismissData): string => {
  const isProSe = data.isProSe !== false;
  const serviceMethodText = {
    'mail': 'by depositing a true and correct copy in the United States Mail, first-class postage prepaid',
    'hand_delivery': 'by hand delivery',
    'electronic': 'by electronic service through the EOIR Courts & Appeals System (ECAS)'
  };

  return `
CERTIFICATE OF SERVICE

     I hereby certify that on ${formatDate(data.certificateOfService.serviceDate)}, I served a true and correct copy of the foregoing ${getMotionTypeText(data.motionType)} and all attachments ${serviceMethodText[data.certificateOfService.serviceMethod]}, addressed to:

${data.certificateOfService.servedParties.map(party => `     ${party}`).join('\n')}
     ${data.certificateOfService.dhsOfficeName || 'DHS/ICE Office of Chief Counsel'}
     ${data.certificateOfService.dhsOfficeAddress.street}
     ${data.certificateOfService.dhsOfficeAddress.city}, ${data.certificateOfService.dhsOfficeAddress.state} ${data.certificateOfService.dhsOfficeAddress.zipCode}


_______________________________
${isProSe
  ? `${data.respondent.firstName} ${data.respondent.lastName}
Pro Se Respondent`
  : `${data.attorney?.name || ''}
Attorney for Respondent`}

Date: ${formatDate(data.certificateOfService.serviceDate)}
`;
};

/**
 * Generate Proposed Order text
 */
export const generateProposedOrder = (data: MotionToDismissData): string => {
  const respondentName = `${data.respondent.firstName}${data.respondent.middleName ? ' ' + data.respondent.middleName : ''} ${data.respondent.lastName}`.toUpperCase();
  const aNumber = formatANumber(data.aNumber);

  const orderActionText = {
    'dismiss': 'DISMISSED',
    'terminate': 'TERMINATED',
    'administrative_closure': 'ADMINISTRATIVELY CLOSED'
  };

  const basisText = {
    'caa': 'Respondent has established eligibility for adjustment of status under the Cuban Adjustment Act',
    'already_lpr': 'Respondent has established that they are a Lawful Permanent Resident',
    'other': data.otherBasisDescription || 'good cause shown'
  };

  return `UNITED STATES DEPARTMENT OF JUSTICE
EXECUTIVE OFFICE FOR IMMIGRATION REVIEW
IMMIGRATION COURT
${data.courtLocation.toUpperCase()}

In the Matter of:                    )
                                     )
${respondentName.padEnd(35, ' ')}    )    A# ${aNumber}
                                     )
     Respondent                      )    In Removal Proceedings


PROPOSED ORDER

     Upon consideration of Respondent's ${getMotionTypeText(data.motionType)}, and the Court finding that ${basisText[data.basis]},

     IT IS HEREBY ORDERED that the removal proceedings in the above-captioned matter are ${orderActionText[data.motionType]}.



_______________________________          _______________
Immigration Judge                        Date
${data.judgeName || '[Immigration Judge Name]'}
${data.courtLocation}
`;
};

/**
 * Get full document with all sections
 */
export const generateFullMotionDocument = (data: MotionToDismissData): string => {
  return `${generateMotionText(data)}

${'─'.repeat(60)}

${generateCertificateOfService(data)}

${'─'.repeat(60)}

${generateProposedOrder(data)}
`;
};

/**
 * Template for motion cover page (for PDF generation)
 */
export const motionCoverPageTemplate = {
  title: 'MOTION TO DISMISS REMOVAL PROCEEDINGS',
  header: {
    department: 'UNITED STATES DEPARTMENT OF JUSTICE',
    agency: 'EXECUTIVE OFFICE FOR IMMIGRATION REVIEW',
    court: 'IMMIGRATION COURT'
  },
  fonts: {
    header: 'Times New Roman',
    body: 'Times New Roman',
    headerSize: 14,
    bodySize: 12,
    lineHeight: 1.5
  },
  margins: {
    top: 72, // 1 inch
    bottom: 72,
    left: 72,
    right: 72
  }
};
