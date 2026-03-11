/**
 * Client Review PDF Generator
 * Generates a professional HTML document for client information review
 * that can be converted to PDF
 */

import type { TaxPortal } from '../types/drakeTypes';

type Language = 'en' | 'es';

const TRANSLATIONS = {
  en: {
    title: 'Client Information Review',
    subtitle: 'Tax Return',
    taxpayer: 'Taxpayer Information',
    spouse: 'Spouse Information',
    address: 'Address',
    dependents: 'Dependents',
    filingInfo: 'Filing Information',
    idInfo: 'ID Information',
    bankAccount: 'Bank Account',
    fullName: 'Full Name',
    ssn: 'Social Security Number',
    dateOfBirth: 'Date of Birth',
    occupation: 'Occupation',
    email: 'Email',
    phone: 'Phone',
    street: 'Street Address',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP Code',
    taxYear: 'Tax Year',
    filingStatus: 'Filing Status',
    idType: 'ID Type',
    idNumber: 'ID Number',
    issuingState: 'Issuing State',
    issueDate: 'Issue Date',
    expiration: 'Expiration Date',
    bankName: 'Bank Name',
    accountType: 'Account Type',
    routingNumber: 'Routing Number',
    accountNumber: 'Account Number',
    accountHolder: 'Account Holder',
    relationship: 'Relationship',
    monthsLived: 'Months Lived with You',
    noDependents: 'No dependents to claim',
    noIdInfo: 'No ID information on file',
    noBankInfo: 'No bank information on file',
    generatedOn: 'Generated on',
    confirmationText: 'I confirm that all information above is accurate and complete.',
    signatureLine: 'Signature',
    dateLine: 'Date',
    driversLicense: "Driver's License",
    stateId: 'State ID',
    passport: 'Passport',
    checking: 'Checking',
    savings: 'Savings',
    single: 'Single',
    marriedFilingJointly: 'Married Filing Jointly',
    marriedFilingSeparately: 'Married Filing Separately',
    headOfHousehold: 'Head of Household',
    qualifyingWidower: 'Qualifying Widow(er)',
    son: 'Son', daughter: 'Daughter', stepson: 'Stepson', stepdaughter: 'Stepdaughter',
    fosterChild: 'Foster Child', brother: 'Brother', sister: 'Sister',
    halfBrother: 'Half Brother', halfSister: 'Half Sister',
    stepbrother: 'Stepbrother', stepsister: 'Stepsister',
    parent: 'Parent', grandparent: 'Grandparent', grandchild: 'Grandchild',
    niece: 'Niece', nephew: 'Nephew', aunt: 'Aunt', uncle: 'Uncle', other: 'Other',
    // Tax Results
    taxResults: 'Tax Return Results',
    federalRefund: 'Federal Refund',
    federalOwe: 'Federal Amount Owed',
    stateRefund: 'State Refund',
    stateOwe: 'State Amount Owed',
    refund: 'Refund',
    owe: 'Owed',
    noTaxResults: 'No tax results available'
  },
  es: {
    title: 'Revisión de Información del Cliente',
    subtitle: 'Impuestos',
    taxpayer: 'Información del Contribuyente',
    spouse: 'Información del Cónyuge',
    address: 'Dirección',
    dependents: 'Dependientes',
    filingInfo: 'Información de Declaración',
    idInfo: 'Información de Identificación',
    bankAccount: 'Cuenta Bancaria',
    fullName: 'Nombre Completo',
    ssn: 'Número de Seguro Social',
    dateOfBirth: 'Fecha de Nacimiento',
    occupation: 'Ocupación',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    street: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código Postal',
    taxYear: 'Año Fiscal',
    filingStatus: 'Estado Civil Tributario',
    idType: 'Tipo de ID',
    idNumber: 'Número de ID',
    issuingState: 'Estado Emisor',
    issueDate: 'Fecha de Emisión',
    expiration: 'Fecha de Vencimiento',
    bankName: 'Nombre del Banco',
    accountType: 'Tipo de Cuenta',
    routingNumber: 'Número de Ruta',
    accountNumber: 'Número de Cuenta',
    accountHolder: 'Titular de la Cuenta',
    relationship: 'Parentesco',
    monthsLived: 'Meses Vividos con Usted',
    noDependents: 'Sin dependientes para reclamar',
    noIdInfo: 'Sin información de identificación',
    noBankInfo: 'Sin información bancaria',
    generatedOn: 'Generado el',
    confirmationText: 'Confirmo que toda la información anterior es precisa y completa.',
    signatureLine: 'Firma',
    dateLine: 'Fecha',
    driversLicense: 'Licencia de Conducir',
    stateId: 'ID Estatal',
    passport: 'Pasaporte',
    checking: 'Corriente',
    savings: 'Ahorros',
    single: 'Soltero/a',
    marriedFilingJointly: 'Casado/a Declarando Conjuntamente',
    marriedFilingSeparately: 'Casado/a Declarando por Separado',
    headOfHousehold: 'Jefe/a de Familia',
    qualifyingWidower: 'Viudo/a Calificado/a',
    son: 'Hijo', daughter: 'Hija', stepson: 'Hijastro', stepdaughter: 'Hijastra',
    fosterChild: 'Hijo de Crianza', brother: 'Hermano', sister: 'Hermana',
    halfBrother: 'Medio Hermano', halfSister: 'Media Hermana',
    stepbrother: 'Hermanastro', stepsister: 'Hermanastra',
    parent: 'Padre/Madre', grandparent: 'Abuelo/a', grandchild: 'Nieto/a',
    niece: 'Sobrina', nephew: 'Sobrino', aunt: 'Tía', uncle: 'Tío', other: 'Otro',
    // Tax Results
    taxResults: 'Resultados de la Declaración',
    federalRefund: 'Reembolso Federal',
    federalOwe: 'Adeudo Federal',
    stateRefund: 'Reembolso Estatal',
    stateOwe: 'Adeudo Estatal',
    refund: 'Reembolso',
    owe: 'Adeudo',
    noTaxResults: 'Sin resultados de impuestos disponibles'
  }
};

const FILING_STATUS_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  'single': 'single',
  'married_filing_jointly': 'marriedFilingJointly',
  'married_filing_separately': 'marriedFilingSeparately',
  'head_of_household': 'headOfHousehold',
  'qualifying_widower': 'qualifyingWidower'
};

const RELATIONSHIP_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  'son': 'son', 'daughter': 'daughter', 'stepson': 'stepson', 'stepdaughter': 'stepdaughter',
  'foster_child': 'fosterChild', 'brother': 'brother', 'sister': 'sister',
  'half_brother': 'halfBrother', 'half_sister': 'halfSister',
  'stepbrother': 'stepbrother', 'stepsister': 'stepsister',
  'parent': 'parent', 'grandparent': 'grandparent', 'grandchild': 'grandchild',
  'niece': 'niece', 'nephew': 'nephew', 'aunt': 'aunt', 'uncle': 'uncle', 'other': 'other'
};

const formatDate = (date: string | number | undefined, lang: Language): string => {
  if (!date) return '-';
  const locale = lang === 'es' ? 'es-ES' : 'en-US';

  let dateObj: Date;
  if (typeof date === 'string') {
    // Check if it's a YYYY-MM-DD format string to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day); // Create in local timezone
    } else {
      dateObj = new Date(date + 'T00:00:00'); // Force local time interpretation
    }
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) return '-';
  return dateObj.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatSsn = (ssn: string | undefined): string => {
  if (!ssn) return '-';
  return ssn.length === 9 ? `${ssn.slice(0,3)}-${ssn.slice(3,5)}-${ssn.slice(5)}` : ssn;
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const generateClientReviewHtml = (client: TaxPortal, lang: Language = 'en', linkedSpouse?: TaxPortal | null): string => {
  const t = TRANSLATIONS[lang];
  const fullName = [client.firstName, client.middleName, client.lastName, client.suffix].filter(Boolean).join(' ') || '-';
  const spouseFullName = [client.spouse?.firstName, client.spouse?.middleName, client.spouse?.lastName].filter(Boolean).join(' ') || '-';
  const addressLine = [client.address, client.apt ? `Apt ${client.apt}` : ''].filter(Boolean).join(', ') || '-';
  const isMarried = client.filingStatus === 'married_filing_jointly' || client.filingStatus === 'married_filing_separately';
  const isMFJ = client.filingStatus === 'married_filing_jointly';
  const currentDate = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const getIdType = () => {
    if (client.idInfo?.idType === 'drivers_license') return t.driversLicense;
    if (client.idInfo?.idType === 'state_id') return t.stateId;
    if (client.idInfo?.idType === 'passport') return t.passport;
    return t.other;
  };

  const getFilingStatus = () => {
    if (!client.filingStatus) return '-';
    const key = FILING_STATUS_KEY[client.filingStatus];
    return key ? t[key] : client.filingStatus;
  };

  const getRelationship = (rel: string | undefined) => {
    if (!rel) return '-';
    const key = RELATIONSHIP_KEY[rel];
    return key ? t[key] : rel;
  };

  // Merge dependents from taxpayer and linked spouse (for MFJ), avoiding duplicates
  const getAllDependents = () => {
    const taxpayerDeps = client.dependents || [];

    // For MFJ, also include spouse's dependents (avoiding duplicates)
    if (isMFJ && linkedSpouse?.dependents) {
      const spouseDeps = linkedSpouse.dependents.filter(spouseDep => {
        // Check if dependent already exists by SSN or name
        return !taxpayerDeps.some(d =>
          (d.ssn && spouseDep.ssn && d.ssn === spouseDep.ssn) ||
          (d.firstName?.toLowerCase() === spouseDep.firstName?.toLowerCase() &&
           d.lastName?.toLowerCase() === spouseDep.lastName?.toLowerCase())
        );
      }).map(dep => ({ ...dep, _fromSpouse: true }));

      return [...taxpayerDeps.map(dep => ({ ...dep, _fromSpouse: false })), ...spouseDeps];
    }

    return taxpayerDeps.map(dep => ({ ...dep, _fromSpouse: false }));
  };

  const allDependents = getAllDependents();

  const dependentsHtml = () => {
    if (client.hasNoDependents || allDependents.length === 0) {
      return `<tr><td colspan="5" class="empty-text">${t.noDependents}</td></tr>`;
    }
    return allDependents.map((dep, i) => `
      <tr>
        <td style="font-weight: 500;">${i + 1}</td>
        <td>${[dep.firstName, dep.lastName].filter(Boolean).join(' ') || '-'}${(dep as any)._fromSpouse ? ' <span class="spouse-badge">(S)</span>' : ''}</td>
        <td>${getRelationship(dep.relationship)}</td>
        <td style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 13px;">${formatSsn(dep.ssn)}</td>
        <td>${formatDate(dep.dateOfBirth, lang)}</td>
      </tr>
    `).join('');
  };

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title} - ${fullName}</title>
  <style>
    @page { margin: 0.5in; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #f0f0eb;
      margin: 0;
      padding: 24px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .header {
      text-align: center;
      padding: 32px 24px;
      background: #ffffff;
      border: 1px solid #e3e8ee;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; }
    .header p { margin: 0; color: #7a7a7a; font-size: 14px; }
    .section {
      background: #ffffff;
      border: 1px solid #e3e8ee;
      border-radius: 12px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .section-header {
      padding: 14px 20px;
      font-weight: 600;
      font-size: 14px;
      color: #1a1a1a;
      background: #fafafa;
      border-bottom: 1px solid #e3e8ee;
    }
    .section-content { padding: 16px 20px; }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ebebeb;
    }
    .row:last-child { border-bottom: none; }
    .row .label { color: #7a7a7a; font-size: 13px; }
    .row .value { font-weight: 500; text-align: right; color: #1a1a1a; }
    .row .value.mono { font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 12px 16px;
      background: #fafafa;
      font-weight: 600;
      font-size: 11px;
      color: #7a7a7a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e3e8ee;
    }
    td { padding: 12px 16px; border-bottom: 1px solid #ebebeb; }
    tr:last-child td { border-bottom: none; }
    .signature-section {
      margin-top: 24px;
      padding: 24px;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e3e8ee;
    }
    .signature-section p { margin: 0 0 24px 0; font-size: 13px; color: #7a7a7a; }
    .signature-line {
      display: flex;
      gap: 40px;
      margin-top: 16px;
    }
    .signature-box {
      flex: 1;
      border-top: 1px solid #1a1a1a;
      padding-top: 8px;
    }
    .signature-box span { font-size: 12px; color: #7a7a7a; }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #999999;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background: #f0f0eb;
      color: #1a1a1a;
      border: 1px solid #e3e8ee;
    }
    .empty-text {
      text-align: center;
      color: #999999;
      font-style: italic;
      padding: 12px;
    }
    .spouse-badge {
      display: inline-block;
      font-size: 10px;
      color: #7c3aed;
      font-weight: 600;
    }
    .refund { color: #16a34a; font-weight: 600; }
    .owe { color: #dc2626; font-weight: 600; }
    .tax-results-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .tax-result-box {
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e3e8ee;
    }
    .tax-result-box.federal { background: #f0fdf4; border-color: #bbf7d0; }
    .tax-result-box.state { background: #eff6ff; border-color: #bfdbfe; }
    .tax-result-label { font-size: 12px; color: #7a7a7a; margin-bottom: 4px; }
    .tax-result-value { font-size: 16px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${t.title}</h1>
      <p>${t.subtitle} - ${client.taxYear || new Date().getFullYear()}</p>
    </div>

     <!-- Filing Information -->
    <div class="section">
      <div class="section-header">${t.filingInfo}</div>
      <div class="section-content">
        <div class="row"><span class="label">${t.taxYear}</span><span class="value"><span class="badge">${client.taxYear || new Date().getFullYear()}</span></span></div>
        <div class="row"><span class="label">${t.filingStatus}</span><span class="value">${getFilingStatus()}</span></div>
      </div>
    </div>

    ${(client.federalRefund || client.federalOwe || (client.stateReturns && client.stateReturns.length > 0)) ? `
    <!-- Tax Return Results -->
    <div class="section">
      <div class="section-header">${t.taxResults}</div>
      <div class="section-content">
        ${client.federalRefund?
        `<div class="row">
          <span class="label">${t.federalRefund}</span>
          <span class="value ${client.federalRefund ? 'refund' : ''}">${client.federalRefund ? '+' + formatCurrency(client.federalRefund) : '-'}</span>
        </div>`
        : ''}
        ${client.federalOwe ? 
       `<div class="row">
          <span class="label">${t.federalOwe}</span>
          <span class="value ${client.federalOwe ? 'owe' : ''}">${client.federalOwe ? '-' + formatCurrency(client.federalOwe) : '-'}</span>
        </div>`
        : ''}
        ${client.stateReturns && client.stateReturns.length > 0 ? client.stateReturns.map(sr => `
        <div class="row">
          <span class="label">${sr.state} ${sr.refund ? t.refund : t.owe}</span>
          <span class="value ${sr.refund ? 'refund' : 'owe'}">${sr.refund ? '+' + formatCurrency(sr.refund) : '-' + formatCurrency(sr.owe)}</span>
        </div>
        `).join('') : ''}
      </div>
    </div>
    ` : ''}

    <!-- Taxpayer Information -->
    <div class="section">
      <div class="section-header">${t.taxpayer}</div>
      <div class="section-content">
        <div class="row"><span class="label">${t.fullName}</span><span class="value">${fullName}</span></div>
        <div class="row"><span class="label">${t.ssn}</span><span class="value mono">${formatSsn(client.ssn)}</span></div>
        <div class="row"><span class="label">${t.dateOfBirth}</span><span class="value">${formatDate(client.dateOfBirth, lang)}</span></div>
        <div class="row"><span class="label">${t.occupation}</span><span class="value">${client.occupation || '-'}</span></div>
        <div class="row"><span class="label">${t.email}</span><span class="value">${client.email || '-'}</span></div>
        <div class="row"><span class="label">${t.phone}</span><span class="value">${client.phone || '-'}</span></div>
      </div>
    </div>

    <!-- Address -->
    <div class="section">
      <div class="section-header">${t.address}</div>
      <div class="section-content">
        <div class="row"><span class="label">${t.street}</span><span class="value">${addressLine}</span></div>
        <div class="row"><span class="label">${t.city}</span><span class="value">${client.city || '-'}</span></div>
        <div class="row"><span class="label">${t.state}</span><span class="value">${client.state || '-'}</span></div>
        <div class="row"><span class="label">${t.zipCode}</span><span class="value mono">${client.zipCode || '-'}</span></div>
      </div>
    </div>

    ${isMarried ? `
    <!-- Spouse Information -->
    <div class="section">
      <div class="section-header">${t.spouse}</div>
      <div class="section-content">
        <div class="row"><span class="label">${t.fullName}</span><span class="value">${spouseFullName}</span></div>
        <div class="row"><span class="label">${t.ssn}</span><span class="value mono">${formatSsn(client.spouse?.ssn)}</span></div>
        <div class="row"><span class="label">${t.dateOfBirth}</span><span class="value">${formatDate(client.spouse?.dateOfBirth, lang)}</span></div>
        <div class="row"><span class="label">${t.occupation}</span><span class="value">${client.spouse?.occupation || '-'}</span></div>
        <div class="row"><span class="label">${t.phone}</span><span class="value">${client.spouse?.phone || '-'}</span></div>
      </div>
    </div>
    ` : ''}

   
  ${allDependents.length ? `
    <!-- Dependents -->
    <div class="section">
      <div class="section-header">${t.dependents} (${allDependents.length})</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${t.fullName}</th>
            <th>${t.relationship}</th>
            <th>${t.ssn}</th>
            <th>${t.dateOfBirth}</th>
          </tr>
        </thead>
        <tbody>
          ${dependentsHtml()}
        </tbody>
      </table>
    </div>
    `:''}


  ${client.idInfo?.idNumber ? `
    <!-- ID Information -->
    <div class="section">
      <div class="section-header">${t.idInfo}</div>
      <div class="section-content">
        ${client.idInfo?.idNumber ? `
        <div class="row"><span class="label">${t.idType}</span><span class="value">${getIdType()}</span></div>
        <div class="row"><span class="label">${t.idNumber}</span><span class="value mono">${client.idInfo.idNumber}</span></div>
        <div class="row"><span class="label">${t.issuingState}</span><span class="value">${client.idInfo.idState || '-'}</span></div>
        <div class="row"><span class="label">${t.issueDate}</span><span class="value">${formatDate(client.idInfo.issueDate, lang)}</span></div>
        <div class="row"><span class="label">${t.expiration}</span><span class="value">${formatDate(client.idInfo.expirationDate, lang)}</span></div>
        ` : `<div class="empty-text">${t.noIdInfo}</div>`}
      </div>
    </div>
    `:''}

    ${client.bankInfo?.accountNumber ? `
    <!-- Bank Account -->
    <div class="section">
      <div class="section-header">${t.bankAccount}</div>
      <div class="section-content">
        ${client.bankInfo?.accountNumber ? `
        <div class="row"><span class="label">${t.bankName}</span><span class="value">${client.bankInfo.bankName || '-'}</span></div>
        <div class="row"><span class="label">${t.accountType}</span><span class="value"><span class="badge">${client.bankInfo.accountType}</span></span></div>
        <div class="row"><span class="label">${t.routingNumber}</span><span class="value mono">${client.bankInfo.routingNumber || '-'}</span></div>
        <div class="row"><span class="label">${t.accountNumber}</span><span class="value mono">${client.bankInfo.accountNumber}</span></div>
        ${client.bankInfo.accountHolderName ? `<div class="row"><span class="label">${t.accountHolder}</span><span class="value">${client.bankInfo.accountHolderName}</span></div>` : ''}
        ` : `<div class="empty-text">${t.noBankInfo}</div>`}
      </div>
    </div>
      `:''}

    <!-- Signature Section -->
    <div class="signature-section">
      <p>${t.confirmationText}</p>
      <div class="signature-line">
        <div class="signature-box"><span>${t.signatureLine}</span></div>
        <div class="signature-box"><span>${t.dateLine}</span></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      ${t.generatedOn}: ${currentDate}
    </div>
  </div>
</body>
</html>
`;
};

export const downloadClientReviewPdf = (client: TaxPortal, lang: Language = 'en', linkedSpouse?: TaxPortal | null): void => {
  const html = generateClientReviewHtml(client, lang, linkedSpouse);
  const fullName = [client.firstName, client.lastName].filter(Boolean).join('_') || 'Client';
  const fileName = `Client_Review_${fullName}_${client.taxYear || new Date().getFullYear()}.pdf`;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};

export const openClientReviewDocument = (client: TaxPortal, lang: Language = 'en', linkedSpouse?: TaxPortal | null): void => {
  const html = generateClientReviewHtml(client, lang, linkedSpouse);

  // Create a blob URL and open it
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');

  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
