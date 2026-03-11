/**
 * Drake Export Enhanced Service
 * Extended Drake export with XML generation, batch export, full field mapping,
 * validation, and export history tracking.
 */

import type {
  TaxPortal,
  DrakeTaxDocument,
  DrakeExportConfig,
  DrakeExportResult,
  DrakeTaxDocumentType,
  ExtractedTaxAmounts,
  FilingStatus,
  TaxYear,
  TaxDependent,
  ExportValidation,
} from '../types/drakeTypes';

import {
  FORM_DEFINITIONS,
  DRAKE_CSV_HEADERS,
  formatDrakeAmount,
  formatDrakeSSN,
  formatDrakeEIN,
  getPopulatedBoxes,
  type TaxFormBoxDefinition,
} from '../components/data/drakeFieldMappings';

import { devLog } from '../../../services/utils';

/** Safely get payer address as a string (handles object or string) */
function getPayerAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') return addr.street || addr.address || '';
  return String(addr);
}

// ============================================
// Enhanced Types
// ============================================

/** Export format options */
export type EnhancedExportFormat = 'csv' | 'xml' | 'both';

/** Enhanced export configuration extending base config */
export interface EnhancedExportConfig {
  taxYear: TaxYear;
  clientId: string;
  outputFormat: EnhancedExportFormat;
  includeHeaders: boolean;
  includeUnverifiedDocuments: boolean;
  includeStateReturns: boolean;
}

/** Batch export configuration */
export interface BatchExportConfig {
  clientIds: string[];
  taxYear: TaxYear;
  outputFormat: EnhancedExportFormat;
  includeHeaders: boolean;
  includeUnverifiedDocuments: boolean;
  includeStateReturns: boolean;
}

/** Single client export result within a batch */
export interface BatchExportClientResult {
  clientId: string;
  clientName: string;
  success: boolean;
  csvData?: string;
  xmlData?: string;
  fileName?: string;
  recordCount: number;
  totalIncome: number;
  totalWithholding: number;
  errors: string[];
  warnings: string[];
}

/** Batch export result */
export interface BatchExportResult {
  success: boolean;
  totalClients: number;
  completedClients: number;
  failedClients: number;
  clientResults: BatchExportClientResult[];
  zipBlob?: Blob;
  zipFileName?: string;
  exportedAt: number;
}

/** Batch export progress */
export interface BatchExportProgress {
  current: number;
  total: number;
  currentClientName: string;
  status: 'idle' | 'validating' | 'exporting' | 'packaging' | 'complete' | 'error';
  message: string;
}

/** Client validation result */
export interface ClientValidationResult {
  clientId: string;
  clientName: string;
  status: 'pass' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  documentCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  totalIncome: number;
  totalWithholding: number;
}

/** Batch validation result */
export interface BatchValidationResult {
  totalClients: number;
  passCount: number;
  warningCount: number;
  errorCount: number;
  clientResults: ClientValidationResult[];
}

/** Export history entry */
export interface ExportHistoryEntry {
  id: string;
  clientId: string;
  clientName: string;
  taxYear: TaxYear;
  format: EnhancedExportFormat;
  recordCount: number;
  totalIncome: number;
  totalWithholding: number;
  fileName: string;
  exportedAt: number;
  exportedBy?: string;
  isBatch: boolean;
  batchSize?: number;
}

// ============================================
// Enhanced W-2 Field Mapping (Boxes 1-20, Box 12 codes, Box 14)
// ============================================

/** W-2 Box 12 code descriptions */
export const W2_BOX_12_CODES: Record<string, string> = {
  'A': 'Uncollected social security or RRTA tax on tips',
  'B': 'Uncollected Medicare tax on tips',
  'C': 'Taxable cost of group-term life insurance over $50,000',
  'D': 'Elective deferrals under a section 401(k) cash or deferred arrangement',
  'E': 'Elective deferrals under a section 403(b) salary reduction agreement',
  'F': 'Elective deferrals under a section 408(k)(6) salary reduction SEP',
  'G': 'Elective deferrals and employer contributions to section 457(b)',
  'H': 'Elective deferrals under section 501(c)(18)(D)',
  'J': 'Nontaxable sick pay',
  'K': 'Tax on excess golden parachute payments (20%)',
  'L': 'Substantiated employee business expense reimbursements',
  'M': 'Uncollected social security or RRTA tax on taxable cost of group-term life insurance over $50,000 (former employees only)',
  'N': 'Uncollected Medicare tax on taxable cost of group-term life insurance over $50,000 (former employees only)',
  'P': 'Excludable moving expense reimbursements paid directly to a member of the Armed Forces',
  'Q': 'Nontaxable combat pay',
  'R': 'Employer contributions to your Archer MSA',
  'S': 'Employee salary reduction contributions under a section 408(p) SIMPLE plan',
  'T': 'Adoption benefits',
  'V': 'Income from exercise of nonstatutory stock options',
  'W': 'Employer contributions to your health savings account (HSA)',
  'Y': 'Deferrals under a section 409A nonqualified deferred compensation plan',
  'Z': 'Income under a nonqualified deferred compensation plan that fails to satisfy section 409A',
  'AA': 'Designated Roth contributions under a section 401(k) plan',
  'BB': 'Designated Roth contributions under a section 403(b) plan',
  'CC': 'HIRE exempt wages and tips',
  'DD': 'Cost of employer-sponsored health coverage',
  'EE': 'Designated Roth contributions under a governmental section 457(b) plan',
  'FF': 'Permitted benefits under a qualified small employer health reimbursement arrangement',
  'GG': 'Income from qualified equity grants under section 83(i)',
  'HH': 'Aggregate deferrals under section 83(i) elections as of the close of the calendar year',
};

// ============================================
// Enhanced Form Field Definitions for 1099-R, 1099-G, 1099-K, 1095-A
// ============================================

/** 1099-R Retirement Distribution field map */
export const FORM_1099_R_FIELDS: Record<string, keyof ExtractedTaxAmounts> = {
  'Box 1 - Gross distribution': 'totalAmount',
  'Box 2a - Taxable amount': 'otherIncome',
  'Box 4 - Federal income tax withheld': 'federalTaxWithheld1099',
  'Box 12 - State tax withheld': 'stateTaxWithheld',
};

/** 1099-G Government Payments field map */
export const FORM_1099_G_FIELDS: Record<string, keyof ExtractedTaxAmounts> = {
  'Box 1 - Unemployment compensation': 'unemploymentCompensation',
  'Box 2 - State or local income tax refunds': 'stateTaxRefund',
  'Box 4 - Federal income tax withheld': 'federalTaxWithheld1099G',
  'Box 5 - RTAA payments': 'rtaaPayment',
  'Box 6 - Taxable grants': 'taxableGrants',
  'Box 7 - Agriculture payments': 'agriculturePayments',
  'Box 9 - Market gain': 'marketGain',
  'Box 11 - State income tax withheld': 'stateTaxWithheld1099G',
};

/** 1099-K Payment Card field map */
export const FORM_1099_K_FIELDS: Record<string, keyof ExtractedTaxAmounts> = {
  'Box 1a - Gross amount': 'grossAmount1099K',
  'Box 1b - Card not present transactions': 'cardNotPresentTransactions',
  'Box 4 - Federal income tax withheld': 'federalTaxWithheld1099K',
  'Box 8 - State income tax withheld': 'stateTaxWithheld1099K',
};

/** 1095-A Health Insurance Marketplace field map */
export const FORM_1095_A_FIELDS: Record<string, keyof ExtractedTaxAmounts> = {
  'Col A - Annual enrollment premium': 'annualPremiumAmount',
  'Col B - Annual SLCSP premium': 'annualSlcspPremium',
  'Col C - Annual advance PTC': 'annualAdvancePtc',
};

// ============================================
// XML Generation
// ============================================

/** Escape special XML characters */
function escapeXml(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format amount for XML (2 decimal places) */
function formatXmlAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '0.00';
  return amount.toFixed(2);
}

/** Mask SSN for XML (shows last 4) */
function maskSsnForDisplay(ssn: string | undefined): string {
  if (!ssn) return 'XXX-XX-XXXX';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `XXX-XX-${cleaned.slice(5)}`;
  }
  return 'XXX-XX-XXXX';
}

/** Format filing status for XML output */
function formatFilingStatusXml(status: FilingStatus | undefined): string {
  if (!status) return 'single';
  return status;
}

/** Generate XML for a single W-2 document */
function generateW2Xml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <W2 seq="${seq}">`);
  lines.push(`      <EmployerName>${escapeXml(payer?.name)}</EmployerName>`);
  lines.push(`      <EmployerEIN>${escapeXml(payer?.ein)}</EmployerEIN>`);
  if (payer?.address) lines.push(`      <EmployerAddress>${escapeXml(getPayerAddress(payer.address))}</EmployerAddress>`);
  if (payer?.city) lines.push(`      <EmployerCity>${escapeXml(payer.city)}</EmployerCity>`);
  if (payer?.state) lines.push(`      <EmployerState>${escapeXml(payer.state)}</EmployerState>`);
  if (payer?.zip) lines.push(`      <EmployerZip>${escapeXml(payer.zip)}</EmployerZip>`);

  // Box 1-8
  lines.push(`      <Wages>${formatXmlAmount(amounts.wages)}</Wages>`);
  lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld)}</FederalWithholding>`);
  lines.push(`      <SocialSecurityWages>${formatXmlAmount(amounts.socialSecurityWages)}</SocialSecurityWages>`);
  lines.push(`      <SocialSecurityTax>${formatXmlAmount(amounts.socialSecurityTax)}</SocialSecurityTax>`);
  lines.push(`      <MedicareWages>${formatXmlAmount(amounts.medicareWages)}</MedicareWages>`);
  lines.push(`      <MedicareTax>${formatXmlAmount(amounts.medicareTax)}</MedicareTax>`);
  if (amounts.socialSecurityTips) lines.push(`      <SocialSecurityTips>${formatXmlAmount(amounts.socialSecurityTips)}</SocialSecurityTips>`);
  if (amounts.allocatedTips) lines.push(`      <AllocatedTips>${formatXmlAmount(amounts.allocatedTips)}</AllocatedTips>`);

  // Box 10-11
  if (amounts.dependentCareBenefits) lines.push(`      <DependentCareBenefits>${formatXmlAmount(amounts.dependentCareBenefits)}</DependentCareBenefits>`);
  if (amounts.nonqualifiedPlans) lines.push(`      <NonqualifiedPlans>${formatXmlAmount(amounts.nonqualifiedPlans)}</NonqualifiedPlans>`);

  // Box 12 codes
  if (amounts.box12Codes && amounts.box12Codes.length > 0) {
    lines.push(`      <Box12>`);
    for (const entry of amounts.box12Codes) {
      lines.push(`        <Code letter="${escapeXml(entry.code)}" description="${escapeXml(W2_BOX_12_CODES[entry.code] || '')}">${formatXmlAmount(entry.amount)}</Code>`);
    }
    lines.push(`      </Box12>`);
  }

  // Box 14 other items
  if (amounts.box14Items && amounts.box14Items.length > 0) {
    lines.push(`      <Box14>`);
    for (const item of amounts.box14Items) {
      lines.push(`        <Item description="${escapeXml(item.description)}">${formatXmlAmount(item.amount)}</Item>`);
    }
    lines.push(`      </Box14>`);
  }

  // Box 16-19 state/local
  if (amounts.stateWages) lines.push(`      <StateWages>${formatXmlAmount(amounts.stateWages)}</StateWages>`);
  if (amounts.stateTaxWithheld) lines.push(`      <StateWithholding>${formatXmlAmount(amounts.stateTaxWithheld)}</StateWithholding>`);
  if (amounts.localWages) lines.push(`      <LocalWages>${formatXmlAmount(amounts.localWages)}</LocalWages>`);
  if (amounts.localTaxWithheld) lines.push(`      <LocalWithholding>${formatXmlAmount(amounts.localTaxWithheld)}</LocalWithholding>`);

  lines.push(`    </W2>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-NEC document */
function generate1099NECXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099NEC seq="${seq}">`);
  lines.push(`      <PayerName>${escapeXml(payer?.name)}</PayerName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  if (payer?.address) lines.push(`      <PayerAddress>${escapeXml(getPayerAddress(payer.address))}</PayerAddress>`);
  lines.push(`      <NonEmployeeComp>${formatXmlAmount(amounts.nonEmployeeCompensation)}</NonEmployeeComp>`);
  if (amounts.federalTaxWithheld1099) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099)}</FederalWithholding>`);
  lines.push(`    </Form1099NEC>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-MISC document */
function generate1099MISCXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099MISC seq="${seq}">`);
  lines.push(`      <PayerName>${escapeXml(payer?.name)}</PayerName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  if (amounts.rents) lines.push(`      <Rents>${formatXmlAmount(amounts.rents)}</Rents>`);
  if (amounts.royalties) lines.push(`      <Royalties>${formatXmlAmount(amounts.royalties)}</Royalties>`);
  if (amounts.otherIncome) lines.push(`      <OtherIncome>${formatXmlAmount(amounts.otherIncome)}</OtherIncome>`);
  if (amounts.federalTaxWithheld1099) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099)}</FederalWithholding>`);
  if (amounts.fishingBoatProceeds) lines.push(`      <FishingBoatProceeds>${formatXmlAmount(amounts.fishingBoatProceeds)}</FishingBoatProceeds>`);
  if (amounts.medicalPayments) lines.push(`      <MedicalPayments>${formatXmlAmount(amounts.medicalPayments)}</MedicalPayments>`);
  if (amounts.cropInsurance) lines.push(`      <CropInsurance>${formatXmlAmount(amounts.cropInsurance)}</CropInsurance>`);
  if (amounts.grossProceeds) lines.push(`      <GrossProceeds>${formatXmlAmount(amounts.grossProceeds)}</GrossProceeds>`);
  lines.push(`    </Form1099MISC>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-INT document */
function generate1099INTXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099INT seq="${seq}">`);
  lines.push(`      <PayerName>${escapeXml(payer?.name)}</PayerName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  lines.push(`      <InterestIncome>${formatXmlAmount(amounts.interestIncome)}</InterestIncome>`);
  if (amounts.earlyWithdrawalPenalty) lines.push(`      <EarlyWithdrawalPenalty>${formatXmlAmount(amounts.earlyWithdrawalPenalty)}</EarlyWithdrawalPenalty>`);
  if (amounts.usSavingsBondInterest) lines.push(`      <USSavingsBondInterest>${formatXmlAmount(amounts.usSavingsBondInterest)}</USSavingsBondInterest>`);
  if (amounts.federalTaxWithheld1099) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099)}</FederalWithholding>`);
  if (amounts.taxExemptInterest) lines.push(`      <TaxExemptInterest>${formatXmlAmount(amounts.taxExemptInterest)}</TaxExemptInterest>`);
  if (amounts.privateBondInterest) lines.push(`      <PrivateActivityBondInterest>${formatXmlAmount(amounts.privateBondInterest)}</PrivateActivityBondInterest>`);
  lines.push(`    </Form1099INT>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-DIV document */
function generate1099DIVXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099DIV seq="${seq}">`);
  lines.push(`      <PayerName>${escapeXml(payer?.name)}</PayerName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  lines.push(`      <OrdinaryDividends>${formatXmlAmount(amounts.ordinaryDividends)}</OrdinaryDividends>`);
  if (amounts.qualifiedDividends) lines.push(`      <QualifiedDividends>${formatXmlAmount(amounts.qualifiedDividends)}</QualifiedDividends>`);
  if (amounts.capitalGainDistributions) lines.push(`      <CapitalGainDistributions>${formatXmlAmount(amounts.capitalGainDistributions)}</CapitalGainDistributions>`);
  if (amounts.unrecaptured1250Gain) lines.push(`      <UnrecapturedSec1250Gain>${formatXmlAmount(amounts.unrecaptured1250Gain)}</UnrecapturedSec1250Gain>`);
  if (amounts.section1202Gain) lines.push(`      <Section1202Gain>${formatXmlAmount(amounts.section1202Gain)}</Section1202Gain>`);
  if (amounts.collectiblesGain) lines.push(`      <CollectiblesGain>${formatXmlAmount(amounts.collectiblesGain)}</CollectiblesGain>`);
  if (amounts.nondividendDistributions) lines.push(`      <NondividendDistributions>${formatXmlAmount(amounts.nondividendDistributions)}</NondividendDistributions>`);
  if (amounts.federalTaxWithheld1099) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099)}</FederalWithholding>`);
  if (amounts.section199ADividends) lines.push(`      <Section199ADividends>${formatXmlAmount(amounts.section199ADividends)}</Section199ADividends>`);
  if (amounts.investmentExpenses) lines.push(`      <InvestmentExpenses>${formatXmlAmount(amounts.investmentExpenses)}</InvestmentExpenses>`);
  if (amounts.foreignTaxPaid) lines.push(`      <ForeignTaxPaid>${formatXmlAmount(amounts.foreignTaxPaid)}</ForeignTaxPaid>`);
  if (amounts.exemptInterestDividends) lines.push(`      <ExemptInterestDividends>${formatXmlAmount(amounts.exemptInterestDividends)}</ExemptInterestDividends>`);
  lines.push(`    </Form1099DIV>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-R document */
function generate1099RXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099R seq="${seq}">`);
  lines.push(`      <PayerName>${escapeXml(payer?.name)}</PayerName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  lines.push(`      <GrossDistribution>${formatXmlAmount(amounts.totalAmount)}</GrossDistribution>`);
  if (amounts.otherIncome) lines.push(`      <TaxableAmount>${formatXmlAmount(amounts.otherIncome)}</TaxableAmount>`);
  if (amounts.federalTaxWithheld1099) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099)}</FederalWithholding>`);
  if (amounts.stateTaxWithheld) lines.push(`      <StateWithholding>${formatXmlAmount(amounts.stateTaxWithheld)}</StateWithholding>`);
  lines.push(`    </Form1099R>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-G document */
function generate1099GXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099G seq="${seq}">`);
  lines.push(`      <PayerName>${escapeXml(payer?.name)}</PayerName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  if (amounts.unemploymentCompensation) lines.push(`      <UnemploymentCompensation>${formatXmlAmount(amounts.unemploymentCompensation)}</UnemploymentCompensation>`);
  if (amounts.stateTaxRefund) lines.push(`      <StateTaxRefund>${formatXmlAmount(amounts.stateTaxRefund)}</StateTaxRefund>`);
  if (amounts.federalTaxWithheld1099G) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099G)}</FederalWithholding>`);
  if (amounts.rtaaPayment) lines.push(`      <RTAAPayments>${formatXmlAmount(amounts.rtaaPayment)}</RTAAPayments>`);
  if (amounts.taxableGrants) lines.push(`      <TaxableGrants>${formatXmlAmount(amounts.taxableGrants)}</TaxableGrants>`);
  if (amounts.agriculturePayments) lines.push(`      <AgriculturePayments>${formatXmlAmount(amounts.agriculturePayments)}</AgriculturePayments>`);
  if (amounts.marketGain) lines.push(`      <MarketGain>${formatXmlAmount(amounts.marketGain)}</MarketGain>`);
  if (amounts.stateTaxWithheld1099G) lines.push(`      <StateWithholding>${formatXmlAmount(amounts.stateTaxWithheld1099G)}</StateWithholding>`);
  lines.push(`    </Form1099G>`);
  return lines.join('\n');
}

/** Generate XML for a 1099-K document */
function generate1099KXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1099K seq="${seq}">`);
  if (amounts.pseName || payer?.name) lines.push(`      <PSEName>${escapeXml(amounts.pseName || payer?.name)}</PSEName>`);
  if (payer?.ein) lines.push(`      <PayerEIN>${escapeXml(payer.ein)}</PayerEIN>`);
  lines.push(`      <GrossAmount>${formatXmlAmount(amounts.grossAmount1099K)}</GrossAmount>`);
  if (amounts.cardNotPresentTransactions) lines.push(`      <CardNotPresent>${formatXmlAmount(amounts.cardNotPresentTransactions)}</CardNotPresent>`);
  if (amounts.merchantCategoryCode) lines.push(`      <MerchantCategoryCode>${escapeXml(amounts.merchantCategoryCode)}</MerchantCategoryCode>`);
  if (amounts.numberOfTransactions) lines.push(`      <NumberOfTransactions>${amounts.numberOfTransactions}</NumberOfTransactions>`);
  if (amounts.federalTaxWithheld1099K) lines.push(`      <FederalWithholding>${formatXmlAmount(amounts.federalTaxWithheld1099K)}</FederalWithholding>`);
  if (amounts.monthlyGrossAmounts) {
    const months = amounts.monthlyGrossAmounts;
    lines.push(`      <MonthlyAmounts>`);
    if (months.january) lines.push(`        <January>${formatXmlAmount(months.january)}</January>`);
    if (months.february) lines.push(`        <February>${formatXmlAmount(months.february)}</February>`);
    if (months.march) lines.push(`        <March>${formatXmlAmount(months.march)}</March>`);
    if (months.april) lines.push(`        <April>${formatXmlAmount(months.april)}</April>`);
    if (months.may) lines.push(`        <May>${formatXmlAmount(months.may)}</May>`);
    if (months.june) lines.push(`        <June>${formatXmlAmount(months.june)}</June>`);
    if (months.july) lines.push(`        <July>${formatXmlAmount(months.july)}</July>`);
    if (months.august) lines.push(`        <August>${formatXmlAmount(months.august)}</August>`);
    if (months.september) lines.push(`        <September>${formatXmlAmount(months.september)}</September>`);
    if (months.october) lines.push(`        <October>${formatXmlAmount(months.october)}</October>`);
    if (months.november) lines.push(`        <November>${formatXmlAmount(months.november)}</November>`);
    if (months.december) lines.push(`        <December>${formatXmlAmount(months.december)}</December>`);
    lines.push(`      </MonthlyAmounts>`);
  }
  if (amounts.stateTaxWithheld1099K) lines.push(`      <StateWithholding>${formatXmlAmount(amounts.stateTaxWithheld1099K)}</StateWithholding>`);
  lines.push(`    </Form1099K>`);
  return lines.join('\n');
}

/** Generate XML for a 1098 mortgage document */
function generate1098Xml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1098 seq="${seq}">`);
  lines.push(`      <LenderName>${escapeXml(payer?.name)}</LenderName>`);
  if (payer?.ein) lines.push(`      <LenderEIN>${escapeXml(payer.ein)}</LenderEIN>`);
  lines.push(`      <MortgageInterest>${formatXmlAmount(amounts.mortgageInterest)}</MortgageInterest>`);
  if (amounts.outstandingPrincipal) lines.push(`      <OutstandingPrincipal>${formatXmlAmount(amounts.outstandingPrincipal)}</OutstandingPrincipal>`);
  if (amounts.mortgageOriginationDate) lines.push(`      <OriginationDate>${escapeXml(amounts.mortgageOriginationDate)}</OriginationDate>`);
  if (amounts.refundOfOverpaidInterest) lines.push(`      <RefundOfOverpaidInterest>${formatXmlAmount(amounts.refundOfOverpaidInterest)}</RefundOfOverpaidInterest>`);
  if (amounts.mortgageInsurancePremiums) lines.push(`      <MortgageInsurancePremiums>${formatXmlAmount(amounts.mortgageInsurancePremiums)}</MortgageInsurancePremiums>`);
  if (amounts.pointsPaid) lines.push(`      <PointsPaid>${formatXmlAmount(amounts.pointsPaid)}</PointsPaid>`);
  if (amounts.propertyAddress) lines.push(`      <PropertyAddress>${escapeXml(amounts.propertyAddress)}</PropertyAddress>`);
  if (amounts.propertyTaxes) lines.push(`      <PropertyTaxes>${formatXmlAmount(amounts.propertyTaxes)}</PropertyTaxes>`);
  lines.push(`    </Form1098>`);
  return lines.join('\n');
}

/** Generate XML for a 1098-T tuition document */
function generate1098TXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <Form1098T seq="${seq}">`);
  lines.push(`      <InstitutionName>${escapeXml(payer?.name)}</InstitutionName>`);
  if (payer?.ein) lines.push(`      <InstitutionEIN>${escapeXml(payer.ein)}</InstitutionEIN>`);
  if (amounts.paymentsReceived) lines.push(`      <QualifiedTuitionPaid>${formatXmlAmount(amounts.paymentsReceived)}</QualifiedTuitionPaid>`);
  if (amounts.adjustmentsPriorYear) lines.push(`      <AdjustmentsPriorYear>${formatXmlAmount(amounts.adjustmentsPriorYear)}</AdjustmentsPriorYear>`);
  if (amounts.scholarshipsGrants) lines.push(`      <ScholarshipsGrants>${formatXmlAmount(amounts.scholarshipsGrants)}</ScholarshipsGrants>`);
  if (amounts.adjustmentsScholarships) lines.push(`      <AdjustmentsScholarships>${formatXmlAmount(amounts.adjustmentsScholarships)}</AdjustmentsScholarships>`);
  if (amounts.halfTimeStudent !== undefined) lines.push(`      <HalfTimeStudent>${amounts.halfTimeStudent ? 'true' : 'false'}</HalfTimeStudent>`);
  if (amounts.graduateStudent !== undefined) lines.push(`      <GraduateStudent>${amounts.graduateStudent ? 'true' : 'false'}</GraduateStudent>`);
  lines.push(`    </Form1098T>`);
  return lines.join('\n');
}

/** Generate XML for a Schedule K-1 document */
function generateK1Xml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const payer = doc.payerInfo;
  const lines: string[] = [];

  lines.push(`    <ScheduleK1 seq="${seq}">`);
  lines.push(`      <PartnershipName>${escapeXml(payer?.name)}</PartnershipName>`);
  if (payer?.ein) lines.push(`      <PartnershipEIN>${escapeXml(payer.ein)}</PartnershipEIN>`);
  if (amounts.ordinaryBusinessIncome) lines.push(`      <OrdinaryBusinessIncome>${formatXmlAmount(amounts.ordinaryBusinessIncome)}</OrdinaryBusinessIncome>`);
  if (amounts.rentalRealEstateIncome) lines.push(`      <RentalRealEstateIncome>${formatXmlAmount(amounts.rentalRealEstateIncome)}</RentalRealEstateIncome>`);
  if (amounts.otherRentalIncome) lines.push(`      <OtherRentalIncome>${formatXmlAmount(amounts.otherRentalIncome)}</OtherRentalIncome>`);
  if (amounts.guaranteedPayments) lines.push(`      <GuaranteedPayments>${formatXmlAmount(amounts.guaranteedPayments)}</GuaranteedPayments>`);
  if (amounts.interestIncomeK1) lines.push(`      <InterestIncome>${formatXmlAmount(amounts.interestIncomeK1)}</InterestIncome>`);
  if (amounts.dividendIncomeK1) lines.push(`      <OrdinaryDividends>${formatXmlAmount(amounts.dividendIncomeK1)}</OrdinaryDividends>`);
  if (amounts.qualifiedDividendsK1) lines.push(`      <QualifiedDividends>${formatXmlAmount(amounts.qualifiedDividendsK1)}</QualifiedDividends>`);
  if (amounts.royaltiesK1) lines.push(`      <Royalties>${formatXmlAmount(amounts.royaltiesK1)}</Royalties>`);
  if (amounts.shortTermCapitalGain) lines.push(`      <ShortTermCapitalGain>${formatXmlAmount(amounts.shortTermCapitalGain)}</ShortTermCapitalGain>`);
  if (amounts.longTermCapitalGain) lines.push(`      <LongTermCapitalGain>${formatXmlAmount(amounts.longTermCapitalGain)}</LongTermCapitalGain>`);
  if (amounts.unrecaptured1250GainK1) lines.push(`      <UnrecapturedSec1250Gain>${formatXmlAmount(amounts.unrecaptured1250GainK1)}</UnrecapturedSec1250Gain>`);
  if (amounts.section1231Gain) lines.push(`      <Section1231Gain>${formatXmlAmount(amounts.section1231Gain)}</Section1231Gain>`);
  if (amounts.section179Deduction) lines.push(`      <Section179Deduction>${formatXmlAmount(amounts.section179Deduction)}</Section179Deduction>`);
  if (amounts.selfEmploymentEarnings) lines.push(`      <SelfEmploymentEarnings>${formatXmlAmount(amounts.selfEmploymentEarnings)}</SelfEmploymentEarnings>`);
  lines.push(`    </ScheduleK1>`);
  return lines.join('\n');
}

/** Generate XML for a 1095-A document */
function generate1095AXml(doc: DrakeTaxDocument, seq: number): string {
  const amounts = doc.extractedAmounts || {};
  const lines: string[] = [];

  lines.push(`    <Form1095A seq="${seq}">`);
  if (amounts.marketplacePolicyNumber) lines.push(`      <PolicyNumber>${escapeXml(amounts.marketplacePolicyNumber)}</PolicyNumber>`);
  if (amounts.marketplaceAssignedId) lines.push(`      <MarketplaceId>${escapeXml(amounts.marketplaceAssignedId)}</MarketplaceId>`);
  lines.push(`      <AnnualPremium>${formatXmlAmount(amounts.annualPremiumAmount)}</AnnualPremium>`);
  if (amounts.annualSlcspPremium) lines.push(`      <AnnualSLCSP>${formatXmlAmount(amounts.annualSlcspPremium)}</AnnualSLCSP>`);
  if (amounts.annualAdvancePtc) lines.push(`      <AnnualAdvancePTC>${formatXmlAmount(amounts.annualAdvancePtc)}</AnnualAdvancePTC>`);
  if (amounts.coverageMonths) lines.push(`      <CoverageMonths>${amounts.coverageMonths}</CoverageMonths>`);
  if (amounts.monthlyPremiums && amounts.monthlyPremiums.length > 0) {
    lines.push(`      <MonthlyPremiums>`);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (let i = 0; i < amounts.monthlyPremiums.length && i < 12; i++) {
      if (amounts.monthlyPremiums[i]) {
        lines.push(`        <${monthNames[i]}>${formatXmlAmount(amounts.monthlyPremiums[i])}</${monthNames[i]}>`);
      }
    }
    lines.push(`      </MonthlyPremiums>`);
  }
  lines.push(`    </Form1095A>`);
  return lines.join('\n');
}

/** Map form type to its XML generator */
const XML_GENERATORS: Partial<Record<DrakeTaxDocumentType, (doc: DrakeTaxDocument, seq: number) => string>> = {
  'w2': generateW2Xml,
  '1099_nec': generate1099NECXml,
  '1099_misc': generate1099MISCXml,
  '1099_int': generate1099INTXml,
  '1099_div': generate1099DIVXml,
  '1099_r': generate1099RXml,
  '1099_g': generate1099GXml,
  '1099_k': generate1099KXml,
  '1098': generate1098Xml,
  '1098_t': generate1098TXml,
  'schedule_k1': generateK1Xml,
  '1095_a': generate1095AXml,
};

/**
 * Generate complete Drake XML export for a single client
 */
export function generateDrakeXml(
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  config: EnhancedExportConfig
): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<DrakeExport version="1.0" generatedAt="${now}">`);

  // Taxpayer section
  lines.push(`  <Taxpayer>`);
  lines.push(`    <SSN>${maskSsnForDisplay(client.ssn)}</SSN>`);
  lines.push(`    <FirstName>${escapeXml(client.firstName)}</FirstName>`);
  if (client.middleName) lines.push(`    <MiddleName>${escapeXml(client.middleName)}</MiddleName>`);
  lines.push(`    <LastName>${escapeXml(client.lastName)}</LastName>`);
  if (client.suffix) lines.push(`    <Suffix>${escapeXml(client.suffix)}</Suffix>`);
  lines.push(`    <FilingStatus>${formatFilingStatusXml(client.filingStatus)}</FilingStatus>`);
  lines.push(`    <TaxYear>${config.taxYear}</TaxYear>`);
  if (client.dateOfBirth) lines.push(`    <DateOfBirth>${escapeXml(client.dateOfBirth)}</DateOfBirth>`);
  if (client.occupation) lines.push(`    <Occupation>${escapeXml(client.occupation)}</Occupation>`);
  if (client.email) lines.push(`    <Email>${escapeXml(client.email)}</Email>`);
  if (client.phone) lines.push(`    <Phone>${escapeXml(client.phone)}</Phone>`);

  // Address
  if (client.address || client.city || client.state || client.zipCode) {
    lines.push(`    <Address>`);
    if (client.address) lines.push(`      <Street>${escapeXml(client.address)}</Street>`);
    if (client.city) lines.push(`      <City>${escapeXml(client.city)}</City>`);
    if (client.state) lines.push(`      <State>${escapeXml(client.state)}</State>`);
    if (client.zipCode) lines.push(`      <ZipCode>${escapeXml(client.zipCode)}</ZipCode>`);
    lines.push(`    </Address>`);
  }

  // ID Information
  if (client.idInfo) {
    lines.push(`    <Identification>`);
    lines.push(`      <IdType>${escapeXml(client.idInfo.idType || 'drivers_license')}</IdType>`);
    lines.push(`      <IdNumber>${escapeXml(client.idInfo.idNumber)}</IdNumber>`);
    lines.push(`      <IssuingState>${escapeXml(client.idInfo.idState)}</IssuingState>`);
    if (client.idInfo.issueDate) lines.push(`      <IssueDate>${escapeXml(client.idInfo.issueDate)}</IssueDate>`);
    if (client.idInfo.expirationDate) lines.push(`      <ExpirationDate>${escapeXml(client.idInfo.expirationDate)}</ExpirationDate>`);
    lines.push(`    </Identification>`);
  }

  lines.push(`  </Taxpayer>`);

  // Spouse section
  if (client.spouse) {
    lines.push(`  <Spouse>`);
    lines.push(`    <FirstName>${escapeXml(client.spouse.firstName)}</FirstName>`);
    lines.push(`    <LastName>${escapeXml(client.spouse.lastName)}</LastName>`);
    if (client.spouse.middleName) lines.push(`    <MiddleName>${escapeXml(client.spouse.middleName)}</MiddleName>`);
    if (client.spouse.ssn) lines.push(`    <SSN>${maskSsnForDisplay(client.spouse.ssn)}</SSN>`);
    if (client.spouse.dateOfBirth) lines.push(`    <DateOfBirth>${escapeXml(client.spouse.dateOfBirth)}</DateOfBirth>`);
    if (client.spouse.occupation) lines.push(`    <Occupation>${escapeXml(client.spouse.occupation)}</Occupation>`);
    lines.push(`  </Spouse>`);
  }

  // Dependents section
  if (client.dependents && client.dependents.length > 0) {
    lines.push(`  <Dependents>`);
    for (const dep of client.dependents) {
      lines.push(`    <Dependent>`);
      lines.push(`      <FirstName>${escapeXml(dep.firstName)}</FirstName>`);
      lines.push(`      <LastName>${escapeXml(dep.lastName)}</LastName>`);
      lines.push(`      <Relationship>${escapeXml(dep.relationship)}</Relationship>`);
      if (dep.ssn) lines.push(`      <SSN>${maskSsnForDisplay(dep.ssn)}</SSN>`);
      if (dep.dateOfBirth) lines.push(`      <DateOfBirth>${escapeXml(dep.dateOfBirth)}</DateOfBirth>`);
      if (dep.isStudent !== undefined) lines.push(`      <IsStudent>${dep.isStudent ? 'true' : 'false'}</IsStudent>`);
      if (dep.isDisabled !== undefined) lines.push(`      <IsDisabled>${dep.isDisabled ? 'true' : 'false'}</IsDisabled>`);
      if (dep.monthsLivedWithYou !== undefined) lines.push(`      <MonthsLivedWithYou>${dep.monthsLivedWithYou}</MonthsLivedWithYou>`);
      lines.push(`    </Dependent>`);
    }
    lines.push(`  </Dependents>`);
  }

  // Income section - group documents by type
  lines.push(`  <Income>`);
  const formSeqCounters: Partial<Record<DrakeTaxDocumentType, number>> = {};

  for (const doc of documents) {
    if (!doc.drakeFormType || !doc.extractedAmounts) continue;

    const generator = XML_GENERATORS[doc.drakeFormType];
    if (generator) {
      const seqKey = doc.drakeFormType;
      formSeqCounters[seqKey] = (formSeqCounters[seqKey] || 0) + 1;
      lines.push(generator(doc, formSeqCounters[seqKey]!));
    }
  }
  lines.push(`  </Income>`);

  // Deductions section
  lines.push(`  <Deductions>`);
  // Determine deduction type from documents - look for itemized deduction indicators
  const has1098 = documents.some(d => d.drakeFormType === '1098');
  const deductionType = has1098 ? 'itemized' : 'standard';
  lines.push(`    <Type>${deductionType}</Type>`);

  if (deductionType === 'standard') {
    // Standard deduction amounts by filing status for 2024/2025
    const standardDeductions2024: Record<string, number> = {
      single: 14600,
      married_filing_jointly: 29200,
      married_filing_separately: 14600,
      head_of_household: 21900,
      qualifying_widow: 29200,
    };
    const standardDeductions2025: Record<string, number> = {
      single: 15000,
      married_filing_jointly: 30000,
      married_filing_separately: 15000,
      head_of_household: 22500,
      qualifying_widow: 30000,
    };
    const deductionTable = config.taxYear >= 2025 ? standardDeductions2025 : standardDeductions2024;
    const amount = deductionTable[client.filingStatus || 'single'] || deductionTable.single;
    lines.push(`    <Amount>${formatXmlAmount(amount)}</Amount>`);
  } else {
    // Itemized: sum mortgage interest, property taxes, etc.
    let itemizedTotal = 0;
    for (const doc of documents) {
      if (doc.drakeFormType === '1098' && doc.extractedAmounts) {
        itemizedTotal += doc.extractedAmounts.mortgageInterest || 0;
        itemizedTotal += doc.extractedAmounts.mortgageInsurancePremiums || 0;
        itemizedTotal += doc.extractedAmounts.pointsPaid || 0;
        // SALT cap $10,000
        const salt = Math.min(doc.extractedAmounts.propertyTaxes || 0, 10000);
        itemizedTotal += salt;
      }
    }
    lines.push(`    <Amount>${formatXmlAmount(itemizedTotal)}</Amount>`);
    lines.push(`    <MortgageInterest>${formatXmlAmount(documents.reduce((sum, d) => sum + (d.drakeFormType === '1098' && d.extractedAmounts?.mortgageInterest || 0), 0))}</MortgageInterest>`);
    const totalPropertyTax = documents.reduce((sum, d) => sum + (d.drakeFormType === '1098' && d.extractedAmounts?.propertyTaxes || 0), 0);
    lines.push(`    <PropertyTaxes>${formatXmlAmount(Math.min(totalPropertyTax, 10000))}</PropertyTaxes>`);
  }
  lines.push(`  </Deductions>`);

  // Credits section - detect potential credits from documents
  lines.push(`  <Credits>`);
  const has1098T = documents.some(d => d.drakeFormType === '1098_t');
  const hasDependents = (client.dependents && client.dependents.length > 0) || false;
  const has1095A = documents.some(d => d.drakeFormType === '1095_a');

  if (has1098T) {
    const tuitionDocs = documents.filter(d => d.drakeFormType === '1098_t');
    const totalTuition = tuitionDocs.reduce((sum, d) => sum + (d.extractedAmounts?.paymentsReceived || 0), 0);
    const totalScholarships = tuitionDocs.reduce((sum, d) => sum + (d.extractedAmounts?.scholarshipsGrants || 0), 0);
    lines.push(`    <EducationCredit>`);
    lines.push(`      <QualifiedExpenses>${formatXmlAmount(totalTuition - totalScholarships)}</QualifiedExpenses>`);
    lines.push(`      <Detected>true</Detected>`);
    lines.push(`    </EducationCredit>`);
  }
  if (hasDependents) {
    const childDependents = (client.dependents || []).filter(d => {
      if (!d.dateOfBirth) return false;
      const birthYear = parseInt(d.dateOfBirth.split('-')[0] || '0');
      const age = config.taxYear - birthYear;
      return age < 17;
    });
    if (childDependents.length > 0) {
      lines.push(`    <ChildTaxCredit>`);
      lines.push(`      <QualifyingChildren>${childDependents.length}</QualifyingChildren>`);
      lines.push(`      <Detected>true</Detected>`);
      lines.push(`    </ChildTaxCredit>`);
    }
  }
  if (has1095A) {
    lines.push(`    <PremiumTaxCredit>`);
    const ptcDocs = documents.filter(d => d.drakeFormType === '1095_a');
    const totalAdvancePtc = ptcDocs.reduce((sum, d) => sum + (d.extractedAmounts?.annualAdvancePtc || 0), 0);
    lines.push(`      <AdvancePTCReceived>${formatXmlAmount(totalAdvancePtc)}</AdvancePTCReceived>`);
    lines.push(`      <Detected>true</Detected>`);
    lines.push(`    </PremiumTaxCredit>`);
  }
  lines.push(`  </Credits>`);

  // Bank info section
  if (client.bankInfo) {
    lines.push(`  <BankInfo>`);
    if (client.bankInfo.bankName) lines.push(`    <BankName>${escapeXml(client.bankInfo.bankName)}</BankName>`);
    lines.push(`    <RoutingNumber>${escapeXml(client.bankInfo.routingNumber)}</RoutingNumber>`);
    lines.push(`    <AccountNumber>${escapeXml(client.bankInfo.accountNumber)}</AccountNumber>`);
    lines.push(`    <AccountType>${escapeXml(client.bankInfo.accountType)}</AccountType>`);
    if (client.bankInfo.accountHolderName) lines.push(`    <AccountHolderName>${escapeXml(client.bankInfo.accountHolderName)}</AccountHolderName>`);
    lines.push(`  </BankInfo>`);
  }

  // State returns section
  if (config.includeStateReturns && client.stateReturns && client.stateReturns.length > 0) {
    lines.push(`  <StateReturns>`);
    for (const sr of client.stateReturns) {
      lines.push(`    <StateReturn>`);
      lines.push(`      <State>${escapeXml(sr.state)}</State>`);
      if (sr.refund !== undefined) lines.push(`      <Refund>${formatXmlAmount(sr.refund)}</Refund>`);
      if (sr.owe !== undefined) lines.push(`      <AmountOwed>${formatXmlAmount(sr.owe)}</AmountOwed>`);
      lines.push(`    </StateReturn>`);
    }
    lines.push(`  </StateReturns>`);
  }

  lines.push(`</DrakeExport>`);
  return lines.join('\n');
}

// ============================================
// Enhanced CSV Export
// ============================================

/** Enhanced CSV headers including all form types */
export const ENHANCED_CSV_HEADERS = [
  ...DRAKE_CSV_HEADERS,
  'EmployerName',
  'EmployerEIN',
  'EmployerAddress',
  'PropertyAddress',
  'InstitutionName',
  'InstitutionEIN',
  'Box12Code',
  'Box14Description',
];

/**
 * Generate enhanced CSV export with full field mapping for all document types.
 * Supports 1099-R, 1099-G, 1099-K, and 1095-A in addition to existing forms.
 */
export function generateEnhancedCsvExport(
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  config: EnhancedExportConfig
): DrakeExportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate client
  if (!client.ssn) {
    return { success: false, recordCount: 0, totalIncome: 0, totalWithholding: 0, errors: ['Client SSN is missing or invalid.'] };
  }
  if (!client.firstName || !client.lastName) {
    return { success: false, recordCount: 0, totalIncome: 0, totalWithholding: 0, errors: ['Client first and last name are required.'] };
  }

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    if (!config.includeUnverifiedDocuments && !doc.verified) return false;
    return true;
  });

  if (filteredDocs.length === 0) {
    return { success: false, recordCount: 0, totalIncome: 0, totalWithholding: 0, errors: ['No documents available for export.'] };
  }

  const formattedSSN = formatDrakeSSN(client.ssn);
  const csvLines: string[] = [];

  if (config.includeHeaders) {
    csvLines.push(DRAKE_CSV_HEADERS.join(','));
  }

  let totalIncome = 0;
  let totalWithholding = 0;
  let recordCount = 0;

  for (const doc of filteredDocs) {
    if (!doc.extractedAmounts || !doc.drakeFormType) {
      if (doc.verified) {
        warnings.push(`Document "${doc.originalFileName}" has no extracted data.`);
      }
      continue;
    }

    const formDef = FORM_DEFINITIONS[doc.drakeFormType];

    // Use standard form definitions if available
    if (formDef) {
      const populatedBoxes = getPopulatedBoxes(doc.drakeFormType, doc.extractedAmounts);
      for (const { box, value } of populatedBoxes) {
        const row = buildCsvRow(formattedSSN, client, formDef.formCode, box.boxNumber, value, box.description, doc);
        csvLines.push(row);
        recordCount++;
        accumulateTotals(formDef.formCode, box.boxNumber, value, (inc, wh) => { totalIncome += inc; totalWithholding += wh; });
      }
    }

    // Handle form types not in standard FORM_DEFINITIONS
    // 1099-R
    if (doc.drakeFormType === '1099_r') {
      const amounts = doc.extractedAmounts;
      const entries: [string, string, number | undefined][] = [
        ['1', 'Gross distribution', amounts.totalAmount],
        ['2a', 'Taxable amount', amounts.otherIncome],
        ['4', 'Federal income tax withheld', amounts.federalTaxWithheld1099],
        ['12', 'State tax withheld', amounts.stateTaxWithheld],
      ];
      for (const [boxNum, desc, val] of entries) {
        if (val && val !== 0) {
          csvLines.push(buildCsvRow(formattedSSN, client, '1099R', boxNum, val, desc, doc));
          recordCount++;
          if (boxNum === '1' || boxNum === '2a') totalIncome += val;
          if (boxNum === '4') totalWithholding += val;
        }
      }
    }

    // 1099-G
    if (doc.drakeFormType === '1099_g') {
      const amounts = doc.extractedAmounts;
      const entries: [string, string, number | undefined][] = [
        ['1', 'Unemployment compensation', amounts.unemploymentCompensation],
        ['2', 'State or local income tax refunds', amounts.stateTaxRefund],
        ['4', 'Federal income tax withheld', amounts.federalTaxWithheld1099G],
        ['5', 'RTAA payments', amounts.rtaaPayment],
        ['6', 'Taxable grants', amounts.taxableGrants],
        ['7', 'Agriculture payments', amounts.agriculturePayments],
        ['9', 'Market gain', amounts.marketGain],
        ['11', 'State income tax withheld', amounts.stateTaxWithheld1099G],
      ];
      for (const [boxNum, desc, val] of entries) {
        if (val && val !== 0) {
          csvLines.push(buildCsvRow(formattedSSN, client, '1099G', boxNum, val, desc, doc));
          recordCount++;
          if (boxNum === '1') totalIncome += val;
          if (boxNum === '4') totalWithholding += val;
        }
      }
    }

    // 1099-K
    if (doc.drakeFormType === '1099_k') {
      const amounts = doc.extractedAmounts;
      const entries: [string, string, number | undefined][] = [
        ['1a', 'Gross amount', amounts.grossAmount1099K],
        ['1b', 'Card not present transactions', amounts.cardNotPresentTransactions],
        ['4', 'Federal income tax withheld', amounts.federalTaxWithheld1099K],
        ['8', 'State income tax withheld', amounts.stateTaxWithheld1099K],
      ];
      for (const [boxNum, desc, val] of entries) {
        if (val && val !== 0) {
          csvLines.push(buildCsvRow(formattedSSN, client, '1099K', boxNum, val, desc, doc));
          recordCount++;
          if (boxNum === '1a') totalIncome += val;
          if (boxNum === '4') totalWithholding += val;
        }
      }
    }

    // 1095-A
    if (doc.drakeFormType === '1095_a') {
      const amounts = doc.extractedAmounts;
      const entries: [string, string, number | undefined][] = [
        ['A', 'Annual enrollment premium', amounts.annualPremiumAmount],
        ['B', 'Annual SLCSP premium', amounts.annualSlcspPremium],
        ['C', 'Annual advance PTC', amounts.annualAdvancePtc],
      ];
      for (const [boxNum, desc, val] of entries) {
        if (val && val !== 0) {
          csvLines.push(buildCsvRow(formattedSSN, client, '1095A', boxNum, val, desc, doc));
          recordCount++;
        }
      }
    }

    // W-2 Box 12 codes (additional rows)
    if (doc.drakeFormType === 'w2' && doc.extractedAmounts.box12Codes) {
      for (const entry of doc.extractedAmounts.box12Codes) {
        if (entry.amount !== 0) {
          const desc = `Box 12 Code ${entry.code}: ${W2_BOX_12_CODES[entry.code] || 'Unknown'}`;
          csvLines.push(buildCsvRow(formattedSSN, client, 'W2', `12${entry.code}`, entry.amount, desc, doc));
          recordCount++;
        }
      }
    }

    // W-2 Box 14 items (additional rows)
    if (doc.drakeFormType === 'w2' && doc.extractedAmounts.box14Items) {
      for (const item of doc.extractedAmounts.box14Items) {
        if (item.amount !== 0) {
          csvLines.push(buildCsvRow(formattedSSN, client, 'W2', '14', item.amount, `Box 14: ${item.description}`, doc));
          recordCount++;
        }
      }
    }
  }

  if (recordCount === 0) {
    return { success: false, recordCount: 0, totalIncome: 0, totalWithholding: 0, errors: ['No records generated. Verify documents have extracted amounts.'] };
  }

  const csvData = csvLines.join('\n');
  const clientName = `${client.lastName}_${client.firstName}`.replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Drake_${clientName}_${config.taxYear}_${timestamp}.csv`;

  return {
    success: true,
    csvData,
    fileName,
    recordCount,
    totalIncome,
    totalWithholding,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    exportedAt: Date.now(),
  };
}

/** Build a single CSV row */
function buildCsvRow(
  ssn: string,
  client: TaxPortal,
  formCode: string,
  boxNumber: string,
  amount: number,
  description: string,
  doc: DrakeTaxDocument
): string {
  const values = [
    escCsv(ssn),
    escCsv(client.firstName),
    escCsv(client.middleName?.charAt(0)),
    escCsv(client.lastName),
    escCsv(client.suffix),
    escCsv(String(doc.taxYear || '')),
    escCsv(formCode),
    escCsv(boxNumber),
    escCsv(formatDrakeAmount(amount)),
    escCsv(description),
    escCsv(doc.payerInfo?.name),
    escCsv(doc.payerInfo?.ein ? formatDrakeEIN(doc.payerInfo.ein) : ''),
    escCsv(doc.payerInfo?.address ? [getPayerAddress(doc.payerInfo.address), doc.payerInfo.city, doc.payerInfo.state, doc.payerInfo.zip].filter(Boolean).join(', ') : ''),
    escCsv(doc.payerInfo?.state),
    escCsv(''),
  ];
  return values.join(',');
}

/** Escape CSV value */
function escCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Accumulate income/withholding totals */
function accumulateTotals(
  formCode: string,
  boxNumber: string,
  value: number,
  add: (income: number, withholding: number) => void
): void {
  // Income boxes
  if (
    (formCode === 'W2' && boxNumber === '1') ||
    (formCode === '1099NEC' && boxNumber === '1') ||
    (formCode === '1099MISC' && ['1', '2', '3'].includes(boxNumber)) ||
    (formCode === '1099INT' && boxNumber === '1') ||
    (formCode === '1099DIV' && boxNumber === '1a') ||
    (formCode === 'K1' && ['1', '4', '5', '6a'].includes(boxNumber))
  ) {
    add(value, 0);
  }
  // Withholding boxes
  if (
    (formCode === 'W2' && boxNumber === '2') ||
    (['1099NEC', '1099MISC', '1099INT', '1099DIV'].includes(formCode) && boxNumber === '4')
  ) {
    add(0, value);
  }
}

// ============================================
// Client Validation
// ============================================

/**
 * Validate a single client for export readiness.
 * Checks for required fields, missing documents, and unverified docs.
 */
export function validateClientForExport(
  client: TaxPortal,
  documents: DrakeTaxDocument[]
): ClientValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field checks
  if (!client.ssn || client.ssn.replace(/\D/g, '').length !== 9) {
    errors.push('Missing or invalid SSN');
  }
  if (!client.firstName) {
    errors.push('Missing first name');
  }
  if (!client.lastName) {
    errors.push('Missing last name');
  }

  // Document checks
  if (documents.length === 0) {
    errors.push('No tax documents uploaded');
  }

  const verifiedDocs = documents.filter(d => d.verified);
  const unverifiedDocs = documents.filter(d => !d.verified && d.uploadStatus === 'analyzed');
  const errorDocs = documents.filter(d => d.uploadStatus === 'error');
  const processingDocs = documents.filter(d => d.uploadStatus === 'analyzing' || d.uploadStatus === 'uploading');

  if (verifiedDocs.length === 0 && documents.length > 0) {
    errors.push('No verified documents - at least one required');
  }

  if (unverifiedDocs.length > 0) {
    warnings.push(`${unverifiedDocs.length} document(s) analyzed but not yet verified`);
  }

  if (errorDocs.length > 0) {
    warnings.push(`${errorDocs.length} document(s) have processing errors`);
  }

  if (processingDocs.length > 0) {
    warnings.push(`${processingDocs.length} document(s) still being processed`);
  }

  // Check for documents with no extracted amounts
  const emptyDocs = verifiedDocs.filter(d => !d.extractedAmounts || Object.keys(d.extractedAmounts).length === 0);
  if (emptyDocs.length > 0) {
    warnings.push(`${emptyDocs.length} verified document(s) have no extracted amounts`);
  }

  // Filing status check
  if (!client.filingStatus) {
    warnings.push('Filing status not set');
  }

  // Compute totals
  let totalIncome = 0;
  let totalWithholding = 0;
  for (const doc of verifiedDocs) {
    const a = doc.extractedAmounts;
    if (!a) continue;
    totalIncome += (a.wages || 0) + (a.nonEmployeeCompensation || 0) + (a.interestIncome || 0) +
      (a.ordinaryDividends || 0) + (a.rents || 0) + (a.royalties || 0) + (a.otherIncome || 0) +
      (a.ordinaryBusinessIncome || 0) + (a.unemploymentCompensation || 0) + (a.grossAmount1099K || 0) +
      (a.totalAmount || 0);
    totalWithholding += (a.federalTaxWithheld || 0) + (a.federalTaxWithheld1099 || 0) +
      (a.federalTaxWithheld1099G || 0) + (a.federalTaxWithheld1099K || 0);
  }

  let status: 'pass' | 'warning' | 'error' = 'pass';
  if (errors.length > 0) status = 'error';
  else if (warnings.length > 0) status = 'warning';

  return {
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    status,
    errors,
    warnings,
    documentCount: documents.length,
    verifiedCount: verifiedDocs.length,
    unverifiedCount: unverifiedDocs.length,
    totalIncome,
    totalWithholding,
  };
}

/**
 * Validate multiple clients for batch export
 */
export function validateBatchExport(
  clients: TaxPortal[],
  getDocumentsForClient: (clientId: string) => DrakeTaxDocument[]
): BatchValidationResult {
  const clientResults: ClientValidationResult[] = [];
  let passCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const client of clients) {
    const docs = getDocumentsForClient(client.id);
    const result = validateClientForExport(client, docs);
    clientResults.push(result);

    if (result.status === 'pass') passCount++;
    else if (result.status === 'warning') warningCount++;
    else errorCount++;
  }

  return {
    totalClients: clients.length,
    passCount,
    warningCount,
    errorCount,
    clientResults,
  };
}

// ============================================
// Batch Export
// ============================================

/**
 * Export a single client (CSV, XML, or both).
 * Returns the result for that client.
 */
export function exportSingleClient(
  client: TaxPortal,
  documents: DrakeTaxDocument[],
  config: EnhancedExportConfig
): BatchExportClientResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let csvData: string | undefined;
  let xmlData: string | undefined;
  let recordCount = 0;
  let totalIncome = 0;
  let totalWithholding = 0;

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    if (!config.includeUnverifiedDocuments && !doc.verified) return false;
    return true;
  });

  try {
    if (config.outputFormat === 'csv' || config.outputFormat === 'both') {
      const csvResult = generateEnhancedCsvExport(client, filteredDocs, config);
      if (csvResult.success) {
        csvData = csvResult.csvData;
        recordCount = csvResult.recordCount;
        totalIncome = csvResult.totalIncome;
        totalWithholding = csvResult.totalWithholding;
        if (csvResult.warnings) warnings.push(...csvResult.warnings);
      } else {
        if (csvResult.errors) errors.push(...csvResult.errors);
      }
    }

    if (config.outputFormat === 'xml' || config.outputFormat === 'both') {
      xmlData = generateDrakeXml(client, filteredDocs, config);
      // If CSV wasn't generated, estimate record count from XML docs
      if (!csvData) {
        recordCount = filteredDocs.filter(d => d.extractedAmounts).length;
        for (const doc of filteredDocs) {
          const a = doc.extractedAmounts;
          if (!a) continue;
          totalIncome += (a.wages || 0) + (a.nonEmployeeCompensation || 0) + (a.interestIncome || 0) +
            (a.ordinaryDividends || 0) + (a.rents || 0) + (a.royalties || 0) + (a.otherIncome || 0);
          totalWithholding += (a.federalTaxWithheld || 0) + (a.federalTaxWithheld1099 || 0);
        }
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Unknown export error');
  }

  const clientName = `${client.lastName}_${client.firstName}`.replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ext = config.outputFormat === 'xml' ? 'xml' : 'csv';
  const fileName = `Drake_${clientName}_${config.taxYear}_${timestamp}.${ext}`;

  return {
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    success: errors.length === 0 && (!!csvData || !!xmlData),
    csvData,
    xmlData,
    fileName,
    recordCount,
    totalIncome,
    totalWithholding,
    errors,
    warnings,
  };
}

/**
 * Execute batch export for multiple clients.
 * Processes clients in chunks to handle large batches.
 * Calls onProgress callback for reactive updates.
 */
export async function executeBatchExport(
  clients: TaxPortal[],
  getDocumentsForClient: (clientId: string) => DrakeTaxDocument[],
  config: BatchExportConfig,
  onProgress: (progress: BatchExportProgress) => void
): Promise<BatchExportResult> {
  const clientResults: BatchExportClientResult[] = [];
  let completedClients = 0;
  let failedClients = 0;
  const total = clients.length;
  const CHUNK_SIZE = 5;

  onProgress({
    current: 0,
    total,
    currentClientName: '',
    status: 'exporting',
    message: `Starting export of ${total} client(s)...`,
  });

  // Process in chunks
  for (let i = 0; i < clients.length; i += CHUNK_SIZE) {
    const chunk = clients.slice(i, i + CHUNK_SIZE);

    for (const client of chunk) {
      onProgress({
        current: completedClients + 1,
        total,
        currentClientName: `${client.firstName} ${client.lastName}`,
        status: 'exporting',
        message: `Exporting ${client.firstName} ${client.lastName} (${completedClients + 1} of ${total})...`,
      });

      const documents = getDocumentsForClient(client.id);
      const clientConfig: EnhancedExportConfig = {
        taxYear: config.taxYear,
        clientId: client.id,
        outputFormat: config.outputFormat,
        includeHeaders: config.includeHeaders,
        includeUnverifiedDocuments: config.includeUnverifiedDocuments,
        includeStateReturns: config.includeStateReturns,
      };

      const result = exportSingleClient(client, documents, clientConfig);
      clientResults.push(result);

      if (result.success) {
        completedClients++;
      } else {
        failedClients++;
      }
    }

    // Yield to browser between chunks to keep UI responsive
    if (i + CHUNK_SIZE < clients.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  // Package into ZIP
  onProgress({
    current: total,
    total,
    currentClientName: '',
    status: 'packaging',
    message: 'Creating ZIP archive...',
  });

  let zipBlob: Blob | undefined;
  let zipFileName: string | undefined;

  const successfulResults = clientResults.filter(r => r.success);

  if (successfulResults.length > 1) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      for (const result of successfulResults) {
        const safeName = result.clientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        if (result.csvData) {
          zip.file(`${safeName}_${config.taxYear}.csv`, result.csvData);
        }
        if (result.xmlData) {
          zip.file(`${safeName}_${config.taxYear}.xml`, result.xmlData);
        }
      }

      zipBlob = await zip.generateAsync({ type: 'blob' });
      zipFileName = `Drake_BatchExport_${config.taxYear}_${timestamp}.zip`;
    } catch (err) {
      devLog('JSZip not available, ZIP creation skipped:', err);
      // ZIP creation is optional; individual downloads still work
    }
  }

  onProgress({
    current: total,
    total,
    currentClientName: '',
    status: 'complete',
    message: `Export complete: ${completedClients} succeeded, ${failedClients} failed`,
  });

  return {
    success: failedClients === 0,
    totalClients: total,
    completedClients,
    failedClients,
    clientResults,
    zipBlob,
    zipFileName,
    exportedAt: Date.now(),
  };
}

// ============================================
// Download Helpers
// ============================================

/** Trigger a browser download for text data */
export function downloadTextFile(data: string, fileName: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Trigger a browser download for a Blob */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Download a single client result (CSV or XML) */
export function downloadClientResult(result: BatchExportClientResult): void {
  if (result.csvData) {
    downloadTextFile(result.csvData, result.fileName || 'drake_export.csv', 'text/csv');
  }
  if (result.xmlData) {
    const xmlFileName = (result.fileName || 'drake_export').replace(/\.\w+$/, '.xml');
    downloadTextFile(result.xmlData, xmlFileName, 'application/xml');
  }
}

// ============================================
// Export History
// ============================================

const EXPORT_HISTORY_KEY = 'hrm_drake_export_history';
const MAX_HISTORY_ENTRIES = 100;

/** Save an export history entry to localStorage */
export function saveExportHistory(entry: ExportHistoryEntry): void {
  try {
    const existing = getExportHistory();
    existing.unshift(entry);
    // Keep only the most recent entries
    const trimmed = existing.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    devLog('Failed to save export history:', err);
  }
}

/** Retrieve export history from localStorage */
export function getExportHistory(): ExportHistoryEntry[] {
  try {
    const stored = localStorage.getItem(EXPORT_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ExportHistoryEntry[];
  } catch {
    return [];
  }
}

/** Clear export history */
export function clearExportHistory(): void {
  try {
    localStorage.removeItem(EXPORT_HISTORY_KEY);
  } catch (err) {
    devLog('Failed to clear export history:', err);
  }
}

/** Create an export history entry from a client result */
export function createHistoryEntry(
  result: BatchExportClientResult,
  config: EnhancedExportConfig | BatchExportConfig,
  isBatch: boolean = false,
  batchSize?: number,
  exportedBy?: string
): ExportHistoryEntry {
  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    clientId: result.clientId,
    clientName: result.clientName,
    taxYear: config.taxYear,
    format: config.outputFormat,
    recordCount: result.recordCount,
    totalIncome: result.totalIncome,
    totalWithholding: result.totalWithholding,
    fileName: result.fileName || '',
    exportedAt: Date.now(),
    exportedBy,
    isBatch,
    batchSize,
  };
}
