/**
 * Development Seed Data for Tax Portal
 *
 * This file provides fake test data for development and testing purposes.
 *
 * TEST PORTAL URL: /#/tax-portal/client/TEST_TOKEN_12345
 *
 * This token will work immediately after the app loads.
 */

import { devLog } from '../../../services/utils';
import { TaxClientProfile, TaxDocument, MagicLinkToken } from '../types';

// ===========================================
// TEST TOKEN - Use this to access client portal
// ===========================================
export const DEV_TEST_TOKEN = 'TEST_TOKEN_12345';

// ===========================================
// FAKE CLIENTS
// ===========================================
export const DEV_CLIENTS: TaxClientProfile[] = [
  {
    id: 'client-001',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    email: 'maria.rodriguez@example.com',
    phone: '(305) 555-1234',
    ssn: '***-**-1234',
    dateOfBirth: '1985-03-15',
    address: '123 Palm Avenue',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    taxYear: 2024,
    filingStatus: 'married_filing_jointly',
    hasDependents: true,
    dependents: [
      {
        id: 'dep-001',
        firstName: 'Sofia',
        lastName: 'Rodriguez',
        dateOfBirth: '2015-06-20',
        relationship: 'child',
        monthsLivedWithYou: 12,
        isStudent: false,
        isDisabled: false,
      },
      {
        id: 'dep-002',
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        dateOfBirth: '2018-11-10',
        relationship: 'child',
        monthsLivedWithYou: 12,
        isStudent: false,
        isDisabled: false,
      },
    ],
    incomeSources: ['w2_employment', 'investment_income'],
    deductions: ['mortgage_interest', 'property_taxes', 'childcare_expenses', 'charitable_donations'],
    isHomeowner: true,
    isStudent: false,
    hasBusiness: false,
    hasInvestments: true,
    hasRentalProperty: false,
    receivedHealthInsurance: true,
    portalAccessToken: DEV_TEST_TOKEN,
    portalAccessExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    status: 'collecting_documents',
    documentProgress: 25,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    notes: 'First-time client. Referred by John Smith.',
  },
  {
    id: 'client-002',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '(786) 555-5678',
    dateOfBirth: '1978-08-22',
    address: '456 Ocean Drive',
    city: 'Miami Beach',
    state: 'FL',
    zipCode: '33139',
    taxYear: 2024,
    filingStatus: 'single',
    hasDependents: false,
    dependents: [],
    incomeSources: ['w2_employment', 'self_employment'],
    deductions: ['business_expenses', 'home_office'],
    isHomeowner: false,
    isStudent: false,
    hasBusiness: true,
    hasInvestments: false,
    hasRentalProperty: false,
    receivedHealthInsurance: true,
    portalAccessToken: 'TEST_TOKEN_JOHN_67890',
    portalAccessExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: 'documents_complete',
    documentProgress: 100,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    notes: 'Freelance web developer. Has Schedule C income.',
  },
  {
    id: 'client-003',
    firstName: 'Ana',
    lastName: 'Martinez',
    email: 'ana.martinez@example.com',
    phone: '(954) 555-9012',
    dateOfBirth: '1990-12-05',
    address: '789 Coral Way',
    city: 'Fort Lauderdale',
    state: 'FL',
    zipCode: '33301',
    taxYear: 2024,
    filingStatus: 'head_of_household',
    hasDependents: true,
    dependents: [
      {
        id: 'dep-003',
        firstName: 'Lucas',
        lastName: 'Martinez',
        dateOfBirth: '2012-04-18',
        relationship: 'child',
        monthsLivedWithYou: 12,
        isStudent: true,
        isDisabled: false,
      },
    ],
    incomeSources: ['w2_employment'],
    deductions: ['student_loan_interest', 'education_expenses', 'childcare_expenses'],
    isHomeowner: false,
    isStudent: true,
    hasBusiness: false,
    hasInvestments: false,
    hasRentalProperty: false,
    receivedHealthInsurance: true,
    status: 'intake',
    documentProgress: 0,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    notes: 'Currently in graduate school. Single mom.',
  },
  {
    id: 'client-004',
    firstName: 'Roberto',
    lastName: 'Garcia',
    email: 'roberto.garcia@example.com',
    phone: '(305) 555-3456',
    dateOfBirth: '1965-07-30',
    address: '321 Biscayne Blvd',
    city: 'Miami',
    state: 'FL',
    zipCode: '33132',
    taxYear: 2024,
    filingStatus: 'married_filing_jointly',
    hasDependents: false,
    dependents: [],
    incomeSources: ['retirement_income', 'social_security', 'investment_income', 'rental_income'],
    deductions: ['mortgage_interest', 'property_taxes', 'medical_expenses', 'charitable_donations'],
    isHomeowner: true,
    isStudent: false,
    hasBusiness: false,
    hasInvestments: true,
    hasRentalProperty: true,
    receivedHealthInsurance: true,
    portalAccessToken: 'TEST_TOKEN_ROBERTO_11111',
    portalAccessExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: 'in_review',
    documentProgress: 85,
    createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    notes: 'Retired. Has rental property in Hialeah. Schedule E needed.',
  },
  {
    id: 'client-005',
    firstName: 'Jennifer',
    lastName: 'Williams',
    email: 'jennifer.w@example.com',
    phone: '(561) 555-7890',
    dateOfBirth: '1982-01-14',
    address: '555 Royal Palm Way',
    city: 'West Palm Beach',
    state: 'FL',
    zipCode: '33401',
    taxYear: 2024,
    filingStatus: 'single',
    hasDependents: false,
    dependents: [],
    incomeSources: ['w2_employment', 'investment_income'],
    deductions: ['state_local_taxes', 'charitable_donations'],
    isHomeowner: false,
    isStudent: false,
    hasBusiness: false,
    hasInvestments: true,
    hasRentalProperty: false,
    receivedHealthInsurance: true,
    status: 'completed',
    documentProgress: 100,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    notes: 'Return filed successfully. Refund of $2,450.',
  },
];

// ===========================================
// FAKE DOCUMENTS (for Maria Rodriguez - client-001)
// ===========================================
export const DEV_DOCUMENTS: TaxDocument[] = [
  {
    id: 'doc-001',
    clientId: 'client-001',
    documentType: 'form_w2',
    category: 'income',
    originalFileName: 'W2_Employer_ABC_Corp.pdf',
    fileUrl: 'https://example.com/fake-w2.pdf',
    mimeType: 'application/pdf',
    fileSize: 125000,
    aiAnalyzed: true,
    aiAnalyzedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    detectedType: 'form_w2',
    confidence: 0.95,
    extractedData: {
      employerName: 'ABC Corporation',
      employerEIN: '12-3456789',
      wages: 75000,
      federalTaxWithheld: 12500,
      socialSecurityWages: 75000,
      socialSecurityTaxWithheld: 4650,
      medicareWages: 75000,
      medicareTaxWithheld: 1087.50,
      stateTaxWithheld: 3000,
      taxYear: 2024,
    },
    status: 'approved',
    reviewedBy: 'preparer',
    reviewedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    uploadedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    uploadedBy: 'client',
    taxYear: 2024,
  },
  {
    id: 'doc-002',
    clientId: 'client-001',
    documentType: 'form_1099_div',
    category: 'income',
    originalFileName: '1099-DIV_Vanguard.pdf',
    fileUrl: 'https://example.com/fake-1099div.pdf',
    mimeType: 'application/pdf',
    fileSize: 98000,
    aiAnalyzed: true,
    aiAnalyzedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    detectedType: 'form_1099_div',
    confidence: 0.92,
    extractedData: {
      payerName: 'Vanguard Group',
      payerTIN: '23-1234567',
      ordinaryDividends: 1250,
      qualifiedDividends: 1100,
      federalTaxWithheld: 0,
      taxYear: 2024,
    },
    status: 'analyzed',
    uploadedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    uploadedBy: 'client',
    taxYear: 2024,
  },
  {
    id: 'doc-003',
    clientId: 'client-001',
    documentType: 'pending_analysis',
    category: 'deductions',
    originalFileName: 'Mortgage_Statement_2024.jpg',
    fileUrl: 'https://example.com/fake-mortgage.jpg',
    mimeType: 'image/jpeg',
    fileSize: 450000,
    aiAnalyzed: false,
    status: 'pending',
    uploadedAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    uploadedBy: 'client',
  },
  // Documents for John Smith (client-002)
  {
    id: 'doc-004',
    clientId: 'client-002',
    documentType: 'form_w2',
    category: 'income',
    originalFileName: 'W2_Tech_Solutions.pdf',
    fileUrl: 'https://example.com/fake-w2-john.pdf',
    mimeType: 'application/pdf',
    fileSize: 130000,
    aiAnalyzed: true,
    aiAnalyzedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    detectedType: 'form_w2',
    confidence: 0.97,
    extractedData: {
      employerName: 'Tech Solutions Inc',
      employerEIN: '45-6789012',
      wages: 95000,
      federalTaxWithheld: 18000,
      taxYear: 2024,
    },
    status: 'approved',
    uploadedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    uploadedBy: 'client',
    taxYear: 2024,
  },
  {
    id: 'doc-005',
    clientId: 'client-002',
    documentType: 'form_1099_nec',
    category: 'income',
    originalFileName: '1099-NEC_Freelance_Client.pdf',
    fileUrl: 'https://example.com/fake-1099nec.pdf',
    mimeType: 'application/pdf',
    fileSize: 85000,
    aiAnalyzed: true,
    aiAnalyzedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    detectedType: 'form_1099_nec',
    confidence: 0.94,
    extractedData: {
      payerName: 'Acme Web Services',
      payerTIN: '78-9012345',
      nonEmployeeCompensation: 25000,
      taxYear: 2024,
    },
    status: 'approved',
    uploadedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    uploadedBy: 'client',
    taxYear: 2024,
  },
];

// ===========================================
// FAKE MAGIC LINKS
// ===========================================
export const DEV_MAGIC_LINKS: MagicLinkToken[] = [
  {
    token: DEV_TEST_TOKEN,
    clientId: 'client-001',
    email: 'maria.rodriguez@example.com',
    phone: '(305) 555-1234',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // Never expires for testing
    used: false,
  },
  {
    token: 'TEST_TOKEN_JOHN_67890',
    clientId: 'client-002',
    email: 'john.smith@example.com',
    phone: '(786) 555-5678',
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    used: true,
    usedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  {
    token: 'TEST_TOKEN_ROBERTO_11111',
    clientId: 'client-004',
    email: 'roberto.garcia@example.com',
    phone: '(305) 555-3456',
    createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    used: true,
    usedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
];

/**
 * Initialize the store with development seed data
 */
export function initializeDevData(store: any) {
  devLog('🧪 Tax Portal: Loading development seed data...');

  // Set clients
  store.setClients(DEV_CLIENTS);

  // Set documents
  store.setDocuments(DEV_DOCUMENTS);

  // Set magic links (need to add them one by one to trigger proper state updates)
  DEV_MAGIC_LINKS.forEach(link => {
    // The store's createMagicLink won't work here because clients need the token set
    // So we'll set it directly via the state if needed
  });

  devLog('✅ Tax Portal: Dev data loaded!');
  devLog(`   - ${DEV_CLIENTS.length} test clients`);
  devLog(`   - ${DEV_DOCUMENTS.length} test documents`);
  devLog(`   - ${DEV_MAGIC_LINKS.length} test magic links`);
  devLog('');
  devLog('🔗 TEST CLIENT PORTAL URL:');
  devLog(`   ${window.location.origin}/#/tax-portal/client/${DEV_TEST_TOKEN}`);
  devLog('');
}
