/**
 * Client Info Section Component
 * Edit client information including personal details, spouse, and dependents
 */

import { Component, createSignal, For, Show, createEffect } from 'solid-js';
import { Card, Button, FormInput } from '../../../ui';
import type { TaxPortal, TaxDependent, DependentRelationship, FilingStatus } from '../../types/drakeTypes';
import { FILING_STATUS_LABELS } from '../../types/drakeTypes';
import ClientQRCodeGenerator from '../ClientQRCodeGenerator';
import { formatDateMMDDYYYY, formatDateSafe, ssnForQR, devLog } from '../../../../services/utils';
import { lookupZipCode } from '../../utils/zipCodeLookup';
import { searchAddress as searchAddressApi, getActiveProvider, type AddressResult } from '../../utils/addressSearchService';
import QRCodeViewer from '../../../../components/QRCodeViewer';
import { IDScanner, type MRZData } from '../../../scanner';
import { parseAAMVA, aamvaToTaxPortalIdInfo } from '../../services/aamvaParser';
import { downloadClientReviewPdf, openClientReviewDocument } from '../../services/clientReviewPdf';
import { getTaxPortals } from '../../services/taxPortalApi';
import MultiQRCodeViewer from '../../../../components/QRCodeViewerMulti';
import { authStore } from '../../../../stores/authStore';
import PreviousYearBanner from './PreviousYearBanner';
import type { PreviousYearData, YearOverYearChange } from '../../services/recurringClientService';

interface ClientInfoSectionProps {
  client: TaxPortal;
  onClientChange: (updates: Partial<TaxPortal>) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  linkedSpouse?: TaxPortal | null;
  previousYearData?: PreviousYearData | null;
  yearOverYearChanges?: YearOverYearChange[];
  isReturningClient?: boolean;
}

// Dependent relationship labels
const RELATIONSHIP_LABELS: Record<DependentRelationship, string> = {
  'son': 'Son',
  'daughter': 'Daughter',
  'stepson': 'Stepson',
  'stepdaughter': 'Stepdaughter',
  'foster_child': 'Foster Child',
  'brother': 'Brother',
  'sister': 'Sister',
  'half_brother': 'Half Brother',
  'half_sister': 'Half Sister',
  'stepbrother': 'Stepbrother',
  'stepsister': 'Stepsister',
  'parent': 'Parent',
  'grandparent': 'Grandparent',
  'grandchild': 'Grandchild',
  'niece': 'Niece',
  'nephew': 'Nephew',
  'aunt': 'Aunt',
  'uncle': 'Uncle',
  'other': 'Other'
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// Common US Banks list for autocomplete
const US_BANKS = [
  'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'U.S. Bank',
  'PNC Bank', 'Truist Bank', 'Goldman Sachs', 'Capital One', 'TD Bank',
  'Fifth Third Bank', 'Citizens Bank', 'KeyBank', 'Huntington Bank', 'M&T Bank',
  'Regions Bank', 'BMO Harris Bank', 'HSBC Bank USA', 'Santander Bank', 'Ally Bank',
  'Synchrony Bank', 'Discover Bank', 'Charles Schwab Bank', 'American Express National Bank',
  'First Republic Bank', 'First Citizens Bank', 'Comerica Bank', 'Zions Bank', 'Republic Bank & Trust Company',
  'Western Alliance Bank', 'Valley National Bank', 'Webster Bank', 'Banner Bank',
  'Pacific Premier Bank', 'Prosperity Bank', 'Texas Capital Bank', 'Frost Bank',
  'Navy Federal Credit Union', 'State Employees Credit Union', 'Pentagon Federal Credit Union',
  'SchoolsFirst Federal Credit Union', 'Alliant Credit Union', 'Golden 1 Credit Union',
  'America First Credit Union', 'USAA Federal Savings Bank', 'Mountain America Credit Union',
  'Chime', 'Varo Bank', 'Current', 'SoFi', 'Marcus by Goldman Sachs', 'Axos Bank',
  'CIT Bank', 'TIAA Bank', 'Popular Bank', 'BankUnited', 'First Horizon Bank',
  'Synovus Bank', 'Old National Bank', 'Associated Bank', 'Simmons Bank', 'Cadence Bank'
].sort();

type ActiveTab = 'review' | 'personal' | 'spouse' | 'dependents' | 'tax' | 'admin';
type ReviewLanguage = 'en' | 'es';

// Translations for the review section
const REVIEW_TRANSLATIONS = {
  en: {
    // Header
    clientInfoReview: 'Client Information Review',
    reviewSubtitle: 'Please review all information below for accuracy before proceeding',

    // Card titles
    taxpayer: 'Taxpayer',
    address: 'Address',
    spouse: 'Spouse',
    filingInfo: 'Filing Information',
    idInfo: 'ID Information',
    bankAccount: 'Bank Account',
    dependents: 'Dependents',

    // Taxpayer fields
    fullName: 'Full Name',
    ssn: 'SSN',
    dateOfBirth: 'Date of Birth',
    occupation: 'Occupation',
    email: 'Email',
    phone: 'Phone',

    // Address fields
    street: 'Street',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP Code',

    // Filing fields
    taxYear: 'Tax Year',
    filingStatus: 'Filing Status',

    // Refund/Owe fields
    taxResults: 'Tax Return Results',
    federalRefund: 'Federal Refund',
    federalOwe: 'Federal Amount Owed',
    stateRefund: 'State Refund',
    stateOwe: 'State Amount Owed',
    totalRefund: 'Total Refund',
    totalOwe: 'Total Owed',
    refund: 'Refund',
    owe: 'Owed',
    addState: 'Add State',
    removeState: 'Remove',
    noStateReturns: 'No state returns added',

    // ID fields
    idType: 'ID Type',
    idNumber: 'ID Number',
    issuingState: 'Issuing State',
    issueDate: 'Issue Date',
    expiration: 'Expiration',
    driversLicense: "Driver's License",
    stateId: 'State ID',
    passport: 'Passport',
    other: 'Other',
    noIdInfo: 'No ID information on file',

    // Bank fields
    bankName: 'Bank Name',
    accountType: 'Account Type',
    routingNumber: 'Routing #',
    accountNumber: 'Account #',
    accountHolder: 'Account Holder',
    checking: 'Checking',
    savings: 'Savings',
    noBankInfo: 'No bank information on file',

    // Dependents
    relationship: 'Relationship',
    monthsLived: 'Months Lived',
    noDependentsConfirmed: 'No dependents to claim (confirmed)',
    noDependentsAdded: 'No dependents added',

    // Actions
    printReview: 'Print Review',
    show: 'Show',
    hide: 'Hide',

    // Relationship labels
    son: 'Son',
    daughter: 'Daughter',
    stepson: 'Stepson',
    stepdaughter: 'Stepdaughter',
    fosterChild: 'Foster Child',
    brother: 'Brother',
    sister: 'Sister',
    halfBrother: 'Half Brother',
    halfSister: 'Half Sister',
    stepbrother: 'Stepbrother',
    stepsister: 'Stepsister',
    parent: 'Parent',
    grandparent: 'Grandparent',
    grandchild: 'Grandchild',
    niece: 'Niece',
    nephew: 'Nephew',
    aunt: 'Aunt',
    uncle: 'Uncle',

    // Filing status labels
    single: 'Single',
    marriedFilingJointly: 'Married Filing Jointly',
    marriedFilingSeparately: 'Married Filing Separately',
    headOfHousehold: 'Head of Household',
    qualifyingWidower: 'Qualifying Widow(er)'
  },
  es: {
    // Header
    clientInfoReview: 'Revisión de Información del Cliente',
    reviewSubtitle: 'Por favor revise toda la información a continuación para verificar su exactitud',

    // Card titles
    taxpayer: 'Contribuyente',
    address: 'Dirección',
    spouse: 'Cónyuge',
    filingInfo: 'Información de Declaración',
    idInfo: 'Información de Identificación',
    bankAccount: 'Cuenta Bancaria',
    dependents: 'Dependientes',

    // Taxpayer fields
    fullName: 'Nombre Completo',
    ssn: 'Número de Seguro Social',
    dateOfBirth: 'Fecha de Nacimiento',
    occupation: 'Ocupación',
    email: 'Correo Electrónico',
    phone: 'Teléfono',

    // Address fields
    street: 'Calle',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código Postal',

    // Filing fields
    taxYear: 'Año Fiscal',
    filingStatus: 'Estado Civil Tributario',

    // Refund/Owe fields
    taxResults: 'Resultados de la Declaración',
    federalRefund: 'Reembolso Federal',
    federalOwe: 'Adeudo Federal',
    stateRefund: 'Reembolso Estatal',
    stateOwe: 'Adeudo Estatal',
    totalRefund: 'Reembolso Total',
    totalOwe: 'Adeudo Total',
    refund: 'Reembolso',
    owe: 'Adeudo',
    addState: 'Agregar Estado',
    removeState: 'Eliminar',
    noStateReturns: 'Sin declaraciones estatales agregadas',

    // ID fields
    idType: 'Tipo de ID',
    idNumber: 'Número de ID',
    issuingState: 'Estado Emisor',
    issueDate: 'Fecha de Emisión',
    expiration: 'Vencimiento',
    driversLicense: 'Licencia de Conducir',
    stateId: 'ID Estatal',
    passport: 'Pasaporte',
    other: 'Otro',
    noIdInfo: 'Sin información de identificación',

    // Bank fields
    bankName: 'Nombre del Banco',
    accountType: 'Tipo de Cuenta',
    routingNumber: 'Número de Ruta',
    accountNumber: 'Número de Cuenta',
    accountHolder: 'Titular de la Cuenta',
    checking: 'Corriente',
    savings: 'Ahorros',
    noBankInfo: 'Sin información bancaria',

    // Dependents
    relationship: 'Parentesco',
    monthsLived: 'Meses Vividos',
    noDependentsConfirmed: 'Sin dependientes para reclamar (confirmado)',
    noDependentsAdded: 'Sin dependientes agregados',

    // Actions
    printReview: 'Imprimir Revisión',
    show: 'Mostrar',
    hide: 'Ocultar',

    // Relationship labels
    son: 'Hijo',
    daughter: 'Hija',
    stepson: 'Hijastro',
    stepdaughter: 'Hijastra',
    fosterChild: 'Hijo de Crianza',
    brother: 'Hermano',
    sister: 'Hermana',
    halfBrother: 'Medio Hermano',
    halfSister: 'Media Hermana',
    stepbrother: 'Hermanastro',
    stepsister: 'Hermanastra',
    parent: 'Padre/Madre',
    grandparent: 'Abuelo/a',
    grandchild: 'Nieto/a',
    niece: 'Sobrina',
    nephew: 'Sobrino',
    aunt: 'Tía',
    uncle: 'Tío',

    // Filing status labels
    single: 'Soltero/a',
    marriedFilingJointly: 'Casado/a Declarando Conjuntamente',
    marriedFilingSeparately: 'Casado/a Declarando por Separado',
    headOfHousehold: 'Jefe/a de Familia',
    qualifyingWidower: 'Viudo/a Calificado/a'
  }
};

// Relationship labels mapping for translations
const RELATIONSHIP_TRANSLATION_KEY: Record<DependentRelationship, keyof typeof REVIEW_TRANSLATIONS.en> = {
  'son': 'son',
  'daughter': 'daughter',
  'stepson': 'stepson',
  'stepdaughter': 'stepdaughter',
  'foster_child': 'fosterChild',
  'brother': 'brother',
  'sister': 'sister',
  'half_brother': 'halfBrother',
  'half_sister': 'halfSister',
  'stepbrother': 'stepbrother',
  'stepsister': 'stepsister',
  'parent': 'parent',
  'grandparent': 'grandparent',
  'grandchild': 'grandchild',
  'niece': 'niece',
  'nephew': 'nephew',
  'aunt': 'aunt',
  'uncle': 'uncle',
  'other': 'other'
};

// Filing status translation mapping
const FILING_STATUS_TRANSLATION_KEY: Record<FilingStatus, keyof typeof REVIEW_TRANSLATIONS.en> = {
  'single': 'single',
  'married_filing_jointly': 'marriedFilingJointly',
  'married_filing_separately': 'marriedFilingSeparately',
  'head_of_household': 'headOfHousehold',
  'qualifying_widower': 'qualifyingWidower'
};

/** Parse pasted date text (MM/DD/YYYY, MM-DD-YYYY, MMDDYYYY, YYYY-MM-DD, etc.) into YYYY-MM-DD */
function parsePastedDate(text: string): string | null {
  const t = text.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // MM/DD/YYYY or MM-DD-YYYY
  let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, mo, day, yr] = m;
    return `${yr}-${mo.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // MMDDYYYY (8 digits)
  if (/^\d{8}$/.test(t)) {
    return `${t.slice(4, 8)}-${t.slice(0, 2)}-${t.slice(2, 4)}`;
  }
  return null;
}

const ClientInfoSection: Component<ClientInfoSectionProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<ActiveTab>('review');
  const [hasChanges, setHasChanges] = createSignal(false);
  const [message, setMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showQRGenerator, setShowQRGenerator] = createSignal(false);
  const [showQRCode, setShowQRCode] = createSignal(false);
  const [qrText, setQrText] = createSignal('');
  const [showIdScanner, setShowIdScanner] = createSignal(false);
  const [idScanMessage, setIdScanMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [externalScanInput, setExternalScanInput] = createSignal('');
  const [showExternalInput, setShowExternalInput] = createSignal(true); // Show external input by default
  const [reviewLang, setReviewLang] = createSignal<ReviewLanguage>('en');
  const [showSsn, setShowSsn] = createSignal(false);
  const [showSpouseSsn, setShowSpouseSsn] = createSignal(false);
  const [showBankAccount, setShowBankAccount] = createSignal(false);
  const [showRouting, setShowRouting] = createSignal(false);
  const [bankNameSuggestions, setBankNameSuggestions] = createSignal<string[]>([]);
  const [showBankSuggestions, setShowBankSuggestions] = createSignal(false);

  // Spouse linking state
  const [spouseSearchQuery, setSpouseSearchQuery] = createSignal('');
  const [spouseSearchResults, setSpouseSearchResults] = createSignal<TaxPortal[]>([]);
  const [showSpouseSearch, setShowSpouseSearch] = createSignal(false);
  const [isSearchingSpouse, setIsSearchingSpouse] = createSignal(false);


  const [showQRCodeM, setShowQRCodeM] = createSignal(false);
  const [qrTextM, setQrTextM] = createSignal(['']);

  // Address search state
  const [addressSearchQuery, setAddressSearchQuery] = createSignal('');
  const [addressSearchResults, setAddressSearchResults] = createSignal<AddressResult[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = createSignal(false);
  const [showAddressResults, setShowAddressResults] = createSignal(false);
  let addressSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Handle address selection
  const selectAddress = (result: AddressResult) => {
    props.onClientChange({
      address: result.street,
      city: result.city,
      state: result.state,
      zipCode: result.zip
    });
    setHasChanges(true);
    setAddressSearchQuery('');
    setAddressSearchResults([]);
    setShowAddressResults(false);
  };

  // Debounced address search using addressSearchService
  const handleAddressSearchInput = (query: string) => {
    setAddressSearchQuery(query);

    if (addressSearchTimeout) {
      clearTimeout(addressSearchTimeout);
    }

    if (query.length < 3) {
      setAddressSearchResults([]);
      setShowAddressResults(false);
      return;
    }

    addressSearchTimeout = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const results = await searchAddressApi(query, {
          city: props.client.city?.trim(),
          state: props.client.state?.trim(),
          zip: props.client.zipCode?.trim()
        });
        setAddressSearchResults(results);
        setShowAddressResults(results.length > 0);
      } catch (error) {
        devLog('Address search error:', error);
        setAddressSearchResults([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);
  };

  // Admin state for business transfer
  const [availableBusinesses, setAvailableBusinesses] = createSignal<Array<{id: string, name: string}>>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = createSignal(false);
  const [selectedBusinessId, setSelectedBusinessId] = createSignal<string>('');
  const [showTransferConfirm, setShowTransferConfirm] = createSignal(false);

  // Load available businesses for admin
  const loadAvailableBusinesses = async () => {
    if (!authStore.isAdmin()) return;
    setIsLoadingBusinesses(true);
    try {
      const businesses = await authStore.getAvailableBusinesses();
      setAvailableBusinesses(businesses);
      // Set current business as selected
      setSelectedBusinessId(props.client.businessId || authStore.getBusinessId());
    } catch (error) {
      devLog('Error loading businesses:', error);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // Handle business transfer
  const handleTransferBusiness = () => {
    const newBusinessId = selectedBusinessId();
    if (!newBusinessId || newBusinessId === props.client.businessId) {
      setShowTransferConfirm(false);
      return;
    }

    // Find business name for display
    const business = availableBusinesses().find(b => b.id === newBusinessId);

    props.onClientChange({ businessId: newBusinessId });
    setHasChanges(true);
    setShowTransferConfirm(false);
    setMessage({
      type: 'success',
      text: `Client will be transferred to "${business?.name || newBusinessId}" when saved`
    });
    setTimeout(() => setMessage(null), 5000);
  };

  // Load businesses when admin tab is shown
  createEffect(() => {
    if (activeTab() === 'admin' && authStore.isAdmin()) {
      loadAvailableBusinesses();
    }
  });

  // Search for clients to link as spouse
  const searchForSpouse = async (query: string) => {
    if (query.length < 2) {
      setSpouseSearchResults([]);
      return;
    }
    setIsSearchingSpouse(true);
    try {
      const allClients = await getTaxPortals();
      // Filter by name, exclude current client
      const filtered = allClients.filter(c =>
        c.id !== props.client.id &&
        (c.firstName?.toLowerCase().includes(query.toLowerCase()) ||
         c.lastName?.toLowerCase().includes(query.toLowerCase()) ||
         `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10);
      setSpouseSearchResults(filtered);
    } catch (err) {
      console.error('Error searching for spouse:', err);
    } finally {
      setIsSearchingSpouse(false);
    }
  };

  // Link spouse client
  const linkSpouse = (spouseClient: TaxPortal) => {
    props.onClientChange({
      linkedSpouseId: spouseClient.id,
      linkedSpouseName: `${spouseClient.firstName} ${spouseClient.lastName}`,
      // Fill spouse form with linked client's data
      spouse: {
        ...props.client.spouse,
        firstName: spouseClient.firstName || '',
        middleName: spouseClient.middleName || '',
        lastName: spouseClient.lastName || '',
        ssn: spouseClient.ssn || '',
        dateOfBirth: spouseClient.dateOfBirth || '',
        occupation: spouseClient.occupation || '',
        phone: spouseClient.phone || '',
      }
    });
    setHasChanges(true);
    setShowSpouseSearch(false);
    setSpouseSearchQuery('');
    setSpouseSearchResults([]);
  };

  // Unlink spouse
  const unlinkSpouse = () => {
    props.onClientChange({
      linkedSpouseId: null as any,  // Use null so it gets sent to server (undefined is stripped from JSON)
      linkedSpouseName: null as any
    });
    setHasChanges(true);
  };

  // Get translation helper
  const t = (key: keyof typeof REVIEW_TRANSLATIONS.en) => REVIEW_TRANSLATIONS[reviewLang()][key];

  // Helper for masking SSN
  const formatSsn = (ssn: string | undefined, show: boolean) => {
    if (!ssn) return '-';
    if (show) return ssn.length === 9 ? `${ssn.slice(0,3)}-${ssn.slice(3,5)}-${ssn.slice(5)}` : ssn;
    return `***-**-${ssn.slice(-4)}`;
  };

  // Helper for masking account numbers
  const formatAccountNumber = (num: string | undefined, show: boolean) => {
    if (!num) return '-';
    if (show) return num;
    return `****${num.slice(-4)}`;
  };


  // Track changes
  const updateField = <K extends keyof TaxPortal>(field: K, value: TaxPortal[K]) => {
    props.onClientChange({ [field]: value });
    setHasChanges(true);
    setMessage(null);
  };

  // Handle save
  const handleSave = async () => {
    try {
      await props.onSave();
      setHasChanges(false);
      setMessage({ type: 'success', text: 'Client information saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message || 'Failed to save' });
    }
  };

  // Add dependent
  const addDependent = () => {
    const newDependent: TaxDependent = {
      id: crypto.randomUUID(),
      firstName: '',
      lastName: '',
      relationship: 'son',
      ssn: '',
      dateOfBirth: ''
    };
    const currentDeps = props.client.dependents || [];
    updateField('dependents', [...currentDeps, newDependent]);
  };

  // Update dependent
  const updateDependent = (index: number, updates: Partial<TaxDependent>) => {
    const deps = [...(props.client.dependents || [])];
    deps[index] = { ...deps[index], ...updates };
    updateField('dependents', deps);
  };

  // Remove dependent
  const removeDependent = (index: number) => {
    const deps = [...(props.client.dependents || [])];
    deps.splice(index, 1);
    updateField('dependents', deps);
  };

  // Show spouse tab only for married filing statuses
  const showSpouseTab = () => {
    const status = props.client.filingStatus;
    return status === 'married_filing_jointly' || status === 'married_filing_separately';
  };

  // Handle ID barcode scan result (from IDScanner - PDF417/AAMVA)
  const handleBarcodeScan = (barcodeData: string, format: string) => {
    devLog('=== ID Barcode Scan ===');
    devLog('Format:', format);
    devLog('Raw barcode data length:', barcodeData.length);

    // Parse the AAMVA barcode data
    const parsedData = parseAAMVA(barcodeData);

    if (!parsedData) {
      devLog('Failed to parse barcode data');
      setIdScanMessage({
        type: 'error',
        text: 'Could not parse ID barcode. Check console for debug info. Try scanning again or enter manually.'
      });
      setTimeout(() => setIdScanMessage(null), 8000);
      return;
    }

    // Convert to idInfo format
    const idInfo = aamvaToTaxPortalIdInfo(parsedData);
    devLog('Converted idInfo:', idInfo);

    // Update the client's idInfo
    updateField('idInfo', idInfo);

    // Also update personal info fields if they're empty
    if (!props.client.firstName && idInfo.firstName) {
      updateField('firstName', idInfo.firstName);
    }
    if (!props.client.lastName && idInfo.lastName) {
      updateField('lastName', idInfo.lastName);
    }
    if (!props.client.middleName && idInfo.middleName) {
      updateField('middleName', idInfo.middleName);
    }
    if (!props.client.dateOfBirth && idInfo.dateOfBirth) {
      updateField('dateOfBirth', idInfo.dateOfBirth);
    }
    if (!props.client.address && idInfo.address) {
      updateField('address', idInfo.address);
    }
    if (!props.client.city && idInfo.city) {
      updateField('city', idInfo.city);
    }
    if (!props.client.state && idInfo.state) {
      updateField('state', idInfo.state);
    }
    if (!props.client.zipCode && idInfo.zipCode) {
      updateField('zipCode', idInfo.zipCode);
    }

    // Build a summary of what was found
    const foundFields: string[] = [];
    if (idInfo.firstName) foundFields.push('name');
    if (idInfo.idNumber) foundFields.push('ID#');
    if (idInfo.dateOfBirth) foundFields.push('DOB');
    if (idInfo.address) foundFields.push('address');
    if (idInfo.expirationDate) foundFields.push('exp');

    const nameDisplay = [idInfo.firstName, idInfo.lastName].filter(Boolean).join(' ') || 'Unknown';
    setIdScanMessage({
      type: 'success',
      text: `ID scanned: ${nameDisplay}. Found: ${foundFields.join(', ') || 'partial data'}`
    });
    setTimeout(() => setIdScanMessage(null), 6000);

    // Close the scanner
    setShowIdScanner(false);
  };

  // Handle MRZ scan result (from IDScanner - passport/ID MRZ zone)
  const handleMRZScan = (mrzData: MRZData) => {
    devLog('=== MRZ Scan ===');
    devLog('MRZ Data:', mrzData);

    // Build idInfo from MRZ data
    const idInfo: TaxPortal['idInfo'] = {
      idNumber: mrzData.documentNumber,
      idState: mrzData.issuingCountry,
      idType: mrzData.documentType === 'passport' ? 'passport' : 'state_id',
      firstName: mrzData.firstName,
      middleName: mrzData.middleName,
      lastName: mrzData.lastName,
      dateOfBirth: mrzData.dateOfBirth,
      gender: mrzData.gender === 'unknown' ? undefined : mrzData.gender,
      expirationDate: mrzData.expirationDate,
      country: mrzData.nationality
    };

    // Update the client's idInfo
    updateField('idInfo', idInfo);

    // Also update personal info fields if they're empty
    if (!props.client.firstName && mrzData.firstName) {
      updateField('firstName', mrzData.firstName);
    }
    if (!props.client.lastName && mrzData.lastName) {
      updateField('lastName', mrzData.lastName);
    }
    if (!props.client.middleName && mrzData.middleName) {
      updateField('middleName', mrzData.middleName);
    }
    if (!props.client.dateOfBirth && mrzData.dateOfBirth) {
      updateField('dateOfBirth', mrzData.dateOfBirth);
    }

    // Build a summary of what was found
    const foundFields: string[] = [];
    if (mrzData.firstName) foundFields.push('name');
    if (mrzData.documentNumber) foundFields.push('doc#');
    if (mrzData.dateOfBirth) foundFields.push('DOB');
    if (mrzData.expirationDate) foundFields.push('exp');
    if (mrzData.nationality) foundFields.push('nationality');

    const docType = mrzData.documentType === 'passport' ? 'Passport' : 'ID';
    const nameDisplay = [mrzData.firstName, mrzData.lastName].filter(Boolean).join(' ') || 'Unknown';
    setIdScanMessage({
      type: 'success',
      text: `${docType} scanned: ${nameDisplay}. Found: ${foundFields.join(', ') || 'partial data'}`
    });
    setTimeout(() => setIdScanMessage(null), 6000);

    // Close the scanner
    setShowIdScanner(false);
  };

  // Handle external scanner input (USB scanner or paste)
  const handleExternalScanSubmit = () => {
    const input = externalScanInput().trim();
    if (!input) {
      setIdScanMessage({ type: 'error', text: 'Please scan or paste barcode data first.' });
      setTimeout(() => setIdScanMessage(null), 3000);
      return;
    }

    // Process the input as barcode data
    handleBarcodeScan(input, 'EXTERNAL');

    // Clear the input after processing
    setExternalScanInput('');
  };

  // Handle keydown for external input (Enter to submit)
  const handleExternalInputKeyDown = (e: KeyboardEvent) => {
    // USB barcode scanners typically send Enter after the barcode
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExternalScanSubmit();
    }
  };



   // Generate QR text from document based on type
  const generateChildDocumentQRText = (c: any): string => {
    
     return [
          c.firstName, '|',
          c.middleName || "", '|',
          c.lastName, '|', 
          '|',
          ssnForQR(c.ssn), '|',
          '|', 
          '|', 
          '|', 
          c?.relationship || '','|', 
          '12','|', 
          formatDateMMDDYYYY(c.dateOfBirth) || "", '|',
          '|', 
          '|',
        ].join('')
  }


const handleSChildhowDocumentQR = (doc: any) => {
    const text = generateChildDocumentQRText(doc);
    setQrText(text);
    setShowQRCode(true);
  };




   // Generate QR text from document based on type
  const generateTPQRText = (c: any): string => {
    
     let tp =  [
          c.firstName, '|',
          c.middleName || "", '|',
          c.lastName, '|', '|',
          ssnForQR(c.ssn), '|',
           '|',
          formatDateMMDDYYYY(c.dateOfBirth) || "", '|',
          c?.occupation || "",'|',
          '|',
          c.phone,'|', 
          '|', '|', '|','|', '|', '|','|','|', 
        ].join('')

        //devLog(c)
        let spouse = ''
        if(c.filingStatus==="married_filing_jointly"){
          spouse = [
            '|', '|',
            c.spouse?.firstName, '|',
            c.spouse?.middleName || "", '|',
            c.spouse?.lastName, '|', '|',
            ssnForQR(c.spouse?.ssn), '|',
            '|',
            formatDateMMDDYYYY(c.spouse?.dateOfBirth) || "", '|',
            c.spouse?.occupation || "",'|',
            '|',
            c.spouse?.phone, '|', 
            '|','|','|','|','|','|','|','|','|','|',
          ].join('')
        }


        let address =  [
          c.address, '|', 
          '|', 
          '|', 
          c.zipCode,
          '|', '|','|',
          '|','|',
          //c.phone
        ].join('')


        return `${tp}${spouse}${address}`

  }


const handleTaxPayerQR = (doc: any) => {
    const text = generateTPQRText(doc);
    setQrText(text);
    setShowQRCode(true);
  };





    // Handle show QR code for document
    const handleShowMultiDocumentQR = (doc:any) => {
      
      let payerTxt = [
          ssnForQR(props.client?.ssn), '|',
          ssnForQR(props.client?.ssn), '|',
          props.client?.firstName, '|',
          props.client.lastName,
      ].join('') || '';
  
      
  
      let localTxt = [
              "",'|',
              formatDateMMDDYYYY(props.client.dateOfBirth) || "", '|',
              props.client?.occupation || "",'|',
              '|',
              props.client.phone,'|', 
      ].join('') || ''
  
      let fNmTxt = [
            props.client?.firstName, props.client?.middleName?.[0] || "", props.client.lastName,
      ].join(' ') || ''


       let addressTxt = [
                    props.client.address, '|','|',
                    props.client.apt,'|',
                    props.client.zipCode,'|', 
                    ].join('') || ''


    /* 
    let federalTxt = [
          props.client?.firstName, '|',
          props.client.middleName?.[0]  || "", '|',
          props.client.lastName, '|', '|',
          ssnForQR(props.client?.ssn), '|',
          '|',
          formatDateMMDDYYYY(props.client.dateOfBirth) || "", '|',
          props.client?.occupation || "",'|',
          '|',
          props.client.phone,'|', 
      ].join('') || '';
     */

let arrr = [payerTxt, localTxt, addressTxt, ]

      if(props.client?.spouse?.firstName){

        let SpsTxt1 = [
            props.client?.spouse?.firstName, '|',
            props.client.spouse?.middleName?.[0] || "", '|',
            props.client.spouse?.lastName, '|', '|',
            ssnForQR(props.client?.spouse?.ssn), '|',
            '|',
            formatDateMMDDYYYY(props.client.spouse?.dateOfBirth) || "", '|',
            props.client?.spouse?.occupation || "",'|',
            '|',
            props.client.spouse?.phone,'|', 
          
        ].join('') || '';
    
        let spfNmTxt = [
              props.client?.spouse?.firstName, props.client?.spouse?.middleName?.[0] || "", props.client?.spouse?.lastName,
        ].join(' ') || ''

        arrr.push(SpsTxt1);
        arrr.push(spfNmTxt);
        
      }
      arrr.push(fNmTxt);

      


      setQrTextM(arrr);
      setShowQRCodeM(true);
    };



    // Handle show QR code for document
    const handleShowMultiSpouseQR = (doc:any) => {
      
      let Txt1 = [
          props.client?.spouse?.firstName, '|',
          props.client.spouse?.middleName?.[0] || "", '|',
          props.client.spouse?.lastName, '|', '|',
          ssnForQR(props.client?.spouse?.ssn), '|',
          '|',
          formatDateMMDDYYYY(props.client.spouse?.dateOfBirth) || "", '|',
          props.client?.spouse?.occupation || "",'|',
          '|',
          props.client.spouse?.phone,'|', 
        
      ].join('') || '';
  
      let fNmTxt = [
            props.client?.spouse?.firstName, props.client?.spouse?.middleName?.[0] || "", props.client?.spouse?.lastName,
      ].join(' ') || ''

      setQrTextM([Txt1, fNmTxt ]);
      setShowQRCodeM(true);
    };



   // Generate QR text from document based on type
  const generateTPBankQRText = (c: any): string => {
     
     return [
          c.bankName, '|',
          c.routingNumber || "", '|',
          c.routingNumber || "", '|',
          c.accountNumber || "", '|',
          c.accountNumber || "", '|',
        ].join('')
  }


const handleTaxPayerBankQR = (doc: any) => {
    const text = generateTPBankQRText(doc);
    setQrText(text);
    setShowQRCode(true);
};

const handleTextQR = (text: string) => {
    setQrText(text);
    setShowQRCode(true);
};


// 

  // Styles
  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '1.5rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'flex-wrap': 'wrap' as const,
    gap: '1rem'
  };

  const titleStyle = {
    'font-size': '1.25rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    margin: '0'
  };

  const tabContainerStyle = {
    display: 'flex',
    gap: '0.5rem',
    'border-bottom': '2px solid var(--border-color)',
    'padding-bottom': '0'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    'font-size': '0.9375rem',
    'font-weight': isActive ? '600' : '500',
    color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    'border-bottom': isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
    cursor: 'pointer',
    'margin-bottom': '-2px',
    transition: 'all 0.2s'
  });

  const formGridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem',
    'margin-top': '1.5rem'
  };

  const fieldGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.5rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)'
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    'font-size': '0.9375rem',
    border: '1px solid var(--border-color)',
    'border-radius': '8px',
    background: 'var(--surface-color)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'var(--surface-alt)',
    'border-radius': '8px'
  };

  const checkboxStyle = {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  };

  const dependentCardStyle = {
    padding: '1.25rem',
    border: '1px solid var(--border-color)',
    'border-radius': '12px',
    background: 'var(--surface-alt)',
    'margin-bottom': '1rem'
  };

  const dependentHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '1rem'
  };

  const removeButtonStyle = {
    padding: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    'border-radius': '6px',
    color: '#ef4444',
    cursor: 'pointer'
  };

  const addButtonStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem',
    padding: '1rem',
    border: '2px dashed var(--border-color)',
    'border-radius': '12px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    'font-size': '0.9375rem',
    'font-weight': '500',
    transition: 'all 0.2s'
  };

  const saveButtonStyle = (disabled: boolean) => ({
    padding: '0.75rem 1.5rem',
    'font-size': '0.9375rem',
    'font-weight': '600',
    'border-radius': '8px',
    border: 'none',
    background: disabled ? 'var(--surface-alt)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: disabled ? 'var(--text-secondary)' : 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    'box-shadow': disabled ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  });

  const messageStyle = (type: 'success' | 'error') => ({
    padding: '0.75rem 1rem',
    'border-radius': '8px',
    'font-size': '0.875rem',
    background: type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: type === 'success' ? '#22c55e' : '#ef4444',
    border: `1px solid ${type === 'success' ? '#22c55e' : '#ef4444'}`,
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  });

  const sectionTitleStyle = {
    'font-size': '1rem',
    'font-weight': '600',
    color: 'var(--text-primary)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Client Information</h3>
          <p style={{ 'font-size': '0.875rem', color: 'var(--text-secondary)', 'margin-top': '0.25rem' }}>
            Update personal details, spouse information, and dependents
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', 'align-items': 'center' }}>
          {/* QR Code Generator Button 
          <button
            style={{
              padding: '0.75rem 1rem',
              'font-size': '0.9375rem',
              'font-weight': '500',
              'border-radius': '8px',
              border: '1px solid var(--border-color)',
              background: 'white',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
            onClick={() =>  handleTaxPayerQR(props.client)}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--surface-alt)';
              e.currentTarget.style.borderColor = 'var(--primary-color)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR Code
          </button>
          */}
          {/* Save Button */}
          <button
            style={saveButtonStyle(!hasChanges() || !!props.isSaving)}
            onClick={handleSave}
            disabled={!hasChanges() || !!props.isSaving}
          >
            <Show when={props.isSaving} fallback={
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Save Changes
              </>
            }>
              <svg style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </Show>
          </button>
        </div>
      </div>

      {/* Message */}
      <Show when={message()}>
        <div style={messageStyle(message()!.type)}>
          {message()!.text}
        </div>
      </Show>

      {/* Tabs */}
      <div style={tabContainerStyle}>
        <button
          style={tabStyle(activeTab() === 'review')}
          onClick={() => setActiveTab('review')}
        >
          Review Info
        </button>
        <button
          style={tabStyle(activeTab() === 'personal')}
          onClick={() => setActiveTab('personal')}
        >
          Personal Info
        </button>
        <Show when={showSpouseTab()}>
          <button
            style={tabStyle(activeTab() === 'spouse')}
            onClick={() => setActiveTab('spouse')}
          >
            Spouse Info
          </button>
        </Show>
        <button
          style={tabStyle(activeTab() === 'dependents')}
          onClick={() => setActiveTab('dependents')}
        >
          Dependents ({props.client.dependents?.length || 0})
        </button>
        <button
          style={tabStyle(activeTab() === 'tax')}
          onClick={() => setActiveTab('tax')}
        >
          Tax Details
        </button>
        <Show when={authStore.isAdmin()}>
          <button
            style={{
              ...tabStyle(activeTab() === 'admin'),
              color: activeTab() === 'admin' ? '#dc2626' : '#9ca3af',
              'border-color': activeTab() === 'admin' ? '#dc2626' : 'transparent'
            }}
            onClick={() => setActiveTab('admin')}
          >
            🔒 Admin
          </button>
        </Show>
      </div>

      {/* Review Info Tab - Card view for customer review */}
      <Show when={activeTab() === 'review'}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem', background: '#f0f0eb', padding: '1.5rem', 'border-radius': '16px', margin: '-1rem', 'margin-top': '0' }}>
          {/* Previous Year Banner for returning clients */}
          <Show when={props.isReturningClient && props.previousYearData}>
            <PreviousYearBanner
              client={props.client}
              previousYearData={props.previousYearData!}
              changes={props.yearOverYearChanges || []}
            />
          </Show>

          {/* Header with Language Toggle */}
          <div style={{
            background: '#ffffff',
            padding: '1.5rem',
            'border-radius': '12px',
            border: '1px solid #e3e8ee',
            position: 'relative'
          }}>
            {/* Controls: Language Toggle + Download PDF */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              display: 'flex',
              gap: '0.5rem',
              'align-items': 'center'
            }}>
              {/* Download PDF Button */}
              <button
                onClick={() => downloadClientReviewPdf(props.client, reviewLang(), props.linkedSpouse)}
                style={{
                  padding: '0.375rem 0.75rem',
                  'border-radius': '8px',
                  border: '1px solid #e3e8ee',
                  background: '#fafafa',
                  color: '#1a1a1a',
                  'font-size': '0.8125rem',
                  'font-weight': '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.375rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f0f0eb'}
                onMouseOut={(e) => e.currentTarget.style.background = '#fafafa'}
                title={reviewLang() === 'es' ? 'Descargar PDF' : 'Download PDF'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                PDF
              </button>

              {/* Language Toggle */}
              <div style={{
                display: 'flex',
                gap: '0.25rem',
                background: '#f0f0eb',
                'border-radius': '8px',
                padding: '0.25rem',
                border: '1px solid #e3e8ee'
              }}>
                <button
                  onClick={() => setReviewLang('en')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    'border-radius': '6px',
                    border: 'none',
                    background: reviewLang() === 'en' ? 'white' : 'transparent',
                    color: reviewLang() === 'en' ? '#1a1a1a' : '#7a7a7a',
                    'font-size': '0.8125rem',
                    'font-weight': '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setReviewLang('es')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    'border-radius': '6px',
                    border: 'none',
                    background: reviewLang() === 'es' ? 'white' : 'transparent',
                    color: reviewLang() === 'es' ? '#1a1a1a' : '#7a7a7a',
                    'font-size': '0.8125rem',
                    'font-weight': '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ES
                </button>
              </div>
            </div>
            <div style={{ 'text-align': 'center' }}>
              <h2 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.375rem', 'font-weight': '600', color: '#1a1a1a' }}>
                {t('clientInfoReview')}
              </h2>
              <p style={{ margin: 0, color: '#7a7a7a', 'font-size': '0.9375rem' }}>
                {t('reviewSubtitle')}
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1rem'
          }}>



              {/* Filing Status Card */}
            <div style={{
              background: 'white',
              'border-radius': '12px',
              border: '1px solid #e3e8ee',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#fafafa',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.75rem',
                'border-bottom': '1px solid #e3e8ee'
              }}>
                <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('filingInfo')}</span>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('taxYear')}</span>
                    <span style={{
                      color: '#1a1a1a',
                      'font-weight': '500',
                      background: '#f0f0eb',
                      padding: '0.25rem 0.75rem',
                      'border-radius': '12px',
                      'font-size': '0.875rem',
                      border: '1px solid #e3e8ee'
                    }}>{props.client.taxYear || new Date().getFullYear()}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('filingStatus')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '600', 'text-align': 'right' }}>
                      {props.client.filingStatus ? t(FILING_STATUS_TRANSLATION_KEY[props.client.filingStatus]) : '-'}
                    </span>
                  </div>
                </div>
              </div>
           

            {/* Tax Results Card (Refund/Owe) */}
            <Show when={props.client.federalRefund || props.client.federalOwe || (props.client.stateReturns && props.client.stateReturns.length > 0)}>
            
                <div style={{
                  background: props.client.federalRefund || (props.client.stateReturns?.some(s => s.refund)) ? '#dcfce7' : '#fef2f2',
                  padding: '0.875rem 1.25rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.75rem',
                  'border-bottom': '1px solid #e3e8ee'
                }}>
                  <svg viewBox="0 0 20 20" fill={props.client.federalRefund ? '#16a34a' : '#dc2626'} style={{ width: '18px', height: '18px' }}>
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('taxResults')}</span>
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                    {/* Federal */}
                    <div style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      'border-radius': '8px'
                    }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '600' }}>FEDERAL</span>
                      <Show when={props.client.federalRefund} fallback={
                        <Show when={props.client.federalOwe}>
                          <span style={{ color: '#dc2626', 'font-weight': '700', 'font-size': '1.125rem' }}>
                            -{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.client.federalOwe || 0)}
                          </span>
                        </Show>
                      }>
                        <span style={{ color: '#16a34a', 'font-weight': '700', 'font-size': '1.125rem' }}>
                          +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.client.federalRefund || 0)}
                        </span>
                      </Show>
                    </div>

                    {/* State Returns */}
                    <For each={props.client.stateReturns || []}>
                      {(stateReturn) => (
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          padding: '0.75rem',
                          background: '#f8fafc',
                          'border-radius': '8px'
                        }}>
                          <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '600' }}>
                            {stateReturn.state} {t('state')}
                          </span>
                          <Show when={stateReturn.refund} fallback={
                            <Show when={stateReturn.owe}>
                              <span style={{ color: '#dc2626', 'font-weight': '700', 'font-size': '1.125rem' }}>
                                -{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stateReturn.owe || 0)}
                              </span>
                            </Show>
                          }>
                            <span style={{ color: '#16a34a', 'font-weight': '700', 'font-size': '1.125rem' }}>
                              +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stateReturn.refund || 0)}
                            </span>
                          </Show>
                        </div>
                      )}
                    </For>

                    {/* Total */}
                    <Show when={props.client.totalRefund || props.client.totalOwe}>
                      <div style={{
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        padding: '0.75rem 1rem',
                        background: props.client.totalRefund ? '#dcfce7' : '#fef2f2',
                        'border-radius': '8px',
                        'border-top': '2px solid #e5e7eb',
                        'margin-top': '0.5rem'
                      }}>
                        <span style={{ color: '#1a1a1a', 'font-size': '0.875rem', 'font-weight': '700' }}>
                          {props.client.totalRefund ? t('totalRefund') : t('totalOwe')}
                        </span>
                        <span style={{
                          color: props.client.totalRefund ? '#16a34a' : '#dc2626',
                          'font-weight': '800',
                          'font-size': '1.25rem'
                        }}>
                          {props.client.totalRefund
                            ? `+${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.client.totalRefund)}`
                            : `-${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.client.totalOwe || 0)}`
                          }
                        </span>
                      </div>
                    </Show>
                  </div>
                </div>
            
              </Show>
            </div>

            {/* Taxpayer Card */}
            <div style={{
              background: 'white',
              'border-radius': '12px',
              border: '1px solid #e3e8ee',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#fafafa',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.75rem',
                'border-bottom': '1px solid #e3e8ee'
              }}>
                <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
                <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('taxpayer')}</span>
                  <QrButton text={""} 
                  handle={handleShowMultiDocumentQR} 
                  label='' 
                />
                
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('fullName')}</span>
                    <QrButton text={[
                        props.client.firstName,props.client.lastName].join(' ') } 
                      handle={handleTextQR} 
                      label='' 
                    />
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '600', 'text-align': 'right' }}>
                      {[props.client.firstName, props.client.middleName, props.client.lastName, props.client.suffix].filter(Boolean).join(' ') || '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('ssn')}</span>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-family': 'monospace' }}>
                        {formatSsn(props.client.ssn, showSsn())}
                      </span>
                      <Show when={props.client.ssn}>
                        <button
                          onClick={() => setShowSsn(!showSsn())}
                          style={{
                            padding: '0.125rem 0.5rem',
                            'font-size': '0.6875rem',
                            'font-weight': '500',
                            'border-radius': '10px',
                            border: '1px solid #e3e8ee',
                            background: showSsn() ? '#1a1a1a' : '#f0f0eb',
                            color: showSsn() ? 'white' : '#7a7a7a',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {showSsn() ? t('hide') : t('show')}
                        </button>
                      </Show>
                    </div>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('dateOfBirth')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>
                      {formatDateSafe(props.client.dateOfBirth, reviewLang() === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('occupation')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.occupation || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('email')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-size': '0.875rem' }}>{props.client.email || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('phone')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div style={{
              background: 'white',
              'border-radius': '12px',
              border: '1px solid #e3e8ee',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#fafafa',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.75rem',
                'border-bottom': '1px solid #e3e8ee'
              }}>
                <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('address')}</span>
                <QrButton text={[
                    props.client.address, '|','|',
                    props.client.apt,'|',
                    props.client.zipCode,'|', 
                    ].join('') || ''} 
                  handle={handleTextQR} 
                  label='' 
                />
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('street')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'text-align': 'right', 'max-width': '60%' }}>
                      {[props.client.address, props.client.apt ? `Apt ${props.client.apt}` : ''].filter(Boolean).join(', ') || '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('city')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.city || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('state')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.state || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('zipCode')}</span>
                    <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-family': 'monospace' }}>{props.client.zipCode || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spouse Card (if married) */}
            <Show when={showSpouseTab()}>
              <div style={{
                background: 'white',
                'border-radius': '12px',
                border: '1px solid #e3e8ee',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#fafafa',
                  padding: '0.875rem 1.25rem',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.75rem',
                  'border-bottom': '1px solid #e3e8ee'
                }}>
                  <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('spouse')}</span>
                  
                 <QrButton text={''} 
                  handle={handleShowMultiSpouseQR} 
                  label='' 
                />
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('fullName')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '600', 'text-align': 'right' }}>
                        {[props.client.spouse?.firstName, props.client.spouse?.middleName, props.client.spouse?.lastName].filter(Boolean).join(' ') || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('ssn')}</span>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-family': 'monospace' }}>
                          {formatSsn(props.client.spouse?.ssn, showSpouseSsn())}
                        </span>
                        <Show when={props.client.spouse?.ssn}>
                          <button
                            onClick={() => setShowSpouseSsn(!showSpouseSsn())}
                            style={{
                              padding: '0.125rem 0.5rem',
                              'font-size': '0.6875rem',
                              'font-weight': '500',
                              'border-radius': '10px',
                              border: '1px solid #e3e8ee',
                              background: showSpouseSsn() ? '#1a1a1a' : '#f0f0eb',
                              color: showSpouseSsn() ? 'white' : '#7a7a7a',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {showSpouseSsn() ? t('hide') : t('show')}
                          </button>
                        </Show>
                      </div>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('dateOfBirth')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>
                        {formatDateSafe(props.client.spouse?.dateOfBirth, reviewLang() === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('occupation')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.spouse?.occupation || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('phone')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.spouse?.phone || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

          

            {/* ID Information Card */}
            <div style={{
              background: 'white',
              'border-radius': '12px',
              border: '1px solid #e3e8ee',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#fafafa',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.75rem',
                'border-bottom': '1px solid #e3e8ee'
              }}>
                <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm4 0a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm-4 3a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm4 0a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('idInfo')}</span>
                <QrButton text={[
                    props.client.idInfo?.idNumber || "", '|',
                    props.client.idInfo?.idState || "", '|',
                    formatDateMMDDYYYY(props.client.idInfo?.issueDate) || "", '|','|',
                    formatDateMMDDYYYY(props.client.idInfo?.expirationDate) || "", '|',
                    ].join('') || ''} 
                  handle={handleTextQR} 
                  label='' 
                />
              </div>
              <div style={{ padding: '1.25rem' }}>
                <Show when={props.client.idInfo?.idNumber} fallback={
                  <div style={{ color: 'var(--text-secondary)', 'font-style': 'italic', 'text-align': 'center', padding: '1rem' }}>
                    {t('noIdInfo')}
                  </div>
                }>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('idType')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>
                        {props.client.idInfo?.idType === 'drivers_license' ? t('driversLicense') :
                         props.client.idInfo?.idType === 'state_id' ? t('stateId') :
                         props.client.idInfo?.idType === 'passport' ? t('passport') : t('other')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('idNumber')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-family': 'monospace' }}>
                        {props.client.idInfo?.idNumber || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('issuingState')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.idInfo?.idState || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('issueDate')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>
                        {formatDateSafe(props.client.idInfo?.issueDate, reviewLang() === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('expiration')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>
                        {formatDateSafe(props.client.idInfo?.expirationDate, reviewLang() === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </Show>
              </div>
            </div>

            {/* Bank Information Card */}
            <div style={{
              background: 'white',
              'border-radius': '12px',
              border: '1px solid #e3e8ee',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#fafafa',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                'align-items': 'center',
                gap: '0.75rem',
                'border-bottom': '1px solid #e3e8ee'
              }}>
                <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
                </svg>
                <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('bankAccount')}</span>
                <QrButton text={[
                    props.client.bankInfo?.bankName || "", '|',
                    props.client.bankInfo?.routingNumber || '','|',
                    props.client.bankInfo?.routingNumber || '','|',
                    props.client.bankInfo?.accountNumber || '','|',
                    props.client.bankInfo?.accountNumber || ''
                    ].join('') || ''} 
                  handle={handleTextQR} 
                  label='' 
                />
              </div>
              <div style={{ padding: '1.25rem' }}>
                <Show when={props.client.bankInfo?.accountNumber} fallback={
                  <div style={{ color: 'var(--text-secondary)', 'font-style': 'italic', 'text-align': 'center', padding: '1rem' }}>
                    {t('noBankInfo')}
                  </div>
                }>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('bankName')}</span>
                      <span style={{ color: 'var(--text-primary)', 'font-weight': '600' }}>{props.client.bankInfo?.bankName || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('accountType')}</span>
                      <span style={{
                        color: '#1a1a1a',
                        'font-weight': '500',
                        background: '#f0f0eb',
                        padding: '0.125rem 0.5rem',
                        'border-radius': '10px',
                        'font-size': '0.75rem',
                        border: '1px solid #e3e8ee'
                      }}>{props.client.bankInfo?.accountType === 'checking' ? t('checking') : props.client.bankInfo?.accountType === 'savings' ? t('savings') : '-'}</span>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('routingNumber')}</span>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-family': 'monospace' }}>
                          {formatAccountNumber(props.client.bankInfo?.routingNumber, showRouting())}
                        </span>
                        <Show when={props.client.bankInfo?.routingNumber}>
                          <button
                            onClick={() => setShowRouting(!showRouting())}
                            style={{
                              padding: '0.125rem 0.5rem',
                              'font-size': '0.6875rem',
                              'font-weight': '500',
                              'border-radius': '10px',
                              border: '1px solid #e3e8ee',
                              background: showRouting() ? '#1a1a1a' : '#f0f0eb',
                              color: showRouting() ? 'white' : '#7a7a7a',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {showRouting() ? t('hide') : t('show')}
                          </button>
                        </Show>
                      </div>
                    </div>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('accountNumber')}</span>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-primary)', 'font-weight': '500', 'font-family': 'monospace' }}>
                          {formatAccountNumber(props.client.bankInfo?.accountNumber, showBankAccount())}
                        </span>
                        <Show when={props.client.bankInfo?.accountNumber}>
                          <button
                            onClick={() => setShowBankAccount(!showBankAccount())}
                            style={{
                              padding: '0.125rem 0.5rem',
                              'font-size': '0.6875rem',
                              'font-weight': '500',
                              'border-radius': '10px',
                              border: '1px solid #e3e8ee',
                              background: showBankAccount() ? '#1a1a1a' : '#f0f0eb',
                              color: showBankAccount() ? 'white' : '#7a7a7a',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {showBankAccount() ? t('hide') : t('show')}
                          </button>
                        </Show>
                      </div>
                    </div>
                    <Show when={props.client.bankInfo?.accountHolderName}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', 'font-size': '0.8125rem', 'font-weight': '500' }}>{t('accountHolder')}</span>
                        <span style={{ color: 'var(--text-primary)', 'font-weight': '500' }}>{props.client.bankInfo?.accountHolderName}</span>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Dependents Section - Full Width (includes spouse dependents for MFJ) */}
          {(() => {
            // Merge dependents from taxpayer and linked spouse (for MFJ)
            const isMFJ = props.client.filingStatus === 'married_filing_jointly';
            const taxpayerDeps = props.client.dependents || [];

            // Get spouse dependents avoiding duplicates
            const spouseDeps = (isMFJ && props.linkedSpouse?.dependents)
              ? props.linkedSpouse.dependents.filter(spouseDep => {
                  return !taxpayerDeps.some(d =>
                    (d.ssn && spouseDep.ssn && d.ssn === spouseDep.ssn) ||
                    (d.firstName?.toLowerCase() === spouseDep.firstName?.toLowerCase() &&
                     d.lastName?.toLowerCase() === spouseDep.lastName?.toLowerCase())
                  );
                }).map(dep => ({ ...dep, _fromSpouse: true as const }))
              : [];

            const allDependents = [
              ...taxpayerDeps.map(dep => ({ ...dep, _fromSpouse: false as const })),
              ...spouseDeps
            ];

            return (
              <div style={{
                background: 'white',
                'border-radius': '12px',
                border: '1px solid #e3e8ee',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#fafafa',
                  padding: '0.875rem 1.25rem',
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  'border-bottom': '1px solid #e3e8ee'
                }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                    <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <span style={{ color: '#1a1a1a', 'font-weight': '600', 'font-size': '0.9375rem' }}>{t('dependents')}</span>
                  </div>
                  <span style={{
                    background: '#f0f0eb',
                    color: '#1a1a1a',
                    padding: '0.25rem 0.75rem',
                    'border-radius': '12px',
                    'font-size': '0.875rem',
                    'font-weight': '500',
                    border: '1px solid #e3e8ee'
                  }}>{allDependents.length}</span>
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <Show when={props.client.hasNoDependents && !spouseDeps.length}>
                    <div style={{
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      gap: '0.5rem',
                      padding: '1.5rem',
                      background: '#f0f0eb',
                      'border-radius': '10px',
                      color: '#1a1a1a',
                      border: '1px solid #e3e8ee'
                    }}>
                      <svg viewBox="0 0 20 20" fill="#7a7a7a" style={{ width: '18px', height: '18px' }}>
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span style={{ 'font-weight': '500' }}>{t('noDependentsConfirmed')}</span>
                    </div>
                  </Show>
                  <Show when={!props.client.hasNoDependents && allDependents.length === 0}>
                    <div style={{ color: 'var(--text-secondary)', 'font-style': 'italic', 'text-align': 'center', padding: '1.5rem' }}>
                      {t('noDependentsAdded')}
                    </div>
                  </Show>
                  <Show when={allDependents.length > 0}>
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1rem'
                    }}>
                      <For each={allDependents}>
                        {(dep, index) => (
                          <div style={{
                            padding: '1rem',
                            background: dep._fromSpouse ? '#faf5ff' : '#fafafa',
                            'border-radius': '10px',
                            border: dep._fromSpouse ? '1px solid #e9d5ff' : '1px solid #e3e8ee'
                          }}>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '0.875rem' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                'border-radius': '50%',
                                background: dep._fromSpouse ? '#f3e8ff' : '#f0f0eb',
                                border: dep._fromSpouse ? '1px solid #e9d5ff' : '1px solid #e3e8ee',
                                display: 'flex',
                                'align-items': 'center',
                                'justify-content': 'center',
                                color: dep._fromSpouse ? '#7c3aed' : '#1a1a1a',
                                'font-weight': '600',
                                'font-size': '0.8125rem'
                              }}>{index() + 1}</div>
                              <div>
                                <div style={{display: 'flex', 'align-items': 'center'}}>
                                  <div style={{ 'font-weight': '600', color: 'var(--text-primary)', "margin-right": '8px' }}>
                                    {[dep.firstName, dep.lastName].filter(Boolean).join(' ') || 'Unnamed'}
                                  </div>
                                  <Show when={dep._fromSpouse}>
                                    <span style={{
                                      'font-size': '0.625rem',
                                      color: '#7c3aed',
                                      'font-weight': '600',
                                      background: '#f3e8ff',
                                      padding: '0.125rem 0.375rem',
                                      'border-radius': '4px',
                                      'margin-right': '8px'
                                    }}>SPOUSE</span>
                                  </Show>
                                  <QrButton text={[
                                      dep.firstName, '|',
                                      dep.middleName || "", '|',
                                      dep.lastName, '|',
                                      '|',
                                      ssnForQR(dep?.ssn), '|',
                                      '|',
                                      '|',
                                      '|',
                                      dep?.relationship || '','|',
                                      '12','|',
                                      formatDateMMDDYYYY(dep.dateOfBirth) || "", '|',
                                    ].join('') || ''}
                                  handle={handleTextQR}
                                  label=''
                                />
                                </div>

                              <div style={{ 'font-size': '0.75rem', color: 'var(--text-secondary)' }}>
                                {t(RELATIONSHIP_TRANSLATION_KEY[dep.relationship]) || dep.relationship || '-'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', 'font-size': '0.875rem' }}>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{t('ssn')}</span>
                              <span style={{ color: 'var(--text-primary)', 'font-family': 'monospace' }}>
                                {dep.ssn ? `***-**-${dep.ssn.slice(-4)}` : '-'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{t('dateOfBirth')}</span>
                              <span style={{ color: 'var(--text-primary)' }}>
                                {formatDateSafe(dep.dateOfBirth, reviewLang() === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <Show when={dep.monthsLivedWithYou}>
                              <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{t('monthsLived')}</span>
                                <span style={{ color: 'var(--text-primary)' }}>{dep.monthsLivedWithYou}</span>
                              </div>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          );
          })()}

         
        </div>
      </Show>



      {/* Personal Info Tab */}
      <Show when={activeTab() === 'personal'}>
        <Card>
          <div style={sectionTitleStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#3b82f6' }}>
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            Personal Information
            <QrButton text={[
                props.client?.firstName, '|',
                props.client.middleName || "", '|',
                props.client.lastName, '|', '|',
                ssnForQR(props.client?.ssn), '|',
                '|',
                formatDateMMDDYYYY(props.client.dateOfBirth) || "", '|',
                props.client?.occupation || "",'|',
                '|',
                props.client.phone,'|', 
                ].join('') || ''} 
              handle={handleTextQR} 
              label='' 
            />
          </div>


          

          <div style={formGridStyle}>
            <div style={fieldGroupStyle}>
              <QrButton text={(props.client.firstName +( props.client.middleName ? " "+props.client.middleName +" ":' ')+ props.client.lastName) || ''} handle={handleTextQR} label='First Name *' />
         
             
              <input
                style={inputStyle}
                type="text"
                value={props.client.firstName || ''}
                onInput={(e) => updateField('firstName', e.currentTarget.value)}
                placeholder="First name"
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Middle Name</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.middleName || ''}
                onInput={(e) => updateField('middleName', e.currentTarget.value)}
                placeholder="Middle name"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Last Name *</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.lastName || ''}
                onInput={(e) => updateField('lastName', e.currentTarget.value)}
                placeholder="Last name"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Suffix</label>
              <select
                style={selectStyle}
                value={props.client.suffix || ''}
                onChange={(e) => updateField('suffix', e.currentTarget.value || undefined)}
              >
                <option value="">None</option>
                <option value="Jr">Jr</option>
                <option value="Sr">Sr</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>

              <QrButton text={props.client?.ssn || ''} handle={handleTextQR} label='SSN' />
              <input
                style={inputStyle}
                type="text"
                value={props.client?.ssn || ''}
                onInput={(e) => updateField('ssn', e.currentTarget.value)}
                placeholder="XXX-XX-XXXX"
                maxLength={11}
              />
            </div>

            <div style={fieldGroupStyle}>
              <QrButton text={formatDateMMDDYYYY(props.client?.spouse?.dateOfBirth) || ""} handle={handleTextQR} label='Date of Birth' />
              <input
                style={inputStyle}
                type="date"
                value={props.client?.dateOfBirth || ''}
                onInput={(e) => updateField('dateOfBirth', e.currentTarget.value)}
                onPaste={(e) => {
                  const parsed = parsePastedDate(e.clipboardData?.getData('text') || '');
                  if (parsed) { e.preventDefault(); updateField('dateOfBirth', parsed); }
                }}
              />
            </div>


            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Occupation</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client?.occupation || ''}
                onInput={(e) => updateField('occupation', e.currentTarget.value)}
                placeholder="Occupation"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={props.client?.email || ''}
                onInput={(e) => updateField('email', e.currentTarget.value)}
                placeholder="email@example.com"
              />
            </div>

            <div style={fieldGroupStyle}>
              <QrButton text={props.client.phone || ''} handle={handleTextQR} label='Phone' />
              <input
                style={inputStyle}
                type="tel"
                value={props.client.phone || ''}
                onInput={(e) => updateField('phone', e.currentTarget.value)}
                placeholder="(XXX) XXX-XXXX"
              />
            </div>
          </div>

          {/* Address Section */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#8b5cf6' }}>
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            Address
            <QrButton text={[
              props.client.address, '|',
              '|',
              '|',
              props.client.zipCode,
              '|', '|','|',
              '|','|',
              //c.phone
              ].join('') || ''}
              handle={handleTextQR}
              label=''
            />
          </div>

          {/* Address Search */}
          <div style={{ position: 'relative', 'margin-bottom': '1rem' }}>
            <label style={{ ...labelStyle, display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', color: '#6b7280' }}>
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
              Search Address
              {/* Show context hint when city/state exists */}
              <Show when={props.client.city || props.client.state}>
                <span style={{
                  'font-size': '0.7rem',
                  color: '#3b82f6',
                  background: '#eff6ff',
                  padding: '0.125rem 0.5rem',
                  'border-radius': '9999px',
                  'font-weight': '500'
                }}>
                  Searching in {props.client.city}{props.client.city && props.client.state ? ', ' : ''}{props.client.state}
                </span>
              </Show>
            </label>
            <input
              style={{
                ...inputStyle,
                'padding-left': '2.5rem',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                "min-width": '360px'
              }}
              type="text"
              value={addressSearchQuery()}
              onInput={(e) => handleAddressSearchInput(e.currentTarget.value)}
              onFocus={() => addressSearchResults().length > 0 && setShowAddressResults(true)}
              onBlur={() => setTimeout(() => setShowAddressResults(false), 200)}
              placeholder={props.client.city || props.client.state
                ? `Search street address in ${props.client.city || ''}${props.client.city && props.client.state ? ', ' : ''}${props.client.state || ''}...`
                : "Start typing an address to search..."}
            />
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '2.25rem',
                width: '16px',
                height: '16px',
                color: isSearchingAddress() ? '#3b82f6' : '#9ca3af'
              }}
            >
              {isSearchingAddress() ? (
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              ) : (
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              )}
            </svg>

            {/* Search Results Dropdown */}
            <Show when={showAddressResults() && addressSearchResults().length > 0}>
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #e5e7eb',
                'border-radius': '0.5rem',
                'box-shadow': '0 10px 25px rgba(0,0,0,0.15)',
                'z-index': 50,
                'max-height': '250px',
                'overflow-y': 'auto'
              }}>
                <For each={addressSearchResults()}>
                  {(result) => (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        'border-bottom': '1px solid #f3f4f6',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      onMouseDown={() => selectAddress(result)}
                    >
                      <div style={{ 'font-weight': '600', color: '#111827', 'font-size': '0.875rem' }}>
                        {result.street}
                      </div>
                      <div style={{ color: '#6b7280', 'font-size': '0.75rem', 'margin-top': '0.125rem' }}>
                        {result.city}, {result.state} {result.zip}
                      </div>
                    </div>
                  )}
                </For>
                <div style={{
                  padding: '0.5rem',
                  'text-align': 'center',
                  'font-size': '0.625rem',
                  color: '#9ca3af',
                  background: '#f9fafb'
                }}>
                  Powered by {getActiveProvider()}
                </div>
              </div>
            </Show>
          </div>

          <div style={formGridStyle}>
            <div style={{ ...fieldGroupStyle, 'grid-column': 'span 2' }}>
              <label style={labelStyle}>Street Address</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.address || ''}
                onInput={(e) => updateField('address', e.currentTarget.value)}
                placeholder="123 Main St"
              />
            </div>
             <div style={{ ...fieldGroupStyle, 'grid-column': '120px' }}>
              <label style={labelStyle}>Apt</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.apt || ''}
                onInput={(e) => updateField('apt', e.currentTarget.value)}
                placeholder="123"
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>ZIP Code</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.zipCode || ''}
                onInput={async (e) => {
                  const zip = e.currentTarget.value;
                  updateField('zipCode', zip);

                  // Auto-lookup city/state when ZIP is 5 digits
                  const cleanZip = zip.replace(/\D/g, '');
                  if (cleanZip.length === 5) {
                    const result = await lookupZipCode(cleanZip);
                    if (result) {
                      props.onClientChange({
                        city: result.city,
                        state: result.stateAbbreviation
                      });
                      setHasChanges(true);
                    }
                  }
                }}
                placeholder="12345"
                maxLength={10}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>City</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.city || ''}
                onInput={(e) => updateField('city', e.currentTarget.value)}
                placeholder="City"
              />
            </div>
             
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>State</label>
              <select
                style={selectStyle}
                value={props.client.state || ''}
                onChange={(e) => updateField('state', e.currentTarget.value)}
              >
              
                <option value="">Select state</option>
                <For each={US_STATES}>
                  {(state) => <option value={state}>{state}</option>}
                </For>
              </select>
            </div>

            
          </div>
        </Card>
      </Show>

      {/* Spouse Info Tab */}
      <Show when={activeTab() === 'spouse' && showSpouseTab()}>
        <Card>
           <div style={dependentHeaderStyle}>
          <div style={sectionTitleStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#ec4899' }}>
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Spouse Information
             <QrButton text={[
                props.client.spouse?.firstName, '|',
                props.client.spouse?.middleName || "", '|',
                props.client.spouse?.lastName, '|', '|',
                ssnForQR(props.client.spouse?.ssn), '|',
                '|',
                formatDateMMDDYYYY(props.client?.spouse?.dateOfBirth) || "", '|',
                props.client.spouse?.occupation || "",'|',
                '|',
                props.client.spouse?.phone, '|', 
                
              ].join('') || ''} 
              handle={handleTextQR} 
              label='' 
            />
          </div>

          {/* Link Spouse as Client Section */}
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            'border-radius': '8px',
            padding: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '0.75rem' }}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 20 20" fill="#f59e0b" style={{ width: '20px', height: '20px' }}>
                  <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd" />
                </svg>
                <span style={{ 'font-weight': '600', color: '#92400e' }}>Link Spouse as Client</span>
              </div>
              <Show when={props.client.linkedSpouseId}>
                <button
                  onClick={unlinkSpouse}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #ef4444',
                    'border-radius': '6px',
                    padding: '0.25rem 0.75rem',
                    cursor: 'pointer',
                    color: '#dc2626',
                    'font-size': '0.75rem',
                    'font-weight': '500'
                  }}
                >
                  Unlink
                </button>
              </Show>
            </div>

            <Show when={props.client.linkedSpouseId}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: '#d1fae5',
                'border-radius': '6px',
                border: '1px solid #10b981'
              }}>
                <svg viewBox="0 0 20 20" fill="#10b981" style={{ width: '24px', height: '24px' }}>
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div>
                  <div style={{ 'font-weight': '600', color: '#065f46' }}>
                    Linked to: {props.client.linkedSpouseName}
                  </div>
                  <div style={{ 'font-size': '0.75rem', color: '#047857' }}>
                    Spouse documents will be included in calculations
                  </div>
                </div>
              </div>
            </Show>

            <Show when={!props.client.linkedSpouseId}>
              <p style={{ 'font-size': '0.8125rem', color: '#78350f', 'margin-bottom': '0.75rem' }}>
                Link the spouse to an existing client to include their documents in tax calculations.
              </p>

              <Show when={!showSpouseSearch()}>
                <button
                  onClick={() => setShowSpouseSearch(true)}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    'border-radius': '6px',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    'font-weight': '500',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                  Search for Spouse Client
                </button>
              </Show>

              <Show when={showSpouseSearch()}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={spouseSearchQuery()}
                    onInput={(e) => {
                      setSpouseSearchQuery(e.currentTarget.value);
                      searchForSpouse(e.currentTarget.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      'border-radius': '6px',
                      'font-size': '0.875rem'
                    }}
                  />
                  <Show when={isSearchingSpouse()}>
                    <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                      <span style={{ color: '#9ca3af', 'font-size': '0.75rem' }}>Searching...</span>
                    </div>
                  </Show>
                </div>

                <Show when={spouseSearchResults().length > 0}>
                  <div style={{
                    'margin-top': '0.5rem',
                    border: '1px solid #e5e7eb',
                    'border-radius': '6px',
                    'max-height': '200px',
                    overflow: 'auto',
                    background: 'white'
                  }}>
                    <For each={spouseSearchResults()}>
                      {(client) => (
                        <div
                          style={{
                            padding: '0.75rem',
                            'border-bottom': '1px solid #f3f4f6',
                            cursor: 'pointer',
                            display: 'flex',
                            'justify-content': 'space-between',
                            'align-items': 'center'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                          onClick={() => linkSpouse(client)}
                        >
                          <div>
                            <div style={{ 'font-weight': '500' }}>{client.firstName} {client.lastName}</div>
                            <div style={{ 'font-size': '0.75rem', color: '#6b7280' }}>
                              {client.email || 'No email'} • Tax Year {client.taxYear || 'N/A'}
                            </div>
                          </div>
                          <svg viewBox="0 0 20 20" fill="#10b981" style={{ width: '20px', height: '20px' }}>
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>

                <button
                  onClick={() => {
                    setShowSpouseSearch(false);
                    setSpouseSearchQuery('');
                    setSpouseSearchResults([]);
                  }}
                  style={{
                    'margin-top': '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#78350f',
                    cursor: 'pointer',
                    'font-size': '0.8125rem'
                  }}
                >
                  Cancel
                </button>
              </Show>
            </Show>
          </div>

          </div>
          <div style={formGridStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>First Name *</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.spouse?.firstName || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: e.currentTarget.value, lastName: props.client.spouse?.lastName || '' })}
                placeholder="First name"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Middle Name</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.spouse?.middleName || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', middleName: e.currentTarget.value })}
                placeholder="Middle name"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Last Name *</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.spouse?.lastName || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: e.currentTarget.value })}
                placeholder="Last name"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Suffix</label>
              <select
                style={selectStyle}
                value={props.client.spouse?.suffix || ''}
                onChange={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', suffix: e.currentTarget.value || undefined })}
              >
                <option value="">None</option>
                <option value="Jr">Jr</option>
                <option value="Sr">Sr</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>SSN</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.spouse?.ssn || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', ssn: e.currentTarget.value })}
                placeholder="XXX-XX-XXXX"
                maxLength={11}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Date of Birth</label>
              <input
                style={inputStyle}
                type="date"
                value={props.client.spouse?.dateOfBirth || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', dateOfBirth: e.currentTarget.value })}
                onPaste={(e) => {
                  const parsed = parsePastedDate(e.clipboardData?.getData('text') || '');
                  if (parsed) { e.preventDefault(); updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', dateOfBirth: parsed }); }
                }}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Occupation</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.spouse?.occupation || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', occupation: e.currentTarget.value })}
                placeholder="Occupation"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={props.client.spouse?.email || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', email: e.currentTarget.value })}
                placeholder="email@example.com"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                type="tel"
                value={props.client.spouse?.phone || ''}
                onInput={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', phone: e.currentTarget.value })}
                placeholder="(XXX) XXX-XXXX"
              />
            </div>
          </div>

          {/* Spouse Tax Options */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#f59e0b' }}>
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Spouse Tax Options
          </div>

          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
            <label style={checkboxContainerStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={props.client.spouse?.isBlind || false}
                onChange={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', isBlind: e.currentTarget.checked })}
              />
              <span>Spouse is legally blind</span>
            </label>

            <label style={checkboxContainerStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={props.client.spouse?.canBeClaimed || false}
                onChange={(e) => updateField('spouse', { ...props.client.spouse, firstName: props.client.spouse?.firstName || '', lastName: props.client.spouse?.lastName || '', canBeClaimed: e.currentTarget.checked })}
              />
              <span>Spouse can be claimed as dependent on another return</span>
            </label>
          </div>
        </Card>
      </Show>

      {/* Dependents Tab */}
      <Show when={activeTab() === 'dependents'}>
        <Card>
          <div style={sectionTitleStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#22c55e' }}>
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            Dependents ({props.client.dependents?.length || 0})
          </div>

          {/* No Dependents Option */}
          <div style={{
            padding: '1rem',
            background: props.client.hasNoDependents ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2))' : 'var(--surface-alt)',
            border: props.client.hasNoDependents ? '2px solid #22c55e' : '1px solid var(--border-color)',
            'border-radius': '12px',
            'margin-bottom': '1.5rem',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                style={{ ...checkboxStyle, 'accent-color': '#22c55e' }}
                checked={props.client.hasNoDependents || false}
                onChange={(e) => {
                  updateField('hasNoDependents', e.currentTarget.checked);
                  // Clear dependents if marking as no dependents
                  if (e.currentTarget.checked && (props.client.dependents?.length || 0) > 0) {
                    updateField('dependents', []);
                  }
                }}
              />
              <div>
                <div style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                  No Dependents
                </div>
                <div style={{ 'font-size': '0.8125rem', color: 'var(--text-secondary)' }}>
                  Check this box to confirm the client has no dependents to claim
                </div>
              </div>
            </div>
            <Show when={props.client.hasNoDependents}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#22c55e',
                color: 'white',
                'border-radius': '9999px',
                'font-size': '0.8125rem',
                'font-weight': '600'
              }}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Task Complete
              </div>
            </Show>
          </div>

          <Show when={!props.client.hasNoDependents}>
            <For each={props.client.dependents || []}>
            {(dependent, index) => (
              <div style={dependentCardStyle}>
                <div style={dependentHeaderStyle}>
                  <span style={{ 'font-weight': '600', color: 'var(--text-primary)' }}>
                    Dependent #{index() + 1}
                    {dependent.firstName && `: ${dependent.firstName} ${dependent.lastName}`}
                  </span>
                  {/* QR Code Generator Button */}
                  <button
                    style={{
                      padding: '0.75rem 1rem',
                      'font-size': '0.9375rem',
                      'font-weight': '500',
                      'border-radius': '8px',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleSChildhowDocumentQR(dependent)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--surface-alt)';
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>
                  <button
                    style={removeButtonStyle}
                    onClick={() => removeDependent(index())}
                    title="Remove dependent"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div style={formGridStyle}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>First Name *</label>
                    <FormInput
                      style={inputStyle}
                      type="text"
                      value={dependent.firstName || ''}
                      onChange={(e) => updateDependent(index(), { firstName: e})}
                      placeholder="First name"
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Last Name *</label>
                    <FormInput
                      style={inputStyle}
                      type="text"
                      value={dependent.lastName || ''}
                      onChange={(e) => updateDependent(index(), { lastName: e })}
                      placeholder="Last name"
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Relationship *</label>
                    <select
                      style={selectStyle}
                      value={dependent.relationship || 'son'}
                      onChange={(e) => updateDependent(index(), { relationship: e.currentTarget.value as DependentRelationship })}
                    >
                      <For each={Object.entries(RELATIONSHIP_LABELS)}>
                        {([value, label]) => <option value={value}>{label}</option>}
                      </For>
                    </select>
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>SSN</label>
                    <FormInput
                      style={inputStyle}
                      type="text"
                      value={dependent.ssn || ''}
                      onChange={(e) => updateDependent(index(), { ssn: e })}
                      placeholder="XXX-XX-XXXX"
                      maxLength={11}
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Date of Birth</label>
                    <FormInput
                      style={inputStyle}
                      type="date"
                      value={dependent.dateOfBirth || ''}
                      onChange={(e) => updateDependent(index(), { dateOfBirth: e })}
                      onPaste={(e) => {
                        const parsed = parsePastedDate(e.clipboardData?.getData('text') || '');
                        if (parsed) { e.preventDefault(); updateDependent(index(), { dateOfBirth: parsed }); }
                      }}
                    />
                  </div>

                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Months Lived with You</label>
                    <FormInput
                      style={inputStyle}
                      type="number"
                      min="0"
                      max="12"
                      value={dependent.monthsLivedWithYou || ''}
                      onChange={(e) => updateDependent(index(), { monthsLivedWithYou: parseInt(e) || undefined })}
                      placeholder="12"
                    />
                  </div>
                </div>

                {/* Dependent Options */}
                <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', 'margin-top': '1rem' }}>
                  <label style={checkboxContainerStyle}>
                    <input
                      type="checkbox"
                      style={checkboxStyle}
                      checked={dependent.isStudent || false}
                      onChange={(e) => updateDependent(index(), { isStudent: e.currentTarget.checked })}
                    />
                    <span>Full-time student</span>
                  </label>

                  <label style={checkboxContainerStyle}>
                    <input
                      type="checkbox"
                      style={checkboxStyle}
                      checked={dependent.isDisabled || false}
                      onChange={(e) => updateDependent(index(), { isDisabled: e.currentTarget.checked })}
                    />
                    <span>Permanently disabled</span>
                  </label>

                  <label style={checkboxContainerStyle}>
                    <input
                      type="checkbox"
                      style={checkboxStyle}
                      checked={dependent.providedSupport || false}
                      onChange={(e) => updateDependent(index(), { providedSupport: e.currentTarget.checked })}
                    />
                    <span>Provided more than half support</span>
                  </label>
                </div>
              </div>
            )}
          </For>

          <button
            style={addButtonStyle}
            onClick={() => {
              // Uncheck "No Dependents" when adding a dependent
              if (props.client.hasNoDependents) {
                updateField('hasNoDependents', false);
              }
              addDependent();
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-color)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            Add Dependent
          </button>
          </Show>
        </Card>
      </Show>

      {/* Tax Details Tab */}
      <Show when={activeTab() === 'tax'}>
        <Card>
          <div style={sectionTitleStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#3b82f6' }}>
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            Filing Information
          </div>

          <div style={formGridStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Tax Year</label>
              <select
                style={selectStyle}
                value={props.client.taxYear || new Date().getFullYear()}
                onChange={(e) => updateField('taxYear', parseInt(e.currentTarget.value))}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Filing Status</label>
              <select
                style={selectStyle}
                value={props.client.filingStatus || ''}
                onChange={(e) => updateField('filingStatus', e.currentTarget.value as FilingStatus)}
              >
                <option value="">Select filing status</option>
                <For each={Object.entries(FILING_STATUS_LABELS)}>
                  {([value, label]) => <option value={value}>{label}</option>}
                </For>
              </select>
            </div>
          </div>

          {/* Tax Options */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#f59e0b' }}>
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            Additional Tax Options
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            <label style={checkboxContainerStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={props.client.isBlind || false}
                onChange={(e) => updateField('isBlind', e.currentTarget.checked)}
              />
              <span>Taxpayer is legally blind</span>
            </label>

            <label style={checkboxContainerStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={props.client.canBeClaimed || false}
                onChange={(e) => updateField('canBeClaimed', e.currentTarget.checked)}
              />
              <span>Can be claimed as dependent on another return</span>
            </label>

            <label style={checkboxContainerStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={props.client.hasHealthInsurance || false}
                onChange={(e) => updateField('hasHealthInsurance', e.currentTarget.checked)}
              />
              <span>Had qualifying health insurance coverage</span>
            </label>
          </div>

          {/* ID Information Section */}
          <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(2, 1fr)',
                      gap: '0.5rem'
                    }}>
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#ec4899' }}>
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm4 0a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm-4 3a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm4 0a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
            ID Information (Driver's License / State ID)
          </div>
          <QrButton text={[
                props.client.idInfo?.idNumber || "", '|',
                props.client.idInfo?.idState || "", '|',
                formatDateMMDDYYYY(props.client.idInfo?.issueDate) || "", '|','|',
                formatDateMMDDYYYY(props.client.idInfo?.expirationDate) || "", '|',
                ].join('') || ''} 
              handle={handleTextQR} 
              label='' 
            />
         </div>

          {/* External Scanner Input (Primary Option) */}
          <div style={{
            padding: '1rem',
            'margin-bottom': '1rem',
            background: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)',
            'border-radius': '12px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.75rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9333ea" style={{ width: '20px', height: '20px' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span style={{ 'font-weight': '600', color: '#7c3aed' }}>Scan ID with External Scanner</span>
              <span style={{ 'font-size': '0.75rem', color: '#9333ea', background: '#f3e8ff', padding: '0.125rem 0.5rem', 'border-radius': '9999px' }}>Recommended</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'stretch' }}>
              <input
                type="text"
                value={externalScanInput()}
                onInput={(e) => setExternalScanInput(e.currentTarget.value)}
                onKeyDown={handleExternalInputKeyDown}
                placeholder="Click here and scan ID barcode with external scanner..."
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  'font-size': '0.9375rem',
                  border: '2px solid #c4b5fd',
                  'border-radius': '8px',
                  background: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#c4b5fd'}
              />
              <button
                onClick={handleExternalScanSubmit}
                style={{
                  padding: '0.75rem 1.25rem',
                  'font-size': '0.9375rem',
                  'font-weight': '600',
                  'border-radius': '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  'white-space': 'nowrap'
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Process
              </button>
            </div>

            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-top': '0.75rem' }}>
              <span style={{ 'font-size': '0.75rem', color: '#7c3aed' }}>
                Scan the PDF417 barcode on the back of the ID
              </span>
              <button
                onClick={() => setShowIdScanner(true)}
                style={{
                  padding: '0.375rem 0.75rem',
                  'font-size': '0.75rem',
                  'font-weight': '500',
                  'border-radius': '6px',
                  border: '1px solid #c4b5fd',
                  background: 'white',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.375rem',
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                Use Camera Instead
              </button>
            </div>
          </div>

          {/* ID Scan Message */}
          <Show when={idScanMessage()}>
            <div style={{
              padding: '0.75rem 1rem',
              'margin-bottom': '1rem',
              'border-radius': '8px',
              background: idScanMessage()?.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: idScanMessage()?.type === 'success' ? '#065f46' : '#991b1b',
              'font-size': '0.875rem',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}>
              {idScanMessage()?.type === 'success' ? '✓' : '⚠'} {idScanMessage()?.text}
            </div>
          </Show>

          <div style={formGridStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>ID Number *</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.idInfo?.idNumber || ''}
                onInput={(e) => updateField('idInfo', {
                  ...props.client.idInfo,
                  idNumber: e.currentTarget.value,
                  idState: props.client.idInfo?.idState || ''
                })}
                placeholder="License/ID number"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>ID Type</label>
              <select
                style={selectStyle}
                value={props.client.idInfo?.idType || 'drivers_license'}
                onChange={(e) => updateField('idInfo', {
                  ...props.client.idInfo,
                  idNumber: props.client.idInfo?.idNumber || '',
                  idState: props.client.idInfo?.idState || '',
                  idType: e.currentTarget.value as 'drivers_license' | 'state_id' | 'passport' | 'other'
                })}
              >
                <option value="drivers_license">Driver's License</option>
                <option value="state_id">State ID</option>
                <option value="passport">Passport</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Issuing State *</label>
              <select
                style={selectStyle}
                value={props.client.idInfo?.idState || ''}
                onChange={(e) => updateField('idInfo', {
                  ...props.client.idInfo,
                  idNumber: props.client.idInfo?.idNumber || '',
                  idState: e.currentTarget.value
                })}
              >
                <option value="">Select state</option>
                <For each={US_STATES}>
                  {(state) => <option value={state}>{state}</option>}
                </For>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Issue Date</label>
              <input
                style={inputStyle}
                type="date"
                value={props.client.idInfo?.issueDate || ''}
                onInput={(e) => updateField('idInfo', {
                  ...props.client.idInfo,
                  idNumber: props.client.idInfo?.idNumber || '',
                  idState: props.client.idInfo?.idState || '',
                  issueDate: e.currentTarget.value
                })}
                onPaste={(e) => {
                  const parsed = parsePastedDate(e.clipboardData?.getData('text') || '');
                  if (parsed) { e.preventDefault(); updateField('idInfo', { ...props.client.idInfo, idNumber: props.client.idInfo?.idNumber || '', idState: props.client.idInfo?.idState || '', issueDate: parsed }); }
                }}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Expiration Date</label>
              <input
                style={inputStyle}
                type="date"
                value={props.client.idInfo?.expirationDate || ''}
                onInput={(e) => updateField('idInfo', {
                  ...props.client.idInfo,
                  idNumber: props.client.idInfo?.idNumber || '',
                  idState: props.client.idInfo?.idState || '',
                  expirationDate: e.currentTarget.value
                })}
                onPaste={(e) => {
                  const parsed = parsePastedDate(e.clipboardData?.getData('text') || '');
                  if (parsed) { e.preventDefault(); updateField('idInfo', { ...props.client.idInfo, idNumber: props.client.idInfo?.idNumber || '', idState: props.client.idInfo?.idState || '', expirationDate: parsed }); }
                }}
              />
            </div>
          </div>

          {/* Show additional scanned info if available */}
          <Show when={props.client.idInfo?.gender || props.client.idInfo?.height || props.client.idInfo?.eyeColor}>
            <div style={{ 'margin-top': '1rem', padding: '1rem', background: '#f8fafc', 'border-radius': '8px', 'border': '1px solid #e2e8f0' }}>
              <div style={{ 'font-size': '0.75rem', 'font-weight': '600', color: '#64748b', 'margin-bottom': '0.5rem', 'text-transform': 'uppercase', 'letter-spacing': '0.05em' }}>
                Additional ID Details (from scan)
              </div>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem', 'font-size': '0.875rem' }}>
                <Show when={props.client.idInfo?.gender}>
                  <div><strong>Gender:</strong> {props.client.idInfo?.gender === 'M' ? 'Male' : props.client.idInfo?.gender === 'F' ? 'Female' : 'Other'}</div>
                </Show>
                <Show when={props.client.idInfo?.height}>
                  <div><strong>Height:</strong> {props.client.idInfo?.height}</div>
                </Show>
                <Show when={props.client.idInfo?.weight}>
                  <div><strong>Weight:</strong> {props.client.idInfo?.weight}</div>
                </Show>
                <Show when={props.client.idInfo?.eyeColor}>
                  <div><strong>Eye Color:</strong> {props.client.idInfo?.eyeColor}</div>
                </Show>
                <Show when={props.client.idInfo?.hairColor}>
                  <div><strong>Hair Color:</strong> {props.client.idInfo?.hairColor}</div>
                </Show>
              </div>
            </div>
          </Show>

          {/* Bank Information */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#22c55e' }}>
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
            </svg>
            Bank Information (for Direct Deposit)
          </div>
          {/* QR Code Generator Button */}
            <button
              style={{
                padding: '0.75rem 1rem',
                'font-size': '0.9375rem',
                'font-weight': '500',
                'border-radius': '8px',
                border: '1px solid var(--border-color)',
                background: 'white',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
              onClick={() => handleTaxPayerBankQR(props.client.bankInfo)}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--surface-alt)';
                e.currentTarget.style.borderColor = 'var(--primary-color)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>

          <div style={formGridStyle}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Account Type</label>
              <select
                style={selectStyle}
                value={props.client.bankInfo?.accountType || ''}
                onChange={(e) => updateField('bankInfo', {
                  ...props.client.bankInfo,
                  accountType: e.currentTarget.value as 'checking' | 'savings',
                  routingNumber: props.client.bankInfo?.routingNumber || '',
                  accountNumber: props.client.bankInfo?.accountNumber || '',
                  bankName: props.client.bankInfo?.bankName || ''
                })}
              >
                <option value="">Select account type</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>

            <div style={{ ...fieldGroupStyle, position: 'relative' }}>
              <label style={labelStyle}>Bank</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.bankInfo?.bankName || ''}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  updateField('bankInfo', {
                    ...props.client.bankInfo,
                    accountType: props.client.bankInfo?.accountType || 'checking',
                    bankName: value,
                    accountNumber: props.client.bankInfo?.accountNumber || '',
                    routingNumber: props.client.bankInfo?.routingNumber || '',
                  });
                  // Show suggestions
                  if (value.length >= 1) {
                    const filtered = US_BANKS.filter(bank =>
                      bank.toLowerCase().includes(value.toLowerCase())
                    ).slice(0, 8);
                    setBankNameSuggestions(filtered);
                    setShowBankSuggestions(filtered.length > 0);
                  } else {
                    setShowBankSuggestions(false);
                  }
                }}
                onFocus={() => {
                  const value = props.client.bankInfo?.bankName || '';
                  if (value.length >= 1) {
                    const filtered = US_BANKS.filter(bank =>
                      bank.toLowerCase().includes(value.toLowerCase())
                    ).slice(0, 8);
                    setBankNameSuggestions(filtered);
                    setShowBankSuggestions(filtered.length > 0);
                  }
                }}
                onBlur={() => setTimeout(() => setShowBankSuggestions(false), 200)}
                placeholder="Search or type bank name..."
              />
              <Show when={showBankSuggestions() && bankNameSuggestions().length > 0}>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid var(--border-color)',
                  'border-radius': '8px',
                  'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
                  'z-index': 1000,
                  'max-height': '200px',
                  overflow: 'auto'
                }}>
                  <For each={bankNameSuggestions()}>
                    {(bank) => (
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          'border-bottom': '1px solid var(--border-color)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateField('bankInfo', {
                            ...props.client.bankInfo,
                            accountType: props.client.bankInfo?.accountType || 'checking',
                            bankName: bank,
                            accountNumber: props.client.bankInfo?.accountNumber || '',
                            routingNumber: props.client.bankInfo?.routingNumber || '',
                          });
                          setShowBankSuggestions(false);
                        }}
                      >
                        {bank}
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Routing Number</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.bankInfo?.routingNumber || ''}
                onInput={(e) => updateField('bankInfo', {
                  ...props.client.bankInfo,
                  accountType: props.client.bankInfo?.accountType || 'checking',
                  routingNumber: e.currentTarget.value,
                  accountNumber: props.client.bankInfo?.accountNumber || '',
                  bankName: props.client.bankInfo?.bankName || ''
                })}
                placeholder="9 digits"
                maxLength={9}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Account Number</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.bankInfo?.accountNumber || ''}
                onInput={(e) => updateField('bankInfo', {
                  ...props.client.bankInfo,
                  accountType: props.client.bankInfo?.accountType || 'checking',
                  routingNumber: props.client.bankInfo?.routingNumber || '',
                  accountNumber: e.currentTarget.value,
                  bankName: props.client.bankInfo?.bankName || ''
                })}
                placeholder="Account number"
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Account Holder Name</label>
              <input
                style={inputStyle}
                type="text"
                value={props.client.bankInfo?.accountHolderName || ''}
                onInput={(e) => updateField('bankInfo', {
                  ...props.client.bankInfo,
                  accountType: props.client.bankInfo?.accountType || 'checking',
                  routingNumber: props.client.bankInfo?.routingNumber || '',
                  accountNumber: props.client.bankInfo?.accountNumber || '',
                  accountHolderName: e.currentTarget.value,
                  bankName: props.client.bankInfo?.bankName || ''
                })}
                placeholder="Name on account"
              />
            </div>
          </div>

          {/* Tax Return Results Section */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#16a34a' }}>
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            {t('taxResults')}
          </div>

          {/* Federal Refund/Owe */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            'border-radius': '12px',
            border: '1px solid #bbf7d0',
            'margin-bottom': '1rem'
          }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'margin-bottom': '0.75rem' }}>
              <span style={{ 'font-weight': '600', color: '#166534' }}>{t('federalRefund')} / {t('federalOwe')}</span>
            </div>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={fieldGroupStyle}>
                <label style={{ ...labelStyle, color: '#16a34a' }}>{t('refund')} ($)</label>
                <input
                  style={{
                    ...inputStyle,
                    'border-color': '#86efac',
                    background: props.client.federalRefund ? '#dcfce7' : 'white'
                  }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={props.client.federalRefund || ''}
                  onInput={(e) => {
                    const value = e.currentTarget.value ? parseFloat(e.currentTarget.value) : undefined;
                    updateField('federalRefund', value);
                    if (value) updateField('federalOwe', undefined);
                  }}
                  placeholder="0.00"
                />
              </div>
              <div style={fieldGroupStyle}>
                <label style={{ ...labelStyle, color: '#dc2626' }}>{t('owe')} ($)</label>
                <input
                  style={{
                    ...inputStyle,
                    'border-color': '#fca5a5',
                    background: props.client.federalOwe ? '#fee2e2' : 'white'
                  }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={props.client.federalOwe || ''}
                  onInput={(e) => {
                    const value = e.currentTarget.value ? parseFloat(e.currentTarget.value) : undefined;
                    updateField('federalOwe', value);
                    if (value) updateField('federalRefund', undefined);
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* State Returns Section */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
            'border-radius': '12px',
            border: '1px solid #bfdbfe',
            'margin-bottom': '1rem'
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem' }}>
              <span style={{ 'font-weight': '600', color: '#1e40af' }}>{t('stateRefund')} / {t('stateOwe')}</span>
              <button
                style={{
                  padding: '0.375rem 0.75rem',
                  'font-size': '0.8125rem',
                  'font-weight': '500',
                  'border-radius': '6px',
                  border: '1px solid #93c5fd',
                  background: 'white',
                  color: '#2563eb',
                  cursor: 'pointer',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '0.375rem',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  const currentReturns = props.client.stateReturns || [];
                  updateField('stateReturns', [...currentReturns, { state: '', refund: undefined, owe: undefined }]);
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#93c5fd';
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                {t('addState')}
              </button>
            </div>

            <Show when={!props.client.stateReturns || props.client.stateReturns.length === 0}>
              <div style={{
                padding: '1rem',
                'text-align': 'center',
                color: '#6b7280',
                'font-size': '0.875rem',
                'font-style': 'italic'
              }}>
                {t('noStateReturns')}
              </div>
            </Show>

            <For each={props.client.stateReturns || []}>
              {(stateReturn, index) => (
                <div style={{
                  display: 'grid',
                  'grid-template-columns': '120px 1fr 1fr auto',
                  gap: '0.75rem',
                  'align-items': 'end',
                  padding: '0.75rem',
                  background: 'white',
                  'border-radius': '8px',
                  'margin-bottom': '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>{t('state')}</label>
                    <select
                      style={selectStyle}
                      value={stateReturn.state || ''}
                      onChange={(e) => {
                        const updatedReturns = [...(props.client.stateReturns || [])];
                        updatedReturns[index()] = { ...updatedReturns[index()], state: e.currentTarget.value };
                        updateField('stateReturns', updatedReturns);
                      }}
                    >
                      <option value="">Select</option>
                      <For each={US_STATES}>
                        {(state) => <option value={state}>{state}</option>}
                      </For>
                    </select>
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={{ ...labelStyle, color: '#16a34a' }}>{t('refund')} ($)</label>
                    <input
                      style={{
                        ...inputStyle,
                        'border-color': '#86efac',
                        background: stateReturn.refund ? '#dcfce7' : 'white'
                      }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={stateReturn.refund || ''}
                      onInput={(e) => {
                        const value = e.currentTarget.value ? parseFloat(e.currentTarget.value) : undefined;
                        const updatedReturns = [...(props.client.stateReturns || [])];
                        updatedReturns[index()] = { ...updatedReturns[index()], refund: value, owe: value ? undefined : updatedReturns[index()].owe };
                        updateField('stateReturns', updatedReturns);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div style={fieldGroupStyle}>
                    <label style={{ ...labelStyle, color: '#dc2626' }}>{t('owe')} ($)</label>
                    <input
                      style={{
                        ...inputStyle,
                        'border-color': '#fca5a5',
                        background: stateReturn.owe ? '#fee2e2' : 'white'
                      }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={stateReturn.owe || ''}
                      onInput={(e) => {
                        const value = e.currentTarget.value ? parseFloat(e.currentTarget.value) : undefined;
                        const updatedReturns = [...(props.client.stateReturns || [])];
                        updatedReturns[index()] = { ...updatedReturns[index()], owe: value, refund: value ? undefined : updatedReturns[index()].refund };
                        updateField('stateReturns', updatedReturns);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    style={{
                      padding: '0.5rem',
                      'border-radius': '6px',
                      border: '1px solid #fca5a5',
                      background: 'white',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      transition: 'all 0.2s',
                      'margin-bottom': '0.25rem'
                    }}
                    onClick={() => {
                      const updatedReturns = [...(props.client.stateReturns || [])];
                      updatedReturns.splice(index(), 1);
                      updateField('stateReturns', updatedReturns);
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                    title={t('removeState')}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </For>
          </div>

          {/* Notes */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#6b7280' }}>
              <path fill-rule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
            Notes
          </div>

          <div style={fieldGroupStyle}>
            <textarea
              style={{ ...inputStyle, 'min-height': '100px', resize: 'vertical' as const }}
              value={props.client.notes || ''}
              onInput={(e) => updateField('notes', e.currentTarget.value)}
              placeholder="Additional notes about this client..."
            />
          </div>
        </Card>
      </Show>

      {/* Admin Tab - Only visible to admins */}
      <Show when={activeTab() === 'admin' && authStore.isAdmin()}>
        <Card>
          <div style={{
            display: 'flex',
            'align-items': 'center',
            gap: '0.75rem',
            'margin-bottom': '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
            'border-radius': '12px',
            border: '1px solid #fecaca'
          }}>
            <svg viewBox="0 0 20 20" fill="#dc2626" style={{ width: '24px', height: '24px' }}>
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            <div>
              <div style={{ 'font-weight': '600', color: '#dc2626', 'font-size': '1rem' }}>Administrator Controls</div>
              <div style={{ 'font-size': '0.875rem', color: '#b91c1c' }}>These settings are only visible to administrators</div>
            </div>
          </div>

          {/* Business Transfer Section */}
          <div style={sectionTitleStyle}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#f59e0b' }}>
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
            </svg>
            Transfer Client to Another Business
          </div>

          <div style={{
            padding: '1rem',
            background: '#fffbeb',
            'border-radius': '8px',
            border: '1px solid #fbbf24',
            'margin-bottom': '1rem'
          }}>
            <p style={{ 'font-size': '0.875rem', color: '#92400e', margin: 0 }}>
              <strong>Warning:</strong> Transferring this client to another business will move all their data, documents, and records. This action cannot be easily undone.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap', 'align-items': 'flex-end' }}>
            <div style={{ ...fieldGroupStyle, flex: '1', 'min-width': '250px' }}>
              <label style={labelStyle}>Current Business ID</label>
              <input
                style={{ ...inputStyle, background: '#f3f4f6', cursor: 'not-allowed' }}
                type="text"
                value={props.client.businessId || 'Not set'}
                disabled
              />
            </div>

            <div style={{ ...fieldGroupStyle, flex: '1', 'min-width': '250px' }}>
              <label style={labelStyle}>Transfer to Business</label>
              <Show when={!isLoadingBusinesses()} fallback={
                <div style={{ padding: '0.75rem', color: '#6b7280' }}>Loading businesses...</div>
              }>
                <select
                  style={selectStyle}
                  value={selectedBusinessId()}
                  onChange={(e) => setSelectedBusinessId(e.currentTarget.value)}
                >
                  <option value="">Select a business</option>
                  <For each={availableBusinesses()}>
                    {(business) => (
                      <option value={business.id} disabled={business.id === props.client.businessId}>
                        {business.name} {business.id === props.client.businessId ? '(Current)' : ''}
                      </option>
                    )}
                  </For>
                </select>
              </Show>
            </div>

            <button
              style={{
                padding: '0.75rem 1.5rem',
                'font-size': '0.9375rem',
                'font-weight': '600',
                'border-radius': '8px',
                background: selectedBusinessId() && selectedBusinessId() !== props.client.businessId ? '#dc2626' : '#e5e7eb',
                color: selectedBusinessId() && selectedBusinessId() !== props.client.businessId ? 'white' : '#9ca3af',
                border: 'none',
                cursor: selectedBusinessId() && selectedBusinessId() !== props.client.businessId ? 'pointer' : 'not-allowed',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                'margin-bottom': '0.5rem'
              }}
              onClick={() => selectedBusinessId() && selectedBusinessId() !== props.client.businessId && setShowTransferConfirm(true)}
              disabled={!selectedBusinessId() || selectedBusinessId() === props.client.businessId}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
              </svg>
              Transfer
            </button>
          </div>

          {/* Transfer Confirmation Dialog */}
          <Show when={showTransferConfirm()}>
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'z-index': 1000
            }}>
              <div style={{
                background: 'white',
                padding: '2rem',
                'border-radius': '16px',
                'max-width': '400px',
                width: '90%',
                'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem', 'margin-bottom': '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: '#fef2f2',
                    'border-radius': '50%',
                    display: 'flex',
                    'align-items': 'center',
                    'justify-content': 'center'
                  }}>
                    <svg viewBox="0 0 20 20" fill="#dc2626" style={{ width: '24px', height: '24px' }}>
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <h3 style={{ margin: 0, 'font-size': '1.125rem', color: '#111827' }}>Confirm Transfer</h3>
                </div>

                <p style={{ color: '#6b7280', 'line-height': '1.5', 'margin-bottom': '1.5rem' }}>
                  Are you sure you want to transfer <strong>{props.client.firstName} {props.client.lastName}</strong> to{' '}
                  <strong>{availableBusinesses().find(b => b.id === selectedBusinessId())?.name}</strong>?
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', 'justify-content': 'flex-end' }}>
                  <button
                    style={{
                      padding: '0.625rem 1.25rem',
                      'font-size': '0.9375rem',
                      'font-weight': '500',
                      'border-radius': '8px',
                      background: 'white',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowTransferConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      padding: '0.625rem 1.25rem',
                      'font-size': '0.9375rem',
                      'font-weight': '600',
                      'border-radius': '8px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={handleTransferBusiness}
                  >
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* Client Record Info */}
          <div style={{ ...sectionTitleStyle, 'margin-top': '2rem' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px', color: '#6b7280' }}>
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Client Record Info
          </div>

          <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', 'font-size': '0.875rem' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Client ID:</span>
              <div style={{ 'font-family': 'monospace', 'font-size': '0.75rem', color: '#374151' }}>{props.client.id}</div>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Business ID:</span>
              <div style={{ 'font-family': 'monospace', 'font-size': '0.75rem', color: '#374151' }}>{props.client.businessId || 'Not set'}</div>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Created:</span>
              <div style={{ color: '#374151' }}>{props.client.createdAt ? new Date(props.client.createdAt).toLocaleString() : 'N/A'}</div>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Updated:</span>
              <div style={{ color: '#374151' }}>{props.client.updatedAt ? new Date(props.client.updatedAt).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        </Card>
      </Show>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* QR Code Generator Modal */}
      <ClientQRCodeGenerator
        client={props.client}
        isOpen={showQRGenerator()}
        onClose={() => setShowQRGenerator(false)}
      />
       {/* QR Code Viewer Modal */}
      <QRCodeViewer
        qrText={qrText()}
        isOpen={showQRCode()}
        onClose={() => setShowQRCode(false)}
        title={`QR Code`}
        convertPipeToTab={true}
        toUpperCase={true}
      />


    {/* QR Code Viewer Modal */}
        <MultiQRCodeViewer
          qrText={qrTextM()}
          isOpen={showQRCodeM()}
          onClose={() => setShowQRCodeM(false)}
          title={`QR Code`}
          convertPipeToTab={true}
          toUpperCase={true}
        />

      {/* ID Scanner (ZXing + MRZ) */}
      <IDScanner
        isOpen={showIdScanner()}
        onBarcodeScan={handleBarcodeScan}
        onMRZScan={handleMRZScan}
        onClose={() => setShowIdScanner(false)}
        showExternalInput={false}
      />
    </div>
  );
};

export default ClientInfoSection;



interface QRbProps {
  handle?: (updates: any) => void;
  text?: string;
  label?: string;
}


export const QrButton: Component<QRbProps> = (props) => {

  const dependentHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.1rem'
  };

  const labelStyle = {
    'font-size': '0.875rem',
    'font-weight': '500',
    color: 'var(--text-secondary)'
  };

  return (
     <div style={dependentHeaderStyle}>
        <label style={labelStyle}>{props?.label}</label>
        
       
      </div>
  )


  /*
     <button
            style={{
              padding: 0,
              'font-size': '0.9375rem',
              'font-weight': '500',
              'border-radius': '8px',
              background: 'white',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
            onClick={() =>  props?.handle?.(props?.text)}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--surface-alt)';
              e.currentTarget.style.borderColor = 'var(--primary-color)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            
          </button>
  
  */
}




