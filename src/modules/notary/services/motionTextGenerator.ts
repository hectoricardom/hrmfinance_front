/**
 * Prompt generator for Motion to Dismiss documents
 * Generates prompts with form data for AI to create Factual Background and Legal Arguments
 */

import { MotionToDismissData, FamilyMember, formatANumber } from '../types/motionToDismiss';
import { devLog, formatDateMMDDYYYYMMDDYYYY } from '../../../services/utils';

// Helper to format dates - timezone safe
const formatDateMMDDYYYY = (timestamp: number): string => {
  if (!timestamp) return '[Date not provided]';
  const date = new Date(timestamp);
  // Use local date components to avoid timezone shift
  const year = date.getFullYear();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${month} ${day}, ${year}`;
};

// Helper to get relationship text
const getRelationshipText = (relationship: string, description?: string): string => {
  switch (relationship) {
    case 'spouse': return 'Spouse';
    case 'child': return 'Minor Child';
    case 'parent': return 'Parent';
    case 'sibling': return 'Sibling';
    case 'other': return description || 'Family Member';
    default: return 'Family Member';
  }
};

// Helper to get basis text
const getBasisText = (basis: string): string => {
  switch (basis) {
    case 'caa': return 'Cuban Adjustment Act (CAA)';
    case 'already_lpr': return 'Already Lawful Permanent Resident';
    case 'other': return 'Other';
    default: return basis;
  }
};

// Helper to get motion type text
const getMotionTypeText = (type: string): string => {
  switch (type) {
    case 'dismiss': return 'Motion to Dismiss';
    case 'terminate': return 'Motion to Terminate';
    case 'administrative_closure': return 'Motion for Administrative Closure';
    default: return type;
  }
};

/**
 * Generate prompt for Factual Background
 */
export const generateFactualBackgroundPrompt = (data: MotionToDismissData): string => {
  const isFamily = data.isFamilyCase && data.familyMembers && data.familyMembers.length > 0;
  const isProSe = data.isProSe !== false; // Default to pro se

  let prompt = `Generate a FACTUAL BACKGROUND section for an Immigration Court PRO SE ${getMotionTypeText(data.motionType)} based on the following information:

=== CASE INFORMATION ===
- Motion Type: ${getMotionTypeText(data.motionType)}
- Representation: PRO SE (Self-Represented, No Attorney)
- Basis: ${getBasisText(data.basis)}
- Immigration Court: ${data.courtLocation.replace(/_/g, ' ')}
${data.judgeName ? `- Immigration Judge: ${data.judgeName}` : ''}
${data.nextHearingDate ? `- Next Hearing Date: ${formatDateMMDDYYYY(data.nextHearingDate)}` : ''}

=== PRINCIPAL RESPONDENT ===
- Full Name: ${data.respondent.firstName}${data.respondent.middleName ? ' ' + data.respondent.middleName : ''} ${data.respondent.lastName}
- A-Number: ${formatANumber(data.aNumber)}
- Date of Birth: ${formatDateMMDDYYYY(data.respondent.dateOfBirth)}
- Country of Birth: ${data.respondent.countryOfBirth}
- Current Address: ${data.respondent.address.street}${data.respondent.address.street2 ? ', ' + data.respondent.address.street2 : ''}, ${data.respondent.address.city}, ${data.respondent.address.state} ${data.respondent.address.zipCode}
`;

  // Add CAA-specific info
  if (data.basis === 'caa' && data.caaDetails) {
    prompt += `
=== CAA DETAILS (Principal) ===
- I-485 Filed Date: ${formatDateMMDDYYYY(data.caaDetails.i485FiledDate)}
- I-485 Receipt Number: ${data.caaDetails.i485ReceiptNumber || '[Not provided]'}
- I-485 Status: ${data.caaDetails.isApproved ? `APPROVED on ${formatDateMMDDYYYY(data.caaDetails.i485ApprovalDate!)}` : 'PENDING'}
`;
  }

  // Add LPR-specific info
  if (data.basis === 'already_lpr' && data.lprDetails) {
    prompt += `
=== LPR DETAILS (Principal) ===
- LPR Grant Date: ${formatDateMMDDYYYY(data.lprDetails.lprGrantDate)}
- Green Card Number: ${data.lprDetails.greenCardNumber || '[Not provided]'}
${data.lprDetails.classOfAdmission ? `- Class of Admission: ${data.lprDetails.classOfAdmission}` : ''}
`;
  }

  // Add family members
  if (isFamily && data.familyMembers) {
    prompt += `
=== FAMILY MEMBERS (${data.familyMembers.length} additional respondents) ===
`;
    data.familyMembers.forEach((member, index) => {
      prompt += `
--- Family Member #${index + 1} ---
- Relationship: ${getRelationshipText(member.relationship, member.relationshipDescription)}
- Full Name: ${member.firstName}${member.middleName ? ' ' + member.middleName : ''} ${member.lastName}
- A-Number: ${formatANumber(member.aNumber)}
- Date of Birth: ${formatDateMMDDYYYY(member.dateOfBirth)}
- Country of Birth: ${member.countryOfBirth}
`;
      if (data.basis === 'caa' && member.i485FiledDate) {
        prompt += `- I-485 Filed: ${formatDateMMDDYYYY(member.i485FiledDate)}${member.i485ReceiptNumber ? `, Receipt #${member.i485ReceiptNumber}` : ''}
- I-485 Status: ${member.isApproved ? `APPROVED on ${formatDateMMDDYYYY(member.i485ApprovalDate!)}` : 'PENDING'}
`;
      }
      if (data.basis === 'already_lpr' && member.lprGrantDate) {
        prompt += `- LPR Grant Date: ${formatDateMMDDYYYY(member.lprGrantDate)}${member.greenCardNumber ? `, Card #${member.greenCardNumber}` : ''}
`;
      }
    });
  }

  prompt += `
=== INSTRUCTIONS ===
Write a professional FACTUAL BACKGROUND section for this PRO SE Immigration Court motion. The section should:
1. Use formal but accessible legal writing style appropriate for EOIR (Executive Office for Immigration Review)
2. This is a PRO SE motion - the respondent is self-represented WITHOUT an attorney
3. Use first person for the respondent (I, my, me) since they are filing pro se
4. Present facts in chronological order
5. ${isFamily ? 'Address all respondents (principal and family members) as a consolidated family case' : 'Focus on the single respondent'}
6. Include all relevant dates, A-Numbers, and case details
7. Use proper paragraph indentation (start each paragraph with 5 spaces)
8. Be approximately 3-5 paragraphs

DO NOT include section headers like "II. FACTUAL BACKGROUND" - just provide the content paragraphs.`;

  return prompt;
};

/**
 * Generate prompt for Legal Arguments
 */
export const generateLegalArgumentsPrompt = (data: MotionToDismissData): string => {
  const isFamily = data.isFamilyCase && data.familyMembers && data.familyMembers.length > 0;
  const isProSe = data.isProSe !== false; // Default to pro se

  let prompt = `Generate a LEGAL ARGUMENT section for a PRO SE Immigration Court ${getMotionTypeText(data.motionType)} based on the following information:

=== CASE INFORMATION ===
- Motion Type: ${getMotionTypeText(data.motionType)}
- Representation: PRO SE (Self-Represented, No Attorney)
- Basis: ${getBasisText(data.basis)}
${data.otherBasisDescription ? `- Other Basis Description: ${data.otherBasisDescription}` : ''}
- Is Family Case: ${isFamily ? `Yes (${data.familyMembers!.length + 1} total respondents)` : 'No (single respondent)'}

=== PRINCIPAL RESPONDENT ===
- Full Name: ${data.respondent.firstName} ${data.respondent.lastName}
- A-Number: ${formatANumber(data.aNumber)}
- Country of Birth: ${data.respondent.countryOfBirth}
`;

  // Add CAA-specific info
  if (data.basis === 'caa') {
    prompt += `
=== CAA CASE DETAILS ===
- The respondent is a Cuban national seeking adjustment under the Cuban Adjustment Act
${data.caaDetails?.i485FiledDate ? `- I-485 Filed: ${formatDateMMDDYYYY(data.caaDetails.i485FiledDate)}` : ''}
${data.caaDetails?.i485ReceiptNumber ? `- Receipt Number: ${data.caaDetails.i485ReceiptNumber}` : ''}
- I-485 Status: ${data.caaDetails?.isApproved ? 'APPROVED' : 'PENDING'}
`;
  }

  // Add LPR-specific info
  if (data.basis === 'already_lpr') {
    prompt += `
=== LPR CASE DETAILS ===
- The respondent is already a Lawful Permanent Resident
${data.lprDetails?.lprGrantDate ? `- LPR Grant Date: ${formatDateMMDDYYYY(data.lprDetails.lprGrantDate)}` : ''}
${data.lprDetails?.greenCardNumber ? `- Green Card Number: ${data.lprDetails.greenCardNumber}` : ''}
`;
  }

  // Add family members summary
  if (isFamily && data.familyMembers) {
    prompt += `
=== FAMILY MEMBERS ===
`;
    data.familyMembers.forEach((member, index) => {
      prompt += `${index + 1}. ${member.firstName} ${member.lastName} (${getRelationshipText(member.relationship)}) - A# ${formatANumber(member.aNumber)}
`;
    });
  }

  prompt += `
=== INSTRUCTIONS ===
Write a professional LEGAL ARGUMENT section for this PRO SE Immigration Court motion. The section should:

1. Use formal but accessible legal writing style appropriate for EOIR and pro se litigants
2. This is a PRO SE motion - the respondent is self-represented WITHOUT an attorney
3. Use first person (I, my, me) since the respondent is filing pro se
4. Include proper legal citations:`;

  if (data.basis === 'caa') {
    prompt += `
   - Cuban Adjustment Act of 1966 (Pub. L. 89-732)
   - 8 C.F.R. § 245.2(a)(1)
   - Matter of Avetisyan, 25 I&N Dec. 688 (BIA 2012)
   - Any other relevant CAA case law`;
  } else if (data.basis === 'already_lpr') {
    prompt += `
   - INA § 237, 8 U.S.C. § 1227 (grounds of deportability)
   - Relevant case law regarding LPR status
   - Any applicable regulations`;
  } else {
    prompt += `
   - Relevant statutes and regulations
   - Applicable case law
   - 8 C.F.R. § 1003.10(b) (IJ authority)`;
  }

  prompt += `

5. Structure with lettered subsections (A, B, C, D)
6. ${isFamily ? 'Address all respondents as a consolidated family case' : 'Focus on the single respondent'}
7. Argue why ${data.motionType === 'dismiss' ? 'dismissal' : data.motionType === 'terminate' ? 'termination' : 'administrative closure'} is warranted
8. Include a conclusion paragraph requesting relief
9. Use proper paragraph indentation (5 spaces)
10. Be approximately 1-2 pages

DO NOT include the main section header "III. LEGAL ARGUMENT" - start directly with subsection A.`;

  return prompt;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    devLog('Failed to copy to clipboard:', err);
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      devLog('Fallback copy failed:', fallbackErr);
      return false;
    }
  }
};
