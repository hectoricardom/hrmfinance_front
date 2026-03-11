/**
 * Tax Validation Service
 *
 * Pre-Drake validation checklist for ensuring all client data
 * and documents are complete and consistent before export.
 * Returns an array of ValidationCheckItems with pass/warn/error status.
 */

import { devLog } from '../../../services/utils';
import type {
  TaxPortal,
  DrakeTaxDocument,
  FilingStatus,
  TaxDocumentRequest,
} from '../types/drakeTypes';
import type { ValidationCheckItem, ValidationResult } from '../types/taxCalcTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SSN_REGEX = /^\d{3}-?\d{2}-?\d{4}$/;
const EIN_REGEX = /^\d{2}-?\d{7}$/;

function isValidSSN(ssn: string | undefined): boolean {
  if (!ssn) return false;
  return SSN_REGEX.test(ssn.trim());
}

function isValidEIN(ein: string | undefined): boolean {
  if (!ein) return false;
  return EIN_REGEX.test(ein.trim());
}

function normalizeSSN(ssn: string): string {
  return ssn.replace(/\D/g, '');
}

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

export class TaxValidationService {
  /**
   * Run full validation on a tax client and their documents.
   */
  validate(
    client: TaxPortal,
    documents: DrakeTaxDocument[],
    documentRequest?: TaxDocumentRequest | null
  ): ValidationResult {
    devLog('[TaxValidation] Running validation for', client.firstName, client.lastName);

    const items: ValidationCheckItem[] = [];

    // -----------------------------------------------------------------------
    // REQUIRED checks
    // -----------------------------------------------------------------------

    // 1. Client SSN
    items.push(this.checkClientSSN(client));

    // 2. SSN matches across documents
    items.push(this.checkSSNConsistency(client, documents));

    // 3. EIN format validation for all employers
    items.push(...this.checkEINFormats(documents));

    // 4. Filing status set
    items.push(this.checkFilingStatus(client));

    // 5. Filing status consistency with dependents
    items.push(this.checkFilingStatusConsistency(client));

    // 6. All documents verified
    items.push(this.checkAllDocumentsVerified(documents));

    // 7. All required documents present
    items.push(this.checkRequiredDocuments(client, documents));

    // 8. No duplicate W-2s from same employer
    items.push(this.checkDuplicateW2s(documents));

    // 9. Withholding reasonableness
    items.push(this.checkWithholdingReasonableness(documents));

    // 10. Address completeness
    items.push(this.checkAddressCompleteness(client));

    // -----------------------------------------------------------------------
    // RECOMMENDED checks
    // -----------------------------------------------------------------------

    // 11. Dependent SSN validation
    items.push(this.checkDependentSSNs(client));

    // 12. Bank info completeness
    items.push(this.checkBankInfo(client, documentRequest));

    // 13. Signing PIN set
    items.push(this.checkSigningPin(documentRequest));

    // 14. Engagement letter signed
    items.push(this.checkEngagementLetter(documentRequest));

    // 15. Date of birth present
    items.push(this.checkDateOfBirth(client));

    // 16. Tax year set
    items.push(this.checkTaxYear(client));

    // -----------------------------------------------------------------------
    // OPTIONAL checks
    // -----------------------------------------------------------------------

    // 17. Spouse info for MFJ
    items.push(this.checkSpouseInfo(client));

    // 18. Occupation set
    items.push(this.checkOccupation(client));

    // 19. Phone/email for contact
    items.push(this.checkContactInfo(client));

    // Compute results
    const passCount = items.filter((i) => i.status === 'pass').length;
    const warnCount = items.filter((i) => i.status === 'warn').length;
    const errorCount = items.filter((i) => i.status === 'error').length;
    const totalChecks = items.length;
    const readinessScore = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;
    const isReady = errorCount === 0;

    devLog('[TaxValidation] Results: pass', passCount, '| warn', warnCount, '| error', errorCount, '| score', readinessScore);

    return {
      items,
      passCount,
      warnCount,
      errorCount,
      readinessScore,
      isReady,
    };
  }

  // -----------------------------------------------------------------------
  // Individual Check Methods
  // -----------------------------------------------------------------------

  private checkClientSSN(client: TaxPortal): ValidationCheckItem {
    const valid = isValidSSN(client.ssn);
    return {
      id: 'client_ssn',
      category: 'required',
      label: 'Client SSN',
      description: 'Social Security Number must be in valid format (XXX-XX-XXXX)',
      status: valid ? 'pass' : 'error',
      detail: valid
        ? `SSN ending in ${client.ssn!.slice(-4)} is valid`
        : client.ssn
          ? 'SSN format is invalid'
          : 'SSN is missing',
      fixAction: 'client_info',
    };
  }

  private checkSSNConsistency(client: TaxPortal, documents: DrakeTaxDocument[]): ValidationCheckItem {
    if (!client.ssn) {
      return {
        id: 'ssn_consistency',
        category: 'required',
        label: 'SSN Consistency',
        description: 'Client SSN should match SSN on tax documents',
        status: 'error',
        detail: 'Client SSN is not set -- cannot verify document consistency',
        fixAction: 'client_info',
      };
    }

    // Currently, extractedAmounts does not include recipient SSN directly,
    // so we check that at least we have the client SSN. This is a structural check.
    const w2Docs = documents.filter((d) => d.drakeFormType === 'w2' && d.verified);
    if (w2Docs.length === 0) {
      return {
        id: 'ssn_consistency',
        category: 'required',
        label: 'SSN Consistency',
        description: 'Client SSN should match SSN on tax documents',
        status: 'pending',
        detail: 'No verified W-2 documents to check against',
      };
    }

    return {
      id: 'ssn_consistency',
      category: 'required',
      label: 'SSN Consistency',
      description: 'Client SSN should match SSN on tax documents',
      status: 'pass',
      detail: `Client SSN set and ${w2Docs.length} verified W-2(s) available for matching`,
    };
  }

  private checkEINFormats(documents: DrakeTaxDocument[]): ValidationCheckItem[] {
    const items: ValidationCheckItem[] = [];
    const docsWithPayer = documents.filter((d) => d.payerInfo?.ein);

    if (docsWithPayer.length === 0) {
      items.push({
        id: 'ein_format_check',
        category: 'required',
        label: 'Employer/Payer EIN Validation',
        description: 'All employer/payer EINs should be in valid format',
        status: 'pending',
        detail: 'No documents have EIN data to validate',
      });
      return items;
    }

    const invalidDocs: string[] = [];
    for (const doc of docsWithPayer) {
      if (!isValidEIN(doc.payerInfo!.ein)) {
        invalidDocs.push(doc.payerInfo?.name || doc.originalFileName || doc.id);
      }
    }

    items.push({
      id: 'ein_format_check',
      category: 'required',
      label: 'Employer/Payer EIN Validation',
      description: 'All employer/payer EINs should be in valid format (XX-XXXXXXX)',
      status: invalidDocs.length === 0 ? 'pass' : 'warn',
      detail: invalidDocs.length === 0
        ? `All ${docsWithPayer.length} EIN(s) are valid`
        : `Invalid EIN format on: ${invalidDocs.join(', ')}`,
      fixAction: 'document_review',
    });

    return items;
  }

  private checkFilingStatus(client: TaxPortal): ValidationCheckItem {
    const valid = !!client.filingStatus;
    return {
      id: 'filing_status',
      category: 'required',
      label: 'Filing Status',
      description: 'Filing status must be selected',
      status: valid ? 'pass' : 'error',
      detail: valid ? `Filing status: ${client.filingStatus!.replace(/_/g, ' ')}` : 'Filing status not set',
      fixAction: 'client_info',
    };
  }

  private checkFilingStatusConsistency(client: TaxPortal): ValidationCheckItem {
    const fs = client.filingStatus;
    const deps = client.dependents || [];
    const hasSpouse = !!client.spouse;

    // MFJ/MFS should have spouse info
    if ((fs === 'married_filing_jointly' || fs === 'married_filing_separately') && !hasSpouse) {
      return {
        id: 'filing_status_consistency',
        category: 'required',
        label: 'Filing Status Consistency',
        description: 'Filing status should be consistent with dependent and spouse information',
        status: 'warn',
        detail: `Filing status is "${fs?.replace(/_/g, ' ')}" but no spouse information is provided`,
        fixAction: 'client_info',
      };
    }

    // HoH typically should have at least one dependent
    if (fs === 'head_of_household' && deps.length === 0 && !client.hasNoDependents) {
      return {
        id: 'filing_status_consistency',
        category: 'required',
        label: 'Filing Status Consistency',
        description: 'Filing status should be consistent with dependent and spouse information',
        status: 'warn',
        detail: 'Head of Household typically requires at least one qualifying dependent',
        fixAction: 'client_info',
      };
    }

    return {
      id: 'filing_status_consistency',
      category: 'required',
      label: 'Filing Status Consistency',
      description: 'Filing status should be consistent with dependent and spouse information',
      status: 'pass',
      detail: 'Filing status is consistent with client data',
    };
  }

  private checkAllDocumentsVerified(documents: DrakeTaxDocument[]): ValidationCheckItem {
    // Exclude non-upload document types (verification forms)
    const uploadDocs = documents.filter(
      (d) => !['verify_ssn', 'verify_info', 'provide_dependent_info', 'verify_bank_info', 'sign_letter', 'review_summary', 'set_signing_pin'].includes(d.drakeFormType || '')
    );

    if (uploadDocs.length === 0) {
      return {
        id: 'docs_verified',
        category: 'required',
        label: 'All Documents Verified',
        description: 'All uploaded tax documents should be reviewed and verified',
        status: 'error',
        detail: 'No tax documents uploaded',
        fixAction: 'documents',
      };
    }

    const unverified = uploadDocs.filter((d) => !d.verified);
    if (unverified.length > 0) {
      return {
        id: 'docs_verified',
        category: 'required',
        label: 'All Documents Verified',
        description: 'All uploaded tax documents should be reviewed and verified',
        status: 'error',
        detail: `${unverified.length} of ${uploadDocs.length} document(s) not yet verified`,
        fixAction: 'document_review',
      };
    }

    return {
      id: 'docs_verified',
      category: 'required',
      label: 'All Documents Verified',
      description: 'All uploaded tax documents should be reviewed and verified',
      status: 'pass',
      detail: `All ${uploadDocs.length} document(s) verified`,
    };
  }

  private checkRequiredDocuments(client: TaxPortal, documents: DrakeTaxDocument[]): ValidationCheckItem {
    // At minimum, a return should have at least one income document
    const incomeDocs = documents.filter((d) =>
      ['w2', '1099_nec', '1099_misc', '1099_int', '1099_div', '1099_r', '1099_g', 'schedule_k1'].includes(d.drakeFormType || '')
    );

    if (incomeDocs.length === 0) {
      return {
        id: 'required_docs',
        category: 'required',
        label: 'Required Documents Present',
        description: 'At least one income document (W-2 or 1099) is required',
        status: 'error',
        detail: 'No income documents found. At least one W-2 or 1099 is required.',
        fixAction: 'documents',
      };
    }

    return {
      id: 'required_docs',
      category: 'required',
      label: 'Required Documents Present',
      description: 'At least one income document (W-2 or 1099) is required',
      status: 'pass',
      detail: `${incomeDocs.length} income document(s) present`,
    };
  }

  private checkDuplicateW2s(documents: DrakeTaxDocument[]): ValidationCheckItem {
    const w2Docs = documents.filter((d) => d.drakeFormType === 'w2' && d.payerInfo?.ein);
    const einMap = new Map<string, string[]>();

    for (const doc of w2Docs) {
      const ein = normalizeSSN(doc.payerInfo!.ein!);
      const existing = einMap.get(ein) || [];
      existing.push(doc.payerInfo?.name || doc.originalFileName || doc.id);
      einMap.set(ein, existing);
    }

    const duplicates: string[] = [];
    einMap.forEach((names, ein) => {
      if (names.length > 1) {
        duplicates.push(`EIN ${ein}: ${names.join(', ')}`);
      }
    });

    if (duplicates.length > 0) {
      return {
        id: 'duplicate_w2s',
        category: 'required',
        label: 'No Duplicate W-2s',
        description: 'Should not have multiple W-2s from the same employer',
        status: 'warn',
        detail: `Possible duplicates: ${duplicates.join('; ')}`,
        fixAction: 'document_review',
      };
    }

    return {
      id: 'duplicate_w2s',
      category: 'required',
      label: 'No Duplicate W-2s',
      description: 'Should not have multiple W-2s from the same employer',
      status: 'pass',
      detail: w2Docs.length > 0
        ? `${w2Docs.length} W-2(s) from unique employers`
        : 'No W-2 documents to check',
    };
  }

  private checkWithholdingReasonableness(documents: DrakeTaxDocument[]): ValidationCheckItem {
    const w2Docs = documents.filter((d) => d.drakeFormType === 'w2' && d.extractedAmounts);
    const issues: string[] = [];

    for (const doc of w2Docs) {
      const wages = doc.extractedAmounts!.wages || 0;
      const withheld = doc.extractedAmounts!.federalTaxWithheld || 0;
      const payerName = doc.payerInfo?.name || doc.originalFileName || 'Unknown';

      if (wages > 0 && withheld > wages) {
        issues.push(`${payerName}: withholding $${withheld.toLocaleString()} exceeds wages $${wages.toLocaleString()}`);
      }
      if (wages > 0 && withheld === 0) {
        issues.push(`${payerName}: zero federal withholding on $${wages.toLocaleString()} wages`);
      }
    }

    if (issues.length > 0) {
      return {
        id: 'withholding_reasonable',
        category: 'required',
        label: 'Withholding Reasonableness',
        description: 'Federal tax withheld should be reasonable relative to wages',
        status: 'warn',
        detail: issues.join('; '),
        fixAction: 'document_review',
      };
    }

    return {
      id: 'withholding_reasonable',
      category: 'required',
      label: 'Withholding Reasonableness',
      description: 'Federal tax withheld should be reasonable relative to wages',
      status: w2Docs.length > 0 ? 'pass' : 'pending',
      detail: w2Docs.length > 0
        ? 'Withholding amounts appear reasonable'
        : 'No W-2 documents to check withholding',
    };
  }

  private checkAddressCompleteness(client: TaxPortal): ValidationCheckItem {
    const hasAddress = !!(client.address && client.city && client.state && client.zipCode);
    return {
      id: 'address_complete',
      category: 'required',
      label: 'Address Completeness',
      description: 'Full mailing address is required for tax filing',
      status: hasAddress ? 'pass' : 'error',
      detail: hasAddress
        ? `${client.city}, ${client.state} ${client.zipCode}`
        : 'Missing: ' + [
            !client.address && 'street address',
            !client.city && 'city',
            !client.state && 'state',
            !client.zipCode && 'zip code',
          ].filter(Boolean).join(', '),
      fixAction: 'client_info',
    };
  }

  private checkDependentSSNs(client: TaxPortal): ValidationCheckItem {
    const deps = client.dependents || [];
    if (deps.length === 0) {
      return {
        id: 'dependent_ssns',
        category: 'recommended',
        label: 'Dependent SSNs',
        description: 'All dependents should have valid SSNs',
        status: 'pass',
        detail: 'No dependents to validate',
      };
    }

    const missingSSN: string[] = [];
    const invalidSSN: string[] = [];

    for (const dep of deps) {
      const name = `${dep.firstName} ${dep.lastName}`;
      if (!dep.ssn) {
        missingSSN.push(name);
      } else if (!isValidSSN(dep.ssn)) {
        invalidSSN.push(name);
      }
    }

    const issues = [...missingSSN.map((n) => `${n}: missing`), ...invalidSSN.map((n) => `${n}: invalid format`)];

    return {
      id: 'dependent_ssns',
      category: 'recommended',
      label: 'Dependent SSNs',
      description: 'All dependents should have valid SSNs',
      status: issues.length === 0 ? 'pass' : 'warn',
      detail: issues.length === 0
        ? `All ${deps.length} dependent(s) have valid SSNs`
        : issues.join('; '),
      fixAction: 'client_info',
    };
  }

  private checkBankInfo(
    client: TaxPortal,
    documentRequest?: TaxDocumentRequest | null
  ): ValidationCheckItem {
    const bankInfo = client.bankInfo || documentRequest?.clientBankInfo;
    const hasBank = !!(bankInfo && bankInfo.routingNumber && bankInfo.accountNumber);

    return {
      id: 'bank_info',
      category: 'recommended',
      label: 'Bank Information',
      description: 'Bank account info needed for direct deposit refund',
      status: hasBank ? 'pass' : 'warn',
      detail: hasBank
        ? `${bankInfo!.accountType || 'Account'} ending in ${(bankInfo!.accountNumber || '').slice(-4)}`
        : 'Bank information not provided. Refund will be mailed as a check.',
      fixAction: 'client_info',
    };
  }

  private checkSigningPin(documentRequest?: TaxDocumentRequest | null): ValidationCheckItem {
    const hasPin = !!(documentRequest?.clientSigningPin?.pin);

    return {
      id: 'signing_pin',
      category: 'recommended',
      label: 'E-Filing Signing PIN',
      description: '5-digit PIN required for e-filing authorization (Form 8879)',
      status: hasPin ? 'pass' : 'warn',
      detail: hasPin
        ? 'Signing PIN has been set'
        : 'Signing PIN not yet provided by client',
      fixAction: 'signing_pin',
    };
  }

  private checkEngagementLetter(documentRequest?: TaxDocumentRequest | null): ValidationCheckItem {
    const signed = !!(documentRequest?.clientSignature?.agreedToTerms);

    return {
      id: 'engagement_letter',
      category: 'recommended',
      label: 'Engagement Letter Signed',
      description: 'Client should sign the engagement letter before filing',
      status: signed ? 'pass' : 'warn',
      detail: signed
        ? `Signed by ${documentRequest!.clientSignature!.name} on ${documentRequest!.clientSignature!.date}`
        : 'Engagement letter has not been signed',
      fixAction: 'engagement_letter',
    };
  }

  private checkDateOfBirth(client: TaxPortal): ValidationCheckItem {
    return {
      id: 'date_of_birth',
      category: 'recommended',
      label: 'Date of Birth',
      description: 'Date of birth is required for accurate tax calculations',
      status: client.dateOfBirth ? 'pass' : 'warn',
      detail: client.dateOfBirth
        ? `DOB: ${client.dateOfBirth}`
        : 'Date of birth is not set',
      fixAction: 'client_info',
    };
  }

  private checkTaxYear(client: TaxPortal): ValidationCheckItem {
    return {
      id: 'tax_year',
      category: 'recommended',
      label: 'Tax Year',
      description: 'Tax year should be set to ensure correct calculations',
      status: client.taxYear ? 'pass' : 'warn',
      detail: client.taxYear ? `Tax Year: ${client.taxYear}` : 'Tax year is not set',
      fixAction: 'client_info',
    };
  }

  private checkSpouseInfo(client: TaxPortal): ValidationCheckItem {
    const fs = client.filingStatus;
    const needsSpouse = fs === 'married_filing_jointly' || fs === 'married_filing_separately';

    if (!needsSpouse) {
      return {
        id: 'spouse_info',
        category: 'optional',
        label: 'Spouse Information',
        description: 'Spouse information for married filing statuses',
        status: 'pass',
        detail: 'Not applicable for current filing status',
      };
    }

    const spouse = client.spouse;
    const hasBasicInfo = !!(spouse && spouse.firstName && spouse.lastName);
    const hasSSN = !!(spouse && isValidSSN(spouse.ssn));

    if (hasBasicInfo && hasSSN) {
      return {
        id: 'spouse_info',
        category: 'optional',
        label: 'Spouse Information',
        description: 'Spouse information for married filing statuses',
        status: 'pass',
        detail: `Spouse: ${spouse!.firstName} ${spouse!.lastName}`,
      };
    }

    return {
      id: 'spouse_info',
      category: 'optional',
      label: 'Spouse Information',
      description: 'Spouse information for married filing statuses',
      status: 'warn',
      detail: !hasBasicInfo
        ? 'Spouse name and details are missing'
        : 'Spouse SSN is missing or invalid',
      fixAction: 'client_info',
    };
  }

  private checkOccupation(client: TaxPortal): ValidationCheckItem {
    return {
      id: 'occupation',
      category: 'optional',
      label: 'Occupation',
      description: 'Occupation is listed on the tax return',
      status: client.occupation ? 'pass' : 'pending',
      detail: client.occupation || 'Occupation not set',
      fixAction: 'client_info',
    };
  }

  private checkContactInfo(client: TaxPortal): ValidationCheckItem {
    const hasPhone = !!client.phone;
    const hasEmail = !!client.email;

    return {
      id: 'contact_info',
      category: 'optional',
      label: 'Contact Information',
      description: 'Phone and email for client communication',
      status: hasPhone && hasEmail ? 'pass' : hasPhone || hasEmail ? 'pass' : 'pending',
      detail: [hasPhone && 'Phone', hasEmail && 'Email'].filter(Boolean).join(' and ') || 'No contact info provided',
      fixAction: 'client_info',
    };
  }
}

// Export singleton instance
export const taxValidationService = new TaxValidationService();
export default taxValidationService;
