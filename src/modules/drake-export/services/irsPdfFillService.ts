/**
 * IRS PDF Fill Service
 * Fills official IRS fillable PDF templates (AcroForm) with client/document data using pdf-lib
 *
 * FIELD NAMES: Extracted from actual IRS PDFs using pdf-lib field inspection.
 * Each field uses its full qualified path (e.g. topmostSubform[0].Page1[0].f1_01[0]).
 */

import { PDFDocument, PDFForm } from 'pdf-lib';
import type { TaxPortal, DrakeTaxDocument, PayerInfo } from '../types/drakeTypes';
import type { SavedPayer } from '../stores/payerStore';
import { devLog } from '../../../services/utils';

// Template paths served from public/irs-forms/
const TEMPLATE_PATHS: Record<string, string> = {
  '1099_nec': '/irs-forms/f1099nec.pdf',
  'w9': '/irs-forms/fw9-u.pdf',
  '1099_misc': '/irs-forms/f1099msc.pdf',
  '1099_int': '/irs-forms/f1099int.pdf',
  '1099_div': '/irs-forms/f1099div.pdf',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadTemplate(formType: string): Promise<PDFDocument> {
  const path = TEMPLATE_PATHS[formType];
  if (!path) throw new Error(`No PDF template configured for form type: ${formType}`);

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load PDF template ${path}: ${response.status} ${response.statusText}`);
  }

  const bytes = await response.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

/**
 * Set a text field by its FULL qualified name.
 * Logs success/failure to the console for debugging.
 */
function setField(form: PDFForm, fullFieldName: string, value: string | undefined | null) {
  if (!value) return;
  try {
    const field = form.getTextField(fullFieldName);
    // Respect maxLength — truncate if needed
    const maxLen = field.getMaxLength();
    const finalValue = (maxLen !== undefined && value.length > maxLen) ? value.substring(0, maxLen) : value;
    field.setText(finalValue);
    console.log(`[IRS PDF] SET ${fullFieldName} = "${finalValue}"`);
  } catch {
    console.warn(`[IRS PDF] Field not found: ${fullFieldName}`);
  }
}

/**
 * Safe flatten — pdf-lib's flatten() crashes on XFA-origin PDFs with checkbox
 * removal errors. We flatten only text fields individually instead.
 */
function safeFlatten(form: PDFForm) {
  try {
    const fields = form.getFields();
    for (const field of fields) {
      if (field.constructor.name === 'PDFTextField') {
        try { field.enableReadOnly(); } catch { /* skip */ }
      }
    }
  } catch {
    console.warn('[IRS PDF] Could not flatten fields');
  }
}

function checkField(form: PDFForm, fullFieldName: string, checked: boolean) {
  if (!checked) return;
  try {
    const field = form.getCheckBox(fullFieldName);
    field.check();
    console.log(`[IRS PDF] CHECK ${fullFieldName}`);
  } catch {
    console.warn(`[IRS PDF] Checkbox not found: ${fullFieldName}`);
  }
}

function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '';
  return amount.toFixed(2);
}

function formatSSN(ssn: string | undefined): string {
  if (!ssn) return '';
  return ssn.replace(/\D/g, '');
}

function formatEIN(ein: string | undefined): string {
  if (!ein) return '';
  return ein.replace(/\D/g, '');
}

/** Safely get payer address as a string (handles object or string) */
function getPayerAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    return addr.street || addr.address || '';
  }
  return String(addr);
}

/** List all field names in a PDF — useful for mapping new templates */
export async function listPdfFields(pdfBytes: ArrayBuffer): Promise<string[]> {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  return form.getFields().map(f => f.getName());
}

/** Log every field name + type from a loaded form */
function logAllFields(form: PDFForm, formLabel: string) {
  const fields = form.getFields();
  console.log(`\n========== [IRS PDF] ${formLabel} — ${fields.length} fields ==========`);
  fields.forEach((field, i) => {
    const name = field.getName();
    const type = field.constructor.name;
    console.log(`  [${i}] ${type.padEnd(16)} → ${name}`);
  });
  console.log(`==========================================================\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// W-9 FIELD MAP (from fw9-u.pdf — 23 fields)
// ═══════════════════════════════════════════════════════════════════════════
//
// [0]  PDFTextField  → topmostSubform[0].Page1[0].f1_01[0]                                     ← Name
// [1]  PDFTextField  → topmostSubform[0].Page1[0].f1_02[0]                                     ← Business name / DBA
// [2]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[0]               ← Individual/sole proprietor
// [3]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[1]               ← C Corporation
// [4]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[2]               ← S Corporation
// [5]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[3]               ← Partnership
// [6]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[4]               ← Trust/estate
// [7]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[5]               ← LLC
// [8]  PDFTextField  → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_03[0]              ← LLC tax classification
// [9]  PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[6]               ← Other
// [10] PDFTextField  → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_04[0]              ← Other description
// [11] PDFCheckBox   → topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_2[0]               ← Exempt payee code
// [12] PDFTextField  → topmostSubform[0].Page1[0].f1_05[0]                                     ← Exemption codes
// [13] PDFTextField  → topmostSubform[0].Page1[0].f1_06[0]                                     ← FATCA exemption code
// [14] PDFTextField  → topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_07[0]                ← Address (number, street, apt)
// [15] PDFTextField  → topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_08[0]                ← City, state, ZIP
// [16] PDFTextField  → topmostSubform[0].Page1[0].f1_09[0]                                     ← Requester name/address
// [17] PDFTextField  → topmostSubform[0].Page1[0].f1_10[0]                                     ← Account number(s)
// [18] PDFTextField  → topmostSubform[0].Page1[0].f1_11[0]                                     ← SSN part 1 (3 digits)
// [19] PDFTextField  → topmostSubform[0].Page1[0].f1_12[0]                                     ← SSN part 2 (2 digits)
// [20] PDFTextField  → topmostSubform[0].Page1[0].f1_13[0]                                     ← SSN part 3 (4 digits)
// [21] PDFTextField  → topmostSubform[0].Page1[0].f1_14[0]                                     ← EIN part 1 (2 digits)
// [22] PDFTextField  → topmostSubform[0].Page1[0].f1_15[0]                                     ← EIN part 2 (7 digits)

const W9 = {
  name:           'topmostSubform[0].Page1[0].f1_01[0]',
  businessName:   'topmostSubform[0].Page1[0].f1_02[0]',
  cbIndividual:   'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[0]',
  cbCCorp:        'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[1]',
  cbSCorp:        'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[2]',
  cbPartnership:  'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[3]',
  cbTrust:        'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[4]',
  cbLLC:          'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[5]',
  llcClass:       'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_03[0]',
  cbOther:        'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[6]',
  otherDesc:      'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_04[0]',
  address:        'topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_07[0]',
  cityStateZip:   'topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_08[0]',
  requester:      'topmostSubform[0].Page1[0].f1_09[0]',
  accountNumbers: 'topmostSubform[0].Page1[0].f1_10[0]',
  ssn1:           'topmostSubform[0].Page1[0].f1_11[0]',
  ssn2:           'topmostSubform[0].Page1[0].f1_12[0]',
  ssn3:           'topmostSubform[0].Page1[0].f1_13[0]',
  ein1:           'topmostSubform[0].Page1[0].f1_14[0]',
  ein2:           'topmostSubform[0].Page1[0].f1_15[0]',
};

// ═══════════════════════════════════════════════════════════════════════════
// 1099-NEC FIELD MAP (verified from f1099nec_FIELDMAP.pdf visual inspection)
// ═══════════════════════════════════════════════════════════════════════════
//
// Copy A (f1_ numbering):
//   [0]  f1_1  = Calendar year                          (max:4)
//   [3]  f1_2  = PAYER'S name, address, city, phone     (one big box)
//   [4]  f1_3  = PAYER'S TIN                            (max:11)
//   [5]  f1_4  = RECIPIENT'S TIN                        (max:11)
//   [6]  f1_5  = RECIPIENT'S name
//   [7]  f1_6  = Street address (including apt. no.)
//   [8]  f1_7  = City, state, ZIP
//   [9]  f1_8  = Account number
//   [11] f1_9  = Box 1: Nonemployee compensation
//   [13] f1_10 = Box 3: Excess golden parachute
//   [14] f1_11 = Box 4: Federal income tax withheld
//   [15] f1_12 = Box 5 line 1: State tax withheld
//   [16] f1_13 = Box 5 line 2: State tax withheld
//   [17] f1_14 = Box 6 line 1: State/payer's state no
//   [18] f1_15 = Box 6 line 2
//   [19] f1_16 = Box 7 line 1: State income
//   [20] f1_17 = Box 7 line 2: State income
//
// Copy 1/B/2 (f2_ numbering, same layout):
//   f2_1 = year, f2_2 = payer block, f2_3 = payer TIN, f2_4 = recip TIN,
//   f2_5 = recip name, f2_6 = street, f2_7 = city/st/zip, f2_8 = account,
//   f2_9 = Box 1, f2_10 = Box 3, f2_11 = Box 4,
//   f2_12/13 = Box 5, f2_14/15 = Box 6, f2_16/17 = Box 7

interface NecCopyFields {
  year: string;
  payerBlock: string;       // name + address + phone in one box
  payerTIN: string;         // max:11
  recipientTIN: string;     // max:11
  recipientName: string;
  recipientStreet: string;
  recipientCityStateZip: string;
  accountNumber: string;
  box1_nec: string;
  box3_goldenParachute: string;
  box4_fedWithheld: string;
  box5_stateTax1: string;
  box5_stateTax2: string;
  box6_stateNo1: string;
  box6_stateNo2: string;
  box7_stateIncome1: string;
  box7_stateIncome2: string;
}

// Copy A uses f1_ numbering
const NEC_COPY_A: NecCopyFields = {
  year:                'topmostSubform[0].CopyA[0].PgHeader[0].CalendarYear[0].f1_1[0]',
  payerBlock:          'topmostSubform[0].CopyA[0].LeftCol[0].f1_2[0]',
  payerTIN:            'topmostSubform[0].CopyA[0].LeftCol[0].f1_3[0]',
  recipientTIN:        'topmostSubform[0].CopyA[0].LeftCol[0].f1_4[0]',
  recipientName:       'topmostSubform[0].CopyA[0].LeftCol[0].f1_5[0]',
  recipientStreet:     'topmostSubform[0].CopyA[0].LeftCol[0].f1_6[0]',
  recipientCityStateZip:'topmostSubform[0].CopyA[0].LeftCol[0].f1_7[0]',
  accountNumber:       'topmostSubform[0].CopyA[0].LeftCol[0].f1_8[0]',
  box1_nec:            'topmostSubform[0].CopyA[0].RightCol[0].f1_9[0]',
  box3_goldenParachute:'topmostSubform[0].CopyA[0].RightCol[0].f1_10[0]',
  box4_fedWithheld:    'topmostSubform[0].CopyA[0].RightCol[0].f1_11[0]',
  box5_stateTax1:      'topmostSubform[0].CopyA[0].RightCol[0].Box5_ReadOrder[0].f1_12[0]',
  box5_stateTax2:      'topmostSubform[0].CopyA[0].RightCol[0].Box5_ReadOrder[0].f1_13[0]',
  box6_stateNo1:       'topmostSubform[0].CopyA[0].RightCol[0].Box6_ReadOrder[0].f1_14[0]',
  box6_stateNo2:       'topmostSubform[0].CopyA[0].RightCol[0].Box6_ReadOrder[0].f1_15[0]',
  box7_stateIncome1:   'topmostSubform[0].CopyA[0].RightCol[0].Box7_ReadOrder[0].f1_16[0]',
  box7_stateIncome2:   'topmostSubform[0].CopyA[0].RightCol[0].Box7_ReadOrder[0].f1_17[0]',
};

// Copy 1, B, 2 use f2_ numbering but same field layout
function necCopyFields(copyName: string): NecCopyFields {
  const p = `topmostSubform[0].${copyName}[0]`;
  return {
    year:                 `${p}.PgHeader[0].CalendarYear[0].f2_1[0]`,
    payerBlock:           `${p}.LeftCol[0].f2_2[0]`,
    payerTIN:             `${p}.LeftCol[0].f2_3[0]`,
    recipientTIN:         `${p}.LeftCol[0].f2_4[0]`,
    recipientName:        `${p}.LeftCol[0].f2_5[0]`,
    recipientStreet:      `${p}.LeftCol[0].f2_6[0]`,
    recipientCityStateZip:`${p}.LeftCol[0].f2_7[0]`,
    accountNumber:        `${p}.LeftCol[0].f2_8[0]`,
    box1_nec:             `${p}.RightCol[0].f2_9[0]`,
    box3_goldenParachute: `${p}.RightCol[0].f2_10[0]`,
    box4_fedWithheld:     `${p}.RightCol[0].f2_11[0]`,
    box5_stateTax1:       `${p}.RightCol[0].Box5_ReadOrder[0].f2_12[0]`,
    box5_stateTax2:       `${p}.RightCol[0].Box5_ReadOrder[0].f2_13[0]`,
    box6_stateNo1:        `${p}.RightCol[0].Box6_ReadOrder[0].f2_14[0]`,
    box6_stateNo2:        `${p}.RightCol[0].Box6_ReadOrder[0].f2_15[0]`,
    box7_stateIncome1:    `${p}.RightCol[0].Box7_ReadOrder[0].f2_16[0]`,
    box7_stateIncome2:    `${p}.RightCol[0].Box7_ReadOrder[0].f2_17[0]`,
  };
}

const NEC_ALL_COPIES: NecCopyFields[] = [
  NEC_COPY_A,
  necCopyFields('Copy1'),
  necCopyFields('CopyB'),
  necCopyFields('Copy2'),
];

// ─── W-9 Fill ───────────────────────────────────────────────────────────────

export async function fillFormW9(client: TaxPortal): Promise<Uint8Array> {
  const pdf = await loadTemplate('w9');
  const form = pdf.getForm();

  logAllFields(form, 'W-9');

  const fullName = [client.firstName, client.middleName, client.lastName, client.suffix]
    .filter(Boolean).join(' ');

  setField(form, W9.name, fullName);
  checkField(form, W9.cbIndividual, true);
  setField(form, W9.address, client.address);
  setField(form, W9.cityStateZip, [client.city, client.state, client.zipCode].filter(Boolean).join(', '));

  // SSN — split into 3 groups: XXX-XX-XXXX
  const ssnDigits = formatSSN(client.ssn);
  if (ssnDigits.length === 9) {
    setField(form, W9.ssn1, ssnDigits.substring(0, 3));
    setField(form, W9.ssn2, ssnDigits.substring(3, 5));
    setField(form, W9.ssn3, ssnDigits.substring(5, 9));
  }

  safeFlatten(form);
  return pdf.save();
}

// ─── 1099-NEC Fill ──────────────────────────────────────────────────────────

function fill1099NecCopy(
  form: PDFForm,
  fields: NecCopyFields,
  doc: DrakeTaxDocument,
  client: TaxPortal,
  taxYear: number
) {
  const payer = doc.payerInfo;
  const amounts = doc.extractedAmounts;

  // Tax year (max 4 chars)
  setField(form, fields.year, String(taxYear));

  // Payer block — one big field: name + address + city/state/zip + phone

  console.log( payer)
  const payerLines = [
    payer?.name,
    getPayerAddress(payer?.address),
    [payer?.address?.city, payer?.address?.state, payer?.address?.zipCode].filter(Boolean).join(', '),
    payer?.phone,
  ].filter(Boolean).join('\n');
  setField(form, fields.payerBlock, payerLines);

  // TINs (max 11 chars each — format: XX-XXXXXXX)
  const payerEin = formatEIN(payer?.ein);
  setField(form, fields.payerTIN, payerEin.length === 9 ? payerEin.substring(0, 2) + '-' + payerEin.substring(2) : payerEin);

  const recipSSN = formatSSN(client.ssn);
  setField(form, fields.recipientTIN, recipSSN.length === 9 ? recipSSN.substring(0, 3) + '-' + recipSSN.substring(3, 5) + '-' + recipSSN.substring(5) : recipSSN);

  // Recipient info
  const recipientName = [client.firstName, client.middleName, client.lastName].filter(Boolean).join(' ');
  setField(form, fields.recipientName, recipientName);
  setField(form, fields.recipientStreet, client.address);
  setField(form, fields.recipientCityStateZip, [client.city, client.state, client.zipCode].filter(Boolean).join(', '));

  // Box 1: Nonemployee compensation
  setField(form, fields.box1_nec, formatAmount(amounts?.nonEmployeeCompensation));

  // Box 4: Federal income tax withheld
  const fedWithheld = amounts?.federalTaxWithheld1099 ?? amounts?.federalTaxWithheld;
  setField(form, fields.box4_fedWithheld, formatAmount(fedWithheld));

  // Box 5: State tax withheld
  setField(form, fields.box5_stateTax1, formatAmount(amounts?.stateTaxWithheld));

  // Box 6: State/payer's state no.
  setField(form, fields.box6_stateNo1, payer?.state);

  // Box 7: State income
  setField(form, fields.box7_stateIncome1, formatAmount(amounts?.stateWages));
}

export async function fillForm1099Nec(doc: DrakeTaxDocument, client: TaxPortal, taxYear: number = 2024): Promise<Uint8Array> {
  const pdf = await loadTemplate('1099_nec');
  const form = pdf.getForm();

  logAllFields(form, '1099-NEC');

  // Fill all 4 copies
  for (const copyFields of NEC_ALL_COPIES) {
    fill1099NecCopy(form, copyFields, doc, client, taxYear);
  }

  safeFlatten(form);
  return pdf.save();
}

// ─── 1099-MISC Fill ─────────────────────────────────────────────────────────
// NOTE: Field names below are placeholders — will be updated when the user
// provides f1099msc.pdf. Use logAllFields() output to correct them.

export async function fillForm1099Misc(doc: DrakeTaxDocument, client: TaxPortal, taxYear: number = 2024): Promise<Uint8Array> {
  const pdf = await loadTemplate('1099_misc');
  const form = pdf.getForm();

  logAllFields(form, '1099-MISC');

  const payer = doc.payerInfo;
  const amounts = doc.extractedAmounts;

  // These field names will be corrected once the actual PDF is inspected.
  // The logAllFields() call above will print every field name to the console.
  // For now, using the pattern from the 1099-NEC analysis as a starting template.
  const fields = form.getFields();
  const fieldNames = fields.map(f => f.getName());

  // Auto-fill by searching for known patterns in field names
  const textFields = fields.filter(f => f.constructor.name === 'PDFTextField');
  console.log(`[IRS PDF] 1099-MISC has ${textFields.length} text fields — map them from console output above`);

  // Attempt to fill using fuzzy matching on short field suffixes
  const payerName = payer?.name;
  const payerAddr = getPayerAddress(payer?.address);
  const payerCityStateZip = [payer?.city, payer?.state, payer?.zip].filter(Boolean).join(', ');
  const recipientName = [client.firstName, client.middleName, client.lastName].filter(Boolean).join(' ');
  const recipientAddr = client.address;
  const recipientCityStateZip = [client.city, client.state, client.zipCode].filter(Boolean).join(', ');

  // Try common field name patterns
  for (const fullName of fieldNames) {
    if (fullName.endsWith('.f1_2[0]')) setField(form, fullName, payerName);
    else if (fullName.endsWith('.f1_3[0]')) setField(form, fullName, payerAddr);
    else if (fullName.endsWith('.f1_4[0]')) setField(form, fullName, payerCityStateZip);
    else if (fullName.endsWith('.f1_5[0]')) setField(form, fullName, payer?.phone);
    else if (fullName.endsWith('.f1_6[0]')) setField(form, fullName, formatEIN(payer?.ein));
    else if (fullName.endsWith('.f1_7[0]')) setField(form, fullName, formatSSN(client.ssn));
    else if (fullName.endsWith('.f1_8[0]')) setField(form, fullName, recipientName);
    else if (fullName.endsWith('.f1_9[0]')) setField(form, fullName, formatAmount(amounts?.rents));
  }

  safeFlatten(form);
  return pdf.save();
}

// ─── 1099-INT Fill ──────────────────────────────────────────────────────────

export async function fillForm1099Int(doc: DrakeTaxDocument, client: TaxPortal, taxYear: number = 2024): Promise<Uint8Array> {
  const pdf = await loadTemplate('1099_int');
  const form = pdf.getForm();

  logAllFields(form, '1099-INT');

  const fields = form.getFields();
  const fieldNames = fields.map(f => f.getName());
  const payer = doc.payerInfo;
  const amounts = doc.extractedAmounts;

  const recipientName = [client.firstName, client.middleName, client.lastName].filter(Boolean).join(' ');
  const payerCityStateZip = [payer?.city, payer?.state, payer?.zip].filter(Boolean).join(', ');

  for (const fullName of fieldNames) {
    if (fullName.endsWith('.f1_2[0]')) setField(form, fullName, payer?.name);
    else if (fullName.endsWith('.f1_3[0]')) setField(form, fullName, getPayerAddress(payer?.address));
    else if (fullName.endsWith('.f1_4[0]')) setField(form, fullName, payerCityStateZip);
    else if (fullName.endsWith('.f1_5[0]')) setField(form, fullName, payer?.phone);
    else if (fullName.endsWith('.f1_6[0]')) setField(form, fullName, formatEIN(payer?.ein));
    else if (fullName.endsWith('.f1_7[0]')) setField(form, fullName, formatSSN(client.ssn));
    else if (fullName.endsWith('.f1_8[0]')) setField(form, fullName, recipientName);
    else if (fullName.endsWith('.f1_9[0]')) setField(form, fullName, formatAmount(amounts?.interestIncome));
  }

  safeFlatten(form);
  return pdf.save();
}

// ─── 1099-DIV Fill ──────────────────────────────────────────────────────────

export async function fillForm1099Div(doc: DrakeTaxDocument, client: TaxPortal, taxYear: number = 2024): Promise<Uint8Array> {
  const pdf = await loadTemplate('1099_div');
  const form = pdf.getForm();

  logAllFields(form, '1099-DIV');

  const fields = form.getFields();
  const fieldNames = fields.map(f => f.getName());
  const payer = doc.payerInfo;
  const amounts = doc.extractedAmounts;

  const recipientName = [client.firstName, client.middleName, client.lastName].filter(Boolean).join(' ');
  const payerCityStateZip = [payer?.city, payer?.state, payer?.zip].filter(Boolean).join(', ');

  for (const fullName of fieldNames) {
    if (fullName.endsWith('.f1_2[0]')) setField(form, fullName, payer?.name);
    else if (fullName.endsWith('.f1_3[0]')) setField(form, fullName, getPayerAddress(payer?.address));
    else if (fullName.endsWith('.f1_4[0]')) setField(form, fullName, payerCityStateZip);
    else if (fullName.endsWith('.f1_5[0]')) setField(form, fullName, payer?.phone);
    else if (fullName.endsWith('.f1_6[0]')) setField(form, fullName, formatEIN(payer?.ein));
    else if (fullName.endsWith('.f1_7[0]')) setField(form, fullName, formatSSN(client.ssn));
    else if (fullName.endsWith('.f1_8[0]')) setField(form, fullName, recipientName);
    else if (fullName.endsWith('.f1_9[0]')) setField(form, fullName, formatAmount(amounts?.ordinaryDividends));
  }

  safeFlatten(form);
  return pdf.save();
}

// ─── Download Helper ────────────────────────────────────────────────────────

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Form type to fill function mapping ─────────────────────────────────────

type FillFunction = (doc: DrakeTaxDocument, client: TaxPortal, taxYear: number) => Promise<Uint8Array>;

const FILL_FUNCTIONS: Record<string, FillFunction> = {
  '1099_nec': fillForm1099Nec,
  '1099_misc': fillForm1099Misc,
  '1099_int': fillForm1099Int,
  '1099_div': fillForm1099Div,
};

const FORM_LABELS: Record<string, string> = {
  '1099_nec': '1099-NEC',
  '1099_misc': '1099-MISC',
  '1099_int': '1099-INT',
  '1099_div': '1099-DIV',
  'w9': 'W-9',
};

// ─── Generate from Payer API ────────────────────────────────────────────────

function savedPayerToPayerInfo(payer: SavedPayer): PayerInfo {
  return {
    name: payer.name,
    ein: payer.ein,
    address: payer.address,
    city: payer.city,
    state: payer.state,
    zip: payer.zip,
    phone: payer.phone,
  };
}

export interface PayerFormAmounts {
  nonEmployeeCompensation?: number;
  rents?: number;
  royalties?: number;
  otherIncome?: number;
  interestIncome?: number;
  ordinaryDividends?: number;
  qualifiedDividends?: number;
  federalTaxWithheld?: number;
  stateTaxWithheld?: number;
}

export async function fillFormFromPayer(
  payer: SavedPayer,
  client: TaxPortal,
  formType: '1099_nec' | '1099_misc' | '1099_int' | '1099_div',
  amounts: PayerFormAmounts,
  taxYear: number = 2024
): Promise<Uint8Array> {
  const doc = {
    id: `payer_${payer.id}_${Date.now()}`,
    clientNotaryId: client.id,
    documentType: 'tax_document',
    drakeFormType: formType,
    fileUrl: '',
    originalFileName: `${payer.name}_${formType}`,
    uploadedAt: Date.now(),
    uploadStatus: 'verified',
    verified: true,
    payerInfo: savedPayerToPayerInfo(payer),
    extractedAmounts: {
      nonEmployeeCompensation: amounts.nonEmployeeCompensation,
      rents: amounts.rents,
      royalties: amounts.royalties,
      otherIncome: amounts.otherIncome,
      interestIncome: amounts.interestIncome,
      ordinaryDividends: amounts.ordinaryDividends,
      qualifiedDividends: amounts.qualifiedDividends,
      federalTaxWithheld1099: amounts.federalTaxWithheld,
      stateTaxWithheld: amounts.stateTaxWithheld,
    },
    taxYear,
  } as unknown as DrakeTaxDocument;

  const fillFn = FILL_FUNCTIONS[formType];
  if (!fillFn) throw new Error(`Unsupported form type: ${formType}`);

  return fillFn(doc, client, taxYear);
}

// ─── Batch Generation ───────────────────────────────────────────────────────

export async function generateAllIrsForms(
  documents: DrakeTaxDocument[],
  client: TaxPortal,
  taxYear: number
): Promise<{ generated: string[]; errors: string[] }> {
  const generated: string[] = [];
  const errors: string[] = [];

  const clientName = `${client.lastName}_${client.firstName}`.replace(/\s+/g, '_');

  for (const doc of documents) {
    const formType = doc.drakeFormType;
    if (!formType || !FILL_FUNCTIONS[formType]) continue;

    try {
      const fillFn = FILL_FUNCTIONS[formType];
      const pdfBytes = await fillFn(doc, client, taxYear);
      const payerName = (doc.payerInfo?.name || 'Unknown').replace(/\s+/g, '_').substring(0, 30);
      const filename = `${FORM_LABELS[formType]}_${clientName}_${payerName}_${taxYear}.pdf`;
      downloadPdf(pdfBytes, filename);
      generated.push(`${FORM_LABELS[formType]} - ${doc.payerInfo?.name || 'Unknown Payer'}`);
    } catch (err) {
      const msg = `${FORM_LABELS[formType] || formType}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errors.push(msg);
      devLog(`[IRS PDF] Error generating ${formType}:`, err);
    }
  }

  try {
    const w9Bytes = await fillFormW9(client);
    const filename = `W-9_${clientName}_${taxYear}.pdf`;
    downloadPdf(w9Bytes, filename);
    generated.push('W-9');
  } catch (err) {
    const msg = `W-9: ${err instanceof Error ? err.message : 'Unknown error'}`;
    errors.push(msg);
    devLog('[IRS PDF] Error generating W-9:', err);
  }

  return { generated, errors };
}



/// tre20351592