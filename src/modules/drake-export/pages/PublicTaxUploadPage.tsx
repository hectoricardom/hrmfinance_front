/**
 * PublicTaxUploadPage
 * Public page for clients to upload tax documents without requiring login
 * Accessed via magic link with access token: /tax-upload/:accessToken
 */

import { Component, createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Card, Button } from '../../ui';
import { getDocumentRequestByToken, markDocumentUploaded, getUploadProgress, getMissingRequiredDocuments, formatExpiration, isRequestExpired, uploadTaxDocument, updateDocumentRequestPublic, processTaxDocument } from '../services/taxPortalApi';
import type { TaxDocumentRequest, RequestedDocumentType, DrakeTaxDocumentType } from '../types/drakeTypes';
import { VERIFICATION_FORM_TYPES, DRAKE_FORM_LABELS } from '../types/drakeTypes';
import { devLog } from '../../../services/utils';
import { lookupZipCode } from '../utils/zipCodeLookup';

// Accepted file types
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Upload state for individual documents
interface UploadState {
  docType: string;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  fileName?: string;
  errorMessage?: string;
}

// Client verification info
interface ClientVerificationInfo {
  ssn: string;
  filingStatus: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

// Bank info
interface BankInfo {
  bankName: string;
  accountType: 'checking' | 'savings' | '';
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountHolderName: string;
}

// Common US Banks list for autocomplete
const US_BANKS = [
  // Big 4
  'JPMorgan Chase',
  'Bank of America',
  'Wells Fargo',
  'Citibank',
  // Major National Banks
  'U.S. Bank',
  'PNC Bank',
  'Truist Bank',
  'Goldman Sachs',
  'Capital One',
  'TD Bank',
  'Fifth Third Bank',
  'Citizens Bank',
  'KeyBank',
  'Huntington Bank',
  'M&T Bank',
  'Regions Bank',
  'BMO Harris Bank',
  'HSBC Bank USA',
  'Santander Bank',
  'Ally Bank',
  'Synchrony Bank',
  'Discover Bank',
  'Charles Schwab Bank',
  'American Express National Bank',
  // Regional Banks
  'First Republic Bank',
  'Silicon Valley Bank',
  'Signature Bank',
  'First Citizens Bank',
  'Comerica Bank',
  'Zions Bank',
  'Western Alliance Bank',
  'Valley National Bank',
  'Pinnacle Bank',
  'Webster Bank',
  'Atlantic Union Bank',
  'Glacier Bank',
  'First Interstate Bank',
  'Columbia Bank',
  'Banner Bank',
  'HomeStreet Bank',
  'Pacific Premier Bank',
  'Customers Bank',
  'Independent Bank',
  'Prosperity Bank',
  'Veritex Community Bank',
  'Texas Capital Bank',
  'Frost Bank',
  'International Bank of Commerce',
  'Plains Capital Bank',
  'Southside Bank',
  'Spirit of Texas Bank',
  'Republic Bank & Trust Company',
  // Credit Unions (Popular ones)
  'Navy Federal Credit Union',
  'State Employees Credit Union',
  'Pentagon Federal Credit Union',
  'SchoolsFirst Federal Credit Union',
  'Alliant Credit Union',
  'Golden 1 Credit Union',
  'Suncoast Credit Union',
  'America First Credit Union',
  'Security Service Federal Credit Union',
  'Boeing Employees Credit Union',
  'Alaska USA Federal Credit Union',
  'Randolph-Brooks Federal Credit Union',
  'San Diego County Credit Union',
  'Mountain America Credit Union',
  'USAA Federal Savings Bank',
  'First Tech Federal Credit Union',
  'Space Coast Credit Union',
  'Connexus Credit Union',
  'Lake Michigan Credit Union',
  'Delta Community Credit Union',
  // Online Banks
  'Chime',
  'Varo Bank',
  'Current',
  'SoFi',
  'Marcus by Goldman Sachs',
  'Aspiration',
  'Axos Bank',
  'CIT Bank',
  'Barclays Bank Delaware',
  'TIAA Bank',
  'Popular Bank',
  'BankUnited',
  'First National Bank of Omaha',
  'BOK Financial',
  'First Horizon Bank',
  'Synovus Bank',
  'Wintrust Bank',
  'Old National Bank',
  'Associated Bank',
  'Fulton Bank',
  'NBT Bank',
  'United Bank',
  'Washington Federal',
  'Simmons Bank',
  'Cadence Bank',
  'Renasant Bank',
  'Hancock Whitney Bank',
  'Glacier Bancorp',
  'First Merchants Bank',
  'Berkshire Bank',
  'Eastern Bank',
  'Brookline Bank',
  'Rockland Trust',
  'Enterprise Bank',
  'Cambridge Savings Bank',
  'Middlesex Savings Bank',
  'DCU (Digital Federal Credit Union)',
  'Affinity Federal Credit Union'
].sort();

// Dependent info
interface DependentInfo {
  firstName: string;
  lastName: string;
  relationship: string;
  ssn: string;
  dateOfBirth: string;
}

// Signature info for engagement letter
interface SignatureInfo {
  name: string;
  date: string;
  agreedToTerms: boolean;
  signatureImage?: string;  // Base64 encoded signature from canvas
}

// Review confirmation info
interface ReviewConfirmation {
  confirmed: boolean;
}

// Check if document type is a verification form
const isVerificationFormType = (docType: string): boolean => {
  return VERIFICATION_FORM_TYPES.includes(docType as DrakeTaxDocumentType);
};

// Translations
const translations: Record<string, Record<string, string>> = {
  en: {
    // Page header
    pageTitle: 'Tax Document Upload',
    pageSubtitle: 'Securely upload your tax documents',

    // Client info
    TaxYear: 'Tax Year',
    Hello: 'Hello',
    RequestedDocuments: 'Requested Documents',
    IfyPrep: 'Instructions from your tax preparer',

    // Loading/Error states
    loadingRequest: 'Loading your document request...',
    errorTitle: 'Unable to Load Request',
    errorContact: 'If you believe this is an error, please contact your tax preparer.',

    // Progress
    allDocsUploaded: 'All documents uploaded!',
    completed: 'complete',
    docRequired: 'required document',
    remaining: 'remaining',

    // Upload buttons
    uploaded: 'Uploaded',
    uploading: 'Uploading...',
    processing: 'Processing...',
    upload: 'Upload',
    tryAgain: 'Try again',
    REQUIRED: 'REQUIRED',

    // Completion
    completionTitle: 'All documents uploaded!',
    completionMessage: 'Your tax preparer will be notified and will contact you if anything else is needed.',

    // Help section
    needHelp: 'Need Help?',
    acceptedFiles: 'Accepted file types:',
    acceptedFilesDesc: 'PDF, JPG, PNG (max 25MB each)',
    tipsTitle: 'Tips for best results:',
    tip1: 'Make sure the entire document is visible and readable',
    tip2: 'Avoid blurry or dark images',
    tip3: 'For multi-page documents, upload a single PDF if possible',
    tip4: 'You can re-upload a document to replace a previous version',

    // Footer
    secureTransmission: 'Your documents are transmitted securely and encrypted.',
    linkExpires: 'This link expires on',

    // Verification info
    verifyInfoTitle: 'Verify Personal Information',
    verifyInfoDescription: 'Please confirm your personal details',
    ssnLabel: 'Social Security Number',
    ssnPlaceholder: '123-45-6789',
    filingStatusLabel: 'Filing Status',
    filingStatusSingle: 'Single',
    filingStatusMarried: 'Married Filing Jointly',
    filingStatusMarriedSeparate: 'Married Filing Separately',
    filingStatusHeadHousehold: 'Head of Household',
    phoneLabel: 'Phone Number',
    addressLabel: 'Street Address',
    cityLabel: 'City',
    stateLabel: 'State',
    zipLabel: 'ZIP Code',
    submitVerification: 'Submit Information',
    verificationComplete: 'Information submitted',

    // Bank info
    bankInfoTitle: 'Bank Account Information',
    bankInfoDescription: 'For direct deposit of your refund',
    bankNameLabel: 'Bank Name',
    bankNamePlaceholder: 'Search or type bank name...',
    accountTypeLabel: 'Account Type',
    accountTypeChecking: 'Checking',
    accountTypeSavings: 'Savings',
    routingNumberLabel: 'Routing Number',
    accountNumberLabel: 'Account Number',
    confirmAccountLabel: 'Confirm Account Number',
    accountHolderLabel: 'Account Holder Name',
    submitBankInfo: 'Save Bank Info',
    bankInfoComplete: 'Bank info saved',

    // Dependents
    dependentTitle: 'Dependent Information',
    dependentDescription: 'Add dependents you will claim on your return',
    addDependent: 'Add Dependent',
    noDependents: 'No dependents added',
    skipDependents: 'I have no dependents',
    dependentFirstName: 'First Name',
    dependentLastName: 'Last Name',
    dependentRelationship: 'Relationship',
    dependentSSN: 'SSN',
    dependentDOB: 'Date of Birth',
    saveDependent: 'Save Dependent',
    cancelDependent: 'Cancel',
    relationshipChild: 'Child',
    relationshipStepchild: 'Stepchild',
    relationshipParent: 'Parent',
    relationshipSibling: 'Sibling',
    relationshipOther: 'Other',
    dependentsComplete: 'Dependents saved',

    // General
    statusPending: 'Pending',
    statusComplete: 'Complete',
    required: 'Required',
    optional: 'Optional',
    select: '-- Select --',

    // Sign Engagement Letter
    signLetterTitle: 'Sign Engagement Letter',
    signLetterDescription: 'Please review and sign the tax preparation engagement letter',
    engagementLetterText: 'I hereby authorize and engage this tax preparation service to prepare my federal and state income tax returns for the tax year indicated. I understand that the accuracy of my returns depends on the information I provide, and I agree to provide complete and accurate information. I agree to review my completed return before filing and understand that I am ultimately responsible for the contents of my tax return. I understand that this engagement letter is a binding agreement.',
    agreeToTermsLabel: 'I have read and agree to the terms above',
    signatureBoxLabel: 'Your Signature',
    signatureInstructions: 'Draw your signature above',
    clearSignature: 'Clear',
    signatureNameLabel: 'Print Full Legal Name',
    signatureNamePlaceholder: 'Enter your full legal name',
    signatureDateLabel: 'Date',
    submitSignature: 'Sign Engagement Letter',
    signatureComplete: 'Engagement letter signed',

    // Review Tax Summary
    reviewSummaryTitle: 'Review Tax Summary',
    reviewSummaryDescription: 'Please review your tax information summary before submission',
    clientInfoSummary: 'Client Information Summary',
    clientNameLabel: 'Client Name',
    ssnLast4Label: 'SSN (Last 4 digits)',
    filingStatusSummaryLabel: 'Filing Status',
    documentsUploadedLabel: 'Documents Uploaded',
    confirmReviewLabel: 'I confirm that I have reviewed the information above and it is accurate',
    submitReview: 'Confirm Review',
    reviewComplete: 'Review confirmed',

    // Signing PIN
    signingPinTitle: 'Set E-Filing PIN',
    signingPinDescription: 'Create a 5-digit PIN to authorize e-filing your tax return. This PIN will be used to sign your electronic return.',
    pinLabel: 'Enter 5-Digit PIN',
    pinPlaceholder: '12345',
    confirmPinLabel: 'Confirm PIN',
    confirmPinPlaceholder: 'Re-enter PIN',
    pinMismatch: 'PINs do not match',
    pinInvalid: 'PIN must be exactly 5 digits',
    submitPin: 'Set PIN',
    pinComplete: 'E-Filing PIN set',
    gpsRequired: 'Location access is required to sign. Please enable location permissions in your browser settings and reload the page.',
    gpsWaiting: 'Waiting for location access...',
    retryGps: 'Retry Location',
  },
  es: {
    // Page header
    pageTitle: 'Subir Documentos de Impuestos',
    pageSubtitle: 'Suba sus documentos de impuestos de forma segura',

    // Client info
    TaxYear: 'Año Fiscal',
    Hello: 'Hola',
    RequestedDocuments: 'Documentos Solicitados',
    IfyPrep: 'Instrucciones de su preparador de impuestos',

    // Loading/Error states
    loadingRequest: 'Cargando su solicitud de documentos...',
    errorTitle: 'No se pudo cargar la solicitud',
    errorContact: 'Si cree que esto es un error, contacte a su preparador de impuestos.',

    // Progress
    allDocsUploaded: 'Todos los documentos han sido subidos!',
    completed: 'completado',
    docRequired: 'documento requerido',
    remaining: 'faltante',

    // Upload buttons
    uploaded: 'Subido',
    uploading: 'Subiendo...',
    processing: 'Procesando...',
    upload: 'Subir',
    tryAgain: 'Intentar de nuevo',
    REQUIRED: 'REQUERIDO',

    // Completion
    completionTitle: 'Todos los documentos han sido subidos!',
    completionMessage: 'Su preparador de impuestos sera notificado y lo contactara si necesita algo mas.',

    // Help section
    needHelp: 'Necesita Ayuda?',
    acceptedFiles: 'Tipos de archivo aceptados:',
    acceptedFilesDesc: 'PDF, JPG, PNG (maximo 25MB cada uno)',
    tipsTitle: 'Consejos para mejores resultados:',
    tip1: 'Asegurese de que todo el documento sea visible y legible',
    tip2: 'Evite imagenes borrosas u oscuras',
    tip3: 'Para documentos de varias paginas, suba un solo PDF si es posible',
    tip4: 'Puede volver a subir un documento para reemplazar una version anterior',

    // Footer
    secureTransmission: 'Sus documentos se transmiten de forma segura y encriptada.',
    linkExpires: 'Este enlace expira el',

    // Verification info
    verifyInfoTitle: 'Verificar Informacion Personal',
    verifyInfoDescription: 'Por favor confirme sus datos personales',
    ssnLabel: 'Numero de Seguro Social',
    ssnPlaceholder: '123-45-6789',
    filingStatusLabel: 'Estado Civil para Impuestos',
    filingStatusSingle: 'Soltero',
    filingStatusMarried: 'Casado Declarando Juntos',
    filingStatusMarriedSeparate: 'Casado Declarando por Separado',
    filingStatusHeadHousehold: 'Jefe de Familia',
    phoneLabel: 'Numero de Telefono',
    addressLabel: 'Direccion',
    cityLabel: 'Ciudad',
    stateLabel: 'Estado',
    zipLabel: 'Codigo Postal',
    submitVerification: 'Enviar Informacion',
    verificationComplete: 'Informacion enviada',

    // Bank info
    bankInfoTitle: 'Informacion de Cuenta Bancaria',
    bankInfoDescription: 'Para deposito directo de su reembolso',
    bankNameLabel: 'Nombre del Banco',
    bankNamePlaceholder: 'Buscar o escribir nombre del banco...',
    accountTypeLabel: 'Tipo de Cuenta',
    accountTypeChecking: 'Cheques',
    accountTypeSavings: 'Ahorros',
    routingNumberLabel: 'Numero de Ruta',
    accountNumberLabel: 'Numero de Cuenta',
    confirmAccountLabel: 'Confirmar Numero de Cuenta',
    accountHolderLabel: 'Nombre del Titular',
    submitBankInfo: 'Guardar Informacion Bancaria',
    bankInfoComplete: 'Informacion bancaria guardada',

    // Dependents
    dependentTitle: 'Informacion de Dependientes',
    dependentDescription: 'Agregue los dependientes que reclamara en su declaracion',
    addDependent: 'Agregar Dependiente',
    noDependents: 'No hay dependientes agregados',
    skipDependents: 'No tengo dependientes',
    dependentFirstName: 'Nombre',
    dependentLastName: 'Apellido',
    dependentRelationship: 'Relacion',
    dependentSSN: 'SSN',
    dependentDOB: 'Fecha de Nacimiento',
    saveDependent: 'Guardar Dependiente',
    cancelDependent: 'Cancelar',
    relationshipChild: 'Hijo/a',
    relationshipStepchild: 'Hijastro/a',
    relationshipParent: 'Padre/Madre',
    relationshipSibling: 'Hermano/a',
    relationshipOther: 'Otro',
    dependentsComplete: 'Dependientes guardados',

    // General
    statusPending: 'Pendiente',
    statusComplete: 'Completado',
    required: 'Requerido',
    optional: 'Opcional',
    select: '-- Seleccionar --',

    // Sign Engagement Letter
    signLetterTitle: 'Firmar Carta de Compromiso',
    signLetterDescription: 'Por favor revise y firme la carta de compromiso para la preparacion de impuestos',
    engagementLetterText: 'Por la presente autorizo y contrato este servicio de preparacion de impuestos para preparar mis declaraciones de impuestos federales y estatales para el ano fiscal indicado. Entiendo que la precision de mis declaraciones depende de la informacion que proporcione, y acepto proporcionar informacion completa y precisa. Acepto revisar mi declaracion completada antes de presentarla y entiendo que soy el responsable final del contenido de mi declaracion de impuestos. Entiendo que esta carta de compromiso es un acuerdo vinculante.',
    agreeToTermsLabel: 'He leido y acepto los terminos anteriores',
    signatureBoxLabel: 'Su Firma',
    signatureInstructions: 'Dibuje su firma arriba',
    clearSignature: 'Borrar',
    signatureNameLabel: 'Nombre Legal Completo (Letra de Imprenta)',
    signatureNamePlaceholder: 'Ingrese su nombre legal completo',
    signatureDateLabel: 'Fecha',
    submitSignature: 'Firmar Carta de Compromiso',
    signatureComplete: 'Carta de compromiso firmada',

    // Review Tax Summary
    reviewSummaryTitle: 'Revisar Resumen de Impuestos',
    reviewSummaryDescription: 'Por favor revise el resumen de su informacion fiscal antes de enviar',
    clientInfoSummary: 'Resumen de Informacion del Cliente',
    clientNameLabel: 'Nombre del Cliente',
    ssnLast4Label: 'SSN (Ultimos 4 digitos)',
    filingStatusSummaryLabel: 'Estado Civil para Impuestos',
    documentsUploadedLabel: 'Documentos Subidos',
    confirmReviewLabel: 'Confirmo que he revisado la informacion anterior y es correcta',
    submitReview: 'Confirmar Revision',
    reviewComplete: 'Revision confirmada',

    // Signing PIN
    signingPinTitle: 'Establecer PIN de Firma Electronica',
    signingPinDescription: 'Cree un PIN de 5 digitos para autorizar la presentacion electronica de su declaracion de impuestos. Este PIN se usara para firmar su declaracion electronica.',
    pinLabel: 'Ingrese PIN de 5 Digitos',
    pinPlaceholder: '12345',
    confirmPinLabel: 'Confirmar PIN',
    confirmPinPlaceholder: 'Vuelva a ingresar el PIN',
    pinMismatch: 'Los PIN no coinciden',
    pinInvalid: 'El PIN debe tener exactamente 5 digitos',
    submitPin: 'Establecer PIN',
    pinComplete: 'PIN de firma electronica establecido',
    gpsRequired: 'Se requiere acceso a la ubicacion para firmar. Habilite los permisos de ubicacion en la configuracion de su navegador y recargue la pagina.',
    gpsWaiting: 'Esperando acceso a la ubicacion...',
    retryGps: 'Reintentar Ubicacion',
  }
};

const PublicTaxUploadPage: Component = () => {
  const params = useParams<{ id: string, accessToken: string }>();

  // State
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [request, setRequest] = createSignal<TaxDocumentRequest | null>(null);
  const [uploadStates, setUploadStates] = createSignal<Map<string, UploadState>>(new Map());
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);
  const [language, setLanguage] = createSignal<'en' | 'es'>('en');

  // Verification form states
  const [verificationInfo, setVerificationInfo] = createSignal<ClientVerificationInfo>({
    ssn: '',
    filingStatus: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [verificationSubmitted, setVerificationSubmitted] = createSignal(false);

  // Bank info state
  const [bankInfo, setBankInfo] = createSignal<BankInfo>({
    bankName: '',
    accountType: '',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountHolderName: ''
  });
  const [bankInfoSubmitted, setBankInfoSubmitted] = createSignal(false);
  const [bankNameSuggestions, setBankNameSuggestions] = createSignal<string[]>([]);
  const [showBankSuggestions, setShowBankSuggestions] = createSignal(false);

  // Dependent info state
  const [dependents, setDependents] = createSignal<DependentInfo[]>([]);
  const [dependentsSubmitted, setDependentsSubmitted] = createSignal(false);
  const [showDependentForm, setShowDependentForm] = createSignal(false);
  const [currentDependent, setCurrentDependent] = createSignal<DependentInfo>({
    firstName: '',
    lastName: '',
    relationship: '',
    ssn: '',
    dateOfBirth: ''
  });

  // Signature info state (for sign_letter)
  const [signatureInfo, setSignatureInfo] = createSignal<SignatureInfo>({
    name: '',
    date: new Date().toISOString().split('T')[0], // Auto-fill with current date
    agreedToTerms: false
  });
  const [signatureSubmitted, setSignatureSubmitted] = createSignal(false);

  // Signature canvas state
  let signatureCanvasRef: HTMLCanvasElement | null = null;
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [hasSignature, setHasSignature] = createSignal(false);
  let signatureStartTime: number | null = null;
  let signatureStrokeCount = 0;

  // Review confirmation state (for review_summary)
  const [reviewConfirmation, setReviewConfirmation] = createSignal<ReviewConfirmation>({
    confirmed: false
  });
  const [reviewSubmitted, setReviewSubmitted] = createSignal(false);

  // Signing PIN state (for e-filing authorization)
  const [signingPin, setSigningPin] = createSignal('');
  const [confirmPin, setConfirmPin] = createSignal('');
  const [pinSubmitted, setPinSubmitted] = createSignal(false);
  const [pinError, setPinError] = createSignal<string | null>(null);
  const [pinSignerName, setPinSignerName] = createSignal('');

  // PIN Signature canvas state
  let pinSignatureCanvasRef: HTMLCanvasElement | null = null;
  const [isPinDrawing, setIsPinDrawing] = createSignal(false);
  const [hasPinSignature, setHasPinSignature] = createSignal(false);
  let pinSignatureStartTime: number | null = null;
  let pinSignatureStrokeCount = 0;

  // Geolocation & IP state
  const [gpsCoords, setGpsCoords] = createSignal<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsDenied, setGpsDenied] = createSignal(false);
  const [ipAddress, setIpAddress] = createSignal<string | null>(null);

  const requestGeolocation = () => {
    if (!navigator.geolocation) { setGpsDenied(true); return; }
    setGpsDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsDenied(false);
        devLog('Geolocation acquired:', pos.coords.latitude, pos.coords.longitude);
      },
      (err) => { devLog('Geolocation denied:', err.message); setGpsDenied(true); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  onMount(() => {
    requestGeolocation();
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => { setIpAddress(data.ip); devLog('IP acquired:', data.ip); })
      .catch((err) => devLog('IP fetch failed:', err));
  });

  // Helper to parse browser info from user agent
  const parseBrowserInfo = (userAgent: string): { name: string; version: string } => {
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/(\d+)/ },
      { name: 'Safari', regex: /Safari\/(\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+)/ },
      { name: 'Edge', regex: /Edg\/(\d+)/ },
      { name: 'Opera', regex: /OPR\/(\d+)/ },
    ];
    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      if (match) {
        return { name: browser.name, version: match[1] };
      }
    }
    return { name: 'Unknown', version: '0' };
  };

  // Capture browser/device metadata for fraud prevention
  const captureSignatureMetadata = (canvas: HTMLCanvasElement | null, startTime: number | null, strokeCount: number) => {
    const browserInfo = parseBrowserInfo(navigator.userAgent);
    const gps = gpsCoords();
    return {
      userAgent: navigator.userAgent,
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      ipAddress: ipAddress() || undefined,
      gpsLatitude: gps?.latitude,
      gpsLongitude: gps?.longitude,
      gpsAccuracy: gps?.accuracy,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      pageUrl: window.location.href,
      referrer: document.referrer || undefined,
      clientTimestamp: Date.now(),
      timezoneOffset: new Date().getTimezoneOffset(),
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      strokeCount: strokeCount,
      signatureDuration: startTime ? Date.now() - startTime : undefined
    };
  };

  // File input refs for each document type
  const fileInputRefs = new Map<string, HTMLInputElement>();

  // Translation helper
  const getText = (key: string): string => {
    return translations[language()]?.[key] || translations['en']?.[key] || key;
  };

  // Toggle language
  const toggleLanguage = () => {
    setLanguage(language() === 'en' ? 'es' : 'en');
  };

  // Update verification field
  const updateVerificationField = (field: keyof ClientVerificationInfo, value: string) => {
    setVerificationInfo(prev => ({ ...prev, [field]: value }));
  };

  // Update bank info field
  const updateBankField = (field: keyof BankInfo, value: string) => {
    setBankInfo(prev => ({ ...prev, [field]: value }));

    // Show suggestions when typing bank name
    if (field === 'bankName') {
      if (value.length >= 1) {
        const filtered = US_BANKS.filter(bank =>
          bank.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 8); // Limit to 8 suggestions
        setBankNameSuggestions(filtered);
        setShowBankSuggestions(filtered.length > 0);
      } else {
        setBankNameSuggestions([]);
        setShowBankSuggestions(false);
      }
    }
  };

  // Select bank from suggestions
  const selectBankName = (bankName: string) => {
    setBankInfo(prev => ({ ...prev, bankName }));
    setShowBankSuggestions(false);
    setBankNameSuggestions([]);
  };

  // Update current dependent field
  const updateDependentField = (field: keyof DependentInfo, value: string) => {
    setCurrentDependent(prev => ({ ...prev, [field]: value }));
  };

  // Update signature field
  const updateSignatureField = (field: keyof SignatureInfo, value: string | boolean) => {
    setSignatureInfo(prev => ({ ...prev, [field]: value }));
  };

  // Signature canvas functions
  const initSignatureCanvas = (canvas: HTMLCanvasElement) => {
    signatureCanvasRef = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const getCanvasCoordinates = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    if (!signatureCanvasRef) return;
    e.preventDefault();
    setIsDrawing(true);
    // Track signature start time on first stroke
    if (!signatureStartTime) {
      signatureStartTime = Date.now();
    }
    const ctx = signatureCanvasRef.getContext('2d');
    if (ctx) {
      const { x, y } = getCanvasCoordinates(e, signatureCanvasRef);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing() || !signatureCanvasRef) return;
    e.preventDefault();
    const ctx = signatureCanvasRef.getContext('2d');
    if (ctx) {
      const { x, y } = getCanvasCoordinates(e, signatureCanvasRef);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing()) {
      signatureStrokeCount++;
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!signatureCanvasRef) return;
    const ctx = signatureCanvasRef.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, signatureCanvasRef.width, signatureCanvasRef.height);
      setHasSignature(false);
      updateSignatureField('signatureImage', '');
      // Reset tracking variables
      signatureStartTime = null;
      signatureStrokeCount = 0;
    }
  };

  const saveSignatureImage = (): string => {
    if (!signatureCanvasRef || !hasSignature()) return '';
    return signatureCanvasRef.toDataURL('image/png');
  };

  // PIN Signature canvas functions
  const initPinSignatureCanvas = (canvas: HTMLCanvasElement) => {
    pinSignatureCanvasRef = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const startPinDrawing = (e: MouseEvent | TouchEvent) => {
    if (!pinSignatureCanvasRef) return;
    e.preventDefault();
    setIsPinDrawing(true);
    // Track signature start time on first stroke
    if (!pinSignatureStartTime) {
      pinSignatureStartTime = Date.now();
    }
    const ctx = pinSignatureCanvasRef.getContext('2d');
    if (ctx) {
      const { x, y } = getCanvasCoordinates(e, pinSignatureCanvasRef);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const drawPin = (e: MouseEvent | TouchEvent) => {
    if (!isPinDrawing() || !pinSignatureCanvasRef) return;
    e.preventDefault();
    const ctx = pinSignatureCanvasRef.getContext('2d');
    if (ctx) {
      const { x, y } = getCanvasCoordinates(e, pinSignatureCanvasRef);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasPinSignature(true);
    }
  };

  const stopPinDrawing = () => {
    if (isPinDrawing()) {
      pinSignatureStrokeCount++;
    }
    setIsPinDrawing(false);
  };

  const clearPinSignature = () => {
    if (!pinSignatureCanvasRef) return;
    const ctx = pinSignatureCanvasRef.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, pinSignatureCanvasRef.width, pinSignatureCanvasRef.height);
      setHasPinSignature(false);
      // Reset tracking variables
      pinSignatureStartTime = null;
      pinSignatureStrokeCount = 0;
    }
  };

  const savePinSignatureImage = (): string => {
    if (!pinSignatureCanvasRef || !hasPinSignature()) return '';
    return pinSignatureCanvasRef.toDataURL('image/png');
  };

  // Update review confirmation field
  const updateReviewField = (field: keyof ReviewConfirmation, value: boolean) => {
    setReviewConfirmation(prev => ({ ...prev, [field]: value }));
  };

  // Handle submit verification
  const handleSubmitVerification = async () => {
    const info = verificationInfo();
    if (!info.ssn || !info.filingStatus) {
      alert(language() === 'es'
        ? 'Por favor complete el SSN y el estado civil'
        : 'Please complete SSN and filing status');
      return;
    }

    try {
      const currentRequest = request();
      if (!currentRequest) return;

      const result = await updateDocumentRequestPublic(
        currentRequest.id,
        params.accessToken,
        {
          clientVerification: {
            ssn: info.ssn,
            filingStatus: info.filingStatus,
            phone: info.phone,
            address: info.address,
            city: info.city,
            state: info.state,
            zipCode: info.zipCode,
            submittedAt: Date.now()
          },
          markDocumentUploaded: 'verify_info'
        },
        currentRequest.businessId
      );

      if (result.success) {
        setVerificationSubmitted(true);
        setSuccessMessage(getText('verificationComplete'));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(result.error || 'Error saving verification info');
      }
    } catch (error) {
      devLog('Error submitting verification:', error);
      alert(language() === 'es' ? 'Error al guardar la informacion' : 'Error saving information');
    }
  };

  // Handle submit bank info
  const handleSubmitBankInfo = async () => {
    const info = bankInfo();
    if (!info.accountType || !info.routingNumber || !info.accountNumber) {
      alert(language() === 'es'
        ? 'Por favor complete todos los campos bancarios requeridos'
        : 'Please complete all required bank fields');
      return;
    }
    if (info.accountNumber !== info.confirmAccountNumber) {
      alert(language() === 'es'
        ? 'Los numeros de cuenta no coinciden'
        : 'Account numbers do not match');
      return;
    }

    try {
      const currentRequest = request();
      if (!currentRequest) return;

      const result = await updateDocumentRequestPublic(
        currentRequest.id,
        params.accessToken,
        {
          clientBankInfo: {
            bankName: info.bankName || undefined,
            accountType: info.accountType as 'checking' | 'savings',
            routingNumber: info.routingNumber,
            accountNumber: info.accountNumber,
            accountHolderName: info.accountHolderName,
            submittedAt: Date.now()
          },
          markDocumentUploaded: 'verify_bank_info'
        },
        currentRequest.businessId
      );

      if (result.success) {
        setBankInfoSubmitted(true);
        setSuccessMessage(getText('bankInfoComplete'));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(result.error || 'Error saving bank info');
      }
    } catch (error) {
      devLog('Error submitting bank info:', error);
      alert(language() === 'es' ? 'Error al guardar la informacion bancaria' : 'Error saving bank information');
    }
  };

  // Handle adding a dependent
  const handleAddDependent = () => {
    const dep = currentDependent();
    if (!dep.firstName || !dep.lastName || !dep.relationship) {
      alert(language() === 'es'
        ? 'Por favor complete nombre, apellido y relacion'
        : 'Please complete first name, last name, and relationship');
      return;
    }
    setDependents(prev => [...prev, { ...dep }]);
    setCurrentDependent({
      firstName: '',
      lastName: '',
      relationship: '',
      ssn: '',
      dateOfBirth: ''
    });
    setShowDependentForm(false);
  };

  // Handle completing dependents section
  const handleCompleteDependents = async () => {
    try {
      const currentRequest = request();
      if (!currentRequest) return;

      const result = await updateDocumentRequestPublic(
        currentRequest.id,
        params.accessToken,
        {
          clientDependents: dependents(),
          markDocumentUploaded: 'provide_dependent_info'
        },
        currentRequest.businessId
      );

      if (result.success) {
        setDependentsSubmitted(true);
        setSuccessMessage(getText('dependentsComplete'));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(result.error || 'Error saving dependents info');
      }
    } catch (error) {
      devLog('Error submitting dependents:', error);
      alert(language() === 'es' ? 'Error al guardar los dependientes' : 'Error saving dependents');
    }
  };

  // Handle submit signature (engagement letter)
  const handleSubmitSignature = async () => {
    const info = signatureInfo();
    if (!info.name || !info.agreedToTerms) {
      alert(language() === 'es'
        ? 'Por favor ingrese su nombre y acepte los términos'
        : 'Please enter your name and agree to the terms');
      return;
    }

    if (!hasSignature()) {
      alert(language() === 'es'
        ? 'Por favor firme en el recuadro de firma'
        : 'Please sign in the signature box');
      return;
    }

    if (!gpsCoords() || gpsDenied()) {
      alert(getText('gpsRequired'));
      return;
    }

    try {
      const currentRequest = request();
      if (!currentRequest) return;

      // Get signature image from canvas
      const signatureImage = saveSignatureImage();

      // Capture browser/device metadata for fraud prevention
      const metadata = captureSignatureMetadata(signatureCanvasRef, signatureStartTime, signatureStrokeCount);

      const result = await updateDocumentRequestPublic(
        currentRequest.id,
        params.accessToken,
        {
          clientSignature: {
            name: info.name,
            date: info.date,
            agreedToTerms: info.agreedToTerms,
            signedAt: Date.now(),
            signatureImage: signatureImage,
            metadata: metadata
          },
          markDocumentUploaded: 'sign_letter',
          status: 'completed'
        },
        currentRequest.businessId
      );

      if (result.success) {
        setSignatureSubmitted(true);
        setSuccessMessage(getText('signatureComplete'));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(result.error || 'Error saving signature');
      }
    } catch (error) {
      devLog('Error submitting signature:', error);
      alert(language() === 'es' ? 'Error al guardar la firma' : 'Error saving signature');
    }
  };

  // Handle submit review confirmation (tax summary review)
  const handleSubmitReview = async () => {
    const info = reviewConfirmation();
    if (!info.confirmed) {
      alert(language() === 'es'
        ? 'Por favor confirme que ha revisado el resumen'
        : 'Please confirm that you have reviewed the summary');
      return;
    }

    try {
      const currentRequest = request();
      if (!currentRequest) return;

      const result = await updateDocumentRequestPublic(
        currentRequest.id,
        params.accessToken,
        {
          clientReviewConfirmation: {
            confirmed: info.confirmed,
            reviewedAt: Date.now()
          },
          markDocumentUploaded: 'review_summary'
        },
        currentRequest.businessId
      );

      if (result.success) {
        setReviewSubmitted(true);
        setSuccessMessage(getText('reviewComplete'));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(result.error || 'Error saving review confirmation');
      }
    } catch (error) {
      devLog('Error submitting review:', error);
      alert(language() === 'es' ? 'Error al guardar la confirmacion' : 'Error saving confirmation');
    }
  };

  // Handle submit signing PIN
  const handleSubmitSigningPin = async () => {
    const pin = signingPin();
    const confirm = confirmPin();
    const name = pinSignerName();

    // Validate PIN format (5 digits)
    if (!/^\d{5}$/.test(pin)) {
      setPinError(getText('pinInvalid'));
      return;
    }

    // Validate PINs match
    if (pin !== confirm) {
      setPinError(getText('pinMismatch'));
      return;
    }

    // Validate signature exists
    if (!hasPinSignature()) {
      setPinError(language() === 'es' ? 'Se requiere firma' : 'Signature is required');
      return;
    }

    // Validate name
    if (!name.trim()) {
      setPinError(language() === 'es' ? 'Se requiere el nombre completo' : 'Full name is required');
      return;
    }

    // Validate GPS
    if (!gpsCoords() || gpsDenied()) {
      setPinError(getText('gpsRequired'));
      return;
    }

    setPinError(null);

    try {
      const currentRequest = request();
      if (!currentRequest) return;

      // Get the signature image
      const signatureImage = savePinSignatureImage();

      const metadata = captureSignatureMetadata(pinSignatureCanvasRef, pinSignatureStartTime, pinSignatureStrokeCount);

      const result = await updateDocumentRequestPublic(
        currentRequest.id,
        params.accessToken,
        {
          clientSigningPin: {
            pin: pin,
            setAt: Date.now(),
            signerName: name.trim(),
            signatureImage: signatureImage,
            metadata: metadata
          },
          markDocumentUploaded: 'signing_pin',
          status: 'completed'
        },
        currentRequest.businessId
      );

      if (result.success) {
        setPinSubmitted(true);
        setSuccessMessage(getText('pinComplete'));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert(result.error || 'Error saving PIN');
      }
    } catch (error) {
      devLog('Error submitting signing PIN:', error);
      alert(language() === 'es' ? 'Error al guardar el PIN' : 'Error saving PIN');
    }
  };

  // Load request data on mount
  createEffect(async () => {
    const accessToken = params.accessToken;
    const id = params.id;

    if (!accessToken) {
      setError('Invalid access link. Please check your URL.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);



      const documentRequest = await getDocumentRequestByToken(id, accessToken);

      if (!documentRequest) {
        setError('This document request was not found. The link may be invalid or expired.');
        setIsLoading(false);
        return;
      }

      if (documentRequest.status === 'expired' || isRequestExpired(documentRequest)) {
        setError('This document request has expired. Please contact your tax preparer for a new link.');
        setIsLoading(false);
        return;
      }

      if (documentRequest.status === 'cancelled') {
        setError('This document request has been cancelled. Please contact your tax preparer.');
        setIsLoading(false);
        return;
      }

      setRequest(documentRequest);

      devLog(documentRequest)
      // Initialize upload states for each document type
      const states = new Map<string, UploadState>();
      documentRequest.requestedDocuments.forEach(doc => {
        states.set(doc.type, {
          docType: doc.type,
          status: doc.uploaded ? 'success' : 'idle',
          progress: doc.uploaded ? 100 : 0,
          fileName: undefined
        });
      });
      setUploadStates(states);

    } catch (err) {
      devLog('Error loading document request:', err);
      setError('Unable to load document request. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  });

  // Handle file selection for a specific document type
  const handleFileSelect = async (docType: string, event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      updateUploadState(docType, {
        status: 'error',
        progress: 0,
        errorMessage: 'Invalid file type. Please upload a PDF, JPG, or PNG file.'
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      updateUploadState(docType, {
        status: 'error',
        progress: 0,
        errorMessage: 'File is too large. Maximum size is 25MB.'
      });
      return;
    }

    // Start upload
    await uploadFile(docType, file);

    // Reset input
    input.value = '';
  };

  // Update upload state for a specific document type
  const updateUploadState = (docType: string, updates: Partial<UploadState>) => {
    setUploadStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(docType) || { docType, status: 'idle', progress: 0 };
      newMap.set(docType, { ...current, ...updates });
      return newMap;
    });
  };

  // Upload file to server
  const uploadFile = async (docType: string, file: File) => {
   
    if (! request()) return;

    updateUploadState(docType, {
      status: 'uploading',
      progress: 10,
      fileName: file.name,
      errorMessage: undefined
    });

    try {
      // Step 1: Upload document
      updateUploadState(docType, { progress: 30 });


      const currentRequest = request();
      if (!currentRequest) {
        throw new Error('No request found');
      }

      const uploadResult = await uploadTaxDocument(
        file,
        currentRequest.taxPortalId,
        currentRequest.taxYear,
        { documentType: docType, businessId: currentRequest.businessId }
      );

      if (!uploadResult.success || !uploadResult.documentId) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Step 2: Process document with AI
      updateUploadState(docType, { status: 'processing', progress: 60 });

      const processResult = await processTaxDocument(uploadResult.documentId);

      if (!processResult.success) {
        devLog('Document processing failed, but upload succeeded:', processResult.error);
        // Continue anyway - upload succeeded
      }

      // Step 3: Mark document as uploaded
      updateUploadState(docType, { progress: 90 });

      await markDocumentUploaded(
        currentRequest.id,
        currentRequest.businessId,
        docType as any,
        uploadResult.documentId
      );

      // Step 4: Update local request state
      setRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          requestedDocuments: prev.requestedDocuments.map(doc =>
            doc.type === docType
              ? { ...doc, uploaded: true, documentId: uploadResult.documentId }
              : doc
          ),
          uploadedDocuments: [...prev.uploadedDocuments, uploadResult.documentId!]
        };
      });

      updateUploadState(docType, { status: 'success', progress: 100 });

      setSuccessMessage(`Successfully uploaded ${file.name}!`);
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      devLog('Upload error:', err);
      updateUploadState(docType, {
        status: 'error',
        progress: 0,
        errorMessage: (err as Error).message || 'Upload failed. Please try again.'
      });
    }
  };

  // Trigger file input click
  const triggerFileInput = (docType: string) => {
    const input = fileInputRefs.get(docType);
    if (input) {
      input.click();
    }
  };

  // Get document type label
  const getDocLabel = (doc: RequestedDocumentType): string => {
    return doc.label || doc.type.replace(/_/g, '-').toUpperCase();
  };

  // Get status icon
  const getStatusIcon = (docType: string): string => {
    const state = uploadStates().get(docType);
    if (!state) return '';

    switch (state.status) {
      case 'success': return '';
      case 'uploading': return '';
      case 'processing': return '';
      case 'error': return '';
      default: return '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Styles
  const pageContainerStyle = {
    'min-height': '100vh',
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
    padding: '1rem'
  };

  const contentContainerStyle = {
    'max-width': '800px',
    margin: '0 auto',
    padding: '1rem'
  };

  const headerStyle = {
    'text-align': 'center' as const,
    'margin-bottom': '2rem'
  };

  const logoStyle = {
    'font-size': '2.5rem',
    'margin-bottom': '1rem'
  };

  const titleStyle = {
    'font-size': '1.75rem',
    'font-weight': '700',
    color: '#1e293b',
    'margin-bottom': '0.5rem'
  };

  const subtitleStyle = {
    color: '#64748b',
    'font-size': '1rem'
  };

  const cardStyle = {
    background: 'white',
    'border-radius': '16px',
    'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    padding: '0',
    overflow: 'hidden',
    'margin-bottom': '1.5rem'
  };

  const cardHeaderStyle = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    padding: '1.5rem',
    color: 'white'
  };

  const clientNameStyle = {
    'font-size': '1.5rem',
    'font-weight': '600',
    'margin-bottom': '0.5rem'
  };

  const metaInfoStyle = {
    display: 'flex',
    'flex-wrap': 'wrap' as const,
    gap: '1rem',
    'font-size': '0.875rem',
    opacity: '0.9'
  };

  const cardBodyStyle = {
    padding: '1.5rem'
  };

  const progressBarContainerStyle = {
    background: '#f1f5f9',
    'border-radius': '9999px',
    height: '12px',
    overflow: 'hidden',
    'margin-bottom': '0.5rem'
  };

  const progressBarStyle = (progress: number) => ({
    background: progress === 100
      ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
      : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
    height: '100%',
    width: `${progress}%`,
    transition: 'width 0.3s ease',
    'border-radius': '9999px'
  });

  const progressTextStyle = {
    'text-align': 'center' as const,
    'font-size': '0.875rem',
    color: '#64748b'
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: '#1e293b',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const documentListStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem'
  };

  const documentItemStyle = (isUploaded: boolean, isError: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '1rem',
    background: isError ? '#fef2f2' : isUploaded ? '#f0fdf4' : '#f8fafc',
    'border-radius': '12px',
    border: `1px solid ${isError ? '#fecaca' : isUploaded ? '#bbf7d0' : '#e2e8f0'}`,
    'flex-wrap': 'wrap' as const,
    gap: '0.75rem'
  });

  const documentInfoStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
    flex: '1',
    'min-width': '200px'
  };

  const checkboxStyle = (isUploaded: boolean, isRequired: boolean) => ({
    width: '24px',
    height: '24px',
    'border-radius': '6px',
    border: `2px solid ${isUploaded ? '#22c55e' : isRequired ? '#3b82f6' : '#cbd5e1'}`,
    background: isUploaded ? '#22c55e' : 'white',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    color: 'white',
    'font-size': '0.75rem',
    'flex-shrink': '0'
  });

  const documentLabelStyle = {
    'font-weight': '500',
    color: '#1e293b'
  };

  const requiredBadgeStyle = {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '0.125rem 0.5rem',
    'border-radius': '4px',
    'font-size': '0.7rem',
    'font-weight': '600'
  };

  const uploadBtnStyle = (isUploaded: boolean, isUploading: boolean) => ({
    padding: '0.5rem 1rem',
    'border-radius': '8px',
    border: 'none',
    background: isUploaded
      ? '#dcfce7'
      : isUploading
        ? '#e0e7ff'
        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: isUploaded
      ? '#16a34a'
      : isUploading
        ? '#4f46e5'
        : 'white',
    cursor: isUploaded || isUploading ? 'default' : 'pointer',
    'font-weight': '500',
    'font-size': '0.875rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'white-space': 'nowrap' as const,
    transition: 'all 0.2s ease'
  });

  const errorTextStyle = {
    color: '#dc2626',
    'font-size': '0.8rem',
    'margin-top': '0.25rem',
    width: '100%'
  };

  const uploadProgressStyle = {
    width: '100%',
    height: '4px',
    background: '#e2e8f0',
    'border-radius': '2px',
    overflow: 'hidden',
    'margin-top': '0.5rem'
  };

  // Form styles for verification forms
  const formCardStyle = {
    background: 'white',
    'border-radius': '12px',
    border: '1px solid #e2e8f0',
    padding: '1.5rem',
    'margin-bottom': '0.75rem'
  };

  const formHeaderStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '0.5rem'
  };

  const formTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: '#1e293b'
  };

  const formDescriptionStyle = {
    color: '#64748b',
    'font-size': '0.875rem',
    'margin-bottom': '1rem'
  };

  const formFieldsStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '0.75rem'
  };

  const labelStyle = {
    display: 'block',
    'font-size': '0.875rem',
    'font-weight': '500',
    color: '#475569',
    'margin-bottom': '0.375rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    'border-radius': '8px',
    border: '1px solid #e2e8f0',
    'font-size': '1rem',
    background: 'white',
    'box-sizing': 'border-box' as const
  };

  const selectStyle = {
    ...inputStyle,
    appearance: 'none' as const,
    'background-image': 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
    'background-position': 'right 0.75rem center',
    'background-repeat': 'no-repeat',
    'background-size': '1.25rem 1.25rem',
    'padding-right': '2.5rem'
  };

  const twoColStyle = {
    display: 'grid',
    'grid-template-columns': '1fr 1fr',
    gap: '0.75rem'
  };

  const submitButtonStyle = {
    width: '100%',
    padding: '0.875rem 1.5rem',
    'border-radius': '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    'font-size': '1rem',
    'font-weight': '600',
    cursor: 'pointer',
    'margin-top': '0.5rem'
  };

  const secondaryButtonStyle = {
    padding: '0.75rem 1.5rem',
    'border-radius': '8px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#475569',
    'font-size': '1rem',
    'font-weight': '500',
    cursor: 'pointer'
  };

  const formSuccessStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.75rem',
    padding: '1rem',
    color: '#16a34a',
    'font-weight': '500'
  };

  const statusBadgeStyle = (isComplete: boolean) => ({
    padding: '0.375rem 0.75rem',
    'border-radius': '9999px',
    'font-size': '0.875rem',
    'font-weight': '600',
    background: isComplete ? '#dcfce7' : '#f1f5f9',
    color: isComplete ? '#16a34a' : '#64748b'
  });

  const dependentCardStyle = {
    padding: '0.75rem 1rem',
    background: '#f8fafc',
    'border-radius': '8px',
    'margin-bottom': '0.5rem',
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center'
  };

  const alertStyle = (type: 'success' | 'error' | 'info') => {
    const colors = {
      success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
      error: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
      info: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' }
    };
    return {
      padding: '1rem',
      background: colors[type].bg,
      border: `1px solid ${colors[type].border}`,
      'border-radius': '12px',
      color: colors[type].color,
      display: 'flex',
      'align-items': 'center',
      gap: '0.75rem',
      'margin-bottom': '1rem'
    };
  };

  const instructionsCardStyle = {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    'border-radius': '12px',
    padding: '1rem',
    'margin-bottom': '1rem'
  };

  const instructionsTitleStyle = {
    'font-weight': '600',
    color: '#92400e',
    'margin-bottom': '0.5rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem'
  };

  const instructionsTextStyle = {
    color: '#a16207',
    'font-size': '0.9rem',
    'line-height': '1.5'
  };

  const footerStyle = {
    'text-align': 'center' as const,
    padding: '2rem 1rem',
    color: '#94a3b8',
    'font-size': '0.875rem'
  };

  const loadingContainerStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '400px',
    gap: '1rem'
  };

  const spinnerStyle = {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    'border-top-color': '#3b82f6',
    'border-radius': '50%',
    animation: 'spin 1s linear infinite'
  };

  // Computed values
  const current2Request = request();
  const progress = current2Request ? getUploadProgress(current2Request) : 0;
  const missingRequired = current2Request ? getMissingRequiredDocuments(current2Request) : [];

  return (
    <div style={pageContainerStyle}>
      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .document-item {
            flex-direction: column;
            align-items: stretch !important;
          }
          .document-info {
            margin-bottom: 0.5rem;
          }
          .upload-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div style={contentContainerStyle}>
        {/* Language Toggle */}
        <button
          style={{
            position: 'absolute' as const,
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            'border-radius': '8px',
            cursor: 'pointer',
            'font-size': '0.875rem',
            color: '#475569'
          }}
          onClick={toggleLanguage}
        >
          {language() === 'en' ? 'Espanol' : 'English'}
        </button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={logoStyle}>{getText('pageTitle')}</div>
          <p style={subtitleStyle}>{getText('pageSubtitle')}</p>
        </div>

        {/* Loading State */}
        <Show when={isLoading()}>
          <div style={{ ...cardStyle, padding: '3rem' }}>
            <div style={loadingContainerStyle}>
              <div style={spinnerStyle} />
              <p style={{ color: '#64748b' }}>{getText('loadingRequest')}</p>
            </div>
          </div>
        </Show>

        {/* Error State */}
        <Show when={!isLoading() && error()}>
          <div style={cardStyle}>
            <div style={{ padding: '3rem', 'text-align': 'center' }}>
              <div style={{ 'font-size': '4rem', 'margin-bottom': '1rem' }}>X</div>
              <h2 style={{ color: '#dc2626', 'margin-bottom': '0.5rem' }}>{getText('errorTitle')}</h2>
              <p style={{ color: '#64748b', 'margin-bottom': '1.5rem' }}>{error()}</p>
              <p style={{ color: '#94a3b8', 'font-size': '0.875rem' }}>
                {getText('errorContact')}
              </p>
            </div>
          </div>
        </Show>

        {/* Main Content */}
        <Show when={!isLoading() && !error() &&  request()}>
          {/* Success Message */}
          <Show when={successMessage()}>
            <div style={alertStyle('success')}>
              <span style={{ 'font-size': '1.25rem' }}>OK</span>
              <span>{successMessage()}</span>
            </div>
          </Show>

          {/* Client Info Card */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={clientNameStyle}>
                {getText('Hello')}, { request()?.clientName || request()?.recipientName}!
              </div>
              <div style={metaInfoStyle}>
                <span> {getText('TaxYear')}: { request()?.taxYear}</span>
                <span>|</span>
                <span>{formatExpiration( request()?.expiresAt || 0)}</span>
              </div>
            </div>

            <div style={cardBodyStyle}>
              {/* Progress Bar */}
              <div style={{ 'margin-bottom': '1.5rem' }}>
                <div style={progressBarContainerStyle}>
                  <div style={progressBarStyle(progress)} />
                </div>
                <div style={progressTextStyle}>
                  {progress === 100
                    ? getText('allDocsUploaded')
                    : `${progress}% ${getText('completed')} - ${missingRequired.length} ${getText('docRequired')}${missingRequired.length !== 1 ? 's' : ''} ${getText('remaining')}`
                  }
                </div>
              </div>

              {/* Instructions */}
              <Show when={ request()?.instructions}>
                <div style={instructionsCardStyle}>
                  <div style={instructionsTitleStyle}>
                    <span>{getText('IfyPrep')}:</span>
                  </div>
                  <div style={instructionsTextStyle}>
                    { request()?.instructions}
                  </div>
                </div>
              </Show>

              {/* Document List */}
              <div style={sectionTitleStyle}>
                <span>{getText('RequestedDocuments')}</span>
              </div>

              <div style={documentListStyle}>
                <For each={ request()?.requestedDocuments}>
                  {(doc) => {
                    // Debug: check document type
                    devLog('Document:', doc.type, 'Label:', doc.label, 'Is verification form?', isVerificationFormType(doc.type));

                    const state = uploadStates().get(doc.type);
                    const isUploaded = doc.uploaded || state?.status === 'success';
                    const isUploading = state?.status === 'uploading' || state?.status === 'processing';
                    const isError = state?.status === 'error';
                    const isVerificationForm = isVerificationFormType(doc.type);

                    // Check if this verification form type is already submitted
                    const isFormSubmitted = () => {
                      const currentRequest = request();
                      if (doc.type === 'verify_ssn' || doc.type === 'verify_info') {
                        return verificationSubmitted() || !!currentRequest?.clientVerification?.submittedAt;
                      }
                      if (doc.type === 'verify_bank_info') {
                        return bankInfoSubmitted() || !!currentRequest?.clientBankInfo?.submittedAt;
                      }
                      if (doc.type === 'provide_dependent_info') {
                        return dependentsSubmitted() || (currentRequest?.clientDependents && currentRequest.clientDependents.length > 0);
                      }
                      if (doc.type === 'sign_letter') {
                        return signatureSubmitted() || !!currentRequest?.clientSignature?.signedAt;
                      }
                      if (doc.type === 'review_summary') {
                        return reviewSubmitted() || !!currentRequest?.clientReviewConfirmation?.reviewedAt;
                      }
                      if (doc.type === 'set_signing_pin') {
                        return pinSubmitted() || !!currentRequest?.clientSigningPin?.setAt;
                      }
                      return false;
                    };

                    // Render verification forms
                    if (isVerificationForm) {
                      return (
                        <div style={formCardStyle}>
                          {/* Personal Info / SSN Verification Form */}
                          <Show when={doc.type === 'verify_ssn' || doc.type === 'verify_info'}>
                            <div style={formHeaderStyle}>
                              <div style={formTitleStyle}>
                                {getText('verifyInfoTitle')}
                                {doc.required && (
                                  <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <div style={statusBadgeStyle(isFormSubmitted())}>
                                {isFormSubmitted() ? getText('statusComplete') : getText('statusPending')}
                              </div>
                            </div>
                            <p style={formDescriptionStyle}>{getText('verifyInfoDescription')}</p>

                            <Show when={!verificationSubmitted() && !request()?.clientVerification?.submittedAt}>
                              <div style={formFieldsStyle}>
                                <div>
                                  <label style={labelStyle}>{getText('ssnLabel')} *</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder={getText('ssnPlaceholder')}
                                    value={verificationInfo().ssn}
                                    onInput={(e) => updateVerificationField('ssn', e.currentTarget.value)}
                                  />
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('filingStatusLabel')} *</label>
                                  <select
                                    style={selectStyle}
                                    value={verificationInfo().filingStatus}
                                    onChange={(e) => updateVerificationField('filingStatus', e.currentTarget.value)}
                                  >
                                    <option value="">{getText('select')}</option>
                                    <option value="single">{getText('filingStatusSingle')}</option>
                                    <option value="married_jointly">{getText('filingStatusMarried')}</option>
                                    <option value="married_separate">{getText('filingStatusMarriedSeparate')}</option>
                                    <option value="head_household">{getText('filingStatusHeadHousehold')}</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('phoneLabel')}</label>
                                  <input
                                    type="tel"
                                    style={inputStyle}
                                    placeholder="(555) 123-4567"
                                    value={verificationInfo().phone}
                                    onInput={(e) => updateVerificationField('phone', e.currentTarget.value)}
                                  />
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('addressLabel')}</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="123 Main St"
                                    value={verificationInfo().address}
                                    onInput={(e) => updateVerificationField('address', e.currentTarget.value)}
                                  />
                                </div>

                                <div style={twoColStyle}>
                                  <div>
                                    <label style={labelStyle}>{getText('cityLabel')}</label>
                                    <input
                                      type="text"
                                      style={inputStyle}
                                      placeholder="Miami"
                                      value={verificationInfo().city}
                                      onInput={(e) => updateVerificationField('city', e.currentTarget.value)}
                                    />
                                  </div>
                                  <div>
                                    <label style={labelStyle}>{getText('stateLabel')}</label>
                                    <input
                                      type="text"
                                      style={inputStyle}
                                      placeholder="FL"
                                      value={verificationInfo().state}
                                      onInput={(e) => updateVerificationField('state', e.currentTarget.value)}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('zipLabel')}</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="33101"
                                    maxLength={10}
                                    value={verificationInfo().zipCode}
                                    onInput={async (e) => {
                                      const zip = e.currentTarget.value;
                                      updateVerificationField('zipCode', zip);

                                      // Auto-lookup city/state when ZIP is 5 digits
                                      const cleanZip = zip.replace(/\D/g, '');
                                      if (cleanZip.length === 5) {
                                        const result = await lookupZipCode(cleanZip);
                                        if (result) {
                                          setVerificationInfo(prev => ({
                                            ...prev,
                                            city: result.city,
                                            state: result.stateAbbreviation
                                          }));
                                        }
                                      }
                                    }}
                                  />
                                </div>

                                <button style={submitButtonStyle} onClick={handleSubmitVerification}>
                                  {getText('submitVerification')}
                                </button>
                              </div>
                            </Show>

                            <Show when={verificationSubmitted() || request()?.clientVerification?.submittedAt}>
                              <div style={formSuccessStyle}>
                                <span style={{ 'font-size': '1.5rem' }}>OK</span>
                                <span>{getText('verificationComplete')}</span>
                              </div>
                            </Show>
                          </Show>

                          {/* Bank Info Verification Form */}
                          <Show when={doc.type === 'verify_bank_info'}>
                            <div style={formHeaderStyle}>
                              <div style={formTitleStyle}>
                                {getText('bankInfoTitle')}
                                {doc.required && (
                                  <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <div style={statusBadgeStyle(isFormSubmitted())}>
                                {isFormSubmitted() ? getText('statusComplete') : getText('statusPending')}
                              </div>
                            </div>
                            <p style={formDescriptionStyle}>{getText('bankInfoDescription')}</p>

                            <Show when={!bankInfoSubmitted() && !request()?.clientBankInfo?.submittedAt}>
                              <div style={formFieldsStyle}>
                                {/* Bank Name with Autocomplete */}
                                <div style={{ position: 'relative' }}>
                                  <label style={labelStyle}>{getText('bankNameLabel')}</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder={getText('bankNamePlaceholder')}
                                    value={bankInfo().bankName}
                                    onInput={(e) => updateBankField('bankName', e.currentTarget.value)}
                                    onFocus={() => {
                                      if (bankInfo().bankName.length >= 1) {
                                        const filtered = US_BANKS.filter(bank =>
                                          bank.toLowerCase().includes(bankInfo().bankName.toLowerCase())
                                        ).slice(0, 8);
                                        setBankNameSuggestions(filtered);
                                        setShowBankSuggestions(filtered.length > 0);
                                      }
                                    }}
                                    onBlur={() => {
                                      // Delay hiding to allow click on suggestion
                                      setTimeout(() => setShowBankSuggestions(false), 200);
                                    }}
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
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-color, #f5f5f5)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              selectBankName(bank);
                                            }}
                                          >
                                            {bank}
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </Show>
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('accountTypeLabel')} *</label>
                                  <select
                                    style={selectStyle}
                                    value={bankInfo().accountType}
                                    onChange={(e) => updateBankField('accountType', e.currentTarget.value)}
                                  >
                                    <option value="">{getText('select')}</option>
                                    <option value="checking">{getText('accountTypeChecking')}</option>
                                    <option value="savings">{getText('accountTypeSavings')}</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('routingNumberLabel')} *</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="123456789"
                                    maxLength={9}
                                    value={bankInfo().routingNumber}
                                    onInput={(e) => updateBankField('routingNumber', e.currentTarget.value)}
                                  />
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('accountNumberLabel')} *</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="123456789012"
                                    value={bankInfo().accountNumber}
                                    onInput={(e) => updateBankField('accountNumber', e.currentTarget.value)}
                                  />
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('confirmAccountLabel')} *</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="123456789012"
                                    value={bankInfo().confirmAccountNumber}
                                    onInput={(e) => updateBankField('confirmAccountNumber', e.currentTarget.value)}
                                  />
                                </div>

                                <div>
                                  <label style={labelStyle}>{getText('accountHolderLabel')}</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder="John Doe"
                                    value={bankInfo().accountHolderName}
                                    onInput={(e) => updateBankField('accountHolderName', e.currentTarget.value)}
                                  />
                                </div>

                                <button style={submitButtonStyle} onClick={handleSubmitBankInfo}>
                                  {getText('submitBankInfo')}
                                </button>
                              </div>
                            </Show>

                            <Show when={bankInfoSubmitted() || request()?.clientBankInfo?.submittedAt}>
                              <div style={formSuccessStyle}>
                                <span style={{ 'font-size': '1.5rem' }}>OK</span>
                                <span>{getText('bankInfoComplete')}</span>
                              </div>
                            </Show>
                          </Show>

                          {/* Dependents Verification Form */}
                          <Show when={doc.type === 'provide_dependent_info'}>
                            <div style={formHeaderStyle}>
                              <div style={formTitleStyle}>
                                {getText('dependentTitle')}
                                {doc.required && (
                                  <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <div style={statusBadgeStyle(isFormSubmitted())}>
                                {isFormSubmitted() ? getText('statusComplete') : getText('statusPending')}
                              </div>
                            </div>
                            <p style={formDescriptionStyle}>{getText('dependentDescription')}</p>

                            <Show when={!dependentsSubmitted() && !(request()?.clientDependents && request()!.clientDependents!.length > 0)}>
                              {/* List of added dependents */}
                              <Show when={dependents().length > 0}>
                                <div style={{ 'margin-bottom': '1rem' }}>
                                  <For each={dependents()}>
                                    {(dep, index) => (
                                      <div style={dependentCardStyle}>
                                        <div>
                                          <div style={{ 'font-weight': '500' }}>{dep.firstName} {dep.lastName}</div>
                                          <div style={{ 'font-size': '0.875rem', color: '#64748b' }}>{dep.relationship}</div>
                                        </div>
                                        <button
                                          style={{ ...secondaryButtonStyle, padding: '0.375rem 0.75rem', 'font-size': '0.875rem' }}
                                          onClick={() => setDependents(prev => prev.filter((_, i) => i !== index()))}
                                        >
                                          X
                                        </button>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </Show>

                              <Show when={dependents().length === 0 && !showDependentForm()}>
                                <div style={{ 'text-align': 'center', padding: '1rem', color: '#64748b' }}>
                                  {getText('noDependents')}
                                </div>
                              </Show>

                              {/* Add Dependent Form */}
                              <Show when={showDependentForm()}>
                                <div style={{ padding: '1rem', background: '#f8fafc', 'border-radius': '8px', 'margin-bottom': '1rem' }}>
                                  <div style={twoColStyle}>
                                    <div>
                                      <label style={labelStyle}>{getText('dependentFirstName')} *</label>
                                      <input
                                        type="text"
                                        style={inputStyle}
                                        value={currentDependent().firstName}
                                        onInput={(e) => updateDependentField('firstName', e.currentTarget.value)}
                                      />
                                    </div>
                                    <div>
                                      <label style={labelStyle}>{getText('dependentLastName')} *</label>
                                      <input
                                        type="text"
                                        style={inputStyle}
                                        value={currentDependent().lastName}
                                        onInput={(e) => updateDependentField('lastName', e.currentTarget.value)}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label style={labelStyle}>{getText('dependentRelationship')} *</label>
                                    <select
                                      style={selectStyle}
                                      value={currentDependent().relationship}
                                      onChange={(e) => updateDependentField('relationship', e.currentTarget.value)}
                                    >
                                      <option value="">{getText('select')}</option>
                                      <option value="child">{getText('relationshipChild')}</option>
                                      <option value="stepchild">{getText('relationshipStepchild')}</option>
                                      <option value="parent">{getText('relationshipParent')}</option>
                                      <option value="sibling">{getText('relationshipSibling')}</option>
                                      <option value="other">{getText('relationshipOther')}</option>
                                    </select>
                                  </div>

                                  <div style={twoColStyle}>
                                    <div>
                                      <label style={labelStyle}>{getText('dependentSSN')}</label>
                                      <input
                                        type="text"
                                        style={inputStyle}
                                        placeholder="123-45-6789"
                                        value={currentDependent().ssn}
                                        onInput={(e) => updateDependentField('ssn', e.currentTarget.value)}
                                      />
                                    </div>
                                    <div>
                                      <label style={labelStyle}>{getText('dependentDOB')}</label>
                                      <input
                                        type="date"
                                        style={inputStyle}
                                        value={currentDependent().dateOfBirth}
                                        onInput={(e) => updateDependentField('dateOfBirth', e.currentTarget.value)}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.75rem', 'margin-top': '0.5rem' }}>
                                    <button style={secondaryButtonStyle} onClick={() => setShowDependentForm(false)}>
                                      {getText('cancelDependent')}
                                    </button>
                                    <button style={submitButtonStyle} onClick={handleAddDependent}>
                                      {getText('saveDependent')}
                                    </button>
                                  </div>
                                </div>
                              </Show>

                              {/* Action Buttons */}
                              <Show when={!showDependentForm()}>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <button style={secondaryButtonStyle} onClick={() => setShowDependentForm(true)}>
                                    + {getText('addDependent')}
                                  </button>
                                  <button style={submitButtonStyle} onClick={handleCompleteDependents}>
                                    {dependents().length === 0 ? getText('skipDependents') : getText('dependentsComplete')}
                                  </button>
                                </div>
                              </Show>
                            </Show>

                            <Show when={dependentsSubmitted() || (request()?.clientDependents && request()!.clientDependents!.length > 0)}>
                              <div style={formSuccessStyle}>
                                <span style={{ 'font-size': '1.5rem' }}>OK</span>
                                <span>{getText('dependentsComplete')} ({dependents().length})</span>
                              </div>
                            </Show>
                          </Show>

                          {/* Sign Engagement Letter Form */}
                          <Show when={doc.type === 'sign_letter'}>
                            <div style={formHeaderStyle}>
                              <div style={formTitleStyle}>
                                {getText('signLetterTitle')}
                                {doc.required && (
                                  <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <div style={statusBadgeStyle(isFormSubmitted())}>
                                {isFormSubmitted() ? getText('statusComplete') : getText('statusPending')}
                              </div>
                            </div>
                            <p style={formDescriptionStyle}>{getText('signLetterDescription')}</p>

                            <Show when={!signatureSubmitted() && !request()?.clientSignature?.signedAt}>
                              <div style={formFieldsStyle}>
                                {/* Engagement Letter Text */}
                                <div style={{
                                  padding: '1rem',
                                  background: '#f8fafc',
                                  'border-radius': '8px',
                                  border: '1px solid #e2e8f0',
                                  'font-size': '0.9rem',
                                  'line-height': '1.6',
                                  color: '#475569',
                                  'max-height': '200px',
                                  'overflow-y': 'auto'
                                }}>
                                  {getText('engagementLetterText')}
                                </div>

                                {/* Agreement Checkbox */}
                                <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                                  <input
                                    type="checkbox"
                                    id="agreeToTerms"
                                    checked={signatureInfo().agreedToTerms}
                                    onChange={(e) => updateSignatureField('agreedToTerms', e.currentTarget.checked)}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      'margin-top': '2px',
                                      cursor: 'pointer'
                                    }}
                                  />
                                  <label
                                    for="agreeToTerms"
                                    style={{
                                      'font-size': '0.9rem',
                                      color: '#1e293b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {getText('agreeToTermsLabel')} *
                                  </label>
                                </div>

                                {/* Signature Canvas Box */}
                                <div>
                                  <label style={labelStyle}>{getText('signatureBoxLabel')} *</label>
                                  <div style={{
                                    position: 'relative',
                                    border: hasSignature() ? '2px solid #22c55e' : '2px dashed #cbd5e1',
                                    'border-radius': '8px',
                                    background: '#ffffff',
                                    overflow: 'hidden'
                                  }}>
                                    <canvas
                                      ref={(el) => initSignatureCanvas(el)}
                                      width={500}
                                      height={150}
                                      style={{
                                        width: '100%',
                                        height: '150px',
                                        cursor: 'crosshair',
                                        'touch-action': 'none'
                                      }}
                                      onMouseDown={(e) => startDrawing(e)}
                                      onMouseMove={(e) => draw(e)}
                                      onMouseUp={stopDrawing}
                                      onMouseLeave={stopDrawing}
                                      onTouchStart={(e) => startDrawing(e)}
                                      onTouchMove={(e) => draw(e)}
                                      onTouchEnd={stopDrawing}
                                    />
                                    {/* Signature line */}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '30px',
                                      left: '20px',
                                      right: '20px',
                                      height: '1px',
                                      background: '#94a3b8',
                                      'pointer-events': 'none'
                                    }} />
                                    {/* X mark for signature */}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '35px',
                                      left: '15px',
                                      color: '#94a3b8',
                                      'font-size': '1rem',
                                      'pointer-events': 'none'
                                    }}>✕</div>
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    'justify-content': 'space-between',
                                    'align-items': 'center',
                                    'margin-top': '0.5rem'
                                  }}>
                                    <span style={{ 'font-size': '0.8rem', color: '#64748b' }}>
                                      {getText('signatureInstructions')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={clearSignature}
                                      style={{
                                        padding: '0.4rem 0.75rem',
                                        'font-size': '0.8rem',
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        'border-radius': '6px',
                                        color: '#64748b',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {getText('clearSignature')}
                                    </button>
                                  </div>
                                </div>

                                {/* Printed Name */}
                                <div>
                                  <label style={labelStyle}>{getText('signatureNameLabel')} *</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder={getText('signatureNamePlaceholder')}
                                    value={signatureInfo().name}
                                    onInput={(e) => updateSignatureField('name', e.currentTarget.value)}
                                  />
                                </div>

                                {/* Signature Date */}
                                <div>
                                  <label style={labelStyle}>{getText('signatureDateLabel')}</label>
                                  <input
                                    type="date"
                                    style={inputStyle}
                                    value={signatureInfo().date}
                                    onInput={(e) => updateSignatureField('date', e.currentTarget.value)}
                                  />
                                </div>

                                {/* GPS denied error */}
                                <Show when={gpsDenied()}>
                                  <div style={{ color: '#dc2626', 'font-size': '0.875rem', 'margin-bottom': '0.75rem', padding: '0.75rem', background: '#fef2f2', 'border-radius': '8px', border: '1px solid #fecaca', display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px' }}>
                                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                    </svg>
                                    <span style={{ flex: '1' }}>{getText('gpsRequired')}</span>
                                    <button
                                      type="button"
                                      style={{ padding: '0.375rem 0.75rem', border: '1px solid #fca5a5', 'border-radius': '6px', background: 'white', color: '#dc2626', 'font-size': '0.8125rem', 'font-weight': '600', cursor: 'pointer' }}
                                      onClick={requestGeolocation}
                                    >
                                      {getText('retryGps')}
                                    </button>
                                  </div>
                                </Show>

                                {/* GPS waiting */}
                                <Show when={!gpsDenied() && !gpsCoords()}>
                                  <div style={{ color: '#d97706', 'font-size': '0.875rem', 'margin-bottom': '0.75rem', padding: '0.75rem', background: '#fffbeb', 'border-radius': '8px', border: '1px solid #fde68a', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px' }}>
                                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clip-rule="evenodd" />
                                    </svg>
                                    {getText('gpsWaiting')}
                                  </div>
                                </Show>

                                <button
                                  style={{
                                    ...submitButtonStyle,
                                    opacity: (!signatureInfo().agreedToTerms || !hasSignature() || !signatureInfo().name || !gpsCoords() || gpsDenied()) ? 0.5 : 1,
                                    cursor: (!signatureInfo().agreedToTerms || !hasSignature() || !signatureInfo().name || !gpsCoords() || gpsDenied()) ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={handleSubmitSignature}
                                  disabled={!signatureInfo().agreedToTerms || !hasSignature() || !signatureInfo().name || !gpsCoords() || gpsDenied()}
                                >
                                  {getText('submitSignature')}
                                </button>
                              </div>
                            </Show>

                            <Show when={signatureSubmitted() || request()?.clientSignature?.signedAt}>
                              <div style={formSuccessStyle}>
                                <span style={{ 'font-size': '1.5rem' }}>OK</span>
                                <span>{getText('signatureComplete')}</span>
                                <Show when={ipAddress()}>
                                  <span style={{ 'font-size': '0.75rem', color: '#64748b' }}>IP: {ipAddress()}</span>
                                </Show>
                                <Show when={gpsCoords()}>
                                  <span style={{ 'font-size': '0.75rem', color: '#64748b' }}>GPS: {gpsCoords()!.latitude.toFixed(6)}, {gpsCoords()!.longitude.toFixed(6)} ({'\u00B1'}{Math.round(gpsCoords()!.accuracy)}m)</span>
                                </Show>
                              </div>
                            </Show>
                          </Show>

                          {/* Review Tax Summary Form */}
                          <Show when={doc.type === 'review_summary'}>
                            <div style={formHeaderStyle}>
                              <div style={formTitleStyle}>
                                {getText('reviewSummaryTitle')}
                                {doc.required && (
                                  <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <div style={statusBadgeStyle(isFormSubmitted())}>
                                {isFormSubmitted() ? getText('statusComplete') : getText('statusPending')}
                              </div>
                            </div>
                            <p style={formDescriptionStyle}>{getText('reviewSummaryDescription')}</p>

                            <Show when={!reviewSubmitted() && !request()?.clientReviewConfirmation?.reviewedAt}>
                              <div style={formFieldsStyle}>
                                {/* Summary Section */}
                                <div style={{
                                  padding: '1rem',
                                  background: '#f0f9ff',
                                  'border-radius': '8px',
                                  border: '1px solid #bfdbfe'
                                }}>
                                  <h4 style={{
                                    'font-size': '1rem',
                                    'font-weight': '600',
                                    color: '#1e40af',
                                    'margin-bottom': '0.75rem'
                                  }}>
                                    {getText('clientInfoSummary')}
                                  </h4>

                                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem' }}>
                                    {/* Client Name */}
                                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.9rem' }}>
                                      <span style={{ color: '#64748b' }}>{getText('clientNameLabel')}:</span>
                                      <span style={{ color: '#1e293b', 'font-weight': '500' }}>
                                        {request()?.clientName || '-'}
                                      </span>
                                    </div>

                                    {/* SSN Last 4 (if available from verification) */}
                                    <Show when={verificationInfo().ssn}>
                                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>{getText('ssnLast4Label')}:</span>
                                        <span style={{ color: '#1e293b', 'font-weight': '500' }}>
                                          ***-**-{verificationInfo().ssn.slice(-4)}
                                        </span>
                                      </div>
                                    </Show>

                                    {/* Filing Status (if available from verification) */}
                                    <Show when={verificationInfo().filingStatus}>
                                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.9rem' }}>
                                        <span style={{ color: '#64748b' }}>{getText('filingStatusSummaryLabel')}:</span>
                                        <span style={{ color: '#1e293b', 'font-weight': '500' }}>
                                          {verificationInfo().filingStatus === 'single' ? getText('filingStatusSingle') :
                                           verificationInfo().filingStatus === 'married_jointly' ? getText('filingStatusMarried') :
                                           verificationInfo().filingStatus === 'married_separate' ? getText('filingStatusMarriedSeparate') :
                                           verificationInfo().filingStatus === 'head_household' ? getText('filingStatusHeadHousehold') :
                                           verificationInfo().filingStatus}
                                        </span>
                                      </div>
                                    </Show>

                                    {/* Documents Uploaded Count */}
                                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.9rem' }}>
                                      <span style={{ color: '#64748b' }}>{getText('documentsUploadedLabel')}:</span>
                                      <span style={{ color: '#1e293b', 'font-weight': '500' }}>
                                        {request()?.requestedDocuments.filter(d => d.uploaded).length || 0} / {request()?.requestedDocuments.length || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Confirmation Checkbox */}
                                <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '0.75rem' }}>
                                  <input
                                    type="checkbox"
                                    id="confirmReview"
                                    checked={reviewConfirmation().confirmed}
                                    onChange={(e) => updateReviewField('confirmed', e.currentTarget.checked)}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      'margin-top': '2px',
                                      cursor: 'pointer'
                                    }}
                                  />
                                  <label
                                    for="confirmReview"
                                    style={{
                                      'font-size': '0.9rem',
                                      color: '#1e293b',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {getText('confirmReviewLabel')} *
                                  </label>
                                </div>

                                <button style={submitButtonStyle} onClick={handleSubmitReview}>
                                  {getText('submitReview')}
                                </button>
                              </div>
                            </Show>

                            <Show when={reviewSubmitted() || request()?.clientReviewConfirmation?.reviewedAt}>
                              <div style={formSuccessStyle}>
                                <span style={{ 'font-size': '1.5rem' }}>OK</span>
                                <span>{getText('reviewComplete')}</span>
                              </div>
                            </Show>
                          </Show>

                          {/* Signing PIN Form (IRS Form 8879) */}
                          <Show when={doc.type === 'set_signing_pin'}>
                            <div style={formHeaderStyle}>
                              <div style={formTitleStyle}>
                                {getText('signingPinTitle')}
                                {doc.required && (
                                  <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                    REQUIRED
                                  </span>
                                )}
                              </div>
                              <div style={statusBadgeStyle(isFormSubmitted())}>
                                {isFormSubmitted() ? getText('statusComplete') : getText('statusPending')}
                              </div>
                            </div>
                            <p style={formDescriptionStyle}>{getText('signingPinDescription')}</p>

                            <Show when={!pinSubmitted() && !request()?.clientSigningPin?.setAt}>
                              <div style={formFieldsStyle}>
                                {/* IRS Form 8879 Info Box */}
                                <div style={{
                                  padding: '1rem',
                                  background: '#fef3c7',
                                  'border-radius': '8px',
                                  border: '1px solid #fcd34d',
                                  'font-size': '0.875rem',
                                  'line-height': '1.5',
                                  color: '#92400e'
                                }}>
                                  <strong>IRS Form 8879</strong> - {language() === 'es'
                                    ? 'Autorizacion de firma electronica para declaracion de impuestos. Su PIN de 5 digitos y firma autorizan la presentacion electronica de su declaracion.'
                                    : 'E-file Signature Authorization. Your 5-digit PIN and signature authorize electronic filing of your tax return.'}
                                </div>

                                {/* PIN Entry */}
                                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1rem' }}>
                                  <div>
                                    <label style={labelStyle}>{getText('pinLabel')} *</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={5}
                                      style={{
                                        ...inputStyle,
                                        'font-size': '1.5rem',
                                        'text-align': 'center',
                                        'letter-spacing': '0.5rem',
                                        'font-weight': 'bold'
                                      }}
                                      placeholder={getText('pinPlaceholder')}
                                      value={signingPin()}
                                      onInput={(e) => {
                                        const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 5);
                                        setSigningPin(value);
                                        setPinError(null);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label style={labelStyle}>{getText('confirmPinLabel')} *</label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={5}
                                      style={{
                                        ...inputStyle,
                                        'font-size': '1.5rem',
                                        'text-align': 'center',
                                        'letter-spacing': '0.5rem',
                                        'font-weight': 'bold',
                                        'border-color': confirmPin() && signingPin() && confirmPin() !== signingPin() ? '#dc2626' : undefined
                                      }}
                                      placeholder={getText('confirmPinPlaceholder')}
                                      value={confirmPin()}
                                      onInput={(e) => {
                                        const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 5);
                                        setConfirmPin(value);
                                        setPinError(null);
                                      }}
                                    />
                                    <Show when={confirmPin() && signingPin() && confirmPin() !== signingPin()}>
                                      <span style={{ color: '#dc2626', 'font-size': '0.75rem', 'margin-top': '0.25rem', display: 'block' }}>
                                        {getText('pinMismatch')}
                                      </span>
                                    </Show>
                                  </div>
                                </div>

                                {/* PIN Signature Canvas */}
                                <div>
                                  <label style={labelStyle}>{getText('signatureBoxLabel')} *</label>
                                  <div style={{
                                    position: 'relative',
                                    border: hasPinSignature() ? '2px solid #22c55e' : '2px dashed #cbd5e1',
                                    'border-radius': '8px',
                                    background: '#ffffff',
                                    overflow: 'hidden'
                                  }}>
                                    <canvas
                                      ref={(el) => initPinSignatureCanvas(el)}
                                      width={500}
                                      height={150}
                                      style={{
                                        width: '100%',
                                        height: '150px',
                                        cursor: 'crosshair',
                                        'touch-action': 'none'
                                      }}
                                      onMouseDown={(e) => startPinDrawing(e)}
                                      onMouseMove={(e) => drawPin(e)}
                                      onMouseUp={stopPinDrawing}
                                      onMouseLeave={stopPinDrawing}
                                      onTouchStart={(e) => startPinDrawing(e)}
                                      onTouchMove={(e) => drawPin(e)}
                                      onTouchEnd={stopPinDrawing}
                                    />
                                    {/* Signature line */}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '30px',
                                      left: '20px',
                                      right: '20px',
                                      height: '1px',
                                      background: '#94a3b8',
                                      'pointer-events': 'none'
                                    }} />
                                    {/* X mark for signature */}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '35px',
                                      left: '15px',
                                      color: '#94a3b8',
                                      'font-size': '1rem',
                                      'pointer-events': 'none'
                                    }}>✕</div>
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    'justify-content': 'space-between',
                                    'align-items': 'center',
                                    'margin-top': '0.5rem'
                                  }}>
                                    <span style={{ 'font-size': '0.8rem', color: '#64748b' }}>
                                      {getText('signatureInstructions')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={clearPinSignature}
                                      style={{
                                        padding: '0.4rem 0.75rem',
                                        'font-size': '0.8rem',
                                        background: '#f1f5f9',
                                        border: '1px solid #e2e8f0',
                                        'border-radius': '6px',
                                        color: '#64748b',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {getText('clearSignature')}
                                    </button>
                                  </div>
                                </div>

                                {/* Printed Name */}
                                <div>
                                  <label style={labelStyle}>{getText('signatureNameLabel')} *</label>
                                  <input
                                    type="text"
                                    style={inputStyle}
                                    placeholder={getText('signatureNamePlaceholder')}
                                    value={pinSignerName()}
                                    onInput={(e) => {
                                      setPinSignerName(e.currentTarget.value);
                                      setPinError(null);
                                    }}
                                  />
                                </div>

                                {/* Error Message */}
                                <Show when={pinError()}>
                                  <div style={{
                                    padding: '0.75rem',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    'border-radius': '6px',
                                    color: '#dc2626',
                                    'font-size': '0.875rem'
                                  }}>
                                    {pinError()}
                                  </div>
                                </Show>

                                {/* GPS denied error */}
                                <Show when={gpsDenied()}>
                                  <div style={{ color: '#dc2626', 'font-size': '0.875rem', 'margin-bottom': '0.75rem', padding: '0.75rem', background: '#fef2f2', 'border-radius': '8px', border: '1px solid #fecaca', display: 'flex', 'align-items': 'center', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
                                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px' }}>
                                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                    </svg>
                                    <span style={{ flex: '1' }}>{getText('gpsRequired')}</span>
                                    <button
                                      type="button"
                                      style={{ padding: '0.375rem 0.75rem', border: '1px solid #fca5a5', 'border-radius': '6px', background: 'white', color: '#dc2626', 'font-size': '0.8125rem', 'font-weight': '600', cursor: 'pointer' }}
                                      onClick={requestGeolocation}
                                    >
                                      {getText('retryGps')}
                                    </button>
                                  </div>
                                </Show>

                                {/* GPS waiting */}
                                <Show when={!gpsDenied() && !gpsCoords()}>
                                  <div style={{ color: '#d97706', 'font-size': '0.875rem', 'margin-bottom': '0.75rem', padding: '0.75rem', background: '#fffbeb', 'border-radius': '8px', border: '1px solid #fde68a', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px', 'min-width': '18px' }}>
                                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clip-rule="evenodd" />
                                    </svg>
                                    {getText('gpsWaiting')}
                                  </div>
                                </Show>

                                <button
                                  style={{
                                    ...submitButtonStyle,
                                    opacity: (!signingPin() || !confirmPin() || signingPin().length !== 5 || signingPin() !== confirmPin() || !hasPinSignature() || !pinSignerName() || !gpsCoords() || gpsDenied()) ? 0.5 : 1,
                                    cursor: (!signingPin() || !confirmPin() || signingPin().length !== 5 || signingPin() !== confirmPin() || !hasPinSignature() || !pinSignerName() || !gpsCoords() || gpsDenied()) ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={handleSubmitSigningPin}
                                  disabled={!signingPin() || !confirmPin() || signingPin().length !== 5 || signingPin() !== confirmPin() || !hasPinSignature() || !pinSignerName() || !gpsCoords() || gpsDenied()}
                                >
                                  {getText('submitPin')}
                                </button>
                              </div>
                            </Show>

                            <Show when={pinSubmitted() || request()?.clientSigningPin?.setAt}>
                              <div style={formSuccessStyle}>
                                <span style={{ 'font-size': '1.5rem' }}>OK</span>
                                <span>{getText('pinComplete')}</span>
                                <Show when={ipAddress()}>
                                  <span style={{ 'font-size': '0.75rem', color: '#64748b' }}>IP: {ipAddress()}</span>
                                </Show>
                                <Show when={gpsCoords()}>
                                  <span style={{ 'font-size': '0.75rem', color: '#64748b' }}>GPS: {gpsCoords()!.latitude.toFixed(6)}, {gpsCoords()!.longitude.toFixed(6)} ({'\u00B1'}{Math.round(gpsCoords()!.accuracy)}m)</span>
                                </Show>
                              </div>
                            </Show>
                          </Show>
                        </div>
                      );
                    }

                    // Render regular upload UI for non-verification types
                    return (
                      <div class="document-item" style={documentItemStyle(isUploaded, isError)}>
                        {/* Hidden file input */}
                        <input
                          ref={(el) => fileInputRefs.set(doc.type, el)}
                          type="file"
                          accept={ACCEPTED_EXTENSIONS}
                          onChange={(e) => handleFileSelect(doc.type, e)}
                          style={{ display: 'none' }}
                        />

                        {/* Document info */}
                        <div class="document-info" style={documentInfoStyle}>
                          <div style={checkboxStyle(isUploaded, doc.required)}>
                            {isUploaded && <span>OK</span>}
                          </div>
                          <div>
                            <div style={documentLabelStyle}>
                              {getDocLabel(doc)}
                              {doc.required && (
                                <span style={{ ...requiredBadgeStyle, 'margin-left': '0.5rem' }}>
                                  {getText('REQUIRED')}
                                </span>
                              )}
                            </div>
                            <Show when={state?.fileName && isUploading}>
                              <div style={{ 'font-size': '0.8rem', color: '#64748b', 'margin-top': '0.25rem' }}>
                                {state?.fileName}
                              </div>
                            </Show>
                          </div>
                        </div>

                        {/* Upload button */}
                        <button
                          class="upload-btn"
                          type="button"
                          style={uploadBtnStyle(isUploaded, isUploading)}
                          onClick={() => !isUploaded && !isUploading && triggerFileInput(doc.type)}
                          disabled={isUploaded || isUploading}
                        >
                          {isUploaded ? (
                            <>
                              <span>{getText('uploaded')}</span>
                            </>
                          ) : isUploading ? (
                            <>
                              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>*</span>
                              <span>{state?.status === 'processing' ? getText('processing') : getText('uploading')}</span>
                            </>
                          ) : (
                            <>
                              <span>{getText('upload')}</span>
                            </>
                          )}
                        </button>

                        {/* Upload progress bar */}
                        <Show when={isUploading && state?.progress}>
                          <div style={{ width: '100%' }}>
                            <div style={uploadProgressStyle}>
                              <div style={{
                                height: '100%',
                                width: `${state?.progress}%`,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </Show>

                        {/* Error message */}
                        <Show when={isError && state?.errorMessage}>
                          <div style={errorTextStyle}>
                            {state?.errorMessage}
                            <button
                              type="button"
                              style={{
                                'margin-left': '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                'text-decoration': 'underline',
                                'font-size': '0.8rem'
                              }}
                              onClick={() => triggerFileInput(doc.type)}
                            >
                              {getText('tryAgain')}
                            </button>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </div>

          {/* Completion Card */}
          <Show when={progress === 100}>
            <div style={alertStyle('success')}>
              <div style={{ 'font-size': '2rem' }}>OK</div>
              <div>
                <strong>{getText('completionTitle')}</strong>
                <div style={{ 'font-size': '0.875rem', 'margin-top': '0.25rem' }}>
                  {getText('completionMessage')}
                </div>
              </div>
            </div>
          </Show>

          {/* Help Section */}
          <div style={{ ...cardStyle, padding: '1.5rem' }}>
            <div style={sectionTitleStyle}>
              <span>{getText('needHelp')}</span>
            </div>
            <div style={{ color: '#64748b', 'font-size': '0.9rem', 'line-height': '1.6' }}>
              <p style={{ 'margin-bottom': '0.75rem' }}>
                <strong>{getText('acceptedFiles')}</strong> {getText('acceptedFilesDesc')}
              </p>
              <p style={{ 'margin-bottom': '0.75rem' }}>
                <strong>{getText('tipsTitle')}</strong>
              </p>
              <ul style={{ 'padding-left': '1.5rem', margin: '0' }}>
                <li>{getText('tip1')}</li>
                <li>{getText('tip2')}</li>
                <li>{getText('tip3')}</li>
                <li>{getText('tip4')}</li>
              </ul>
            </div>
          </div>
        </Show>

        {/* Footer */}
        <div style={footerStyle}>
          <p>{getText('secureTransmission')}</p>
          <p style={{ 'margin-top': '0.5rem', 'font-size': '0.8rem' }}>
            {getText('linkExpires')} { request()?.expiresAt ? new Date(request()!.expiresAt).toLocaleDateString() : '--'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicTaxUploadPage;


